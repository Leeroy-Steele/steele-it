using SteeleIT.Api.Domain;

namespace SteeleIT.Api.Contracts;

/// <summary>
/// Body of POST /topics and PUT /topics/{id}. Every property is nullable on purpose: non-nullable
/// reference properties make [ApiController] add implicit [Required] errors with PascalCase keys,
/// which would bypass TopicRules and its camelCase error keys.
/// </summary>
public sealed record TopicRequest(string? Title, string? Body, IReadOnlyList<string?>? Tags);

/// <summary>A topic as returned by GET, POST and PUT.</summary>
public sealed record TopicResponse(
    int Id,
    string Title,
    string Body,
    IReadOnlyList<string> Tags,
    DateTimeOffset Created,
    DateTimeOffset Updated,
    int Version
)
{
    public static TopicResponse From(Topic topic)
    {
        return new TopicResponse(
            topic.Id,
            topic.Title,
            topic.Body,
            topic.Tags,
            topic.Created,
            topic.Updated,
            topic.Version
        );
    }
}
