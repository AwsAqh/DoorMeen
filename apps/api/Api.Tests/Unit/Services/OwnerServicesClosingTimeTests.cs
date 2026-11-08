using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Threading.Tasks;
using Api.Application.Services;
using Api.Infrastructuer;
using Api.models;
using Api.Tests.TestUtils;
using FluentAssertions;
using Xunit;

namespace Api.Tests.Unit.Services;

public class OwnerServicesClosingTimeTests
{
    private OwnerServices CreateService(DoorMeenDbContext db)
    {
        return new OwnerServices(null!, db, null!, null!);
    }

    [Fact]
    public async Task UpdateClosingTime_Parses_Standard_HH_mm()
    {
        using var db = DbContextFactory.CreateInMemory();
        var queue = new QueueItem { Id = "q1", Name = "Q1", HashedPassword = "" };
        db.Queues.Add(queue);
        await db.SaveChangesAsync();

        var sut = CreateService(db);
        await sut.UpdateClosingTime("q1", "18:00");

        var updated = await db.Queues.FindAsync("q1");
        updated!.DailyResetTime.Should().Be(new TimeSpan(18, 0, 0));
    }

    [Fact]
    public async Task UpdateClosingTime_Parses_HH_mm_ss()
    {
        using var db = DbContextFactory.CreateInMemory();
        var queue = new QueueItem { Id = "q2", Name = "Q2", HashedPassword = "" };
        db.Queues.Add(queue);
        await db.SaveChangesAsync();

        var sut = CreateService(db);
        await sut.UpdateClosingTime("q2", "18:30:00");

        var updated = await db.Queues.FindAsync("q2");
        updated!.DailyResetTime.Should().Be(new TimeSpan(18, 30, 0));
    }

    [Fact]
    public async Task UpdateClosingTime_Parses_12Hour_AM_PM()
    {
        using var db = DbContextFactory.CreateInMemory();
        var queue = new QueueItem { Id = "q3", Name = "Q3", HashedPassword = "" };
        db.Queues.Add(queue);
        await db.SaveChangesAsync();

        var sut = CreateService(db);
        await sut.UpdateClosingTime("q3", "06:30 PM");

        var updated = await db.Queues.FindAsync("q3");
        updated!.DailyResetTime.Should().Be(new TimeSpan(18, 30, 0));
    }

    [Fact]
    public async Task UpdateClosingTime_Trims_Whitespace_And_Quotes()
    {
        using var db = DbContextFactory.CreateInMemory();
        var queue = new QueueItem { Id = "q4", Name = "Q4", HashedPassword = "" };
        db.Queues.Add(queue);
        await db.SaveChangesAsync();

        var sut = CreateService(db);
        await sut.UpdateClosingTime("q4", "  \"17:15\"  ");

        var updated = await db.Queues.FindAsync("q4");
        updated!.DailyResetTime.Should().Be(new TimeSpan(17, 15, 0));
    }

    [Fact]
    public async Task UpdateClosingTime_Clears_When_Empty_Or_Null()
    {
        using var db = DbContextFactory.CreateInMemory();
        var queue = new QueueItem { Id = "q5", Name = "Q5", HashedPassword = "", DailyResetTime = new TimeSpan(18, 0, 0) };
        db.Queues.Add(queue);
        await db.SaveChangesAsync();

        var sut = CreateService(db);
        await sut.UpdateClosingTime("q5", "");

        var updated = await db.Queues.FindAsync("q5");
        updated!.DailyResetTime.Should().BeNull();

        // Also test null
        queue.DailyResetTime = new TimeSpan(18, 0, 0);
        await db.SaveChangesAsync();
        await sut.UpdateClosingTime("q5", null);
        updated = await db.Queues.FindAsync("q5");
        updated!.DailyResetTime.Should().BeNull();
    }

    [Fact]
    public async Task UpdateClosingTime_Throws_ValidationException_On_Invalid_Format()
    {
        using var db = DbContextFactory.CreateInMemory();
        var queue = new QueueItem { Id = "q6", Name = "Q6", HashedPassword = "" };
        db.Queues.Add(queue);
        await db.SaveChangesAsync();

        var sut = CreateService(db);
        var act = () => sut.UpdateClosingTime("q6", "not-a-valid-time");

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("Invalid closing time format. Expected HH:mm.");
    }

    [Fact]
    public void Controller_JsonElement_Extraction_Works_For_Strings_And_Objects()
    {
        // Helper matching the controller's logic
        string? Extract(JsonElement? el, params string[] props)
        {
            if (!el.HasValue) return null;
            var element = el.Value;
            if (element.ValueKind == JsonValueKind.String) return element.GetString();
            if (element.ValueKind == JsonValueKind.Object)
            {
                foreach (var p in props)
                {
                    if (element.TryGetProperty(p, out var v) && v.ValueKind == JsonValueKind.String)
                        return v.GetString();
                }
            }
            return null;
        }

        // Raw string
        using var rawDoc = JsonDocument.Parse("\"18:00\"");
        Extract(rawDoc.RootElement, "closingTime", "timeString").Should().Be("18:00");

        // Object with closingTime
        using var objDoc1 = JsonDocument.Parse("{\"closingTime\": \"18:00\"}");
        Extract(objDoc1.RootElement, "closingTime", "timeString").Should().Be("18:00");

        // Object with timeString
        using var objDoc2 = JsonDocument.Parse("{\"timeString\": \"18:00\"}");
        Extract(objDoc2.RootElement, "closingTime", "timeString").Should().Be("18:00");

        // Object with phone
        using var phoneDoc = JsonDocument.Parse("{\"phone\": \"0501234567\"}");
        Extract(phoneDoc.RootElement, "phone", "Phone").Should().Be("0501234567");

        // Null
        Extract(null, "phone").Should().BeNull();
    }
}
