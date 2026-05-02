using Api.Application.Services;
using Api.Infrastructuer.resDTO;
using Microsoft.AspNetCore.Mvc;

namespace Api.Application.Interfaces
{
    public interface IQueueServices
    {
        Task<QueueItem> CreateQueue(string queueName , string password);
        Task <QueueDetailsResDTO > GetQueueById(string id);
    }

    public interface ICustomersServices
    {
       public Task <JoinQueueResDTO> JoinQueue(string queueId,string name, string phoneNumber, string email);
       public Task<bool> SendVerificationEmail(int customerId);
       public Task<VerifyEmailResDTO?> VerifyEmail(int customerId, string email, int digits);
       public Task CancelRegistration(string queueId, int customerId, string cancelToken);
       public Task SnoozeRegistration(string queueId, int customerId, string cancelToken);
    }


}
