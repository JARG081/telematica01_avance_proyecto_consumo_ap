namespace EduRAG.Options;

public class FileStorageOptions
{
    public const string SectionName = "FileStorage";
    public string BasePath { get; set; } = "UploadedFiles";
    public long MaxFileSizeBytes { get; set; } = 104857600;
}
