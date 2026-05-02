using Api.Application.Interfaces;
using Api.Infrastructuer;
using Api.Infrastructuer.resDTO;
using Api.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.SignalR;

namespace Api.Application.Services
{
    public class OwnerServices : IOwnerServices
    {
        private readonly IJwtTokenGenerator _jwtTokenGenerator;
        private readonly DoorMeenDbContext _db;
        private readonly Microsoft.AspNetCore.SignalR.IHubContext<Api.Hubs.QueueHub> _hub;
        private readonly IJoinVerification _joinVerification;

        public OwnerServices(IJwtTokenGenerator jwtTokenGenerator, DoorMeenDbContext db, Microsoft.AspNetCore.SignalR.IHubContext<Api.Hubs.QueueHub> hub, IJoinVerification joinVerification) {
            _db = db;
            _jwtTokenGenerator = jwtTokenGenerator;
            _hub = hub;
            _joinVerification = joinVerification;
        }


        public async Task<bool> CheckPassowrd(string queueId, string password)
        {
            var queue = await _db.Queues.SingleOrDefaultAsync(q => q.Id == queueId);
            if (queue == null) return false;
            return !string.IsNullOrWhiteSpace(password) && Password.Verify(password, queue.HashedPassword);
        }

        public async Task<VerifyPasswordResDTO> VerifyPassword(string queueId,string password)
        {

            var ok = await CheckPassowrd(queueId, password);
            if (!ok) throw new UnauthorizedAccessException();

            var token = _jwtTokenGenerator.GenerateToken(queueId);
            return new VerifyPasswordResDTO(queueId, token);
        }


        public async Task<OwnerQueueByIdResDTO> GetQueueById(string id)
        {
            var queue = await _db.Queues.SingleOrDefaultAsync(q=>q.Id == id); 
            var waitings= await _db.QueueCustomers.Where(c=>c.QueueId == id)
                .OrderByDescending(c => c.State == "in_progress")
                .ThenBy(c=>c.Id)
                .Select(c=>new OwnerQueueByIdCustomerResDTO( c.Id, c.Name, c.QueueId, c.Phone, c.State ))
               
                
                .ToListAsync();

            if (queue is null)
                throw new KeyNotFoundException("Not found");

            var dto = new OwnerQueueByIdResDTO(

                queue.Id,
                queue.Name,
                Waiters: waitings,
                CreatedAt: queue.CreatedAt,
                queue.MaxCustomers,
                queue.OwnerMessage,
                queue.AvgServiceTime
                );


            return dto;
        }
    



    //authorize later
    public async Task UpdateCustomerState(string queueId, int customerId)
        {
            var customer = await _db.QueueCustomers.FindAsync(new object[] { customerId });
            if (customer is null)
                throw new KeyNotFoundException($"Customer {customerId} not found.");

            if (customer.QueueId != queueId)
                throw new ValidationException("Customer does not belong to this queue.");

            if (customer.State == "in_progress")
                return; // لا تغيير، الكنترولر سيرجع 204

            if (customer.State != "waiting")
                throw new ValidationException("Can't perform this operation unless customer is 'waiting'.");

            customer.State = "in_progress";
            await _db.SaveChangesAsync();
            
            var resDto = new OwnerQueueByIdCustomerResDTO(customer.Id, customer.Name, customer.QueueId, customer.Phone, customer.State);
            await _hub.Clients.Group(queueId).SendAsync("CustomerStatusChanged", resDto);
            
            return;
        }

        public async Task ServeCustomer(string queueId, int customerId)
        {
            var customer = await _db.QueueCustomers.FindAsync([customerId]);
            if (customer is null) throw new KeyNotFoundException($"Customer {customerId} not found.");
            if (customer.QueueId != queueId)
                throw new ValidationException("Customer not belong to this queue!");

            try
            {
                _db.QueueCustomers.Remove(customer);
                await _db.SaveChangesAsync();
                
                await _hub.Clients.Group(queueId).SendAsync("CustomerServed", customerId);

                var queue = await _db.Queues.SingleOrDefaultAsync(q => q.Id == queueId);
                if (queue != null) 
                {
                    var nextCustomers = await _db.QueueCustomers
                        .Where(c => c.QueueId == queueId && c.State == "waiting" && !c.IsNextNotificationSent)
                        .OrderBy(c => c.CreatedAt)
                        .Take(2)
                        .ToListAsync();
                    
                    foreach (var nextC in nextCustomers)
                    {
                        if (!string.IsNullOrEmpty(nextC.Email))
                        {
                            var sent = await _joinVerification.SendYourTurnNotification(nextC.Email, queue.Name);
                            if (sent)
                            {
                                nextC.IsNextNotificationSent = true;
                                await _db.SaveChangesAsync();
                            }
                        }
                    }
                }
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException)
            {
                // Customer was likely already served or canceled by a concurrent request. Ignore gracefully.
            }
            return;
        }

       
        public async Task ChangeQueuePassword(string queueId, string newPassword)
        {
            var queue = await _db.Queues.FindAsync([queueId]);
            if (queue is null) throw new KeyNotFoundException($"Queue {queueId} not found.");

            queue.HashedPassword = Password.HashOrNull(newPassword);
            await _db.SaveChangesAsync();
            return;
        }

      
      
        public async Task UpdateMaxCustomers(string queueId, int maxCustomers)
        {
            var queue = await _db.Queues.FindAsync([queueId]);
            if (queue is null) throw new KeyNotFoundException($"Queue {queueId} not found.");

            // إن لم تتغيّر القيمة لا نعمل أي تحديث
            var newValue = (maxCustomers == 10) ? (int?)null : maxCustomers;
            if (queue.MaxCustomers == newValue) return;

            queue.MaxCustomers = newValue;
            await _db.SaveChangesAsync();
            return;
        }

      
        public async Task UpdateQueueName(string queueId, string queueName)
        {
            if (string.IsNullOrWhiteSpace(queueName))
                throw new ValidationException("Queue name must not be empty.");

            var queue = await _db.Queues.FindAsync([queueId]);
            if (queue is null) throw new KeyNotFoundException($"Queue {queueId} not found.");

            if (queue.Name == queueName) return;

            queue.Name = queueName;
            await _db.SaveChangesAsync();
            return;
        }

        public async Task UpdateOwnerMessage(string queueId, string? message)
        {
            var queue = await _db.Queues.FindAsync([queueId]);
            if (queue is null) throw new KeyNotFoundException($"Queue {queueId} not found.");

            if (queue.OwnerMessage == message) return;

            queue.OwnerMessage = message;
            await _db.SaveChangesAsync();

            await _hub.Clients.Group(queueId).SendAsync("MessageUpdated", message);
            return;
        }

        public async Task UpdateAvgServiceTime(string queueId, int minutes)
        {
            var queue = await _db.Queues.FindAsync([queueId]);
            if (queue is null) throw new KeyNotFoundException($"Queue {queueId} not found.");

            var newValue = (minutes <= 0 || minutes == 10) ? (int?)null : minutes;
            if (queue.AvgServiceTime == newValue) return;

            queue.AvgServiceTime = newValue;
            await _db.SaveChangesAsync();
        }

    }
}
