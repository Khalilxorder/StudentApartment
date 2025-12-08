# Phase 1 Implementation - Quick Start Guide

Phase 1 of the Enterprise Readiness plan has been implemented. Here's what was added and how to use it.

## ✅ What Was Implemented

### 1. Automated Security Scanning
- **Dependabot**: `.github/dependabot.yml`
- **Security Workflow**: `.github/workflows/security-scan.yml`
  - NPM audit
  - Secret scanning (TruffleHog)
  - CodeQL analysis  
  - Dependency review

### 2. Audit Logging System
- **Library**: `lib/audit-logging.ts`
- **Database**: `supabase/migrations/20241207_audit_logging.sql`
- **Example**: `app/api/apartments/[id]/route.example.ts`

### 3. Redis Rate Limiting
- **Library**: `lib/rate-limit-redis.ts`
- **Middleware**: `lib/security-middleware.ts` (updated)

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies
```bash
npm install @upstash/redis @upstash/ratelimit
```
✅ Already completed

### Step 2: Configure Redis (Upstash)

1. Create free account at [Upstash](https://upstash.com/)
2. Create a Redis database
3. Copy connection details to `.env.local`:

```bash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

### Step 3: Run Database Migration

```bash
# Apply audit logging schema
npm run db:migrate
```

This creates the `audit_logs` table with:
- Full change tracking
- Row-level security (RLS)
- 7-year retention policy
- Efficient indexes

### Step 4: Configure GitHub Secrets

For CI/CD security scanning, add to GitHub repository secrets:

1. Go to: `Settings → Secrets and variables → Actions`
2. Add:
   - `SNYK_TOKEN` (get from [snyk.io](https://snyk.io))

### Step 5: Start Using Audit Logging

Update your API routes to log all mutations:

```typescript
import { logAuditEvent, computeChanges, getRequestMetadata } from '@/lib/audit-logging';

// In your API route...
const metadata = getRequestMetadata(request);

await logAuditEvent({
  user_id: session.user.id,
  action: 'apartment.update',
  resource_type: 'apartment',
  resource_id: apartmentId,
  changes: computeChanges(oldData, newData),
  status: 'success',
  ...metadata,
});
```

---

## 📊 Verification

### Check Security Scans
```bash
# Push changes to trigger workflows
git add .
git commit -m "feat: Add enterprise security infrastructure"
git push

# View results at:
# https://github.com/Khalilxorder/StudentApartment/actions
```

### Query Audit Logs
```sql
-- In Supabase SQL Editor
SELECT * FROM audit_logs 
WHERE user_id = 'your-user-id' 
ORDER BY timestamp DESC 
LIMIT 10;

-- Get audit statistics
SELECT * FROM get_audit_stats(
  NULL,  -- tenant_id (optional)
  NOW() - INTERVAL '30 days',
  NOW()
);
```

### Test Rate Limiting
```bash
# Make rapid requests to test rate limiting
for i in {1..10}; do
  curl https://your-app.vercel.app/api/apartments
done

# Should see 429 response after limits exceeded
```

---

## 🎯 Next Steps

### Recommended Priority:

1. **Set up Upstash Redis** (15 min)
   - Required for production rate limiting
   
2. **Run database migration** (5 min)
   - Creates audit_logs table
   
3. **Add audit logging to critical routes** (2-4 hrs)
   - Start with: apartments, users, payments
   - See `route.example.ts` for pattern
   
4. **Configure Snyk** (10 min)
   - Sign up at snyk.io
   - Add token to GitHub secrets

5. **Monitor security scans** (ongoing)
   - Review Dependabot PRs weekly
   - Check security workflow results

---

## 📚 Documentation

- **Audit Logging**: See `lib/audit-logging.ts` for full API
- **Rate Limiting**: See `lib/rate-limit-redis.ts` for configuration  
- **Security Workflow**: See if `.github/workflows/security-scan.yml`

---

## 🔒 Security Notes

- Audit logs are **immutable** (updates/deletes blocked by RLS)
- Rate limits are **tiered** by subscription level
- Security scans run **automatically** on push/PRmain
- All secrets should be in `.env.local` (never committed)

---

## ⚠️ Important: API Keys

Before deploying to production:

1. Revoke any exposed API keys (see `PRODUCTION_READINESS_PLAN.md`)
2. Generate new keys with proper restrictions
3. Update Vercel environment variables
4. Remove keys from documentation
