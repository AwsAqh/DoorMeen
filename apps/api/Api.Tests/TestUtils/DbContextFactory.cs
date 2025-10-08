using Api.Infrastructuer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Api.Tests.TestUtils;

public static class DbContextFactory
{
    public static DoorMeenDbContext CreateInMemory(string? name = null)
    {
        var dbName = name ?? $"DoorMeenTests_{Guid.NewGuid()}";
        var options = new DbContextOptionsBuilder<DoorMeenDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .EnableSensitiveDataLogging()
            .Options;

        return new DoorMeenDbContext(options);
    }
}


