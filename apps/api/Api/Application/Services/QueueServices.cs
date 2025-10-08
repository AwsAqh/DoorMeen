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
using Microsoft.EntityFrameworkCore;
namespace Api.Application.Services
{

    public class Services
    {
        protected readonly DoorMeenDbContext _db;
        public Services(DoorMeenDbContext db) { _db = db; }
    }
    public class QueueServices: Services,IQueueServices
    {


        public QueueServices(DoorMeenDbContext db) : base(db) { }
        public async Task<Object> CreateQueue(string queueName,string password) {

          
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
        public async Task<QueueDetailsResDTO> GetQueueById(int queueId) {

            var queue = await _db.Queues.SingleOrDefaultAsync(q => q.Id == queueId);
            if (queue is null) return null;

            var Waiters = await _db.QueueCustomers.AsNoTracking().Where(c => c.QueueId == queueId).OrderByDescending(c => c.State=="in_progress").ThenBy(c=>c.Id).Select(c => new QueueCustomerDTO(c.Id, c.Name, c.CreatedAt, c.State)).ToListAsync();

            var res = new QueueDetailsResDTO(
                 Id: queue.Id,
                 Name: queue.Name,
                 Waiters,
                 CreatedAt: queue.CreatedAt
             );
            return res;


        }

    }



    public class CustomersServices : Services, ICustomersServices
    {
        public CustomersServices(DoorMeenDbContext db) : base(db) { }

        public async Task<JoinQueueResDTO> JoinQueue(int queueId, string name, string phone)
        {
            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(phone) || queueId == 0)
                throw new ValidationException("All info must be not null");

            var queue = await _db.Queues.SingleOrDefaultAsync(q => q.Id == queueId)
                        ?? throw new KeyNotFoundException("No queue with that id");

            await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var waitingCount = await _db.QueueCustomers
                .CountAsync(c => c.QueueId == queueId && c.State == "waiting");

            if (queue.MaxCustomers.HasValue && waitingCount >= queue.MaxCustomers.Value)
                throw new InvalidOperationException("Queue is full");

            var token = CreateHashToken.NewCancelTokenDigits();
            var customer = new QueueCustomer
            {
                QueueId = queueId,
                Name = name,
                Phone = phone,
                State = "waiting",
                CancelTokenHash = CreateHashToken.Hash(token)
            };

            await _db.QueueCustomers.AddAsync(customer);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return new JoinQueueResDTO { Id=customer.Id, Name=customer.Name,Token= token };
        }

        public async Task CancelRegistration(int queueId, int customerId, string cancelToken)
        {
            var queue = await _db.Queues.SingleOrDefaultAsync(q => q.Id == queueId)
                        ?? throw new KeyNotFoundException("No such a queue");

            var customer = await _db.QueueCustomers.SingleOrDefaultAsync(c => c.Id == customerId)
                           ?? throw new KeyNotFoundException("No such customer belongs to this queue");

            if (customer.QueueId != queue.Id || customer.State != "waiting")
                throw new ValidationException("Can't withdraw from this queue!");

            if (!CreateHashToken.Verify(cancelToken, customer.CancelTokenHash))
                throw new UnauthorizedAccessException("You can't unregister this customer!");

            _db.QueueCustomers.Remove(customer);
            await _db.SaveChangesAsync();
            return;
        }
    }



}
