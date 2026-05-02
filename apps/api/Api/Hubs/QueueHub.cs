using Microsoft.AspNetCore.SignalR;

namespace Api.Hubs
{
    public class QueueHub : Hub
    {
        public async Task JoinQueueGroup(string queueId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, queueId);
        }

        public async Task LeaveQueueGroup(string queueId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, queueId);
        }
    }
}
