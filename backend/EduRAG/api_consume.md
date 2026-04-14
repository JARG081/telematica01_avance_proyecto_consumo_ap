7) Project Integration Context (EduRAG)
--------------------------------------

This section describes how the external authentication system integrates with the EduRAG MVP project.

### Backend (EduRAG.CollectionsService)

- Technology: .NET 8 Web API
- Base URL: http://localhost:5000

Available endpoints:

Collections:
- GET    /api/collections
- GET    /api/collections/{id}
- POST   /api/collections              (profesor only)
- DELETE /api/collections/{id}         (profesor only)

Documents:
- POST   /api/collections/{id}/documents   (profesor only)
- DELETE /api/documents/{id}               (profesor only)

Authentication:
- All endpoints except GET require JWT
- JWT is issued by external authentication API
- Backend validates JWT locally (does not call auth API)

### Frontend (React + Vite)

- Base URL: http://localhost:5173

Responsibilities:
- Handle login/register via external auth API
- Store JWT in localStorage
- Decode JWT to get role
- Send JWT to backend in Authorization header

### Role Behavior in UI

- profesor:
  - Can create collections
  - Can delete collections
  - Can add/remove documents

- estudiante:
  - Can only view collections and documents

### Example Integration Flow

1. User logs in via external API
2. Frontend stores JWT
3. Frontend requests: GET /api/collections
4. Backend validates JWT
5. Backend returns collections
6. UI renders data based on role

### Notes for Developers

- Do NOT implement login/register in backend
- Do NOT call external auth API from backend
- Always send Authorization header
- Always validate roles in protected endpoints