using EduRAG.Models;
using Microsoft.EntityFrameworkCore;

namespace EduRAG.Data;

public class EduRAGDbContext : DbContext
{
    public EduRAGDbContext(DbContextOptions<EduRAGDbContext> options) : base(options) { }

    public DbSet<Collection> Collections => Set<Collection>();
    public DbSet<Document> Documents => Set<Document>();

    // ESTO FORZARÁ LA CONEXIÓN SIN IMPORTAR EL JSON
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            optionsBuilder.UseNpgsql("Host=db.pnftoshyyptroxcyoyib.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=unillanosconnect;SSL Mode=Require;Trust Server Certificate=true");
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Collection>()
            .HasMany(c => c.Documents)
            .WithOne()
            .HasForeignKey(d => d.CollectionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}