using System.Security.Claims;
using EduRAG.Data;
using EduRAG.Dtos;
using EduRAG.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduRAG.Controllers;

[ApiController]
[Route("api")]
[Authorize] // 🔒 Protegemos todo el controlador
public class DocumentsController(EduRAGDbContext dbContext) : ControllerBase
{
    private string? GetUserId() => User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    private string? GetUserEmail() => User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
    private bool IsProfesor() => User.IsInRole("profesor");

    [HttpPost("collections/{id:guid}/documents")]
    [Authorize(Roles = "profesor")]
    public async Task<ActionResult<Document>> AddDocument(Guid id, [FromBody] CreateDocumentRequest request)
    {
        var collection = await dbContext.Collections.FindAsync(id);
        if (collection == null) return NotFound("Colección no encontrada.");

        // 🔒 Validar propiedad: ¿Es el dueño del curso?
        if (collection.CreatedByUserId != GetUserId()) return Forbid("Solo el dueño del curso puede agregar documentos.");

        var document = new Document
        {
            Title = request.Title,
            Type = request.Type,
            Description = request.Description,
            CollectionId = id,
            UploadedAt = DateTime.UtcNow
        };

        dbContext.Documents.Add(document);
        await dbContext.SaveChangesAsync();

        return Created($"/api/documents/{document.Id}", document);
    }

    [HttpGet("documents")]
    public async Task<ActionResult<IEnumerable<Document>>> GetAllDocuments()
    {
        var userId = GetUserId();
        var userEmail = GetUserEmail();
        var isProfesor = IsProfesor();

        IQueryable<Document> query = dbContext.Documents;

        if (isProfesor && !string.IsNullOrWhiteSpace(userId))
        {
            // Profesor: solo sus documentos (de sus colecciones)
            query = query.Where(d => d.Collection.CreatedByUserId == userId);
        }
        else if (!string.IsNullOrWhiteSpace(userEmail))
        {
            // Estudiante: documentos de colecciones en las que está matriculado
            query = query.Where(d => d.Collection.EnrolledStudents.Any(es => es.StudentIdentifier == userEmail));
        }
        else
        {
            // Sin claims válidos: retornar vacío
            return Ok(new List<Document>());
        }

        var documents = await query
            .Include(d => d.Collection)
            .OrderByDescending(d => d.UploadedAt)
            .ToListAsync();

        return Ok(documents);
    }

    [HttpGet("documents/{id:guid}")]
    public async Task<ActionResult<Document>> GetDocument(Guid id)
    {
        var document = await dbContext.Documents.FindAsync(id);
        if (document is null) return NotFound();

        // 🔒 Validar acceso de lectura buscando la colección manualmente
        if (IsProfesor())
        {
            var collection = await dbContext.Collections.FindAsync(document.CollectionId);
            if (collection?.CreatedByUserId != GetUserId()) return Forbid();
        }
        else
        {
            var isEnrolled = await dbContext.CollectionStudents
                .AnyAsync(cs => cs.CollectionId == document.CollectionId && cs.StudentIdentifier == GetUserEmail());
            if (!isEnrolled) return Forbid();
        }

        return Ok(document);
    }

    [HttpPut("documents/{id:guid}")]
    [Authorize(Roles = "profesor")]
    public async Task<ActionResult<Document>> UpdateDocument(Guid id, [FromBody] UpdateDocumentRequest request)
    {
        var document = await dbContext.Documents.FindAsync(id);
        if (document is null) return NotFound();

        // 🔒 Validar propiedad buscando la colección manualmente
        var collection = await dbContext.Collections.FindAsync(document.CollectionId);
        if (collection?.CreatedByUserId != GetUserId()) return Forbid("Solo el creador puede editar documentos.");

        document.Title = request.Title;
        document.Type = request.Type;
        document.Description = request.Description;

        await dbContext.SaveChangesAsync();

        return Ok(document);
    }

    [HttpDelete("documents/{id:guid}")]
    [Authorize(Roles = "profesor")]
    public async Task<IActionResult> DeleteDocument(Guid id)
    {
        var document = await dbContext.Documents.FindAsync(id);
        if (document is null) return NotFound();

        // 🔒 Validar propiedad buscando la colección manualmente
        var collection = await dbContext.Collections.FindAsync(document.CollectionId);
        if (collection?.CreatedByUserId != GetUserId()) return Forbid("Solo el creador puede eliminar documentos.");

        dbContext.Documents.Remove(document);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }
}