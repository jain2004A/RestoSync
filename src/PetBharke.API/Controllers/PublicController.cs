using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using PetBharke.Application.Interfaces;
using PetBharke.Domain.Entities;

namespace PetBharke.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PublicController : ControllerBase
{
    private readonly IMongoDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly IHttpClientFactory? _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PublicController> _logger;

    public PublicController(
        IMongoDbContext context,
        IAuditLogService auditLogService,
        IConfiguration configuration,
        ILogger<PublicController> logger,
        IHttpClientFactory? httpClientFactory = null)
    {
        _context = context;
        _auditLogService = auditLogService;
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    /// <summary>
    /// Submit a new demo request or contact enquiry (Public, no auth required)
    /// </summary>
    [HttpPost("enquiries")]
    [AllowAnonymous]
    public async Task<IActionResult> SubmitEnquiry([FromBody] SubmitEnquiryDto request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { success = false, message = "Full name is required." });
            }

            if (string.IsNullOrWhiteSpace(request.Email) && string.IsNullOrWhiteSpace(request.Phone))
            {
                return BadRequest(new { success = false, message = "Either email or phone number is required." });
            }

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var emailRegex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$");
                if (!emailRegex.IsMatch(request.Email.Trim()))
                {
                    return BadRequest(new { success = false, message = "Please provide a valid email address." });
                }
            }

            string cleanPhone = string.Empty;
            if (!string.IsNullOrWhiteSpace(request.Phone))
            {
                cleanPhone = Regex.Replace(request.Phone, @"\D", "");
                if (cleanPhone.Length < 10)
                {
                    return BadRequest(new { success = false, message = "Please enter a valid 10-digit phone number." });
                }
                if (cleanPhone.Length > 10 && cleanPhone.StartsWith("91"))
                {
                    cleanPhone = cleanPhone.Substring(cleanPhone.Length - 10);
                }
            }

            var enquiry = new PublicEnquiry
            {
                Name = request.Name.Trim(),
                Email = request.Email?.Trim() ?? string.Empty,
                Phone = !string.IsNullOrEmpty(cleanPhone) ? cleanPhone : (request.Phone?.Trim() ?? string.Empty),
                BusinessName = request.BusinessName?.Trim(),
                City = request.City?.Trim(),
                OutletsCount = request.OutletsCount?.Trim() ?? "1",
                Message = request.Message?.Trim() ?? "Requesting a live demo of QuantroBill POS.",
                InterestedProduct = !string.IsNullOrWhiteSpace(request.InterestedProduct) ? request.InterestedProduct.Trim() : "QuantroBill Restaurant OS",
                FormType = !string.IsNullOrWhiteSpace(request.FormType) ? request.FormType.Trim() : "Demo Request",
                Status = "New",
                CreatedAt = DateTime.UtcNow
            };

            await _context.Enquiries.InsertOneAsync(enquiry);

            // Forward to external CRM if configured
            var crmUrl = Environment.GetEnvironmentVariable("CRM_API_URL") ?? _configuration["CRM:ApiUrl"];
            var crmKey = Environment.GetEnvironmentVariable("CRM_API_KEY") ?? _configuration["CRM:ApiKey"];

            if (!string.IsNullOrWhiteSpace(crmUrl))
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var client = _httpClientFactory != null ? _httpClientFactory.CreateClient() : new HttpClient();
                        if (!string.IsNullOrWhiteSpace(crmKey))
                        {
                            client.DefaultRequestHeaders.Add("x-api-key", crmKey);
                        }

                        var payload = new
                        {
                            name = enquiry.Name,
                            email = enquiry.Email,
                            mobile = enquiry.Phone,
                            message = enquiry.Message,
                            businessName = enquiry.BusinessName,
                            city = enquiry.City,
                            domain = "quantrobill.com",
                            websiteName = "QuantroBill POS Platform",
                            productName = enquiry.InterestedProduct,
                            interestedProduct = enquiry.InterestedProduct,
                            formType = enquiry.FormType
                        };

                        var content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
                        await client.PostAsync(crmUrl, content);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Could not push enquiry {Id} to external CRM.", enquiry.Id);
                    }
                });
            }

            return StatusCode(201, new
            {
                success = true,
                message = "Thank you! Your enquiry has been received successfully. Our team will contact you shortly to schedule your demo.",
                enquiryId = enquiry.Id
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing public enquiry.");
            return StatusCode(500, new { success = false, message = "An error occurred while processing your enquiry: " + ex.Message });
        }
    }

    /// <summary>
    /// Retrieve public subscription plans for the landing page pricing section
    /// </summary>
    [HttpGet("plans")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicPlans()
    {
        try
        {
            var plans = await _context.Plans
                .Find(p => p.IsActive)
                .SortBy(p => p.DisplayOrder)
                .ToListAsync();

            if (plans.Count > 0)
            {
                return Ok(new { success = true, data = plans });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not fetch plans from database, returning curated default plans.");
        }

        // Curated fallback plans matching QuantroBill capabilities
        var defaultPlans = new List<object>
            {
                new
                {
                    id = "starter",
                    name = "Starter Outlet",
                    code = "starter",
                    description = "Ideal for single-counter cafes, food trucks, and quick-service stalls.",
                    priceMonthly = 799,
                    priceYearly = 7990,
                    maxOutlets = 1,
                    maxStaffUsers = 3,
                    trialDays = 14,
                    isPopular = false,
                    features = new []
                    {
                        "Under 2-second fast billing register",
                        "Offline order preservation & local sync",
                        "Dynamic UPI QR code on thermal receipts",
                        "Kitchen KOT printing & SMS alerts",
                        "Excel menu bulk import / export",
                        "Daily sales & cashier Z-report"
                    }
                },
                new
                {
                    id = "pro",
                    name = "Growth Restaurant",
                    code = "growth-pro",
                    description = "Comprehensive solution for dine-in restaurants, cafes, and bakeries.",
                    priceMonthly = 1499,
                    priceYearly = 14990,
                    maxOutlets = 1,
                    maxStaffUsers = 10,
                    trialDays = 14,
                    isPopular = true,
                    features = new []
                    {
                        "Everything in Starter, plus:",
                        "Interactive Table floor layout (T1-T50) with split/merge",
                        "Live Kitchen Display System (KDS) bump bar",
                        "Handheld Waiter Mobile App (Android & iOS)",
                        "Recipe inventory & low-stock alerts",
                        "Custom receipt designer (FSSAI, Logo, Tagline)",
                        "Customer CRM & loyalty discounts"
                    }
                },
                new
                {
                    id = "multi-outlet",
                    name = "Multi-Outlet Pro",
                    code = "multi-pro",
                    description = "Centralized multi-branch control for expanding restaurant chains and franchises.",
                    priceMonthly = 2999,
                    priceYearly = 29990,
                    maxOutlets = 5,
                    maxStaffUsers = 30,
                    trialDays = 14,
                    isPopular = false,
                    features = new []
                    {
                        "Everything in Growth Restaurant, plus:",
                        "Up to 5 outlets included under one central dashboard",
                        "Centralized master menu with branch pricing overrides",
                        "Inter-branch inventory transfers & raw stock tracking",
                        "Owner mobile app with real-time consolidated analytics",
                        "Role-based permission matrix & manager PIN auth",
                        "Priority 24/7 WhatsApp & phone support"
                    }
                },
                new
                {
                    id = "enterprise",
                    name = "Enterprise Chain",
                    code = "enterprise",
                    description = "Tailored for large food courts, franchises, and high-volume chains.",
                    priceMonthly = 5999,
                    priceYearly = 59990,
                    maxOutlets = 20,
                    maxStaffUsers = 100,
                    trialDays = 30,
                    isPopular = false,
                    features = new []
                    {
                        "Everything in Multi-Outlet Pro, plus:",
                        "Unlimited outlets & franchise tenant portals",
                        "Custom ERP & accounting software integration",
                        "Dedicated account manager & on-site staff training",
                        "Custom thermal receipt templates & multi-currency",
                        "High-availability 99.99% SLA guarantee",
                        "Custom feature development upon request"
                    }
                }
            };

            return Ok(new { success = true, data = defaultPlans });
    }

    /// <summary>
    /// Admin-only: View incoming public demo enquiries (SuperAdmin only)
    /// </summary>
    [HttpGet("enquiries/admin")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetEnquiries([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var filter = string.IsNullOrWhiteSpace(status)
            ? Builders<PublicEnquiry>.Filter.Empty
            : Builders<PublicEnquiry>.Filter.Eq(e => e.Status, status);

        var total = await _context.Enquiries.CountDocumentsAsync(filter);
        var enquiries = await _context.Enquiries
            .Find(filter)
            .SortByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        return Ok(new
        {
            success = true,
            total,
            page,
            pageSize,
            data = enquiries
        });
    }

    /// <summary>
    /// Admin-only: Update enquiry status (SuperAdmin only)
    /// </summary>
    [HttpPatch("enquiries/admin/{id}/status")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateEnquiryStatus(string id, [FromBody] UpdateEnquiryStatusDto dto)
    {
        var update = Builders<PublicEnquiry>.Update.Set(e => e.Status, dto.Status);
        var result = await _context.Enquiries.UpdateOneAsync(e => e.Id == id, update);

        if (result.MatchedCount == 0)
        {
            return NotFound(new { success = false, message = "Enquiry not found." });
        }

        return Ok(new { success = true, message = $"Status updated to '{dto.Status}'." });
    }
}

public class SubmitEnquiryDto
{
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? BusinessName { get; set; }
    public string? City { get; set; }
    public string? OutletsCount { get; set; }
    public string? Message { get; set; }
    public string? InterestedProduct { get; set; }
    public string? FormType { get; set; }
}

public class UpdateEnquiryStatusDto
{
    public string Status { get; set; } = "Contacted";
}
