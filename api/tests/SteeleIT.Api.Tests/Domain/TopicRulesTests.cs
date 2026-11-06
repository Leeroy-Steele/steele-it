using SteeleIT.Api.Domain;

namespace SteeleIT.Api.Tests.Domain;

public class TopicRulesTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void BlankTitle_IsRejected(string? title)
    {
        var result = TopicRules.Validate(title, "body", []);

        Assert.False(result.IsValid);
        Assert.Equal(["Title is required."], result.Errors["title"]);
    }

    // The limit is on the trimmed title, so surrounding spaces never count against it.
    [Theory]
    [InlineData(ValidationLimits.TitleMaxLength, true)]
    [InlineData(ValidationLimits.TitleMaxLength + 1, false)]
    public void TitleLength_IsAtMostTheLimit(int length, bool expectedValid)
    {
        var result = TopicRules.Validate("  " + new string('a', length) + "  ", null, null);

        Assert.Equal(expectedValid, result.IsValid);
        if (expectedValid)
        {
            Assert.Equal(length, result.Value!.Title.Length);
        }
        else
        {
            Assert.Contains("title", result.Errors.Keys);
        }
    }

    [Fact]
    public void NullBodyAndTags_BecomeEmpty()
    {
        var result = TopicRules.Validate("Title", null, null);

        Assert.True(result.IsValid);
        Assert.Equal("", result.Value!.Body);
        Assert.Empty(result.Value.Tags);
    }

    [Fact]
    public void Tag_IsTrimmed()
    {
        var result = TopicRules.Validate("Title", "", [" pdf "]);

        Assert.True(result.IsValid);
        Assert.Equal(["pdf"], result.Value!.Tags);
    }

    // Duplicates are rejected, never silently removed, and the error points at the exact chip
    // the UI should highlight.
    [Fact]
    public void DuplicateTagIgnoringCase_IsRejectedOnTheLaterIndex()
    {
        var result = TopicRules.Validate("Title", "", ["PDF", "pdf"]);

        Assert.False(result.IsValid);
        Assert.Equal(["tags[1]"], result.Errors.Keys);
        Assert.Equal(
            ["\"pdf\" is already a tag on this topic (tags ignore case)."],
            result.Errors["tags[1]"]
        );
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void EmptyTag_IsRejected(string tag)
    {
        var result = TopicRules.Validate("Title", "", [tag]);

        Assert.False(result.IsValid);
        Assert.Equal(["tags[0]"], result.Errors.Keys);
    }

    [Theory]
    [InlineData(ValidationLimits.TagMaxLength, true)]
    [InlineData(ValidationLimits.TagMaxLength + 1, false)]
    public void TagLength_IsAtMostTheLimit(int length, bool expectedValid)
    {
        var result = TopicRules.Validate("Title", "", ["ok", new string('t', length)]);

        Assert.Equal(expectedValid, result.IsValid);
        if (!expectedValid)
        {
            Assert.Equal(["tags[1]"], result.Errors.Keys);
        }
    }
}
