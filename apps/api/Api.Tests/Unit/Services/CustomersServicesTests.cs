using Api.Application.Interfaces;
using Api.Infrastructuer;
using Api.Application.Services;
using Api.Hubs;
using Api.models;
using Api.Tests.TestUtils;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Moq;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace Api.Tests.Unit.Services;

public class FakeJoinVerification : IJoinVerification
{
    public Task<bool> SendYourTurnNotification(string email, string queueName)
    {
        return Task.FromResult(true);
    }
}

public class CustomersServicesTests
{
    private static CustomersServices CreateSut(DoorMeenDbContext db)
    {
        var mockClients = new Mock<IHubClients>();
        var mockClientProxy = new Mock<IClientProxy>();
        mockClientProxy
            .Setup(p => p.SendCoreAsync(It.IsAny<string>(), It.IsAny<object?[]>(), It.IsAny<System.Threading.CancellationToken>()))
            .Returns(Task.CompletedTask);
        mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(mockClientProxy.Object);
        var mockHub = new Mock<IHubContext<QueueHub>>();
        mockHub.Setup(h => h.Clients).Returns(mockClients.Object);
        return new CustomersServices(db, new FakeJoinVerification(), mockHub.Object);
    }

    [Fact]
    public async Task JoinQueue_Adds_Waiting_Customer_And_Returns_Cancel_Token()
    {
        using var db = DbContextFactory.CreateInMemory();
        var queue = new QueueItem { Name = "Q1", HashedPassword = string.Empty, CreatedAt = System.DateTime.UtcNow, MaxCustomers = 5 };
        db.Queues.Add(queue);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var res = await sut.JoinQueue(queue.Id, "Alice", "0599123456", "alice@test.com");

        res.Id.Should().BeGreaterThan(0);
        res.Name.Should().Be("Alice");
        res.Token.Should().NotBeNullOrWhiteSpace();

        db.QueueCustomers.Count().Should().Be(1);
        var customer = db.QueueCustomers.Single();
        customer.State.Should().Be("waiting");
        Api.security.CreateHashToken.Verify(res.Token, customer.CancelTokenHash!).Should().BeTrue();
    }

    [Fact]
    public async Task JoinQueue_Rejects_Duplicate_Phone_Or_Email_In_Queue()
    {
        using var db = DbContextFactory.CreateInMemory();
        var queue = new QueueItem { Name = "Q1", HashedPassword = string.Empty, CreatedAt = System.DateTime.UtcNow };
        db.Queues.Add(queue);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        await sut.JoinQueue(queue.Id, "Alice", "0599123456", "alice@test.com");

        var duplicatePhone = () => sut.JoinQueue(queue.Id, "Bob", "0599123456", "bob@test.com");
        var duplicateEmail = () => sut.JoinQueue(queue.Id, "Bob", "0599123457", "ALICE@test.com");
        await duplicatePhone.Should().ThrowAsync<System.ComponentModel.DataAnnotations.ValidationException>();
        await duplicateEmail.Should().ThrowAsync<System.ComponentModel.DataAnnotations.ValidationException>();
        db.QueueCustomers.Count().Should().Be(1);
    }

    [Fact]
    public async Task CancelRegistration_Removes_Waiting_Customer_When_Token_Matches()
    {
        using var db = DbContextFactory.CreateInMemory();
        var queue = new QueueItem { Name = "Q1", HashedPassword = string.Empty, CreatedAt = System.DateTime.UtcNow };
        db.Queues.Add(queue);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);

        // Manually add a waiting customer with a known cancel token.
        var customer = new QueueCustomer
        {
            QueueId = queue.Id,
            Name = "Bob",
            Phone = "0599123456",
            Email = "bob@test.com",
            State = "waiting",
            CancelTokenHash = Api.security.CreateHashToken.Hash("123456")
        };
        db.QueueCustomers.Add(customer);
        await db.SaveChangesAsync();

        await sut.CancelRegistration(queue.Id, customer.Id, "123456");

        db.QueueCustomers.Count().Should().Be(0);
    }
}
