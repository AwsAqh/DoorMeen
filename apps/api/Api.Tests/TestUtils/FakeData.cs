using Api.models;

namespace Api.Tests.TestUtils;

public static class FakeData
{
    public static QueueItem NewQueue(string name = "TestQueue") => new QueueItem
    {
        Name = name,
        HashedPassword = null,
        CreatedAt = DateTime.UtcNow
    };
}


