namespace Api.models
{
    public class QueueCustomer
    {
        public int Id { get; set; } = default!;
        public int QueueId { get; set; } = default!;
        public QueueItem? Queue { get; set; }
        public string Name { get; set; } = "";
        public string Phone { get; set; } = "";
        public string State { get; set; } = "waiting"; 
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? CancelTokenHash { get; set; }
    }
}
