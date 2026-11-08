namespace Api.Infrastructuer.resDTO
{
    public record QueueCustomerDTO(int Id, string Name, DateTime CreatedAt, string State, int? NotifyWhenRemaining = null);
    public record QueueDetailsResDTO(
    string Id, string Name,

    List<QueueCustomerDTO> Waiters,

    DateTime CreatedAt,
    string? OwnerMessage,
    int? AvgServiceTime,
    TimeSpan? DailyResetTime,
    string? BarberPhoneNumber,
    string? Location,
    string? Metadata

        );
}
