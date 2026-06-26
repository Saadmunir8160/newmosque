using Microsoft.EntityFrameworkCore.Storage;
using MosqueOS.Application.Common.Interfaces;

namespace MosqueOS.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private readonly Dictionary<Type, object> _repositories = new();

    public UnitOfWork(ApplicationDbContext context) => _context = context;

    public IRepository<T> Repository<T>() where T : class
    {
        var type = typeof(T);
        if (!_repositories.TryGetValue(type, out var repo))
        {
            repo = new Repository<T>(_context);
            _repositories[type] = repo;
        }
        return (IRepository<T>)repo;
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _context.SaveChangesAsync(cancellationToken);

    public async Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        return new EfUnitOfWorkTransaction(tx);
    }

    public void Dispose() => _context.Dispose();

    private sealed class EfUnitOfWorkTransaction : IUnitOfWorkTransaction
    {
        private readonly IDbContextTransaction _tx;

        public EfUnitOfWorkTransaction(IDbContextTransaction tx) => _tx = tx;

        public Task CommitAsync(CancellationToken cancellationToken = default) =>
            _tx.CommitAsync(cancellationToken);

        public ValueTask DisposeAsync() => _tx.DisposeAsync();
    }
}
