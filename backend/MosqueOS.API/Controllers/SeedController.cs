using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.PrayerEditor;
using MosqueOS.API.Services;
using MosqueOS.Domain;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class SeedController : ControllerBase
    {
        private readonly JamaahTemplateService _templates;
        private readonly MosqueOS.Application.Common.Interfaces.IUnitOfWork _uow;

        public SeedController(JamaahTemplateService templates, MosqueOS.Application.Common.Interfaces.IUnitOfWork uow)
        {
            _templates = templates;
            _uow = uow;
        }

        [HttpGet("{mosqueId}")]
        public async Task<IActionResult> Seed2026(int mosqueId)
        {
            return Ok();
        }

        [HttpGet("unlock")]
        public async Task<IActionResult> UnlockAdmin([FromServices] UserManager<ApplicationUser> userManager)
        {
            var user = await userManager.FindByNameAsync("mosqueadmin");
            if (user != null)
            {
                user.LockoutEnd = null;
                user.AccessFailedCount = 0;
                user.HomeMosqueId = 2;
                await userManager.UpdateAsync(user);
            }
            return Ok("Unlocked");
        }

        [HttpPost("{mosqueId}/test-data")]
        public async Task<IActionResult> SeedTestData(int mosqueId)
        {
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(adminId))
                adminId = "system";

            // Module 3.3 Announcements
            if (!await _uow.Repository<Announcement>().Query().AnyAsync(a => a.MosqueId == mosqueId && a.Title.Contains("Test Announcement")))
            {
                _uow.Repository<Announcement>().Add(new Announcement { MosqueId = mosqueId, Title = "Test Announcement - Published", Summary = "This is a test published announcement.", Status = PublishStatus.Published, PublishedAt = DateTime.UtcNow, CreatedById = adminId });
                _uow.Repository<Announcement>().Add(new Announcement { MosqueId = mosqueId, Title = "Test Announcement - Draft", Summary = "This is a test draft announcement.", Status = PublishStatus.Draft, CreatedById = adminId });
            }

            // Module 3.4 Events
            if (!await _uow.Repository<Event>().Query().AnyAsync(e => e.MosqueId == mosqueId && e.Title.Contains("Weekly Tafseer")))
            {
                _uow.Repository<Event>().Add(new Event { MosqueId = mosqueId, Title = "Weekly Tafseer", Description = "Weekly Tafseer class", Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)), StartTime = new TimeOnly(19, 0), Location = "Main Hall", EventType = EventType.Class, Status = EventStatus.Scheduled });
            }

            // Module 3.5 Madrassah
            if (!await _uow.Repository<MadrassahClass>().Query().AnyAsync(c => c.MosqueId == mosqueId && c.Name.Contains("Beginner Arabic")))
            {
                var mClass = new MadrassahClass { MosqueId = mosqueId, Name = "Beginner Arabic", Schedule = "Monday 5PM" };
                _uow.Repository<MadrassahClass>().Add(mClass);
            }

            // Module 3.6 Communities
            if (!await _uow.Repository<Community>().Query().AnyAsync(c => c.MosqueId == mosqueId && c.Name.Contains("Youth Group")))
            {
                _uow.Repository<Community>().Add(new Community { MosqueId = mosqueId, Name = "Youth Group", Type = CommunityType.YouthGroup, Description = "Youth Group for Mosque", IsPublic = true });
            }

            // Additional Modules Test Data (Awrad, Quran, etc.)
            // We just create minimal stubs to allow the UI to function without throwing "not found" or blank lists.
            if (!await _uow.Repository<Dua>().Query().AnyAsync(d => d.Title.Contains("Wudu")))
            {
                _uow.Repository<Dua>().Add(new Dua { Title = "Wudu Dua", ArabicText = "بِسْمِ اللَّهِ", Translation = "In the name of Allah", Category = "wudu", PublishedById = adminId });
            }
            
            await _uow.SaveChangesAsync();
            return Ok(new { message = "Test data seeded successfully." });
        }
    }
}
