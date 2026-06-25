namespace MosqueOS.Domain.Entities
{
    public class PlatformAuditLog : BaseEntity
    {
        public string Action { get; set; } = string.Empty;
        public string Module { get; set; } = "Platform";
        public string ActorId { get; set; } = string.Empty;
        public string? ActorName { get; set; }
        public string? TargetType { get; set; }
        public int? TargetId { get; set; }
        public string Description { get; set; } = string.Empty;
        public string? IpAddress { get; set; }
    }
}
