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



       
        public record VerifyPasswordDto(string QueueId, string Password);


        [HttpPost("verify-password")]
        public async Task<ActionResult> VerifyPassword ([FromBody]VerifyPasswordDto req)
        {
           var res=await  _service.VerifyPassword(req.QueueId,req.Password);
            return Ok(res); 
        
        }


        [Authorize(Policy = "OwnerOfQueue")]
        [HttpGet("check-owner/{queueId}")]
        public async Task<ActionResult> CheckOwnerness(string queueId) {

            return Ok();

        }


        [Authorize(Policy = "OwnerOfQueue")]
        [HttpGet("q/{queueId}")]
        public async Task<ActionResult> GetQueueById(string queueId )
        {
            
           var queue=await _service.GetQueueById(queueId);
            return Ok(queue);
        }



        [Authorize(Policy = "OwnerOfQueue")]
        [HttpPut("set-in-progress/{queueId}/{customerId:int}")]
        public async Task<ActionResult> UpdateCustomerState(string queueId,int customerId)
        {
            await _service.UpdateCustomerState(queueId, customerId);
            return NoContent();
        }

        [Authorize(Policy = "OwnerOfQueue")]
        [HttpPut("set-waiting/{queueId}/{customerId:int}")]
        public async Task<ActionResult> RevertCustomerToWaiting(string queueId, int customerId)
        {
            await _service.RevertCustomerToWaiting(queueId, customerId);
            return NoContent();
        }


        [Authorize(Policy = "OwnerOfQueue")]
        [HttpDelete("serve/{queueId}/{customerId:int}")]
        public async Task<ActionResult> ServeCustomer(string queueId, int customerId)
        {
           await _service.ServeCustomer(queueId, customerId);
            return NoContent();
        }


        [Authorize(Policy = "OwnerOfQueue")]
        [HttpPut("change-password/{queueId}")]
        public async Task<ActionResult> ChangeQueuePassword(string queueId, [FromBody] ChangePasswordDTO req)
        {
            await _service.ChangeQueuePassword(queueId, req.Password);
            return NoContent();
        }

        [Authorize(Policy="OwnerOfQueue")]
        [HttpPut("set-max-customers/{queueId}/{max:int}")]
        public async Task<ActionResult> UpdateMaxCustomersPerQueue(string queueId,int max)
        {
            await _service.UpdateMaxCustomers(queueId, max);
            return NoContent();
            

        }

        [Authorize (Policy ="OwnerOfQueue")]
        [HttpPut("update-name/{queueId}")]
        public async Task<ActionResult> UpdateQueueName(string queueId,[FromBody] string name ) {
            await _service.UpdateQueueName(queueId, name);
            return NoContent(); 

        }

        public record UpdateMessageDto(string? Message);

        [Authorize(Policy = "OwnerOfQueue")]
        [HttpPut("update-message/{queueId}")]
        public async Task<ActionResult> UpdateOwnerMessage(string queueId, [FromBody] UpdateMessageDto req)
        {
            await _service.UpdateOwnerMessage(queueId, req.Message);
            return NoContent();
        }

        [Authorize(Policy = "OwnerOfQueue")]
        [HttpPut("update-avg-time/{queueId}/{minutes:int}")]
        public async Task<ActionResult> UpdateAvgServiceTime(string queueId, int minutes)
        {
            await _service.UpdateAvgServiceTime(queueId, minutes);
            return NoContent();
        }

        private static string? ExtractStringOrProperty(System.Text.Json.JsonElement? element, params string[] propertyNames)
        {
            if (!element.HasValue) return null;
            var el = element.Value;
            if (el.ValueKind == System.Text.Json.JsonValueKind.String)
            {
                return el.GetString();
            }
            if (el.ValueKind == System.Text.Json.JsonValueKind.Object)
            {
                foreach (var prop in propertyNames)
                {
                    if (el.TryGetProperty(prop, out var val) && val.ValueKind == System.Text.Json.JsonValueKind.String)
                    {
                        return val.GetString();
                    }
                }
                foreach (var prop in el.EnumerateObject())
                {
                    if (prop.Value.ValueKind == System.Text.Json.JsonValueKind.String)
                    {
                        return prop.Value.GetString();
                    }
                }
            }
            return null;
        }

        [Authorize(Policy = "OwnerOfQueue")]
        [HttpPut("update-closing-time/{queueId}")]
        public async Task<ActionResult> UpdateClosingTime(string queueId, [FromBody] System.Text.Json.JsonElement? req)
        {
            var timeString = ExtractStringOrProperty(req, "closingTime", "timeString", "ClosingTime", "TimeString");
            await _service.UpdateClosingTime(queueId, timeString);
            return NoContent();
        }

        [Authorize(Policy = "OwnerOfQueue")]
        [HttpPut("update-barber-phone/{queueId}")]
        public async Task<ActionResult> UpdateBarberPhoneNumber(string queueId, [FromBody] System.Text.Json.JsonElement? req)
        {
            var phone = ExtractStringOrProperty(req, "phone", "Phone");
            await _service.UpdateBarberPhoneNumber(queueId, phone);
            return NoContent();
        }

        [Authorize(Policy = "OwnerOfQueue")]
        [HttpPut("update-location/{queueId}")]
        public async Task<ActionResult> UpdateLocation(string queueId, [FromBody] System.Text.Json.JsonElement? req)
        {
            var location = ExtractStringOrProperty(req, "location", "Location");
            await _service.UpdateLocation(queueId, location);
            return NoContent();
        }

        [Authorize(Policy = "OwnerOfQueue")]
        [HttpPut("update-metadata/{queueId}")]
        public async Task<ActionResult> UpdateMetadata(string queueId, [FromBody] System.Text.Json.JsonElement? req)
        {
            var metadata = ExtractStringOrProperty(req, "metadata", "Metadata");
            await _service.UpdateMetadata(queueId, metadata);
            return NoContent();
        }
    }
}
