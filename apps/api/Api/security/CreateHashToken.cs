using System.Security.Cryptography;
namespace Api.security
{
    public class CreateHashToken
    {

        public static string NewCancelTokenDigits(int length = 6)
        {
            if (length <= 0 || length > 9) throw new ArgumentOutOfRangeException(nameof(length));
            int max = (int)Math.Pow(10, length);
            int n = RandomNumberGenerator.GetInt32(0, max); // unbiased
            return n.ToString($"D{length}");                 // zero-padded e.g. "007321"
        }

        public  static string Hash(string raw) => BCrypt.Net.BCrypt.HashPassword(raw);
      public  static bool Verify(string raw, string hash) => BCrypt.Net.BCrypt.Verify(raw, hash);
    }
}
