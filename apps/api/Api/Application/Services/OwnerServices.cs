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

namespace Api.Application.Services
{
    public class OwnerServices : IOwnerServices
    {
        private readonly IJwtTokenGenerator _jwtTokenGenerator;
        private readonly DoorMeenDbContext _db;
        public OwnerServices(IJwtTokenGenerator jwtTokenGenerator, DoorMeenDbContext db) {
            _db = db;
            _jwtTokenGenerator = jwtTokenGenerator;
        }


        public async Task<bool> CheckPassowrd(int queueId, string password)
        {
            var queue = await _db.Queues.SingleOrDefaultAsync(q => q.Id == queueId);
            if (queue == null) return false;
            return !string.IsNullOrWhiteSpace(password) && Password.Verify(password, queue.HashedPassword);
        }

        public async Task<VerifyPasswordResDTO> VerifyPassword(int queueId,string password)
        {

            var ok = await CheckPassowrd(queueId, password);
            if (!ok) throw new UnauthorizedAccessException();

            var token = _jwtTokenGenerator.GenerateToken(queueId);
            return new VerifyPasswordResDTO(queueId, token);



        }


        public async Task<OwnerQueueByIdResDTO> GetQueueById(int id)
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
                queue.MaxCustomers
                );


            return dto;
        }
    



    //authorize later
    public async Task UpdateCustomerState(int queueId, int customerId)
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
            return;
        }

        public async Task ServeCustomer(int queueId, int customerId)
        {
            var customer = await _db.QueueCustomers.FindAsync([customerId]);
            if (customer is null) throw new KeyNotFoundException($"Customer {customerId} not found.");
            if (customer.QueueId != queueId)
                throw new ValidationException("Customer not belong to this queue!");

            _db.QueueCustomers.Remove(customer);
            await _db.SaveChangesAsync();
            return;
        }

       
        public async Task ChangeQueuePassword(int queueId, string newPassword)
        {
            var queue = await _db.Queues.FindAsync([queueId]);
            if (queue is null) throw new KeyNotFoundException($"Queue {queueId} not found.");

            queue.HashedPassword = Password.HashOrNull(newPassword);
            await _db.SaveChangesAsync();
            return;
        }

      
      
        public async Task UpdateMaxCustomers(int queueId, int maxCustomers)
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

      
        public async Task UpdateQueueName(int queueId, string queueName)
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


    }
}
