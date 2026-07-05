namespace MosqueOS.Application.Common.Interfaces;

public interface IPermissionService
{
    Task<IReadOnlyList<string>> GetPermissionsForRolesAsync(IEnumerable<string> roles);
    Task<bool> HasPermissionAsync(IEnumerable<string> roles, string permissionCode);
}
