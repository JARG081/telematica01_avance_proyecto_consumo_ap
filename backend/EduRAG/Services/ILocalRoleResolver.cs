namespace EduRAG.Services;

public interface ILocalRoleResolver
{
    string? ResolveRole(string? userId, string? email, string? userName);
}
