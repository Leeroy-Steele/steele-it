using SteeleIT.Api.Repository.Models;

namespace SteeleIT.Api.Domain;

/// <summary>
/// Pure rules for a book's contents. Every change builds the whole candidate list and runs
/// <see cref="Validate"/> on it, so there are no special cases.
/// </summary>
public static class OutlineRules
{
    /// <summary>
    /// Rule 1: the first entry is level 1. Rule 2: every level is at least 1 and at most one
    /// deeper than the entry before it. Returns an empty dictionary when valid.
    /// </summary>
    public static Dictionary<string, string[]> Validate(IReadOnlyList<Reference> contents)
    {
        for (var i = 0; i < contents.Count; i++)
        {
            var level = contents[i].Level;

            if (level < 1)
            {
                return LevelError("Level must be at least 1.");
            }

            if (i == 0 && level != 1)
            {
                return LevelError("The first entry must be level 1.");
            }

            if (i > 0)
            {
                var maxLevel = contents[i - 1].Level + 1;
                if (level > maxLevel)
                {
                    return LevelError(
                        $"Level can be at most {maxLevel} here: one deeper than the entry before it."
                    );
                }
            }
        }

        return [];
    }

    /// <summary>
    /// Inserts <paramref name="newRef"/> at the 1-based <paramref name="position"/>, or appends
    /// when it is null. The whole resulting list must pass <see cref="Validate"/>.
    /// </summary>
    public static RuleResult<IReadOnlyList<Reference>> Insert(
        IReadOnlyList<Reference> contents,
        Reference newRef,
        int? position
    )
    {
        var maxPosition = contents.Count + 1;
        var target = position ?? maxPosition;

        if (target < 1 || target > maxPosition)
        {
            return new RuleResult<IReadOnlyList<Reference>>(
                new Dictionary<string, string[]>
                {
                    ["position"] = [$"Position must be between 1 and {maxPosition}."],
                }
            );
        }

        var candidate = new List<Reference>(contents);
        candidate.Insert(target - 1, newRef);

        return Checked(candidate);
    }

    /// <summary>
    /// The unbroken run of entries straight after the given entry with a deeper level.
    /// </summary>
    public static IReadOnlyList<Reference> DescendantsOf(
        IReadOnlyList<Reference> contents,
        int referenceId
    )
    {
        var index = IndexOf(contents, referenceId);
        var level = contents[index].Level;
        var descendants = new List<Reference>();

        for (var i = index + 1; i < contents.Count && contents[i].Level > level; i++)
        {
            descendants.Add(contents[i]);
        }

        return descendants;
    }

    /// <summary>
    /// Removes the entry and its descendants as one unit. Validated as a safety net; removing
    /// a whole subtree always leaves a valid outline.
    /// </summary>
    public static RuleResult<IReadOnlyList<Reference>> RemoveWithDescendants(
        IReadOnlyList<Reference> contents,
        int referenceId
    )
    {
        var index = IndexOf(contents, referenceId);
        var removeCount = 1 + DescendantsOf(contents, referenceId).Count;

        var candidate = new List<Reference>(contents);
        candidate.RemoveRange(index, removeCount);

        return Checked(candidate);
    }

    /// <summary>
    /// The nearest earlier entry with a lower level than the entry at the 0-based
    /// <paramref name="index"/>, or null for a top-level entry.
    /// </summary>
    public static Reference? ParentOf(IReadOnlyList<Reference> contents, int index)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(index);
        ArgumentOutOfRangeException.ThrowIfGreaterThanOrEqual(index, contents.Count);

        var level = contents[index].Level;
        for (var i = index - 1; i >= 0; i--)
        {
            if (contents[i].Level < level)
            {
                return contents[i];
            }
        }

        return null;
    }

    private static RuleResult<IReadOnlyList<Reference>> Checked(List<Reference> candidate)
    {
        var errors = Validate(candidate);
        if (errors.Count > 0)
        {
            return new RuleResult<IReadOnlyList<Reference>>(errors);
        }

        return new RuleResult<IReadOnlyList<Reference>>(candidate.AsReadOnly());
    }

    private static int IndexOf(IReadOnlyList<Reference> contents, int referenceId)
    {
        for (var i = 0; i < contents.Count; i++)
        {
            if (contents[i].ReferenceId == referenceId)
            {
                return i;
            }
        }

        throw new ArgumentException(
            $"Reference {referenceId} is not in this book's contents.",
            nameof(referenceId)
        );
    }

    private static Dictionary<string, string[]> LevelError(string message)
    {
        return new Dictionary<string, string[]> { ["level"] = [message] };
    }
}
