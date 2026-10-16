using Api.Application.Interfaces;
using Api.Infrastructuer;
using Microsoft.AspNetCore.Mvc;
using Api.Infrastructuer.resDTO;
using Api.Security;
using Microsoft.EntityFrameworkCore;
using Api.models;
using Api.security;
using System.ComponentModel.DataAnnotations;
using System.Data;
using Microsoft.AspNetCore.SignalR;

namespace Api.Application.Services
{

    public class Services
    {
        protected readonly DoorMeenDbContext _db;
       
        public Services(DoorMeenDbContext db) { _db = db; ; }
    }


    public class QueueServices: Services,IQueueServices
    {
         

        public QueueServices(DoorMeenDbContext db) : base(db) { }
        public async Task<QueueItem> CreateQueue(string queueName,string password) {

          
            if (queueName is null || password is null) throw new ArgumentNullException();
          
            var queue = new QueueItem
            {

                Name = queueName,
                HashedPassword = Password.HashOrNull(password),


            };
           
            _db.Queues.Add(queue);
            await _db.SaveChangesAsync();
            return queue;

        }
        public async Task<QueueDetailsResDTO> GetQueueById(string queueId) {

            var queue = await _db.Queues.SingleOrDefaultAsync(q => q.Id == queueId);
            if (queue is null) return null;

            var Waiters = await _db.QueueCustomers.AsNoTracking().Where(c => c.QueueId == queueId && c.State !="pending_verification").OrderByDescending(c => c.State=="in_progress").ThenBy(c=>c.CreatedAt).Select(c => new QueueCustomerDTO(c.Id, c.Name, c.CreatedAt, c.State)).ToListAsync();

            var res = new QueueDetailsResDTO(
                 Id: queue.Id,
                 Name: queue.Name,
                 Waiters,
                 CreatedAt: queue.CreatedAt,
                 OwnerMessage: queue.OwnerMessage,
                 AvgServiceTime: queue.AvgServiceTime
             );
            return res;


        }

    }



    public class CustomersServices : Services, ICustomersServices
    {
        private readonly IJoinVerification _joinVerification;
        private readonly Microsoft.AspNetCore.SignalR.IHubContext<Api.Hubs.QueueHub> _hub;
        public CustomersServices(DoorMeenDbContext db, IJoinVerification joinVerification, Microsoft.AspNetCore.SignalR.IHubContext<Api.Hubs.QueueHub> hub) : base(db) {
            _joinVerification = joinVerification;
            _hub = hub;
         }

        public async Task<JoinQueueResDTO> JoinQueue(string queueId, string name, string phone, string email)
        {
            name = name?.Trim() ?? "";
            phone = phone?.Trim() ?? "";
            email = email?.Trim() ?? "";

            if (string.IsNullOrWhiteSpace(queueId) || string.IsNullOrWhiteSpace(name) || name.Length > 60)
                throw new ValidationException("Enter a queue and a name up to 60 characters");
            if (!System.Text.RegularExpressions.Regex.IsMatch(phone, @"^\d{10}$"))
                throw new ValidationException("Phone must be 10 digits");
            if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email))
                throw new ValidationException("Enter a valid email address");

            var queue = await _db.Queues.SingleOrDefaultAsync(q => q.Id == queueId)
                        ?? throw new KeyNotFoundException("No queue with that id");

            await using var tx = _db.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory"
                ? await _db.Database.BeginTransactionAsync()
                : await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var waitingCount = await _db.QueueCustomers
                .CountAsync(c => c.QueueId == queueId && c.State == "waiting");
            if (queue.MaxCustomers.HasValue && waitingCount >= queue.MaxCustomers.Value)
                throw new InvalidOperationException("Queue is full");

            var normalizedEmail = email.ToLowerInvariant();
            var existing = await _db.QueueCustomers.FirstOrDefaultAsync(c =>
                c.QueueId == queueId && c.State != "served" &&
                (c.Phone == phone || (c.Email != null && c.Email.ToLower() == normalizedEmail)));
            if (existing != null)
                throw new ValidationException("This phone number or email is already in the queue");

