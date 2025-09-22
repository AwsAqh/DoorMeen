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


        [HttpGet("q/{id:int}")]
        public async Task<ActionResult<Object>> GetQueueById(int id)
        {
            var queue=await _db.Queues.SingleOrDefaultAsync(q=>q.Id==id);
            if (queue is null) return NotFound("Not found");

            var waitings = await _db.QueueCustomers.AsNoTracking().Where(c => c.QueueId == id && c.State == "waiting").OrderBy(c=>c.CreatedAt).Select(c => new { c.Name,c.CreatedAt,c.State }).ToListAsync();

            var InProgress = await _db.QueueCustomers.AsNoTracking().Where(c => c.QueueId == id && c.State == "In_Progress").Select(c => new {  c.Name, c.CreatedAt, c.State }).ToListAsync();
            return Ok(new
            {
                Id = queue.Id,
                Name = queue.Name,
                waitings,
                InProgress,
                CreatedAt = queue.CreatedAt

            });

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

            return Created();

        }


       
    }
}
