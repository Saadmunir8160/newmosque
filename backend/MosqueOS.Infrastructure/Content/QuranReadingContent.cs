namespace MosqueOS.Infrastructure.Content;

public static class QuranReadingContent
{
    public record ParaInfo(int Number, string NameEn, string NameAr, string SurahRange, string Arabic, string Translation);

    private static readonly (string En, string Ar, string Range)[] ParaNames =
    [
        ("Alif Lam Meem", "الم", "Al-Fatiha 1 – Al-Baqarah 141"),
        ("Sayaqool", "سَيَقُولُ", "Al-Baqarah 142 – Al-Baqarah 252"),
        ("Tilkal Rusul", "تِلْكَ ٱلرُّسُلُ", "Al-Baqarah 253 – Al-Imran 92"),
        ("Lan Tanaloo", "لَن تَنَالُوا", "Al-Imran 93 – An-Nisa 23"),
        ("Wal Muhsanaat", "وَٱلْمُحْصَنَاتُ", "An-Nisa 24 – An-Nisa 147"),
        ("La Yuhibbullah", "لَا يُحِبُّ ٱللَّهُ", "An-Nisa 148 – Al-Maidah 81"),
        ("Wa Idha Sami'oo", "وَإِذَا سَمِعُوا", "Al-Maidah 82 – Al-An'am 110"),
        ("Wa Law Annana", "وَإِنْ أَنَنَا", "Al-An'am 111 – Al-A'raf 87"),
        ("Qalal Malao", "قَالَ ٱلْمَلَأُ", "Al-A'raf 88 – Al-Anfal 40"),
        ("Wa A'lamu", "وَٱعْلَمُوا", "Al-Anfal 41 – At-Tawbah 92"),
        ("Yatazeroon", "يَعْتَذِرُونَ", "At-Tawbah 93 – Hud 5"),
        ("Wa Maa Min Daaabbah", "وَمَا مِن دَآبَّةٍ", "Hud 6 – Yusuf 52"),
        ("Wa Maa Ubarri'u", "وَمَا أُبَرِّئُ", "Yusuf 53 – Ibrahim 52"),
        ("Rubama", "رُبَمَا", "Al-Hijr 1 – An-Nahl 128"),
        ("Subhanalladhi", "سُبْحَانَ ٱلَّذِي", "Al-Isra 1 – Al-Kahf 74"),
        ("Qala Alam", "قَالَ أَلَمْ", "Al-Kahf 75 – Ta-Ha 135"),
        ("Iqtaraba", "ٱقْتَرَبَ", "Al-Anbiya 1 – Al-Hajj 78"),
        ("Qad Aflaha", "قَدْ أَفْلَحَ", "Al-Mu'minun 1 – Al-Furqan 20"),
        ("Wa Qalalladheena", "وَقَالَ ٱلَّذِينَ", "Al-Furqan 21 – An-Naml 55"),
        ("A'man Khalaq", "أَمَّنْ خَلَقَ", "An-Naml 56 – Al-Ankabut 45"),
        ("Utlu Maa Oohiya", "اتْلُ مَا أُوحِيَ", "Al-Ankabut 46 – Al-Ahzab 30"),
        ("Wa Man Yaqnut", "وَمَن يَقْنُتْ", "Al-Ahzab 31 – Ya-Sin 27"),
        ("Faman Azlam", "فَمَنْ أَظْلَمُ", "Ya-Sin 28 – Az-Zumar 31"),
        ("Fa Man Khair", "فَمَنْ أَحَقُّ", "Az-Zumar 32 – Fussilat 46"),
        ("Elahukum", "إِلَٰهُكُمْ", "Fussilat 47 – Al-Jathiyah 37"),
        ("Ha Meem", "حم", "Al-Ahqaf 1 – Adh-Dhariyat 30"),
        ("Qala Fama Khatbukum", "قَالَ فَمَا خَطْبُكُمْ", "Adh-Dhariyat 31 – Al-Hadid 29"),
        ("Qad Sami'a", "قَدْ سَمِعَ", "Al-Mujadila 1 – At-Tahrim 12"),
        ("Tabarakalladhi", "تَبَارَكَ ٱلَّذِي", "Al-Mulk 1 – Al-Mursalat 50"),
        ("Amma Yatasaa'aloon", "عَمَّ يَتَسَآءَلُونَ", "An-Naba 1 – An-Nas 6"),
    ];

    public static IReadOnlyList<ParaInfo> AllParas { get; } = BuildParas();

    public static ParaInfo? GetPara(int number) =>
        number is >= 1 and <= 30 ? AllParas[number - 1] : null;

    private static List<ParaInfo> BuildParas()
    {
        var list = new List<ParaInfo>();
        for (var i = 0; i < ParaNames.Length; i++)
        {
            var n = i + 1;
            var (en, ar, range) = ParaNames[i];
            list.Add(new ParaInfo(
                n, en, ar, range,
                ArabicFallback(n, en, range),
                TranslationFallback(n, en, range)));
        }
        return list;
    }

    private static string ArabicFallback(int n, string nameEn, string range) => n switch
    {
        1 => """
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ …
            """,
        2 => "سَيَقُولُ ٱلسُّفَهَآءُ مِنَ ٱلنَّاسِ …",
        _ => $"— Juz {n} ({nameEn}) — {range}\n(Fallback text — live text loads from alquran.cloud when online.)"
    };

    private static string TranslationFallback(int n, string nameEn, string range) =>
        $"Juz {n} ({nameEn}): {range}. Dedicate the recitation to the deceased.";
}
