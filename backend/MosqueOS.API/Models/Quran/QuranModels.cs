using MosqueOS.Domain;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Models.Quran;

public class QuranParaListItemResponse
{
    public int Number { get; set; }
    public string NameEn { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string SurahRange { get; set; } = string.Empty;
}

public class QuranParaDetailResponse
{
    public int Number { get; set; }
    public string NameEn { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string SurahRange { get; set; } = string.Empty;
    public string Arabic { get; set; } = string.Empty;
    public string? Translation { get; set; }
    public string Source { get; set; } = string.Empty;
}

public class QuranSurahYaseenResponse
{
    public string Name { get; set; } = string.Empty;
    public string Arabic { get; set; } = string.Empty;
    public string? Translation { get; set; }
    public string Source { get; set; } = string.Empty;
}

public class AdhkarReadingListItemResponse
{
    public string Key { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
}

public class AdhkarReadingDetailResponse
{
    public string Key { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Arabic { get; set; } = string.Empty;
    public string? Transliteration { get; set; }
    public string? Translation { get; set; }
    public string? Instruction { get; set; }
}

public class QuranPlanSummaryResponse
{
    public QuranPlan Plan { get; set; } = null!;
    public int CompletedParas { get; set; }
    public int TotalParas { get; set; } = 30;
    public int TodaysPara { get; set; }
    public bool TodayCompleted { get; set; }
    public decimal MinDailyParas { get; set; } = 1m;
    public bool RemindersEnabled { get; set; }
    public string ProgressLabel { get; set; } = "0/30";
}

public class StartQuranPlanRequest
{
    public QuranPlanType Type { get; set; } = QuranPlanType.ThirtyDay;
    /// <summary>Allow less than 1 para/day (e.g. 0.5).</summary>
    public decimal MinDailyParas { get; set; } = 1m;
    public bool RemindersEnabled { get; set; }
}

public class QuranCompleteParaResponse
{
    public int ParaNumber { get; set; }
    public int CompletedParas { get; set; }
    public int TotalParas { get; set; } = 30;
    public string ProgressLabel { get; set; } = "0/30";
}
