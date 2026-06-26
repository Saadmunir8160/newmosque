using MosqueOS.Domain;

namespace MosqueOS.API.Services;

/// <summary>Module 3.1 public profile visibility rules.</summary>
public static class MosquePublicVisibility
{
    public static bool IsPubliclyVisible(MosqueStatus status) =>
        status is MosqueStatus.Unclaimed or MosqueStatus.Claimed or MosqueStatus.Active;

    public static bool CanEditProfile(MosqueStatus status, bool isSuperAdmin) =>
        isSuperAdmin || status is MosqueStatus.Claimed or MosqueStatus.Active;
}
