using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using DotNetEnv;

namespace Api.Infrastructuer
{
    public class DoorMeenDbContextFactory
        : IDesignTimeDbContextFactory<DoorMeenDbContext>
    {
        public DoorMeenDbContext CreateDbContext(string[] args)
        {
            // Load .env manually for EF
            Env.Load();

            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddEnvironmentVariables()
                .Build();

            var optionsBuilder = new DbContextOptionsBuilder<DoorMeenDbContext>();

            optionsBuilder.UseNpgsql(
                config["ConnectionStrings__Default"]
            );

            return new DoorMeenDbContext(optionsBuilder.Options);
        }
    }
}
