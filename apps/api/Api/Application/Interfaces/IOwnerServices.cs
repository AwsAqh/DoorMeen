using Api.Infrastructuer.resDTO;

namespace Api.Application.Interfaces
{
    public interface IOwnerServices
    {
        Task<VerifyPasswordResDTO> VerifyPassword (int queueId,string password);
        Task <OwnerQueueByIdResDTO> GetQueueById(int id);

        Task UpdateCustomerState(int queueId, int customerId);

        Task ServeCustomer (int queueId,int customerId);

        Task ChangeQueuePassword (int queueId,string newPassword);

        Task UpdateMaxCustomers (int queueId,int maxCustomers);

        Task UpdateQueueName (int queueId,string queueName);
    }
}
