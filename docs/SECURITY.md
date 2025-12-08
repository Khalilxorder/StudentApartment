# Security Guide

Security best practices, authentication flows, rate limiting, and hardening.

## Authentication & Authorization

### Flows

**1. User Signup/Login**
```
→ User submits email + password
→ Supabase Auth validates/creates user
→ NextAuth generates session token
→ Middleware checks session, redirects to onboarding if needed
→ Role-based redirect (student → /dashboard, owner → /owner, admin → /admin)
```

**2. OAuth (Google)**
```
→ User clicks "Sign in with Google"
→ Google auth callback → /auth/callback
→ Supabase + NextAuth exchange tokens
→ User profile created if new
→ Redirected to role dashboard
```

**3. API Authentication**
```
→ Client sends Authorization header: Bearer <session-token>
→ Middleware validates token via Supabase
→ Request allowed or rejected based on role
```

### Best Practices

- ✅ Always validate session before accessing protected routes
- ✅ Use Supabase RLS policies for row-level security
- ✅ Never store sensitive data in JWT (use session tokens)
- ✅ Rotate `NEXTAUTH_SECRET` regularly
- ✅ Use HTTPS-only cookies in production
- ✅ Implement session expiration (default: 24 hours)
- ✅ **Email verification enforced**: Users must verify email before accessing protected routes

## CSRF Protection

### How It Works

1. Middleware generates CSRF token for GET requests
2. Token stored in Redis (or in-memory if Redis unavailable)
3. For POST/PUT/DELETE, client sends token in `X-CSRF-Token` header
4. Middleware validates token (one-time use, then deleted)
5. Token expires after 1 hour

### Implementation

```javascript
// Frontend: Get token
const response = await fetch('/api/csrf-token');
const { token } = await response.json();

// POST request with token
await fetch('/api/apartments', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ title: '...' }),
});
```

### Exempt Endpoints

These bypass CSRF (trusted callbacks):
- `/api/webhooks/stripe` (Stripe webhook)
- `/api/auth/callback` (OAuth callback)
- `/api/payments/stripe/connect` (Stripe Connect)

## Rate Limiting

### Configuration

```bash
# In .env.production
ENABLE_REDIS_RATE_LIMITING=true
REDIS_URL=redis://your-redis-host:6379
```

### How It Works

- **Default**: 300 requests per 15 minutes per IP (general API)
- **Auth Endpoints** (`/api/auth`, `/login`, `/signup`): **10 requests per 15 minutes** (strict brute-force protection)
- **Backend**: Uses Redis (distributed) or in-memory (single instance)
- **Response**: 429 (Too Many Requests) with `Retry-After` header

### Customization

Edit `lib/security-middleware.ts`:

```typescript
// Adjust limits
const isAllowed = await checkRateLimit(
  ip,
  100,        // Max requests
  15 * 60 * 1000  // Window (15 min)
);
```

### Monitoring

```bash
# Check current limits (if using Redis)
redis-cli
> KEYS ratelimit:*
> TTL ratelimit:IP_ADDRESS:TIMESTAMP
```

## Input Validation

### Patterns

```typescript
VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,  // 12 char minimum
  name: /^[a-zA-Z\s\-']{2,50}$/,
  phone: /^\+?[\d\s\-\(\)]{10,}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/,
};
```

### Validation Points

1. **API Routes** (`/api/*`): Validate POST body before processing
2. **Form Submission**: Client-side validation + server-side re-validation
3. **Database**: Supabase RLS policies as final gate

## Suspicious Activity Detection

### Heuristics

Requests blocked if they match:
- Suspicious user agent: `bot`, `crawler`, `spider`, `scraper`, etc.
- Rapid requests: >100 requests/minute from same IP
- Custom rules: Configurable in middleware

### Logging

All suspicious activity logged to `lib/security-logger.ts`:
- Rate limit exceeded
- CSRF violations
- Input validation failures
- Custom security events

### Integration

Connect to observability platform:
```typescript
// Example: Send to Sentry
import * as Sentry from '@sentry/nextjs';

logSuspiciousActivity(req, reason) {
  Sentry.captureMessage(`Security: ${reason}`, 'warning');
}
```

