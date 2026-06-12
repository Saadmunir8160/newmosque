namespace MosqueOS.Domain.Entities
{
    public class Dua : BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public string ArabicText { get; set; } = string.Empty;
        public string? Transliteration { get; set; }
        public string? Translation { get; set; }
        public string? SourceName { get; set; }
        public string? SourceRef { get; set; }
        /// <summary>morning, wudu, after_prayer, mosque, general, food, sleep, travel</summary>
        public string Category { get; set; } = "general";
        /// <summary>Comma-separated tags.</summary>
        public string? Tags { get; set; }
        public string? Tradition { get; set; }
        public string? AudioUrl { get; set; }
    }

    public class DuaCollection : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Type { get; set; }

        public ICollection<DuaCollectionItem> Items { get; set; } = new List<DuaCollectionItem>();
    }

    public class DuaCollectionItem : BaseEntity
    {
        public int CollectionId { get; set; }
        public DuaCollection? Collection { get; set; }
        public int DuaId { get; set; }
        public Dua? Dua { get; set; }
        public int OrderIndex { get; set; }
    }
}
