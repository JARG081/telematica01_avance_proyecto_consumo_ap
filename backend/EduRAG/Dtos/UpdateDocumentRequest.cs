using System.ComponentModel.DataAnnotations;

namespace EduRAG.Dtos;

public class UpdateDocumentRequest
{
    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(PDF|PPTX|DOCX)$", ErrorMessage = "Type debe ser PDF, PPTX o DOCX")]
    public string Type { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;
}
