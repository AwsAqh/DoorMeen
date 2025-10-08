namespace Api.Infrastructuer.resDTO
{
    public record QueueCustomerDTO(int Id, string Name, DateTime CreatedAt, string State);
    public record QueueDetailsResDTO(
    int Id, string Name,

    List<QueueCustomerDTO> Waiters,

    DateTime CreatedAt

        );
}
