# Deployment Guide

This guide covers deploying Student Apartments to production on Vercel.

## 📋 Pre-Deployment Checklist

### 1. Database Setup ✅

- [ ] Supabase project created
- [ ] Database migration executed (`RUN_THIS_FORCE_CLEAN_MIGRATION.sql`)
- [ ] Row Level Security policies enabled
- [ ] Storage bucket "apartments" created (10MB limit)
- [ ] Database indexes created

### 2. External Services ✅

- [ ] **Stripe Account**
  - [ ] Stripe Connect enabled
  - [ ] Webhook endpoint configured
  - [ ] Test mode keys available
  - [ ] Production mode keys available

- [ ] **Google AI (Gemini)**
  - [ ] API key obtained from Google AI Studio
  - [ ] Rate limits configured

- [ ] **Meilisearch**
  - [ ] Instance deployed (Meilisearch Cloud or self-hosted)
  - [ ] Master key secured
  - [ ] Index created

- [ ] **Monitoring** (Optional)
  - [ ] Sentry project created
  - [ ] PostHog project created

### 3. Environment Variables ✅

All required environment variables documented in `.env.example`

## 🚀 Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Click "Import Project"
   - Select your GitHub repository
   - Click "Import"

2. **Configure Project**
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

3. **Add Environment Variables**
   - Go to Settings → Environment Variables
   - Add all variables from `.env.local`:

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Database
   DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

   # Google AI
   GOOGLE_AI_API_KEY=your_google_ai_api_key

   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
   STRIPE_SECRET_KEY=sk_live_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx

   # Meilisearch
   MEILISEARCH_HOST=https://your-instance.meilisearch.io
   MEILISEARCH_API_KEY=your_master_key

   # Monitoring (Optional)
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~3-5 minutes)
   - Vercel will assign a URL: `https://your-project.vercel.app`

### Option 2: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## 🔄 Post-Deployment Tasks

### 1. Verify Deployment ✅

```bash
# Check homepage
curl https://your-project.vercel.app

# Check API health
curl https://your-project.vercel.app/api/health
```

### 2. Configure Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter URL: `https://your-project.vercel.app/api/webhooks/stripe`
4. Select events:
   - `account.updated`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
5. Copy webhook signing secret
6. Update `STRIPE_WEBHOOK_SECRET` in Vercel

### 3. Seed Database (Optional)

```bash
# From local machine
npm run seed:realistic
```

### 4. Build Embeddings

```bash
# From local machine (requires DATABASE_URL)
npm run build:embeddings
```

This syncs apartment data to Meilisearch with semantic embeddings.

### 5. Test Critical Flows

- [ ] **User signup** (email/password)
- [ ] **User login**
- [ ] **Search apartments**
- [ ] **View apartment detail**
- [ ] **Upload apartment** (owner)
- [ ] **Send message**
- [ ] **Stripe Connect onboarding**

## 🔍 Monitoring

### Vercel Dashboard

- **Deployments**: View build logs
- **Analytics**: Page views, visitors
- **Logs**: Runtime logs (serverless functions)

### Sentry (Errors)

- Monitor errors in production
- Track user sessions
- Performance monitoring

### PostHog (Analytics)

- User funnels
- Feature flags
- Session recordings

## 🐛 Troubleshooting

### Build Fails

**Error**: `Module not found`
```bash
# Solution: Verify all imports are correct
npm run type-check
```

**Error**: `Environment variable not found`
```bash
# Solution: Check all required env vars are set in Vercel
# Go to Settings → Environment Variables
```

### Runtime Errors

**Error**: `Supabase auth error`
```bash
# Solution: Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# Check Supabase project is running
```

**Error**: `Stripe webhook verification failed`
```bash
# Solution: Update STRIPE_WEBHOOK_SECRET in Vercel
# Verify webhook endpoint URL is correct
```

**Error**: `Search not working`
```bash
# Solution: Verify Meilisearch instance is running
# Run: npm run build:embeddings
# Check MEILISEARCH_HOST and MEILISEARCH_API_KEY
```

## 🔐 Security Checklist

- [ ] All environment variables set in Vercel (not in code)
- [ ] `.env.local` and `.env` in `.gitignore`
- [ ] Row Level Security enabled on all tables
- [ ] API routes protected with auth middleware
- [ ] Rate limiting configured
- [ ] CORS configured properly
- [ ] Stripe webhook signatures verified
- [ ] Content Security Policy headers set

## 📊 Performance Optimization

### 1. Enable Vercel Analytics

```bash
npm install @vercel/analytics
```

Add to `app/layout.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. Enable Vercel Speed Insights

```bash
npm install @vercel/speed-insights
```

### 3. Configure Caching

In `next.config.js`:
```javascript
module.exports = {
  // ... other config
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, s-maxage=60, stale-while-revalidate=120'
        }
      ]
    }
  ]
};
```

## 🔄 CI/CD Pipeline

The project includes GitHub Actions workflow (`.github/workflows/deploy.yml`).

### Automatic Deployments

- **Push to `main`**: Deploys to production
- **Push to `develop`**: Deploys to preview
- **Pull requests**: Creates preview deployment

### Manual Deployment

```bash
# Deploy specific branch
vercel --prod --branch=your-branch
```

## 📞 Support

If you encounter issues:

1. Check [Vercel logs](https://vercel.com/docs/observability/runtime-logs)
2. Check [Supabase logs](https://supabase.com/dashboard)
3. Review [Sentry errors](https://sentry.io)
4. Contact: support@studentapartments.com

## 🎉 Success!

Your Student Apartments platform is now live! 🚀

**Next Steps:**
- Share the URL with users
- Monitor analytics and errors
- Gather user feedback
- Iterate and improve

---

**Production URL**: `https://your-project.vercel.app`
