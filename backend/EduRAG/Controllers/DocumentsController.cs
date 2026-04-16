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

    [HttpGet("documents/{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<Document>> GetDocument(Guid id)
    {
        var document = await dbContext.Documents.FindAsync(id);
        return document is null ? NotFound() : Ok(document);
    }

    [HttpPut("documents/{id:guid}")]
    [Authorize(Roles = "profesor")]
    public async Task<ActionResult<Document>> UpdateDocument(Guid id, [FromBody] UpdateDocumentRequest request)
    {
        var document = await dbContext.Documents.FindAsync(id);
        if (document is null)
        {
            return NotFound();
        }

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
        if (document is null)
        {
            return NotFound();
        }

        dbContext.Documents.Remove(document);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }
}
