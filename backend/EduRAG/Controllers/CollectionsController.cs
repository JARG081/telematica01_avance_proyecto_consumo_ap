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
        var userId = User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        var isProfesor = User.IsInRole("profesor");
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");

        var query = dbContext.Collections
            .Include(c => c.Documents)
            .AsQueryable();

        if (isProfesor && !string.IsNullOrWhiteSpace(userId))
        {
            query = query.Where(c => c.CreatedByUserId == userId);
        }
        else if (!string.IsNullOrWhiteSpace(userEmail))
        {
            query = query.Where(c => c.EnrolledStudents.Any(es => es.StudentIdentifier == userEmail));
        }

        var collections = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
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

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "profesor")]
    public async Task<ActionResult<Collection>> UpdateCollection(Guid id, [FromBody] UpdateCollectionRequest request)
    {
        var collection = await dbContext.Collections.FindAsync(id);
        if (collection is null)
        {
            return NotFound();
        }

        collection.Name = request.Name;
        collection.Description = request.Description;

        await dbContext.SaveChangesAsync();

        return Ok(collection);
    }

    // GET: api/collections/{id}/students
    [HttpGet("{id:guid}/students")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<CollectionStudent>>> GetEnrolledStudents(Guid id)
    {
        var collection = await dbContext.Collections
            .Include(c => c.EnrolledStudents)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (collection == null)
            return NotFound();

        return Ok(collection.EnrolledStudents);
    }

    // POST: api/collections/{id}/students
    [HttpPost("{id:guid}/students")]
    [Authorize(Roles = "profesor")]
    public async Task<ActionResult> EnrollStudent(Guid id, [FromBody] EnrollStudentRequest request)
    {
        var collection = await dbContext.Collections.FindAsync(id);
        if (collection == null)
            return NotFound();

        var enrollment = new CollectionStudent
        {
            CollectionId = id,
            StudentIdentifier = request.StudentEmail,
            EnrolledAt = DateTime.UtcNow
        };
        dbContext.CollectionStudents.Add(enrollment);
        await dbContext.SaveChangesAsync();
        return Ok(enrollment);
    }

    // DELETE: api/collections/{id}/students/{studentId}
    [HttpDelete("{id:guid}/students/{studentId:guid}")]
    [Authorize(Roles = "profesor")]
    public async Task<IActionResult> RemoveStudent(Guid id, Guid studentId)
    {
        var enrollment = await dbContext.CollectionStudents.FirstOrDefaultAsync(cs => cs.Id == studentId && cs.CollectionId == id);
        if (enrollment == null)
            return NotFound();

        dbContext.CollectionStudents.Remove(enrollment);
        await dbContext.SaveChangesAsync();
        return NoContent();
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
