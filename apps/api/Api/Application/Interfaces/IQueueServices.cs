using Api.Application.Services;
using Api.Infrastructuer.resDTO;
using Microsoft.AspNetCore.Mvc;

namespace Api.Application.Interfaces
{
    public interface IQueueServices
    {
        Task<Object> CreateQueue(string queueName , string password);
        Task <QueueDetailsResDTO > GetQueueById(int id);
    }

    public interface ICustomersServices
    {
        Task <JoinQueueResDTO> JoinQueue(int queueId,string name, string phoneNumber);
        Task CancelRegistration(int queueId, int customerId, string cancelToken);
    }


}
