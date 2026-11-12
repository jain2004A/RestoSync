using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;
using RestoSync.Application.Interfaces;
using RestoSync.Domain.Entities;

namespace RestoSync.API.Controllers;

[ApiController]
[Route("api/superadmin/enquiries")]
[Authorize(Roles = "SuperAdmin")]
public class SuperAdminEnquiriesController : ControllerBase
{
    private readonly IMongoDbContext _context;
    private readonly ILogger<SuperAdminEnquiriesController> _logger;

    public SuperAdminEnquiriesController(IMongoDbContext context, ILogger<SuperAdminEnquiriesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get paginated demo enquiries and summary counts
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetEnquiries(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 15)
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 15;
            if (pageSize > 100) pageSize = 100;

            var builder = Builders<PublicEnquiry>.Filter;
            var filter = builder.Empty;

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                var searchFilter = builder.Or(
                    builder.Regex(e => e.Name, new BsonRegularExpression(s, "i")),
                    builder.Regex(e => e.Email, new BsonRegularExpression(s, "i")),
                    builder.Regex(e => e.Phone, new BsonRegularExpression(s, "i")),
                    builder.Regex(e => e.BusinessName, new BsonRegularExpression(s, "i")),
                    builder.Regex(e => e.City, new BsonRegularExpression(s, "i"))
                );
                filter &= searchFilter;
            }

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                filter &= builder.Eq(e => e.Status, status.Trim());
            }

            var totalItems = await _context.Enquiries.CountDocumentsAsync(filter);
            var totalPages = (int)Math.Ceiling((double)totalItems / pageSize);

            var enquiries = await _context.Enquiries
                .Find(filter)
                .SortByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();

            // Summary metrics
            var allEnquiries = await _context.Enquiries.Find(_ => true).ToListAsync();
            var summary = new
            {
                total = allEnquiries.Count,
                newCount = allEnquiries.Count(e => e.Status == "New"),
                contactedCount = allEnquiries.Count(e => e.Status == "Contacted"),
                scheduledCount = allEnquiries.Count(e => e.Status == "Demo Scheduled"),
                convertedCount = allEnquiries.Count(e => e.Status == "Converted"),
                closedCount = allEnquiries.Count(e => e.Status == "Closed")
            };

            return Ok(new
            {
                success = true,
                data = enquiries,
                summary,
                pagination = new
                {
                    currentPage = page,
                    pageSize,
                    totalItems,
                    totalPages
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching demo enquiries for SuperAdmin");
            return StatusCode(500, new { success = false, message = "Failed to fetch demo enquiries: " + ex.Message });
        }
    }

    /// <summary>
    /// Get single enquiry details
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetEnquiryById(string id)
    {
        try
        {
            var enquiry = await _context.Enquiries.Find(e => e.Id == id).FirstOrDefaultAsync();
            if (enquiry == null)
            {
                return NotFound(new { success = false, message = "Enquiry not found" });
            }

            return Ok(new { success = true, data = enquiry });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching enquiry {Id}", id);
            return StatusCode(500, new { success = false, message = "Failed to fetch enquiry: " + ex.Message });
        }
    }

    /// <summary>
    /// Update enquiry status, demo link, scheduled time, notes, and assignment
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEnquiry(string id, [FromBody] UpdateEnquiryDto request)
    {
        try
        {
            var enquiry = await _context.Enquiries.Find(e => e.Id == id).FirstOrDefaultAsync();
            if (enquiry == null)
            {
                return NotFound(new { success = false, message = "Enquiry not found" });
            }

            var updateDef = Builders<PublicEnquiry>.Update;
            var updates = new List<UpdateDefinition<PublicEnquiry>>();

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                updates.Add(updateDef.Set(e => e.Status, request.Status.Trim()));
            }

            if (request.DemoLink != null)
            {
                updates.Add(updateDef.Set(e => e.DemoLink, request.DemoLink.Trim()));
            }

            if (request.ScheduledAt.HasValue)
            {
                updates.Add(updateDef.Set(e => e.ScheduledAt, request.ScheduledAt.Value));
            }
            else if (request.ClearScheduledAt == true)
            {
                updates.Add(updateDef.Set<DateTime?>(e => e.ScheduledAt, null));
            }

            if (request.Notes != null)
            {
                updates.Add(updateDef.Set(e => e.Notes, request.Notes.Trim()));
            }

            if (request.AssignedTo != null)
            {
                updates.Add(updateDef.Set(e => e.AssignedTo, request.AssignedTo.Trim()));
            }

            if (updates.Count > 0)
            {
                var combined = updateDef.Combine(updates);
                await _context.Enquiries.UpdateOneAsync(e => e.Id == id, combined);
            }

            var updatedEnquiry = await _context.Enquiries.Find(e => e.Id == id).FirstOrDefaultAsync();
            return Ok(new
            {
                success = true,
                message = "Enquiry updated successfully.",
                data = updatedEnquiry
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating enquiry {Id}", id);
            return StatusCode(500, new { success = false, message = "Failed to update enquiry: " + ex.Message });
        }
    }

    /// <summary>
    /// Delete enquiry
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEnquiry(string id)
    {
        try
        {
            var res = await _context.Enquiries.DeleteOneAsync(e => e.Id == id);
            if (res.DeletedCount == 0)
            {
                return NotFound(new { success = false, message = "Enquiry not found" });
            }

            return Ok(new { success = true, message = "Enquiry deleted successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting enquiry {Id}", id);
            return StatusCode(500, new { success = false, message = "Failed to delete enquiry: " + ex.Message });
        }
    }
}

public class UpdateEnquiryDto
{
    public string? Status { get; set; }
    public string? DemoLink { get; set; }
    public DateTime? ScheduledAt { get; set; }
    public bool? ClearScheduledAt { get; set; }
    public string? Notes { get; set; }
    public string? AssignedTo { get; set; }
}
