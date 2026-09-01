using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Entities;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MosqueOS.Infrastructure.Services;

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration) => _configuration = configuration;

    public (string Token, DateTime Expiration, string JwtId) CreateToken(
        ApplicationUser user,
        IList<string> roles,
        TimeSpan? lifetime = null)
    {
        var jwtId = Guid.NewGuid().ToString("N");
        var authClaims = new List<Claim>
        {
            new(ClaimTypes.Name, user.UserName!),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, jwtId),
            new(JwtRegisteredClaimNames.Sub, user.Id),
        };

        foreach (var role in roles)
            authClaims.Add(new Claim(ClaimTypes.Role, role));

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["JWT:Secret"] ?? "SuperSecretKeyForDevelopmentOnlyPleaseChange123"));

        double minutes;
        if (lifetime.HasValue)
        {
            minutes = lifetime.Value.TotalMinutes;
        }
        else if (double.TryParse(_configuration["JWT:AccessTokenMinutes"], out var cfg))
        {
            minutes = cfg;
        }
        else
        {
            minutes = 60;
        }

        if (minutes < 5) minutes = 5;
        if (minutes > 24 * 60) minutes = 24 * 60;

        var expiration = DateTime.UtcNow.AddMinutes(minutes);
        var token = new JwtSecurityToken(
            issuer: _configuration["JWT:ValidIssuer"],
            audience: _configuration["JWT:ValidAudience"],
            expires: expiration,
            claims: authClaims,
            notBefore: DateTime.UtcNow,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), expiration, jwtId);
    }
}
