namespace SteeleIT.Api.Domain;

/// <summary>
/// The length limits from the brief, in one place. The rules and their tests use these
/// constants; the web app mirrors them in web/src/lib/limits.ts as input hints only.
/// </summary>
public static class ValidationLimits
{
    /// <summary>Maximum length of a topic or book title, after trimming.</summary>
    public const int TitleMaxLength = 200;

    /// <summary>Maximum length of one tag, after trimming.</summary>
    public const int TagMaxLength = 50;

    /// <summary>Maximum length of a book description, after trimming.</summary>
    public const int DescriptionMaxLength = 2000;
}
