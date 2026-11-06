namespace SteeleIT.Api.Domain;

/// <summary>A topic's fields after validation and normalisation.</summary>
public sealed record TopicFields(string Title, string Body, IReadOnlyList<string> Tags);

/// <summary>Pure validation and normalisation of topic input.</summary>
public static class TopicRules
{
    /// <summary>
    /// Title trimmed, required, at most ValidationLimits.TitleMaxLength. Body null becomes "".
    /// Tags null becomes []; each tag trimmed, non-empty, at most ValidationLimits.TagMaxLength,
    /// unique ignoring case. Duplicates are rejected, not removed.
    /// </summary>
    public static RuleResult<TopicFields> Validate(
        string? title,
        string? body,
        IReadOnlyList<string?>? tags
    )
    {
        var errors = new Dictionary<string, string[]>();

        var trimmedTitle = (title ?? "").Trim();
        if (trimmedTitle.Length == 0)
        {
            errors["title"] = ["Title is required."];
        }
        else if (trimmedTitle.Length > ValidationLimits.TitleMaxLength)
        {
            errors["title"] =
            [
                $"Title can be at most {ValidationLimits.TitleMaxLength} characters.",
            ];
        }

        var normalisedTags = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var input = tags ?? [];

        for (var i = 0; i < input.Count; i++)
        {
            var tag = (input[i] ?? "").Trim();
            var key = $"tags[{i}]";

            if (tag.Length == 0)
            {
                errors[key] = ["Tags cannot be empty."];
            }
            else if (tag.Length > ValidationLimits.TagMaxLength)
            {
                errors[key] =
                [
                    $"\"{tag}\" is longer than {ValidationLimits.TagMaxLength} characters.",
                ];
            }
            else if (!seen.Add(tag))
            {
                errors[key] = [$"\"{tag}\" is already a tag on this topic (tags ignore case)."];
            }
            else
            {
                normalisedTags.Add(tag);
            }
        }

        if (errors.Count > 0)
        {
            return new RuleResult<TopicFields>(errors);
        }

        return new RuleResult<TopicFields>(
            new TopicFields(trimmedTitle, body ?? "", normalisedTags.AsReadOnly())
        );
    }
}
