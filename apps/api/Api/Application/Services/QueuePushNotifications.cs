using System.Net.Http.Json;
using System.Text.Json;
using Api.Infrastructuer;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Services;

/// <summary>Delivers Expo push messages when a customer's queue-ahead count reaches their chosen threshold.</summary>
public sealed class QueuePushNotifications(DoorMeenDbContext db, HttpClient httpClient, ILogger<QueuePushNotifications> logger)
{
    public async Task EvaluateAsync(string queueId)
    {
        var queue = await db.Queues.AsNoTracking().FirstOrDefaultAsync(q => q.Id == queueId);
        if (queue is null) return;

        var active = await db.QueueCustomers
            .Where(c => c.QueueId == queueId && (c.State == "waiting" || c.State == "in_progress"))
            .OrderBy(c => c.State == "in_progress" ? 0 : 1)
            .ThenBy(c => c.CreatedAt)
            .ToListAsync();

        var ahead = 0;
        foreach (var customer in active)
        {
            if (customer.State == "waiting" && customer.NotifyWhenRemaining is int threshold
                && customer.PushToken is not null && !customer.IsThresholdPushSent && ahead <= threshold)
            {
                try
                {
                    var response = await httpClient.PostAsJsonAsync("https://exp.host/--/api/v2/push/send", new
                    {
                        to = customer.PushToken,
                        title = queue.Name,
                        body = ahead == 0 ? "You're next! It's almost your turn." : $"{ahead} customer{(ahead == 1 ? "" : "s")} ahead of you.",
                        sound = "default",
                        data = new { queueId, customerId = customer.Id }
                    });
                    response.EnsureSuccessStatusCode();
                    using var ticket = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                    var data = ticket.RootElement.TryGetProperty("data", out var dataElement) ? dataElement : default;
                    var ticketStatus = data.ValueKind == JsonValueKind.Array && data.GetArrayLength() > 0
                        ? data[0].TryGetProperty("status", out var arrayStatus) ? arrayStatus.GetString() : null
                        : data.ValueKind == JsonValueKind.Object && data.TryGetProperty("status", out var objectStatus) ? objectStatus.GetString() : null;
                    if (ticketStatus != "ok")
                        throw new InvalidOperationException("Expo did not accept the push notification ticket.");
                    customer.IsThresholdPushSent = true;
                    await db.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Could not send queue push notification to customer {CustomerId}", customer.Id);
                }
            }

            // In-progress customers are ahead of every waiting customer.
            ahead++;
        }
    }
}
