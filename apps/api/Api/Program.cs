using Api.Infrastructuer;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Api.Authorization;
using Microsoft.AspNetCore.Authorization;
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));


var cs = builder.Configuration.GetConnectionString("Default");
builder.Services.AddDbContext<DoorMeenDbContext>(opt => opt.UseNpgsql(cs));

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = null;
    o.JsonSerializerOptions.DictionaryKeyPolicy = null;
});

var jwt = builder.Configuration.GetSection("Jwt");
var keyBytes = Encoding.UTF8.GetBytes(jwt["Key"]!);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme) 
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            ClockSkew = TimeSpan.FromMinutes(1),
            RoleClaimType = "role" // match what you put in the token
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("OwnerOfQueue", policy =>
        policy.Requirements.Add(new SameQueueRequirement()));
});

builder.Services.AddSingleton<IAuthorizationHandler, SameQueueHandler>();
builder.Services.AddHttpContextAccessor();

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();



app.Run();
