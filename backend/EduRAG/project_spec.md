Create a full MVP application called EduRAG using a microservices approach.

IMPORTANT CONTEXT:
- There is an external authentication API already implemented.
- It provides /login and /register endpoints.
- It returns a JWT token with userId and role (profesor or estudiante).
- DO NOT implement authentication in the backend.
- The backend must ONLY validate JWT tokens.

----------------------------------------
BACKEND REQUIREMENTS (.NET 8 Web API)
----------------------------------------

Create a Web API project called EduRAG.CollectionsService.

Use:
- .NET 8
- Entity Framework Core
- SQLite
- JWT authentication (validate external tokens)

Models:

Collection:
- Id (Guid)
- Name (string)
- Description (string)
- CreatedByUserId (string)
- CreatedAt (DateTime)
- Documents (List<Document>)

Document:
- Id (Guid)
- Title (string)
- Type (string) (PDF, PPTX, DOCX)
- Description (string)
- CollectionId (Guid)
- UploadedAt (DateTime)

Endpoints:

Collections:
- GET    /api/collections
- GET    /api/collections/{id}
- POST   /api/collections          (profesor only)
- DELETE /api/collections/{id}     (profesor only)

Documents:
- POST   /api/collections/{id}/documents   (profesor only)
- DELETE /api/documents/{id}               (profesor only)

Rules:
- All endpoints except GET require JWT
- Use role-based authorization
- Extract userId from JWT
- Configure CORS for http://localhost:5173

----------------------------------------
FRONTEND REQUIREMENTS (React + Vite)
----------------------------------------

Create a React app using Vite.

Pages:

1. /login
- Call external API /login
- Store JWT in localStorage
- Redirect to /dashboard

2. /register
- Call external API /register

3. /dashboard
- Fetch collections from backend
- Show create button only if role = profesor

4. /collections/:id
- Show documents
- Allow add/delete only if profesor

Rules:
- Use axios
- Use react-router-dom
- Decode JWT to get role
- Send Authorization: Bearer <token>

----------------------------------------
GOAL
----------------------------------------

Generate:
- Backend structure (Controllers, Models, DbContext)
- Frontend structure (pages, routing, API calls)
- Working integration between frontend and backend
- Clean, minimal MVP (not overengineered)