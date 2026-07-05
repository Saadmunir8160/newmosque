namespace MosqueOS.Domain.Entities
{
    /// <summary>Key-value platform-wide configuration (Super Admin settings).</summary>
    public class PlatformConfig : BaseEntity
    {
        public string Key { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
    }
}
