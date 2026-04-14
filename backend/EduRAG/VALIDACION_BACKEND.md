# Validación del backend (estado actual)

## 1) URLs actuales

- API Auth: `http://localhost:5000`
- Backend EduRAG: `http://localhost:5004`
- Frontend: `http://localhost:5173`

## 2) Configuración obligatoria JWT (`appsettings*.json`)

```json
"Jwt": {
  "Issuer": "MiniIdentityApi",
  "Audience": "MiniIdentityApiUsers",
  "Key": "UNILLANOS.TELEMATICA1.2026.1.JWT.KEY.SECRET.32B"
}
```

## 3) Resolución de roles (importante)

Como la API auth no siempre emite `role`, el backend hace fallback con `LocalRoleMappings`:

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

Si no hay rol en token ni en mapeo local, endpoints con `[Authorize(Roles="profesor")]` retornan `403`.

## 4) Casos de prueba mínimos

1. `GET /api/collections` sin token => `200`
2. `POST /api/collections` sin token => `401`
3. `POST /api/collections` con usuario mapeado a `estudiante` => `403`
4. `POST /api/collections` con usuario mapeado a `profesor` => `201`

## 5) Script rápido PowerShell

```powershell
$auth = "http://localhost:5000"
$backend = "http://localhost:5004"

$loginBody = @{ usernameOrEmail = "profesor1"; password = "Clave123*" } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$auth/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $login.accessToken

$createBody = @{ name = "Coleccion validacion"; description = "ok" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$backend/api/collections" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $createBody
```

## 6) Base de datos

- SQLite actual:
  - `edurag.dev.db`
  - `edurag.db`
- Tablas activas:
  - `Collections`
  - `Documents`

Propuesta siguiente fase: mover `LocalRoleMappings` a tabla `UserRoleMappings`.
