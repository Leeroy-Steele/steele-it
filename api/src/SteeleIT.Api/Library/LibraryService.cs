using SteeleIT.Api.Domain;

namespace SteeleIT.Api.Library;

/// <summary>
/// Owns all library state. Every public method, reads included, runs entirely inside one lock:
/// validate, check version, mutate, stamp. Only immutable records leave this class.
/// </summary>
public sealed class LibraryService
{
    private readonly Lock _lock = new();
    private readonly TimeProvider _time;
    private readonly Dictionary<int, Topic> _topics = [];
    private int _nextTopicId;
    private readonly Dictionary<int, Book> _books = [];
    private int _nextBookId;

    public LibraryService(TimeProvider time)
    {
        _time = time;
        foreach (var topic in Seed.Topics())
        {
            _topics.Add(topic.Id, topic);
        }
        _nextTopicId = Seed.NextTopicId;
        foreach (var book in Seed.Books())
        {
            _books.Add(book.Id, book);
        }
        _nextBookId = Seed.NextBookId;
    }

    /// <summary>All books, ordered by id. Contents are not part of the list.</summary>
    public IReadOnlyList<Book> ListBooks()
    {
        lock (_lock)
        {
            return _books.Values.OrderBy(b => b.Id).ToArray();
        }
    }

    public Result<BookView> GetBook(int id)
    {
        lock (_lock)
        {
            if (!_books.TryGetValue(id, out var book))
            {
                return new Result<BookView>.NotFound();
            }

            return new Result<BookView>.Ok(ToView(book));
        }
    }

    /// <summary>Creates a book with empty contents.</summary>
    public Result<BookView> CreateBook(string? title, string? description)
    {
        lock (_lock)
        {
            var fields = BookRules.Validate(title, description);
            if (!fields.IsValid)
            {
                return new Result<BookView>.Invalid(fields.Errors);
            }

            var book = new Book(
                _nextBookId,
                fields.Value!.Title,
                fields.Value.Description,
                _time.GetUtcNow(),
                []
            );
            _books.Add(book.Id, book);
            _nextBookId++;

            return new Result<BookView>.Ok(ToView(book));
        }
    }

    /// <summary>Fills in position and topic title. Callers must hold the lock.</summary>
    private BookView ToView(Book book)
    {
        var contents = book
            .Contents.Select(
                (reference, index) =>
                    new BookEntryView(
                        reference.ReferenceId,
                        reference.TopicId,
                        _topics[reference.TopicId].Title,
                        reference.Level,
                        index + 1
                    )
            )
            .ToArray();

        return new BookView(book.Id, book.Title, book.Description, book.Created, contents);
    }

    /// <summary>All topics, ordered by id.</summary>
    public IReadOnlyList<Topic> ListTopics()
    {
        lock (_lock)
        {
            return _topics.Values.OrderBy(t => t.Id).ToArray();
        }
    }

    public Result<Topic> GetTopic(int id)
    {
        lock (_lock)
        {
            if (!_topics.TryGetValue(id, out var topic))
            {
                return new Result<Topic>.NotFound();
            }

            return new Result<Topic>.Ok(topic);
        }
    }

    public Result<Topic> CreateTopic(string? title, string? body, IReadOnlyList<string?>? tags)
    {
        lock (_lock)
        {
            var fields = TopicRules.Validate(title, body, tags);
            if (!fields.IsValid)
            {
                return new Result<Topic>.Invalid(fields.Errors);
            }

            var now = _time.GetUtcNow();
            var topic = new Topic(
                _nextTopicId,
                fields.Value!.Title,
                fields.Value.Body,
                fields.Value.Tags,
                now,
                now,
                1
            );
            _topics.Add(topic.Id, topic);
            _nextTopicId++;

            return new Result<Topic>.Ok(topic);
        }
    }

    /// <summary>
    /// Applies the update only when expectedVersion is the current version. Checks run in HTTP's
    /// order (RFC 9110 section 13.2.1): the topic must exist, then the precondition is checked
    /// (missing gives PreconditionRequired, out of date gives Stale), and only then is the body
    /// validated. Any failure changes nothing. A successful update increments the version.
    /// </summary>
    public Result<Topic> UpdateTopic(
        int id,
        int? expectedVersion,
        string? title,
        string? body,
        IReadOnlyList<string?>? tags
    )
    {
        lock (_lock)
        {
            if (!_topics.TryGetValue(id, out var current))
            {
                return new Result<Topic>.NotFound();
            }

            if (expectedVersion is null)
            {
                return new Result<Topic>.PreconditionRequired();
            }

            if (current.Version != expectedVersion)
            {
                return new Result<Topic>.Stale(current.Version);
            }

            var fields = TopicRules.Validate(title, body, tags);
            if (!fields.IsValid)
            {
                return new Result<Topic>.Invalid(fields.Errors);
            }

            var updated = current with
            {
                Title = fields.Value!.Title,
                Body = fields.Value.Body,
                Tags = fields.Value.Tags,
                Updated = _time.GetUtcNow(),
                Version = current.Version + 1,
            };
            _topics[id] = updated;

            return new Result<Topic>.Ok(updated);
        }
    }
}
