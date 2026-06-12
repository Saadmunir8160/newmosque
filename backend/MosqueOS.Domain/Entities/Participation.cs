namespace MosqueOS.Domain.Entities
{
    public class ParticipationOpportunity : BaseEntity
    {
        public int MosqueId { get; set; }
        public Mosque? Mosque { get; set; }
        public string Title { get; set; } = string.Empty;
        public ParticipationType Type { get; set; }
        public string? Description { get; set; }
        public DateOnly? Date { get; set; }
        public bool IsActive { get; set; } = true;

        public ICollection<ParticipationRegistration> Registrations { get; set; } = new List<ParticipationRegistration>();
    }

    public class ParticipationRegistration : BaseEntity
    {
        public int OpportunityId { get; set; }
        public ParticipationOpportunity? Opportunity { get; set; }
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser? User { get; set; }
        public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
        public RegistrationStatus Status { get; set; } = RegistrationStatus.Registered;
    }
}
