using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Helpers
{
    public static class ContentWorkflowHelper
    {
        public static bool CanTransition(ContentPublishStatus from, ContentPublishStatus to) => (from, to) switch
        {
            (ContentPublishStatus.Draft, ContentPublishStatus.InReview) => true,
            (ContentPublishStatus.InReview, ContentPublishStatus.Approved) => true,
            (ContentPublishStatus.InReview, ContentPublishStatus.Draft) => true,
            (ContentPublishStatus.Approved, ContentPublishStatus.Published) => true,
            (ContentPublishStatus.Published, ContentPublishStatus.Unpublished) => true,
            (ContentPublishStatus.Unpublished, ContentPublishStatus.Draft) => true,
            _ => false
        };

        public static async Task LogAsync(
            IUnitOfWork unitOfWork,
            string entityType,
            int entityId,
            ContentPublishStatus from,
            ContentPublishStatus to,
            string? actorId,
            string? comment = null)
        {
            unitOfWork.Repository<ContentWorkflowLog>().Add(new ContentWorkflowLog
            {
                EntityType = entityType,
                EntityId = entityId,
                FromStatus = from,
                ToStatus = to,
                ActorId = actorId,
                Comment = comment
            });
            await unitOfWork.SaveChangesAsync();
        }

        public static void ApplyPublishMeta(ContentPublishStatus to, string? actorId, Dua entity) =>
            ApplyPublishMetaCore(to, actorId, entity);

        public static void ApplyPublishMeta(ContentPublishStatus to, string? actorId, AdhkarItem entity) =>
            ApplyPublishMetaCore(to, actorId, entity);

        public static void ApplyPublishMeta(ContentPublishStatus to, string? actorId, WirdCollection entity) =>
            ApplyPublishMetaCore(to, actorId, entity);

        public static void ApplyPublishMeta(ContentPublishStatus to, string? actorId, ContentArticle entity) =>
            ApplyPublishMetaCore(to, actorId, entity);

        public static void ApplyPublishMeta(ContentPublishStatus to, string? actorId, RitualGuide entity) =>
            ApplyPublishMetaCore(to, actorId, entity);

        private static void ApplyPublishMetaCore(ContentPublishStatus to, string? actorId, dynamic entity)
        {
            if (to == ContentPublishStatus.Published)
            {
                entity.PublishedAt = DateTime.UtcNow;
                entity.PublishedById = actorId;
            }
            else if (to == ContentPublishStatus.Unpublished || to == ContentPublishStatus.Draft)
            {
                entity.PublishedAt = null;
                entity.PublishedById = null;
            }
            entity.Status = to;
            entity.UpdatedAt = DateTime.UtcNow;
        }
    }
}
