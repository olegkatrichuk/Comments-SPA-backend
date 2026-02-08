using System.Threading.RateLimiting;
using Comments.API.GraphQL.Mutations;
using Comments.API.GraphQL.Queries;
using Comments.API.GraphQL.Subscriptions;
using Comments.API.Middleware;
using Comments.Application;
using Comments.Infrastructure;
using Comments.Infrastructure.Hubs;
using Comments.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Application & Infrastructure layers
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Controllers + Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS for Next.js frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Rate limiting: 10 requests per minute on POST endpoints
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("post-limit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
});

// GraphQL with Hot Chocolate
builder.Services
    .AddGraphQLServer()
    .AddQueryType<CommentQueries>()
    .AddMutationType<CommentMutations>()
    .AddSubscriptionType<CommentSubscriptions>()
    .AddInMemorySubscriptions();

// Health checks
builder.Services.AddHealthChecks();

var app = builder.Build();

// Exception handling middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseStaticFiles();
app.UseRateLimiter();
app.UseWebSockets();

app.MapControllers();
app.MapGraphQL("/graphql");
app.MapHub<CommentsHub>("/hubs/comments");
app.MapHealthChecks("/health");

// Auto-migrate database on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<CommentsDbContext>();
    await dbContext.Database.MigrateAsync();
}

app.Run();
