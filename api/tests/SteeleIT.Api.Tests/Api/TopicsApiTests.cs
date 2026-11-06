using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace SteeleIT.Api.Tests.Api;

// Each test builds its own factory: the library is an in-memory singleton, so a shared factory
// would let one test's writes change another test's starting state.
public class TopicsApiTests
{
    // Optimistic concurrency is the guard against two authors silently overwriting each other.
    // A save based on an old version must be refused and must leave the newer save intact.
    [Fact]
    public async Task StaleUpdate_IsRejected_AndChangesNothing()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        var first = await PutTopic(
            client,
            1,
            "\"1\"",
            new
            {
                title = "First edit",
                body = "Saved first.",
                tags = new List<string> { "one" },
            }
        );
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal("\"2\"", first.Headers.ETag?.Tag);
        using (var body = await ReadJson(first))
        {
            Assert.Equal(2, body.RootElement.GetProperty("version").GetInt32());
        }

        var stale = await PutTopic(
            client,
            1,
            "\"1\"",
            new
            {
                title = "Second edit",
                body = "Based on version 1.",
                tags = new List<string> { "two" },
            }
        );
        Assert.Equal(HttpStatusCode.PreconditionFailed, stale.StatusCode);
        Assert.Equal("application/problem+json", stale.Content.Headers.ContentType?.MediaType);
        using (var problem = await ReadJson(stale))
        {
            Assert.Equal(2, problem.RootElement.GetProperty("currentVersion").GetInt32());
        }

        var current = await client.GetAsync("/topics/1");
        Assert.Equal(HttpStatusCode.OK, current.StatusCode);
        Assert.Equal("\"2\"", current.Headers.ETag?.Tag);
        using var topic = await ReadJson(current);
        Assert.Equal("First edit", topic.RootElement.GetProperty("title").GetString());
        Assert.Equal("Saved first.", topic.RootElement.GetProperty("body").GetString());
        Assert.Equal(
            ["one"],
            topic.RootElement.GetProperty("tags").EnumerateArray().Select(t => t.GetString())
        );
        Assert.Equal(2, topic.RootElement.GetProperty("version").GetInt32());
    }

    // The editor maps each error key straight onto a form field or tag chip, so the keys must be
    // the camelCase wire names (with tags[i] pointing at the exact chip), not C# property names.
    [Fact]
    public async Task ValidationErrors_AreKeyedByCamelCaseFieldName()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/topics",
            new { title = "", tags = new List<string> { "a", "A", "" } }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var problem = await ReadJson(response);
        var keys = problem
            .RootElement.GetProperty("errors")
            .EnumerateObject()
            .Select(p => p.Name)
            .Order(StringComparer.Ordinal);
        Assert.Equal(["tags[1]", "tags[2]", "title"], keys);
    }

    private static async Task<HttpResponseMessage> PutTopic(
        HttpClient client,
        int id,
        string ifMatch,
        object body
    )
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, $"/topics/{id}")
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.TryAddWithoutValidation("If-Match", ifMatch);
        return await client.SendAsync(request);
    }

    private static async Task<JsonDocument> ReadJson(HttpResponseMessage response)
    {
        return await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
    }
}
