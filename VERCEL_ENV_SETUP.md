# 🚀 Vercel Environment Variables Setup Guide

## ✅ Build Status: SUCCESS
## ❌ Runtime Status: FAILED - Missing Environment Variables

Your application **built successfully** but crashes at runtime because environment variables are not configured in Vercel.

---

## 📋 Step-by-Step Instructions

### **Step 1: Go to Vercel Dashboard**

1. Open: https://vercel.com/dashboard
2. Sign in with your account
3. Find and click on your project: **"StudentApartment"** or **"student-apartment"**

### **Step 2: Navigate to Environment Variables**

1. Click on **Settings** tab (top navigation)
2. Click on **Environment Variables** (left sidebar)
3. You'll see a page where you can add variables

### **Step 3: Add Required Environment Variables**

Click **"Add New"** and enter each of these variables:

---

#### 🔴 **CRITICAL - Must Have** (App won't work without these)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL
Value: https://your-project-id.supabase.co
Environments: ☑ Production ☑ Preview ☑ Development

NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Environments: ☑ Production ☑ Preview ☑ Development

SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Environments: ☑ Production ☑ Preview ☑ Development
```

**Where to find**: 
- Go to https://app.supabase.com
- Select your project
- Settings → API
- Copy the values

---

#### 🟡 **IMPORTANT - Needed for Key Features**

```bash
# Stripe Payment Processing
STRIPE_SECRET_KEY
Value: sk_test_... or sk_live_...
Environments: ☑ Production ☑ Preview ☑ Development

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
Value: pk_test_... or pk_live_...
Environments: ☑ Production ☑ Preview ☑ Development

# Email Service (Resend)
RESEND_API_KEY
Value: re_...
Environments: ☑ Production ☑ Preview ☑ Development

# Google AI (for search/verification)
GOOGLE_AI_API_KEY
Value: AIza...
Environments: ☑ Production ☑ Preview ☑ Development

# Google Maps
NEXT_PUBLIC_MAPS_API_KEY
Value: AIza...
Environments: ☑ Production ☑ Preview ☑ Development
```

---

#### 🟢 **OPTIONAL - Can Add Later**

```bash
# Search Engine (Meilisearch)
MEILISEARCH_HOST
Value: https://your-meilisearch-instance.com
Environments: ☑ Production ☑ Preview ☑ Development

MEILISEARCH_API_KEY
Value: your-master-key
Environments: ☑ Production ☑ Preview ☑ Development

# Caching (Redis/Upstash)
REDIS_URL
Value: redis://...
Environments: ☑ Production ☑ Preview ☑ Development

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY
Value: phc_...
Environments: ☑ Production ☑ Preview ☑ Development

NEXT_PUBLIC_POSTHOG_HOST
Value: https://app.posthog.com
Environments: ☑ Production ☑ Preview ☑ Development
```

---

### **Step 4: Redeploy**

After adding the environment variables:

1. Go to **Deployments** tab
2. Find the latest deployment (the one that's currently live)
3. Click the **3-dot menu (···)** on the right
4. Select **"Redeploy"**
5. ☑ Check **"Use existing Build Cache"** (faster rebuild)
6. Click **"Redeploy"** button

**Wait 2-5 minutes** for the deployment to complete.

---

## 🔍 How to Find Your Values

### **Supabase**
1. Go to: https://app.supabase.com
2. Click your project
3. Go to: **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

### **Stripe**
1. Go to: https://dashboard.stripe.com/apikeys
2. Copy:
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY` (⚠️ Keep secret!)
3. For webhooks: https://dashboard.stripe.com/webhooks

### **Resend**
1. Go to: https://resend.com/api-keys
2. Click **Create API Key**
3. Copy the key → `RESEND_API_KEY`

### **Google AI (Gemini)**
1. Go to: https://aistudio.google.com/app/apikey
2. Click **Create API Key**
3. Copy the key → `GOOGLE_AI_API_KEY`

### **Google Maps**
1. Go to: https://console.cloud.google.com/google/maps-apis
2. Enable **Maps JavaScript API**
3. Go to **Credentials** → Create credentials → **API key**
4. Copy the key → `NEXT_PUBLIC_MAPS_API_KEY`

---

## ✅ Verification

After redeployment:

1. Open your Vercel app URL
2. Open browser console (F12)
3. You should **NOT** see "Missing NEXT_PUBLIC_SUPABASE_URL" errors
4. The app should load without the "Something went wrong" page

---

## 🆘 If You Don't Have These Services Set Up Yet

### **Minimum to Get Started** (Free Tier)

1. **Supabase** (Required):
   - Sign up: https://supabase.com
   - Create new project (takes ~2 minutes)
   - Get API keys from Settings → API

2. **Stripe** (Optional for now):
   - Sign up: https://stripe.com
   - Use test mode keys
   - Can skip initially if not testing payments

3. **Resend** (Optional):
   - Sign up: https://resend.com
   - Free tier: 100 emails/day
   - Can skip initially if not testing emails

4. **Google AI** (Optional):
   - Get free key: https://aistudio.google.com
   - Can skip initially (search will use basic mode)

---

## 📝 Notes

- **NEXT_PUBLIC_** variables are exposed to the browser (public)
- Variables without **NEXT_PUBLIC_** are server-only (keep secret!)
- Always use **Test/Development keys** initially
- Switch to **Production keys** when going live

---

## 🎉 Expected Result

After adding variables and redeploying:
- ✅ App loads successfully
- ✅ No console errors about missing env vars
- ✅ Authentication works (if Supabase configured)
- ✅ Maps display (if Google Maps configured)
- ✅ Payments work (if Stripe configured)

---

**Current Status**: Build ✅ SUCCESS | Runtime ❌ NEEDS ENV VARS

**Next Action**: Add environment variables in Vercel and redeploy!
