using Api.Infrastructuer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Api.Infrastructuer.DTO;
using Api.models;
using Api.security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Data;
namespace Api.controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class QueueCustomers : ControllerBase
    {

        private readonly DoorMeenDbContext _db;
        private readonly ILogger<QueueCustomers> _logger;
        public QueueCustomers(DoorMeenDbContext db, ILogger<QueueCustomers> logger) { _db = db; _logger = logger;  }

        [HttpPost]
        public async Task<ActionResult> AddCustomerToQueue([FromBody] AddCustomerDTO req)
        {
            if (string.IsNullOrWhiteSpace(req.Name) ||
                string.IsNullOrWhiteSpace(req.PhoneNumber) ||
                req.QueueId == 0)
                return BadRequest("All info must be not null");

            var queue = await _db.Queues.SingleOrDefaultAsync(q => q.Id == req.QueueId);
            if (queue is null) return NotFound("No queue with that id");

            await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var waitingCount = await _db.QueueCustomers
                .Where(c => c.QueueId == req.QueueId && c.State == "waiting")
                .CountAsync();

            if (queue.MaxCustomers.HasValue && waitingCount >= queue.MaxCustomers.Value)
            {
                await tx.RollbackAsync();
                return BadRequest("Queue is full");
            }

            var token = CreateHashToken.NewCancelTokenDigits();
            var customer = new QueueCustomer
            {
                QueueId = req.QueueId,
                Name = req.Name,
                Phone = req.PhoneNumber,
                State = "waiting",
                CancelTokenHash = CreateHashToken.Hash(token),
                CreatedAt = DateTime.UtcNow
            };

            _db.QueueCustomers.Add(customer);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return Created(string.Empty, new { customer.Id, customer.Name, Token = token });
        }




        [HttpDelete("cancel/{queueId:int}/{customerId:int}")]
        public async Task<ActionResult> CancelRegisteration(int queueId, int customerId, [FromHeader (Name ="X-Cancel-Token")] string token)
        {
            
            var queue = await _db.Queues.SingleOrDefaultAsync(q=>q.Id==queueId);
            if (queue == null) return NotFound("No such a queue");
            var customer = await _db.QueueCustomers.SingleOrDefaultAsync(c=>c.Id==customerId);
            if (customer == null) return NotFound("No such customer belongs to this queue");

            if (customer.QueueId != queue.Id || customer.State != "waiting") return BadRequest("Can't withdraw from this queue!");

            _logger.LogInformation("Token:'{T}' len={L}", token, token?.Length);
            _logger.LogInformation("Hash:'{H}' len={L}", customer.CancelTokenHash, customer.CancelTokenHash?.Length);


            if (!CreateHashToken.Verify(token, customer.CancelTokenHash)) return Unauthorized("You can't unregister this customer!");

            _db.QueueCustomers.Remove(customer);
            await _db.SaveChangesAsync();
            return NoContent();

        }

    }
}
