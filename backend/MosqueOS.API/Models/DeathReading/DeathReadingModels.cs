namespace MosqueOS.API.Models.DeathReading
{
    public class DeathReadingMonitorResponse
    {
        public int CampaignId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string DeceasedName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsArchived { get; set; }
        public int TargetReadings { get; set; }
        public int CompletedReadings { get; set; }
        public int RemainingReadings { get; set; }
        public double CompletionPercent { get; set; }
        public int ActiveContributors { get; set; }
        public List<ContributorRow> TopContributors { get; set; } = new();
        public List<ActivityRow> RecentActivity { get; set; } = new();
        public List<GroupProgressRow> GroupProgress { get; set; } = new();
    }

    public class ContributorRow
    {
        public string UserId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Initials { get; set; } = string.Empty;
        public int ReadingCount { get; set; }
        public int Rank { get; set; }
    }

    public class ActivityRow
    {
        public string UserName { get; set; } = string.Empty;
        public int ReadingCount { get; set; }
        public DateTime At { get; set; }
    }

    public class GroupProgressRow
    {
        public string Region { get; set; } = string.Empty;
        public int Completed { get; set; }
        public int Target { get; set; }
        public double Percent { get; set; }
    }

    public class UpdateReadingTargetRequest
    {
        public int TargetReadings { get; set; }
    }
}
