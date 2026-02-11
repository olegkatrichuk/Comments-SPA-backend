using Comments.Application.DTOs;
using Comments.Application.Mapping;
using Comments.Application.Services;
using Comments.Domain.Entities;
using Comments.Domain.Enums;
using Comments.Domain.Interfaces;
using Comments.Domain.ValueObjects;
using MediatR;

namespace Comments.Application.Comments.Commands.CreateComment;

public sealed class CreateCommentCommandHandler : IRequestHandler<CreateCommentCommand, CommentDto>
{
    private readonly ICommentRepository _commentRepository;
    private readonly ICaptchaService _captchaService;
    private readonly IFileStorageService _fileStorageService;
    private readonly ICacheService _cacheService;
    private readonly IHtmlSanitizer _htmlSanitizer;
    private readonly IHtmlTagValidator _htmlTagValidator;

    public CreateCommentCommandHandler(
        ICommentRepository commentRepository,
        ICaptchaService captchaService,
        IFileStorageService fileStorageService,
        ICacheService cacheService,
        IHtmlSanitizer htmlSanitizer,
        IHtmlTagValidator htmlTagValidator)
    {
        _commentRepository = commentRepository;
        _captchaService = captchaService;
        _fileStorageService = fileStorageService;
        _cacheService = cacheService;
        _htmlSanitizer = htmlSanitizer;
        _htmlTagValidator = htmlTagValidator;
    }

    public async Task<CommentDto> Handle(CreateCommentCommand request, CancellationToken cancellationToken)
    {
        // 1. Validate CAPTCHA
        var captchaValid = await _captchaService.ValidateAsync(
            request.CaptchaKey, request.CaptchaAnswer, cancellationToken);

        if (!captchaValid)
            throw new InvalidOperationException("CAPTCHA validation failed.");

        // 2. Check userName + email uniqueness
        var existingByUserName = await _commentRepository.FindByUserNameAsync(request.UserName, cancellationToken);
        if (existingByUserName is not null && !string.Equals(existingByUserName.Email, request.Email, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Username '{request.UserName}' is already associated with a different email.");

        var existingByEmail = await _commentRepository.FindByEmailAsync(request.Email, cancellationToken);
        if (existingByEmail is not null && !string.Equals(existingByEmail.UserName, request.UserName, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Email '{request.Email}' is already associated with a different username.");

        // 3. Validate HTML tags (XHTML closure)
        var (isValid, error) = _htmlTagValidator.ValidateTags(request.Text);
        if (!isValid)
            throw new InvalidOperationException($"Invalid HTML in comment text: {error}");

        // 3. Sanitize HTML text
        var sanitizedText = _htmlSanitizer.Sanitize(request.Text);

        // 4. Create value objects
        var userName = UserName.Create(request.UserName);
        var email = Email.Create(request.Email);
        var homePage = HomePage.Create(request.HomePage);

        // 5. Create comment entity
        var comment = Comment.Create(userName, email, homePage, sanitizedText, request.ParentCommentId);

        // 6. Handle file upload if present
        if (request.FileStream is not null && !string.IsNullOrWhiteSpace(request.FileName) &&
            !string.IsNullOrWhiteSpace(request.FileContentType))
        {
            var (storedFileName, contentType, fileSize) = await _fileStorageService.SaveAsync(
                request.FileStream, request.FileName, request.FileContentType, cancellationToken);

            var attachmentType = DetermineAttachmentType(request.FileContentType);

            var attachment = Attachment.Create(
                request.FileName,
                storedFileName,
                contentType,
                fileSize,
                attachmentType);

            comment.SetAttachment(attachment);
        }

        // 7. Persist to repository
        await _commentRepository.AddAsync(comment, cancellationToken);
        await _commentRepository.SaveChangesAsync(cancellationToken);

        // 8. Invalidate cache
        await _cacheService.RemoveByPrefixAsync("comments:", cancellationToken);

        // 9. Return mapped DTO
        return comment.ToDto();
    }

    private static AttachmentType DetermineAttachmentType(string contentType)
    {
        return contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)
            ? AttachmentType.Image
            : AttachmentType.TextFile;
    }
}
