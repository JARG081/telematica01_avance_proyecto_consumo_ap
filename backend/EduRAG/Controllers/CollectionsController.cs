using System.Security.Claims;
using EduRAG.Data;
using EduRAG.Dtos;
using EduRAG.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduRAG.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CollectionsController(EduRAGDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<Collection>>> GetCollections()
    {
        var collections = await dbContext.Collections
            .Include(c => c.Documents)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return Ok(collections);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<Collection>> GetCollection(Guid id)
    {
        var collection = await dbContext.Collections
            .Include(c => c.Documents)
            .FirstOrDefaultAsync(c => c.Id == id);

        return collection is null ? NotFound() : Ok(collection);
    }

    [HttpPost]
    [Authorize(Roles = "profesor")]
    public async Task<ActionResult<Collection>> CreateCollection([FromBody] CreateCollectionRequest request)
    {
        var userId = User.FindFirstValue("userId")
                     ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized("No se encontró userId en el token.");
        }

        var collection = new Collection
        {
            Name = request.Name,
            Description = request.Description,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Collections.Add(collection);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCollection), new { id = collection.Id }, collection);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "profesor")]
    public async Task<IActionResult> DeleteCollection(Guid id)
    {
        var collection = await dbContext.Collections.FindAsync(id);
        if (collection is null)
        {
            return NotFound();
        }

        dbContext.Collections.Remove(collection);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }
}
