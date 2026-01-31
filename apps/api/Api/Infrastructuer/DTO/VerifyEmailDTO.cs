
namespace Api.Infrastructuer.DTO
{
    public class VerifyEmailDTO
    {
        public int CustomerId { get; set; }
        public string Email { get; set; }
        public int Digits { get; set; }
    }

    public class SendVerificationEmailDTO
    {
        public int CustomerId { get; set; }
    }
}
