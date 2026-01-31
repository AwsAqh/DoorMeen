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
namespace Api.Controllers
{
    [Route("api/queueCustomers")]
    [ApiController]
    public class QueueCustomersController : ControllerBase
    {


        private readonly ICustomersServices _service;
        public QueueCustomersController(ICustomersServices service) =>_service =service;



        [HttpPost("joinQueue")]
        public async Task<ActionResult> AddCustomerToQueue([FromBody] AddCustomerDTO req)
        {

             var customer=await _service.JoinQueue(req.QueueId, req.Name, req.PhoneNumber, req.Email);
              
               return Created("",customer);  
        }


        [HttpPost("sendVerificationEmail")]
        public async Task<IActionResult> SendVerificationEmail([FromBody] SendVerificationEmailDTO req)
        {
            var ok=await _service.SendVerificationEmail(req.CustomerId);
            if(!ok) return BadRequest("Failed to send verification email");
            return Ok();
        }
 


        
        [HttpPost("verifyEmail")]
        public async Task<ActionResult> VerifyEmail([FromBody] VerifyEmailDTO req)
        {
            var ok=await _service.VerifyEmail(req.CustomerId, req.Email, req.Digits);
            if(!ok) return Unauthorized("Invalid digits");
            return NoContent();
        }

        [HttpDelete("cancel/{queueId:int}/{customerId:int}")]
        public async Task<ActionResult> CancelRegisteration(int queueId, int customerId, [FromHeader (Name ="X-Cancel-Token")] string token)
        {
            try
            {
                await _service.CancelRegistration(queueId,customerId, token);  
                return NoContent();
            }
            catch (Exception)
            {
                return BadRequest("Invalid cancel token");
            }
            

        }

    }
}
