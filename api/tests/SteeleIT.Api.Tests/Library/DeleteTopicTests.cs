using SteeleIT.Api.Domain;
using SteeleIT.Api.Library;

namespace SteeleIT.Api.Tests.Library;

public class DeleteTopicTests
{
    // Deleting shared content silently changes every book that uses it, so a used topic must
    // survive the attempt, and the refusal must name each book so the author can fix them.
    [Fact]
    public void ReferencedTopic_IsNotDeleted_AndTheBooksAreListed()
    {
        var library = new LibraryService(TimeProvider.System);

        // Seeded topic 3 is used twice in Administrator Guide (3) and once in Getting Started (1).
        var result = library.DeleteTopic(3);

        var dependents = Assert.IsType<Result<Topic>.HasDependents>(result);
        Assert.Equal("books", dependents.Name);
        Assert.Equal(
            [
                new TopicBookReferenceCount(1, "Getting Started Guide", 1),
                new TopicBookReferenceCount(3, "Administrator Guide", 2),
            ],
            (TopicBookReferenceCount[])dependents.Details
        );
        Assert.IsType<Result<Topic>.Ok>(library.GetTopic(3));
    }

    // An unused topic is the only kind that may go, and it must really be gone afterwards.
    [Fact]
    public void UnusedTopic_IsDeleted()
    {
        var library = new LibraryService(TimeProvider.System);
        var created = (Result<Topic>.Ok)library.CreateTopic("Spare", "", []);

        var result = library.DeleteTopic(created.Value.Id);

        Assert.IsType<Result<Topic>.Ok>(result);
        Assert.IsType<Result<Topic>.NotFound>(library.GetTopic(created.Value.Id));
        Assert.IsType<Result<Topic>.NotFound>(library.DeleteTopic(created.Value.Id));
    }
}
