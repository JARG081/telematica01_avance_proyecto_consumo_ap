# Flujo global del proyecto EduRAG

Este documento describe el funcionamiento **end-to-end** del proyecto completo (frontend + APIs + persistencia) para servir como base de un diagrama de aplicaciones.

## 1. Vista general

El sistema está compuesto por 3 aplicaciones principales:

1. `edurag-frontend` (React + Vite)  
   - URL local: `http://localhost:5173`
2. `mini-identity-api` (.NET)  
   - URL local: `http://localhost:5132`
3. `edurag-backend` (.NET)  
   - URL local: `http://localhost:5004`

En ejecución con Docker, `docker-compose.yml` levanta estos 3 servicios y publica los mismos puertos al host.

---

## 2. Rol de cada aplicación

## 2.1 `edurag-frontend`

- Maneja UI de autenticación (`/login`, `/register`) y panel principal (`/dashboard`).
- Consume dos APIs:
  - `mini-identity-api` para registro/login.
  - `edurag-backend` para colecciones, documentos y carga de archivos.
- Guarda el JWT en `localStorage` (`token`).
- Incluye el token automáticamente en `Authorization: Bearer ...` en peticiones al backend de dominio.

## 2.2 `mini-identity-api`

- Servicio de identidad/autenticación.
- Endpoints principales:
  - `POST /api/Auth/register`
  - `POST /api/Auth/login`
- Emite JWT para el frontend.
- Tiene CORS habilitado para `http://localhost:5173`.
- Usa repositorios en memoria para usuarios/roles (estado no persistente entre reinicios).

## 2.3 `edurag-backend`

- Servicio de dominio funcional EduRAG.
- Endpoints para:
  - Gestión de colecciones (`/api/collections`)
  - Gestión de documentos (`/api/collections/{id}/documents`, `/api/documents/{id}`)
  - Carga de archivos (`/api/files/upload`)
- Valida JWT localmente con `JwtBearer`.
- Aplica autorización por rol (`profesor`) en operaciones de escritura.
- Tiene CORS habilitado para `http://localhost:5173`.

---

## 3. Flujo principal de autenticación y autorización

1. Usuario abre `edurag-frontend`.
2. Si no tiene token, la ruta protegida redirige a `/login`.
3. En login/register, frontend llama a `mini-identity-api`.
4. En login exitoso, frontend recibe `accessToken` JWT y lo guarda en `localStorage`.
5. Frontend consume `edurag-backend` enviando `Authorization: Bearer <token>`.
6. `edurag-backend` valida firma/issuer/audience/lifetime del JWT.
7. Backend normaliza/inyecta claims de rol cuando hace falta:
   - Busca `role`, `Role` o `ClaimTypes.Role`.
   - Si no existe, resuelve rol por mapeos locales (`userId`, `email`, `userName`).
   - Si detecta `Admin`, lo transforma a `profesor`.
8. Si endpoint requiere `[Authorize(Roles = "profesor")]`, solo permite acceso con rol final `profesor`.

---

## 4. Flujo funcional del dominio

## 4.1 Colecciones

- `GET /api/collections` y `GET /api/collections/{id}`: públicos.
- `POST`, `PUT`, `DELETE /api/collections...`: requieren rol `profesor`.
- Al crear colección se registra:
  - `CreatedByUserId` (tomado de claims)
  - `CreatedAt` (UTC)

## 4.2 Documentos

- `POST /api/collections/{id}/documents`: requiere `profesor`.
- `GET /api/documents/{id}`: público.
- `PUT` / `DELETE /api/documents/{id}`: requieren `profesor`.

## 4.3 Archivos

- `POST /api/files/upload`: recibe `multipart/form-data`.
- Guarda el archivo en ruta local configurada (`FileStorageOptions`).
- Retorna metadatos del archivo guardado.

---

## 5. Persistencia y datos

`edurag-backend` decide proveedor de base de datos según `ConnectionStrings:DefaultConnection`:

- Si contiene `Data Source=` → usa SQLite.
- Si no → usa PostgreSQL (`Npgsql`).

Inicialización al arrancar:

- SQLite: `EnsureCreatedAsync()`.
- PostgreSQL: `MigrateAsync()` con timeout de 30s.

`mini-identity-api` usa almacenamiento en memoria para usuarios/roles (con seed inicial de `Admin`).

---

## 6. Flujo de despliegue con Docker Compose

`docker-compose.yml` define:

- `mini-identity-api` expuesto en `5132`.
- `edurag-backend` expuesto en `5004`.
- `edurag-frontend` expuesto en `5173`.

Dependencias declaradas:

- frontend depende de `mini-identity-api` y `edurag-backend`.

Resultado esperado del flujo en contenedores:

1. Navegador consume frontend (`5173`).
2. Frontend consume auth API (`5132`).
3. Frontend consume API de dominio (`5004`).
4. API de dominio persiste en SQLite o PostgreSQL según configuración activa.

---

## 7. Elementos recomendados para el diagrama de aplicaciones

Para un diagrama claro, usar estos nodos y conexiones:

### Nodos

- Usuario (browser)
- `edurag-frontend` (React)
- `mini-identity-api` (.NET Auth)
- `edurag-backend` (.NET Domain)
- DB de `edurag-backend` (SQLite o PostgreSQL)
- File Storage local del backend

### Conexiones

- Usuario → Frontend (HTTP)
- Frontend → Identity API (`/api/Auth/register`, `/api/Auth/login`)
- Frontend → Domain API (`/api/collections`, `/api/documents`, `/api/files/upload`)
- Domain API → DB (lectura/escritura)
- Domain API → File Storage (escritura de archivos)

### Reglas clave anotables

- JWT emitido por Identity API y consumido por Domain API.
- Operaciones de escritura en dominio requieren rol `profesor`.
- CORS de ambas APIs permite frontend en `http://localhost:5173`.

---

## 8. Secuencia E2E resumida

1. Usuario inicia sesión en frontend.
2. Frontend obtiene JWT desde `mini-identity-api`.
3. Frontend llama endpoints de `edurag-backend` con bearer token.
4. Backend valida JWT y resuelve rol.
5. Si autorización es válida, ejecuta lógica de dominio y persiste datos.
6. Frontend actualiza vista con respuesta del backend.

---

Si se modifica la arquitectura (puertos, DB, nuevos servicios, gateway, colas, almacenamiento externo), actualizar este archivo antes de redibujar diagramas.
