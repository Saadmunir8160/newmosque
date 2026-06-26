using System.Text.Json;
using MosqueOS.API.Models.Mosques;

namespace MosqueOS.API.Services;

public static class ClaimFormHelper
{
    private static readonly (string Field, string Label)[] DocumentFields =
    [
        ("proofDocument", "Proof of Ownership"),
        ("utilityBill", "Utility Bill"),
        ("trusteeLetter", "Trustee Letter"),
        ("registrationCertificate", "Registration Certificate"),
        ("governmentId", "Government ID"),
        ("document", "Verification Document"),
    ];

    public record ParsedOwnershipClaim(SubmitMosqueClaimRequest Request, IFormFile? ProofFile);

    public static async Task<ParsedOwnershipClaim?> ParseOwnershipClaimAsync(
        HttpRequest request,
        SubmitMosqueClaimRequest body)
    {
        if (!request.HasFormContentType)
            return new ParsedOwnershipClaim(body, null);

        var form = await request.ReadFormAsync();
        var proof = form.Files.GetFile("proofDocument");
        return new ParsedOwnershipClaim(body, proof is { Length: > 0 } ? proof : null);
    }

    public record ParsedClaimForm(ClaimMosqueRequest Dto, List<(string Label, IFormFile File)> Documents);

    public static async Task<ParsedClaimForm?> ParseAsync(HttpRequest request)
    {
        ClaimMosqueRequest dto;
        var documents = new List<(string Label, IFormFile File)>();

        if (request.HasFormContentType)
        {
            var form = await request.ReadFormAsync();
            dto = new ClaimMosqueRequest
            {
                FullName = form["fullName"].ToString(),
                Email = string.IsNullOrWhiteSpace(form["email"]) ? null : form["email"].ToString(),
                Phone = form["phone"].ToString(),
                Position = form["position"].ToString(),
                Organization = string.IsNullOrWhiteSpace(form["organization"]) ? null : form["organization"].ToString(),
                RelationshipToMosque = form["relationshipToMosque"].ToString(),
                YearsAssociated = ParseNullableInt(form["yearsAssociated"].ToString()),
                Reason = form["reason"].ToString(),
                AuthorizedDeclaration = ParseBool(form["authorizedDeclaration"].ToString()),
                AccurateInfoDeclaration = ParseBool(form["accurateInfoDeclaration"].ToString()),
            };

            foreach (var (field, label) in DocumentFields)
            {
                var file = form.Files.GetFile(field);
                if (file != null && file.Length > 0)
                    documents.Add((label, file));
            }
        }
        else
        {
            dto = await request.ReadFromJsonAsync<ClaimMosqueRequest>() ?? new ClaimMosqueRequest();
        }

        return new ParsedClaimForm(dto, documents);
    }

    public static async Task<(string? PrimaryUrl, string? DocumentsJson, string? Error)> SaveProofDocumentAsync(
        int mosqueId,
        IWebHostEnvironment env,
        IFormFile file)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".pdf")
            return (null, null, "Please upload a valid PDF document (maximum 10 MB).");
        if (file.Length > 10 * 1024 * 1024)
            return (null, null, "Please upload a valid PDF document (maximum 10 MB).");

        var dir = Path.Combine(env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
            "uploads", "claims", mosqueId.ToString());
        Directory.CreateDirectory(dir);
        var fileName = $"{Guid.NewGuid():N}{ext}";
        var path = Path.Combine(dir, fileName);
        await using (var stream = File.Create(path))
            await file.CopyToAsync(stream);

        var url = $"/uploads/claims/{mosqueId}/{fileName}";
        var json = JsonSerializer.Serialize(new[] { new ClaimDocumentDto { Label = "Proof of Ownership", Url = url } });
        return (url, json, null);
    }

    public static async Task<(string? PrimaryUrl, string? DocumentsJson, string? Error)> SaveDocumentsAsync(
        int mosqueId,
        IWebHostEnvironment env,
        IEnumerable<(string Label, IFormFile File)> documents)
    {
        var saved = new List<ClaimDocumentDto>();
        string? primary = null;

        foreach (var (label, file) in documents)
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var isProof = label.Equals("Proof of Ownership", StringComparison.OrdinalIgnoreCase);
            if (isProof && ext != ".pdf")
                return (null, null, "Please upload a valid PDF document (maximum 10 MB).");

            if (!isProof && ext is not (".pdf" or ".jpg" or ".jpeg" or ".png"))
                return (null, null, $"{label} must be PDF, JPG, or PNG.");

            if (file.Length > 10 * 1024 * 1024)
                return (null, null, isProof
                    ? "Please upload a valid PDF document (maximum 10 MB)."
                    : $"{label} must be under 10 MB.");

            var dir = Path.Combine(env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
                "uploads", "claims", mosqueId.ToString());
            Directory.CreateDirectory(dir);
            var fileName = $"{Guid.NewGuid():N}{ext}";
            var path = Path.Combine(dir, fileName);
            await using (var stream = File.Create(path))
                await file.CopyToAsync(stream);

            var url = $"/uploads/claims/{mosqueId}/{fileName}";
            primary ??= url;
            saved.Add(new ClaimDocumentDto { Label = label, Url = url });
        }

        if (saved.Count == 0)
            return (null, null, null);

        return (primary, JsonSerializer.Serialize(saved), null);
    }

    public static IReadOnlyList<ClaimDocumentDto> ParseDocumentsJson(string? documentsJson, string? fallbackUrl)
    {
        if (!string.IsNullOrWhiteSpace(documentsJson))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<List<ClaimDocumentDto>>(documentsJson);
                if (parsed != null && parsed.Count > 0)
                    return parsed;
            }
            catch
            {
                // fall through to legacy single document
            }
        }

        if (!string.IsNullOrWhiteSpace(fallbackUrl))
            return [new ClaimDocumentDto { Label = "Verification Document", Url = fallbackUrl }];

        return Array.Empty<ClaimDocumentDto>();
    }

    private static bool ParseBool(string value) =>
        value.Equals("true", StringComparison.OrdinalIgnoreCase)
        || value.Equals("on", StringComparison.OrdinalIgnoreCase)
        || value == "1";

    private static int? ParseNullableInt(string value) =>
        int.TryParse(value, out var parsed) && parsed >= 0 ? parsed : null;
}
