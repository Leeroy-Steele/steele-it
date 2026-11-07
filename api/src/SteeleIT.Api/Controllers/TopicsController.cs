using Microsoft.AspNetCore.Mvc;
using SteeleIT.Api.Contracts;
using SteeleIT.Api.Http;
using SteeleIT.Api.Library;

namespace SteeleIT.Api.Controllers;

[ApiController]
[Route("topics")]
public sealed class TopicsController(LibraryService library) : ControllerBase
{
    /// <summary>Lists every topic.</summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<TopicResponse>>(StatusCodes.Status200OK)]
    public IActionResult List()
    {
        return Ok(library.ListTopics().Select(TopicResponse.From).ToArray());
    }

    /// <summary>Gets one topic. The ETag header carries its version.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType<TopicResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(
        StatusCodes.Status404NotFound,
        "application/problem+json"
    )]
    public IActionResult Get(int id)
    {
        return ResultMapping.ToActionResult(
            this,
            library.GetTopic(id),
            topic =>
            {
                ETags.Set(Response, topic.Version);
                return Ok(TopicResponse.From(topic));
            }
        );
    }

    /// <summary>
    /// Shows every book and position where the topic is used. An unused topic returns zero counts.
    /// </summary>
    [HttpGet("{id:int}/usage")]
    [ProducesResponseType<TopicUsageResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(
        StatusCodes.Status404NotFound,
        "application/problem+json"
    )]
    public IActionResult GetUsage(int id)
    {
        return ResultMapping.ToActionResult(
            this,
            library.GetUsage(id),
            usage =>
            {
                return Ok(TopicUsageResponse.From(usage));
            }
        );
    }

    /// <summary>Creates a topic at version 1.</summary>
    [HttpPost]
    [ProducesResponseType<TopicResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(
        StatusCodes.Status400BadRequest,
        "application/problem+json"
    )]
    public IActionResult Create(TopicRequest request)
    {
        return ResultMapping.ToActionResult(
            this,
            library.CreateTopic(request.Title, request.Body, request.Tags),
            topic =>
            {
                ETags.Set(Response, topic.Version);
                return CreatedAtAction(
                    nameof(Get),
                    new { id = topic.Id },
                    TopicResponse.From(topic)
                );
            }
        );
    }

    /// <summary>
    /// Replaces a topic's title, body and tags. If-Match must hold the version the client loaded;
    /// a stale version gets 412 with currentVersion and changes nothing.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType<TopicResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(
        StatusCodes.Status400BadRequest,
        "application/problem+json"
    )]
    [ProducesResponseType<ProblemDetails>(
        StatusCodes.Status404NotFound,
        "application/problem+json"
    )]
    [ProducesResponseType<ProblemDetails>(
        StatusCodes.Status412PreconditionFailed,
        "application/problem+json"
    )]
    [ProducesResponseType<ProblemDetails>(
        StatusCodes.Status428PreconditionRequired,
        "application/problem+json"
    )]
    public IActionResult Update(
        int id,
        TopicRequest request,
        [FromHeader(Name = "If-Match")] string? ifMatch
    )
    {
        if (!ETags.TryReadIfMatch(this, ifMatch, out var expectedVersion, out var error))
        {
            return error!;
        }

        return ResultMapping.ToActionResult(
            this,
            library.UpdateTopic(id, expectedVersion, request.Title, request.Body, request.Tags),
            topic =>
            {
                ETags.Set(Response, topic.Version);
                return Ok(TopicResponse.From(topic));
            }
        );
    }
}
