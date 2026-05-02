

using Api.models;
using System.Collections.ObjectModel;

public class QueueItem() {

    public string Id { set; get; } = Guid.NewGuid().ToString("N").Substring(0, 26);

    public string Name { get; set; }

    public string HashedPassword { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; 
    public int? MaxCustomers { get; set; }
    public string? OwnerMessage { get; set; }
    public int? AvgServiceTime { get; set; }
    public TimeSpan? DailyResetTime { get; set; }
    public ICollection<QueueCustomer> Customers { get; set; } = new List<QueueCustomer>();

    

}