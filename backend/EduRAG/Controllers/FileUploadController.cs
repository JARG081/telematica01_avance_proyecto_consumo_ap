using EduRAG.Options;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace EduRAG.Controllers;

[ApiController]
[Route("api/files")]
public class FileUploadController(
    IWebHostEnvironment environment,
    IOptions<FileStorageOptions> storageOptions) : ControllerBase
{
    public class UploadFileRequest
    {
        public IFormFile? File { get; set; }
    }

    [HttpGet]
    [AllowAnonymous]
    public IActionResult ListUploadedFiles()
    {
        var options = storageOptions.Value;
        var basePath = options.BasePath;
        var uploadsPath = Path.IsPathRooted(basePath)
            ? basePath
            : Path.Combine(environment.ContentRootPath, basePath);

        if (!Directory.Exists(uploadsPath))
        {
            return Ok(Array.Empty<object>());
        }

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

    [HttpPost("upload")]
    [AllowAnonymous]
    [Consumes("multipart/form-data")]
    [RequestFormLimits(MultipartBodyLengthLimit = 104857600)]
    public async Task<IActionResult> Upload([FromForm] UploadFileRequest request)
    {
        var file = request.File;
        if (file is null || file.Length == 0)
        {
            return BadRequest("Debe enviar un archivo.");
        }

        var options = storageOptions.Value;
        if (file.Length > options.MaxFileSizeBytes)
        {
            return BadRequest($"El archivo excede el límite de 100 MB. Tamaño recibido: {file.Length} bytes.");
        }

        var basePath = options.BasePath;
        var uploadsPath = Path.IsPathRooted(basePath)
            ? basePath
            : Path.Combine(environment.ContentRootPath, basePath);

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
}
