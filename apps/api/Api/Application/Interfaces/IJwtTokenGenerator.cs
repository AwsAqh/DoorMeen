namespace Api.Application.Interfaces
{
    public interface IJwtTokenGenerator
    {
        
        string GenerateToken(int queueId);

    }

}
