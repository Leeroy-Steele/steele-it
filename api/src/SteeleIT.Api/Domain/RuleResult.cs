namespace SteeleIT.Api.Domain;

/// <summary>
/// Either a value or validation errors keyed by camelCase field name, ready for ValidationProblem.
/// </summary>
public sealed class RuleResult<T>
{
    public RuleResult(T value)
    {
        Value = value;
        Errors = [];
    }

    public RuleResult(Dictionary<string, string[]> errors)
    {
        if (errors.Count == 0)
        {
            throw new ArgumentException(
                "A failed result needs at least one error.",
                nameof(errors)
            );
        }

        Errors = errors;
    }

    /// <summary>The value when <see cref="IsValid"/> is true; otherwise default.</summary>
    public T? Value { get; }

    public Dictionary<string, string[]> Errors { get; }

    public bool IsValid
    {
        get { return Errors.Count == 0; }
    }
}
