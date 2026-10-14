using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using Api.Application.Interfaces;

public class EmailJoinVerification : IJoinVerification
{
    private const string GmailSendUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
    private const string GoogleTokenUrl = "https://oauth2.googleapis.com/token";
    private readonly IConfiguration _config;
    private readonly HttpClient _httpClient;
    private readonly ILogger<EmailJoinVerification> _logger;

    public EmailJoinVerification(
        IConfiguration config,
        HttpClient httpClient,
        ILogger<EmailJoinVerification> logger)
    {
        _config = config;
        _httpClient = httpClient;
        _logger = logger;
    }

    public Task<bool> Send(string email, string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return Task.FromResult(false);

        var body = $"Your DoorMeen verification code is: {token}\n\n" +
                   "This code expires in 10 minutes.\n" +
                   "If you didn't request this, ignore this email.";

        return SendEmail(email, "DoorMeen - Email verification code", body);
    }

    public Task<bool> SendYourTurnNotification(string email, string queueName)
    {
        if (string.IsNullOrWhiteSpace(queueName)) return Task.FromResult(false);

        var body = $"Heads up!\n\n" +
                   $"You are now at the front of the line for {queueName}.\n" +
                   "Please head inside or get ready for your turn.\n\n" +
                   "Thanks for using DoorMeen!";

        return SendEmail(email, $"DoorMeen - You're Next at {queueName}!", body);
    }

    private async Task<bool> SendEmail(string email, string subject, string body)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;

        var clientId = _config["Gmail:ClientId"];
        var clientSecret = _config["Gmail:ClientSecret"];
        var refreshToken = _config["Gmail:RefreshToken"];
        var sender = _config["Gmail:SenderEmail"];

        if (string.IsNullOrWhiteSpace(clientId) ||
            string.IsNullOrWhiteSpace(clientSecret) ||
            string.IsNullOrWhiteSpace(refreshToken) ||
            string.IsNullOrWhiteSpace(sender))
        {
            _logger.LogError("Gmail API is not configured. Set Gmail:ClientId, Gmail:ClientSecret, Gmail:RefreshToken, and Gmail:SenderEmail.");
            return false;
        }

        if (!MailAddress.TryCreate(email, out var recipient) ||
            !MailAddress.TryCreate(sender, out var senderAddress))
        {
            _logger.LogError("Gmail API sender or recipient address is invalid.");
            return false;
        }

        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        try
        {
            using var tokenResponse = await _httpClient.PostAsync(
                GoogleTokenUrl,
                new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["client_id"] = clientId,
                    ["client_secret"] = clientSecret,
                    ["refresh_token"] = refreshToken,
                    ["grant_type"] = "refresh_token"
                }),
                timeout.Token);

            if (!tokenResponse.IsSuccessStatusCode)
            {
                _logger.LogError("Google OAuth token refresh failed with HTTP {StatusCode}.", (int)tokenResponse.StatusCode);
                return false;
            }

            await using var tokenStream = await tokenResponse.Content.ReadAsStreamAsync(timeout.Token);
            using var tokenJson = await JsonDocument.ParseAsync(tokenStream, cancellationToken: timeout.Token);
            if (!tokenJson.RootElement.TryGetProperty("access_token", out var accessTokenElement) ||
                string.IsNullOrWhiteSpace(accessTokenElement.GetString()))
            {
                _logger.LogError("Google OAuth response did not contain an access token.");
                return false;
            }

            var rawMessage = CreateRawMessage(senderAddress, recipient, subject, body);
            var raw = Convert.ToBase64String(Encoding.UTF8.GetBytes(rawMessage))
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');

            using var request = new HttpRequestMessage(HttpMethod.Post, GmailSendUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessTokenElement.GetString());
            request.Content = new StringContent(JsonSerializer.Serialize(new { raw }), Encoding.UTF8, "application/json");

            using var sendResponse = await _httpClient.SendAsync(request, timeout.Token);
            if (!sendResponse.IsSuccessStatusCode)
            {
                _logger.LogError("Gmail API send failed with HTTP {StatusCode}.", (int)sendResponse.StatusCode);
                return false;
            }

            return true;
        }
        catch (OperationCanceledException) when (timeout.IsCancellationRequested)
        {
            _logger.LogError("Gmail API request timed out while sending email.");
            return false;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Gmail API request failed while sending email.");
            return false;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Google OAuth returned an invalid response while sending email.");
            return false;
        }
    }

    private static string CreateRawMessage(MailAddress sender, MailAddress recipient, string subject, string body)
    {
        var encodedSubject = Convert.ToBase64String(Encoding.UTF8.GetBytes(subject));
        var encodedBody = Convert.ToBase64String(Encoding.UTF8.GetBytes(body));
        var wrappedBody = string.Join("\r\n", Enumerable.Range(0, (encodedBody.Length + 75) / 76)
            .Select(index => encodedBody.Substring(index * 76, Math.Min(76, encodedBody.Length - index * 76))));

        return $"From: {sender}\r\n" +
               $"To: {recipient}\r\n" +
               $"Subject: =?UTF-8?B?{encodedSubject}?=\r\n" +
               $"Date: {DateTimeOffset.UtcNow:R}\r\n" +
               "MIME-Version: 1.0\r\n" +
               "Content-Type: text/plain; charset=UTF-8\r\n" +
               "Content-Transfer-Encoding: base64\r\n\r\n" +
               wrappedBody;
    }
}
