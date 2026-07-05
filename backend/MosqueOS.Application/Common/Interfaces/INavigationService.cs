using MosqueOS.Application.DTOs;
using MosqueOS.Domain;

namespace MosqueOS.Application.Common.Interfaces;

public interface INavigationService
{
    Task<IReadOnlyList<NavigationSectionDto>> GetMenuForRolesAsync(
        IEnumerable<string> roles,
        IEnumerable<string> permissions,
        IEnumerable<MosqueStatus> ownedMosqueStatuses);
}
