# 🔐 Complete Vercel Environment Variables Checklist

## ⚠️ CRITICAL: Add These to Vercel NOW

Copy and paste each variable into Vercel's Environment Variables section.

---

## 📋 How to Add in Vercel

1. Go to: https://vercel.com/dashboard
2. Select your **StudentApartment** project
3. Click **Settings** → **Environment Variables**
4. For EACH variable below:
   - Click **"Add New"**
   - Enter the **Key** (variable name)
   - Enter the **Value** (your actual value)
   - Check **ALL** environments: ☑ Production ☑ Preview ☑ Development
   - Click **"Save"**

---

## 🔴 TIER 1: CRITICAL (App Won't Work Without These)

### **Supabase Database & Auth**

```bash
NEXT_PUBLIC_SUPABASE_URL
```
**Value**: `https://your-project-id.supabase.co`  
**Where to find**: Supabase Dashboard → Settings → API → Project URL  
**Link**: https://app.supabase.com/project/_/settings/api

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
**Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZi...` (long JWT token)  
**Where to find**: Supabase Dashboard → Settings → API → anon public key  
**Link**: https://app.supabase.com/project/_/settings/api

```bash
SUPABASE_SERVICE_ROLE_KEY
```
**Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZi...` (long JWT token)  
**Where to find**: Supabase Dashboard → Settings → API → service_role key  
**⚠️ WARNING**: Keep this secret! Never expose to browser  
**Link**: https://app.supabase.com/project/_/settings/api

---

## 🟠 TIER 2: IMPORTANT (Core Features Need These)

### **Stripe Payment Processing**

```bash
STRIPE_SECRET_KEY
```
**Value**: `sk_test_...` (test) or `sk_live_...` (production)  
**Where to find**: Stripe Dashboard → Developers → API keys → Secret key  
**⚠️ WARNING**: Keep this secret! Never expose to browser  
**Link**: https://dashboard.stripe.com/apikeys

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```
**Value**: `pk_test_...` (test) or `pk_live_...` (production)  
**Where to find**: Stripe Dashboard → Developers → API keys → Publishable key  
**Link**: https://dashboard.stripe.com/apikeys

```bash
STRIPE_WEBHOOK_SECRET
```
**Value**: `whsec_...`  
**Where to find**: Stripe Dashboard → Developers → Webhooks → Add endpoint  
**Webhook URL**: `https://your-app.vercel.app/api/webhooks/stripe`  
**Link**: https://dashboard.stripe.com/webhooks

---

### **Email Service (Resend)**

```bash
RESEND_API_KEY
```
**Value**: `re_...`  
**Where to find**: Resend Dashboard → API Keys → Create API Key  
**Link**: https://resend.com/api-keys

---

### **Google AI (Gemini) - For Search & Verification**

```bash
GOOGLE_AI_API_KEY
```
**Value**: `AIza...`  
**Where to find**: Google AI Studio → Get API key  
**Link**: https://aistudio.google.com/app/apikey

---

### **Google Maps API**

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```
**Value**: `AIza...`  
**Where to find**: Google Cloud Console → APIs & Services → Credentials  
**Link**: https://console.cloud.google.com/google/maps-apis/credentials

---

## 🟡 TIER 3: OPTIONAL (Can Add Later for Enhanced Features)

### **Google OAuth (Social Login)**

```bash
GOOGLE_CLIENT_ID
```
**Value**: `...apps.googleusercontent.com`  
**Where to find**: Google Cloud Console → APIs & Services → Credentials  
**Link**: https://console.cloud.google.com/apis/credentials

```bash
GOOGLE_CLIENT_SECRET
```
**Value**: `GOCSPX-...`  
**Where to find**: Google Cloud Console → APIs & Services → Credentials  
**⚠️ WARNING**: Keep this secret!  
**Link**: https://console.cloud.google.com/apis/credentials

---

### **Meilisearch (Advanced Search Engine)**

```bash
MEILISEARCH_HOST
```
**Value**: `https://your-instance.meilisearch.com` or `http://localhost:7700` (dev)  
**Where to find**: Meilisearch Cloud dashboard or self-hosted URL  
**Link**: https://cloud.meilisearch.com

```bash
MEILISEARCH_API_KEY
```
**Value**: Your master key  
**Where to find**: Meilisearch Cloud → API keys  
**Link**: https://cloud.meilisearch.com

---

### **Redis/Upstash (Caching & Queues)**

```bash
REDIS_URL
```
**Value**: `redis://default:...@...upstash.io:6379` or `redis://localhost:6379` (dev)  
**Where to find**: Upstash Console → Your database → REST API  
**Link**: https://console.upstash.com/redis

```bash
UPSTASH_REDIS_REST_URL
```
**Value**: `https://...upstash.io`  
**Where to find**: Upstash Console → Your database → REST API → UPSTASH_REDIS_REST_URL  
**Link**: https://console.upstash.com/redis

