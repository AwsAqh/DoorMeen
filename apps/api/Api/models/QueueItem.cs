

using Api.models;
using System.Collections.ObjectModel;

public class QueueItem() {

    public int Id { set; get; }

    public string Name { get; set; }

    public string HashedPassword { get; set; }

    public DateTime CreatedAt { get; set; }
    public int? MaxCustomers { get; set; }
    public ICollection<QueueCustomer> Customers { get; set; } = new List<QueueCustomer>();


}