using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using MosqueOS.API.Models.Mosques;

namespace MosqueOS.API.Services;

public static class MosqueValidation
{
    private static readonly Regex UkPhone = new(
        @"^(\+44|0)[1-9]\d{8,10}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public static IReadOnlyList<string> ValidateCreate(MosqueCreateDto dto)
    {
        var errors = new List<string>();
        ValidateCore(dto.Name, dto.City, dto.Email, dto.Phone, dto.Website, errors);

        if (string.IsNullOrWhiteSpace(dto.Slug) && string.IsNullOrWhiteSpace(dto.Name))
            errors.Add("Name or slug is required.");

        return errors;
    }

    public static IReadOnlyList<string> ValidateUpdate(MosqueUpdateDto dto)
    {
        var errors = new List<string>();
        ValidateCore(dto.Name, dto.City, dto.Email, dto.Phone, dto.Website, errors);
        return errors;
    }

    private static bool IsValidWebsite(string website)
    {
        if (!Uri.TryCreate(website.Trim(), UriKind.Absolute, out var uri))
            return false;
        return uri.Scheme is "http" or "https";
    }

    private static void ValidateCore(string? name, string? city, string? email, string? phone, string? website, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length < 3)
            errors.Add("Name is required (minimum 3 characters).");

        if (string.IsNullOrWhiteSpace(city))
            errors.Add("City is required.");

        if (!string.IsNullOrWhiteSpace(email) && !new EmailAddressAttribute().IsValid(email))
            errors.Add("Email format is invalid.");

        if (!string.IsNullOrWhiteSpace(website) && !IsValidWebsite(website))
            errors.Add("Website must be a valid URL.");

        if (!string.IsNullOrWhiteSpace(phone))
        {
            var normalized = phone.Replace(" ", "").Replace("-", "");
            if (!UkPhone.IsMatch(normalized))
                errors.Add("Phone must be a valid UK number (+44 or 0 prefix).");
        }
    }

    private static readonly HashSet<string> AllowedClaimRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "Imam", "Mosque Chairman", "Committee Member", "Trustee",
        "Administrator", "Volunteer", "Other"
    };

    public static IReadOnlyList<string> ValidateOwnershipClaim(SubmitMosqueClaimRequest dto, bool hasProofFile, bool hasProofUrl)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(dto.Phone))
            errors.Add("Phone is required.");
        else
        {
            var normalized = dto.Phone.Replace(" ", "").Replace("-", "");
            if (!UkPhone.IsMatch(normalized))
                errors.Add("Phone must be a valid UK number (+44 or 0 prefix).");
        }

        if (string.IsNullOrWhiteSpace(dto.Role))
            errors.Add("Role is required.");
        else if (!AllowedClaimRoles.Contains(dto.Role.Trim()))
            errors.Add("Please select a valid role.");

        if (!hasProofFile && !hasProofUrl)
            errors.Add("Proof document is required.");

        return errors;
    }

    public static IReadOnlyList<string> ValidateClaim(ClaimMosqueRequest dto, bool requireDocuments = true, bool requireAuthorization = true)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(dto.FullName) || dto.FullName.Trim().Length < 2)
            errors.Add("Full name is required.");
        if (string.IsNullOrWhiteSpace(dto.Position))
            errors.Add("Position is required.");
        if (string.IsNullOrWhiteSpace(dto.RelationshipToMosque))
            errors.Add("Relationship to mosque is required.");
        if (dto.YearsAssociated is < 0 or > 100)
            errors.Add("Years associated must be between 0 and 100.");
        if (string.IsNullOrWhiteSpace(dto.Reason) || dto.Reason.Trim().Length < 10)
            errors.Add("Claim reason is required (minimum 10 characters).");
        if (string.IsNullOrWhiteSpace(dto.Phone))
            errors.Add("Phone is required.");
        else
        {
            var normalized = dto.Phone.Replace(" ", "").Replace("-", "");
            if (!UkPhone.IsMatch(normalized))
                errors.Add("Phone must be a valid UK number (+44 or 0 prefix).");
        }
        if (!string.IsNullOrWhiteSpace(dto.Email) && !new EmailAddressAttribute().IsValid(dto.Email))
            errors.Add("Email format is invalid.");
        if (requireAuthorization && !dto.AuthorizedDeclaration)
            errors.Add("You must confirm you are authorized to claim this mosque.");
        if (requireAuthorization && !dto.AccurateInfoDeclaration)
            errors.Add("You must confirm the information provided is accurate.");
        return errors;
    }
}
