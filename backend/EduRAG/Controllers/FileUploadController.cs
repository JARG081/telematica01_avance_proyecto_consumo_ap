using System.Security.Claims;
using EduRAG.Data;
using EduRAG.Options;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace EduRAG.Controllers;

[ApiController]
[Route("api/files")]
[Authorize] // 🔒 Requiere autenticación
public class FileUploadController(
    IWebHostEnvironment environment,
    IOptions<FileStorageOptions> storageOptions,
    EduRAGDbContext dbContext) : ControllerBase
{
    private string? GetUserId() => User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    private string? GetUserEmail() => User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
    private bool IsProfesor() => User.IsInRole("profesor");

    public class UploadFileRequest
    {
        public IFormFile? File { get; set; }
        public string? CollectionId { get; set; }
    }

    [HttpPost("upload")]
    [Authorize]
    [Consumes("multipart/form-data")]
    [RequestFormLimits(MultipartBodyLengthLimit = 104857600)]
    public async Task<IActionResult> UploadWithFormData([FromForm] UploadFileRequest request)
    {
        // 🔒 Solo los profesores pueden subir archivos, incluso en carpetas generales
        if (!IsProfesor()) return Forbid("Solo los profesores pueden subir archivos.");

        // Si se proporciona collectionId, validar y guardar en la carpeta de la colección
        Guid? collectionId = null;
        if (!string.IsNullOrWhiteSpace(request.CollectionId) && Guid.TryParse(request.CollectionId, out var parsedId))
        {
            collectionId = parsedId;
            var collection = await dbContext.Collections.FindAsync(collectionId);
            if (collection == null) return NotFound("Colección no encontrada.");
            if (collection.CreatedByUserId != GetUserId()) return Forbid("No eres el dueño de este curso.");
        }

        var file = request.File;
        if (file is null || file.Length == 0) return BadRequest("Debe enviar un archivo.");

        var options = storageOptions.Value;
        if (file.Length > options.MaxFileSizeBytes) return BadRequest($"El archivo excede el límite. Tamaño recibido: {file.Length} bytes.");

        // Si no hay collectionId, guardar en carpeta "general"
        string uploadsPath;
        if (collectionId.HasValue)
        {
            uploadsPath = GetCollectionUploadsPath(collectionId.Value);
        }
        else
        {
            var basePath = storageOptions.Value.BasePath;
            var rootPath = Path.IsPathRooted(basePath) ? basePath : Path.Combine(environment.ContentRootPath, basePath);
            uploadsPath = Path.Combine(rootPath, "general");
        }

        Directory.CreateDirectory(uploadsPath);

        var originalName = Path.GetFileName(file.FileName);
        var extension = Path.GetExtension(originalName);
        var safeName = $"{Path.GetFileNameWithoutExtension(originalName)}_{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(uploadsPath, safeName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream);
        }

        return Ok(new
        {
            message = "Archivo guardado correctamente.",
            fileName = safeName,
            originalFileName = originalName,
            size = file.Length,
            storagePath = uploadsPath
        });
    }

    [HttpGet("{collectionId:guid}")]
    public async Task<IActionResult> ListUploadedFiles(Guid collectionId)
    {
        // 🔒 Validar acceso al curso antes de listar archivos físicos
        if (!await HasAccessToCollection(collectionId)) return Forbid();

        var uploadsPath = GetCollectionUploadsPath(collectionId);
        if (!Directory.Exists(uploadsPath)) return Ok(Array.Empty<object>());

        var files = Directory
            .EnumerateFiles(uploadsPath)
            .Select(path => new FileInfo(path))
            .OrderByDescending(file => file.CreationTimeUtc)
            .Select(file => new
            {
                fileName = file.Name,
                size = file.Length,
                createdAtUtc = file.CreationTimeUtc
            })
            .ToList();

        return Ok(files);
    }

    [HttpPost("{collectionId:guid}/upload")]
    [Authorize]
    [Consumes("multipart/form-data")]
    [RequestFormLimits(MultipartBodyLengthLimit = 104857600)]
    public async Task<IActionResult> Upload(Guid collectionId, [FromForm] UploadFileRequest request)
    {
        if (!IsProfesor()) return Forbid("Solo los profesores pueden subir archivos.");
        // 🔒 Validar propiedad del curso antes de permitir la subida
        var collection = await dbContext.Collections.FindAsync(collectionId);
        if (collection == null) return NotFound("Colección no encontrada.");
        if (collection.CreatedByUserId != GetUserId()) return Forbid("No eres el dueño de este curso.");

        var file = request.File;
        if (file is null || file.Length == 0) return BadRequest("Debe enviar un archivo.");

        var options = storageOptions.Value;
        if (file.Length > options.MaxFileSizeBytes) return BadRequest($"El archivo excede el límite. Tamaño recibido: {file.Length} bytes.");

        // 📁 Crear carpeta específica para esta colección
        var uploadsPath = GetCollectionUploadsPath(collectionId);
        Directory.CreateDirectory(uploadsPath);

        var originalName = Path.GetFileName(file.FileName);
        var extension = Path.GetExtension(originalName);
        var safeName = $"{Path.GetFileNameWithoutExtension(originalName)}_{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(uploadsPath, safeName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream);
        }

        return Ok(new
        {
            message = "Archivo guardado correctamente.",
            fileName = safeName,
            originalFileName = originalName,
            size = file.Length,
            storagePath = uploadsPath
        });
    }

    [HttpGet("{collectionId:guid}/{fileName}")]
    public async Task<IActionResult> GetFile(Guid collectionId, string fileName)
    {
        // 🔒 Validar acceso de lectura antes de entregar el archivo físico
        if (!await HasAccessToCollection(collectionId)) return Forbid();

        var uploadsPath = GetCollectionUploadsPath(collectionId);
        var filePath = Path.Combine(uploadsPath, fileName);

        if (!System.IO.File.Exists(filePath)) return NotFound("Archivo no encontrado.");

        var provider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
        if (!provider.TryGetContentType(filePath, out var contentType))
        {
            contentType = "application/octet-stream";
        }

        return PhysicalFile(filePath, contentType, fileName);
    }

    // --- Helpers Privados ---
    private string GetCollectionUploadsPath(Guid collectionId)
    {
        var basePath = storageOptions.Value.BasePath;
        var rootPath = Path.IsPathRooted(basePath) ? basePath : Path.Combine(environment.ContentRootPath, basePath);
        // Genera ruta: uploads/CollectionId/
        return Path.Combine(rootPath, collectionId.ToString());
    }

    private async Task<bool> HasAccessToCollection(Guid collectionId)
    {
        if (IsProfesor())
        {
            var collection = await dbContext.Collections.FindAsync(collectionId);
            return collection?.CreatedByUserId == GetUserId();
        }
        else
        {
            return await dbContext.CollectionStudents.AnyAsync(cs => cs.CollectionId == collectionId && cs.StudentIdentifier == GetUserEmail());
        }
    }
}