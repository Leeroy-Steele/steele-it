namespace SteeleIT.Api.Domain;

/// <summary>A reusable piece of content that books refer to.</summary>
public sealed record Topic(
    int Id,
    string Title,
    string Body,
    IReadOnlyList<string> Tags,
    DateTimeOffset Created,
    DateTimeOffset Updated,
    int Version
);
