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
    private int _nextReferenceId;

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
        _nextReferenceId = Seed.NextReferenceId;
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

    /// <summary>
    /// Adds a reference to the topic at the 1-based position, or at the end when position is null.
    /// A wrong topicId or level is a body error (Invalid), not a missing URL. Returns the updated
    /// book, because the positions of later entries change.
    /// </summary>
    public Result<BookView> AddReference(int bookId, int? topicId, int? level, int? position)
    {
        lock (_lock)
        {
            if (!_books.TryGetValue(bookId, out var book))
            {
                return new Result<BookView>.NotFound();
            }

            var errors = new Dictionary<string, string[]>();
            if (topicId is null)
            {
                errors["topicId"] = ["Topic id is required."];
            }
            else if (!_topics.ContainsKey(topicId.Value))
            {
                errors["topicId"] = [$"Topic {topicId} does not exist."];
            }

            if (level is null)
            {
                errors["level"] = ["Level is required."];
            }

            if (errors.Count > 0)
            {
                return new Result<BookView>.Invalid(errors);
            }

            var reference = new Reference(_nextReferenceId, topicId!.Value, level!.Value);
            var inserted = OutlineRules.Insert(book.Contents, reference, position);
            if (!inserted.IsValid)
            {
                return new Result<BookView>.Invalid(inserted.Errors);
            }

            var updated = book with { Contents = inserted.Value! };
            _books[bookId] = updated;
            _nextReferenceId++;

            return new Result<BookView>.Ok(ToView(updated));
        }
    }

    /// <summary>
    /// Removes a reference from a book. An entry with descendants is only removed, together with
    /// them, when cascade is true; otherwise nothing changes and the descendants are listed.
    /// A reference that belongs to another book is NotFound. Topics are never deleted.
    /// </summary>
    public Result<BookView> RemoveReference(int bookId, int referenceId, bool cascade)
    {
        lock (_lock)
        {
            if (
                !_books.TryGetValue(bookId, out var book)
                || book.Contents.All(r => r.ReferenceId != referenceId)
            )
            {
                return new Result<BookView>.NotFound();
            }

            var descendants = OutlineRules.DescendantsOf(book.Contents, referenceId);
            if (descendants.Count > 0 && !cascade)
            {
                var ids = descendants.Select(r => r.ReferenceId).ToHashSet();
                var listed = ToView(book)
                    .Contents.Where(e => ids.Contains(e.ReferenceId))
                    .ToArray();

                return new Result<BookView>.HasDependents(
                    "This entry has entries indented beneath it",
                    "descendants",
                    listed
                );
            }

            var removed = OutlineRules.RemoveWithDescendants(book.Contents, referenceId);
            if (!removed.IsValid)
            {
                return new Result<BookView>.Invalid(removed.Errors);
            }

            var updated = book with { Contents = removed.Value! };
            _books[bookId] = updated;

            return new Result<BookView>.Ok(ToView(updated));
        }
    }

    /// <summary>
    /// Every reference to the topic, grouped by book. Books are ordered by id and references by
    /// position. A topic that exists but is unused is Ok with zero counts and no books.
    /// </summary>
    public Result<TopicUsageView> GetUsage(int topicId)
    {
        lock (_lock)
        {
            if (!_topics.TryGetValue(topicId, out var topic))
            {
                return new Result<TopicUsageView>.NotFound();
            }

            var books = new List<BookUsageView>();
            foreach (var book in _books.Values.OrderBy(b => b.Id))
            {
                var references = new List<ReferenceUsageView>();
                for (var index = 0; index < book.Contents.Count; index++)
                {
                    var reference = book.Contents[index];
                    if (reference.TopicId != topicId)
                    {
                        continue;
                    }

                    var parent = OutlineRules.ParentOf(book.Contents, index);
                    references.Add(
                        new ReferenceUsageView(
                            reference.ReferenceId,
                            reference.Level,
                            index + 1,
                            parent is null ? null : _topics[parent.TopicId].Title
                        )
                    );
                }

                if (references.Count > 0)
                {
                    books.Add(new BookUsageView(book.Id, book.Title, references));
                }
            }

            return new Result<TopicUsageView>.Ok(
                new TopicUsageView(
                    topic.Id,
                    topic.Title,
                    books.Sum(b => b.References.Count),
                    books.Count,
                    books
                )
            );
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
