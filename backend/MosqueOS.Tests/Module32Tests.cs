using MosqueOS.API.Controllers;
using MosqueOS.API.Services;
using MosqueOS.Domain.Entities;
using Xunit;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;
using System.Threading;
using Moq;

namespace MosqueOS.Tests
{
    public class Module32Tests
    {
        [Fact]
        public void CloneWithExceptions_DoesNotMutateBase()
        {
            var daily = new PrayerTimesDaily
            {
                Id = 1, MosqueId = 1, Date = new DateOnly(2026, 9, 3),
                FajrJamaat = new TimeOnly(5, 0),
                DhuhrJamaat = new TimeOnly(13, 0)
            };

            var exceptions = new List<PrayerException>
            {
                new PrayerException { Prayer = "fajrjamaat", OverrideValue = new TimeOnly(5, 20) }
            };

            var result = PrayerTimesHelper.CloneWithExceptions(daily, exceptions);

            Assert.Equal(new TimeOnly(5, 20), result.FajrJamaat);
            Assert.Equal(new TimeOnly(13, 0), result.DhuhrJamaat);
            // Verify original wasn't mutated
            Assert.Equal(new TimeOnly(5, 0), daily.FajrJamaat);
        }

        [Fact]
        public void TemplateParsing_ValidJson_ReturnsTrue()
        {
            var json = @"{
                ""fajrStart"": ""04:00"", ""fajrJamaat"": ""04:30"",
                ""dhuhrStart"": ""12:00"", ""dhuhrJamaat"": ""13:00"",
                ""asrStart"": ""15:00"", ""asrJamaat"": ""16:00"",
                ""maghribStart"": ""18:00"", ""maghribJamaat"": ""18:10"",
                ""ishaStart"": ""20:00"", ""ishaJamaat"": ""20:30"",
                ""daysOfWeek"": [1, 2, 3]
            }";

            var success = PrayerTimesHelper.TryParseTemplateTimes(json, out var times, out var error);

            Assert.True(success);
            Assert.Null(error);
            Assert.Equal(new TimeOnly(4, 30), times.FajrJamaat);
            Assert.Equal(3, times.DaysOfWeek.Length);
        }
    }
}
