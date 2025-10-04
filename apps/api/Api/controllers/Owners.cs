using Api.Infrastructuer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api.Security;
using System.Net.NetworkInformation;
using Api.Infrastructuer.DTO;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
namespace Api.controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class Owners : ControllerBase
    {
        private readonly IConfiguration _cfg;
        private readonly DoorMeenDbContext _db;
        private readonly ILogger<Owners> _logger;
        public Owners(DoorMeenDbContext db, IConfiguration cfg,ILogger<Owners>logger ) 
        {
            _db = db;
            _cfg = cfg;
            _logger = logger;
        }



        public async Task<bool> CheckPassowrd(int queueId,string password)
        {
            var queue = await _db.Queues.SingleOrDefaultAsync(q=>q.Id==queueId);
            if (queue == null) return false;
            return !string.IsNullOrWhiteSpace(password) && Password.Verify(password, queue.HashedPassword); 
        }
        public record VerifyPasswordDto(int QueueId, string Password);


        [HttpPost("verify-password")]
        public async Task<ActionResult> VerifyPassword ([FromBody]VerifyPasswordDto req)
        {
            var ok = await CheckPassowrd(req.QueueId, req.Password);
            if (!ok) return Unauthorized();
            var jwt = _cfg.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, "owner"),
                new Claim("role", "owner"),
                new Claim("queueId", req.QueueId.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: jwt["Issuer"],
                audience: jwt["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(int.Parse(jwt["ExpiresMinutes"]!)),
                signingCredentials: creds
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
           
            return Ok(new{queueId=req.QueueId, token=tokenString }) ;
            

        }


        [Authorize(Policy = "OwnerOfQueue")]
        [HttpGet("check-owner/{queueId:int}")]
        public async Task<ActionResult> CheckOwnerness(int queueId) {

            return Ok();

        }


        [Authorize(Policy = "OwnerOfQueue")]
        [HttpGet("q/{id:int}")]
        public async Task<ActionResult<Object>> GetQueueById(int id )
        {
            
            var queue = await _db.Queues.SingleOrDefaultAsync(q => q.Id == id);
            if (queue is null) return NotFound("Not found");
              var Waiters= await _db.QueueCustomers.AsNoTracking().Where(c => c.QueueId == id).OrderBy(c => c.State).Select(c => new { c.Id, c.QueueId, c.Name, PhoneNumber = c.Phone, c.CreatedAt, c.State }).ToListAsync();

            return Ok(new
            {
                queue.Id,
                queue.Name,
                Waiters,
                queue.CreatedAt

            });

        }

        [Authorize(Policy = "OwnerOfQueue")]
        [HttpPut("set-in-progress/{queueId:int}/{customerId:int}")]
        public async Task<ActionResult> UpdateCustomerState(int queueId,int customerId)
        {
            var tokenQueueId = User.FindFirst("queueId")?.Value;
            _logger.LogInformation("token queue id : {k} , req queu id : {r}",tokenQueueId,queueId.ToString());
            if (tokenQueueId != queueId.ToString()) return Forbid();

            var customer = await _db.QueueCustomers.FindAsync(customerId);
            if (customer is null) return NotFound(customerId);

            if (customer.QueueId != queueId) return BadRequest("Customer not belong to this queue!");
            if (customer.State == "in_progress") return NoContent();
            if (customer.State != "waiting") return BadRequest("Can't done this opperation");

            customer.State = "in_progress";
            await _db.SaveChangesAsync();
            return NoContent();
        }


        [Authorize(Policy = "OwnerOfQueue")]
        [HttpDelete("serve/{queueId:int}/{customerId:int}")]
        public async Task<ActionResult> ServeCustomer(int queueId, int customerId)
        {
            var tokenQueueId = User.FindFirst("queueId")?.Value;
            if (tokenQueueId != queueId.ToString()) return Forbid();

            var customer = await _db.QueueCustomers.FindAsync(customerId);
            if (customer is null) return NotFound(customerId);
            if (customer.QueueId != queueId) return BadRequest("Customer not belong to this queue!");

            _db.QueueCustomers.Remove(customer);
            await _db.SaveChangesAsync();
            return NoContent();
        }


        [Authorize(Policy = "Owner")]
        [HttpPut("change-password")]
        public async Task<ActionResult> ChangeQueuePassword([FromBody] ChangePasswordDTO req)
        {
            var tokenQueueId = User.FindFirst("queueId")?.Value;
            if (tokenQueueId != req.QueueId.ToString()) return Forbid();

            var queue = await _db.Queues.FindAsync(req.QueueId);
            if (queue is null) return NotFound(req.QueueId);

            queue.HashedPassword = Password.HashOrNull(req.Password);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
