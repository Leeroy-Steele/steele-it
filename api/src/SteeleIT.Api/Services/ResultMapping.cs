using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using SteeleIT.Api.Models;

namespace SteeleIT.Api.Services;

/// <summary>The one place that turns a library Result into an HTTP response.</summary>
public static class ResultMapping
{
    public static IActionResult ToActionResult<T>(
        ControllerBase controller,
        Result<T> result,
        Func<T, IActionResult> onOk
    )
    {
        switch (result)
        {
            case Result<T>.Ok ok:
                return onOk(ok.Value);
            case Result<T>.NotFound:
                return controller.Problem(statusCode: StatusCodes.Status404NotFound);
            case Result<T>.Invalid invalid:
                return ValidationProblem(controller, invalid.Errors);
            case Result<T>.PreconditionRequired:
                return controller.Problem(
                    statusCode: StatusCodes.Status428PreconditionRequired,
                    title: "An If-Match header is required.",
                    detail: "Send If-Match with the ETag of the version you loaded, for example \"3\"."
                );
            case Result<T>.Stale stale:
                return ProblemWithExtension(
                    controller,
                    StatusCodes.Status412PreconditionFailed,
                    "This topic has changed since you loaded it.",
                    "currentVersion",
                    stale.CurrentVersion
                );
            case Result<T>.HasDependents dependents:
                return ProblemWithExtension(
                    controller,
                    StatusCodes.Status409Conflict,
                    dependents.Title,
                    dependents.Name,
                    dependents.Details
                );
            default:
                throw new InvalidOperationException($"Unmapped result {result.GetType().Name}.");
        }
    }

    /// <summary>A 400 ValidationProblemDetails with the keys exactly as given.</summary>
    public static IActionResult ValidationProblem(
        ControllerBase controller,
        IReadOnlyDictionary<string, string[]> errors
    )
    {
        var modelState = new ModelStateDictionary();
        foreach (var (key, messages) in errors)
        {
            foreach (var message in messages)
            {
                modelState.AddModelError(key, message);
            }
        }

        return controller.ValidationProblem(modelState);
    }

    /// <summary>
    /// Built with controller.Problem like every other error, so it is sent as
    /// application/problem+json, then given one extra member.
    /// </summary>
    private static ObjectResult ProblemWithExtension(
        ControllerBase controller,
        int statusCode,
        string? title,
        string extensionName,
        object extensionValue
    )
    {
        var result = controller.Problem(statusCode: statusCode, title: title);
        var problem = (ProblemDetails)result.Value!;
        problem.Extensions[extensionName] = extensionValue;

        return result;
    }
}
