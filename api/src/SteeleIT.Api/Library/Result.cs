namespace SteeleIT.Api.Library;

/// <summary>
/// The outcome of a library operation. A closed set: expected failures are values, not exceptions.
/// Http/ResultMapping is the one place that turns these into HTTP responses.
/// </summary>
public abstract record Result<T>
{
    private Result() { }

    /// <summary>The operation succeeded.</summary>
    public sealed record Ok(T Value) : Result<T>;

    /// <summary>The thing addressed does not exist.</summary>
    public sealed record NotFound : Result<T>;

    /// <summary>The input broke a rule. Errors are keyed by camelCase field name.</summary>
    public sealed record Invalid(IReadOnlyDictionary<string, string[]> Errors) : Result<T>;

    /// <summary>
    /// The write needs the caller's expected version (If-Match) and none was sent. Nothing was
    /// changed.
    /// </summary>
    public sealed record PreconditionRequired : Result<T>;

    /// <summary>The caller's expected version is out of date. Nothing was changed.</summary>
    public sealed record Stale(int CurrentVersion) : Result<T>;

    /// <summary>
    /// Other entries depend on the target, so nothing was changed. Title is the problem details
    /// title; Name is the extension the dependents are reported under (for example "descendants"
    /// or "books").
    /// </summary>
    public sealed record HasDependents(string Title, string Name, object Details) : Result<T>;
}
