namespace MosqueOS.Infrastructure.Content;

public static class AdhkarReadingContent
{
    public record AdhkarReading(string Key, string Title, string Arabic, string Transliteration, string Translation, string Instruction);

    private static readonly Dictionary<string, AdhkarReading> Items = new(StringComparer.OrdinalIgnoreCase)
    {
        ["tahlil"] = new(
            "tahlil",
            "Tahlil — La ilaha illallah",
            """
            لَا إِلَهَ إِلَّا اللَّهُ
            """,
            "La ilaha illallah",
            "There is no god but Allah.",
            "Recite with humility and presence of heart, seeking reward for the deceased. Often done 100, 500, or 1000 times in gatherings of remembrance."
        ),
        ["salawat"] = new(
            "salawat",
            "Salawat upon the Prophet ﷺ",
            """
            اللَّهُمَّ صَلِّ عَلَىٰ سَيِّدِنَا مُحَمَّدٍ وَعَلَىٰ آلِ سَيِّدِنَا مُحَمَّدٍ
            """,
            "Allahumma salli 'ala sayyidina Muhammad wa 'ala ali sayyidina Muhammad",
            "O Allah, send blessings upon our master Muhammad and upon the family of our master Muhammad.",
            "Send abundant salawat for the deceased — a gift of mercy that reaches them, insha'Allah."
        ),
        ["istighfar"] = new(
            "istighfar",
            "Istighfar",
            """
            أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ
            """,
            "Astaghfirullahal-'Adheem alladhi la ilaha illa Huwal-Hayyul-Qayyum wa atubu ilayh",
            "I seek forgiveness from Allah the Mighty, besides whom there is no god, the Ever-Living, the Sustainer, and I repent to Him.",
            "Seek forgiveness for yourself and as a gift of mercy for the deceased."
        ),
        ["general"] = new(
            "general",
            "General remembrance",
            """
            سُبْحَانَ اللَّهِ
            الْحَمْدُ لِلَّهِ
            اللَّهُ أَكْبَرُ
            لَا إِلَهَ إِلَّا اللَّهُ
            """,
            "SubhanAllah · Alhamdulillah · Allahu Akbar · La ilaha illallah",
            "Glory be to Allah · All praise is for Allah · Allah is the Greatest · There is no god but Allah.",
            "Recite these adhkar slowly, reflecting on the meaning, and dedicate the reward to the deceased."
        ),
    };

    public static AdhkarReading? Get(string key)
    {
        if (Items.TryGetValue(key, out var item)) return item;
        if (key.Contains("tahlil", StringComparison.OrdinalIgnoreCase)) return Items["tahlil"];
        if (key.Contains("salawat", StringComparison.OrdinalIgnoreCase)) return Items["salawat"];
        return Items.GetValueOrDefault("general");
    }

    public static IReadOnlyList<AdhkarReading> List() => Items.Values.ToList();
}
