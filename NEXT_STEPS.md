# Quick Start: What to Do Next

**TL;DR**: Phase 1 ✅ Done. Start Phase 2 Owner Flows. Pick Todo #6 next.

---

## 📋 Your Checklist

### Today (Complete Phase 1 Review)
- [ ] Read `PHASE_1_COMPLETE.md` (performance metrics)
- [ ] Read `IMPLEMENTATION_MASTER_PLAN.md` (full roadmap)
- [ ] Review commit `d7a3043` for code changes
- [ ] Run `pnpm test:unit` to verify tests pass
- [ ] Deploy to staging (see "Deployment" section below)

### Tomorrow (Start Phase 2: Owner Flows)

Choose **one** of these three (do in order):

#### Option A: Todo #6 - Owner Listing Form (RECOMMENDED - Start Here!)
**Why**: Unblocks owners from publishing. Biggest user impact.

**Work**:
1. Read `components/OwnerApartmentForm.tsx` - FormData handling
2. Fix: Append each `image_urls[]` entry (not JSON-stringify)
3. Fix: Add hidden `features[]` input
4. Fix: `app/(admin)/admin/actions.ts` to read + validate
5. Add: Success toast with "View listing" link
6. Add: E2E test in `e2e/owner-listing.spec.ts`

**Estimated**: 4 hours  
**Files**: 3 modified, 1 new test file

---

#### Option B: Todo #7 - Maps Configuration  
**Why**: Breaks map rendering in owner form.

**Work**:
1. Fix env var casing: `NEXT_PUBLIC_MAPS_API_KEY` (not `MAPS_API_KEY`)
2. Add `NEXT_PUBLIC_GOOGLE_MAP_ID`
3. Runtime validation in `app/(admin)/admin/Map.tsx`
4. Helpful error if keys missing
5. Update `.env.example`
6. Provide CI mocks

**Estimated**: 2 hours  
**Files**: 2 modified, 1 new

---

#### Option C: Todo #8 - Owner Profile Schema
**Why**: Allows owners to complete their profile before listing.

**Work**:
1. Audit: Is it `profiles` or `profiles_owner` table?
2. Migration: Add missing columns (company, license, social)
3. Page: `app/(owner)/owner/profile/page.tsx` - upsert
4. Logic: Profile completeness score (%)
5. Validation: Require fields before publish
6. E2E test

**Estimated**: 3 hours  
**Files**: 2 modified, 1 new migration, 1 new test

---

### This Week

After finishing your Phase 2 choice:

- [ ] Todo #10 - Environment validation (2h) - FOUNDATIONAL
- [ ] Todo #11 - CI/CD enhancement (4h) - ENABLES RELIABLE DEPLOYS
- [ ] Todo #9 - Messaging resilience (3h) - USER RETENTION

### Next Week

- [ ] Todo #12 - Regression tests (5h)
- [ ] Todos #13-14 - AI scoring + UI badges (7h)

---

## 🚀 Deployment

### For Staging
```bash
# 1. Pull latest
git pull origin main

# 2. Install deps
pnpm install

# 3. Apply migration
pnpm db:migrate -- 20251101000000_migrate_embeddings_to_768d.sql

# 4. Rebuild embeddings (one-time)
pnpm build:embeddings

# 5. Run tests
pnpm test:unit
pnpm type-check
pnpm build

# 6. Deploy
vercel --prod
```

### For Production
```bash
# Same as staging, but:
# - Test in staging first
# - Monitor cache hit rate first hour
# - Watch circuit breaker status
# - Have rollback plan ready
```

### Rollback (if needed)
```bash
# Revert to previous commit
git revert d7a3043

# Run old embeddings
pnpm build:embeddings  # Will use old model from old code

# Redeploy
vercel --prod
```

---

## 📚 Resources

### Understanding Phase 1
1. `PHASE_1_COMPLETE.md` - Technical deep dive
2. `lib/embeddings.ts` - Core service (read comments)
3. `lib/circuit-breaker.ts` - Resilience pattern
4. `tests/embeddings.test.ts` - See what's tested

### Understanding the Roadmap
1. `IMPLEMENTATION_MASTER_PLAN.md` - All 25 todos
2. `PHASE_1_SUMMARY.md` - What was accomplished

### Understanding the Codebase
1. `.github/copilot-instructions.md` - Architecture overview
2. `README.md` - Project overview
3. `app/api/` - API endpoints

---

## 🐛 Troubleshooting

### "Build fails with dimension mismatch"
**Cause**: Old embeddings in DB don't match 768-d schema
**Fix**: 
```bash
pnpm db:migrate -- 20251101000000_migrate_embeddings_to_768d.sql
pnpm build:embeddings  # Rebuild all embeddings
```

### "Cache stats show 0% hit rate"
**Cause**: Normal on first deploy, or all new queries
**Fix**: Wait 1-2 hours for cache to warm up
**Check**: 
```javascript
import { getCacheStats } from '@/lib/cache/lru';
console.log(getCacheStats());
// { hits: 150, misses: 90, hitRate: 0.625, size: 240 }
```

### "Circuit breaker stuck in OPEN"
**Cause**: Gemini API down or rate-limited
**Symptoms**: All semantic searches fail
**Fix**: Wait 60 seconds, or manually reset:
```javascript
import { getGeminiCircuitBreaker } from '@/lib/circuit-breaker';
getGeminiCircuitBreaker().reset();
```

### "Tests failing on dimension validation"
**Cause**: API key not set or embedding model changed
**Fix**:
```bash
export GOOGLE_AI_API_KEY=your-key
pnpm test:unit
```

---

## 📞 Questions?

### "Where's the search feature?"
- `app/api/search/` - API endpoints
- `services/search-svc/` - Business logic
- `lib/embeddings.ts` - Embeddings

### "How do I add new features?"
- See `IMPLEMENTATION_MASTER_PLAN.md` section "When Adding New Features"

### "How's the performance?"
- See `PHASE_1_COMPLETE.md` section "Performance Metrics"
- Run `pnpm e2e -- --grep search` to benchmark

### "What's the error code for...?"
- See `PHASE_1_COMPLETE.md` section "Structured Error Codes"
- Or grep for `GeminiErrorCode` in code

---

## ✅ Before You Move To Next Todo

Make sure to:
- [ ] Read BOTH summary docs
- [ ] Run `pnpm test:unit` locally
- [ ] Understand the error handling pattern
- [ ] Know what the circuit breaker does
- [ ] Can explain caching strategy
- [ ] Reviewed code changes in commit `d7a3043`

---

## 📊 Progress Tracker

```
Phase 1: Core Search Stabilization ✅ 5/5 todos DONE
Phase 2: Owner Flows & Config        ⏳ 0/6 todos (START HERE!)
Phase 3: Messaging & Realtime        ⏭️ 1/3 todos
Phase 4: AI Scoring & UI Badges      ⏭️ 0/2 todos
Phase 5: Analytics & Personalization ⏭️ 0/5 todos
```

---

## 🎯 Your Assignment (Pick One)

### High Priority (Do First)
- **Todo #6 Owner Listing Form** - Unblocks user creation
- **Todo #10 Env Validation** - Foundation for all deploys

### Medium Priority (Do After)
- **Todo #11 CI/CD Enhancement** - Enables reliable deploys
- **Todo #9 Messaging Resilience** - Critical for user conversions

### Lower Priority (Do Later)
- Todos #12+ - Advanced features

---

**Next Step**: Pick one of the three Phase 2 options above and start! 🚀
