using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace SteeleIT.Api.Tests.Api;

// Each test builds its own factory: the library is an in-memory singleton, so a shared factory
// would let one test's writes change another test's starting state.
public class BooksApiTests
{
    // A body field naming a topic that does not exist is the client's mistake in the request,
    // not a missing URL, so it is a 400 keyed topicId (the form field), and the book is untouched.
    [Fact]
    public async Task AddingReference_ToUnknownTopic_IsRejected()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/books/1/references",
            new { topicId = 999, level = 1 }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using (var problem = await ReadJson(response))
        {
            var messages = problem
                .RootElement.GetProperty("errors")
                .GetProperty("topicId")
                .EnumerateArray()
                .Select(m => m.GetString());
            Assert.Equal(["Topic 999 does not exist."], messages);
        }

        using var book = await ReadJson(await client.GetAsync("/books/1"));
        Assert.Equal(4, book.RootElement.GetProperty("contents").GetArrayLength());
    }

    // Removing a parent silently would destroy the entries beneath it. The author must confirm
    // (cascade=true), and the server lists what would go so the UI never needs its own copy of
    // the descendant logic. Only the entry and its descendants go, and positions close up.
    [Fact]
    public async Task RemovingParent_RequiresCascade_AndRemovesChildren()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        var refused = await client.DeleteAsync("/books/3/references/8");

        Assert.Equal(HttpStatusCode.Conflict, refused.StatusCode);
        Assert.Equal("application/problem+json", refused.Content.Headers.ContentType?.MediaType);
        using (var problem = await ReadJson(refused))
        {
            Assert.Equal(
                "This entry has entries indented beneath it",
                problem.RootElement.GetProperty("title").GetString()
            );
            var descendants = problem.RootElement.GetProperty("descendants").EnumerateArray();
            var only = Assert.Single(descendants);
            Assert.Equal(9, only.GetProperty("referenceId").GetInt32());
            Assert.Equal(3, only.GetProperty("topicId").GetInt32());
            Assert.Equal("Connecting to a Library", only.GetProperty("topicTitle").GetString());
            Assert.Equal(2, only.GetProperty("level").GetInt32());
            Assert.Equal(2, only.GetProperty("position").GetInt32());
        }

        using (var untouched = await ReadJson(await client.GetAsync("/books/3")))
        {
            Assert.Equal(4, untouched.RootElement.GetProperty("contents").GetArrayLength());
        }

        var removed = await client.DeleteAsync("/books/3/references/8?cascade=true");
        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);

        using var book = await ReadJson(await client.GetAsync("/books/3"));
        var contents = book
            .RootElement.GetProperty("contents")
            .EnumerateArray()
            .Select(e =>
                (
                    e.GetProperty("topicTitle").GetString(),
                    e.GetProperty("level").GetInt32(),
                    e.GetProperty("position").GetInt32()
                )
            )
            .ToArray();
        Assert.Equal([("Publishing to PDF", 1, 1), ("Connecting to a Library", 2, 2)], contents);
    }

    private static async Task<JsonDocument> ReadJson(HttpResponseMessage response)
    {
        return await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
    }
}
