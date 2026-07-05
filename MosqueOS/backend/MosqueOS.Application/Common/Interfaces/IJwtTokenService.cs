using MosqueOS.Domain.Entities;

namespace MosqueOS.Application.Common.Interfaces;

public interface IJwtTokenService
{
    (string Token, DateTime Expiration) CreateToken(ApplicationUser user, IList<string> roles);
}
