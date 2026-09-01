using MosqueOS.Domain;

namespace MosqueOS.API.Models.PrayerEditor;

public class JamaahTemplatePrayerDto
{
    public string PrayerName { get; set; } = string.Empty;
    public string StartTime { get; set; } = "00:00:00";
    public string JamaatTime { get; set; } = "00:00:00";
    public int SortOrder { get; set; }
}

public class JamaahTemplateUpsertRequest
{
    public string Name { get; set; } = string.Empty;
    public JamaahTemplateType TemplateType { get; set; } = JamaahTemplateType.Custom;
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public int Priority { get; set; } = 100;
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; }
    public List<int> DaysOfWeek { get; set; } = new() { 0, 1, 2, 3, 4, 5, 6 };
    public List<string> SpecificDates { get; set; } = new();
    public List<string> ExcludedDates { get; set; } = new();
    public List<JamaahTemplatePrayerDto> Prayers { get; set; } = new();
}

public class JamaahTemplateDto
{
    public int Id { get; set; }
    public int MosqueId { get; set; }
    public string Name { get; set; } = string.Empty;
    public JamaahTemplateType TemplateType { get; set; }
    public string TemplateTypeName => TemplateType.ToString();
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public int Priority { get; set; }
    public bool IsActive { get; set; }
    public bool IsDefault { get; set; }
    public List<int> DaysOfWeek { get; set; } = new();
    public List<string> SpecificDates { get; set; } = new();
    public List<string> ExcludedDates { get; set; } = new();
    public List<JamaahTemplatePrayerDto> Prayers { get; set; } = new();
    public string? RecurringRulesJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class JamaahTemplateSaveResponse
{
    public JamaahTemplateDto Template { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

public class JamaahTemplateSetActiveRequest
{
    public bool IsActive { get; set; }
}
