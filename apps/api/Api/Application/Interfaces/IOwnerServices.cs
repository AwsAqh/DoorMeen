using Api.Infrastructuer.resDTO;

namespace Api.Application.Interfaces
{
    public interface IOwnerServices
    {
        Task<VerifyPasswordResDTO> VerifyPassword (string queueId,string password);
        Task <OwnerQueueByIdResDTO> GetQueueById(string id);

        Task UpdateCustomerState(string queueId, int customerId);

        Task ServeCustomer (string queueId,int customerId);

        Task ChangeQueuePassword (string queueId,string newPassword);

        Task UpdateMaxCustomers (string queueId,int maxCustomers);

        Task UpdateQueueName (string queueId,string queueName);

        Task UpdateOwnerMessage (string queueId, string? message);

        Task UpdateAvgServiceTime (string queueId, int minutes);
    }
}
