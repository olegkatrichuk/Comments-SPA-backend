using Comments.Domain.Entities;
using Comments.Domain.Enums;
using Comments.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Comments.Infrastructure.Persistence.Repositories;

public sealed class CommentRepository : ICommentRepository
{
    private readonly CommentsDbContext _dbContext;

    public CommentRepository(CommentsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Comment?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _dbContext.Comments
            .Include(c => c.Attachment)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
    }

    public async Task<Comment?> GetByIdWithRepliesAsync(Guid id, CancellationToken ct = default)
    {
        var comment = await _dbContext.Comments
            .Include(c => c.Attachment)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (comment is null)
            return null;

        await LoadRepliesRecursivelyAsync(comment, ct);

        return comment;
    }

    public async Task<(IReadOnlyList<Comment> Items, int TotalCount)> GetTopLevelPagedAsync(
        int page,
        int pageSize,
        SortField sortField,
        SortDirection sortDirection,
        CancellationToken ct = default)
    {
        var query = _dbContext.Comments
            .Where(c => c.ParentCommentId == null);

        var totalCount = await query.CountAsync(ct);

        query = ApplySorting(query, sortField, sortDirection);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(c => c.Attachment)
            .ToListAsync(ct);

        // Recursively load all nested replies
        foreach (var item in items)
        {
            await LoadRepliesRecursivelyAsync(item, ct);
        }

        return (items, totalCount);
    }

    public async Task<Comment?> FindByUserNameAsync(string userName, CancellationToken ct = default)
    {
        return await _dbContext.Comments
            .FirstOrDefaultAsync(c => c.UserName == userName, ct);
    }

    public async Task<Comment?> FindByEmailAsync(string email, CancellationToken ct = default)
    {
        return await _dbContext.Comments
            .FirstOrDefaultAsync(c => c.Email == email, ct);
    }

    public async Task AddAsync(Comment comment, CancellationToken ct = default)
    {
        await _dbContext.Comments.AddAsync(comment, ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _dbContext.SaveChangesAsync(ct);
    }

    private static IQueryable<Comment> ApplySorting(
        IQueryable<Comment> query,
        SortField sortField,
        SortDirection sortDirection)
    {
        return (sortField, sortDirection) switch
        {
            (SortField.UserName, SortDirection.Ascending) => query.OrderBy(c => c.UserName),
            (SortField.UserName, SortDirection.Descending) => query.OrderByDescending(c => c.UserName),
            (SortField.Email, SortDirection.Ascending) => query.OrderBy(c => c.Email),
            (SortField.Email, SortDirection.Descending) => query.OrderByDescending(c => c.Email),
            (SortField.CreatedAt, SortDirection.Ascending) => query.OrderBy(c => c.CreatedAt),
            (SortField.CreatedAt, SortDirection.Descending) => query.OrderByDescending(c => c.CreatedAt),
            _ => query.OrderByDescending(c => c.CreatedAt)
        };
    }

    private async Task LoadRepliesRecursivelyAsync(Comment comment, CancellationToken ct)
    {
        await _dbContext.Entry(comment)
            .Collection(c => c.Replies)
            .Query()
            .Include(r => r.Attachment)
            .LoadAsync(ct);

        foreach (var reply in comment.Replies)
        {
            await LoadRepliesRecursivelyAsync(reply, ct);
        }
    }
}
