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
    public Task<bool> Send(string identifier, string token)
    {
        return Task.FromResult(true);
    }

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
        mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(mockClientProxy.Object);
        var mockHub = new Mock<IHubContext<QueueHub>>();
        mockHub.Setup(h => h.Clients).Returns(mockClients.Object);
        return new CustomersServices(db, new FakeJoinVerification(), mockHub.Object);
    }

    [Fact]
    public async Task JoinQueue_Adds_Pending_Verification_Customer()
    {
        using var db = DbContextFactory.CreateInMemory();
        var queue = new QueueItem { Name = "Q1", HashedPassword = string.Empty, CreatedAt = System.DateTime.UtcNow, MaxCustomers = 5 };
        db.Queues.Add(queue);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var res = await sut.JoinQueue(queue.Id, "Alice", "0599123456", "alice@test.com");

        res.Id.Should().BeGreaterThan(0);
        res.Name.Should().Be("Alice");
        res.Token.Should().BeNull();
        res.VerificationRequired.Should().BeTrue();

        db.QueueCustomers.Count().Should().Be(1);
        db.QueueCustomers.Single().State.Should().Be("pending_verification");
    }

    [Fact]
    public async Task VerifyEmail_Sets_Customer_To_Waiting_With_Leading_Zero_Digits()
    {
        using var db = DbContextFactory.CreateInMemory();
        var queue = new QueueItem { Name = "Q1", HashedPassword = string.Empty, CreatedAt = System.DateTime.UtcNow };
        db.Queues.Add(queue);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var res = await sut.JoinQueue(queue.Id, "Alice", "0599123456", "alice@test.com");
        res.Should().NotBeNull();

        var customer = db.QueueCustomers.Single();
        customer.State.Should().Be("pending_verification");

        // Test with leading zero PIN: "042918"
        customer.EmailVerificationTokenHash = Api.security.CreateHashToken.Hash("042918");
        customer.EmailVerificationTokenExpiry = System.DateTime.UtcNow.AddMinutes(10);
        await db.SaveChangesAsync();

        var verifyRes = await sut.VerifyEmail(customer.Id, "alice@test.com", "042918");
        verifyRes.Should().NotBeNull();
        verifyRes!.Token.Should().NotBeNullOrWhiteSpace();

        customer.State.Should().Be("waiting");
        customer.IsEmailVerified.Should().BeTrue();
    }

    [Fact]
    public async Task CancelRegistration_Removes_Waiting_Customer_When_Token_Matches()
    {
        using var db = DbContextFactory.CreateInMemory();
        var queue = new QueueItem { Name = "Q1", HashedPassword = string.Empty, CreatedAt = System.DateTime.UtcNow };
        db.Queues.Add(queue);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);

        // Manually add a verified/waiting customer since JoinQueue only adds pending
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
