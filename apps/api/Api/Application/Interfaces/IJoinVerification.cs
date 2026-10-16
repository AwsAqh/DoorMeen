
namespace Api.Application.Interfaces
{
public interface IJoinVerification
{
    public  Task<bool> SendYourTurnNotification(string email, string queueName);
}
}
