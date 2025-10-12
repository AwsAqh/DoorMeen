using Api.Infrastructuer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Api.Infrastructuer.DTO;
using Api.Security;
using Microsoft.EntityFrameworkCore;
using Api.Infrastructuer.resDTO;
using Api.Application.Interfaces;
namespace Api.Controllers
{
    [Route("api/queues")]
    [ApiController]
    public class QueuesController : ControllerBase
    {
        private readonly DoorMeenDbContext _db;
        private readonly IQueueServices _services;
        public QueuesController(IQueueServices services) => _services =services;

      

        [HttpGet("q/{id:int}")]
        public async Task<ActionResult<Object>> GetQueueById(int id)
        {
            var queue=await _services.GetQueueById(id);
            if(queue is null) return NotFound();
            return Ok(queue);
            
        }


        [HttpPost]
        public async Task<IActionResult> AddQueueItem([FromBody] AddQueueDTO req )
        {
            var res = await _services.CreateQueue(req.Name, req.Password);
            if(res is null) return BadRequest();
            return Created("",new {id=res.Id});

        }


       
    }
}