            var rawCancelToken = CreateHashToken.NewCancelTokenDigits();
            var customer = new QueueCustomer
            {
                QueueId = queueId,
                Name = name,
                Phone = phone,
                Email = normalizedEmail,
                State = "waiting",
                CancelTokenHash = CreateHashToken.Hash(rawCancelToken),
                EmailVerificationTokenHash = null,
                EmailVerificationTokenExpiry = null,
                IsEmailVerified = false
            };

            _db.QueueCustomers.Add(customer);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            await _hub.Clients.Group(queueId).SendAsync("CustomerJoined", new
            {
                Id = customer.Id,
                QueueId = customer.QueueId,
                Name = customer.Name,
                State = customer.State,
                CreatedAt = customer.CreatedAt
            });

            return new JoinQueueResDTO
            {
                Id = customer.Id,
                Name = customer.Name,
                Token = rawCancelToken
            };
        }

        public async Task CancelRegistration(string queueId, int customerId, string cancelToken)
        {
            var queue = await _db.Queues.SingleOrDefaultAsync(q => q.Id == queueId)
                        ?? throw new KeyNotFoundException("No such a queue");

            var customer = await _db.QueueCustomers.SingleOrDefaultAsync(c => c.Id == customerId)
                           ?? throw new KeyNotFoundException("No such customer belongs to this queue");

            if (customer.QueueId != queue.Id || customer.State != "waiting")
                throw new ValidationException("Can't withdraw from this queue!");

            if (string.IsNullOrEmpty(customer.CancelTokenHash) || !CreateHashToken.Verify(cancelToken, customer.CancelTokenHash))
                throw new UnauthorizedAccessException("You can't unregister this customer!");

            try
            {
                _db.QueueCustomers.Remove(customer);
                await _db.SaveChangesAsync();
                
                await _hub.Clients.Group(queueId).SendAsync("CustomerLeft", customerId);

                // Notify next top 2 people if they haven't been alerted
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
            catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException)
            {
                // Customer was likely already handled by another request. Ignore gracefully.
            }
            return;
        }

        public async Task SnoozeRegistration(string queueId, int customerId, string cancelToken)
        {
            var queue = await _db.Queues.SingleOrDefaultAsync(q => q.Id == queueId)
                        ?? throw new KeyNotFoundException("No such a queue");

            var customer = await _db.QueueCustomers.SingleOrDefaultAsync(c => c.Id == customerId)
                           ?? throw new KeyNotFoundException("No such customer belongs to this queue");

            if (customer.QueueId != queue.Id || customer.State != "waiting")
                throw new ValidationException("Can't snooze from this queue state!");

            if (string.IsNullOrEmpty(customer.CancelTokenHash) || !CreateHashToken.Verify(cancelToken, customer.CancelTokenHash))
                throw new UnauthorizedAccessException("You can't snooze this customer!");

            try
            {
                // Find all waiting customers ordered by time
                var waiting = await _db.QueueCustomers
                    .Where(c => c.QueueId == queueId && c.State == "waiting")
                    .OrderBy(c => c.CreatedAt)
                    .ToListAsync();
                
                var currentIndex = waiting.FindIndex(c => c.Id == customer.Id);
                
                // If they are at the very end of the line, snoozing does nothing
                if (currentIndex >= 0 && currentIndex < waiting.Count - 1)
                {
                    var personBehind = waiting[currentIndex + 1];

                    // Swap their CreatedAt timestamps exactly
                    var tempTime = customer.CreatedAt;
                    customer.CreatedAt = personBehind.CreatedAt;
                    personBehind.CreatedAt = tempTime;

                    await _db.SaveChangesAsync();
                    
                    // Broadcast a generalized event ensuring all clients sync the new ordered status
                    await _hub.Clients.Group(queueId).SendAsync("CustomerStatusChanged", new
                    {
                        Id = customer.Id,
                        QueueId = queueId,
                        Name = customer.Name,
                        State = customer.State
                    });
                }
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException)
            {
                // Silently skip if someone else concurrently shifted lines
            }
        }
    }
}
