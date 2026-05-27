# Respaldos de Configuración de AWS / Supabase

Este archivo contiene los valores originales de los apuntadores a servicios en la nube (AWS y Supabase) antes de realizar el cambio a despliegue local (SQLite).

## 1. Cadena de Conexión original de PostgreSQL (Supabase alojado en AWS)

Utilizada en:
- `backend/EduRAG/appsettings.json`
- `backend/EduRAG/appsettings.Development.json`
- `backend/EduRAG/publish_localdocker/appsettings.json`
- `backend/EduRAG/publish_localdocker/appsettings.Development.json`

**Valor original:**
```json
"Host=aws-1-us-west-2.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.pnftoshyyptroxcyoyib;Password=unillanosconnect;SslMode=Require;TrustServerCertificate=true"
```

---

## 2. Conexión de respaldo en EduRAGDbContext.cs

Utilizada en:
- `backend/EduRAG/Data/EduRAGDbContext.cs` en el método `OnConfiguring`

**Valor original:**
```csharp
optionsBuilder.UseNpgsql("Host=db.pnftoshyyptroxcyoyib.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=unillanosconnect;SSL Mode=Require;Trust Server Certificate=true");
```

---

## 3. Configuración de Puertos original del Dockerfile del Backend

Utilizado en:
- `backend/EduRAG/Dockerfile`

**Valor original:**
```dockerfile
ENV ASPNETCORE_URLS=http://+:8080
```
*(Nota: El puerto mapeado externamente en `docker-compose.yml` era el `5004`, lo cual creaba una incongruencia con el puerto interno `8080` de este Dockerfile)*
