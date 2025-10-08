using System.Net;
using System.Net.Http.Json;
using Api.Infrastructuer.DTO;
using Api.Infrastructuer.resDTO;
using FluentAssertions;
using Xunit;

namespace Api.Tests.Integration;

public class QueuesApiTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public QueuesApiTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Post_CreateQueue_Returns_Created_With_Id()
    {
        var req = new AddQueueDTO { Name = "MyQ", Password = "1234" };

        var res = await _client.PostAsJsonAsync("/api/queues", req);
        res.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await res.Content.ReadFromJsonAsync<Dictionary<string, int>>();
        body.Should().NotBeNull();
        body!.Should().ContainKey("id");
        body!["id"].Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task Get_QueueById_Returns_200_With_Dto()
    {
        // First create
        var req = new AddQueueDTO { Name = "MyQ2", Password = "1234" };
        var created = await _client.PostAsJsonAsync("/api/queues", req);
        var body = await created.Content.ReadFromJsonAsync<Dictionary<string, int>>();
        var id = body!["id"];

        // Then fetch
        var res = await _client.GetAsync($"/api/queues/q/{id}");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await res.Content.ReadFromJsonAsync<QueueDetailsResDTO>();
        dto.Should().NotBeNull();
        dto!.Id.Should().Be(id);
        dto.Name.Should().Be("MyQ2");
    }
}


