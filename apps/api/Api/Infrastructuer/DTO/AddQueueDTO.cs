namespace Api.Infrastructuer.DTO
{
    public class AddQueueDTO
    {

        public string Name { get; set; }
        public string Password { get; set; }
        public string Email { get; set; }
        public string? BarberPhoneNumber { get; set; }
        public string? Location { get; set; }
        public string? Metadata { get; set; }
       

    }
}
