using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using RestoSync.Application.Interfaces;
using RestoSync.Domain.Entities;

namespace RestoSync.API.Controllers;

[ApiController]
[Route("api/platform/[controller]")]
[Authorize(Roles = "SuperAdmin")]
public class SettingsController : ControllerBase
{
    private readonly IMongoDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public SettingsController(IMongoDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _context.PlatformSettings.Find(_ => true).FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new PlatformSetting
            {
                PlatformName = "RestoSync",
                SupportEmail = "support@quantromind.com",
                SupportPhone = "+91 99999 99999",
                DefaultCurrency = "INR",
                DefaultTaxRate = 5.0m,
                DefaultTrialDays = 14,
                SmtpHost = Environment.GetEnvironmentVariable("SMTP_HOST") ?? "smtp.example.com",
                SmtpPort = int.TryParse(Environment.GetEnvironmentVariable("SMTP_PORT"), out var smtpP) ? smtpP : 587,
                SmtpUser = Environment.GetEnvironmentVariable("SMTP_USER") ?? "mailer",
                SmtpFromEmail = Environment.GetEnvironmentVariable("SMTP_FROM_EMAIL") ?? "notifications@quantromind.com",
                RazorpayKeyId = Environment.GetEnvironmentVariable("RAZORPAY_KEY_ID") ?? "rzp_test_placeholder",
                MaintenanceMode = false,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.PlatformSettings.InsertOneAsync(settings);
        }

        return Ok(new { success = true, data = settings });
    }

    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] PlatformSetting request)
    {
        var settings = await _context.PlatformSettings.Find(_ => true).FirstOrDefaultAsync();
        if (settings == null)
        {
            request.UpdatedAt = DateTime.UtcNow;
            await _context.PlatformSettings.InsertOneAsync(request);
        }
        else
        {
            var update = Builders<PlatformSetting>.Update
                .Set(s => s.PlatformName, request.PlatformName)
                .Set(s => s.SupportEmail, request.SupportEmail)
                .Set(s => s.SupportPhone, request.SupportPhone)
                .Set(s => s.DefaultCurrency, request.DefaultCurrency)
                .Set(s => s.DefaultTaxRate, request.DefaultTaxRate)
                .Set(s => s.DefaultTrialDays, request.DefaultTrialDays)
                .Set(s => s.SmtpHost, request.SmtpHost)
                .Set(s => s.SmtpPort, request.SmtpPort)
                .Set(s => s.SmtpUser, request.SmtpUser)
                .Set(s => s.SmtpFromEmail, request.SmtpFromEmail)
                .Set(s => s.RazorpayKeyId, request.RazorpayKeyId)
                .Set(s => s.MaintenanceMode, request.MaintenanceMode)
                .Set(s => s.UpdatedAt, DateTime.UtcNow);

            await _context.PlatformSettings.UpdateOneAsync(s => s.Id == settings.Id, update);
        }

        await _auditLogService.LogAsync(
            action: "UpdateSettings",
            details: "Updated platform global settings, SMTP configuration, and defaults.",
            targetId: "PlatformSettings",
            targetType: "PlatformSetting");

        return Ok(new
        {
            success = true,
            message = "Platform settings saved successfully."
        });
    }
}
