# 🚀 Phase 1: Stripe Payouts - Quick Start Guide

**Timeline**: 2-3 days  
**Blocker**: YES - Money flow depends on this  
**Priority**: 🔴 CRITICAL

---

## Step 1️⃣: Delete Old Onboarding Endpoint

The `/api/stripe/onboard` route is redundant. We have a better version at `/api/payments/stripe/connect`.

```bash
# Delete old route
rm app/api/stripe/onboard/route.ts

# Verify it's gone
git status  # Should show deletion
```

---

## Step 2️⃣: Update Onboarding Page

**File**: `app/(owner)/onboarding/page.tsx`

**Find** (around line 45-80):
```typescript
const startStripeOnboarding = async () => {
  setLoading(true);
  setError(null);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('User not authenticated');
      return;
    }

    // Fetch CSRF token
    const csrfResponse = await fetch('/api/csrf');
    const { csrfToken } = await csrfResponse.json();

    if (!csrfToken) {
      throw new Error('Failed to get CSRF token');
    }

    const response = await fetch('/api/stripe/onboard', {  // ← OLD ENDPOINT
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ userId: user.id }),
    });
```

**Replace with**:
```typescript
const startStripeOnboarding = async () => {
  setLoading(true);
  setError(null);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('User not authenticated');
      return;
    }

    // Load user profile for email & company info
    const { data: profile } = await supabase
      .from('profiles_owner')
      .select('company_name')
      .eq('id', user.id)
      .single();

    // Fetch CSRF token
    const csrfResponse = await fetch('/api/csrf');
    const { csrfToken } = await csrfResponse.json();

    if (!csrfToken) {
      throw new Error('Failed to get CSRF token');
    }

    // Call the real Stripe Connect endpoint
    const response = await fetch('/api/payments/stripe/connect', {  // ← NEW ENDPOINT
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        userId: user.id,
        email: user.email || '',
        country: 'HU',  // Could be parameterized
        businessName: profile?.company_name || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to start onboarding');
    }

    if (data.onboarding_url) {
      // Redirect to Stripe Connect
      window.location.href = data.onboarding_url;
    } else {
      throw new Error('No onboarding URL received');
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : 'An error occurred');
    setOnboardingStatus('failed');
  } finally {
    setLoading(false);
  }
};
```

---

## Step 3️⃣: Add Stripe Status Display to Profile Page

**File**: `app/(owner)/owner/profile/page.tsx`

### 3a. Load Stripe data at page load

**Find** (around line 40-65, in `loadProfile` function):
```typescript
const loadProfile = useCallback(async () => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/login');
      return;
    }

    setUser(authUser);

    // Load from profiles_owner table
    const { data: profileData, error } = await supabase
      .from('profiles_owner')
      .select('*')
      .eq('id', authUser.id)
      .single();
```

**Add to the query** (after the `.select('*')`):
```typescript
    // Load from profiles_owner table
    const { data: profileData, error } = await supabase
      .from('profiles_owner')
      .select('*')  // Already loaded
      .eq('id', authUser.id)
      .single();
```

The profile data will now include:
- `stripe_account_id`
- `stripe_connect_status` (pending/active/rejected)
- `stripe_payout_email`

### 3b. Add StripePayoutCard Component

**Create** new file: `components/StripePayoutCard.tsx`

```typescript
import Link from 'next/link';

interface StripePayoutCardProps {
  accountId?: string;
  status?: string;
  payoutEmail?: string;
  onSetup: () => void;
}

export function StripePayoutCard({
  accountId,
  status,
  payoutEmail,
  onSetup,
}: StripePayoutCardProps) {
  const statusColor = {
    active: 'bg-green-50 border-green-200',
    pending: 'bg-yellow-50 border-yellow-200',
    rejected: 'bg-red-50 border-red-200',
  }[status || 'pending'];

  const statusBadge = {
    active: { text: '✓ Active', color: 'bg-green-100 text-green-800' },
    pending: { text: '⏳ Pending', color: 'bg-yellow-100 text-yellow-800' },
    rejected: { text: '✗ Rejected', color: 'bg-red-100 text-red-800' },
  }[status || 'pending'];

  return (
    <div className={`border rounded-lg p-6 ${statusColor}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold">💳 Stripe Payouts</h2>
          <p className="text-gray-600 mt-2">Receive payments from bookings</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadge.color}`}>
          {statusBadge.text}
        </span>
      </div>

      {accountId && (
        <div className="space-y-2 mb-4">
          <p className="text-sm">
            <span className="font-semibold">Account ID:</span> {accountId.slice(0, 10)}...
          </p>
          {payoutEmail && (
            <p className="text-sm">
              <span className="font-semibold">Payout Email:</span> {payoutEmail}
            </p>
          )}
        </div>
      )}

      {status === 'active' ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            ✓ Your account is active. You can now receive payments from bookings.
          </p>
          <Link 
            href="https://dashboard.stripe.com"
            target="_blank"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Manage on Stripe →
          </Link>
        </div>
      ) : status === 'pending' ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Complete your Stripe Connect setup to start accepting payments.
          </p>
          <button
            onClick={onSetup}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Complete Setup →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            ✗ Your application was rejected. Contact support for more information.
          </p>
          <button
            onClick={onSetup}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again →
          </button>
        </div>
      )}
    </div>
  );
}
```

### 3c. Use StripePayoutCard in Profile Page

**Find** in `app/(owner)/owner/profile/page.tsx` (around line 200+):

