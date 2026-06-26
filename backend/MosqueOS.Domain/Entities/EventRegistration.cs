namespace MosqueOS.Domain.Entities;

public class EventRegistration : BaseEntity
{
    public int EventId { get; set; }
    public Event? Event { get; set; }
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
    public RegistrationStatus Status { get; set; } = RegistrationStatus.Registered;
}
