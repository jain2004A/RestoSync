using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using PetBharke.Application.DTOs;
using PetBharke.Application.Interfaces;

namespace PetBharke.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IMongoDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory? _httpClientFactory;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IAuthService authService,
        ICurrentUserService currentUserService,
        IMongoDbContext context,
        IPasswordHasher passwordHasher,
        IConfiguration configuration,
        ILogger<AuthController> logger,
        IHttpClientFactory? httpClientFactory = null)
    {
        _authService = authService;
        _currentUserService = currentUserService;
        _context = context;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var response = await _authService.LoginAsync(request);
        return Ok(new { success = true, data = response });
    }

    [HttpPost("pin-login")]
    [AllowAnonymous]
    public async Task<IActionResult> PinLogin([FromBody] PinLoginRequest request)
    {
        var response = await _authService.PinLoginAsync(request);
        return Ok(new { success = true, data = response });
    }

    [HttpGet("resolve-outlet/{code}")]
    [AllowAnonymous]
    public async Task<IActionResult> ResolveOutlet(string code)
    {
        var response = await _authService.ResolveOutletAsync(code);
        return Ok(new { success = true, data = response });
    }

    [HttpPost("register-tenant")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> RegisterTenant([FromBody] RegisterTenantRequest request)
    {
        var response = await _authService.RegisterTenantAsync(request);
        return Ok(new { success = true, data = response });
    }

    /// <summary>
    /// Public self-service owner registration endpoint.
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> RegisterOwner([FromBody] OwnerRegistrationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.BusinessName) || string.IsNullOrWhiteSpace(request.OwnerEmail) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { success = false, message = "Business name, email, and password are required." });
        }
        if (request.Password.Length < 8)
        {
            return BadRequest(new { success = false, message = "Password must be at least 8 characters." });
        }

        var response = await _authService.RegisterOwnerAsync(request);

        // Forward registration lead to Quantromind CRM Integration Hub in the background (fire-and-forget, non-blocking)
        var crmUrl = Environment.GetEnvironmentVariable("CRM_API_URL") ?? _configuration["CRM:ApiUrl"] ?? "https://portal.quantromind.com/api/integration/leads";
        var crmKey = Environment.GetEnvironmentVariable("CRM_API_KEY") ?? _configuration["CRM:ApiKey"] ?? "qm_a41e07ae828e799a999c5f3494ed02e75433e1ba722b8846af54e57170a33b98";

        if (!string.IsNullOrWhiteSpace(crmUrl))
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    using var client = _httpClientFactory != null ? _httpClientFactory.CreateClient() : new HttpClient();
                    client.Timeout = TimeSpan.FromSeconds(15);
                    if (!string.IsNullOrWhiteSpace(crmKey))
                    {
                        client.DefaultRequestHeaders.Add("x-api-key", crmKey);
                    }

                    var crmPayload = new
                    {
                        name = request.OwnerName,
                        email = request.OwnerEmail,
                        mobile = request.OwnerPhone,
                        company = request.BusinessName,
                        message = $"New Restaurant/Store Registered: {request.BusinessName} ({request.BusinessType}) in {request.City}, {request.State}",
                        interestedProduct = "QuantroBill POS",
                        productName = "QuantroBill",
                        websiteName = "QuantroBill POS Platform",
                        domain = "quantrobill.quantromind.com",
                        landingPage = "/register",
                        formType = "Registration",
                        customFields = new
                        {
                            businessName = request.BusinessName ?? "",
                            businessType = request.BusinessType ?? "",
                            city = request.City ?? "",
                            state = request.State ?? "",
                            gstin = request.GSTIN ?? ""
                        }
                    };

                    var content = new StringContent(
                        System.Text.Json.JsonSerializer.Serialize(crmPayload),
                        System.Text.Encoding.UTF8,
                        "application/json"
                    );

                    var crmResponse = await client.PostAsync(crmUrl, content);
                    if (!crmResponse.IsSuccessStatusCode)
                    {
                        var responseBody = await crmResponse.Content.ReadAsStringAsync();
                        _logger.LogWarning("CRM lead push for registered owner {Email} returned status {StatusCode}: {ResponseBody}",
                            request.OwnerEmail, crmResponse.StatusCode, responseBody);
                    }
                    else
                    {
                        _logger.LogInformation("CRM lead successfully pushed for registered owner {Email}.", request.OwnerEmail);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not push registered owner {Email} to external CRM.", request.OwnerEmail);
                }
            });
        }

        return Ok(new { success = true, data = response, message = "Registration successful! Welcome to QuantroBill." });
    }


    [HttpPost("switch-outlet")]
    [Authorize]
    public async Task<IActionResult> SwitchOutlet([FromBody] SwitchOutletRequest request)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { success = false, message = "User not authenticated." });
        }

        var response = await _authService.SwitchOutletAsync(userId, request);
        return Ok(new { success = true, data = response });
    }

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var response = await _authService.RefreshTokenAsync(request);
        return Ok(new { success = true, data = response });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { success = false, message = "User not authenticated." });
        }

        var response = await _authService.GetProfileAsync(userId);
        return Ok(new { success = true, data = response });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { success = false, message = "User not authenticated." });
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
        {
            return BadRequest(new { success = false, message = "New password must be at least 8 characters." });
        }

        var user = await _context.Users
            .Find(u => u.Id == userId && u.IsActive)
            .FirstOrDefaultAsync();

        if (user == null)
        {
            return NotFound(new { success = false, message = "User not found." });
        }

        // Verify current password
        if (!_passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { success = false, message = "Current password is incorrect." });
        }

        // Prevent reusing the same password
        if (_passwordHasher.VerifyPassword(request.NewPassword, user.PasswordHash))
        {
            return BadRequest(new { success = false, message = "New password must be different from the current password." });
        }

        // Update password and clear MustChangePassword flag
        var update = Builders<Domain.Entities.User>.Update
            .Set(u => u.PasswordHash, _passwordHasher.HashPassword(request.NewPassword))
            .Set(u => u.MustChangePassword, false)
            .Set(u => u.UpdatedAt, DateTime.UtcNow);

        await _context.Users.UpdateOneAsync(u => u.Id == userId, update);

        return Ok(new { success = true, message = "Password changed successfully." });
    }
}
