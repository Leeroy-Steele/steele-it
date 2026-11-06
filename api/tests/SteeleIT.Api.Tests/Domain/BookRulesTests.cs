using SteeleIT.Api.Domain;

namespace SteeleIT.Api.Tests.Domain;

public class BookRulesTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void BlankTitle_IsRejected(string? title)
    {
        var result = BookRules.Validate(title, null);

        Assert.False(result.IsValid);
        Assert.Equal(["Title is required."], result.Errors["title"]);
    }

    [Theory]
    [InlineData(ValidationLimits.TitleMaxLength, true)]
    [InlineData(ValidationLimits.TitleMaxLength + 1, false)]
    public void TitleLength_IsAtMostTheLimit(int length, bool expectedValid)
    {
        var result = BookRules.Validate(new string('a', length), null);

        Assert.Equal(expectedValid, result.IsValid);
    }

    // A blank description is stored as null, so "no description" has one representation.
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void BlankDescription_BecomesNull(string? description)
    {
        var result = BookRules.Validate("Title", description);

        Assert.True(result.IsValid);
        Assert.Null(result.Value!.Description);
    }

    [Fact]
    public void Description_IsTrimmed()
    {
        var result = BookRules.Validate(" Title ", "  About this book.  ");

        Assert.True(result.IsValid);
        Assert.Equal("Title", result.Value!.Title);
        Assert.Equal("About this book.", result.Value.Description);
    }

    [Theory]
    [InlineData(ValidationLimits.DescriptionMaxLength, true)]
    [InlineData(ValidationLimits.DescriptionMaxLength + 1, false)]
    public void DescriptionLength_IsAtMostTheLimit(int length, bool expectedValid)
    {
        var result = BookRules.Validate("Title", new string('d', length));

        Assert.Equal(expectedValid, result.IsValid);
        if (!expectedValid)
        {
            Assert.Contains("description", result.Errors.Keys);
        }
    }
}
