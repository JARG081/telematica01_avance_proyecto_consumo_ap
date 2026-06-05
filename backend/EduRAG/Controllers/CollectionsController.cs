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
[Authorize] // 🔒 CAMBIO 1: Protegemos TODO el controlador a nivel global. Nadie sin JWT entra.
public class CollectionsController(EduRAGDbContext dbContext) : ControllerBase
{
    private string? GetUserId() => User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    private string? GetUserEmail() => User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
    private bool IsProfesor() => User.IsInRole("profesor");

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Collection>>> GetCollections()
    {
        var userId = GetUserId();
        var userEmail = GetUserEmail();
        var isProfesor = IsProfesor();

        var query = dbContext.Collections
            .Include(c => c.Documents)
            .AsQueryable();

        // 🔒 CAMBIO 2: Filtrado estricto. Si no cae en ninguna categoría, no ve nada.
        if (isProfesor && !string.IsNullOrWhiteSpace(userId))
        {
            query = query.Where(c => c.CreatedByUserId == userId); // El profe solo ve sus cursos
        }
        else if (!string.IsNullOrWhiteSpace(userEmail))
        {
            query = query.Where(c => c.EnrolledStudents.Any(es => es.StudentIdentifier == userEmail)); // El estudiante solo ve donde está matriculado
        }
        else
        {
            return Ok(new List<Collection>()); // Retorna vacío si no hay claims válidos
        }

        var collections = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return Ok(collections);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Collection>> GetCollection(Guid id)
    {
        var collection = await dbContext.Collections
            .Include(c => c.Documents)
            .Include(c => c.EnrolledStudents)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (collection is null) return NotFound();

        // 🔒 CAMBIO 3: Evitar que un alumno o profe entre a un curso ajeno por URL directa
        var userId = GetUserId();
        var userEmail = GetUserEmail();

        if (IsProfesor())
        {
            if (collection.CreatedByUserId != userId) return Forbid("No eres el dueño de este curso.");
        }
        else
        {
            if (!collection.EnrolledStudents.Any(es => es.StudentIdentifier == userEmail))
                return Forbid("No estás matriculado en este curso.");
        }

        return Ok(collection);
    }

    [HttpPost]
    [Authorize(Roles = "profesor")]
    public async Task<ActionResult<Collection>> CreateCollection([FromBody] CreateCollectionRequest request)
    {
        var userId = GetUserId();
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized("No se encontró userId en el token.");

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
        if (collection is null) return NotFound();

        // 🔒 CAMBIO 4: Validar propiedad antes de modificar
        if (collection.CreatedByUserId != GetUserId()) return Forbid("Solo el creador puede editar el curso.");

        collection.Name = request.Name;
        collection.Description = request.Description;

        await dbContext.SaveChangesAsync();
        return Ok(collection);
    }

    [HttpGet("{id:guid}/students")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<CollectionStudent>>> GetEnrolledStudents(Guid id)
    {
        var collection = await dbContext.Collections
            .Include(c => c.EnrolledStudents)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (collection == null) return NotFound();

        // Profesores solo ven alumnos de SUS cursos, alumnos matriculados pueden ver a sus compañeros
        if (IsProfesor() && collection.CreatedByUserId != GetUserId()) return Forbid();
        if (!IsProfesor() && !collection.EnrolledStudents.Any(es => es.StudentIdentifier == GetUserEmail())) return Forbid();

        return Ok(collection.EnrolledStudents);
    }

    [HttpPost("{id:guid}/students")]
    [Authorize(Roles = "profesor")]
    public async Task<ActionResult> EnrollStudent(Guid id, [FromBody] EnrollStudentRequest request)
    {
        var collection = await dbContext.Collections.Include(c => c.EnrolledStudents).FirstOrDefaultAsync(c => c.Id == id);
        if (collection == null) return NotFound();

        // 🔒 Validar propiedad
        if (collection.CreatedByUserId != GetUserId()) return Forbid("Solo el creador puede matricular alumnos.");

        // Evitar duplicados
        if (collection.EnrolledStudents.Any(es => es.StudentIdentifier == request.StudentEmail))
            return BadRequest("El estudiante ya está matriculado en este curso.");

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

    [HttpDelete("{id:guid}/students/{studentId:guid}")]
    [Authorize(Roles = "profesor")]
    public async Task<IActionResult> RemoveStudent(Guid id, Guid studentId)
    {
        var collection = await dbContext.Collections.FindAsync(id);
        if (collection == null) return NotFound();

        if (collection.CreatedByUserId != GetUserId()) return Forbid();

        var enrollment = await dbContext.CollectionStudents.FirstOrDefaultAsync(cs => cs.Id == studentId && cs.CollectionId == id);
        if (enrollment == null) return NotFound();

        dbContext.CollectionStudents.Remove(enrollment);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "profesor")]
    public async Task<IActionResult> DeleteCollection(Guid id)
    {
        var collection = await dbContext.Collections.FindAsync(id);
        if (collection is null) return NotFound();

        if (collection.CreatedByUserId != GetUserId()) return Forbid();

        dbContext.Collections.Remove(collection);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }
}