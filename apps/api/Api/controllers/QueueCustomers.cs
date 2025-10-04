using Api.Infrastructuer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Api.Infrastructuer.DTO;
using Api.models;
using Api.security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
        public async Task<ActionResult> AddCustomerToQueue([FromBody] AddCustomerDTO req ) 
        {

            if (req.Name is null || req.PhoneNumber is null || req.QueueId == null) return BadRequest("All info must be not null");
            var Token = CreateHashToken.NewCancelTokenDigits();
            var customer = new QueueCustomer
            {
                QueueId = req.QueueId,
                Name = req.Name,
                Phone = req.PhoneNumber,
                CancelTokenHash=CreateHashToken.Hash(Token)
            };


            _db.QueueCustomers.Add(customer);
            await _db.SaveChangesAsync();

            return Created("",new{customer.Id,customer.Name, Token  });
        
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
