namespace MosqueOS.Domain.Entities
{
    public class QuranPlan : BaseEntity
    {
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser? User { get; set; }
        public QuranPlanType Type { get; set; } = QuranPlanType.ThirtyDay;
        public DateOnly StartDate { get; set; }
        /// <summary>Minimum daily target in paras (e.g. 0.5 = half para). Default 1.</summary>
        public decimal MinDailyParas { get; set; } = 1m;
        /// <summary>Optional gentle reminder preference (client may schedule locally).</summary>
        public bool RemindersEnabled { get; set; }

        public ICollection<QuranProgress> Progress { get; set; } = new List<QuranProgress>();
    }

    public class QuranProgress : BaseEntity
    {
        public int PlanId { get; set; }
        public QuranPlan? Plan { get; set; }
        public int ParaNumber { get; set; }
        public bool Completed { get; set; }
        public DateTime? CompletedAt { get; set; }
    }
}
