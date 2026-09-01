using MosqueOS.Domain.Entities;

namespace MosqueOS.Application.Common.Interfaces;

public interface IJwtTokenService
{
    (string Token, DateTime Expiration, string JwtId) CreateToken(
        ApplicationUser user,
        IList<string> roles,
        TimeSpan? lifetime = null);
}
