using Comments.Domain.Entities;
using Comments.Domain.Enums;

namespace Comments.Domain.Interfaces;

public interface ICommentRepository
{
    Task<Comment?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Comment?> GetByIdWithRepliesAsync(Guid id, CancellationToken ct = default);
    Task<(IReadOnlyList<Comment> Items, int TotalCount)> GetTopLevelPagedAsync(
        int page,
        int pageSize,
        SortField sortField,
        SortDirection sortDirection,
        CancellationToken ct = default);
    Task<Comment?> FindByUserNameAsync(string userName, CancellationToken ct = default);
    Task<Comment?> FindByEmailAsync(string email, CancellationToken ct = default);
    Task AddAsync(Comment comment, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
