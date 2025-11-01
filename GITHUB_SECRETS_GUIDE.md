# 🔐 COMPLETE GITHUB SECRETS GUIDE - COPY & PASTE READY

## 📍 WHERE TO GO
https://github.com/Khalilxorder/StudentApartment/settings/secrets/actions

---

## 📋 ALL 13 SECRETS YOU NEED TO ADD

### **SECTION 1: GOOGLE AI (Required for Gemini)**

#### Secret 1: `GOOGLE_AI_API_KEY`
**What it is:** Your Google Generative AI API key for Gemini
**Where to get it:** https://aistudio.google.com/app/apikey
**How to get it:**
1. Go to https://aistudio.google.com/app/apikey
2. Click "Get API key" → "Create API key in new project"
3. Copy the key (looks like: `AIzaSy...`)

**Example value:**
```
AIzaSyD2Tvy5Hsry8tAFpVdFEB2oZBLzfmvbKLQ
```

---

### **SECTION 2: SUPABASE (Database)**

#### Secret 2: `SUPABASE_URL`
**What it is:** Your Supabase project URL
**Where to get it:** Supabase Dashboard
**How to get it:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy "Project URL"

**Example value:**
```
https://kdlxbtuovimrouwuxoyc.supabase.co
```

#### Secret 3: `SUPABASE_SERVICE_ROLE_KEY`
**What it is:** Service role key for server-side access (KEEP SECRET!)
**Where to get it:** Supabase Dashboard
**How to get it:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy "Service role (secret)" key (the long one with `eyJ...`)

**Example value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
```

#### Secret 4: `DATABASE_URL`
**What it is:** PostgreSQL connection string for migrations
**Where to get it:** Supabase Dashboard
**How to get it:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → Database
4. Copy "Connection string" (URI format)

**Example value:**
```
postgresql://postgres:password@db.supabase.co:5432/postgres
```

---

### **SECTION 3: STRIPE (Payments)**

#### Secret 5: `STRIPE_SECRET_KEY`
**What it is:** Your Stripe secret API key (KEEP SECRET!)
**Where to get it:** Stripe Dashboard
**How to get it:**
1. Go to https://dashboard.stripe.com/apikeys
2. Copy "Secret key" (starts with `sk_` followed by test/live indicator)

**Example format:**
```
sk_test_[a-zA-Z0-9]{50,}
```

⚠️ **IMPORTANT:** Use TEST keys (sk_test_) for development, LIVE keys (sk_live_) for production!

#### Secret 6: `STRIPE_WEBHOOK_SECRET`
**What it is:** Webhook signing secret for Stripe events
**Where to get it:** Stripe Dashboard
**How to get it:**
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Webhook URL: `https://your-app.vercel.app/api/webhooks/stripe`
4. Events to send: Select "payment_intent.succeeded" and others you need
5. Copy the "Signing secret" (starts with `whsec_`)

**Example value:**
```
whsec_test_123abc456def789
```

---

### **SECTION 4: EMAIL (Resend)**

#### Secret 7: `RESEND_API_KEY`
**What it is:** Resend API key for sending emails
**Where to get it:** Resend Dashboard
**How to get it:**
1. Go to https://resend.com/api-keys
2. Click "Create" new API key
3. Copy the key (looks like: `re_xxx...`)

**Example value:**
```
re_abc123def456ghi789jkl
```

---

### **SECTION 5: SEARCH (Meilisearch)**

#### Secret 8: `MEILISEARCH_HOST`
**What it is:** URL of your Meilisearch instance
**Where to get it:** Your Meilisearch provider (self-hosted or cloud)
**How to get it:**
- If self-hosted: `http://localhost:7700`
- If cloud: Your provider's dashboard

**Example value:**
```
https://meilisearch.myapp.com
```

#### Secret 9: `MEILISEARCH_MASTER_KEY`
**What it is:** Master API key for Meilisearch (KEEP SECRET!)
**Where to get it:** Meilisearch dashboard/settings
**How to get it:**
1. Go to your Meilisearch instance
2. Settings → API Keys
3. Copy the "Master Key"

**Example value:**
```
abc123def456ghi789jkl
```

---

### **SECTION 6: MAPS (Google)**

#### Secret 10: `GOOGLE_MAPS_API_KEY`
**What it is:** Google Maps API key for location services
**Where to get it:** Google Cloud Console
**How to get it:**
1. Go to https://console.cloud.google.com
2. Create/select project
3. APIs & Services → Credentials
4. Create new API key
5. Restrict to Maps JavaScript API

**Example value:**
```
AIzaSyCUvpM6WTRtAm_TrbOqXUAAN6FPh4F4YAU
```

---

### **SECTION 7: ERROR TRACKING (Sentry)**

#### Secret 11: `SENTRY_DSN`
**What it is:** Sentry project DSN for error tracking
**Where to get it:** Sentry Dashboard
**How to get it:**
1. Go to https://sentry.io/projects
2. Select your project
3. Settings → Client Keys (DSN)
4. Copy the DSN

**Example value:**
```
https://abc123def456@o123456.ingest.sentry.io/123456
```

