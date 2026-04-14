using EduRAG.Models;
using Microsoft.EntityFrameworkCore;

namespace EduRAG.Data;

public class EduRAGDbContext(DbContextOptions<EduRAGDbContext> options) : DbContext(options)
{
    public DbSet<Collection> Collections => Set<Collection>();
    public DbSet<Document> Documents => Set<Document>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Collection>()
            .HasMany(c => c.Documents)
            .WithOne()
            .HasForeignKey(d => d.CollectionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
