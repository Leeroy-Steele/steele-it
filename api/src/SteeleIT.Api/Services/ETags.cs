using System.Globalization;
using Microsoft.AspNetCore.Mvc;

namespace SteeleIT.Api.Services;

/// <summary>
/// A topic's ETag is its version in quotes, for example "3". PUT must send it back in If-Match.
/// </summary>
public static class ETags
{
    public const string IfMatchKey = "If-Match";

    public static void Set(HttpResponse response, int version)
    {
        response.Headers.ETag = Format(version);
    }

    public static string Format(int version)
    {
        return $"\"{version.ToString(CultureInfo.InvariantCulture)}\"";
    }

    /// <summary>
    /// Reads the expected version from If-Match. A missing header is not an error here:
    /// expectedVersion is null and LibraryService answers 428 once it knows the topic exists,
    /// so an unknown topic still gets 404. A header that is present but is not a quoted
    /// non-negative integer is malformed: returns false with a 400 keyed "If-Match" in error.
    /// </summary>
    public static bool TryReadIfMatch(
        ControllerBase controller,
        string? ifMatch,
        out int? expectedVersion,
        out IActionResult? error
    )
    {
        expectedVersion = null;
        error = null;

        if (string.IsNullOrWhiteSpace(ifMatch))
        {
            return true;
        }

        var value = ifMatch.Trim();
        if (
            value.Length > 2
            && value[0] == '"'
            && value[^1] == '"'
            && int.TryParse(
                value.AsSpan(1, value.Length - 2),
                NumberStyles.None,
                CultureInfo.InvariantCulture,
                out var version
            )
        )
        {
            expectedVersion = version;
            return true;
        }

        error = ResultMapping.ValidationProblem(
            controller,
            new Dictionary<string, string[]>
            {
                [IfMatchKey] = ["If-Match must be a quoted version, for example \"3\"."],
            }
        );
        return false;
    }
}
