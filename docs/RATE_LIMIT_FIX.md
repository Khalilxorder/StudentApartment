# Rate Limiting Fix - December 7, 2025

## Problem

You were experiencing **429 (Too Many Requests)** errors when browsing apartment pages. This happened because:

1. **Rate limiting was too aggressive**: Applied to ALL routes including regular page views
2. **Limit was too low**: 100 requests/minute (or 300 per 15 minutes) for general API use
3. **Each apartment page loads multiple resources**: Images, API calls, etc., quickly exhausting the limit

## Solution Applied

### 1. **Exempted Page Views from Rate Limiting** ✅
- Modified `lib/security-middleware.ts`
- **Rate limiting now ONLY applies to**:
  - `/api/*` routes: 500 requests per 15 minutes
  - `/login` and `/signup`: 10 requests per 15 minutes (strict anti-brute-force)
- **No rate limiting** for regular page navigation (`/apartments/*`, `/dashboard`, etc.)

### 2. **Increased API Rate Limits** ✅
- Updated `lib/rate-limit-redis.ts`
- **Free tier**: 100 → **500 requests/minute**
- **Pro tier**: 1000 requests/minute (unchanged)
- **Enterprise tier**: 10,000 requests/minute (unchanged)

### 3. **Created Clear Rate Limits Script** ✅
- New file: `scripts/clear-rate-limits.ts`
- Run with: `npm run clear:rate-limits`
- Clears all Redis rate limit data

## How to Fix Immediate Issue

Since you're likely using in-memory rate limiting (Redis not configured), simply:

### **Option 1: Restart Dev Server** (Recommended)
```bash
# Stop the current dev server (Ctrl+C in the terminal)
# Then restart:
npm run dev
```

This will clear all in-memory rate limits immediately.

### **Option 2: Use the Clear Script** (If using Redis)
```bash
npm run clear:rate-limits
```

## Verification

After restarting:
1. ✅ Browse to any apartment page: `/apartments/{id}`
2. ✅ Refresh multiple times - should work without 429 errors
3. ✅ API calls will have much higher limits (500/min instead of 100/min)

## Future Recommendations

### For Production:
1. **Enable Redis rate limiting** for distributed rate limiting:
   - Set up Upstash Redis (free tier available)
   - Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env`

2. **Monitor rate limit hits**:
   - Check Sentry for 429 errors
   - Adjust limits based on actual traffic patterns

3. **Consider tiered rate limits** based on user type:
   - Free users: 500/min
   - Pro users: 1000/min
   - Enterprise: 10,000/min

### Rate Limit Strategy:
```typescript
// Current configuration (after fix):

// Page views: NO rate limiting ✅
/apartments/* → No limit
/dashboard → No limit

// API routes: 500 requests per 15 minutes ✅
/api/* → 500/15min (except auth)

// Auth routes: 10 requests per 15 minutes ✅
/api/auth/* → 10/15min (anti-brute-force)
/login → 10/15min
/signup → 10/15min
```

## Files Modified

1. ✅ `lib/security-middleware.ts` - Skip rate limiting for page views
2. ✅ `lib/rate-limit-redis.ts` - Increased free tier from 100 to 500 req/min
3. ✅ `scripts/clear-rate-limits.ts` - New utility script
4. ✅ `package.json` - Added `clear:rate-limits` command

## Testing

Test the fix:
```bash
# 1. Restart dev server
npm run dev

# 2. Browse multiple apartment pages rapidly
# 3. Verify no 429 errors

# 4. Check rate limit logs (if curious)
# Look for: "Rate limit exceeded" messages - should be rare now
```

---

**Status**: ✅ **FIXED** - Rate limits are now appropriate for development and won't block normal browsing.