```bash
UPSTASH_REDIS_REST_TOKEN
```
**Value**: Long token string  
**Where to find**: Upstash Console → Your database → REST API → UPSTASH_REDIS_REST_TOKEN  
**⚠️ WARNING**: Keep this secret!  
**Link**: https://console.upstash.com/redis

---

### **PostHog Analytics**

```bash
NEXT_PUBLIC_POSTHOG_KEY
```
**Value**: `phc_...`  
**Where to find**: PostHog → Project Settings → Project API Key  
**Link**: https://app.posthog.com/project/settings

```bash
NEXT_PUBLIC_POSTHOG_HOST
```
**Value**: `https://app.posthog.com` (for PostHog Cloud) or your self-hosted URL  
**Where to find**: PostHog → Project Settings  
**Link**: https://app.posthog.com/project/settings

---

### **Sentry Error Tracking**

```bash
SENTRY_DSN
```
**Value**: `https://...@...ingest.sentry.io/...`  
**Where to find**: Sentry → Project Settings → Client Keys (DSN)  
**Link**: https://sentry.io/settings/

```bash
NEXT_PUBLIC_SENTRY_DSN
```
**Value**: Same as SENTRY_DSN (public version)  
**Where to find**: Sentry → Project Settings → Client Keys (DSN)  
**Link**: https://sentry.io/settings/

---

### **Environment Identifier**

```bash
NODE_ENV
```
**Value**: `production`  
**Note**: Usually set automatically by Vercel, but can override if needed

```bash
NEXT_PUBLIC_APP_URL
```
**Value**: `https://your-app.vercel.app` or your custom domain  
**Note**: Your deployed app URL

---

## 📝 Quick Copy Format for Vercel

Here's the minimum required set in a format you can quickly reference:

```env
# CRITICAL - Must have these 3
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# IMPORTANT - Add these for full functionality
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
RESEND_API_KEY=re_...
GOOGLE_AI_API_KEY=AIza...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# OPTIONAL - Can skip initially
MEILISEARCH_HOST=https://...
MEILISEARCH_API_KEY=...
REDIS_URL=redis://...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## 🚀 After Adding Variables

1. **Save all variables** in Vercel
2. Go to **Deployments** tab
3. Click **latest deployment** → 3-dot menu → **"Redeploy"**
4. ☑ Check **"Use existing Build Cache"**
5. Click **"Redeploy"**
6. Wait 2-3 minutes
7. Open your app URL
8. **Check browser console (F12)** - should have NO "Missing" errors

---

## ✅ Verification Checklist

After redeployment, verify:

- [ ] App loads without "Something went wrong" page
- [ ] No "Missing NEXT_PUBLIC_SUPABASE_URL" errors in console
- [ ] Can navigate between pages
- [ ] Authentication works (if using Supabase auth)
- [ ] Maps display (if added Maps API key)
- [ ] Search works (basic search works without Meilisearch)
- [ ] Payments work (if added Stripe keys)

---

## 🆘 If You Don't Have These Services Yet

### **Must Create Now (Free):**

1. **Supabase** (REQUIRED):
   - Sign up: https://supabase.com
   - Click "New Project"
   - Name: "StudentApartment"
   - Choose region closest to your users
   - Set database password
   - Wait 2 minutes for setup
   - Get API keys from Settings → API

### **Can Create Later (Optional):**

2. **Stripe** (for payments):
   - Sign up: https://stripe.com
   - Use test mode initially
   - Free to test, only pay when processing real payments

3. **Resend** (for emails):
   - Sign up: https://resend.com
   - Free tier: 100 emails/day
   - Upgrade when needed

4. **Google AI** (for smart search):
   - Get key: https://aistudio.google.com
   - Free tier available
   - App works without it (uses basic search)

---

## 📞 Need Help?

If you're stuck:

1. **Check the service dashboard** - most show clear instructions
2. **Look for "Getting Started" or "Quick Start"** guides
3. **API keys are usually in Settings → API or Developers section**
4. **Keep secrets safe** - never share SERVICE_ROLE or SECRET keys publicly

---

## 🎯 Priority Order

### **Day 1 (Now):**
- ✅ Supabase (3 variables)
- ✅ Google AI (1 variable) - basic AI features
- ✅ Google Maps (1 variable) - show apartment locations

### **Day 2 (When Testing Payments):**
- ✅ Stripe (3 variables)
- ✅ Resend (1 variable)

### **Day 3 (Advanced Features):**
- ✅ Meilisearch (2 variables)
- ✅ Redis/Upstash (3 variables)
- ✅ PostHog (2 variables)

---

**Total Variables:**
- 🔴 Critical: 3
- 🟠 Important: 8
- 🟡 Optional: 11
- **Minimum to start: 3-5 variables**

**Current Status**: Ready to configure! 🚀
