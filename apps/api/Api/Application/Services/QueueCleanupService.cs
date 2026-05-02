using Api.Infrastructuer;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Services
{
    public class QueueCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<QueueCleanupService> _logger;

        public QueueCleanupService(IServiceScopeFactory scopeFactory, ILogger<QueueCleanupService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Queue Cleanup Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupUnverifiedUsersAsync(stoppingToken);
                    await CleanupNightlyResetQueuesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred while cleaning up queue customers.");
                }

                // Run the cleanup task every 1 minute
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }

        private async Task CleanupUnverifiedUsersAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<DoorMeenDbContext>();

            // 10 minutes timeout for unverified users
            var thresholdTime = DateTime.UtcNow.AddMinutes(-10);

            var deletedCount = await dbContext.QueueCustomers
                .Where(qc => qc.State == "pending_verification" && qc.CreatedAt < thresholdTime)
                .ExecuteDeleteAsync(cancellationToken);

            if (deletedCount > 0)
            {
                _logger.LogInformation("Deleted {Count} unverified users who exceeded the 10-minute verification timeout.", deletedCount);
            }
        }

        private async Task CleanupNightlyResetQueuesAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<DoorMeenDbContext>();

            // Get current UTC time and time of day
            var now = DateTime.UtcNow;
            
            // Find queues that have DailyResetTime configured
            var queuesToReset = await dbContext.Queues
                .Where(q => q.DailyResetTime != null)
                .ToListAsync(cancellationToken);
                
            foreach (var queue in queuesToReset)
            {
                // This is a naive checking method: If current UTC TimeOfDay surpasses the DailyResetTime
                // and the users were created BEFORE the start of this current 'business day' (e.g. yesterday).
                // A simpler check: wipe anyone created more than 12 hours ago if it's past reset time.
                // Or simply: wipe anyone created BEFORE the most recent DailyResetTime marker.
                
                var resetTime = queue.DailyResetTime!.Value;
                DateTime lastResetMarker;
                
                if (now.TimeOfDay >= resetTime)
                {
                    lastResetMarker = now.Date + resetTime;
                }
                else
                {
                    lastResetMarker = now.Date.AddDays(-1) + resetTime;
                }
                
                var deletedCount = await dbContext.QueueCustomers
                    .Where(qc => qc.QueueId == queue.Id && qc.CreatedAt < lastResetMarker)
                    .ExecuteDeleteAsync(cancellationToken);
                    
                if (deletedCount > 0)
                {
                    _logger.LogInformation("Nightly Reset: Wiped {Count} ghost customers from Queue {QueueId}.", deletedCount, queue.Id);
                }
            }
        }
    }
}
