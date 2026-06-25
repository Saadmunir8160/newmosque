namespace MosqueOS.API.Models.Common;

public class ApiMessageResponse
{
    public string Message { get; set; } = string.Empty;
}

public class ApiCountResponse : ApiMessageResponse
{
    public int Count { get; set; }
}

public class ApiErrorResponse
{
    public IEnumerable<string> Errors { get; set; } = Array.Empty<string>();
}
