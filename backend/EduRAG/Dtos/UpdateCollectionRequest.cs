using System.ComponentModel.DataAnnotations;

namespace EduRAG.Dtos;

public class UpdateCollectionRequest
{
    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;
}
