-- Module 3.1: align mosque status to UNCLAIMED | CLAIMED | ACTIVE
-- ClaimPending (6) was an over-added mosque status; pending review lives on ownership claims.
-- Map legacy ClaimPending rows back to Unclaimed and close claim CTA while a PENDING claim exists.

UPDATE Mosques
SET Status = 0, -- Unclaimed
    AllowClaimRequests = CASE
      WHEN EXISTS (
        SELECT 1 FROM MosqueOwnershipClaims c
        WHERE c.MosqueId = Mosques.Id AND c.Status = 0 AND (c.IsDeleted = 0 OR c.IsDeleted IS NULL)
      ) THEN 0
      ELSE AllowClaimRequests
    END,
    UpdatedAt = SYSUTCDATETIME()
WHERE Status = 6; -- ClaimPending
