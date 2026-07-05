namespace MosqueOS.Application.Common.Interfaces;

/// <summary>Generic repository abstraction over EF Core (Repository Pattern).</summary>
public interface IRepository<T> where T : class
{
    IQueryable<T> Query();
    IQueryable<T> QueryNoTracking();

    Task<T?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<T?> FindAsync(params object[] keyValues);

    Task AddAsync(T entity, CancellationToken cancellationToken = default);
    void Add(T entity);
    Task AddRangeAsync(IEnumerable<T> entities, CancellationToken cancellationToken = default);
    void AddRange(IEnumerable<T> entities);

    void Update(T entity);
    void Remove(T entity);
    void RemoveRange(IEnumerable<T> entities);
}
