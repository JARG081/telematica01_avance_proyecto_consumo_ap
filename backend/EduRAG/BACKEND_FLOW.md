# Flujo detallado del backend

Este documento resume cómo funciona el backend actual del proyecto en desarrollo local y Docker.

## 1. Componentes

El sistema está compuesto por tres servicios:

- `mini-identity-api` (`http://localhost:5132`): autenticación y emisión de JWT.
- `edurag-backend` (`http://localhost:5004`): dominio de colecciones/documentos.
- `edurag-frontend` (`http://localhost:5173`): cliente React.

## 2. Responsabilidades por API

### 2.1 `mini-identity-api`

- Expone endpoints de auth (`register`, `login`).
- Emite tokens JWT usados por `edurag-backend`.
- Swagger habilitado en `Development` en `/swagger/index.html`.
- Registro duplicado retorna `409 Conflict` (no `500`).

### 2.2 `edurag-backend`

- Expone endpoints de negocio (`/api/collections`, `/api/documents`, etc.).
- Valida JWT de forma local con `JwtBearer`.
- Aplica autorización por rol (`[Authorize(Roles = "profesor")]`).
- Swagger habilitado en `Development` en `/swagger/index.html`.

## 3. Flujo de autenticación/autorización en `edurag-backend`

En `Program.cs`:

1. Se configura `AddAuthentication().AddJwtBearer(...)`.
2. Se valida token con:
   - `Issuer`
   - `Audience`
   - `SigningKey`
   - `Lifetime`
3. En `OnTokenValidated`, el backend resuelve el rol del usuario:
   - Primero busca claims: `role`, `Role`, `ClaimTypes.Role`.
   - Si no existe, usa `ILocalRoleResolver` con `userId/sub`, `email`, `unique_name`.
   - Si encuentra `Admin`, lo normaliza a `profesor`.
4. Inyecta claims de rol faltantes (`role` y `ClaimTypes.Role`) para que la autorización por roles funcione de forma consistente.

## 4. Flujo de base de datos en `edurag-backend`

`Program.cs` selecciona el proveedor según `ConnectionStrings:DefaultConnection`:

- Si contiene `Data Source=` → usa `SQLite`.
- En caso contrario → usa `PostgreSQL` (`Npgsql`).

Al iniciar la app:

- `SQLite`: `EnsureCreatedAsync()`.
- `PostgreSQL`: `MigrateAsync()` con timeout de 30s.
- Si hay fallo de inicialización, se registra `Warning` en consola.

## 5. Pipeline HTTP de `edurag-backend`

Orden actual:

1. `UseSwagger` / `UseSwaggerUI` (solo `Development`).
2. `UseStaticFiles`.
3. `UseCors("Frontend")`.
4. `UseAuthentication`.
5. `UseAuthorization`.
6. `MapControllers`.

## 6. CORS

La policy `Frontend` permite origen:

- `http://localhost:5173`

Con:

- `AllowAnyHeader()`
- `AllowAnyMethod()`

## 7. Endpoints clave del dominio

### `CollectionsController`

- `GET /api/collections`:
  - Público (`AllowAnonymous`).
  - Incluye documentos relacionados.
  - Orden por `CreatedAt` descendente.

- `GET /api/collections/{id}`:
  - Público (`AllowAnonymous`).
  - Retorna colección + documentos.

- `POST /api/collections`:
  - Requiere rol `profesor`.
  - Obtiene usuario desde claims (`userId`, `NameIdentifier`, `sub`).
  - Crea colección con `CreatedByUserId` y `CreatedAt`.

- `PUT /api/collections/{id}` y `DELETE /api/collections/{id}`:
  - Restringidos a rol `profesor`.

## 8. Flujo funcional de extremo a extremo

1. Frontend registra o autentica usuario en `mini-identity-api`.
2. Recibe `accessToken` JWT.
3. Frontend envía token a `edurag-backend` en `Authorization: Bearer ...`.
4. `edurag-backend` valida token, completa rol si falta, y autoriza endpoint.
5. Si el endpoint requiere `profesor`, solo continúa si el rol final coincide.

## 9. Estado validado en Docker

En validaciones recientes:

- `mini-identity-api` Swagger: `200`.
- `edurag-backend` Swagger: `200`.
- `GET /api/collections`: `200`.
- Frontend: `200`.
- Registro duplicado en auth: `201` primera vez, `409` segunda vez.

---

Si se cambia la estrategia de despliegue (por ejemplo, volver a PostgreSQL en Docker con servicio DB interno), actualizar este documento para mantenerlo alineado con la configuración real.
