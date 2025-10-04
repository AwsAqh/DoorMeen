using Api.Infrastructuer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Api.Infrastructuer.DTO;
using Api.Security;
using Microsoft.EntityFrameworkCore;
namespace Api.controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class Queues : ControllerBase
    {
        private readonly DoorMeenDbContext _db;
        public Queues(DoorMeenDbContext db) => _db = db;

        public record QueueCustomerDto(int Id,string Name, DateTime CreatedAt, string State);
        public record QueueDetailsDto(
        int Id, string Name,
     
        List<QueueCustomerDto> Waiters,
      
        DateTime CreatedAt
            
            );

        [HttpGet("q/{id:int}")]
        public async Task<ActionResult<Object>> GetQueueById(int id)
        {
            var queue=await _db.Queues.SingleOrDefaultAsync(q=>q.Id==id);
            if (queue is null) return NotFound("Not found");

            var Waiters = await _db.QueueCustomers.AsNoTracking().Where(c => c.QueueId == id).OrderBy(c => c.State).Select(c => new QueueCustomerDto( c.Id, c.Name, c.CreatedAt, c.State )).ToListAsync();

            var res = new QueueDetailsDto(
                 Id: queue.Id,
                 Name: queue.Name,
                 Waiters,
                 CreatedAt: queue.CreatedAt
             );
            return Ok(res);

        }


        [HttpPost]
        public async Task<ActionResult<QueueItem>> AddQueueItem([FromBody] AddQueueDTO req )
        {
            if (req == null) throw new ArgumentNullException(nameof(req));
            if(req.Name is null || req.Password is null ) throw new ArgumentNullException(nameof(req));

            var queue = new QueueItem
            {
                
                Name = req.Name,
                HashedPassword = Password.HashOrNull(req.Password),
                CreatedAt = DateTime.UtcNow,
               
            };
            _db.Queues.Add(queue);
            _db.SaveChanges();

            return Created("",new {id=queue.Id});

        }


       
    }
}
