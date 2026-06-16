namespace MosqueOS.Application.Common.Interfaces;

public record QuranParaTextDto(
    int Number,
    string NameEn,
    string NameAr,
    string SurahRange,
    string Arabic,
    string Translation,
    string Source);

public record QuranSurahTextDto(
    string Name,
    string Arabic,
    string Translation,
    string Source);

public interface IQuranTextService
{
    IReadOnlyList<QuranParaTextDto> ListParas();
    Task<QuranParaTextDto?> GetParaAsync(int paraNumber, CancellationToken ct = default);
    Task<QuranSurahTextDto> GetYaseenAsync(CancellationToken ct = default);
}
