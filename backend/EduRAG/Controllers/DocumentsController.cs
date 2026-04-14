using EduRAG.Data;
using EduRAG.Dtos;
using EduRAG.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduRAG.Controllers;

[ApiController]
[Route("api")]
public class DocumentsController(EduRAGDbContext dbContext) : ControllerBase
{
    [HttpPost("collections/{id:guid}/documents")]
    [Authorize(Roles = "profesor")]
    public async Task<ActionResult<Document>> AddDocument(Guid id, [FromBody] CreateDocumentRequest request)
    {
        var collectionExists = await dbContext.Collections.AnyAsync(c => c.Id == id);
        if (!collectionExists)
        {
            return NotFound("Colección no encontrada.");
        }

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

    [HttpDelete("documents/{id:guid}")]
    [Authorize(Roles = "profesor")]
    public async Task<IActionResult> DeleteDocument(Guid id)
    {
        var document = await dbContext.Documents.FindAsync(id);
        if (document is null)
        {
            return NotFound();
        }

        dbContext.Documents.Remove(document);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }
}
