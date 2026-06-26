using MosqueOS.Domain;

namespace MosqueOS.API.Models.Madrassah;

public class AttendanceRecordRequest
{
    public int StudentId { get; set; }
    public AttendanceStatus Status { get; set; }
}
