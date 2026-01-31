using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Api.Application.Interfaces;

public class EmailJoinVerification : IJoinVerification
{
    private readonly IConfiguration _config;

    public EmailJoinVerification(IConfiguration config)
    {
        _config = config;
    }

    public async Task<bool> Send(string email, string token)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(token))
            return false;

        // Required env/config values (from .env via your config loader)
        var host = _config["SMTP_HOST"];
        var portStr = _config["SMTP_PORT"];
        var user = _config["SMTP_USER"];
        var pass = _config["SMTP_PASS"];
        var from = _config["SMTP_FROM"] ?? user;

       

        if (string.IsNullOrWhiteSpace(host) ||
            string.IsNullOrWhiteSpace(portStr) ||
            string.IsNullOrWhiteSpace(user) ||
            string.IsNullOrWhiteSpace(pass) ||
            string.IsNullOrWhiteSpace(from))
            return false;

        if (!int.TryParse(portStr, out var port))
            return false;

         var subject = "DoorMeen - Email verification code";
    var bodyText =
$@"Your DoorMeen verification code is: {token}

This code expires in 60 minutes.
If you didn't request this, ignore this email.";

    using var message = new MailMessage();
    message.From = new MailAddress(from);
    message.To.Add(email);
    message.Subject = subject;
    message.Body = bodyText;
    message.IsBodyHtml = false;

    using var client = new SmtpClient(host, port)
    {
        EnableSsl = true,
        Credentials = new NetworkCredential(user, pass)
    };

    try
    {
        await client.SendMailAsync(message);
        return true;
    }
    catch
    {
        return false;
    }
    }
}
