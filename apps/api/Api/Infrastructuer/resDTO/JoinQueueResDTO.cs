namespace Api.Infrastructuer.resDTO
{
    public class JoinQueueResDTO
    {
        public int Id { get; set; } 
        public string Name { get; set; }

        public string Token {  get; set; } 
        public bool VerificationRequired { get; set; }
    }
}