## Database Security (RLS)

### Row-Level Security Policies

Example: Users can only see their own apartments

```sql
CREATE POLICY "Users can view own apartments"
  ON apartments
  FOR SELECT
  USING (auth.uid() = owner_id);
```

### Current Policies

- Users see own apartments + public listings
- Owners manage only their listings
- Admins see everything
- Stripe data: Only accessible by logged-in users

### Testing

```bash
# Test as authenticated user
curl -H "Authorization: Bearer $TOKEN" https://your-api.com/api/apartments

# Should fail as unauthenticated
curl https://your-api.com/api/apartments
```

## Secure Headers

### Middleware Sets

```typescript
res.headers.set('X-Content-Type-Options', 'nosniff');
res.headers.set('X-Frame-Options', 'DENY');
res.headers.set('X-XSS-Protection', '1; mode=block');
res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
```

### CSP (Content Security Policy)

Configure in `next.config.js`:

```javascript
headers: async () => {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline'",
        },
      ],
    },
  ];
}
```

## Encryption

### At Rest

- Supabase encrypts data by default
- Sensitive fields: Use `ENCRYPTION_KEY` for app-level encryption

### In Transit

- All endpoints use HTTPS (enforced in production)
- API keys: Never log, never send in URLs, use request headers

### Key Rotation

Generate new encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Rotate in production:
1. Generate new key
2. Add as `ENCRYPTION_KEY_NEW`
3. Re-encrypt all sensitive data
4. Switch `ENCRYPTION_KEY` to new value
5. Remove old key after verification

## OAuth & Third-Party Security

### Google OAuth

- ✅ Client ID verified in Google Cloud Console
- ✅ Redirect URIs whitelist enforced
- ✅ Tokens validated server-side
- ✅ ID token signature verified

### Stripe

- ✅ Webhook signature validated
- ✅ Test/Live keys separated
- ✅ No sensitive data in frontend config
- ✅ Webhook retries on Stripe side

### API Rate Limits (Third-Party)

Monitor and alert:
- Google Gemini: 15 requests/minute (free tier)
- Stripe: 100 requests/second
- Meilisearch: Depends on plan

## Incident Response

### Detection

Alerts trigger for:
- Rate limit violations
- CSRF failures
- Suspicious user agents
- Database errors (possible injection attempts)
- Auth token validation failures

### Response Checklist

1. **Isolate**: Block affected IP if necessary
2. **Investigate**: Check logs in Sentry + server logs
3. **Notify**: Alert team if security incident confirmed
4. **Remediate**: Disable compromised credentials, rotate keys
5. **Document**: Log incident for compliance

### Logs Location

- **Vercel**: Dashboard → Deployments → View Logs
- **Self-hosted**: `docker logs <container-id>`
- **Sentry**: https://sentry.io → Your Project
- **Database**: Supabase → Logs

## Compliance

### GDPR

- ✅ User data export: `/api/privacy/data-export`
- ✅ User data deletion: `/api/privacy/data-delete`
- ✅ Privacy policy: `/privacy-policy`
- ✅ Consent tracking: During signup

### PCI DSS (Payment Processing)

- ✅ Never store full card numbers (Stripe handles this)
- ✅ Use Stripe Payment Intents (PCI DSS compliant)
- ✅ SSL/TLS enforced
- ✅ Webhook signatures verified

## Security Checklist for Production

- [ ] `NEXTAUTH_SECRET` rotated and not in version control
- [ ] All API keys stored in secret manager, not `.env` files
- [ ] HTTPS enforced (browser + API)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled with Redis
- [ ] Sentry monitoring active
- [ ] Database RLS policies configured
- [ ] Stripe webhook signature verified
- [ ] Backup strategy in place
- [ ] Security headers configured
- [ ] Input validation on all endpoints
- [ ] Logs centralized and monitored
- [ ] Incident response plan documented

---

**Questions?** See [PLAYBOOK.md](./PLAYBOOK.md) or [DEPLOYMENT.md](./DEPLOYMENT.md).
