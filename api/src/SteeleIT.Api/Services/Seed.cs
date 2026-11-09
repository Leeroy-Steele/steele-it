using SteeleIT.Api.Repository.Models;

namespace SteeleIT.Api.Services;

/// <summary>The seed data from docs/spec.md.</summary>
public static class Seed
{
    public const int NextTopicId = 6;
    public const int NextBookId = 4;
    public const int NextReferenceId = 12;

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

    /// <summary>The three books. Reference ids run 1-11 across them, in order.</summary>
    public static IReadOnlyList<Book> Books()
    {
        return
        [
            NewBook(
                1,
                "Getting Started Guide",
                [new(1, 1, 1), new(2, 2, 1), new(3, 3, 2), new(4, 4, 1)]
            ),
            NewBook(2, "Publishing Handbook", [new(5, 1, 1), new(6, 5, 1), new(7, 4, 2)]),
            NewBook(
                3,
                "Administrator Guide",
                [new(8, 2, 1), new(9, 3, 2), new(10, 5, 1), new(11, 3, 2)]
            ),
        ];
    }

    private static Book NewBook(int id, string title, Reference[] contents)
    {
        return new Book(id, title, null, SeededAt, contents.AsReadOnly());
    }

    private static Topic NewTopic(int id, string title, string body, string[] tags)
    {
        return new Topic(id, title, body, tags.AsReadOnly(), SeededAt, SeededAt, 1);
    }
}
