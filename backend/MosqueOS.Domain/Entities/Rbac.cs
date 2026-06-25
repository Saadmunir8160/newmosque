namespace MosqueOS.Domain.Entities;

/// <summary>Granular permission for RBAC (maps to ASP.NET Identity roles via RolePermission).</summary>
public class Permission : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

/// <summary>Links Identity role to permission.</summary>
public class RolePermission
{
    public int Id { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public int PermissionId { get; set; }
    public Permission? Permission { get; set; }
}

/// <summary>Database-driven navigation menu (dynamic sidebar).</summary>
public class NavigationMenuItem : BaseEntity
{
    public string Label { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string Section { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public string? RequiredRole { get; set; }
    public string? RequiredPermission { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public int? ParentId { get; set; }
    public NavigationMenuItem? Parent { get; set; }
}
