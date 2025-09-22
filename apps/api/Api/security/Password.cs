using BCrypt.Net;

namespace Api.Security;

public static class Password
{

    private const int WorkFactor = 11;

    public static string? HashOrNull(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ? null : BCrypt.Net.BCrypt.HashPassword(raw, workFactor: WorkFactor);

    public static bool Verify(string raw, string hashed) =>
        !string.IsNullOrWhiteSpace(hashed) && BCrypt.Net.BCrypt.Verify(raw, hashed);
}
