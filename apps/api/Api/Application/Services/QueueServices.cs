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
using Api.models;
using Microsoft.EntityFrameworkCore;
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
        public async Task<QueueDetailsResDTO> GetQueueById(int queueId) {

            var queue = await _db.Queues.SingleOrDefaultAsync(q => q.Id == queueId);
            if (queue is null) return null;

            var Waiters = await _db.QueueCustomers.AsNoTracking().Where(c => c.QueueId == queueId && c.State !="pending_verification").OrderByDescending(c => c.State=="in_progress").ThenBy(c=>c.Id).Select(c => new QueueCustomerDTO(c.Id, c.Name, c.CreatedAt, c.State)).ToListAsync();

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
        private readonly IJoinVerification _joinVerification;
        public CustomersServices(DoorMeenDbContext db, IJoinVerification joinVerification) : base(db) {
            _joinVerification = joinVerification;
         }

        public async Task<JoinQueueResDTO> JoinQueue(int queueId, string name, string phone, string email)
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

    

    // 1) Create customer as pending verification (NOT waiting)
    
     var rawToken = CreateHashToken.NewCancelTokenDigits(); // reuse your generator
    var tokenHash = CreateHashToken.Hash(rawToken);

    var customer = new QueueCustomer
    {
        QueueId = queueId,
        Name = name,
        Phone = phone,
        Email = email,

        State = "pending_verification",
        EmailVerificationTokenHash = tokenHash,
        EmailVerificationTokenExpiry = DateTime.UtcNow.AddHours(1),
       

        CancelTokenHash = null
    };




  
    _db.QueueCustomers.Add(customer);
    await _db.SaveChangesAsync();

    // 2) Send verification email (customer must click link later)
    var sent = await _joinVerification.Send(email, rawToken);
    if (!sent)
    throw new ValidationException("Failed to send verification email");
    await tx.CommitAsync();

    // 3) Tell client verification is required
    return new JoinQueueResDTO
    {
        Id = customer.Id,
        Name = customer.Name,
        Token = null, // not issued until verified
        VerificationRequired = true
    };
}


        public async Task<bool> SendVerificationEmail(int customerId)
        {
            var customer = await _db.QueueCustomers.FindAsync(customerId);
            if (customer is null) return false;
            if (customer.State != "pending_verification") return false;
            var rawToken = CreateHashToken.NewCancelTokenDigits(); // reuse your generator
            var tokenHash = CreateHashToken.Hash(rawToken);
            customer.EmailVerificationTokenHash = tokenHash;
            customer.EmailVerificationTokenExpiry = DateTime.UtcNow.AddHours(1);
            await _db.SaveChangesAsync();
            var ok=await _joinVerification.Send(customer.Email,rawToken);
            if(!ok) return false;
            return true;
        }   

        public async Task<bool> VerifyEmail ( int customerId, string email , int digits=0){
            if(string.IsNullOrWhiteSpace(email) )
                throw new ValidationException("Email is required");
            if(digits==0) throw new ValidationException("Digits are required");

            var customer=await _db.QueueCustomers.FindAsync(customerId);
            if(customer is null) throw new KeyNotFoundException("No such a customer");
            if(customer.Email != email) throw new ValidationException("Email does not match");
            if(customer.EmailVerificationTokenExpiry < DateTime.UtcNow) throw new ValidationException("Verification token expired");
            if(!CreateHashToken.Verify(digits.ToString(), customer.EmailVerificationTokenHash)) throw new ValidationException("Invalid digits");

            customer.State = "waiting";
            customer.EmailVerificationTokenHash = null;
            customer.EmailVerificationTokenExpiry = null;
            customer.IsEmailVerified = true;
            await _db.SaveChangesAsync();
            return true;

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
