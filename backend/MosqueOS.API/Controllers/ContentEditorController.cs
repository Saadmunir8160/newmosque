using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Helpers;
using MosqueOS.API.Models.ContentEditor;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/content-editor")]
    [ApiController]
    [Authorize(Roles = Roles.ContentManagers)]
    public class ContentEditorController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IWebHostEnvironment _env;

        public ContentEditorController(IUnitOfWork unitOfWork, IWebHostEnvironment env)
        {
            _unitOfWork = unitOfWork;
            _env = env;
        }

        private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        // ---- Dashboard ----

        [HttpGet("dashboard")]
        public async Task<IActionResult> Dashboard()
        {
            var awrad = await _unitOfWork.Repository<WirdCollection>().QueryNoTracking().CountAsync();
            var duas = await _unitOfWork.Repository<Dua>().QueryNoTracking().CountAsync();
            var adhkar = await _unitOfWork.Repository<AdhkarItem>().QueryNoTracking().CountAsync();
            var articles = await _unitOfWork.Repository<ContentArticle>().QueryNoTracking().CountAsync();
            var media = await _unitOfWork.Repository<MediaAsset>().QueryNoTracking().CountAsync();

            var statuses = await CollectStatusCountsAsync();
            var sentBackCount = await CountSentBackAsync();

            var recent = await _unitOfWork.Repository<ContentWorkflowLog>().QueryNoTracking()
                .OrderByDescending(l => l.CreatedAt)
                .Take(8)
                .ToListAsync();

            var activity = new List<ContentEditorActivityItem>();
            foreach (var log in recent)
            {
                activity.Add(new ContentEditorActivityItem
                {
                    EntityType = log.EntityType,
                    EntityId = log.EntityId,
                    Title = await ResolveTitleAsync(log.EntityType, log.EntityId),
                    FromStatus = log.FromStatus,
                    ToStatus = log.ToStatus,
                    At = log.CreatedAt
                });
            }

            return Ok(new ContentEditorDashboardResponse
            {
                AwradCollections = awrad,
                Duas = duas,
                AdhkarItems = adhkar,
                LibraryItems = articles,
                MediaAssets = media,
                DraftCount = statuses.draft,
                InReviewCount = statuses.inReview,
                ApprovedCount = statuses.approved,
                PublishedCount = statuses.published,
                SentBackCount = sentBackCount,
                RecentActivity = activity
            });
        }

        // ---- Reviews queue ----

        [HttpGet("reviews")]
        public async Task<IActionResult> Reviews([FromQuery] ContentPublishStatus? status = null, [FromQuery] bool sentBackOnly = false)
        {
            if (sentBackOnly)
            {
                var sentBackKeys = await GetSentBackEntityKeysAsync();
                var items = await BuildReviewItemsForSentBackAsync(sentBackKeys);
                return Ok(items.OrderByDescending(i => i.SubmittedAt ?? i.UpdatedAt).ToList());
            }

            var target = status ?? ContentPublishStatus.InReview;
            var queue = await BuildReviewItemsAsync(target);
            return Ok(queue.OrderByDescending(i => i.SubmittedAt ?? i.UpdatedAt).ToList());
        }

        // ---- Workflow ----

        [HttpPost("workflow")]
        public async Task<IActionResult> Transition([FromBody] WorkflowTransitionRequest request)
        {
            var entity = await LoadEntityAsync(request.EntityType, request.EntityId);
            if (entity == null) return NotFound();

            var from = (ContentPublishStatus)entity.GetType().GetProperty("Status")!.GetValue(entity)!;
            if (!ContentWorkflowHelper.CanTransition(from, request.ToStatus))
                return BadRequest(new { message = $"Cannot transition from {from} to {request.ToStatus}." });

            if (request.ToStatus == ContentPublishStatus.Approved || request.ToStatus == ContentPublishStatus.Draft)
            {
                if (!User.IsInRole(Roles.SuperAdmin) && !User.IsInRole(Roles.MosqueAdmin) && !User.IsInRole(Roles.MosqueOwner))
                {
                    // Content editors with review permission can approve/send back
                }
            }

            switch (entity)
            {
                case Dua dua:
                    ContentWorkflowHelper.ApplyPublishMeta(request.ToStatus, UserId, dua);
                    break;
                case AdhkarItem adhkar:
                    ContentWorkflowHelper.ApplyPublishMeta(request.ToStatus, UserId, adhkar);
                    break;
                case WirdCollection collection:
                    ContentWorkflowHelper.ApplyPublishMeta(request.ToStatus, UserId, collection);
                    break;
                case ContentArticle article:
                    ContentWorkflowHelper.ApplyPublishMeta(request.ToStatus, UserId, article);
                    break;
                case RitualGuide guide:
                    ContentWorkflowHelper.ApplyPublishMeta(request.ToStatus, UserId, guide);
                    break;
                default:
                    return BadRequest(new { message = "Unsupported entity type." });
            }

            await ContentWorkflowHelper.LogAsync(_unitOfWork, request.EntityType, request.EntityId, from, request.ToStatus, UserId, request.Comment);
            return Ok(entity);
        }

        // ---- Duas (editor view) ----

        [HttpGet("duas")]
        public async Task<IActionResult> GetDuas([FromQuery] string? category, [FromQuery] ContentPublishStatus? status)
        {
            var query = _unitOfWork.Repository<Dua>().QueryNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(category)) query = query.Where(d => d.Category == category);
            if (status.HasValue) query = query.Where(d => d.Status == status);
            return Ok(await query.OrderBy(d => d.Category).ThenBy(d => d.Title).ToListAsync());
        }

        [HttpPost("duas")]
        public async Task<IActionResult> CreateDua([FromBody] Dua dua)
        {
            dua.Id = 0;
            dua.Status = ContentPublishStatus.Draft;
            dua.PublishedAt = null;
            dua.PublishedById = null;
            _unitOfWork.Repository<Dua>().Add(dua);
            await _unitOfWork.SaveChangesAsync();
            return CreatedAtAction(nameof(GetDuas), new { id = dua.Id }, dua);
        }

        [HttpPut("duas/{id:int}")]
        public async Task<IActionResult> UpdateDua(int id, [FromBody] Dua input)
        {
            var dua = await _unitOfWork.Repository<Dua>().FindAsync(id);
            if (dua == null) return NotFound();

            dua.Title = input.Title;
            dua.ArabicText = input.ArabicText;
            dua.Transliteration = input.Transliteration;
            dua.Translation = input.Translation;
            dua.SourceName = input.SourceName;
            dua.SourceRef = input.SourceRef;
            dua.Category = input.Category;
            dua.Tags = input.Tags;
            dua.Tradition = input.Tradition;
            dua.AudioUrl = input.AudioUrl;
            dua.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(dua);
        }

        // ---- Adhkar ----

        [HttpGet("adhkar")]
        public async Task<IActionResult> GetAdhkar([FromQuery] string? category, [FromQuery] ContentPublishStatus? status)
        {
            var query = _unitOfWork.Repository<AdhkarItem>().QueryNoTracking()
                .Where(a => !string.IsNullOrWhiteSpace(a.Title));
            if (!string.IsNullOrWhiteSpace(category)) query = query.Where(a => a.Category == category);
            if (status.HasValue) query = query.Where(a => a.Status == status);
            return Ok(await query.OrderBy(a => a.Title).ToListAsync());
        }

        [HttpPost("adhkar")]
        public async Task<IActionResult> CreateAdhkar([FromBody] AdhkarItem item)
        {
            item.Id = 0;
            item.Status = ContentPublishStatus.Draft;
            item.PublishedAt = null;
            item.PublishedById = null;
            _unitOfWork.Repository<AdhkarItem>().Add(item);
            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }

        [HttpPut("adhkar/{id:int}")]
        public async Task<IActionResult> UpdateAdhkar(int id, [FromBody] AdhkarItem input)
        {
            var item = await _unitOfWork.Repository<AdhkarItem>().FindAsync(id);
            if (item == null) return NotFound();

            item.Title = input.Title;
            item.ArabicText = input.ArabicText;
            item.Transliteration = input.Transliteration;
            item.Translation = input.Translation;
            item.DefaultCount = input.DefaultCount;
            item.Category = input.Category;
            item.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }

        // ---- Awrad ----

        [HttpGet("awrad/collections")]
        public async Task<IActionResult> GetAwradCollections([FromQuery] Tariqa? tariqa, [FromQuery] ContentPublishStatus? status)
        {
            var query = _unitOfWork.Repository<WirdCollection>().QueryNoTracking().AsQueryable();
            if (tariqa.HasValue) query = query.Where(c => c.Tariqa == tariqa || c.Tariqa == Tariqa.General);
            if (status.HasValue) query = query.Where(c => c.Status == status);
            return Ok(await query.OrderBy(c => c.Name).ToListAsync());
        }

        [HttpPost("awrad/collections")]
        public async Task<IActionResult> CreateAwradCollection([FromBody] WirdCollection collection)
        {
            collection.Id = 0;
            collection.Status = ContentPublishStatus.Draft;
            collection.PublishedAt = null;
            collection.PublishedById = null;
            _unitOfWork.Repository<WirdCollection>().Add(collection);
            await _unitOfWork.SaveChangesAsync();
            return Ok(collection);
        }

        [HttpPut("awrad/collections/{id:int}")]
        public async Task<IActionResult> UpdateAwradCollection(int id, [FromBody] WirdCollection input)
        {
            var collection = await _unitOfWork.Repository<WirdCollection>().FindAsync(id);
            if (collection == null) return NotFound();

            collection.Name = input.Name;
            collection.Tariqa = input.Tariqa;
            collection.Type = input.Type;
            collection.RecommendedTime = input.RecommendedTime;
            collection.Description = input.Description;
            collection.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(collection);
        }

        [HttpGet("awrad/collections/{id:int}")]
        public async Task<IActionResult> GetAwradCollectionDetail(int id)
        {
            var collection = await _unitOfWork.Repository<WirdCollection>().QueryNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
            if (collection == null) return NotFound();

            var steps = await _unitOfWork.Repository<WirdStep>().QueryNoTracking()
                .Where(s => s.CollectionId == id && !s.IsDeleted)
                .Include(s => s.ContentItem)
                .OrderBy(s => s.OrderIndex)
                .ToListAsync();

            var scheduleUserIds = await _unitOfWork.Repository<UserWirdSchedule>().QueryNoTracking()
                .Where(s => s.CollectionId == id && !s.IsDeleted)
                .Select(s => s.UserId)
                .ToListAsync();
            var progressUserIds = await _unitOfWork.Repository<UserWirdProgress>().QueryNoTracking()
                .Where(p => p.CollectionId == id && !p.IsDeleted)
                .Select(p => p.UserId)
                .ToListAsync();
            var memberIds = scheduleUserIds.Union(progressUserIds).Distinct().ToList();

            var today = DateTime.UtcNow.Date;
            var activeToday = await _unitOfWork.Repository<UserWirdProgress>().QueryNoTracking()
                .Where(p => p.CollectionId == id && !p.IsDeleted && p.LastCompletedAt >= today)
                .Select(p => p.UserId)
                .Distinct()
                .CountAsync();

            var progressRows = await _unitOfWork.Repository<UserWirdProgress>().QueryNoTracking()
                .Where(p => p.CollectionId == id && !p.IsDeleted)
                .ToListAsync();
            var completionRate = progressRows.Count == 0
                ? 0
                : Math.Round(progressRows.Count(p => p.Completed) * 100.0 / progressRows.Count, 1);
            var engagementRate = memberIds.Count == 0
                ? 0
                : Math.Round(activeToday * 100.0 / memberIds.Count, 1);

            var thirtyDaysAgo = today.AddDays(-30);
            var sixtyDaysAgo = today.AddDays(-60);
            var newSchedules30 = await _unitOfWork.Repository<UserWirdSchedule>().QueryNoTracking()
                .CountAsync(s => s.CollectionId == id && !s.IsDeleted && s.CreatedAt >= thirtyDaysAgo);
            var newSchedulesPrior30 = await _unitOfWork.Repository<UserWirdSchedule>().QueryNoTracking()
                .CountAsync(s => s.CollectionId == id && !s.IsDeleted && s.CreatedAt >= sixtyDaysAgo && s.CreatedAt < thirtyDaysAgo);
            var memberGrowth = newSchedulesPrior30 == 0
                ? (newSchedules30 > 0 ? 100 : 0)
                : Math.Round((newSchedules30 - newSchedulesPrior30) * 100.0 / newSchedulesPrior30, 1);

            var sevenDaysAgo = today.AddDays(-7);
            var fourteenDaysAgo = today.AddDays(-14);
            var activeLast7 = await _unitOfWork.Repository<UserWirdProgress>().QueryNoTracking()
                .Where(p => p.CollectionId == id && !p.IsDeleted && p.LastCompletedAt >= sevenDaysAgo)
                .Select(p => p.UserId).Distinct().CountAsync();
            var activePrior7 = await _unitOfWork.Repository<UserWirdProgress>().QueryNoTracking()
                .Where(p => p.CollectionId == id && !p.IsDeleted && p.LastCompletedAt >= fourteenDaysAgo && p.LastCompletedAt < sevenDaysAgo)
                .Select(p => p.UserId).Distinct().CountAsync();
            var activeTodayTrend = activePrior7 == 0 ? (activeLast7 > 0 ? 100 : 0) : Math.Round((activeLast7 - activePrior7) * 100.0 / activePrior7, 1);

            var completions = progressRows.Count(p => p.Completed);
            var views = Math.Max(memberIds.Count, progressRows.Select(p => p.UserId).Distinct().Count());

            var items = steps.Select(s => new WirdCollectionItemRow
            {
                StepId = s.Id,
                OrderIndex = s.OrderIndex,
                ContentItemId = s.ContentItemId,
                ItemName = s.ContentItem?.Title ?? "Untitled",
                Type = s.ContentItem?.Type.ToString() ?? "Other",
                Count = s.ContentItem?.RepeatCount ?? 1,
                Category = s.ContentItem?.SourceRef ?? s.ContentItem?.Type.ToString() ?? "General",
                Status = s.ContentItem?.Status.ToString() ?? "Published",
                LastUpdated = s.ContentItem?.UpdatedAt ?? s.UpdatedAt ?? s.CreatedAt
            }).ToList();

            var userLookup = await LoadUserLookupAsync(memberIds);

            var actorIds = await _unitOfWork.Repository<ContentWorkflowLog>().QueryNoTracking()
                .Where(l => l.EntityType == "WirdCollection" && l.EntityId == id && l.ActorId != null)
                .Select(l => l.ActorId!)
                .Distinct()
                .ToListAsync();
            if (actorIds.Count > 0)
            {
                var actorLookup = await LoadUserLookupAsync(actorIds);
                foreach (var kv in actorLookup) userLookup[kv.Key] = kv.Value;
            }

            var recentSchedules = await _unitOfWork.Repository<UserWirdSchedule>().QueryNoTracking()
                .Where(s => s.CollectionId == id && !s.IsDeleted)
                .OrderByDescending(s => s.CreatedAt)
                .Take(8)
                .ToListAsync();

            var recentMembers = recentSchedules
                .Select(s => ToMemberPreview(s.UserId, userLookup))
                .DistinctBy(m => m.UserId)
                .Take(5)
                .ToList();

            var members = await BuildMemberRowsAsync(id, memberIds, userLookup);

            var activity = await BuildCollectionActivityAsync(id, collection.Name, userLookup);

            var analyticsDays = 30;
            var analyticsSince = today.AddDays(-(analyticsDays - 1));
            var dailyTrend = new List<CollectionAnalyticsPoint>();
            for (var d = analyticsSince; d <= today; d = d.AddDays(1))
            {
                var dayEnd = d.AddDays(1);
                var dayCompletions = progressRows.Count(p => p.LastCompletedAt >= d && p.LastCompletedAt < dayEnd);
                var dayUsage = progressRows.Count(p => p.LastCompletedAt >= d && p.LastCompletedAt < dayEnd);
                var dayMembers = await _unitOfWork.Repository<UserWirdSchedule>().QueryNoTracking()
                    .CountAsync(s => s.CollectionId == id && !s.IsDeleted && s.CreatedAt < dayEnd);
                dailyTrend.Add(new CollectionAnalyticsPoint
                {
                    Date = d.ToString("yyyy-MM-dd"),
                    Usage = dayUsage,
                    Completions = dayCompletions,
                    Members = dayMembers
                });
            }

            var stats = new WirdCollectionStats
            {
                TotalItems = items.Count,
                TotalMembers = memberIds.Count,
                ActiveToday = activeToday,
                CompletionRate = completionRate,
                EngagementRate = engagementRate,
                MemberGrowthPercent = memberGrowth,
                Views = views,
                Completions = completions,
                LastUpdated = collection.UpdatedAt ?? collection.CreatedAt,
                TotalItemsTrend = 0,
                TotalMembersTrend = memberGrowth,
                ActiveTodayTrend = activeTodayTrend,
                CompletionRateTrend = 0,
                EngagementRateTrend = activeTodayTrend
            };

            return Ok(new WirdCollectionDetailResponse
            {
                Collection = collection,
                Items = items,
                Stats = stats,
                RecentActivity = activity,
                Analytics = new CollectionAnalyticsBundle
                {
                    Views = views,
                    Completions = completions,
                    Engagement = engagementRate,
                    Growth = memberGrowth,
                    DailyTrend = dailyTrend
                },
                RecentMembers = recentMembers,
                Members = members
            });
        }

        [HttpPost("awrad/collections/{id:int}/duplicate")]
        public async Task<IActionResult> DuplicateAwradCollection(int id)
        {
            var source = await _unitOfWork.Repository<WirdCollection>().Query()
                .Include(c => c.Steps)
                .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
            if (source == null) return NotFound();

            var copy = new WirdCollection
            {
                Name = $"{source.Name} (Copy)",
                Tariqa = source.Tariqa,
                Type = source.Type,
                RecommendedTime = source.RecommendedTime,
                Description = source.Description,
                Status = ContentPublishStatus.Draft,
                PublishedAt = null,
                PublishedById = null
            };
            _unitOfWork.Repository<WirdCollection>().Add(copy);
            await _unitOfWork.SaveChangesAsync();

            foreach (var step in source.Steps.Where(s => !s.IsDeleted).OrderBy(s => s.OrderIndex))
            {
                _unitOfWork.Repository<WirdStep>().Add(new WirdStep
                {
                    CollectionId = copy.Id,
                    ContentItemId = step.ContentItemId,
                    OrderIndex = step.OrderIndex,
                    CustomInstructions = step.CustomInstructions
                });
            }
            await _unitOfWork.SaveChangesAsync();
            return Ok(copy);
        }

        [HttpDelete("awrad/collections/{id:int}")]
        public async Task<IActionResult> DeleteAwradCollection(int id)
        {
            var collection = await _unitOfWork.Repository<WirdCollection>().FindAsync(id);
            if (collection == null || collection.IsDeleted) return NotFound();

            collection.IsDeleted = true;
            collection.DeletedAt = DateTime.UtcNow;
            collection.DeletedById = UserId;
            collection.UpdatedAt = DateTime.UtcNow;

            var steps = await _unitOfWork.Repository<WirdStep>().Query()
                .Where(s => s.CollectionId == id && !s.IsDeleted)
                .ToListAsync();
            foreach (var step in steps)
            {
                step.IsDeleted = true;
                step.DeletedAt = DateTime.UtcNow;
                step.DeletedById = UserId;
            }

            await _unitOfWork.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("awrad/collections/{id:int}/items/bulk")]
        public async Task<IActionResult> BulkCollectionItemAction(int id, [FromBody] BulkCollectionItemActionRequest request)
        {
            if (request.StepIds.Count == 0) return BadRequest("No items selected.");

            var steps = await _unitOfWork.Repository<WirdStep>().Query()
                .Where(s => s.CollectionId == id && request.StepIds.Contains(s.Id) && !s.IsDeleted)
                .Include(s => s.ContentItem)
                .ToListAsync();
            if (steps.Count == 0) return NotFound();

            var action = request.Action.Trim().ToLowerInvariant();
            foreach (var step in steps)
            {
                if (action == "delete")
                {
                    step.IsDeleted = true;
                    step.DeletedAt = DateTime.UtcNow;
                    step.DeletedById = UserId;
                }
                else if (step.ContentItem != null)
                {
                    step.ContentItem.Status = action switch
                    {
                        "publish" => ContentPublishStatus.Published,
                        "archive" => ContentPublishStatus.Unpublished,
                        _ => step.ContentItem.Status
                    };
                    step.ContentItem.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _unitOfWork.SaveChangesAsync();
            return Ok(new { updated = steps.Count });
        }

        [HttpPost("awrad/collections/{id:int}/items")]
        public async Task<IActionResult> AddCollectionItem(int id, [FromBody] UpsertCollectionItemRequest request)
        {
            var collection = await _unitOfWork.Repository<WirdCollection>().FindAsync(id);
            if (collection == null || collection.IsDeleted) return NotFound();
            if (string.IsNullOrWhiteSpace(request.ItemName)) return BadRequest("Item name is required.");

            var maxOrder = await _unitOfWork.Repository<WirdStep>().QueryNoTracking()
                .Where(s => s.CollectionId == id && !s.IsDeleted)
                .MaxAsync(s => (int?)s.OrderIndex) ?? -1;

            var contentType = Enum.TryParse<ContentItemType>(request.Type, true, out var parsed)
                ? parsed
                : ContentItemType.Other;

            var status = Enum.TryParse<ContentPublishStatus>(request.Status, true, out var itemStatus)
                ? itemStatus
                : ContentPublishStatus.Published;

            var contentItem = new ContentItem
            {
                Title = request.ItemName.Trim(),
                Type = contentType,
                RepeatCount = Math.Max(1, request.Count),
                SourceRef = request.Category?.Trim() ?? "General",
                Status = status
            };
            _unitOfWork.Repository<ContentItem>().Add(contentItem);
            await _unitOfWork.SaveChangesAsync();

            var step = new WirdStep
            {
                CollectionId = id,
                ContentItemId = contentItem.Id,
                OrderIndex = maxOrder + 1
            };
            _unitOfWork.Repository<WirdStep>().Add(step);
            collection.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();

            return Ok(new WirdCollectionItemRow
            {
                StepId = step.Id,
                OrderIndex = step.OrderIndex,
                ContentItemId = contentItem.Id,
                ItemName = contentItem.Title,
                Type = contentItem.Type.ToString(),
                Count = contentItem.RepeatCount,
                Category = contentItem.SourceRef ?? "General",
                Status = contentItem.Status.ToString(),
                LastUpdated = contentItem.UpdatedAt ?? contentItem.CreatedAt
            });
        }

        [HttpPut("awrad/collections/{id:int}/items/{stepId:int}")]
        public async Task<IActionResult> UpdateCollectionItem(int id, int stepId, [FromBody] UpsertCollectionItemRequest request)
        {
            var step = await _unitOfWork.Repository<WirdStep>().Query()
                .Include(s => s.ContentItem)
                .FirstOrDefaultAsync(s => s.Id == stepId && s.CollectionId == id && !s.IsDeleted);
            if (step?.ContentItem == null) return NotFound();
            if (string.IsNullOrWhiteSpace(request.ItemName)) return BadRequest("Item name is required.");

            var contentType = Enum.TryParse<ContentItemType>(request.Type, true, out var parsed)
                ? parsed
                : step.ContentItem.Type;

            var status = Enum.TryParse<ContentPublishStatus>(request.Status, true, out var itemStatus)
                ? itemStatus
                : step.ContentItem.Status;

            step.ContentItem.Title = request.ItemName.Trim();
            step.ContentItem.Type = contentType;
            step.ContentItem.RepeatCount = Math.Max(1, request.Count);
            step.ContentItem.SourceRef = request.Category?.Trim() ?? step.ContentItem.SourceRef;
            step.ContentItem.Status = status;
            step.ContentItem.UpdatedAt = DateTime.UtcNow;
            step.UpdatedAt = DateTime.UtcNow;

            var collection = await _unitOfWork.Repository<WirdCollection>().FindAsync(id);
            if (collection != null) collection.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();

            return Ok(new WirdCollectionItemRow
            {
                StepId = step.Id,
                OrderIndex = step.OrderIndex,
                ContentItemId = step.ContentItemId,
                ItemName = step.ContentItem.Title,
                Type = step.ContentItem.Type.ToString(),
                Count = step.ContentItem.RepeatCount,
                Category = step.ContentItem.SourceRef ?? "General",
                Status = step.ContentItem.Status.ToString(),
                LastUpdated = step.ContentItem.UpdatedAt ?? step.ContentItem.CreatedAt
            });
        }

        // ---- Library articles ----

        [HttpGet("articles")]
        public async Task<IActionResult> GetArticles([FromQuery] LibraryItemType? itemType, [FromQuery] ContentPublishStatus? status)
        {
            var query = _unitOfWork.Repository<ContentArticle>().QueryNoTracking().AsQueryable();
            if (itemType.HasValue) query = query.Where(a => a.ItemType == itemType);
            if (status.HasValue) query = query.Where(a => a.Status == status);
            return Ok(await query.OrderByDescending(a => a.UpdatedAt ?? a.CreatedAt).ToListAsync());
        }

        [HttpGet("articles/{id:int}")]
        public async Task<IActionResult> GetArticle(int id)
        {
            var article = await _unitOfWork.Repository<ContentArticle>().QueryNoTracking().FirstOrDefaultAsync(a => a.Id == id);
            return article == null ? NotFound() : Ok(article);
        }

        [HttpPost("articles")]
        public async Task<IActionResult> CreateArticle([FromBody] ContentArticle article)
        {
            article.Id = 0;
            article.AuthorId = UserId;
            article.Status = ContentPublishStatus.Draft;
            _unitOfWork.Repository<ContentArticle>().Add(article);
            await _unitOfWork.SaveChangesAsync();
            return Ok(article);
        }

        [HttpPut("articles/{id:int}")]
        public async Task<IActionResult> UpdateArticle(int id, [FromBody] ContentArticle input)
        {
            var article = await _unitOfWork.Repository<ContentArticle>().FindAsync(id);
            if (article == null) return NotFound();

            article.Title = input.Title;
            article.Slug = input.Slug;
            article.Summary = input.Summary;
            article.Body = input.Body;
            article.ItemType = input.ItemType;
            article.ResourceUrl = input.ResourceUrl;
            article.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(article);
        }

        [HttpDelete("articles/{id:int}")]
        public async Task<IActionResult> DeleteArticle(int id)
        {
            var article = await _unitOfWork.Repository<ContentArticle>().FindAsync(id);
            if (article == null) return NotFound();
            _unitOfWork.Repository<ContentArticle>().Remove(article);
            await _unitOfWork.SaveChangesAsync();
            return NoContent();
        }

        // ---- Media ----

        [HttpGet("media")]
        public async Task<IActionResult> GetMedia([FromQuery] MediaAssetType? mediaType)
        {
            var query = _unitOfWork.Repository<MediaAsset>().QueryNoTracking().AsQueryable();
            if (mediaType.HasValue) query = query.Where(m => m.MediaType == mediaType);
            return Ok(await query.OrderByDescending(m => m.CreatedAt).ToListAsync());
        }

        [HttpPost("media/upload")]
        [RequestSizeLimit(52_428_800)]
        public async Task<IActionResult> UploadMedia(IFormFile file, [FromQuery] MediaAssetType? mediaType)
        {
            if (file == null || file.Length == 0) return BadRequest(new { message = "No file uploaded." });

            var type = mediaType ?? InferMediaType(file.ContentType);
            var folder = type switch
            {
                MediaAssetType.Audio => "audio",
                MediaAssetType.Video => "videos",
                _ => "images"
            };

            var uploadsRoot = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads", folder);
            Directory.CreateDirectory(uploadsRoot);

            var ext = Path.GetExtension(file.FileName);
            var storedName = $"{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(uploadsRoot, storedName);

            await using (var stream = System.IO.File.Create(fullPath))
            {
                await file.CopyToAsync(stream);
            }

            var url = $"/uploads/{folder}/{storedName}";
            var asset = new MediaAsset
            {
                FileName = storedName,
                OriginalFileName = file.FileName,
                ContentType = file.ContentType,
                MediaType = type,
                Url = url,
                SizeBytes = file.Length,
                UploadedById = UserId
            };

            _unitOfWork.Repository<MediaAsset>().Add(asset);
            await _unitOfWork.SaveChangesAsync();
            return Ok(asset);
        }

        [HttpDelete("media/{id:int}")]
        public async Task<IActionResult> DeleteMedia(int id)
        {
            var asset = await _unitOfWork.Repository<MediaAsset>().FindAsync(id);
            if (asset == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(asset.Url) && asset.Url.StartsWith("/uploads/"))
            {
                var physical = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), asset.Url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(physical)) System.IO.File.Delete(physical);
            }

            _unitOfWork.Repository<MediaAsset>().Remove(asset);
            await _unitOfWork.SaveChangesAsync();
            return NoContent();
        }

        // ---- Helpers ----

        private static MediaAssetType InferMediaType(string contentType) => contentType switch
        {
            var c when c.StartsWith("audio/") => MediaAssetType.Audio,
            var c when c.StartsWith("video/") => MediaAssetType.Video,
            _ => MediaAssetType.Image
        };

        private async Task<(int draft, int inReview, int approved, int published)> CollectStatusCountsAsync()
        {
            int draft = 0, inReview = 0, approved = 0, published = 0;

            void Tally(IEnumerable<ContentPublishStatus> statuses)
            {
                foreach (var s in statuses)
                {
                    switch (s)
                    {
                        case ContentPublishStatus.Draft: draft++; break;
                        case ContentPublishStatus.InReview: inReview++; break;
                        case ContentPublishStatus.Approved: approved++; break;
                        case ContentPublishStatus.Published: published++; break;
                    }
                }
            }

            Tally(await _unitOfWork.Repository<Dua>().QueryNoTracking().Select(d => d.Status).ToListAsync());
            Tally(await _unitOfWork.Repository<AdhkarItem>().QueryNoTracking().Select(a => a.Status).ToListAsync());
            Tally(await _unitOfWork.Repository<WirdCollection>().QueryNoTracking().Select(c => c.Status).ToListAsync());
            Tally(await _unitOfWork.Repository<ContentArticle>().QueryNoTracking().Select(a => a.Status).ToListAsync());
            Tally(await _unitOfWork.Repository<RitualGuide>().QueryNoTracking().Where(g => !g.IsDeleted).Select(g => g.Status).ToListAsync());

            return (draft, inReview, approved, published);
        }

        private async Task<int> CountSentBackAsync()
        {
            var keys = await GetSentBackEntityKeysAsync();
            return keys.Count;
        }

        private async Task<HashSet<(string EntityType, int EntityId)>> GetSentBackEntityKeysAsync()
        {
            var logs = await _unitOfWork.Repository<ContentWorkflowLog>().QueryNoTracking()
                .Where(l => l.FromStatus == ContentPublishStatus.InReview && l.ToStatus == ContentPublishStatus.Draft)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();

            var latest = new Dictionary<(string EntityType, int EntityId), ContentWorkflowLog>();
            foreach (var log in logs)
            {
                var key = (log.EntityType, log.EntityId);
                if (!latest.ContainsKey(key))
                    latest[key] = log;
            }

            var result = new HashSet<(string, int)>();
            foreach (var (entityType, entityId) in latest.Keys)
            {
                var stillDraft = entityType switch
                {
                    "Dua" => await _unitOfWork.Repository<Dua>().QueryNoTracking()
                        .AnyAsync(d => d.Id == entityId && d.Status == ContentPublishStatus.Draft),
                    "Adhkar" => await _unitOfWork.Repository<AdhkarItem>().QueryNoTracking()
                        .AnyAsync(a => a.Id == entityId && a.Status == ContentPublishStatus.Draft),
                    "WirdCollection" => await _unitOfWork.Repository<WirdCollection>().QueryNoTracking()
                        .AnyAsync(c => c.Id == entityId && c.Status == ContentPublishStatus.Draft),
                    "ContentArticle" => await _unitOfWork.Repository<ContentArticle>().QueryNoTracking()
                        .AnyAsync(a => a.Id == entityId && a.Status == ContentPublishStatus.Draft),
                    "RitualGuide" => await _unitOfWork.Repository<RitualGuide>().QueryNoTracking()
                        .AnyAsync(g => g.Id == entityId && !g.IsDeleted && g.Status == ContentPublishStatus.Draft),
                    _ => false
                };
                if (stillDraft) result.Add((entityType, entityId));
            }

            return result;
        }

        private async Task<List<ContentReviewItem>> BuildReviewItemsAsync(ContentPublishStatus target)
        {
            var items = new List<ContentReviewItem>();

            items.AddRange(await _unitOfWork.Repository<Dua>().QueryNoTracking()
                .Where(d => d.Status == target)
                .Select(d => new ContentReviewItem
                {
                    EntityType = "Dua",
                    EntityId = d.Id,
                    Title = d.Title,
                    Status = d.Status,
                    UpdatedAt = d.UpdatedAt,
                    Category = d.Category,
                    StepCount = 0,
                    SubmittedAt = d.UpdatedAt ?? d.CreatedAt
                })
                .ToListAsync());

            items.AddRange(await _unitOfWork.Repository<AdhkarItem>().QueryNoTracking()
                .Where(a => a.Status == target)
                .Select(a => new ContentReviewItem
                {
                    EntityType = "Adhkar",
                    EntityId = a.Id,
                    Title = a.Title,
                    Status = a.Status,
                    UpdatedAt = a.UpdatedAt,
                    Category = a.Category,
                    StepCount = 0,
                    SubmittedAt = a.UpdatedAt ?? a.CreatedAt
                })
                .ToListAsync());

            items.AddRange(await _unitOfWork.Repository<WirdCollection>().QueryNoTracking()
                .Where(c => c.Status == target)
                .Select(c => new ContentReviewItem
                {
                    EntityType = "WirdCollection",
                    EntityId = c.Id,
                    Title = c.Name,
                    Status = c.Status,
                    UpdatedAt = c.UpdatedAt,
                    Category = c.Type.ToString(),
                    StepCount = c.Steps.Count,
                    SubmittedAt = c.UpdatedAt ?? c.CreatedAt
                })
                .ToListAsync());

            items.AddRange(await _unitOfWork.Repository<ContentArticle>().QueryNoTracking()
                .Where(a => a.Status == target)
                .Select(a => new ContentReviewItem
                {
                    EntityType = "ContentArticle",
                    EntityId = a.Id,
                    Title = a.Title,
                    Status = a.Status,
                    UpdatedAt = a.UpdatedAt,
                    Category = a.ItemType.ToString(),
                    StepCount = 0,
                    SubmittedAt = a.UpdatedAt ?? a.CreatedAt
                })
                .ToListAsync());

            items.AddRange(await _unitOfWork.Repository<RitualGuide>().QueryNoTracking()
                .Where(g => !g.IsDeleted && g.Status == target)
                .Select(g => new ContentReviewItem
                {
                    EntityType = "RitualGuide",
                    EntityId = g.Id,
                    Title = g.Title,
                    Status = g.Status,
                    UpdatedAt = g.UpdatedAt,
                    Category = g.Type.ToString(),
                    StepCount = g.Steps.Count(s => !s.IsDeleted),
                    SubmittedAt = g.UpdatedAt ?? g.CreatedAt
                })
                .ToListAsync());

            return items;
        }

        private async Task<List<ContentReviewItem>> BuildReviewItemsForSentBackAsync(HashSet<(string EntityType, int EntityId)> keys)
        {
            if (keys.Count == 0) return new List<ContentReviewItem>();

            var items = new List<ContentReviewItem>();
            var duaIds = keys.Where(k => k.EntityType == "Dua").Select(k => k.EntityId).ToList();
            var adhkarIds = keys.Where(k => k.EntityType == "Adhkar").Select(k => k.EntityId).ToList();
            var wirdIds = keys.Where(k => k.EntityType == "WirdCollection").Select(k => k.EntityId).ToList();
            var articleIds = keys.Where(k => k.EntityType == "ContentArticle").Select(k => k.EntityId).ToList();
            var guideIds = keys.Where(k => k.EntityType == "RitualGuide").Select(k => k.EntityId).ToList();

            if (duaIds.Count > 0)
            {
                items.AddRange(await _unitOfWork.Repository<Dua>().QueryNoTracking()
                    .Where(d => duaIds.Contains(d.Id) && d.Status == ContentPublishStatus.Draft)
                    .Select(d => new ContentReviewItem
                    {
                        EntityType = "Dua",
                        EntityId = d.Id,
                        Title = d.Title,
                        Status = d.Status,
                        UpdatedAt = d.UpdatedAt,
                        Category = d.Category,
                        SubmittedAt = d.UpdatedAt ?? d.CreatedAt
                    })
                    .ToListAsync());
            }

            if (adhkarIds.Count > 0)
            {
                items.AddRange(await _unitOfWork.Repository<AdhkarItem>().QueryNoTracking()
                    .Where(a => adhkarIds.Contains(a.Id) && a.Status == ContentPublishStatus.Draft)
                    .Select(a => new ContentReviewItem
                    {
                        EntityType = "Adhkar",
                        EntityId = a.Id,
                        Title = a.Title,
                        Status = a.Status,
                        UpdatedAt = a.UpdatedAt,
                        Category = a.Category,
                        SubmittedAt = a.UpdatedAt ?? a.CreatedAt
                    })
                    .ToListAsync());
            }

            if (wirdIds.Count > 0)
            {
                items.AddRange(await _unitOfWork.Repository<WirdCollection>().QueryNoTracking()
                    .Where(c => wirdIds.Contains(c.Id) && c.Status == ContentPublishStatus.Draft)
                    .Select(c => new ContentReviewItem
                    {
                        EntityType = "WirdCollection",
                        EntityId = c.Id,
                        Title = c.Name,
                        Status = c.Status,
                        UpdatedAt = c.UpdatedAt,
                        Category = c.Type.ToString(),
                        StepCount = c.Steps.Count,
                        SubmittedAt = c.UpdatedAt ?? c.CreatedAt
                    })
                    .ToListAsync());
            }

            if (articleIds.Count > 0)
            {
                items.AddRange(await _unitOfWork.Repository<ContentArticle>().QueryNoTracking()
                    .Where(a => articleIds.Contains(a.Id) && a.Status == ContentPublishStatus.Draft)
                    .Select(a => new ContentReviewItem
                    {
                        EntityType = "ContentArticle",
                        EntityId = a.Id,
                        Title = a.Title,
                        Status = a.Status,
                        UpdatedAt = a.UpdatedAt,
                        Category = a.ItemType.ToString(),
                        SubmittedAt = a.UpdatedAt ?? a.CreatedAt
                    })
                    .ToListAsync());
            }

            if (guideIds.Count > 0)
            {
                items.AddRange(await _unitOfWork.Repository<RitualGuide>().QueryNoTracking()
                    .Where(g => guideIds.Contains(g.Id) && !g.IsDeleted && g.Status == ContentPublishStatus.Draft)
                    .Select(g => new ContentReviewItem
                    {
                        EntityType = "RitualGuide",
                        EntityId = g.Id,
                        Title = g.Title,
                        Status = g.Status,
                        UpdatedAt = g.UpdatedAt,
                        Category = g.Type.ToString(),
                        StepCount = g.Steps.Count(s => !s.IsDeleted),
                        SubmittedAt = g.UpdatedAt ?? g.CreatedAt
                    })
                    .ToListAsync());
            }

            return items;
        }

        private async Task<string> ResolveTitleAsync(string entityType, int entityId) => entityType switch
        {
            "Dua" => await _unitOfWork.Repository<Dua>().QueryNoTracking().Where(d => d.Id == entityId).Select(d => d.Title).FirstOrDefaultAsync() ?? entityType,
            "Adhkar" => await _unitOfWork.Repository<AdhkarItem>().QueryNoTracking().Where(a => a.Id == entityId).Select(a => a.Title).FirstOrDefaultAsync() ?? entityType,
            "WirdCollection" => await _unitOfWork.Repository<WirdCollection>().QueryNoTracking().Where(c => c.Id == entityId).Select(c => c.Name).FirstOrDefaultAsync() ?? entityType,
            "ContentArticle" => await _unitOfWork.Repository<ContentArticle>().QueryNoTracking().Where(a => a.Id == entityId).Select(a => a.Title).FirstOrDefaultAsync() ?? entityType,
            "RitualGuide" => await _unitOfWork.Repository<RitualGuide>().QueryNoTracking().Where(g => g.Id == entityId).Select(g => g.Title).FirstOrDefaultAsync() ?? entityType,
            _ => entityType
        };

        private async Task<object?> LoadEntityAsync(string entityType, int entityId) => entityType switch
        {
            "Dua" => await _unitOfWork.Repository<Dua>().FindAsync(entityId),
            "Adhkar" => await _unitOfWork.Repository<AdhkarItem>().FindAsync(entityId),
            "WirdCollection" => await _unitOfWork.Repository<WirdCollection>().FindAsync(entityId),
            "ContentArticle" => await _unitOfWork.Repository<ContentArticle>().FindAsync(entityId),
            "RitualGuide" => await _unitOfWork.Repository<RitualGuide>().FindAsync(entityId),
            _ => null
        };

        private async Task<Dictionary<string, ApplicationUser>> LoadUserLookupAsync(IEnumerable<string> userIds)
        {
            var ids = userIds.Distinct().Where(id => !string.IsNullOrWhiteSpace(id)).ToList();
            if (ids.Count == 0) return new Dictionary<string, ApplicationUser>();

            var users = await _unitOfWork.Repository<ApplicationUser>().QueryNoTracking()
                .Where(u => ids.Contains(u.Id))
                .ToListAsync();
            return users.ToDictionary(u => u.Id, u => u);
        }

        private static CollectionMemberPreview ToMemberPreview(string userId, Dictionary<string, ApplicationUser> lookup)
        {
            lookup.TryGetValue(userId, out var user);
            var name = !string.IsNullOrWhiteSpace(user?.FullName) ? user!.FullName : user?.Email ?? "Member";
            return new CollectionMemberPreview
            {
                UserId = userId,
                Name = name,
                Initials = BuildInitials(name)
            };
        }

        private static string BuildInitials(string name)
        {
            var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2) return $"{parts[0][0]}{parts[1][0]}".ToUpperInvariant();
            return parts.Length == 1 && parts[0].Length > 0 ? parts[0][0].ToString().ToUpperInvariant() : "?";
        }

        private async Task<List<CollectionMemberRow>> BuildMemberRowsAsync(int collectionId, List<string> memberIds, Dictionary<string, ApplicationUser> lookup)
        {
            var schedules = await _unitOfWork.Repository<UserWirdSchedule>().QueryNoTracking()
                .Where(s => s.CollectionId == collectionId && !s.IsDeleted && memberIds.Contains(s.UserId))
                .ToListAsync();
            var progress = await _unitOfWork.Repository<UserWirdProgress>().QueryNoTracking()
                .Where(p => p.CollectionId == collectionId && !p.IsDeleted && memberIds.Contains(p.UserId))
                .ToListAsync();

            return memberIds.Select(uid =>
            {
                lookup.TryGetValue(uid, out var user);
                var schedule = schedules.Where(s => s.UserId == uid).OrderBy(s => s.CreatedAt).FirstOrDefault();
                var prog = progress.FirstOrDefault(p => p.UserId == uid);
                var name = !string.IsNullOrWhiteSpace(user?.FullName) ? user!.FullName : user?.Email ?? "Member";
                return new CollectionMemberRow
                {
                    UserId = uid,
                    Name = name,
                    Email = user?.Email ?? "",
                    Initials = BuildInitials(name),
                    JoinedAt = schedule?.CreatedAt ?? prog?.CreatedAt ?? DateTime.UtcNow,
                    LastActiveAt = prog?.LastCompletedAt,
                    Completed = prog?.Completed ?? false
                };
            }).OrderByDescending(m => m.LastActiveAt ?? m.JoinedAt).ToList();
        }

        private async Task<List<CollectionActivityItem>> BuildCollectionActivityAsync(int collectionId, string collectionName, Dictionary<string, ApplicationUser> lookup)
        {
            var activity = new List<CollectionActivityItem>();

            var logs = await _unitOfWork.Repository<ContentWorkflowLog>().QueryNoTracking()
                .Where(l => l.EntityType == "WirdCollection" && l.EntityId == collectionId)
                .OrderByDescending(l => l.CreatedAt)
                .Take(6)
                .ToListAsync();

            foreach (var log in logs)
            {
                lookup.TryGetValue(log.ActorId ?? "", out var actor);
                var actorName = !string.IsNullOrWhiteSpace(actor?.FullName) ? actor!.FullName : actor?.Email ?? "Admin";
                var action = log.ToStatus switch
                {
                    ContentPublishStatus.Published => "published collection",
                    ContentPublishStatus.Unpublished => "archived collection",
                    ContentPublishStatus.Draft => "moved collection to draft",
                    ContentPublishStatus.InReview => "submitted collection for review",
                    ContentPublishStatus.Approved => "approved collection",
                    _ => $"updated collection status to {log.ToStatus}"
                };
                activity.Add(new CollectionActivityItem
                {
                    UserId = log.ActorId ?? "",
                    UserName = actorName,
                    UserInitials = BuildInitials(actorName),
                    Action = action,
                    At = log.CreatedAt
                });
            }

            var joins = await _unitOfWork.Repository<UserWirdSchedule>().QueryNoTracking()
                .Where(s => s.CollectionId == collectionId && !s.IsDeleted)
                .OrderByDescending(s => s.CreatedAt)
                .Take(6)
                .ToListAsync();

            foreach (var join in joins)
            {
                var preview = ToMemberPreview(join.UserId, lookup);
                activity.Add(new CollectionActivityItem
                {
                    UserId = join.UserId,
                    UserName = preview.Name,
                    UserInitials = preview.Initials,
                    Action = "joined collection",
                    At = join.CreatedAt
                });
            }

            return activity.OrderByDescending(a => a.At).Take(10).ToList();
        }
    }
}
