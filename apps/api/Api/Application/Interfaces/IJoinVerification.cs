
namespace Api.Application.Interfaces
{
public interface IJoinVerification
{
    public  Task<bool> Send(string identifier,string token);
}
}