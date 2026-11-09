namespace SteeleIT.Api.Repository.Models.QueryTypes;

/// <summary>
/// Every place a topic is used. Built inside the lock so book titles, positions and parent titles
/// are consistent with the books and topics at that moment.
/// </summary>
public sealed record TopicUsageView(
    int Id,
    string Title,
    int TotalReferences,
    int BookCount,
    IReadOnlyList<BookUsageView> Books
);

/// <summary>The references to one topic within one book, ordered by position.</summary>
public sealed record BookUsageView(
    int BookId,
    string BookTitle,
    IReadOnlyList<ReferenceUsageView> References
);

/// <summary>One use of a topic. ParentTopicTitle is null for a level 1 entry.</summary>
public sealed record ReferenceUsageView(
    int ReferenceId,
    int Level,
    int Position,
    string? ParentTopicTitle
);

/// <summary>A book that still references a topic, with how many times. Reported by a refused delete.</summary>
public sealed record TopicBookReferenceCount(int BookId, string BookTitle, int ReferenceCount);
