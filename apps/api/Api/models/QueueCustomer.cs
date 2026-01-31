namespace Api.models
{
    public class QueueCustomer
    {
        public int Id { get; set; } = default!;
        public int QueueId { get; set; } = default!;
        public QueueItem? Queue { get; set; }
        public string Name { get; set; } = "";
        public string Phone { get; set; } = "";
        public string State { get; set; } = "pending_verification"; 
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? CancelTokenHash { get; set; }

        public string? EmailVerificationTokenHash { get; set; }
        public bool IsEmailVerified { get; set; } = false;
        public DateTime? EmailVerificationTokenExpiry { get; set; }
        public string? Email { get; set; }

    }
}
