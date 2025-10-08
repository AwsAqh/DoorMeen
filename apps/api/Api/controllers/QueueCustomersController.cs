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


        [HttpPost]
        public async Task<ActionResult> AddCustomerToQueue([FromBody] AddCustomerDTO req)
        {

             var customer=await _service.JoinQueue(req.QueueId, req.Name, req.PhoneNumber);
              
               return Created("",customer);  
        }




        [HttpDelete("cancel/{queueId:int}/{customerId:int}")]
        public async Task<ActionResult> CancelRegisteration(int queueId, int customerId, [FromHeader (Name ="X-Cancel-Token")] string token)
        {
            await _service.CancelRegistration(queueId,customerId, token);  
            return NoContent();
            

        }

    }
}
