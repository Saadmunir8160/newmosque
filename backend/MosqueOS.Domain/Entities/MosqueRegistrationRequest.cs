using System;

namespace MosqueOS.Domain.Entities
{
    public class MosqueRegistrationRequest : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? Description { get; set; }

        public MosqueRegistrationStatus Status { get; set; } = MosqueRegistrationStatus.Pending;

        public string SubmittedById { get; set; } = string.Empty;
        public ApplicationUser? SubmittedBy { get; set; }

        public DateTime? ApprovedAt { get; set; }
        public string? RejectionReason { get; set; }
    }
}
