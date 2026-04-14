namespace EduRAG.Services;

public class ConfigurationLocalRoleResolver(IConfiguration configuration) : ILocalRoleResolver
{
    private const string UserIdSectionPath = "LocalRoleMappings:ByUserId";
    private const string EmailSectionPath = "LocalRoleMappings:ByEmail";
    private const string UserNameSectionPath = "LocalRoleMappings:ByUserName";

    public string? ResolveRole(string? userId, string? email, string? userName)
    {
        var byUserId = configuration.GetSection(UserIdSectionPath);
        if (!string.IsNullOrWhiteSpace(userId))
        {
            var role = byUserId[userId];
            if (!string.IsNullOrWhiteSpace(role))
            {
                return NormalizeRole(role);
            }
        }

        var byEmail = configuration.GetSection(EmailSectionPath);
        if (!string.IsNullOrWhiteSpace(email))
        {
            var role = byEmail.GetChildren()
                .FirstOrDefault(c => string.Equals(c.Key, email, StringComparison.OrdinalIgnoreCase))
                ?.Value;

            if (!string.IsNullOrWhiteSpace(role))
            {
                return NormalizeRole(role);
            }
        }

        var byUserName = configuration.GetSection(UserNameSectionPath);
        if (!string.IsNullOrWhiteSpace(userName))
        {
            var role = byUserName.GetChildren()
                .FirstOrDefault(c => string.Equals(c.Key, userName, StringComparison.OrdinalIgnoreCase))
                ?.Value;

            if (!string.IsNullOrWhiteSpace(role))
            {
                return NormalizeRole(role);
            }
        }

        return null;
    }

    private static string? NormalizeRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return null;
        }

        if (string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase))
        {
            return "profesor";
        }

        if (string.Equals(role, "profesor", StringComparison.OrdinalIgnoreCase))
        {
            return "profesor";
        }

        if (string.Equals(role, "estudiante", StringComparison.OrdinalIgnoreCase))
        {
            return "estudiante";
        }

        return role;
    }
}
