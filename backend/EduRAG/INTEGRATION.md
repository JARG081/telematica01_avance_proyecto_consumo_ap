# EduRAG — Integration Reference (actualizado)
> Estado actual del backend en este workspace.

---

## Arquitectura actual

```
[edurag-frontend] -> /api/auth/login|register -> [API Auth externa]
[edurag-frontend] -> /api/collections|documents -> [EduRAG.CollectionsService]
[EduRAG.CollectionsService] -> valida JWT localmente (no llama API auth)
```

---

## Puertos actuales de desarrollo

| Componente | URL actual | Nota |
|---|---|---|
| API Auth externa | `http://localhost:5000` | Proyecto separado, no modificar |
| EduRAG.CollectionsService | `http://localhost:5004` | Configurado en `Properties/launchSettings.json` |
| Frontend Vite | `http://localhost:5173` | Cliente React |

Si en otro equipo cambia el puerto, actualizar variables de entorno del frontend.

---

## JWT que debe coincidir (Auth <-> Backend)

```json
{
  "Jwt": {
    "Key": "UNILLANOS.TELEMATICA1.2026.1.JWT.KEY.SECRET.32B",
    "Issuer": "MiniIdentityApi",
    "Audience": "MiniIdentityApiUsers"
  }
}
```

---

## Claims y autorización (estado real)

- El backend extrae usuario desde `sub`.
- Para rol, intenta en este orden:
  1. `role`
  2. `Role`
  3. `ClaimTypes.Role`
  4. mapeo local (`LocalRoleMappings`) por `userId`/`email`/`unique_name`

Esto se implementó porque la API auth actual no siempre emite `role` en el token.

### Mapeo local de roles en `appsettings*.json`

```json
"LocalRoleMappings": {
  "ByUserId": {},
  "ByEmail": {
    "profesor1@correo.com": "profesor",
    "usuario1@correo.com": "estudiante"
  },
  "ByUserName": {
    "admin": "profesor"
  }
}
```

> Regla adicional: si llega `Admin`, se normaliza a `profesor`.

---

## Endpoints backend (EduRAG.CollectionsService)

| Método | Ruta | Auth | Rol |
|---|---|---|---|
| GET | `/api/collections` | No | — |
| GET | `/api/collections/{id}` | No | — |
| POST | `/api/collections` | Sí | `profesor` |
| DELETE | `/api/collections/{id}` | Sí | `profesor` |
| POST | `/api/collections/{id}/documents` | Sí | `profesor` |
| DELETE | `/api/documents/{id}` | Sí | `profesor` |

---

## Frontend — cómo debe quedar

### `.env.local` recomendado hoy

```env
VITE_AUTH_API_BASE_URL=http://localhost:5000
VITE_BACKEND_BASE_URL=http://localhost:5004
VITE_TOKEN_STORAGE_KEY=accessToken
```

### Recomendación de manejo de rol en frontend

Como el token puede no traer `role`, en frontend usar:

1. `loginResponse.user.role` como fuente principal.
2. fallback a `payload.role` si existe en JWT.

Así la UI no depende de que el token traiga siempre el claim `role`.

---

## Base de datos actual y propuesta

### Actual (implementada)

- Motor: SQLite
- Archivos:
  - `edurag.dev.db` (Development)
  - `edurag.db` (base)
- Tablas actuales:
  - `Collections`
  - `Documents`

### Posible evolución recomendada

Agregar tabla de mapeo de roles para no depender de `appsettings`:

`UserRoleMappings`

- `Id` (Guid)
- `UserId` (string, nullable)
- `Email` (string, nullable)
- `UserName` (string, nullable)
- `Role` (string, `profesor|estudiante`)
- `UpdatedAt` (DateTime)

Luego `ILocalRoleResolver` puede leer desde DB en lugar de configuración estática.

---

## Prueba rápida (PowerShell)

```powershell
$auth = "http://localhost:5000"
$backend = "http://localhost:5004"

$loginBody = @{ usernameOrEmail = "profesor1"; password = "Clave123*" } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$auth/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $login.accessToken

$body = @{ name = "Coleccion prueba"; description = "ok" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$backend/api/collections" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $body
```

Esperado: `201` con usuario que resuelve a `profesor`; `403` si resuelve a `estudiante`.
