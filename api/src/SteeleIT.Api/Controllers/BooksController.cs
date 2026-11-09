using Microsoft.AspNetCore.Mvc;
using SteeleIT.Api.Repository.Models.DTOs;
using SteeleIT.Api.Services;

namespace SteeleIT.Api.Controllers;

[ApiController]
[Route("books")]
public sealed class BooksController(LibraryService library) : ControllerBase
{
    /// <summary>Lists every book with its basic properties, without contents.</summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<BookSummaryResponse>>(StatusCodes.Status200OK)]
    public IActionResult List()
    {
        return Ok(library.ListBooks().Select(BookSummaryResponse.From).ToArray());
    }

    /// <summary>Gets one book with its contents in order.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType<BookResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(
        StatusCodes.Status404NotFound,
        "application/problem+json"
    )]
    public IActionResult Get(int id)
    {
        return ResultMapping.ToActionResult(
            this,
            library.GetBook(id),
            book =>
            {
                return Ok(BookResponse.From(book));
            }
        );
    }

    /// <summary>Creates a book with empty contents.</summary>
    [HttpPost]
    [ProducesResponseType<BookResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(
        StatusCodes.Status400BadRequest,
        "application/problem+json"
    )]
    public IActionResult Create(BookRequest request)
    {
        return ResultMapping.ToActionResult(
            this,
            library.CreateBook(request.Title, request.Description),
            book =>
            {
                return CreatedAtAction(nameof(Get), new { id = book.Id }, BookResponse.From(book));
            }
        );
    }

    /// <summary>
    /// Adds a topic to a book's contents at a position (appended when omitted) and returns the
    /// updated book, because later entries' positions change.
    /// </summary>
    [HttpPost("{id:int}/references")]
    [ProducesResponseType<BookResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(
        StatusCodes.Status400BadRequest,
        "application/problem+json"
    )]
    [ProducesResponseType<ProblemDetails>(
        StatusCodes.Status404NotFound,
        "application/problem+json"
    )]
    public IActionResult AddReference(int id, AddReferenceRequest request)
    {
        return ResultMapping.ToActionResult(
            this,
            library.AddReference(id, request.TopicId, request.Level, request.Position),
            book =>
            {
                return CreatedAtAction(nameof(Get), new { id = book.Id }, BookResponse.From(book));
            }
        );
    }

    /// <summary>
    /// Removes an entry from a book. An entry with entries indented beneath it returns 409 listing
    /// them, unless cascade=true, which removes it and them. Topics are never deleted.
    /// </summary>
    [HttpDelete("{id:int}/references/{referenceId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(
        StatusCodes.Status404NotFound,
        "application/problem+json"
    )]
    [ProducesResponseType<ProblemDetails>(
        StatusCodes.Status409Conflict,
        "application/problem+json"
    )]
    public IActionResult RemoveReference(int id, int referenceId, bool cascade = false)
    {
        return ResultMapping.ToActionResult(
            this,
            library.RemoveReference(id, referenceId, cascade),
            _ =>
            {
                return NoContent();
            }
        );
    }
}
