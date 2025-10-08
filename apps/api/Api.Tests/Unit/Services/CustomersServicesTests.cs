using System.Linq;
using System.Threading.Tasks;
using Api.Application.Services;
using Api.models;
using Api.Tests.TestUtils;
using FluentAssertions;
using Xunit;

namespace Api.Tests.Unit.Services;

public class CustomersServicesTests
{
    [Fact]
    public async Task JoinQueue_Adds_Waiting_Customer_And_Returns_Token()
    {
        using var db = DbContextFactory.CreateInMemory();
        var queue = new QueueItem { Name = "Q1", HashedPassword = string.Empty, CreatedAt = System.DateTime.UtcNow, MaxCustomers = 5 };
        db.Queues.Add(queue);
        await db.SaveChangesAsync();

        var sut = new CustomersServices(db);
        var res = await sut.JoinQueue(queue.Id, "Alice", "555-123");

        res.Id.Should().BeGreaterThan(0);
        res.Name.Should().Be("Alice");
        res.Token.Should().NotBeNullOrWhiteSpace();
        db.QueueCustomers.Count().Should().Be(1);
        db.QueueCustomers.Single().State.Should().Be("waiting");
    }

    [Fact]
    public async Task CancelRegistration_Removes_Waiting_Customer_When_Token_Matches()
    {
        using var db = DbContextFactory.CreateInMemory();
        var queue = new QueueItem { Name = "Q1", HashedPassword = string.Empty, CreatedAt = System.DateTime.UtcNow };
        db.Queues.Add(queue);
        await db.SaveChangesAsync();

        var sut = new CustomersServices(db);
        var join = await sut.JoinQueue(queue.Id, "Bob", "555-456");

        await sut.CancelRegistration(queue.Id, join.Id, join.Token);

        db.QueueCustomers.Count().Should().Be(0);
    }
}


