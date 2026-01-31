using Api.Application.Services;
using Api.Infrastructuer.resDTO;
using Microsoft.AspNetCore.Mvc;

namespace Api.Application.Interfaces
{
    public interface IQueueServices
    {
        Task<QueueItem> CreateQueue(string queueName , string password);
        Task <QueueDetailsResDTO > GetQueueById(int id);
    }

    public interface ICustomersServices
    {
       public Task <JoinQueueResDTO> JoinQueue(int queueId,string name, string phoneNumber, string email);
       public Task<bool> SendVerificationEmail(int customerId);
       public Task<bool> VerifyEmail(int customerId, string email, int digits);
       public Task CancelRegistration(int queueId, int customerId, string cancelToken);
    }


}
