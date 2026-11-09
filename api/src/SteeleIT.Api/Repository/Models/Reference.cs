namespace SteeleIT.Api.Repository.Models;

/// <summary>
/// One entry in a book's contents. Position is not stored: it is the entry's index + 1.
/// </summary>
public sealed record Reference(int ReferenceId, int TopicId, int Level);
