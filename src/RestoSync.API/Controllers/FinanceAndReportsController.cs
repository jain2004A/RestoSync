using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using RestoSync.Application.Interfaces;
using RestoSync.Domain.Entities;
using RestoSync.Domain.Enums;

namespace RestoSync.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,Owner,Manager")]
public class FinanceController : ControllerBase
{
    private readonly IMongoDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public FinanceController(IMongoDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet("cash-flow")]
    public async Task<IActionResult> GetCashFlow()
    {
        var tenantId = _currentUser.TenantId;
        var entries = await _context.CashFlowEntries
            .Find(c => c.TenantId == tenantId && c.IsActive)
            .SortByDescending(c => c.EntryDate)
            .Limit(50)
            .ToListAsync();

        return Ok(new { success = true, data = entries });
    }

    [HttpPost("cash-flow")]
    public async Task<IActionResult> AddCashFlow([FromBody] CashFlowEntry entry)
    {
        entry.TenantId = _currentUser.TenantId ?? string.Empty;
        entry.OutletId = _currentUser.OutletId ?? string.Empty;
        entry.PerformedByUserId = _currentUser.UserId ?? string.Empty;
        entry.PerformedByName = _currentUser.Username ?? "Cashier";
        entry.EntryDate = DateTime.UtcNow;
        entry.CreatedAt = DateTime.UtcNow;
        entry.IsActive = true;

        await _context.CashFlowEntries.InsertOneAsync(entry);
        return Ok(new { success = true, data = entry });
    }

    [HttpGet("expenses")]
    public async Task<IActionResult> GetExpenses()
    {
        var tenantId = _currentUser.TenantId;
        var expenses = await _context.Expenses
            .Find(e => e.TenantId == tenantId && e.IsActive)
            .SortByDescending(e => e.ExpenseDate)
            .Limit(50)
            .ToListAsync();

        return Ok(new { success = true, data = expenses });
    }

    [HttpPost("expenses")]
    public async Task<IActionResult> AddExpense([FromBody] Expense expense)
    {
        expense.TenantId = _currentUser.TenantId ?? string.Empty;
        expense.OutletId = _currentUser.OutletId ?? string.Empty;
        expense.PaidBy = _currentUser.Username ?? "Staff";
        expense.ExpenseDate = DateTime.UtcNow;
        expense.CreatedAt = DateTime.UtcNow;
        expense.IsActive = true;

        await _context.Expenses.InsertOneAsync(expense);
        return Ok(new { success = true, data = expense });
    }

