using System;
using System.ComponentModel.DataAnnotations;

namespace EduRAG.Models
{
    public class CollectionStudent
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        // Foreign key to the collection (course)
        public Guid CollectionId { get; set; }
        public Collection? Collection { get; set; }

        // Identifier for the student (could be email or username)
        public string StudentIdentifier { get; set; } = string.Empty;

        public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    }
}
