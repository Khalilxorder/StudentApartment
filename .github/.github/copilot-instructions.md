# AI Coding Agent Instructions

This document guides AI agents on productive work within the Student Apartments platform codebase.

## Architecture Overview

**Student Apartments** is a Next.js/React student housing marketplace with multi-role support (students, owners, admins). It emphasizes AI-powered search, ranking, payments, trust & safety, and media pipelines.

### Core Stack
- **Framework**: Next.js 14+ (App Router, SSR, API routes)
- **Backend**: Supabase PostgreSQL + Edge Functions
- **Search**: Meilisearch (hybrid search + semantic embeddings)
- **Payments**: Stripe Connect Express
- **Auth**: Supabase Auth (OAuth + email/password)
- **Media**: Sharp + blurhash for images
- **LLM**: Google Generative AI (Gemini) for semantic search/analysis
- **Observability**: Sentry, PostHog analytics

### Key Directories
- `app/` — Next.js pages (route groups for `/`, `/(app)/`, `/(owner)/`, `/(admin)/`)
- `app/api/` — 31 API route categories (search, payments, commute, media, etc.)
- `components/` — 40+ reusable React components
- `services/` — 18 isolated business logic services (search-svc, payments-svc, media-svc, etc.)
- `lib/` — Shared utilities (auth, db, embeddings, validation, security)
- `scripts/` — Data pipelines (seed, migrations, embedding sync, ranking recompute)
- `db/` — Database schema (`migrations/`) and seed data

---

## Critical Patterns & Workflows

### 1. API Route Pattern (Must Read: `app/api/*/route.ts`)

All routes follow a **role-based auth middleware** pattern:

```typescript
// Example: app/api/apartments/route.ts
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = createServerClient(...);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Business logic here
  const apartments = await supabase.from('apartments').select('*').limit(20);
  return NextResponse.json(apartments);
}
```

**Pattern**: Always extract auth context first → validate → run query → return typed JSON.

### 2. Database Access Pattern

Use `createServerClient` from `@supabase/ssr` for server code; never use the anon key in server contexts.

```typescript
// ❌ Wrong (module-level, env loads late)
const url = process.env.SUPABASE_URL;

// ✅ Correct (lazy load inside functions)
function getSupabaseUrl() {
  return process.env.SUPABASE_URL!;
}
```

Reference connection pool at `lib/db/pool.ts` for batch operations; prefer `.rpc()` for complex queries.

### 3. Validation Pattern (Zod + Custom Rules)

Use `lib/validation/schemas.ts` for form & API validation:

```typescript
import { apartmentSchema } from '@/lib/validation/schemas';

const parsed = apartmentSchema.parse(req.body);
// Throws ZodError if invalid; caught by error boundary
```

**Never skip validation** — the codebase enforces strict type safety even in user-facing APIs.

### 4. Search & Embedding Sync

Search is hybrid (structured filters + semantic embeddings):
- **Structured**: Meilisearch facets for price, bedrooms, district, etc.
- **Semantic**: Embeddings built by `scripts/build_embeddings.ts` (Google Generative AI)
- **Sync command**: `pnpm build:embeddings` (idempotent; re-syncs stale embeddings)

When modifying apartment fields, ensure:
1. Schema includes new field in `types/apartment.ts`
2. Embedding text generation in `build_embeddings.ts` includes new field
3. Meilisearch index refreshes: `pnpm sync:meilisearch`

### 5. Media Pipeline (Sharp + Blurhash)

Photos flow: Upload → Optimize (Sharp) → Blurhash → Store S3 → Index.

- Services: `services/media-svc/index.ts`
- Routes: `app/api/media/*`
- Quality checks: Hard limit 20 images/apartment; enforced in `OwnerApartmentForm.tsx`

When touching media logic, test with `pnpm media:test`.

### 6. Ranking & Feedback (Thompson Sampling)

Ranking uses multi-armed bandits (Thompson Sampling) + user feedback:
- Initial weights: `scripts/recompute-ranking-weights.ts`
- Feedback ingestion: `POST /api/ranking/feedback` updates `rank_bandit_state` table
- Recompute: `pnpm ranking:recompute` (runs nightly in production)

**Key insight**: Ranking is stateful. Every feedback creates a new trial; Thompson posterior updates over time.

### 7. Payment Flow (Stripe Connect Express)

Owners:
1. Initiate onboarding: `POST /api/payments/stripe/connect`
2. Complete KYC in Stripe dashboard (webhook updates `users.stripe_account_id`)
3. Payouts enabled after verification

When implementing payment features:
- Always validate `users.stripe_account_id` before attempting payout
- Handle webhook retries idempotently (use `idempotency_key`)
- Test with Stripe test mode (`sk_test_*`)

### 8. Role-Based Routes (Critical)

Routes live in `app/` as route groups:
- `/` — Public pages (landing, search, apartment detail)
- `/(app)/` — Student dashboard, messages, saved searches
- `/(owner)/` — Owner listings, analytics, onboarding
- `/(admin)/` — Admin console, moderation, analytics

**Auth enforced in middleware** (`middleware.ts`). Components check `useCurrentUser()` for UI hiding.

### 9. Environment Variables & Secrets

**Module-level loads fail in Next.js**. Always wrap in functions:

```typescript
// ✅ Correct
export function getApiKey() {
  return process.env.GOOGLE_AI_API_KEY!;
}

// Usage
const client = new GoogleGenerativeAI(getApiKey());
```

