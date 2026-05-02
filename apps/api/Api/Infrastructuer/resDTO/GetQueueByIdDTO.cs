namespace Api.Infrastructuer.resDTO
{
    public record QueueCustomerDTO(int Id, string Name, DateTime CreatedAt, string State);
    public record QueueDetailsResDTO(
    string Id, string Name,

    List<QueueCustomerDTO> Waiters,

    DateTime CreatedAt,
    string? OwnerMessage,
    int? AvgServiceTime

        );
}
