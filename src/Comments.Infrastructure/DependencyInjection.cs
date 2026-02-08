using Comments.Application.Services;
using Comments.Domain.Interfaces;
using Comments.Infrastructure.Cache;
using Comments.Infrastructure.Captcha;
using Comments.Infrastructure.FileStorage;
using Comments.Infrastructure.Html;
using Comments.Infrastructure.Hubs;
using Comments.Infrastructure.Messaging.Consumers;
using Comments.Infrastructure.Persistence;
using Comments.Infrastructure.Persistence.Repositories;
using Comments.Infrastructure.Search;
using Comments.Infrastructure.Services;
using Elastic.Clients.Elasticsearch;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Comments.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // PostgreSQL + EF Core
        services.AddDbContext<CommentsDbContext>(options =>
            options.UseNpgsql(
                config.GetConnectionString("PostgreSQL"),
                npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsAssembly(typeof(CommentsDbContext).Assembly.FullName);
                    npgsqlOptions.EnableRetryOnFailure(3);
                }));

        // Redis distributed cache
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = config.GetConnectionString("Redis");
            options.InstanceName = "Comments:";
        });

        // Redis connection multiplexer (singleton)
        services.AddSingleton<IConnectionMultiplexer>(sp =>
        {
            var connectionString = config.GetConnectionString("Redis")
                ?? throw new InvalidOperationException("Redis connection string is not configured.");
            return ConnectionMultiplexer.Connect(connectionString);
        });

        // Domain / Application service registrations
        services.AddScoped<ICacheService, RedisCacheService>();
        services.AddScoped<ICommentRepository, CommentRepository>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<ICaptchaService, CaptchaService>();
        services.AddSingleton<IHtmlSanitizer, CommentHtmlSanitizer>();
        services.AddSingleton<IHtmlTagValidator, HtmlTagValidator>();
        services.AddScoped<ICommentSearchService, ElasticsearchCommentSearchService>();
        services.AddScoped<ICommentNotificationService, CommentNotificationService>();

        // Elasticsearch
        services.AddSingleton<ElasticsearchClient>(sp =>
        {
            var elasticsearchUrl = config.GetConnectionString("Elasticsearch")
                ?? "http://localhost:9200";
            var settings = new ElasticsearchClientSettings(new Uri(elasticsearchUrl))
                .DefaultIndex("comments");
            return new ElasticsearchClient(settings);
        });

        // MassTransit + RabbitMQ
        services.AddMassTransit(bus =>
        {
            bus.AddConsumer<CommentCreatedConsumer>();

            bus.UsingRabbitMq((context, cfg) =>
            {
                var rabbitConnectionString = config.GetConnectionString("RabbitMQ");
                if (string.IsNullOrWhiteSpace(rabbitConnectionString)
                    || !Uri.TryCreate(rabbitConnectionString, UriKind.Absolute, out _))
                {
                    rabbitConnectionString = "amqp://guest:guest@rabbitmq:5672/";
                }
                cfg.Host(new Uri(rabbitConnectionString));
                cfg.ConfigureEndpoints(context);
            });
        });

        // SignalR with Redis backplane
        services.AddSignalR()
            .AddStackExchangeRedis(config.GetConnectionString("Redis") ?? "localhost:6379", options =>
            {
                options.Configuration.ChannelPrefix = RedisChannel.Literal("Comments:");
            });

        return services;
    }
}
