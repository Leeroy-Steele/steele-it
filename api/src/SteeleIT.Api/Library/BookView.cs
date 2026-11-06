namespace SteeleIT.Api.Library;

/// <summary>
/// A book as read from the library, with the derived fields filled in. Built inside the lock so
/// topic titles and positions are consistent with the books and topics at that moment.
/// </summary>
public sealed record BookView(
    int Id,
    string Title,
    string? Description,
    DateTimeOffset Created,
    IReadOnlyList<BookEntryView> Contents
);

/// <summary>One entry of a book's contents. Position is index + 1, TopicTitle is the topic's current title.</summary>
public sealed record BookEntryView(
    int ReferenceId,
    int TopicId,
    string TopicTitle,
    int Level,
    int Position
);
