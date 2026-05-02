using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;

namespace Api.Authorization;



public sealed class SameQueueHandler : AuthorizationHandler<SameQueueRequirement>
{
    private readonly IHttpContextAccessor _http;
    public SameQueueHandler(IHttpContextAccessor http) => _http = http;

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        SameQueueRequirement requirement)
    {
        // Must be authenticated; if not, let the pipeline return 401
        if (context.User?.Identity?.IsAuthenticated != true)
            return Task.CompletedTask;

        // role can be "role" or ClaimTypes.Role depending on your JWT config
        var role = context.User.FindFirst(ClaimTypes.Role)?.Value
                ?? context.User.FindFirst("role")?.Value;

        var claimQueueId = context.User.FindFirst("queueId")?.Value;

        var rd = _http.HttpContext?.GetRouteData()?.Values;
        var routeIdStr = (rd?["queueId"] ?? rd?["id"])?.ToString();

        // If we don’t have enough info, don’t throw; just let it be unauthorized/forbidden later
        if (string.IsNullOrWhiteSpace(role) ||
            string.IsNullOrWhiteSpace(claimQueueId) ||
            string.IsNullOrWhiteSpace(routeIdStr))
            return Task.CompletedTask;

        // Compare string IDs since we use ULID
        var sameId = string.Equals(claimQueueId, routeIdStr, StringComparison.Ordinal);

        var isOwner = string.Equals(role, "owner", StringComparison.OrdinalIgnoreCase);

        if (isOwner && sameId)
        {
            context.Succeed(requirement);
        }
        else
        {
            // Authenticated but not allowed -> 403
            context.Fail();
        }

        return Task.CompletedTask;
    }
}
