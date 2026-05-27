using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using MiniIdentityApi.Application.Interfaces;
using MiniIdentityApi.Application.Services;
using MiniIdentityApi.Domain.Entities;
using MiniIdentityApi.Infrastructure.Repositories;
using MiniIdentityApi.Infrastructure.Security;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "MiniIdentity API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter a valid token.",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });

    options.AddSecurityRequirement(document => new()
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
});

builder.Services.AddSingleton<IUserRepository, InMemoryUserRepository>();
builder.Services.AddSingleton<IRoleRepository, InMemoryRoleRepository>();
builder.Services.AddSingleton<IPasswordHasher, Sha256PasswordHasher>();
builder.Services.AddSingleton<ITokenService, JwtTokenService>();

builder.Services.AddScoped<AuthenticationService>();
builder.Services.AddScoped<AuthorizationService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<RoleService>();

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is missing in configuration.");

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("Jwt:Issuer is missing in configuration.");

var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("Jwt:Audience is missing in configuration.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

var userRepository = app.Services.GetRequiredService<IUserRepository>();
var roleRepository = app.Services.GetRequiredService<IRoleRepository>();
var passwordHasher = app.Services.GetRequiredService<IPasswordHasher>();

var adminRole = roleRepository.FindByName("Admin");
if (adminRole is null)
{
    adminRole = new Role("Admin");
    adminRole.AddPermission(new Permission("users.read", "Can read users"));
    adminRole.AddPermission(new Permission("users.manage", "Can manage users"));
    adminRole.AddPermission(new Permission("roles.read", "Can read roles"));
    adminRole.AddPermission(new Permission("roles.manage", "Can manage roles"));

    roleRepository.Save(adminRole);
}

var adminUser = userRepository.FindByUsernameOrEmail("admin");
if (adminUser is null)
{
    var salt = passwordHasher.GenerateSalt();
    var hash = passwordHasher.Hash("Admin123*", salt);

    var credential = new Credential(hash, salt);
    adminUser = new User("admin", "admin@example.com", credential);
    adminUser.AddRole(adminRole);

    userRepository.Save(adminUser);
}

// Create professor user if not exists
var profesorUser = userRepository.FindByUsernameOrEmail("profesor1@correo.com");
if (profesorUser is null)
{
    var saltP = passwordHasher.GenerateSalt();
    var hashP = passwordHasher.Hash("Profesor123*", saltP);
    var credP = new Credential(hashP, saltP);
    profesorUser = new User("profesor1", "profesor1@correo.com", credP);
    userRepository.Save(profesorUser);

        // Create Professor role if not exists
        var professorRole = roleRepository.FindByName("profesor");
        if (professorRole is null)
        {
            professorRole = new Role("profesor");
            // Add permissions as needed, e.g., collections.create, students.enroll
            professorRole.AddPermission(new Permission("collections.create", "Can create collections"));
            professorRole.AddPermission(new Permission("students.enroll", "Can enroll students"));
            roleRepository.Save(professorRole);
        }
        // Assign Professor role to profesorUser
        profesorUser.AddRole(professorRole);
}

// Create manueladmin user if not exists
var manuelAdminUser = userRepository.FindByUsernameOrEmail("manueladmin@correo.com");
if (manuelAdminUser is null)
{
    var saltM = passwordHasher.GenerateSalt();
    var hashM = passwordHasher.Hash("Manuel123", saltM);
    var credM = new Credential(hashM, saltM);
    manuelAdminUser = new User("manueladmin", "manueladmin@correo.com", credM);
    // Assign admin role
    if (adminRole != null)
    {
        manuelAdminUser.AddRole(adminRole);
    }
    userRepository.Save(manuelAdminUser);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();