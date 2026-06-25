namespace MosqueOS.Application.DTOs;

public class NavigationItemDto
{
    public string Label { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string Section { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public string? RequiredPermission { get; set; }
}

public class NavigationSectionDto
{
    public string Section { get; set; } = string.Empty;
    public IReadOnlyList<NavigationItemDto> Items { get; set; } = Array.Empty<NavigationItemDto>();
}

public class UserAccessDto
{
    public IReadOnlyList<string> Roles { get; set; } = Array.Empty<string>();
    public IReadOnlyList<string> Permissions { get; set; } = Array.Empty<string>();
    public IReadOnlyList<NavigationSectionDto> Navigation { get; set; } = Array.Empty<NavigationSectionDto>();
}
