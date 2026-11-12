using RestoSync.Domain.Enums;

namespace RestoSync.Application.DTOs;

public class LoginRequest
{
    public string Identifier { get; set; } = string.Empty; // Email or Username
    public string Password { get; set; } = string.Empty;
    public string? OutletId { get; set; } // Optional if user has multiple outlets
}

public class PinLoginRequest
{
    public string OutletId { get; set; } = string.Empty;
    public string Pin { get; set; } = string.Empty;
}

public class RegisterTenantRequest
{
    public string BusinessName { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string OwnerPhone { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string InitialOutletName { get; set; } = string.Empty;
    public string InitialOutletAddress { get; set; } = string.Empty;
    public string? GSTIN { get; set; }
}

public class OwnerRegistrationRequest
{
    public string BusinessName { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string OwnerPhone { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? BusinessType { get; set; } = "Restaurant"; // Can be string ("Restaurant", "Cafe", etc.) or int
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string? GSTIN { get; set; }
    public string? PlanCode { get; set; } // Optional, defaults to free-trial
}

public class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool MustChangePassword { get; set; } = false;
    public UserProfileDto User { get; set; } = new();
    public TenantSummaryDto? Tenant { get; set; }
    public OutletSummaryDto? ActiveOutlet { get; set; }
    public List<OutletSummaryDto> AvailableOutlets { get; set; } = new();
}

public class UserProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public List<string> Permissions { get; set; } = new();
    public string TenantId { get; set; } = string.Empty;
    public bool MustChangePassword { get; set; } = false;
}

public class TenantSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string BusinessName { get; set; } = string.Empty;
    public string SubscriptionPlan { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string PlanCode { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public DateTime? SubscriptionExpiresAt { get; set; }
    public bool IsTrial { get; set; } = false;
    public DateTime? TrialEndsAt { get; set; }
    public int MaxOutlets { get; set; } = 1;
    public int MaxStaffUsers { get; set; } = 5;
    public Dictionary<string, bool> Features { get; set; } = new();
}

public class OutletSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Currency { get; set; } = "INR";
    public decimal CgstPercentage { get; set; } = 2.5m;
    public decimal SgstPercentage { get; set; } = 2.5m;
}

public class SwitchOutletRequest
{
    public string OutletId { get; set; } = string.Empty;
}

public class RefreshTokenRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class OutletResolutionDto
{
    public string OutletId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string OutletName { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

