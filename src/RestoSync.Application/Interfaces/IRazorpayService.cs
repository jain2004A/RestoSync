namespace RestoSync.Application.Interfaces;

public class RazorpayOrderResult
{
    public string OrderId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public long AmountInPaise { get; set; }
    public string Currency { get; set; } = "INR";
    public string KeyId { get; set; } = string.Empty;
    public string Receipt { get; set; } = string.Empty;
}

public interface IRazorpayService
{
    Task<RazorpayOrderResult> CreateOrderAsync(decimal amountInRupees, string receipt, string currency = "INR", Dictionary<string, string>? notes = null);
    bool VerifySignature(string orderId, string paymentId, string signature);
    string GetKeyId();
}
