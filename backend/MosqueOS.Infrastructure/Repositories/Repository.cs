using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;

namespace MosqueOS.Infrastructure.Repositories;

public class Repository<T> : IRepository<T> where T : class
{
    private readonly ApplicationDbContext _context;
    private readonly DbSet<T> _dbSet;

    public Repository(ApplicationDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public IQueryable<T> Query() => _dbSet;
    public IQueryable<T> QueryNoTracking() => _dbSet.AsNoTracking();

    public Task<T?> GetByIdAsync(int id, CancellationToken cancellationToken = default) =>
        _dbSet.FindAsync(new object[] { id }, cancellationToken).AsTask();

    public async Task<T?> FindAsync(params object[] keyValues)
    {
        return await _dbSet.FindAsync(keyValues);
    }

    public Task AddAsync(T entity, CancellationToken cancellationToken = default) =>
        _dbSet.AddAsync(entity, cancellationToken).AsTask();

    public void Add(T entity) => _dbSet.Add(entity);

    public Task AddRangeAsync(IEnumerable<T> entities, CancellationToken cancellationToken = default) =>
        _dbSet.AddRangeAsync(entities, cancellationToken);

    public void AddRange(IEnumerable<T> entities) => _dbSet.AddRange(entities);

    public void Update(T entity) => _dbSet.Update(entity);

    public void Remove(T entity) => _dbSet.Remove(entity);

    public void RemoveRange(IEnumerable<T> entities) => _dbSet.RemoveRange(entities);
}
