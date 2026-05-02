using System.Linq;
using Api.Application.Interfaces;
using Api.Infrastructuer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Api.Tests.Integration;

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

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Provide fake JWT config so Program.cs doesn't throw
        builder.ConfigureAppConfiguration((ctx, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt__Issuer"]   = "test-issuer",
                ["Jwt__Audience"] = "test-audience",
                ["Jwt__Key"]      = "super-secret-test-key-1234567890!!"
            });
        });

        builder.ConfigureServices(services =>
        {
            // Remove the existing DbContext registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<DoorMeenDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            // Add InMemory DB for tests
            services.AddDbContext<DoorMeenDbContext>(o =>
                o.UseInMemoryDatabase($"ApiInMemory_{System.Guid.NewGuid()}").EnableSensitiveDataLogging());

            // Remove existing IJoinVerification and add Fake
            var verificationDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IJoinVerification));
            if (verificationDescriptor != null) services.Remove(verificationDescriptor);
            services.AddScoped<IJoinVerification, FakeJoinVerification>();
        });
    }
}
