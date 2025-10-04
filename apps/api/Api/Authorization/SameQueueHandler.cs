
namespace Api.Authorization;

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;

public sealed class SameQueueHandler : AuthorizationHandler<SameQueueRequirement>
{
    private readonly IHttpContextAccessor _http;

    public SameQueueHandler(IHttpContextAccessor http) => _http = http;

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        SameQueueRequirement requirement)
    {
        var role = context.User.FindFirst(ClaimTypes.Role)?.Value
                   ?? context.User.FindFirst("role")?.Value;
        var tokenQueueId = context.User.FindFirst("queueId")?.Value;

        var rd = _http.HttpContext?.GetRouteData()?.Values;
        var routeQueueId =
            (rd?["queueId"] ?? rd?["id"])?.ToString(); // support both names

        if (role == "owner"
            && !string.IsNullOrEmpty(tokenQueueId)
            && !string.IsNullOrEmpty(routeQueueId)
            && routeQueueId == tokenQueueId)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
