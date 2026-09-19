using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using PetBharke.Application.Interfaces;
using PetBharke.Domain.Entities;

namespace PetBharke.Infrastructure.Services;

public class RazorpayService : IRazorpayService
{
    private static readonly HttpClient _httpClient = new();
    private readonly IConfiguration _configuration;
    private readonly IMongoDbContext _context;
    private readonly ILogger<RazorpayService> _logger;

    public RazorpayService(
        IConfiguration configuration,
        IMongoDbContext context,
        ILogger<RazorpayService> logger)
    {
        _configuration = configuration;
        _context = context;
        _logger = logger;
    }

    private (string KeyId, string KeySecret) GetCredentials()
    {
        var keyId = Environment.GetEnvironmentVariable("RAZORPAY_KEY_ID")
            ?? _configuration["Razorpay:KeyId"];
        var keySecret = Environment.GetEnvironmentVariable("RAZORPAY_KEY_SECRET")
            ?? _configuration["Razorpay:KeySecret"];

        // If not set in environment or config, check PlatformSetting in MongoDB
        if (string.IsNullOrWhiteSpace(keyId) || string.IsNullOrWhiteSpace(keySecret))
        {
            try
            {
                var settings = _context.PlatformSettings.Find(_ => true).FirstOrDefault();
                if (settings != null && !string.IsNullOrWhiteSpace(settings.RazorpayKeyId) && settings.RazorpayKeyId != "rzp_test_placeholder")
                {
                    keyId = settings.RazorpayKeyId;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load Razorpay credentials from PlatformSettings collection.");
            }
        }

        keyId ??= "rzp_test_T2ddslG9ywkskj";
        keySecret ??= "5Ixs4ctz15CjO2IF07p6Lmfh";

        return (keyId.Trim(), keySecret.Trim());
    }

    public string GetKeyId()
    {
        return GetCredentials().KeyId;
    }

    public async Task<RazorpayOrderResult> CreateOrderAsync(
        decimal amountInRupees,
        string receipt,
        string currency = "INR",
        Dictionary<string, string>? notes = null)
    {
        var (keyId, keySecret) = GetCredentials();

        // Amount in paise (minimum 100 paise = ₹1.00)
        long amountInPaise = (long)Math.Round(amountInRupees * 100m);
        if (amountInPaise <= 0)
        {
            throw new ArgumentException("Amount must be greater than zero.", nameof(amountInRupees));
        }

        var authHeaderValue = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{keyId}:{keySecret}"));

        var payload = new Dictionary<string, object>
        {
            { "amount", amountInPaise },
            { "currency", string.IsNullOrWhiteSpace(currency) ? "INR" : currency.ToUpperInvariant() },
            { "receipt", receipt ?? $"rcpt_{DateTime.UtcNow.Ticks}" }
        };

        if (notes != null && notes.Count > 0)
        {
            payload.Add("notes", notes);
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.razorpay.com/v1/orders")
        {
            Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeaderValue);

        var response = await _httpClient.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Razorpay order creation failed: Status {StatusCode}, Response: {Body}", response.StatusCode, responseBody);
            throw new InvalidOperationException($"Razorpay order creation failed: {responseBody}");
        }

        using var doc = JsonDocument.Parse(responseBody);
        var root = doc.RootElement;
        var orderId = root.GetProperty("id").GetString() ?? string.Empty;
        var rzpAmount = root.GetProperty("amount").GetInt64();
        var rzpCurrency = root.GetProperty("currency").GetString() ?? "INR";
        var rzpReceipt = root.TryGetProperty("receipt", out var rElem) ? rElem.GetString() ?? receipt : receipt;

        return new RazorpayOrderResult
        {
            OrderId = orderId,
            Amount = amountInRupees,
            AmountInPaise = rzpAmount,
            Currency = rzpCurrency,
            KeyId = keyId,
            Receipt = rzpReceipt
        };
    }

    public bool VerifySignature(string orderId, string paymentId, string signature)
    {
        if (string.IsNullOrWhiteSpace(orderId) || string.IsNullOrWhiteSpace(paymentId) || string.IsNullOrWhiteSpace(signature))
        {
            return false;
        }

        var (_, keySecret) = GetCredentials();
        var payload = $"{orderId.Trim()}|{paymentId.Trim()}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(keySecret));
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var generatedSignature = Convert.ToHexString(hashBytes).ToLowerInvariant();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(generatedSignature),
            Encoding.UTF8.GetBytes(signature.Trim().ToLowerInvariant()));
    }
}
