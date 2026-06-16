using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
            Ok(_quranText.ListParas().Select(p => new
            {
                p.Number,
                p.NameEn,
                p.NameAr,
                surahRange = p.SurahRange
            }));

        [AllowAnonymous]
        [HttpGet("paras/{paraNumber:int}")]
        public async Task<IActionResult> GetPara(int paraNumber, CancellationToken ct)
        {
            var para = await _quranText.GetParaAsync(paraNumber, ct);
            return para == null
                ? NotFound(new { message = "Para must be between 1 and 30." })
                : Ok(new
                {
                    para.Number,
                    para.NameEn,
                    para.NameAr,
                    para.SurahRange,
                    arabic = para.Arabic,
                    translation = para.Translation,
                    source = para.Source
                });
        }

        [AllowAnonymous]
        [HttpGet("surahs/yaseen")]
        public async Task<IActionResult> GetYaseen(CancellationToken ct)
        {
            var surah = await _quranText.GetYaseenAsync(ct);
            return Ok(new
            {
                name = surah.Name,
                arabic = surah.Arabic,
                translation = surah.Translation,
                source = surah.Source
            });
        }

        [AllowAnonymous]
        [HttpGet("adhkar")]
        public IActionResult ListAdhkar() =>
            Ok(AdhkarReadingContent.List().Select(a => new { a.Key, a.Title }));

        [AllowAnonymous]
        [HttpGet("adhkar/{key}")]
        public IActionResult GetAdhkar(string key)
        {
            var item = AdhkarReadingContent.Get(key);
            return item == null
                ? NotFound()
                : Ok(new
                {
                    item.Key,
                    item.Title,
                    arabic = item.Arabic,
                    transliteration = item.Transliteration,
                    translation = item.Translation,
                    instruction = item.Instruction
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

            if (plan == null) return NotFound(new { message = "No active plan. Start one with POST /start." });

            var completed = plan.Progress.Count(p => p.Completed);
            var daysIn = DateOnly.FromDateTime(DateTime.UtcNow).DayNumber - plan.StartDate.DayNumber + 1;
            var todaysPara = Math.Clamp(daysIn, 1, 30);

            return Ok(new
            {
                plan,
                completedParas = completed,
                totalParas = 30,
                todaysPara,
                todayCompleted = plan.Progress.FirstOrDefault(p => p.ParaNumber == todaysPara)?.Completed ?? false
            });
        }

        [HttpPost("start")]
        public async Task<IActionResult> StartPlan([FromQuery] QuranPlanType type = QuranPlanType.ThirtyDay)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var plan = new QuranPlan
            {
                UserId = userId,
                Type = type,
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow)
            };

            for (var i = 1; i <= 30; i++)
                plan.Progress.Add(new QuranProgress { ParaNumber = i });

            _unitOfWork.Repository<QuranPlan>().Add(plan);
            await _unitOfWork.SaveChangesAsync();
            return Ok(plan);
        }

        [HttpPost("paras/{paraNumber:int}/complete")]
        public async Task<IActionResult> CompletePara(int paraNumber)
        {
            if (paraNumber is < 1 or > 30) return BadRequest(new { message = "Para must be 1-30." });

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
            return Ok(new
            {
                paraNumber,
                completedParas = plan.Progress.Count(p => p.Completed),
                totalParas = 30
            });
        }
    }
}
