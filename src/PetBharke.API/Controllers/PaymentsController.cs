using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using PetBharke.Application.DTOs;
using PetBharke.Application.Interfaces;
using PetBharke.Domain.Entities;
using PetBharke.Domain.Enums;

namespace PetBharke.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IRazorpayService _razorpayService;
    private readonly IMongoDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        IRazorpayService razorpayService,
        IMongoDbContext context,
        ICurrentUserService currentUserService,
        IAuditLogService auditLogService,
        ILogger<PaymentsController> logger)
    {
        _razorpayService = razorpayService;
        _context = context;
        _currentUserService = currentUserService;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    [HttpGet("config")]
    [AllowAnonymous]
    public IActionResult GetPaymentConfig()
    {
        var keyId = _razorpayService.GetKeyId();
        return Ok(new
        {
            success = true,
            keyId,
            currency = "INR",
            provider = "Razorpay"
        });
    }

    [HttpPost("create-order")]
    [Authorize]
    public async Task<IActionResult> CreateOrder([FromBody] CreatePaymentOrderDto request)
    {
        try
        {
            var tenantId = _currentUserService.TenantId;
            var user = await _context.Users.Find(u => u.Id == _currentUserService.UserId).FirstOrDefaultAsync();

            decimal amount = 0;
            string receipt = $"rcpt_{DateTime.UtcNow.Ticks % 10000000}";
            var notes = new Dictionary<string, string>
            {
                { "purpose", request.Purpose ?? "General" },
                { "tenantId", tenantId ?? string.Empty },
                { "userId", _currentUserService.UserId ?? string.Empty }
            };

            if (string.Equals(request.Purpose, "SubscriptionUpgrade", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(request.PlanCode) && string.IsNullOrWhiteSpace(request.PlanId))
                {
                    return BadRequest(new { success = false, message = "PlanCode or PlanId is required for subscription upgrade." });
                }

                var planFilter = !string.IsNullOrWhiteSpace(request.PlanId)
                    ? Builders<Plan>.Filter.Eq(p => p.Id, request.PlanId)
                    : Builders<Plan>.Filter.Eq(p => p.Code, request.PlanCode!.Trim().ToLower());

                var plan = await _context.Plans.Find(planFilter).FirstOrDefaultAsync();
                if (plan == null)
                {
                    return NotFound(new { success = false, message = "Selected subscription plan not found." });
                }

                // Calculate amount based on billing cycle (yearly default)
                var isYearly = string.Equals(request.BillingCycle, "Monthly", StringComparison.OrdinalIgnoreCase) == false;
                amount = isYearly
                    ? (plan.PriceYearly > 0 ? plan.PriceYearly : plan.PriceMonthly * 12)
                    : plan.PriceMonthly;

                if (amount <= 0)
                {
                    return BadRequest(new { success = false, message = "Free plans do not require payment." });
                }

                receipt = $"sub_{plan.Code}_{DateTime.UtcNow:yyyyMMddHHmmss}";
                notes["planCode"] = plan.Code;
                notes["planId"] = plan.Id;
                notes["planName"] = plan.Name;
                notes["billingCycle"] = isYearly ? "Yearly" : "Monthly";
            }
            else if (string.Equals(request.Purpose, "SubscriptionInvoice", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(request.InvoiceId))
                {
                    return BadRequest(new { success = false, message = "InvoiceId is required to pay subscription invoice." });
                }

                var invoice = await _context.SubscriptionInvoices.Find(i => i.Id == request.InvoiceId).FirstOrDefaultAsync();
                if (invoice == null)
                {
                    return NotFound(new { success = false, message = "Subscription invoice not found." });
                }

                if (invoice.Status == "Paid")
                {
                    return BadRequest(new { success = false, message = "This invoice is already paid." });
                }

                amount = invoice.TotalAmount;
                receipt = invoice.InvoiceNumber;
                notes["invoiceId"] = invoice.Id;
                notes["invoiceNumber"] = invoice.InvoiceNumber;
            }
            else if (string.Equals(request.Purpose, "RestaurantBill", StringComparison.OrdinalIgnoreCase))
            {
                if (request.Amount <= 0)
                {
                    return BadRequest(new { success = false, message = "Valid order amount is required." });
                }

                amount = request.Amount;
                receipt = !string.IsNullOrWhiteSpace(request.OrderId) ? request.OrderId : $"bill_{DateTime.UtcNow.Ticks % 10000000}";
                notes["orderId"] = request.OrderId ?? string.Empty;
                notes["tableNumber"] = request.TableNumber ?? string.Empty;
            }
            else
            {
                amount = request.Amount > 0 ? request.Amount : 100;
            }

            var result = await _razorpayService.CreateOrderAsync(amount, receipt, "INR", notes);

            return Ok(new
            {
                success = true,
                data = result,
                user = new
                {
                    name = user?.FullName ?? string.Empty,
                    email = user?.Email ?? string.Empty,
                    phone = user?.Phone ?? string.Empty
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating Razorpay order.");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpPost("verify-payment")]
    [Authorize]
    public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentDto request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.OrderId) ||
                string.IsNullOrWhiteSpace(request.PaymentId) ||
                string.IsNullOrWhiteSpace(request.Signature))
            {
                return BadRequest(new { success = false, message = "OrderId, PaymentId, and Signature are required." });
            }

            var isValid = _razorpayService.VerifySignature(request.OrderId, request.PaymentId, request.Signature);
            if (!isValid)
            {
                _logger.LogWarning("Payment verification failed for OrderId: {OrderId}, PaymentId: {PaymentId}", request.OrderId, request.PaymentId);
                return BadRequest(new { success = false, message = "Payment signature verification failed. The transaction may be invalid." });
            }

            var tenantId = _currentUserService.TenantId;

            // Handle Subscription Upgrade
            if (string.Equals(request.Purpose, "SubscriptionUpgrade", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(tenantId))
                {
                    return BadRequest(new { success = false, message = "Tenant context is missing." });
                }

                var tenant = await _context.Tenants.Find(t => t.Id == tenantId).FirstOrDefaultAsync();
                if (tenant == null)
                {
                    return NotFound(new { success = false, message = "Tenant account not found." });
                }

                var planFilter = !string.IsNullOrWhiteSpace(request.PlanId)
                    ? Builders<Plan>.Filter.Eq(p => p.Id, request.PlanId)
                    : Builders<Plan>.Filter.Eq(p => p.Code, request.PlanCode!.Trim().ToLower());

                var plan = await _context.Plans.Find(planFilter).FirstOrDefaultAsync();
                if (plan == null)
                {
                    return NotFound(new { success = false, message = "Selected plan not found." });
                }

                var isYearly = string.Equals(request.BillingCycle, "Monthly", StringComparison.OrdinalIgnoreCase) == false;
                var durationDays = plan.DurationDays > 0 ? plan.DurationDays : (isYearly ? 365 : 30);
                var expiresAt = DateTime.UtcNow.AddDays(durationDays);

                // Update Tenant Subscription
                var tenantUpdate = Builders<Tenant>.Update
                    .Set(t => t.PlanId, plan.Id)
                    .Set(t => t.PlanCode, plan.Code)
                    .Set(t => t.PlanName, plan.Name)
                    .Set(t => t.MaxOutlets, plan.MaxOutlets)
                    .Set(t => t.MaxStaffUsers, plan.MaxStaffUsers)
                    .Set(t => t.Features, plan.Features)
                    .Set(t => t.IsTrial, false)
                    .Set(t => t.SubscriptionExpiresAt, expiresAt)
                    .Set(t => t.UpdatedAt, DateTime.UtcNow);

                // Map SubscriptionPlan enum
                if (Enum.TryParse<SubscriptionPlan>(plan.Name.Replace(" ", ""), true, out var parsedPlan))
                {
                    tenantUpdate = tenantUpdate.Set(t => t.SubscriptionPlan, parsedPlan);
                }

                await _context.Tenants.UpdateOneAsync(t => t.Id == tenantId, tenantUpdate);

                // Create paid subscription invoice
                var amount = isYearly
                    ? (plan.PriceYearly > 0 ? plan.PriceYearly : plan.PriceMonthly * 12)
                    : plan.PriceMonthly;
                var tax = Math.Round(amount * 0.18m, 2);
                var total = amount + tax;

                var invoice = new SubscriptionInvoice
                {
                    InvoiceNumber = $"INV-{DateTime.UtcNow:yyyyMM}-{new Random().Next(1000, 9999)}",
                    TenantId = tenant.Id,
                    TenantName = tenant.BusinessName,
                    PlanName = plan.Name,
                    BillingCycle = isYearly ? "Yearly" : "Monthly",
                    Amount = amount,
                    TaxAmount = tax,
                    TotalAmount = total,
                    Currency = "INR",
                    Status = "Paid",
                    DueDate = DateTime.UtcNow,
                    PaidAt = DateTime.UtcNow,
                    PaymentMethod = "Razorpay",
                    TransactionRef = request.PaymentId,
                    Notes = $"Razorpay Order: {request.OrderId} | Signature Verified",
                    CreatedAt = DateTime.UtcNow
                };

                await _context.SubscriptionInvoices.InsertOneAsync(invoice);

                // Audit Log
                await _auditLogService.LogAsync(
                    action: "SubscriptionUpgrade",
                    details: $"Upgraded to plan '{plan.Name}' via Razorpay ({request.PaymentId}). Paid ₹{invoice.TotalAmount}.",
                    targetId: plan.Id,
                    targetType: "Plan",
                    tenantId: tenant.Id);

                var updatedTenant = await _context.Tenants.Find(t => t.Id == tenantId).FirstOrDefaultAsync();

                return Ok(new
                {
                    success = true,
                    message = $"Congratulations! Successfully upgraded to {plan.Name}.",
                    invoice,
                    invoiceNumber = invoice.InvoiceNumber,
                    tenant = new TenantSummaryDto
                    {
                        Id = updatedTenant.Id,
                        BusinessName = updatedTenant.BusinessName,
                        SubscriptionPlan = updatedTenant.SubscriptionPlan.ToString(),
                        PlanId = updatedTenant.PlanId,
                        PlanCode = updatedTenant.PlanCode,
                        PlanName = updatedTenant.PlanName,
                        SubscriptionExpiresAt = updatedTenant.SubscriptionExpiresAt,
                        IsTrial = updatedTenant.IsTrial,
                        TrialEndsAt = updatedTenant.TrialEndsAt,
                        MaxOutlets = updatedTenant.MaxOutlets,
                        MaxStaffUsers = updatedTenant.MaxStaffUsers,
                        Features = updatedTenant.Features
                    }
                });
            }
            // Handle Subscription Invoice Payment
            else if (string.Equals(request.Purpose, "SubscriptionInvoice", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(request.InvoiceId))
                {
                    return BadRequest(new { success = false, message = "InvoiceId is required." });
                }

                var invoice = await _context.SubscriptionInvoices.Find(i => i.Id == request.InvoiceId).FirstOrDefaultAsync();
                if (invoice == null)
                {
                    return NotFound(new { success = false, message = "Invoice not found." });
                }

                var update = Builders<SubscriptionInvoice>.Update
                    .Set(i => i.Status, "Paid")
                    .Set(i => i.PaidAt, DateTime.UtcNow)
                    .Set(i => i.PaymentMethod, "Razorpay")
                    .Set(i => i.TransactionRef, request.PaymentId)
                    .Set(i => i.Notes, $"{invoice.Notes} | Paid via Razorpay ({request.PaymentId})")
                    .Set(i => i.UpdatedAt, DateTime.UtcNow);

                await _context.SubscriptionInvoices.UpdateOneAsync(i => i.Id == request.InvoiceId, update);

                await _auditLogService.LogAsync(
                    action: "InvoicePayment",
                    details: $"Paid invoice {invoice.InvoiceNumber} (₹{invoice.TotalAmount}) via Razorpay ({request.PaymentId}).",
                    targetId: invoice.Id,
                    targetType: "Invoice",
                    tenantId: invoice.TenantId);

                return Ok(new
                {
                    success = true,
                    message = $"Invoice {invoice.InvoiceNumber} paid successfully!",
                    invoiceNumber = invoice.InvoiceNumber,
                    paymentId = request.PaymentId
                });
            }
            // Handle Restaurant POS Customer Bill Payment
            else if (string.Equals(request.Purpose, "RestaurantBill", StringComparison.OrdinalIgnoreCase))
            {
                var restOrderId = !string.IsNullOrWhiteSpace(request.RestaurantOrderId) ? request.RestaurantOrderId : null;
                if (!string.IsNullOrWhiteSpace(restOrderId))
                {
                    var order = await _context.Orders.Find(o => o.Id == restOrderId).FirstOrDefaultAsync();
                    if (order != null)
                    {
                        var payment = new OrderPayment
                        {
                            Mode = PaymentMode.Online,
                            Amount = order.TotalAmount,
                            ReferenceNumber = $"RZP:{request.PaymentId}",
                            PaidAt = DateTime.UtcNow
                        };

                        var update = Builders<Order>.Update
                            .Push(o => o.Payments, payment)
                            .Set(o => o.Status, OrderStatus.Delivered)
                            .Set(o => o.DeliveredAt, DateTime.UtcNow)
                            .Set(o => o.UpdatedAt, DateTime.UtcNow);

                        await _context.Orders.UpdateOneAsync(o => o.Id == restOrderId, update);
                    }
                }

                return Ok(new
                {
                    success = true,
                    message = "Customer bill payment verified successfully via Razorpay.",
                    paymentId = request.PaymentId,
                    orderId = restOrderId
                });
            }

            return Ok(new
            {
                success = true,
                message = "Payment verified successfully.",
                paymentId = request.PaymentId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying Razorpay payment.");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("my-invoices")]
    [Authorize]
    public async Task<IActionResult> GetMyInvoices()
    {
        var tenantId = _currentUserService.TenantId;
        if (string.IsNullOrWhiteSpace(tenantId))
        {
            return BadRequest(new { success = false, message = "Tenant context is missing." });
        }

        var invoices = await _context.SubscriptionInvoices
            .Find(i => i.TenantId == tenantId)
            .SortByDescending(i => i.CreatedAt)
            .ToListAsync();

        return Ok(new { success = true, data = invoices });
    }

    [HttpGet("invoices/{id}")]
    [Authorize]
    public async Task<IActionResult> GetInvoiceById(string id)
    {
        var tenantId = _currentUserService.TenantId;
        var userRole = _currentUserService.Role;

        var invoice = await _context.SubscriptionInvoices.Find(i => i.Id == id).FirstOrDefaultAsync();
        if (invoice == null)
        {
            return NotFound(new { success = false, message = "Invoice not found." });
        }

        // Owner can only view their own invoices, SuperAdmin can view any
        if (userRole != "SuperAdmin" && invoice.TenantId != tenantId)
        {
            return Forbid();
        }

        var tenant = await _context.Tenants.Find(t => t.Id == invoice.TenantId).FirstOrDefaultAsync();

        return Ok(new
        {
            success = true,
            data = invoice,
            tenant = tenant != null ? new
            {
                tenant.Id,
                tenant.BusinessName,
                tenant.OwnerEmail,
                tenant.OwnerPhone,
                tenant.GSTIN,
                tenant.City,
                tenant.State
            } : null
        });
    }
}

public class CreatePaymentOrderDto
{
    public string Purpose { get; set; } = "SubscriptionUpgrade"; // SubscriptionUpgrade, SubscriptionInvoice, RestaurantBill
    public string? PlanCode { get; set; }
    public string? PlanId { get; set; }
    public string? InvoiceId { get; set; }
    public string? OrderId { get; set; }
    public string? TableNumber { get; set; }
    public decimal Amount { get; set; }
    public string? BillingCycle { get; set; } = "Yearly"; // Yearly, Monthly
}

public class VerifyPaymentDto
{
    public string OrderId { get; set; } = string.Empty; // Razorpay Order ID
    public string? RazorpayOrderId { get; set; }
    public string PaymentId { get; set; } = string.Empty; // Razorpay Payment ID
    public string Signature { get; set; } = string.Empty; // Razorpay Signature
    public string Purpose { get; set; } = "SubscriptionUpgrade";
    public string? PlanCode { get; set; }
    public string? PlanId { get; set; }
    public string? InvoiceId { get; set; }
    public string? RestaurantOrderId { get; set; }
    public string? BillingCycle { get; set; } = "Yearly";
}
