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
using Api.Application.Interfaces;

namespace Api.Controllers
{
    [Route("api/owners")]
    [ApiController]
    public class Owners : ControllerBase
    {
        private readonly IOwnerServices _service;
        
       
        public Owners(IOwnerServices service ) 
        {
           
            _service = service; 
            
           
        }



       
        public record VerifyPasswordDto(int QueueId, string Password);


        [HttpPost("verify-password")]
        public async Task<ActionResult> VerifyPassword ([FromBody]VerifyPasswordDto req)
        {
           var res=await  _service.VerifyPassword(req.QueueId,req.Password);
            return Ok(res); 
        
        }


        [Authorize(Policy = "OwnerOfQueue")]
        [HttpGet("check-owner/{queueId:int}")]
        public async Task<ActionResult> CheckOwnerness(int queueId) {

            return Ok();

        }


        [Authorize(Policy = "OwnerOfQueue")]
        [HttpGet("q/{queueId:int}")]
        public async Task<ActionResult> GetQueueById(int queueId )
        {
            
           var queue=await _service.GetQueueById(queueId);
            return Ok(queue);
        }



        [Authorize(Policy = "OwnerOfQueue")]
        [HttpPut("set-in-progress/{queueId:int}/{customerId:int}")]
        public async Task<ActionResult> UpdateCustomerState(int queueId,int customerId)
        {
            await _service.UpdateCustomerState(queueId, customerId);
            return NoContent();
        }


        [Authorize(Policy = "OwnerOfQueue")]
        [HttpDelete("serve/{queueId:int}/{customerId:int}")]
        public async Task<ActionResult> ServeCustomer(int queueId, int customerId)
        {
           await _service.ServeCustomer(queueId, customerId);
            return NoContent();
        }


        [Authorize(Policy = "Owner")]
        [HttpPut("change-password")]
        public async Task<ActionResult> ChangeQueuePassword([FromBody] ChangePasswordDTO req)
        {
            await _service.ChangeQueuePassword(req.QueueId, req.Password);
            return NoContent();
        }

        [Authorize(Policy="OwnerOfQueue")]
        [HttpPut("set-max-customers/{queueId:int}/{max:int}")]
        public async Task<ActionResult> UpdateMaxCustomersPerQueue(int queueId,int max)
        {
            await _service.UpdateMaxCustomers(queueId, max);
            return NoContent();
            

        }

        [Authorize (Policy ="OwnerOfQueue")]
        [HttpPut("update-name/{queueId:int}")]
        public async Task<ActionResult> UpdateQueueName(int queueId,[FromBody] string name ) {
            await _service.UpdateQueueName(queueId, name);
            return NoContent(); 

        }
    }
}