---

### **SECTION 8: VERCEL DEPLOYMENT**

#### Secret 12: `VERCEL_TOKEN`
**What it is:** Vercel API token for CI/CD deployment
**Where to get it:** Vercel Settings
**How to get it:**
1. Go to https://vercel.com/account/tokens
2. Click "Create" new token
3. Scope: Full Account
4. Copy the token

**Example value:**
```
kNzuIjoiMSIsInR5cCI6IkpXVCJ9
```

#### Secret 13: `VERCEL_ORG_ID`
**What it is:** Your Vercel organization ID
**Where to get it:** Vercel Dashboard
**How to get it:**
1. Go to https://vercel.com/dashboard
2. Settings → Account
3. Copy "Organization ID"

**Example value:**
```
team_abc123def456
```

#### Secret 14: `VERCEL_PROJECT_ID`
**What it is:** Your Vercel project ID
**Where to get it:** Vercel Dashboard
**How to get it:**
1. Go to https://vercel.com/dashboard
2. Click on "StudentApartment" project
3. Settings → General
4. Copy "Project ID"

**Example value:**
```
prj_abc123def456
```

#### Secret 15: `VERCEL_DOMAIN`
**What it is:** Your production domain
**Where to get it:** Vercel Dashboard or your domain provider
**How to get it:**
- Your Vercel domain: `student-apartment.vercel.app`
- Or your custom domain: `studentapartment.com`

**Example value:**
```
student-apartment.vercel.app
```

---

## 🔄 HOW TO ADD THEM TO GITHUB

### **Step 1: Go to GitHub Secrets Page**
https://github.com/Khalilxorder/StudentApartment/settings/secrets/actions

### **Step 2: Click "New repository secret"**

### **Step 3: Fill in the form**
```
Name: GOOGLE_AI_API_KEY
Secret: [paste the actual value here]
```

### **Step 4: Click "Add secret"**

### **Step 5: Repeat for all 15 secrets**

---

## ✅ QUICK CHECKLIST

After adding all secrets, check them off:

- [ ] `GOOGLE_AI_API_KEY`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DATABASE_URL`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `MEILISEARCH_HOST`
- [ ] `MEILISEARCH_MASTER_KEY`
- [ ] `GOOGLE_MAPS_API_KEY`
- [ ] `SENTRY_DSN`
- [ ] `VERCEL_TOKEN`
- [ ] `VERCEL_ORG_ID`
- [ ] `VERCEL_PROJECT_ID`
- [ ] `VERCEL_DOMAIN`

---

## 📊 SECRETS SUMMARY TABLE

| # | Secret Name | Service | Type | Where to Get |
|---|---|---|---|---|
| 1 | `GOOGLE_AI_API_KEY` | Google AI | Public | aistudio.google.com/app/apikey |
| 2 | `SUPABASE_URL` | Supabase | Public | supabase.com/dashboard |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | Supabase | **SECRET** | supabase.com/dashboard → Settings → API |
| 4 | `DATABASE_URL` | Supabase | **SECRET** | supabase.com/dashboard → Settings → Database |
| 5 | `STRIPE_SECRET_KEY` | Stripe | **SECRET** | dashboard.stripe.com/apikeys |
| 6 | `STRIPE_WEBHOOK_SECRET` | Stripe | **SECRET** | dashboard.stripe.com/webhooks |
| 7 | `RESEND_API_KEY` | Resend | **SECRET** | resend.com/api-keys |
| 8 | `MEILISEARCH_HOST` | Meilisearch | Public | Your Meilisearch instance |
| 9 | `MEILISEARCH_MASTER_KEY` | Meilisearch | **SECRET** | Your Meilisearch settings |
| 10 | `GOOGLE_MAPS_API_KEY` | Google Cloud | Public | console.cloud.google.com |
| 11 | `SENTRY_DSN` | Sentry | Public | sentry.io/projects |
| 12 | `VERCEL_TOKEN` | Vercel | **SECRET** | vercel.com/account/tokens |
| 13 | `VERCEL_ORG_ID` | Vercel | Public | vercel.com/dashboard → Settings |
| 14 | `VERCEL_PROJECT_ID` | Vercel | Public | vercel.com/dashboard → Project Settings |
| 15 | `VERCEL_DOMAIN` | Vercel | Public | Your domain |

---

## ⚠️ IMPORTANT SECURITY NOTES

1. **NEVER** paste secrets in code or comments
2. **NEVER** commit `.env` files to Git
3. **ALWAYS** use GitHub Secrets for production keys
4. **ALWAYS** use test keys for development first
5. **ALWAYS** rotate keys after exposing them
6. **ALWAYS** use unique keys for each environment

---

## 🚀 NEXT STEP

Once you've added all 15 secrets to GitHub:

1. Go to https://vercel.com/dashboard/StudentApartment/settings/environment-variables
2. Add the same variables for Vercel (separate step!)
3. Both are needed for full functionality

See `VERCEL_SETUP_GUIDE.md` for Vercel instructions.

---

**You're doing great! Copy these values from their sources, add them to GitHub, and you'll be 50% done! 💪**
