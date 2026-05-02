namespace Api.Application.Interfaces
{
    public interface IJwtTokenGenerator
    {
        
        string GenerateToken(string queueId);

    }

}
