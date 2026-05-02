using Api.Infrastructuer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Api.Infrastructuer.DTO;
using Api.models;
using Api.security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Data;
using Api.Application.Interfaces;
using Microsoft.AspNetCore.RateLimiting;
namespace Api.Controllers
{
    [Route("api/queueCustomers")]
    [ApiController]
    public class QueueCustomersController : ControllerBase
    {


        private readonly ICustomersServices _service;
        private readonly ILogger<QueueCustomersController> _logger;

        public QueueCustomersController(ICustomersServices service, ILogger<QueueCustomersController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpPost("joinQueue")]
        [EnableRateLimiting("JoinQueuePolicy")]
        public async Task<ActionResult> AddCustomerToQueue([FromBody] AddCustomerDTO req)
        {

             var customer=await _service.JoinQueue(req.QueueId, req.Name, req.PhoneNumber, req.Email);
              
               return Created("",customer);  
        }


        [HttpPost("sendVerificationEmail")]
        [EnableRateLimiting("ResendEmailPolicy")]
        public async Task<IActionResult> SendVerificationEmail([FromBody] SendVerificationEmailDTO req)
        {
            var ok=await _service.SendVerificationEmail(req.CustomerId);
            if(!ok) return BadRequest("Failed to send verification email");
            return Ok();
        }
 


        
        [HttpPost("verifyEmail")]
        public async Task<ActionResult> VerifyEmail([FromBody] VerifyEmailDTO req)
        {
            var res = await _service.VerifyEmail(req.CustomerId, req.Email, req.Digits);
            if(res == null) return Unauthorized("Invalid digits");
            return Ok(res);
        }

        [HttpDelete("cancel/{queueId}/{customerId:int}")]
        public async Task<ActionResult> CancelRegisteration(string queueId, int customerId, [FromHeader (Name ="X-Cancel-Token")] string token)
        {
            try
            {
                await _service.CancelRegistration(queueId,customerId, token);  
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to cancel registration for customer {CustomerId} in queue {QueueId}", customerId, queueId);
                return BadRequest("Invalid cancel token");
            }
            

        }

        [HttpPut("snooze/{queueId}/{customerId:int}")]
        public async Task<ActionResult> SnoozeRegistration(string queueId, int customerId, [FromHeader (Name ="X-Cancel-Token")] string token)
        {
            try
            {
                await _service.SnoozeRegistration(queueId, customerId, token);  
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to snooze registration for customer {CustomerId} in queue {QueueId}", customerId, queueId);
                return BadRequest("Invalid cancel token or boundary limit");
            }
        }


    }
}
