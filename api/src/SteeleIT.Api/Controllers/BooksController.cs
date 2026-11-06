using Microsoft.AspNetCore.Mvc;
using SteeleIT.Api.Contracts;
using SteeleIT.Api.Http;
using SteeleIT.Api.Library;

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
}
