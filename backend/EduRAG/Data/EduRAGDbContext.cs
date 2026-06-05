using EduRAG.Models;
using Microsoft.EntityFrameworkCore;

namespace EduRAG.Data;

public class EduRAGDbContext : DbContext
{
    public EduRAGDbContext(DbContextOptions<EduRAGDbContext> options) : base(options) { }

    public DbSet<Collection> Collections => Set<Collection>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<CollectionStudent> CollectionStudents => Set<CollectionStudent>();

    // ESTO FORZARÁ LA CONEXIÓN SIN IMPORTAR EL JSON
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            optionsBuilder.UseSqlite("Data Source=edurag.db");
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Collection>()
            .HasMany(c => c.Documents)
            .WithOne(d => d.Collection)
            .HasForeignKey(d => d.CollectionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}