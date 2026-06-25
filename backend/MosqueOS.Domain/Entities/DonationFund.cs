namespace MosqueOS.Domain.Entities;

public class DonationFund : BaseEntity
{
    public int MosqueId { get; set; }
    public Mosque? Mosque { get; set; }
    public string Name { get; set; } = string.Empty;
    /// <summary>General, Zakat, Sadaqah, Building</summary>
    public string FundType { get; set; } = "General";
    public string? Description { get; set; }
    public string? ExternalUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}
