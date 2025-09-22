using Api.Infrastructuer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api.Security;
using System.Net.NetworkInformation;
using Api.Infrastructuer.DTO;
namespace Api.controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class Owners : ControllerBase
    {
        private readonly DoorMeenDbContext _db;
        public Owners(DoorMeenDbContext db) => _db = db;


        public async Task<bool> CheckPassowrd(int queueId,string password)
        {
            var queue = await _db.Queues.FindAsync(queueId);
            if (queue == null) return false;
            return !string.IsNullOrWhiteSpace(password) && Password.Verify(password, queue.HashedPassword); 
        }
        public record VerifyPasswordDto(int queueId, string password);


        [HttpPost("verify-password")]
        public async Task<ActionResult> VerifyPassword ([FromBody]VerifyPasswordDto req)
        {
            var ok = await CheckPassowrd(req.queueId, req.password);
            return ok ? Ok() : Unauthorized();
            

        } 


        [HttpGet("q/{id:int}")]
        public async Task<ActionResult<Object>> GetQueueById(int id, [FromHeader (Name="X-Owner-Password") ] string? password )
        {
            var queue = await _db.Queues.SingleOrDefaultAsync(q => q.Id == id);
            if (queue is null) return NotFound("Not found");


            if (!await CheckPassowrd(queue.Id, password)) return Unauthorized();

            var waitings = await _db.QueueCustomers.AsNoTracking().Where(c => c.QueueId == id && c.State == "waiting").OrderBy(c => c.CreatedAt).Select(c => new {c.Id, c.Name,c.Phone, c.CreatedAt, c.State }).ToListAsync();
            var InProgress=await _db.QueueCustomers.AsNoTracking().Where(c=>c.QueueId==id && c.State == "In_Progress").Select(c=>new {c.Id,c.Name,c.Phone,c.CreatedAt, c.State}).ToListAsync();
            return Ok(new
            {
                Id = queue.Id,
                Name = queue.Name,
                waitings,
                InProgress,
                CreatedAt = queue.CreatedAt

            });

        }


        [HttpPut("set-in-progress")]
        public async Task<ActionResult> UpdateCustomerState([FromBody] UpdateCustomerStateDTO req, [FromHeader (Name = "X-Owner-Password") ] string? password )

        {
            var customer = await _db.QueueCustomers.FindAsync(req.CustomerId);
            if (customer is null) return NotFound(req.CustomerId);

            var queue=await _db.Queues.FindAsync(req.QueueId);
            if(queue is null ) return NotFound(req.QueueId);

            if( ! await CheckPassowrd(req.QueueId, password)) return Unauthorized();

            if(customer.QueueId!= req.QueueId) return BadRequest("Customer not belong to this queue!");

            if (customer.State == "In_Progress") return NoContent();

            if (customer.State != "waiting") return BadRequest("Can't done this opperation ");
            customer.State = "In_Progress";
            
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("serve/{queueId:int}/{customerId:int}")]
        public async Task<ActionResult> ServeCustomer(int queueId  ,int customerId, [FromHeader (Name = "X-Owner-Password") ] string? password )
        {
            var customer = await _db.QueueCustomers.FindAsync(customerId);
            if (customer is null) return NotFound(customerId);

            var queue = await _db.Queues.FindAsync(queueId);
            if (queue is null) return NotFound(queueId);

            if (!await CheckPassowrd(queueId, password)) return Unauthorized();

            if (customer.QueueId != queueId) return BadRequest("Customer not belong to this queue!");
            _db.QueueCustomers.Remove(customer);
            await _db.SaveChangesAsync();
            return NoContent();

        }


        [HttpPut("change-password")]
        public async Task<ActionResult> ChangeQueuePassword([FromBody] ChangePasswordDTO req, [FromHeader(Name = "X-Owner-Password")] string password)
        {

            var queue=await _db.Queues.FindAsync(req.QueueId);
            if (queue is null) return NotFound(req.QueueId);
            var ok=await CheckPassowrd(req.QueueId, password);
            if(!ok) return Unauthorized();
            var NewPassword=Password.HashOrNull(req.Password);
            queue.HashedPassword = NewPassword;
            await _db.SaveChangesAsync();
            return NoContent();


        }
    }
}
