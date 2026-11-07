using SteeleIT.Api.Domain;
using SteeleIT.Api.Library;

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

/// <summary>Where a topic is used, as returned by GET /topics/{id}/usage.</summary>
public sealed record TopicUsageResponse(
    int Id,
    string Title,
    int TotalReferences,
    int BookCount,
    IReadOnlyList<BookUsageResponse> Books
)
{
    public static TopicUsageResponse From(TopicUsageView usage)
    {
        return new TopicUsageResponse(
            usage.Id,
            usage.Title,
            usage.TotalReferences,
            usage.BookCount,
            usage.Books.Select(BookUsageResponse.From).ToArray()
        );
    }
}

/// <summary>The references to a topic within one book.</summary>
public sealed record BookUsageResponse(
    int BookId,
    string BookTitle,
    IReadOnlyList<ReferenceUsageResponse> References
)
{
    public static BookUsageResponse From(BookUsageView book)
    {
        return new BookUsageResponse(
            book.BookId,
            book.BookTitle,
            book.References.Select(ReferenceUsageResponse.From).ToArray()
        );
    }
}

/// <summary>One use of a topic. ParentTopicTitle is null at level 1.</summary>
public sealed record ReferenceUsageResponse(
    int ReferenceId,
    int Level,
    int Position,
    string? ParentTopicTitle
)
{
    public static ReferenceUsageResponse From(ReferenceUsageView reference)
    {
        return new ReferenceUsageResponse(
            reference.ReferenceId,
            reference.Level,
            reference.Position,
            reference.ParentTopicTitle
        );
    }
}
