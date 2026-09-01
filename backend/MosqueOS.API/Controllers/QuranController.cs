using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.Common;
using MosqueOS.API.Models.Quran;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure.Content;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/quran")]
    [ApiController]
    [Authorize]
    public class QuranController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IQuranTextService _quranText;

        public QuranController(IUnitOfWork unitOfWork, IQuranTextService quranText)
        {
            _unitOfWork = unitOfWork;
            _quranText = quranText;
        }

        [AllowAnonymous]
        [HttpGet("paras")]
        public IActionResult ListParas() =>
            Ok(_quranText.ListParas().Select(p => new QuranParaListItemResponse
            {
                Number = p.Number,
                NameEn = p.NameEn,
                NameAr = p.NameAr,
                SurahRange = p.SurahRange
            }));

        [AllowAnonymous]
        [HttpGet("paras/{paraNumber:int}")]
        public async Task<IActionResult> GetPara(int paraNumber, CancellationToken ct)
        {
            var para = await _quranText.GetParaAsync(paraNumber, ct);
            return para == null
                ? NotFound(new ApiMessageResponse { Message = "Para must be between 1 and 30." })
                : Ok(new QuranParaDetailResponse
                {
                    Number = para.Number,
                    NameEn = para.NameEn,
                    NameAr = para.NameAr,
                    SurahRange = para.SurahRange,
                    Arabic = para.Arabic,
                    Translation = para.Translation,
                    Source = para.Source
                });
        }

        [AllowAnonymous]
        [HttpGet("surahs/yaseen")]
        public async Task<IActionResult> GetYaseen(CancellationToken ct)
        {
            var surah = await _quranText.GetYaseenAsync(ct);
            return Ok(new QuranSurahYaseenResponse
            {
                Name = surah.Name,
                Arabic = surah.Arabic,
                Translation = surah.Translation,
                Source = surah.Source
            });
        }

        [AllowAnonymous]
        [HttpGet("adhkar")]
        public IActionResult ListAdhkar() =>
            Ok(AdhkarReadingContent.List().Select(a => new AdhkarReadingListItemResponse
            {
                Key = a.Key,
                Title = a.Title
            }));

        [AllowAnonymous]
        [HttpGet("adhkar/{key}")]
        public IActionResult GetAdhkar(string key)
        {
            var item = AdhkarReadingContent.Get(key);
            return item == null
                ? NotFound()
                : Ok(new AdhkarReadingDetailResponse
                {
                    Key = item.Key,
                    Title = item.Title,
                    Arabic = item.Arabic,
                    Transliteration = item.Transliteration,
                    Translation = item.Translation,
                    Instruction = item.Instruction
                });
        }

        [HttpGet("my-plan")]
        public async Task<IActionResult> MyPlan()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var plan = await _unitOfWork.Repository<QuranPlan>().QueryNoTracking()
                .Include(p => p.Progress.OrderBy(x => x.ParaNumber))
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.StartDate)
                .FirstOrDefaultAsync();

            if (plan == null) return NotFound(new ApiMessageResponse { Message = "No active plan. Start one with POST /start." });

            var completed = plan.Progress.Count(p => p.Completed);
            var daysIn = DateOnly.FromDateTime(DateTime.UtcNow).DayNumber - plan.StartDate.DayNumber + 1;
            var todaysPara = Math.Clamp(daysIn, 1, 30);

            return Ok(new QuranPlanSummaryResponse
            {
                Plan = plan,
                CompletedParas = completed,
                TotalParas = 30,
                TodaysPara = todaysPara,
                TodayCompleted = plan.Progress.FirstOrDefault(p => p.ParaNumber == todaysPara)?.Completed ?? false,
                MinDailyParas = plan.MinDailyParas <= 0 ? 1m : plan.MinDailyParas,
                RemindersEnabled = plan.RemindersEnabled,
                ProgressLabel = $"{completed}/30"
            });
        }

        /// <summary>Today's reading card for home screen (spec 3.10).</summary>
        [HttpGet("today-card")]
        public async Task<IActionResult> TodayCard()
        {
            var planResult = await MyPlan();
            if (planResult is not OkObjectResult ok) return planResult;
            var summary = (QuranPlanSummaryResponse)ok.Value!;
            return Ok(new
            {
                todaysPara = summary.TodaysPara,
                todayCompleted = summary.TodayCompleted,
                completedParas = summary.CompletedParas,
                totalParas = summary.TotalParas,
                progressLabel = summary.ProgressLabel,
                minDailyParas = summary.MinDailyParas,
                remindersEnabled = summary.RemindersEnabled,
                message = summary.TodayCompleted
                    ? "Today's reading is complete — jazakAllah khair."
                    : $"Today: Para {summary.TodaysPara} (target {summary.MinDailyParas} para)"
            });
        }

        [HttpPost("start")]
        public async Task<IActionResult> StartPlan([FromBody] StartQuranPlanRequest? request = null, [FromQuery] QuranPlanType? type = null)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            request ??= new StartQuranPlanRequest();
            if (type.HasValue) request.Type = type.Value;
            // Custom reserved for v2 — still create as ThirtyDay skeleton with note
            var planType = request.Type == QuranPlanType.Custom ? QuranPlanType.ThirtyDay : request.Type;
            var minDaily = request.MinDailyParas <= 0 ? 1m : Math.Min(request.MinDailyParas, 30m);

            var plan = new QuranPlan
            {
                UserId = userId,
                Type = planType,
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                MinDailyParas = minDaily,
                RemindersEnabled = request.RemindersEnabled
            };

            for (var i = 1; i <= 30; i++)
                plan.Progress.Add(new QuranProgress { ParaNumber = i });

            _unitOfWork.Repository<QuranPlan>().Add(plan);
            await _unitOfWork.SaveChangesAsync();
            return Ok(plan);
        }

        [HttpPut("my-plan/settings")]
        public async Task<IActionResult> UpdatePlanSettings([FromBody] StartQuranPlanRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var plan = await _unitOfWork.Repository<QuranPlan>().Query()
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.StartDate)
                .FirstOrDefaultAsync();
            if (plan == null) return NotFound();

            if (request.MinDailyParas > 0)
                plan.MinDailyParas = Math.Min(request.MinDailyParas, 30m);
            plan.RemindersEnabled = request.RemindersEnabled;
            plan.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(new { plan.MinDailyParas, plan.RemindersEnabled });
        }

        [HttpPost("paras/{paraNumber:int}/complete")]
        public async Task<IActionResult> CompletePara(int paraNumber)
        {
            if (paraNumber is < 1 or > 30) return BadRequest(new ApiMessageResponse { Message = "Para must be 1-30." });

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var plan = await _unitOfWork.Repository<QuranPlan>().Query()
                .Include(p => p.Progress)
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.StartDate)
                .FirstOrDefaultAsync();
            if (plan == null) return NotFound();

            var progress = plan.Progress.First(p => p.ParaNumber == paraNumber);
            progress.Completed = true;
            progress.CompletedAt = DateTime.UtcNow;
            progress.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            var completed = plan.Progress.Count(p => p.Completed);
            return Ok(new QuranCompleteParaResponse
            {
                ParaNumber = paraNumber,
                CompletedParas = completed,
                TotalParas = 30,
                ProgressLabel = $"{completed}/30"
            });
        }
    }
}
