namespace SteeleIT.Api.Domain;

/// <summary>A book owns an ordered outline of references to topics.</summary>
public sealed record Book(
    int Id,
    string Title,
    string? Description,
    DateTimeOffset Created,
    IReadOnlyList<Reference> Contents
);
