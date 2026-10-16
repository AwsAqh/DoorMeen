using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Api.Tests.Unit.Services;

public class EmailJoinVerificationTests
{
    [Fact]
    public async Task SendYourTurnNotification_Refreshes_Google_Token_And_Sends_Gmail_Message_Over_Https()
    {
        var handler = new GmailApiHandler();
        using var client = new HttpClient(handler);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Gmail:ClientId"] = "client-id",
            ["Gmail:ClientSecret"] = "client-secret",
            ["Gmail:RefreshToken"] = "refresh-token",
            ["Gmail:SenderEmail"] = "sender@gmail.com"
        }).Build();
        var sut = new EmailJoinVerification(config, client, NullLogger<EmailJoinVerification>.Instance);

        var sent = await sut.SendYourTurnNotification("customer@example.com", "Test Queue");

        sent.Should().BeTrue();
        handler.TokenRequest!.RequestUri!.AbsoluteUri.Should().Be("https://oauth2.googleapis.com/token");
        handler.TokenRequestContent.Should().Contain("grant_type=refresh_token");
        handler.GmailRequest!.RequestUri!.AbsoluteUri.Should().Be("https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
        handler.GmailRequest.Headers.Authorization!.Scheme.Should().Be("Bearer");
        handler.GmailRequest.Headers.Authorization.Parameter.Should().Be("access-token");

        using var requestJson = JsonDocument.Parse(handler.GmailRequestContent!);
        var raw = requestJson.RootElement.GetProperty("raw").GetString()!;
        var message = Encoding.UTF8.GetString(Convert.FromBase64String(
            raw.Replace('-', '+').Replace('_', '/') + new string('=', (4 - raw.Length % 4) % 4)));

        message.Should().Contain("To: customer@example.com");
        message.Should().Contain("sender@gmail.com");
        var encodedBody = message.Split("\r\n\r\n", 2)[1].Replace("\r\n", string.Empty);
        var body = Encoding.UTF8.GetString(Convert.FromBase64String(encodedBody));
        body.Should().Contain("You are now at the front of the line for Test Queue.");
    }

    private sealed class GmailApiHandler : HttpMessageHandler
    {
        public HttpRequestMessage? TokenRequest { get; private set; }
        public HttpRequestMessage? GmailRequest { get; private set; }
        public string? TokenRequestContent { get; private set; }
        public string? GmailRequestContent { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (request.RequestUri!.Host == "oauth2.googleapis.com")
            {
                TokenRequest = request;
                TokenRequestContent = await request.Content!.ReadAsStringAsync(cancellationToken);
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"access_token\":\"access-token\",\"expires_in\":3600}", Encoding.UTF8, "application/json")
                };
            }

            GmailRequest = request;
            GmailRequestContent = await request.Content!.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"id\":\"message-id\"}", Encoding.UTF8, "application/json")
            };
        }
    }
}
