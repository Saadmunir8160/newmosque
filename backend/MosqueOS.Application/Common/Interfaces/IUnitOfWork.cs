namespace MosqueOS.Application.Common.Interfaces;

/// <summary>Unit of Work — coordinates repositories and persists changes.</summary>
public interface IUnitOfWork : IDisposable
{
    IRepository<T> Repository<T>() where T : class;
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