Add this import at the top:
```typescript
import { StripePayoutCard } from '@/components/StripePayoutCard';
```

Then add to the JSX (where you render form fields):
```typescript
<div className="mt-8">
  <StripePayoutCard
    accountId={profile.stripe_account_id}
    status={profile.stripe_connect_status}
    payoutEmail={profile.stripe_payout_email}
    onSetup={() => router.push('/onboarding')}
  />
</div>
```

---

## Step 4️⃣: Test the Flow

### Test 1: Happy Path
```
1. Go to /onboarding
2. Click "Start Stripe Onboarding"
3. Should redirect to Stripe Connect URL
4. Complete setup on Stripe (test mode)
5. Get redirected back to /owner/onboarding/complete
6. Check DB: stripe_account_id should be saved
7. Go to /owner/profile
8. Should see "✓ Active" badge
```

### Test 2: Profile Page
```
1. Go to /owner/profile
2. Should see Stripe Payouts section
3. If not connected: "Complete Setup" button visible
4. Click button → goes to /onboarding
```

### Test 3: Database Check
```sql
-- Query to verify stripe account was saved
SELECT 
  id, 
  stripe_account_id, 
  stripe_connect_status, 
  stripe_payout_email 
FROM profiles_owner 
WHERE stripe_account_id IS NOT NULL;
```

---

## Step 5️⃣: Integration Test (Optional but Recommended)

**Create**: `__tests__/integration/stripe-onboarding.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

describe('Stripe Connect Onboarding', () => {
  let testUserId: string;
  
  beforeAll(async () => {
    // Create test user
    testUserId = await createTestUser();
  });

  afterAll(async () => {
    // Cleanup
    await deleteTestUser(testUserId);
  });

  it('should create Stripe Connect account', async () => {
    const response = await fetch('http://localhost:3001/api/payments/stripe/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        email: 'test@example.com',
        country: 'HU',
      }),
    });

    expect(response.status).toBe(201);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.account_id).toBeDefined();
    expect(data.onboarding_url).toContain('stripe.com');
  });

  it('should store account ID in database', async () => {
    // Get account ID from response
    const response = await fetch('http://localhost:3001/api/payments/stripe/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        email: 'test@example.com',
        country: 'HU',
      }),
    });

    const data = await response.json();

    // Query database
    const dbResponse = await fetch(
      `http://localhost:3001/api/owner/profile/${testUserId}`
    );
    const profile = await dbResponse.json();

    expect(profile.stripe_account_id).toBe(data.account_id);
    expect(profile.stripe_connect_status).toBe('pending');
  });

  it('should return existing account if already connected', async () => {
    // First call creates account
    const response1 = await fetch('http://localhost:3001/api/payments/stripe/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        email: 'test@example.com',
        country: 'HU',
      }),
    });

    const account1 = await response1.json();

    // Second call should return same account
    const response2 = await fetch('http://localhost:3001/api/payments/stripe/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        email: 'test@example.com',
        country: 'HU',
      }),
    });

    const account2 = await response2.json();

    expect(account1.account_id).toBe(account2.account_id);
  });
});
```

**Run tests**:
```bash
npm test -- stripe-onboarding.test.ts
```

---

## ✅ Checklist

- [ ] Deleted `/api/stripe/onboard/route.ts`
- [ ] Updated `onboarding/page.tsx` to call `/api/payments/stripe/connect`
- [ ] Created `StripePayoutCard` component
- [ ] Added import to `profile/page.tsx`
- [ ] Added `<StripePayoutCard />` to profile JSX
- [ ] Tested: Stripe redirect works
- [ ] Tested: Account ID saved to database
- [ ] Tested: Profile page shows status badge
- [ ] Wrote integration tests
- [ ] All tests passing

---

## 🚨 Common Issues & Fixes

### Issue: "Stripe not configured" Error
**Cause**: `STRIPE_SECRET_KEY` or `STRIPE_PUBLISHABLE_KEY` missing  
**Fix**: Check `.env.local`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Issue: "Failed to store Stripe account" Error
**Cause**: `profiles_owner` table doesn't have `stripe_account_id` column  
**Fix**: Run migration:
```sql
ALTER TABLE profiles_owner 
ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_connect_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS stripe_payout_email VARCHAR(255);
```

### Issue: CSRF Token Error
**Cause**: `/api/csrf` endpoint not available  
**Fix**: Ensure `app/api/csrf/route.ts` exists (we created this in previous fixes)

### Issue: Redirect Loop
**Cause**: Middleware is blocking `/api/payments/stripe/connect`  
**Fix**: Add to CSRF exempt list in `lib/security-middleware.ts`:
```typescript
const csrfExemptPaths = [
  '/api/webhooks/',
  '/api/payments/stripe/connect',  // ← Add this
  '/api/auth/callback',
];
```

---

## 📞 Need Help?

If you get stuck on Phase 1:
1. **Check browser console** (F12) for JavaScript errors
2. **Check Network tab** to see API response details
3. **Check terminal** where dev server is running for errors
4. **Check database** to verify data is being saved
5. **Share the error message** for debugging help

---

## 🎯 What's Next?

Once Phase 1 is working:
→ **Phase 2**: Fix listing creation (owner can create apartments)  
→ **Phase 3**: Wire booking management (approve/reject/cancel)  
→ **Phase 4**: Messaging reliability (owners ↔ students)  
→ **Phase 5**: Analytics dashboard (performance insights)

**Ready to start? Let me know and I'll guide you through each step!**
