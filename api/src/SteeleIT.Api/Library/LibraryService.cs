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

    public LibraryService(TimeProvider time)
    {
        _time = time;
        foreach (var topic in Seed.Topics())
        {
            _topics.Add(topic.Id, topic);
        }
        _nextTopicId = Seed.NextTopicId;
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
