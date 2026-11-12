using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using RestoSync.Application.Interfaces;
using RestoSync.Domain.Entities;

namespace RestoSync.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin")]
public class PlansController : ControllerBase
{
    private readonly IMongoDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public PlansController(IMongoDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllPlans([FromQuery] bool? activeOnly)
    {
        var filter = activeOnly == true ? Builders<Plan>.Filter.Eq(p => p.IsActive, true) : Builders<Plan>.Filter.Empty;
        var plans = await _context.Plans.Find(filter).SortBy(p => p.DisplayOrder).ToListAsync();

        return Ok(new
        {
            success = true,
            data = plans,
            total = plans.Count
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPlanById(string id)
    {
        var plan = await _context.Plans.Find(p => p.Id == id).FirstOrDefaultAsync();
        if (plan == null)
        {
            return NotFound(new { success = false, message = "Plan tier not found." });
        }

        return Ok(new { success = true, data = plan });
    }

    [HttpPost]
    public async Task<IActionResult> CreatePlan([FromBody] CreateOrUpdatePlanDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { success = false, message = "Plan name is required." });
        }

        var normalizedCode = string.IsNullOrWhiteSpace(request.Code)
            ? request.Name.Trim().ToLower().Replace(" ", "-")
            : request.Code.Trim().ToLower().Replace(" ", "-");

        var existing = await _context.Plans.Find(p => p.Code == normalizedCode).FirstOrDefaultAsync();
        if (existing != null)
        {
            return BadRequest(new { success = false, message = $"A plan with code '{normalizedCode}' already exists." });
        }

        var plan = new Plan
        {
            Name = request.Name.Trim(),
            Code = normalizedCode,
            Description = request.Description?.Trim() ?? string.Empty,
            PriceMonthly = request.PriceMonthly,
            PriceYearly = request.PriceYearly > 0 ? request.PriceYearly : request.PriceMonthly * 10,
            BillingCycle = !string.IsNullOrWhiteSpace(request.BillingCycle) ? request.BillingCycle : "Yearly",
            DurationDays = request.DurationDays > 0 ? request.DurationDays : (request.IsTrial ? 15 : 365),
            IncludesHardware = request.IncludesHardware,
            HardwareDetails = request.HardwareDetails ?? string.Empty,
            IsTrial = request.IsTrial,
            MaxOutlets = request.MaxOutlets > 0 ? request.MaxOutlets : 1,
            MaxStaffUsers = request.MaxStaffUsers > 0 ? request.MaxStaffUsers : 5,
            TrialDays = request.TrialDays >= 0 ? request.TrialDays : 14,
            Features = request.Features ?? new Dictionary<string, bool>
            {
                { "enableKds", true },
                { "enableWaiterApp", true },
                { "enableAggregators", true },
                { "enableRecipeInventory", true },
                { "enableKhataBook", true }
            },
            IsPopular = request.IsPopular,
            IsActive = request.IsActive,
            DisplayOrder = request.DisplayOrder > 0 ? request.DisplayOrder : 1,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Plans.InsertOneAsync(plan);

        await _auditLogService.LogAsync(
            action: "CreatePlan",
            details: $"Created new plan tier '{plan.Name}' (₹{plan.PriceMonthly}/mo, {plan.MaxOutlets} outlets max).",
            targetId: plan.Id,
            targetType: "Plan");

        return Ok(new
        {
            success = true,
            data = plan,
            message = $"Plan '{plan.Name}' created successfully."
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePlan(string id, [FromBody] CreateOrUpdatePlanDto request)
    {
        var plan = await _context.Plans.Find(p => p.Id == id).FirstOrDefaultAsync();
        if (plan == null)
        {
            return NotFound(new { success = false, message = "Plan tier not found." });
        }

        var update = Builders<Plan>.Update
            .Set(p => p.UpdatedAt, DateTime.UtcNow);

        if (!string.IsNullOrWhiteSpace(request.Name))
            update = update.Set(p => p.Name, request.Name.Trim());

        if (!string.IsNullOrWhiteSpace(request.Description))
            update = update.Set(p => p.Description, request.Description.Trim());

        if (request.PriceMonthly >= 0)
            update = update.Set(p => p.PriceMonthly, request.PriceMonthly);

        if (request.PriceYearly >= 0)
            update = update.Set(p => p.PriceYearly, request.PriceYearly);

        if (!string.IsNullOrWhiteSpace(request.BillingCycle))
            update = update.Set(p => p.BillingCycle, request.BillingCycle);

        if (request.DurationDays > 0)
            update = update.Set(p => p.DurationDays, request.DurationDays);

        update = update.Set(p => p.IncludesHardware, request.IncludesHardware);

        if (request.HardwareDetails != null)
            update = update.Set(p => p.HardwareDetails, request.HardwareDetails);

        update = update.Set(p => p.IsTrial, request.IsTrial);

        if (request.MaxOutlets > 0)
            update = update.Set(p => p.MaxOutlets, request.MaxOutlets);

        if (request.MaxStaffUsers > 0)
            update = update.Set(p => p.MaxStaffUsers, request.MaxStaffUsers);

        if (request.TrialDays >= 0)
            update = update.Set(p => p.TrialDays, request.TrialDays);

        if (request.Features != null)
            update = update.Set(p => p.Features, request.Features);

        update = update.Set(p => p.IsPopular, request.IsPopular);
        update = update.Set(p => p.IsActive, request.IsActive);

        if (request.DisplayOrder > 0)
            update = update.Set(p => p.DisplayOrder, request.DisplayOrder);

        await _context.Plans.UpdateOneAsync(p => p.Id == id, update);

        int syncedTenantsCount = 0;
        // If requested to sync features and limits to existing tenants on this plan
        if (request.SyncToTenants == true && request.Features != null)
        {
            var tenantFilter = Builders<Tenant>.Filter.Or(
                Builders<Tenant>.Filter.Eq(t => t.PlanId, id),
                Builders<Tenant>.Filter.Eq(t => t.PlanCode, plan.Code)
            );

            var tenantUpdate = Builders<Tenant>.Update
                .Set(t => t.Features, request.Features)
                .Set(t => t.PlanName, request.Name?.Trim() ?? plan.Name)
                .Set(t => t.MaxOutlets, request.MaxOutlets > 0 ? request.MaxOutlets : plan.MaxOutlets)
                .Set(t => t.MaxStaffUsers, request.MaxStaffUsers > 0 ? request.MaxStaffUsers : plan.MaxStaffUsers)
                .Set(t => t.UpdatedAt, DateTime.UtcNow);

            var syncResult = await _context.Tenants.UpdateManyAsync(tenantFilter, tenantUpdate);
            syncedTenantsCount = (int)syncResult.ModifiedCount;
        }

        await _auditLogService.LogAsync(
            action: "UpdatePlan",
            details: $"Updated plan tier '{plan.Name}' settings & pricing. (Synced to {syncedTenantsCount} active tenants)",
            targetId: id,
            targetType: "Plan");

        return Ok(new
        {
            success = true,
            syncedTenants = syncedTenantsCount,
            message = syncedTenantsCount > 0
                ? $"Plan '{plan.Name}' updated and changes applied to {syncedTenantsCount} restaurant(s)."
                : $"Plan '{plan.Name}' updated successfully."
        });
    }

    [HttpPatch("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActiveStatus(string id)
    {
        var plan = await _context.Plans.Find(p => p.Id == id).FirstOrDefaultAsync();
        if (plan == null)
        {
            return NotFound(new { success = false, message = "Plan tier not found." });
        }

        var newStatus = !plan.IsActive;
        await _context.Plans.UpdateOneAsync(
            p => p.Id == id,
            Builders<Plan>.Update.Set(p => p.IsActive, newStatus).Set(p => p.UpdatedAt, DateTime.UtcNow));

        await _auditLogService.LogAsync(
            action: "TogglePlanStatus",
            details: $"Toggled plan tier '{plan.Name}' active state to {newStatus}.",
            targetId: id,
            targetType: "Plan");

        return Ok(new
        {
            success = true,
            isActive = newStatus,
            message = $"Plan '{plan.Name}' is now {(newStatus ? "Active" : "Inactive")}."
        });
    }

    [HttpPatch("{id}/toggle-popular")]
    public async Task<IActionResult> TogglePopular(string id)
    {
        var plan = await _context.Plans.Find(p => p.Id == id).FirstOrDefaultAsync();
        if (plan == null)
        {
            return NotFound(new { success = false, message = "Plan tier not found." });
        }

        var newPopular = !plan.IsPopular;
        await _context.Plans.UpdateOneAsync(
            p => p.Id == id,
            Builders<Plan>.Update.Set(p => p.IsPopular, newPopular).Set(p => p.UpdatedAt, DateTime.UtcNow));

        return Ok(new
        {
            success = true,
            isPopular = newPopular,
            message = $"Plan '{plan.Name}' popular badge {(newPopular ? "enabled" : "removed")}."
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> ArchivePlan(string id)
    {
        var plan = await _context.Plans.Find(p => p.Id == id).FirstOrDefaultAsync();
        if (plan == null)
        {
            return NotFound(new { success = false, message = "Plan tier not found." });
        }

        // Soft archive by deactivating
        await _context.Plans.UpdateOneAsync(
            p => p.Id == id,
            Builders<Plan>.Update.Set(p => p.IsActive, false).Set(p => p.UpdatedAt, DateTime.UtcNow));

        await _auditLogService.LogAsync(
            action: "ArchivePlan",
            details: $"Archived/deactivated plan tier '{plan.Name}'.",
            targetId: id,
            targetType: "Plan");

        return Ok(new
        {
            success = true,
            message = $"Plan '{plan.Name}' has been archived."
        });
    }
}

public class CreateOrUpdatePlanDto
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public decimal PriceMonthly { get; set; } = 0;
    public decimal PriceYearly { get; set; } = 0;
    public string BillingCycle { get; set; } = "Yearly";
    public int DurationDays { get; set; } = 365;
    public bool IncludesHardware { get; set; } = false;
    public string? HardwareDetails { get; set; }
    public bool IsTrial { get; set; } = false;
    public int MaxOutlets { get; set; } = 1;
    public int MaxStaffUsers { get; set; } = 5;
    public int TrialDays { get; set; } = 14;
    public Dictionary<string, bool>? Features { get; set; }
    public bool IsPopular { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; } = 1;
    public bool SyncToTenants { get; set; } = true; // Default to true so changes apply to existing restaurants
}
