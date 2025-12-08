# API Documentation

## Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication
Most endpoints require authentication via Supabase session cookies.

### Headers
```
Cookie: sb-access-token=<token>
X-CSRF-Token: <token>
```

---

## Health Check

### GET `/api/health`
Check system status and service availability.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-12-07T08:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 86400,
  "services": {
    "database": { "status": "connected", "latency": 45 },
    "stripe": { "status": "configured" },
    "maps": { "status": "configured" }
  }
}
```

---

## GDPR Endpoints

### GET `/api/gdpr/export`
Export all user data (GDPR right to access).

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00.000Z",
    "export_date": "2024-12-07T08:00:00.000Z",
    "data": {
      "profile": { ... },
      "apartments": [ ... ],
      "favorites": [ ... ],
      "messages": [ ... ],
      "reviews": [ ... ]
    }
  }
}
```

### DELETE `/api/gdpr/delete`
Permanently delete all user data (GDPR right to be forgotten).

**Authentication**: Required

**Request Body**:
```json
{
  "confirmation": "DELETE"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "user_id": "uuid"
  },
  "message": "All user data has been permanently deleted"
}
```

---

## Response Format

All API endpoints follow a standardized format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": { ... },
    "statusCode": 404
  }
}
```

### Error Codes
- `BAD_REQUEST` (400): Invalid input
- `UNAUTHORIZED` (401): Not authenticated
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource doesn't exist
- `CONFLICT` (409): Resource already exists
- `TOO_MANY_REQUESTS` (429): Rate limit exceeded
- `INTERNAL_ERROR` (500): Server error
- `SERVICE_UNAVAILABLE` (503): Service down

---

## Rate Limiting

- **Limit**: 300 requests per 15 minutes per IP
- **Header**: `Retry-After: 900` (seconds)

**Rate Limit Response**:
```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Rate limit exceeded. Please try again later.",
    "statusCode": 429
  }
}
```

---

## Pagination

For endpoints returning lists:

**Query Parameters**:
- `page`: Page number (0-indexed)
- `limit`: Items per page (max 100)

**Example**:
```
GET /api/apartments?page=0&limit=20
```

**Response** (meta included):
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 0,
    "limit": 20,
    "total": 150
  }
}
```

---

## Security

### CORS
Configured for same-origin only in production.

### CSRF Protection
Required for all state-changing requests (POST, PUT, DELETE).

**Include CSRF token**:
```javascript
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf_token='))
  ?.split('=')[1];

fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

---

## WebSocket / Real-time

Use Supabase Realtime for live updates:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// Subscribe to apartment changes
const channel = supabase
  .channel('apartments')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'apartments' },
    (payload) => {
      console.log('Change:', payload);
    }
  )
  .subscribe();
```

---

## Client Libraries

### JavaScript/TypeScript
```bash
npm install @supabase/supabase-js
```

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

### React Hooks
Use `@tanstack/react-query` (already configured):

```typescript
import { useQuery } from '@tanstack/react-query';

function useApartments(filters) {
  return useQuery({
    queryKey: ['apartments', filters],
    queryFn: () => fetch('/api/apartments').then(r => r.json()),
  });
}
```

---

## Support

- **API Issues**: api@studentapartments.com
- **Rate Limit Increase**: Specify IP and reason
- **Documentation**: See `/docs` folder
