using Api.Infrastructuer;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Api.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Api.Application.Interfaces;
using Api.Application.Services;
using Microsoft.AspNetCore.Routing;
var builder = WebApplication.CreateBuilder(args);



builder.Services.AddCors(o => o.AddPolicy("app",p  =>
    p.WithOrigins("https://door-meen.vercel.app" "https://door-meen-jgj9kit23-awsaqhs-projects.vercel.app", "http://localhost:5173" , "http://localhost:3000").AllowAnyHeader().AllowAnyMethod()));
var config = builder.Configuration;



var cs = builder.Configuration.GetConnectionString("Default")??throw new InvalidOperationException("Connection string Default not found");
    builder.Services.AddDbContext<DoorMeenDbContext>(opt => opt.UseNpgsql(cs));

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = null;
    o.JsonSerializerOptions.DictionaryKeyPolicy = null;
});

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtIssuer = jwtSection["Issuer"] ?? throw new InvalidOperationException("Missing Jwt:Issuer (ENV Jwt__Issuer).");
var jwtAudience = jwtSection["Audience"] ?? throw new InvalidOperationException("Missing Jwt:Audience (ENV Jwt__Audience).");
var jwtKey = jwtSection["Key"] ?? throw new InvalidOperationException("Missing Jwt:Key (ENV Jwt__Key).");
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);


builder.Services.AddHttpContextAccessor();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            ClockSkew = TimeSpan.FromMinutes(1),
            RoleClaimType = "role"
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("OwnerOfQueue", policy =>
        policy.Requirements.Add(new SameQueueRequirement()));
});

builder.Services.AddScoped<IOwnerServices, OwnerServices>();
builder.Services.AddScoped<IQueueServices, QueueServices>();
builder.Services.AddScoped<ICustomersServices, CustomersServices>();
builder.Services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>(); 
builder.Services.AddSingleton<IAuthorizationHandler, SameQueueHandler>();
builder.Services.AddHttpContextAccessor();

var app = builder.Build();
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var ex = context.Features.Get<IExceptionHandlerFeature>()?.Error;


        var (status, title) = ex switch
        {
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Not Found"),
            ValidationException => (StatusCodes.Status400BadRequest, "Validation Error"),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
            InvalidOperationException => (StatusCodes.Status409Conflict, "Conflict"),
            _ => (StatusCodes.Status500InternalServerError, "Server Error")
        };

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";


        var details = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = ex?.Message,
            Instance = context.Request.Path
        };

        await context.Response.WriteAsJsonAsync(details);
    });
});
app.UseRouting();
app.UseCors("app");
app.MapGet("/health", () => Results.Ok(new { ok = true, time = DateTime.UtcNow }));


app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();



app.Run();
