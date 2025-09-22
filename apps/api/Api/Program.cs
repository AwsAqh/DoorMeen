using Api.Infrastructuer;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));


var cs = builder.Configuration.GetConnectionString("Default");
builder.Services.AddDbContext<DoorMeenDbContext>(opt => opt.UseNpgsql(cs));

builder.Services.AddControllers();
var app = builder.Build();

app.UseCors();


app.MapControllers();



app.Run();
