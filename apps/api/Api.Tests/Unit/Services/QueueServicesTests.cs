using System.Linq;
using System.Threading.Tasks;
using Api.Application.Services;
using Api.models;
using Api.Tests.TestUtils;
using FluentAssertions;
using Xunit;

namespace Api.Tests.Unit.Services;

public class QueueServicesTests
{
    [Fact]
    public async Task CreateQueue_Persists_And_Hashes_Password()
    {
        using var db = DbContextFactory.CreateInMemory();
        var sut = new QueueServices(db);

        var result = await sut.CreateQueue("MyQueue", "1234");

        result.Should().NotBeNull();
        db.Queues.Count().Should().Be(1);
        var saved = db.Queues.Single();
        saved.Name.Should().Be("MyQueue");
        saved.HashedPassword.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GetQueueById_Returns_Details_When_Found()
    {
        using var db = DbContextFactory.CreateInMemory();
        var q = new QueueItem { Name = "Q1", HashedPassword = string.Empty, CreatedAt = System.DateTime.UtcNow };
        db.Queues.Add(q);
        await db.SaveChangesAsync();

        var sut = new QueueServices(db);
        var dto = await sut.GetQueueById(q.Id);

        dto.Should().NotBeNull();
        dto!.Id.Should().Be(q.Id);
        dto.Name.Should().Be("Q1");
    }

    [Fact]
    public async Task GetQueueById_Returns_Null_When_NotFound()
    {
        using var db = DbContextFactory.CreateInMemory();
        var sut = new QueueServices(db);

        var dto = await sut.GetQueueById(999999);

        dto.Should().BeNull();
    }
}


