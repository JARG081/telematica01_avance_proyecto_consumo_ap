using System.Text;
using System.Security.Claims;
using EduRAG.Data;
using EduRAG.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<EduRAGDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddSingleton<ILocalRoleResolver, ConfigurationLocalRoleResolver>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("Jwt:Key no está configurado.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                if (context.Principal?.Identity is ClaimsIdentity identity)
                {
                    var roleClaim = identity.FindFirst("role")?.Value
                                 ?? identity.FindFirst("Role")?.Value
                                 ?? identity.FindFirst(ClaimTypes.Role)?.Value;

                    var userId = identity.FindFirst("userId")?.Value
                              ?? identity.FindFirst("sub")?.Value;
                    var email = identity.FindFirst("email")?.Value;
                    var userName = identity.FindFirst("unique_name")?.Value;

                    if (string.IsNullOrWhiteSpace(roleClaim))
                    {
                        var resolver = context.HttpContext.RequestServices.GetRequiredService<ILocalRoleResolver>();
                        roleClaim = resolver.ResolveRole(userId, email, userName);
                    }

                    if (!string.IsNullOrWhiteSpace(roleClaim))
                    {
                        if (string.Equals(roleClaim, "Admin", StringComparison.OrdinalIgnoreCase))
                        {
                            roleClaim = "profesor";
                        }

                        if (!identity.HasClaim(c => c.Type == "role"))
                        {
                            identity.AddClaim(new Claim("role", roleClaim));
                        }

                        if (!identity.HasClaim(c => c.Type == ClaimTypes.Role))
                        {
                            identity.AddClaim(new Claim(ClaimTypes.Role, roleClaim));
                        }
                    }
                }

                return Task.CompletedTask;
            }
        };

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            RoleClaimType = "role",
            NameClaimType = "sub"
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<EduRAGDbContext>();
    dbContext.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
