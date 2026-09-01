using MosqueOS.Domain;

namespace MosqueOS.API.Services;

/// <summary>Module 3.1 public profile visibility — spec statuses Unclaimed | Claimed | Active.</summary>
public static class MosquePublicVisibility
{
    /// <summary>Normalize legacy ClaimPending → Unclaimed (pending lives on ownership claim).</summary>
    public static MosqueStatus NormalizeSpecStatus(MosqueStatus status) =>
        status == MosqueStatus.ClaimPending ? MosqueStatus.Unclaimed : status;

    public static bool IsPubliclyVisible(MosqueStatus status)
    {
        var s = NormalizeSpecStatus(status);
        return s is MosqueStatus.Unclaimed or MosqueStatus.Active;
    }

    public static bool CanEditProfile(MosqueStatus status, bool isSuperAdmin) =>
        isSuperAdmin || NormalizeSpecStatus(status) is MosqueStatus.Claimed or MosqueStatus.Active;
}
