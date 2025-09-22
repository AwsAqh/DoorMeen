using Api.Infrastructuer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Api.Infrastructuer.DTO;
using Api.models;
using Api.security;
namespace Api.controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class QueueCustomers : ControllerBase
    {

        private readonly DoorMeenDbContext _db;
        public QueueCustomers(DoorMeenDbContext db) => _db = db;


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

            return Created("",new{customer.Id,customer.Name,customer.CancelTokenHash });
        
        }


        [HttpDelete("cancel/{queueId:int}/{customerId:int}")]
        public async Task<ActionResult> CancelRegisteration(int queueId,int customerId, [FromHeader (Name ="X-Cancel-Token")] string token )
        {

            var queue = await _db.Queues.FindAsync(queueId);
            if (queue == null) return NotFound();
            var customer=await _db.QueueCustomers.FindAsync(customerId);
            if (customer == null) return NotFound();

            if (customer.QueueId != queue.Id || customer.State!="watiting" ) return BadRequest();

            if (!CreateHashToken.Verify(token, customer.CancelTokenHash)) return Unauthorized();

            _db.QueueCustomers.Remove(customer);
            await _db.SaveChangesAsync();
            return NoContent();

        }

    }
}
