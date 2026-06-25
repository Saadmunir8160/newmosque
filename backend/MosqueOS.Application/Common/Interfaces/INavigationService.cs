using MosqueOS.Application.DTOs;

namespace MosqueOS.Application.Common.Interfaces;

public interface INavigationService
{
    Task<IReadOnlyList<NavigationSectionDto>> GetMenuForRolesAsync(IEnumerable<string> roles, IEnumerable<string> permissions);
}
