using SteeleIT.Api.Domain;

namespace SteeleIT.Api.Tests.Domain;

public class OutlineRulesTests
{
    // Seed book 3: topics 2, 3, 5, 3 at levels 1, 2, 1, 2 (reference ids 8-11).
    private static readonly IReadOnlyList<Reference> _administratorGuide =
    [
        new Reference(8, 2, 1),
        new Reference(9, 3, 2),
        new Reference(10, 5, 1),
        new Reference(11, 3, 2),
    ];

    // Seed book 1: topics 1, 2, 3, 4 at levels 1, 1, 2, 1 (reference ids 1-4).
    private static readonly IReadOnlyList<Reference> _gettingStarted =
    [
        new Reference(1, 1, 1),
        new Reference(2, 2, 1),
        new Reference(3, 3, 2),
        new Reference(4, 4, 1),
    ];

    private const int NewReferenceId = 99;

    /// <summary>An outline with reference ids 1..n and the given levels.</summary>
    private static List<Reference> Outline(params int[] levels)
    {
        return levels.Select((level, i) => new Reference(i + 1, i + 1, level)).ToList();
    }

    private static int[] Levels(IReadOnlyList<Reference> contents)
    {
        return contents.Select(r => r.Level).ToArray();
    }

    // The book's shape must always form a tree: a first entry that is not level 1, a level that
    // jumps more than one deeper, or a level below 1 would leave an entry with no parent.
    [Theory]
    [InlineData(new int[] { }, true)]
    [InlineData(new[] { 2 }, false)]
    [InlineData(new[] { 1, 2, 3 }, true)]
    [InlineData(new[] { 1, 3 }, false)]
    [InlineData(new[] { 1, 2, 1, 2 }, true)]
    [InlineData(new[] { 1, 0 }, false)]
    public void Validate_EnforcesRulesOneAndTwo(int[] levels, bool expectedValid)
    {
        var errors = OutlineRules.Validate(Outline(levels));

        Assert.Equal(expectedValid, errors.Count == 0);
        if (!expectedValid)
        {
            Assert.Equal(["level"], errors.Keys);
        }
    }

    [Fact]
    public void Validate_TooDeep_SaysHowDeepItCanGo()
    {
        var errors = OutlineRules.Validate(Outline(1, 2, 4));

        Assert.Equal(
            ["Level can be at most 3 here: one deeper than the entry before it."],
            errors["level"]
        );
    }

    [Fact]
    public void Insert_NullPosition_Appends()
    {
        var result = OutlineRules.Insert(Outline(1, 2), new Reference(NewReferenceId, 7, 1), null);

        Assert.True(result.IsValid);
        Assert.Equal(NewReferenceId, result.Value![^1].ReferenceId);
        Assert.Equal(3, result.Value.Count);
    }

    [Fact]
    public void Insert_AtPositionOne_ShiftsOthersDown()
    {
        var original = Outline(1, 2);

        var result = OutlineRules.Insert(original, new Reference(NewReferenceId, 7, 1), 1);

        Assert.True(result.IsValid);
        Assert.Equal([NewReferenceId, 1, 2], result.Value!.Select(r => r.ReferenceId));
        // The input list is never mutated: the caller saves only if the change is valid.
        Assert.Equal([1, 2], original.Select(r => r.ReferenceId));
    }

    // Out-of-range positions are rejected, not clamped, because clamping hides client bugs.
    [Theory]
    [InlineData(0)]
    [InlineData(4)]
    public void Insert_PositionOutOfRange_IsRejected(int position)
    {
        var result = OutlineRules.Insert(
            Outline(1, 2),
            new Reference(NewReferenceId, 7, 1),
            position
        );

        Assert.False(result.IsValid);
        Assert.Equal(["Position must be between 1 and 3."], result.Errors["position"]);
    }

    [Fact]
    public void Insert_LevelTwoAtPositionOne_IsRejected()
    {
        var result = OutlineRules.Insert(Outline(1), new Reference(NewReferenceId, 7, 2), 1);

        Assert.False(result.IsValid);
        Assert.Contains("level", result.Errors.Keys);
    }

    // The new entry is fine on its own; the level-3 entry after it breaks rule 2. This is why
    // Insert validates the whole candidate list instead of just the new entry.
    [Fact]
    public void Insert_BreaksTheFollowingEntry_IsRejected()
    {
        var result = OutlineRules.Insert(Outline(1, 2, 3), new Reference(NewReferenceId, 7, 1), 3);

        Assert.False(result.IsValid);
        Assert.Equal(
            ["Level can be at most 2 here: one deeper than the entry before it."],
            result.Errors["level"]
        );
    }

    [Fact]
    public void Insert_IntoGettingStarted_LevelOneAtPositionThree_IsValid()
    {
        var result = OutlineRules.Insert(_gettingStarted, new Reference(NewReferenceId, 5, 1), 3);

        Assert.True(result.IsValid);
        Assert.Equal([1, 1, 1, 2, 1], Levels(result.Value!));
    }

    // "Beneath it" is the unbroken run of deeper entries straight after it, and stops at the
    // next entry at the same or a shallower level.
    [Theory]
    [InlineData(8, new[] { 9 })]
    [InlineData(9, new int[] { })]
    [InlineData(10, new[] { 11 })]
    public void DescendantsOf_AdministratorGuide(int referenceId, int[] expectedReferenceIds)
    {
        var descendants = OutlineRules.DescendantsOf(_administratorGuide, referenceId);

        Assert.Equal(expectedReferenceIds, descendants.Select(r => r.ReferenceId));
    }

    [Fact]
    public void DescendantsOf_UnknownReference_Throws()
    {
        Assert.Throws<ArgumentException>(() => OutlineRules.DescendantsOf(_administratorGuide, 1));
    }

    // An entry and the entries beneath it are one unit: removing position 1 removes position 2
    // too, and no other entry's level changes.
    [Fact]
    public void RemoveWithDescendants_AdministratorGuidePositionOne_RemovesTheSubtree()
    {
        var result = OutlineRules.RemoveWithDescendants(_administratorGuide, 8);

        Assert.True(result.IsValid);
        var contents = result.Value!;
        Assert.Equal([5, 3], contents.Select(r => r.TopicId));
        Assert.Equal([1, 2], Levels(contents));
        Assert.Empty(OutlineRules.Validate(contents));
    }

    [Fact]
    public void ParentOf_AdministratorGuidePositionFour_IsTopicFive()
    {
        var parent = OutlineRules.ParentOf(_administratorGuide, 3);

        Assert.NotNull(parent);
        Assert.Equal(5, parent.TopicId);
    }

    [Fact]
    public void ParentOf_AdministratorGuidePositionOne_IsNull()
    {
        Assert.Null(OutlineRules.ParentOf(_administratorGuide, 0));
    }
}
