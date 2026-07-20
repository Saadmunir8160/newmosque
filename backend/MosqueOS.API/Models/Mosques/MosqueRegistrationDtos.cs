using System;
using MosqueOS.Domain;

namespace MosqueOS.API.Models.Mosques
{
    public class SubmitRegistrationDto
    {
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? Description { get; set; }
    }

    public class AdminRegistrationListDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public MosqueRegistrationStatus Status { get; set; }
        public string SubmittedById { get; set; } = string.Empty;
        public string SubmittedByName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? RejectionReason { get; set; }
    }

    public class AdminRegistrationDetailDto : AdminRegistrationListDto
    {
        public string Address { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? Description { get; set; }
    }

    public class ApproveRegistrationDto
    {
        // Simple empty payload, or could contain overrides
    }

    public class RejectRegistrationDto
    {
        public string Reason { get; set; } = string.Empty;
    }
}
