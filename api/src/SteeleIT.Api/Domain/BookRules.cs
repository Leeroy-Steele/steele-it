namespace SteeleIT.Api.Domain;

/// <summary>A book's fields after validation and normalisation.</summary>
public sealed record BookFields(string Title, string? Description);

/// <summary>Pure validation and normalisation of book input.</summary>
public static class BookRules
{
    /// <summary>
    /// Title trimmed, required, at most ValidationLimits.TitleMaxLength.
    /// Description trimmed, at most ValidationLimits.DescriptionMaxLength, blank becomes null.
    /// </summary>
    public static RuleResult<BookFields> Validate(string? title, string? description)
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

        var trimmedDescription = description?.Trim();
        if (string.IsNullOrEmpty(trimmedDescription))
        {
            trimmedDescription = null;
        }
        else if (trimmedDescription.Length > ValidationLimits.DescriptionMaxLength)
        {
            errors["description"] =
            [
                $"Description can be at most {ValidationLimits.DescriptionMaxLength} characters.",
            ];
        }

        if (errors.Count > 0)
        {
            return new RuleResult<BookFields>(errors);
        }

        return new RuleResult<BookFields>(new BookFields(trimmedTitle, trimmedDescription));
    }
}
