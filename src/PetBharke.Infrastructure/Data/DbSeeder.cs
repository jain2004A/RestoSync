using MongoDB.Driver;
using PetBharke.Application.Interfaces;
using PetBharke.Domain.Entities;
using PetBharke.Domain.Enums;

namespace PetBharke.Infrastructure.Data;

public static class DbSeeder
{
    public static async Task SeedDatabaseAsync(IMongoDbContext context, IPasswordHasher hasher)
    {
        // 1. Clean legacy demo/dummy tenants & unattached data if present
        await PurgeLegacyDummyDataAsync(context);

        // 2. Ensure SuperAdmin exists and is up to date
        var superAdmin = await context.Users
            .Find(u => u.Role == UserRole.SuperAdmin || u.Email.ToLower() == "admin@quantromind.com")
            .FirstOrDefaultAsync();

        if (superAdmin == null)
        {
            superAdmin = new User
            {
                Username = "superadmin",
                Email = "admin@quantromind.com",
                FullName = "Platform Super Admin",
                Phone = "+91 99999 99999",
                PasswordHash = hasher.HashPassword("Quantromind@#9100"),
                Role = UserRole.SuperAdmin,
                Permissions = new List<string> { "all", "superadmin" },
                IsActive = true,
                MustChangePassword = false,
                CreatedAt = DateTime.UtcNow
            };
            await context.Users.InsertOneAsync(superAdmin);
            Console.WriteLine("--> [QuantroBill] SuperAdmin created: admin@quantromind.com / Quantromind@#9100");
        }
        else
        {
            // Keep SuperAdmin credentials synchronized and verified
            var update = Builders<User>.Update
                .Set(u => u.Email, "admin@quantromind.com")
                .Set(u => u.Username, "superadmin")
                .Set(u => u.PasswordHash, hasher.HashPassword("Quantromind@#9100"))
                .Set(u => u.Role, UserRole.SuperAdmin)
                .Set(u => u.IsActive, true)
                .Set(u => u.MustChangePassword, false);

            await context.Users.UpdateOneAsync(u => u.Id == superAdmin.Id, update);
            Console.WriteLine("--> [QuantroBill] SuperAdmin synchronized: admin@quantromind.com / Quantromind@#9100");
        }

        // 3. Seed Platform Entities (Plans Catalog, Invoices, Team, Settings, Announcements, Coupons, Audit Logs)
        await SeedPlatformDataAsync(context, hasher);
    }

