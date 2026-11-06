using SteeleIT.Api.Domain;
using SteeleIT.Api.Library;

namespace SteeleIT.Api.Contracts;

/// <summary>
/// Body of POST /books. Properties are nullable on purpose, for the same reason as TopicRequest.
/// </summary>
public sealed record BookRequest(string? Title, string? Description);

/// <summary>A book without its contents, as listed by GET /books.</summary>
public sealed record BookSummaryResponse(
    int Id,
    string Title,
    string? Description,
    DateTimeOffset Created
)
{
    public static BookSummaryResponse From(Book book)
    {
        return new BookSummaryResponse(book.Id, book.Title, book.Description, book.Created);
    }
}

/// <summary>A book with its contents, as returned by GET /books/{id} and POST /books.</summary>
public sealed record BookResponse(
    int Id,
    string Title,
    string? Description,
    DateTimeOffset Created,
    IReadOnlyList<BookEntryResponse> Contents
)
{
    public static BookResponse From(BookView book)
    {
        return new BookResponse(
            book.Id,
            book.Title,
            book.Description,
            book.Created,
            book.Contents.Select(BookEntryResponse.From).ToArray()
        );
    }
}

/// <summary>One entry in a book's contents.</summary>
public sealed record BookEntryResponse(
    int ReferenceId,
    int TopicId,
    string TopicTitle,
    int Level,
    int Position
)
{
    public static BookEntryResponse From(BookEntryView entry)
    {
        return new BookEntryResponse(
            entry.ReferenceId,
            entry.TopicId,
            entry.TopicTitle,
            entry.Level,
            entry.Position
        );
    }
}