Critical envs: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL` (for scripts), `STRIPE_SECRET_KEY`, `GOOGLE_AI_API_KEY`.

### 10. Error Boundaries & Observability

- **Client errors**: Wrap components with `ErrorBoundary.tsx`; logs to Sentry
- **API errors**: Middleware catches 5xx → logs with `lib/logger.ts` + Sentry
- **Rate limits**: Enforced in `middleware.ts` (429 if exceeded)

Always include context in error logs: user ID, endpoint, request size.

---

## Data Flows & Service Boundaries

### Search Flow
1. User submits query (text + filters) → `POST /api/search`
2. Router parses query intent (AI); extracts budget, bedrooms, location
3. Query Meilisearch (faceted filters) + semantic embeddings (relevance)
4. Rank results via `services/rank-svc` (Thompson bandit + user feedback)
5. Return top 20 with reason codes (e.g., "matches budget", "high walkability")

### Commute Integration
- External: GTFS data refreshed daily (commute-svc)
- Facets: "Transit to University X in <30 min" surfaced in search
- Endpoint: `GET /api/commute?apartmentId=X&universityId=Y&mode=transit`

### Messaging & Viewings
- Contact masking: No direct phone/email before verification
- Rate limits: 5 messages/hour per user → escalation to support
- Viewing slots: Owner sets availability rules; students book → email confirmation
- Audit log: All messages & viewings logged to `audit_logs` table

### Verification & Trust & Safety
- Student verification: Email + optional phone (auto-verified if .edu domain)
- Owner verification: KYC (photo ID + address) + Stripe Connect
- Fraud detection: Duplicate address detection, rapid-fire posting, unusual pricing → moderation queue
- Moderation UI: `components/ModerationDashboard.tsx` (admin only)

---

## Build & Test Workflows

### Local Development
```bash
pnpm install
pnpm db:setup                    # Create schema + seed reference data
pnpm dev                         # Next.js dev server (http://localhost:3000)
pnpm test:ui                     # Vitest UI (http://localhost:51204)
```

### Pre-Commit Validation
```bash
pnpm lint                        # ESLint + Prettier
pnpm type-check                  # tsc --noEmit
pnpm test:ci                     # Vitest (non-watch)
```

### Data Pipelines (Careful!)
```bash
pnpm seed                        # Seed 10 test apartments
pnpm build:embeddings            # Sync embeddings to Meilisearch (1–5 min)
pnpm sync:meilisearch            # Full Meilisearch reindex
pnpm ranking:recompute           # Recalculate Thompson bandit weights
```

### E2E Testing
```bash
pnpm e2e                         # Playwright (Chrome + accessibility tests)
pnpm e2e:ui                      # UI mode (http://localhost:8000)
```

### Production Health Check
```bash
node scripts/health-check.js     # Verify all endpoints + DB + search engine
```

---

## Common Pitfalls

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Build fails with "env var not found" | Module-level `process.env` access | Wrap in function; call inside handler |
| Search results empty | Embeddings stale | Run `pnpm build:embeddings` |
| Payment webhook ignored | `idempotency_key` mismatch | Stripe retries with same key; check DB deduplication |
| Ranking unchanged | No feedback ingested | POST to `/api/ranking/feedback` after viewing apartment |
| Rate limit errors in local tests | Running tests in parallel | Use `--reporter=verbose`; stagger requests |
| Supabase auth fails on edge | Calling admin client on edge | Use `createServerClient` (SSR mode) for edge |

---

## Key Files to Understand

| File | Purpose |
|------|---------|
| `middleware.ts` | Rate limiting + security headers + auth checks |
| `app/api/search/route.ts` | Entry point for hybrid search (Meilisearch + embeddings) |
| `lib/embeddings.ts` | Google Generative AI integration for semantic search |
| `lib/stripe/` | Stripe Connect onboarding + webhook handlers |
| `lib/messaging.ts` | Contact masking + rate limiting for messages |
| `services/media-svc/` | Image optimization pipeline (Sharp + blurhash) |
| `services/rank-svc/` | Thompson sampling ranking |
| `components/OwnerApartmentForm.tsx` | Owner listing creation (validates media count, amenities) |
| `types/apartment.ts` | Core type definitions (sync with DB schema) |
| `scripts/seed-database.ts` | Reference data seeding (universities, amenities, sample apartments) |

---

## When Adding New Features

1. **Define types first** (`types/*.ts` or update existing)
2. **Add database schema** (`db/migrations/*.sql`)
3. **Create API route** with role-based auth (`app/api/*/route.ts`)
4. **Write Zod schema** for validation (`lib/validation/schemas.ts`)
5. **Add component** if UI-facing (`components/*.tsx`)
6. **Test locally**: `pnpm dev` + Playwright
7. **Sync data pipelines** if needed (`scripts/build_embeddings.ts`, etc.)
8. **Add integration test** (`tests/*.ts` or Playwright)

---

## Observability & Debugging

- **Logs**: Check `server.log` (Sentry integration captures 5xx errors)
- **Performance**: Use `lib/production-monitoring.ts` (health checks, metrics)
- **Analytics**: PostHog dashboards track user funnels (search → view → contact → book)
- **Database**: Supabase Studio UI shows real-time queries + slow queries

---

## Phase Recovery (Next Steps)

See `PHASE_RECOVERY_PLAN.md` for staged implementation of remaining features:
- **Phase 1**: App shell restoration (routes, layouts, auth)
- **Phase 2**: Database schema + reference data
- **Phase 3**: Search foundation + embeddings sync
- **Phases 4–13**: Ranking, media, commute, payments, messaging, moderation, i18n, security, launch

Each phase is ~1–3 days of focused work. Start with Phase 1 to ensure routes & auth are solid.
