using SteeleIT.Api.Domain;

namespace SteeleIT.Api.Library;

/// <summary>The seed data from docs/spec.md. Books are added in C4.</summary>
public static class Seed
{
    public const int NextTopicId = 6;

    /// <summary>All seeds share one fixed timestamp so responses are predictable.</summary>
    public static readonly DateTimeOffset SeededAt = new(2026, 11, 6, 0, 0, 0, TimeSpan.Zero);

    public static IReadOnlyList<Topic> Topics()
    {
        return
        [
            NewTopic(
                1,
                "Introduction to Author-it",
                "An overview of Author-it and how topics are reused across books.",
                ["overview", "getting-started"]
            ),
            NewTopic(
                2,
                "Installing the Desktop Client",
                "Download the installer and run it on a supported version of Windows.",
                ["installation", "windows", "desktop"]
            ),
            NewTopic(
                3,
                "Connecting to a Library",
                "Point the desktop client at your library server and sign in.",
                ["setup", "library", "configuration"]
            ),
            NewTopic(
                4,
                "Creating Your First Topic",
                "Create a topic, give it a title and write its body. Save it to the library.",
                ["authoring", "topics", "beginner"]
            ),
            NewTopic(
                5,
                "Publishing to PDF",
                "Choose a book and publish it as a PDF using the default template.",
                ["publishing", "output", "pdf"]
            ),
        ];
    }

    private static Topic NewTopic(int id, string title, string body, string[] tags)
    {
        return new Topic(id, title, body, tags.AsReadOnly(), SeededAt, SeededAt, 1);
    }
}