    [HttpGet("shift-summary")]
    public async Task<IActionResult> GetShiftSummary()
    {
        var tenantId = _currentUser.TenantId;
        var today = DateTime.UtcNow.Date;

        var orders = await _context.Orders
            .Find(o => o.TenantId == tenantId && o.PlacedAt >= today && o.Status != OrderStatus.Cancelled)
            .ToListAsync();

        var expenses = await _context.Expenses
            .Find(e => e.TenantId == tenantId && e.ExpenseDate >= today && e.IsActive)
            .ToListAsync();

        var cashFlow = await _context.CashFlowEntries
            .Find(c => c.TenantId == tenantId && c.EntryDate >= today && c.IsActive)
            .ToListAsync();

        var totalSales = orders.Sum(o => o.TotalAmount);
        var cashSales = orders.Where(o => o.Payments.Any(p => p.Mode == PaymentMode.Cash)).Sum(o => o.TotalAmount);
        var upiSales = orders.Where(o => o.Payments.Any(p => p.Mode == PaymentMode.UPI)).Sum(o => o.TotalAmount);
        var cardSales = orders.Where(o => o.Payments.Any(p => p.Mode == PaymentMode.Card)).Sum(o => o.TotalAmount);
        var onlineSales = orders.Where(o => o.Payments.Any(p => p.Mode == PaymentMode.Online)).Sum(o => o.TotalAmount);
        var totalExpense = expenses.Sum(e => e.Amount);

        var openingCash = cashFlow.Where(c => c.Type == "OpeningCash").Sum(c => c.Amount);
        var cashTopUp = cashFlow.Where(c => c.Type == "CashTopUp").Sum(c => c.Amount);
        var withdrawal = cashFlow.Where(c => c.Type == "Withdrawal").Sum(c => c.Amount);

        var expectedDrawerCash = openingCash + cashSales + cashTopUp - withdrawal - totalExpense;

        return Ok(new
        {
            success = true,
            data = new
            {
                totalSales,
                ordersCount = orders.Count,
                cashSales,
                upiSales,
                cardSales,
                onlineSales,
                totalExpense,
                openingCash,
                cashTopUp,
                withdrawal,
                expectedDrawerCash
            }
        });
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,Owner,Manager")]
public class ReportsController : ControllerBase
{
    private readonly IMongoDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ReportsController(IMongoDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet("sales-summary")]
    public async Task<IActionResult> GetSalesSummary([FromQuery] int days = 7)
    {
        var tenantId = _currentUser.TenantId;
        var now = DateTime.UtcNow;
        var startDate = now.Date.AddDays(days == 1 ? 0 : -days);

        var orders = await _context.Orders
            .Find(o => o.TenantId == tenantId && o.PlacedAt >= startDate && o.Status != OrderStatus.Cancelled)
            .ToListAsync();

        var totalRevenue = orders.Sum(o => o.TotalAmount);
        var totalCgst = orders.Sum(o => o.CgstAmount);
        var totalSgst = orders.Sum(o => o.SgstAmount);
        var averageOrderValue = orders.Count > 0 ? totalRevenue / orders.Count : 0;

        // Previous period comparison
        var prevStart = startDate.AddDays(days == 1 ? -1 : -days);
        var prevEnd = startDate;
        var prevOrders = await _context.Orders
            .Find(o => o.TenantId == tenantId && o.PlacedAt >= prevStart && o.PlacedAt < prevEnd && o.Status != OrderStatus.Cancelled)
            .ToListAsync();
        var prevRevenue = prevOrders.Sum(o => o.TotalAmount);
        var revenueChangePercent = prevRevenue > 0
            ? Math.Round((double)((totalRevenue - prevRevenue) / prevRevenue * 100), 1)
            : (totalRevenue > 0 ? 100.0 : 0.0);

        // Daily breakdown with formatted dates
        var dailySales = new List<object>();
        if (days == 1)
        {
            // Hourly buckets for Today
            for (var hour = 0; hour < 24; hour += 2)
            {
                var bucketStart = now.Date.AddHours(hour);
                var bucketEnd = bucketStart.AddHours(2);
                var bucketOrders = orders.Where(o => o.PlacedAt >= bucketStart && o.PlacedAt < bucketEnd).ToList();
                if (bucketOrders.Count > 0 || hour <= now.Hour)
                {
                    dailySales.Add(new
                    {
                        date = $"{hour:D2}:00",
                        revenue = bucketOrders.Sum(o => o.TotalAmount),
                        count = bucketOrders.Count
                    });
                }
            }
        }
        else
        {
            // Daily buckets with human-readable dates
            for (var d = startDate; d <= now.Date; d = d.AddDays(1))
            {
                var dayOrders = orders.Where(o => o.PlacedAt.Date == d).ToList();
                dailySales.Add(new
                {
                    date = d.ToString("dd MMM"),
                    revenue = dayOrders.Sum(o => o.TotalAmount),
                    count = dayOrders.Count
                });
            }
        }

        // Channel breakdown with display names
        string GetChannelName(Order o)
        {
            if (o.AggregatorSource == AggregatorSource.Zomato) return "Zomato (Online)";
            if (o.AggregatorSource == AggregatorSource.Swiggy) return "Swiggy (Online)";
            if (o.OrderType == OrderType.DineIn) return "Dine In (Restaurant)";
            if (o.OrderType == OrderType.TakeAway || o.OrderType == OrderType.PickUp || o.OrderType == OrderType.Parcel)
                return "Takeaway / Pick Up";
            if (o.OrderType == OrderType.Delivery) return "Delivery (Direct)";
            return "Other";
        }

        var channelSales = orders
            .GroupBy(o => GetChannelName(o))
            .Select(g => new
            {
                channel = g.Key,
                revenue = g.Sum(o => o.TotalAmount),
                count = g.Count(),
                percentage = totalRevenue > 0 ? Math.Round((double)(g.Sum(o => o.TotalAmount) / totalRevenue * 100), 1) : 0
            })
            .OrderByDescending(c => c.revenue)
            .ToList();

        // Top selling items
        var topItems = orders
            .SelectMany(o => o.Items)
            .GroupBy(i => i.Name)
            .Select(g => new
            {
                name = g.Key,
                qty = g.Sum(i => i.Quantity),
                revenue = g.Sum(i => i.TotalPrice)
            })
            .OrderByDescending(i => i.qty)
            .Take(10)
            .ToList();

        // Aggregator commission (only on Zomato/Swiggy orders)
        var aggregatorRevenue = orders
            .Where(o => o.AggregatorSource == AggregatorSource.Zomato || o.AggregatorSource == AggregatorSource.Swiggy)
            .Sum(o => o.TotalAmount);
        var aggregatorCut = Math.Round(aggregatorRevenue * 0.18m, 2);

        return Ok(new
        {
            success = true,
            data = new
            {
                totalRevenue,
                totalOrders = orders.Count,
                averageOrderValue,
                totalCgst,
                totalSgst,
                revenueChangePercent,
                dailySales,
                channelSales,
                topItems,
                aggregatorCut,
                aggregatorRevenue
            }
        });
    }
}
