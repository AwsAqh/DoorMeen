namespace Api.Infrastructuer.resDTO
{
    public record OwnerQueueByIdCustomerResDTO(int Id,string Name,int QueueId,string Phone,string State);
    public record OwnerQueueByIdResDTO(int Id,string Name,ICollection<OwnerQueueByIdCustomerResDTO> Waiters,DateTime CreatedAt, int? MaxCustomers);
}