    private static async Task SeedPlatformDataAsync(IMongoDbContext context, IPasswordHasher hasher)
    {
        try
        {
            // Seed Plans Catalog
            var planCount = await context.Plans.CountDocumentsAsync(_ => true);
            if (planCount == 0)
            {
                var plans = new List<Plan>
                {
                    new Plan
                    {
                        Name = "15-Day Free Trial",
                        Code = "free-trial",
                        Description = "Try QuantroBill free for 15 days. Single outlet, basic POS billing, and reporting.",
                        PriceMonthly = 0,
                        PriceYearly = 0,
                        MaxOutlets = 1,
                        MaxStaffUsers = 2,
                        TrialDays = 15,
                        DurationDays = 15,
                        BillingCycle = "Trial",
                        IsTrial = true,
                        IncludesHardware = false,
                        IsPopular = true,
                        DisplayOrder = 0,
                        Features = new Dictionary<string, bool>
                        {
                            { "enableKds", true },
                            { "enableWaiterApp", true },
                            { "enableAggregators", false },
                            { "enableRecipeInventory", false },
                            { "enableKhataBook", true }
                        }
                    },
                    new Plan
                    {
                        Name = "Starter Annual",
                        Code = "starter",
                        Description = "Ideal for single-outlet cafes, bakeries, and quick-service counters starting digital billing.",
                        PriceMonthly = 999,
                        PriceYearly = 9990,
                        MaxOutlets = 1,
                        MaxStaffUsers = 5,
                        TrialDays = 0,
                        DurationDays = 365,
                        BillingCycle = "Yearly",
                        IsTrial = false,
                        IncludesHardware = false,
                        IsPopular = false,
                        DisplayOrder = 1,
                        Features = new Dictionary<string, bool>
                        {
                            { "enableKds", false },
                            { "enableWaiterApp", false },
                            { "enableAggregators", false },
                            { "enableRecipeInventory", true },
                            { "enableKhataBook", true }
                        }
                    },
                    new Plan
                    {
                        Name = "Growth Dine-In",
                        Code = "growth",
                        Description = "Full-featured restaurant management with KDS, Captain/Waiter handhelds, and aggregator integrations.",
                        PriceMonthly = 2499,
                        PriceYearly = 24990,
                        MaxOutlets = 3,
                        MaxStaffUsers = 15,
                        TrialDays = 0,
                        DurationDays = 365,
                        BillingCycle = "Yearly",
                        IsTrial = false,
                        IncludesHardware = false,
                        IsPopular = false,
                        DisplayOrder = 2,
                        Features = new Dictionary<string, bool>
                        {
                            { "enableKds", true },
                            { "enableWaiterApp", true },
                            { "enableAggregators", true },
                            { "enableRecipeInventory", true },
                            { "enableKhataBook", true }
                        }
                    },
                    new Plan
                    {
                        Name = "Renewal + Hardware",
                        Code = "renewal-hardware",
                        Description = "Annual renewal bundled with 80mm thermal printer, tablet stand, and on-site setup support.",
                        PriceMonthly = 3499,
                        PriceYearly = 34990,
                        MaxOutlets = 3,
                        MaxStaffUsers = 15,
                        TrialDays = 0,
                        DurationDays = 365,
                        BillingCycle = "Yearly",
                        IsTrial = false,
                        IncludesHardware = true,
                        HardwareDetails = "80mm Thermal Printer + Tablet Stand + On-site Setup",
                        IsPopular = false,
                        DisplayOrder = 3,
                        Features = new Dictionary<string, bool>
                        {
                            { "enableKds", true },
                            { "enableWaiterApp", true },
                            { "enableAggregators", true },
                            { "enableRecipeInventory", true },
                            { "enableKhataBook", true }
                        }
                    },
                    new Plan
                    {
                        Name = "Enterprise Multi-Branch",
                        Code = "enterprise",
                        Description = "Multi-chain restaurants & franchises requiring unlimited branches, custom analytics, and dedicated SLA.",
                        PriceMonthly = 5999,
                        PriceYearly = 59990,
                        MaxOutlets = 10,
                        MaxStaffUsers = 50,
                        TrialDays = 0,
                        DurationDays = 365,
                        BillingCycle = "Yearly",
                        IsTrial = false,
                        IncludesHardware = false,
                        IsPopular = false,
                        DisplayOrder = 4,
                        Features = new Dictionary<string, bool>
                        {
                            { "enableKds", true },
                            { "enableWaiterApp", true },
                            { "enableAggregators", true },
                            { "enableRecipeInventory", true },
                            { "enableKhataBook", true }
                        }
                    }
                };

                await context.Plans.InsertManyAsync(plans);
                Console.WriteLine("--> [QuantroBill] Plans catalog seeded (Free Trial, Starter, Growth, Renewal+Hardware, Enterprise).");
            }
            else
            {
                // Ensure 15-Day Free Trial exists in existing database
                var existingTrial = await context.Plans.Find(p => p.IsTrial || p.Code == "free-trial").FirstOrDefaultAsync();
                if (existingTrial == null)
                {
                    var freeTrial = new Plan
                    {
                        Name = "15-Day Free Trial",
                        Code = "free-trial",
                        Description = "Try QuantroBill free for 15 days. Single outlet, basic POS billing, and reporting.",
                        PriceMonthly = 0,
                        PriceYearly = 0,
                        MaxOutlets = 1,
                        MaxStaffUsers = 2,
                        TrialDays = 15,
                        DurationDays = 15,
                        BillingCycle = "Trial",
                        IsTrial = true,
                        IncludesHardware = false,
                        IsPopular = true,
                        DisplayOrder = 0,
                        Features = new Dictionary<string, bool>
                        {
                            { "enableKds", true },
                            { "enableWaiterApp", true },
                            { "enableAggregators", false },
                            { "enableRecipeInventory", false },
                            { "enableKhataBook", true }
                        }
                    };
                    await context.Plans.InsertOneAsync(freeTrial);
                    Console.WriteLine("--> [QuantroBill] Ensured 15-Day Free Trial plan exists in database.");
                }

                // Ensure Renewal + Hardware exists
                var existingHardware = await context.Plans.Find(p => p.Code == "renewal-hardware").FirstOrDefaultAsync();
                if (existingHardware == null)
                {
                    var hardware = new Plan
                    {
                        Name = "Renewal + Hardware",
                        Code = "renewal-hardware",
                        Description = "Annual renewal bundled with 80mm thermal printer, tablet stand, and on-site setup support.",
                        PriceMonthly = 3499,
                        PriceYearly = 34990,
                        MaxOutlets = 3,
                        MaxStaffUsers = 15,
                        TrialDays = 0,
                        DurationDays = 365,
                        BillingCycle = "Yearly",
                        IsTrial = false,
                        IncludesHardware = true,
                        HardwareDetails = "80mm Thermal Printer + Tablet Stand + On-site Setup",
                        IsPopular = false,
                        DisplayOrder = 3,
                        Features = new Dictionary<string, bool>
                        {
                            { "enableKds", true },
                            { "enableWaiterApp", true },
                            { "enableAggregators", true },
                            { "enableRecipeInventory", true },
                            { "enableKhataBook", true }
                        }
                    };
                    await context.Plans.InsertOneAsync(hardware);
                    Console.WriteLine("--> [QuantroBill] Ensured Renewal + Hardware plan exists in database.");
                }
            }

            // Seed Platform Settings
            var settingCount = await context.PlatformSettings.CountDocumentsAsync(_ => true);
            if (settingCount == 0)
            {
                var setting = new PlatformSetting
                {
                    PlatformName = "QuantroBill",
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
                    MaintenanceMode = false
                };
                await context.PlatformSettings.InsertOneAsync(setting);
                Console.WriteLine("--> [QuantroBill] Platform settings seeded.");
            }

            // Seed Platform Team Members
            var supportStaff = await context.Users.Find(u => u.Email == "support@quantromind.com").FirstOrDefaultAsync();
            if (supportStaff == null)
            {
                supportStaff = new User
                {
                    Username = "support_team",
                    Email = "support@quantromind.com",
                    FullName = "SaaS Technical Support",
                    Phone = "+91 98765 43211",
                    PasswordHash = hasher.HashPassword("Support@#2026"),
                    Role = UserRole.SuperAdmin,
                    Permissions = new List<string> { "tenants.read", "tenants.impersonate", "tickets.manage", "logs.read" },
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                await context.Users.InsertOneAsync(supportStaff);
            }

            var billingStaff = await context.Users.Find(u => u.Email == "billing@quantromind.com").FirstOrDefaultAsync();
            if (billingStaff == null)
            {
                billingStaff = new User
                {
                    Username = "billing_manager",
                    Email = "billing@quantromind.com",
                    FullName = "Billing & Revenue Operations",
                    Phone = "+91 98765 43212",
                    PasswordHash = hasher.HashPassword("Billing@#2026"),
                    Role = UserRole.SuperAdmin,
                    Permissions = new List<string> { "billing.manage", "invoices.read", "plans.read", "coupons.manage" },
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                await context.Users.InsertOneAsync(billingStaff);
            }

            // Seed Coupons
            var couponCount = await context.PlatformCoupons.CountDocumentsAsync(_ => true);
            if (couponCount == 0)
            {
                var coupons = new List<PlatformCoupon>
                {
                    new PlatformCoupon
                    {
                        Code = "LAUNCH50",
                        Description = "50% off first 3 months subscription for early restaurant adopters",
                        DiscountType = DiscountType.Percentage,
                        Value = 50,
                        MinPlanDurationMonths = 3,
                        MaxRedemptions = 200,
                        TimesRedeemed = 18,
                        ValidFrom = DateTime.UtcNow.AddMonths(-1),
                        ValidUntil = DateTime.UtcNow.AddMonths(5),
                        IsActive = true,
                        ApplicablePlans = new List<string> { "Starter", "Professional" }
                    },
                    new PlatformCoupon
                    {
                        Code = "ANNUAL20",
                        Description = "Flat 20% savings on all annual plan commitments",
                        DiscountType = DiscountType.Percentage,
                        Value = 20,
                        MinPlanDurationMonths = 12,
                        MaxRedemptions = 500,
                        TimesRedeemed = 34,
                        ValidFrom = DateTime.UtcNow.AddMonths(-2),
                        ValidUntil = DateTime.UtcNow.AddMonths(10),
                        IsActive = true,
                        ApplicablePlans = new List<string> { "Professional", "Enterprise" }
                    },
                    new PlatformCoupon
                    {
                        Code = "FLAT5000",
                        Description = "Flat ₹5,000 instant discount on multi-outlet Enterprise onboarding",
                        DiscountType = DiscountType.FixedAmount,
                        Value = 5000,
                        MinPlanDurationMonths = 12,
                        MaxRedemptions = 50,
                        TimesRedeemed = 6,
                        ValidFrom = DateTime.UtcNow.AddMonths(-1),
                        ValidUntil = DateTime.UtcNow.AddMonths(3),
                        IsActive = true,
                        ApplicablePlans = new List<string> { "Enterprise" }
                    }
                };
                await context.PlatformCoupons.InsertManyAsync(coupons);
                Console.WriteLine("--> [QuantroBill] Platform coupons seeded.");
            }

            // Seed Announcements
            var announcementCount = await context.Announcements.CountDocumentsAsync(_ => true);
            if (announcementCount == 0)
            {
                var announcements = new List<Announcement>
                {
                    new Announcement
                    {
                        Title = "QuantroBill v2.0 Platform Upgrade & Cloud Kitchen Sync",
                        Message = "We have deployed ultra-low latency WebSocket KDS updates and direct Swiggy/Zomato aggregator auto-accept routines.",
                        Type = "Feature",
                        TargetAudience = "All",
                        IsActive = true,
                        PublishedAt = DateTime.UtcNow.AddDays(-2),
                        ExpiresAt = DateTime.UtcNow.AddDays(28),
                        CreatedBy = "Platform Super Admin"
                    },
                    new Announcement
                    {
                        Title = "Scheduled Database Optimization Window",
                        Message = "Routine database indexing will occur on Sunday at 03:00 AM IST. All offline POS caching will preserve orders during the 5-minute maintenance window.",
                        Type = "Maintenance",
                        TargetAudience = "All",
                        IsActive = true,
                        PublishedAt = DateTime.UtcNow.AddHours(-12),
                        ExpiresAt = DateTime.UtcNow.AddDays(7),
                        CreatedBy = "Platform Super Admin"
                    }
                };
                await context.Announcements.InsertManyAsync(announcements);
                Console.WriteLine("--> [QuantroBill] Announcements seeded.");
            }

            // Seed Sample Subscription Invoices if empty
            var invoiceCount = await context.SubscriptionInvoices.CountDocumentsAsync(_ => true);
            if (invoiceCount == 0)
            {
                var tenants = await context.Tenants.Find(_ => true).Limit(5).ToListAsync();
                var invoices = new List<SubscriptionInvoice>();
                int seq = 1001;

                if (tenants.Count > 0)
                {
                    foreach (var t in tenants)
                    {
                        invoices.Add(new SubscriptionInvoice
                        {
                            InvoiceNumber = $"INV-2026-{seq++}",
                            TenantId = t.Id,
                            TenantName = t.BusinessName,
                            PlanName = t.SubscriptionPlan.ToString(),
                            BillingCycle = "Yearly",
                            Amount = 24990,
                            TaxAmount = 4498.2m,
                            TotalAmount = 29488.2m,
                            Currency = "INR",
                            Status = "Paid",
                            DueDate = DateTime.UtcNow.AddDays(-15),
                            PaidAt = DateTime.UtcNow.AddDays(-16),
                            PaymentMethod = "UPI",
                            TransactionRef = $"TXN-UPI-{new Random().Next(1000000, 9999999)}",
                            Notes = "Annual SaaS Renewal",
                            CreatedAt = DateTime.UtcNow.AddDays(-16)
                        });
                    }
                }
                else
                {
                    // Fallback sample invoices
                    invoices.Add(new SubscriptionInvoice
                    {
                        InvoiceNumber = "INV-2026-1001",
                        TenantId = "sample_tenant_1",
                        TenantName = "Cafe Bistro Central",
                        PlanName = "Professional",
                        BillingCycle = "Monthly",
                        Amount = 2499,
                        TaxAmount = 449.82m,
                        TotalAmount = 2948.82m,
                        Currency = "INR",
                        Status = "Paid",
                        DueDate = DateTime.UtcNow.AddDays(-5),
                        PaidAt = DateTime.UtcNow.AddDays(-6),
                        PaymentMethod = "UPI",
                        TransactionRef = "TXN-UPI-9821033",
                        Notes = "Monthly Subscription",
                        CreatedAt = DateTime.UtcNow.AddDays(-6)
                    });
                    invoices.Add(new SubscriptionInvoice
                    {
                        InvoiceNumber = "INV-2026-1002",
                        TenantId = "sample_tenant_2",
                        TenantName = "Royal Spice Fine Dine",
                        PlanName = "Enterprise",
                        BillingCycle = "Yearly",
                        Amount = 59990,
                        TaxAmount = 10798.2m,
                        TotalAmount = 70788.2m,
                        Currency = "INR",
                        Status = "Paid",
                        DueDate = DateTime.UtcNow.AddDays(-10),
                        PaidAt = DateTime.UtcNow.AddDays(-10),
                        PaymentMethod = "NetBanking",
                        TransactionRef = "TXN-NB-4481023",
                        Notes = "Annual 5-Branch Plan",
                        CreatedAt = DateTime.UtcNow.AddDays(-10)
                    });
                    invoices.Add(new SubscriptionInvoice
                    {
                        InvoiceNumber = "INV-2026-1003",
                        TenantId = "sample_tenant_3",
                        TenantName = "Chai Shai Cafe & Bakery",
                        PlanName = "Starter",
                        BillingCycle = "Monthly",
                        Amount = 999,
                        TaxAmount = 179.82m,
                        TotalAmount = 1178.82m,
                        Currency = "INR",
                        Status = "Due",
                        DueDate = DateTime.UtcNow.AddDays(5),
                        PaidAt = null,
                        PaymentMethod = "UPI",
                        Notes = "Renewal invoice generated",
                        CreatedAt = DateTime.UtcNow.AddDays(-2)
                    });
                    invoices.Add(new SubscriptionInvoice
                    {
                        InvoiceNumber = "INV-2026-1004",
                        TenantId = "sample_tenant_4",
                        TenantName = "Urban Wok Cloud Kitchen",
                        PlanName = "Professional",
                        BillingCycle = "Monthly",
                        Amount = 2499,
                        TaxAmount = 449.82m,
                        TotalAmount = 2948.82m,
                        Currency = "INR",
                        Status = "Overdue",
                        DueDate = DateTime.UtcNow.AddDays(-8),
                        PaidAt = null,
                        PaymentMethod = "Card",
                        Notes = "Payment link expired",
                        CreatedAt = DateTime.UtcNow.AddDays(-15)
                    });
                }

                await context.SubscriptionInvoices.InsertManyAsync(invoices);
                Console.WriteLine("--> [QuantroBill] Subscription invoices seeded.");
            }

            // Seed Initial Audit Logs if empty
            var auditCount = await context.AuditLogs.CountDocumentsAsync(_ => true);
            if (auditCount == 0)
            {
                var initialLogs = new List<AuditLog>
                {
                    new AuditLog
                    {
                        TenantId = "Platform",
                        UserId = "system",
                        UserName = "Platform Super Admin",
                        ActorEmail = "admin@quantromind.com",
                        Action = "SystemInitialize",
                        TargetId = "QuantroBill-Core",
                        TargetType = "Platform",
                        Details = "Platform initial security boundary & database collections initialized successfully.",
                        IpAddress = "127.0.0.1",
                        Status = "Success",
                        Timestamp = DateTime.UtcNow.AddDays(-3)
                    },
                    new AuditLog
                    {
                        TenantId = "Platform",
                        UserId = "system",
                        UserName = "Platform Super Admin",
                        ActorEmail = "admin@quantromind.com",
                        Action = "UpdatePlanCatalog",
                        TargetId = "professional",
                        TargetType = "Plan",
                        Details = "Updated pricing and feature allocations for Professional plan tier.",
                        IpAddress = "127.0.0.1",
                        Status = "Success",
                        Timestamp = DateTime.UtcNow.AddDays(-2)
                    },
                    new AuditLog
                    {
                        TenantId = "Platform",
                        UserId = "system",
                        UserName = "Platform Super Admin",
                        ActorEmail = "admin@quantromind.com",
                        Action = "BroadcastAnnouncement",
                        TargetId = "announcement_1",
                        TargetType = "Announcement",
                        Details = "Broadcasted notification: QuantroBill v2.0 Platform Upgrade & Cloud Kitchen Sync.",
                        IpAddress = "127.0.0.1",
                        Status = "Success",
                        Timestamp = DateTime.UtcNow.AddDays(-1)
                    }
                };
                await context.AuditLogs.InsertManyAsync(initialLogs);
                Console.WriteLine("--> [QuantroBill] Initial audit trail seeded.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"--> [QuantroBill] Note during platform seeding: {ex.Message}");
        }
    }

    private static async Task PurgeLegacyDummyDataAsync(IMongoDbContext context)
    {
        try
        {
            // Remove dummy sample tenants and old demo accounts
            var dummyEmails = new[]
            {
                "owner@magicbottle.com",
                "ajay@magicbottle.com",
                "sourabh@gmail.com",
                "biller@jaymalhar.com",
                "manager@jaymalhar.com",
                "waiter@jaymalhar.com",
                "chef@jaymalhar.com",
                "admin@petbharke.com",
                "admin@quantrobill.com",
                "superadmin@quantrobill.com"
            };

            // Remove legacy sample users
            await context.Users.DeleteManyAsync(u => 
                dummyEmails.Contains(u.Email.ToLower()) || 
                (u.Role != UserRole.SuperAdmin && u.Email.ToLower() != "admin@quantromind.com" && string.IsNullOrEmpty(u.TenantId)));

            // Remove sample dummy tenants
            await context.Tenants.DeleteManyAsync(t => 
                t.OwnerEmail.ToLower() == "owner@magicbottle.com" || 
                t.OwnerEmail.ToLower() == "sourabh@gmail.com" ||
                t.BusinessName.Contains("The Magic Bottle") ||
                t.BusinessName.Contains("Jay Malhar"));

            // Remove sample dummy outlets
            await context.Outlets.DeleteManyAsync(o => 
                o.Code == "R443077" || 
                o.Name.Contains("The Magic Bottle") ||
                o.Name.Contains("Jay Malhar"));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"--> [QuantroBill] Note during purge: {ex.Message}");
        }
    }

    /// <summary>
    /// Complete database reset helper: drops all collections and seeds fresh SuperAdmin.
    /// </summary>
    public static async Task ResetAllCollectionsAsync(IMongoDbContext context, IPasswordHasher hasher)
    {
        var db = context.Database;
        var collections = new[]
        {
            "tenants", "outlets", "categories", "menuItems", "orders",
            "tables", "customers", "inventory", "expenses", "cashFlowEntries",
            "discounts", "feedbacks"
        };

        foreach (var col in collections)
        {
            try
            {
                await db.DropCollectionAsync(col);
            }
            catch {}
        }

        // Clear all users except fresh SuperAdmin
        try
        {
            await db.DropCollectionAsync("users");
        }
        catch {}

        await SeedDatabaseAsync(context, hasher);
        Console.WriteLine("--> [QuantroBill] All collections reset. SuperAdmin ready.");
    }
}
