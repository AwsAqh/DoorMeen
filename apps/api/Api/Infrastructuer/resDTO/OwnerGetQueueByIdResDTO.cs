namespace Api.Infrastructuer.resDTO
{
    public record OwnerQueueByIdCustomerResDTO(int Id,string Name,string QueueId,string PhoneNumber,string State);
    public record OwnerQueueByIdResDTO(string Id,string Name,ICollection<OwnerQueueByIdCustomerResDTO> Waiters,DateTime CreatedAt, int? MaxCustomers, string? OwnerMessage, int? AvgServiceTime);
}
