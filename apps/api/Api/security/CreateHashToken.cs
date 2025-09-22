using System.Security.Cryptography;
namespace Api.security
{
    public class CreateHashToken
    {

       public  static string NewCancelTokenDigits(int length = 6)
        {
    
            var bytes = RandomNumberGenerator.GetBytes(4);
            var n = BitConverter.ToUInt32(bytes, 0) % 1000000u;
            return n.ToString("D6");
        }

      public  static string Hash(string raw) => BCrypt.Net.BCrypt.HashPassword(raw, workFactor: 11);
      public  static bool Verify(string raw, string hash) => BCrypt.Net.BCrypt.Verify(raw, hash);
    }
}
