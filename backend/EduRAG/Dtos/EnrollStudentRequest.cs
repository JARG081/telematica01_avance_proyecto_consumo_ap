using System.ComponentModel.DataAnnotations;

namespace EduRAG.Dtos;

public class EnrollStudentRequest
{
    [Required]
    [EmailAddress]
    public string StudentEmail { get; set; } = string.Empty;
}
