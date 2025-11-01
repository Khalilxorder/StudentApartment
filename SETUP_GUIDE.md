# 🚀 Student Apartments Platform - Complete Setup Guide

**Last Updated**: November 1, 2025  
**Status**: ✅ Production Ready

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (5 Minutes)](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Local Development](#local-development)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
- **Node.js** 18+ and **pnpm** (or npm)
- **Git**
- **Supabase Account** (free tier available)

### Required API Keys (Setup Time: ~1.5 hours)
1. **Supabase** - Database & Auth (15 min)
2. **Google AI (Gemini)** - AI Features (5 min)
3. **Google Maps** - Maps & Location (5 min)
4. **Google OAuth** - Social Login (10 min)
5. **Stripe** - Payments (20 min)
6. **Meilisearch** - Search (10 min) - Optional for local dev
7. **Resend** - Emails (5 min) - Optional
8. **Sentry** - Error Tracking (5 min) - Optional

---

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd student-apartment-website
pnpm install
```

### 2. Configure Environment

```bash
# Copy the example env file
cp .env.example .env.local

# Edit .env.local with your API keys
# See "Environment Configuration" section below
```

### 3. Setup Database

```bash
# Run in Supabase SQL Editor (in order):
# 1. Run: db/00_RUN_THIS_FIRST.sql
# 2. Then run migrations using the app:
pnpm db:setup
```

### 4. Start Development

```bash
pnpm dev
# Open http://localhost:3000
```

---

## Environment Configuration

### Core Variables (REQUIRED)

#### Supabase (Database & Auth)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_DB_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
```

**How to get:**
1. Go to https://app.supabase.com
2. Create new project (or select existing)
3. Go to Settings > API
4. Copy `URL`, `anon public`, and `service_role` keys
5. Go to Settings > Database to get the database URL

#### Google AI (Gemini) - AI Search Features
```bash
GOOGLE_AI_API_KEY=your-gemini-api-key-here
GOOGLE_GEMINI_API_KEY=your-gemini-api-key-here
```

**Current Model:** `gemini-2.5-flash-lite-preview`

**How to get:**
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

#### Google Maps - Location Features
```bash
NEXT_PUBLIC_MAPS_API_KEY=your-google-maps-api-key
NEXT_PUBLIC_Maps_API_KEY=your-google-maps-api-key  # (legacy compatibility)
```

**How to get:**
1. Go to https://console.cloud.google.com/google/maps-apis
2. Enable Maps JavaScript API and Places API
3. Create credentials > API Key
4. Restrict key to Maps JavaScript API and Places API

#### Google OAuth - Social Login
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_SIGN_IN_API_KEY=your-google-sign-in-api-key
```

**How to get:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Client Secret

#### Stripe - Payment Processing
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**How to get:**
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy Publishable key and Secret key
3. For webhooks: Dashboard > Developers > Webhooks
4. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`

### Optional Variables

#### Meilisearch (Search Engine)
```bash
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-meilisearch-api-key
```

#### Email (Resend)
```bash
RESEND_API_KEY=your-resend-api-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

#### Error Tracking (Sentry)
```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

#### Analytics (PostHog)
```bash
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

#### Security
```bash
NEXTAUTH_SECRET=your-nextauth-secret  # Generate: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-here
```

---

## Database Setup

### Step 1: Run Pre-Migration Script

In your Supabase SQL Editor:

```sql
-- Run this first: db/00_RUN_THIS_FIRST.sql
-- This fixes any column naming inconsistencies
```

### Step 2: Run Migrations

```bash
# This will run all migration files in db/migrations/
pnpm db:setup
```

### Step 3: Seed Database (Optional)

```bash
# Add sample data for testing
pnpm db:seed

# Or add more realistic data
pnpm seed:realistic
```

### Migration Order

The migrations run in this order:
1. `00000000000000_init_core_schema.sql` - Core tables
2. `20251019000001_create_profiles_table.sql` - User profiles
3. `20251019000002_create_reviews_and_messages.sql` - Social features
4. `20251019000003_create_user_profiles_and_verifications.sql` - Verification
5. Additional feature migrations...

---

## Local Development

### Available Commands

```bash
# Development
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:setup         # Run migrations
pnpm db:seed          # Seed with sample data
pnpm db:migrate       # Run specific migration

# Testing
pnpm test             # Run unit tests
pnpm test:ui          # Run tests with UI
pnpm e2e              # Run end-to-end tests
pnpm lint             # Check code quality

# Search & AI
pnpm sync:search      # Sync search index
pnpm build:embeddings # Build AI embeddings
```

### Project Structure

```
student-apartment-website/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Auth pages
│   └── (main)/            # Main app pages
├── components/            # React components
├── lib/                   # Utilities & configs
├── services/              # Business logic
├── db/                    # Database files
│   ├── migrations/        # SQL migrations
│   └── 00_RUN_THIS_FIRST.sql
├── utils/                 # Helper functions
├── types/                 # TypeScript types
└── public/               # Static files
```

---

## Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Import to Vercel**
   - Go to https://vercel.com
   - Click "Import Project"
   - Select your GitHub repository
   - Configure environment variables (same as .env.local)
   - Deploy!

3. **Set Environment Variables**
   - In Vercel Dashboard: Settings > Environment Variables
   - Add all variables from .env.local
   - Make sure to update URLs for production:
     ```
     NEXTAUTH_URL=https://yourdomain.vercel.app
     NEXT_PUBLIC_APP_URL=https://yourdomain.vercel.app
     ```

4. **Configure Google OAuth**
   - Add production URL to Google Console:
   - `https://yourdomain.vercel.app/api/auth/callback/google`

5. **Configure Stripe Webhooks**
   - Add webhook endpoint in Stripe Dashboard:
   - `https://yourdomain.vercel.app/api/webhooks/stripe`

### Deploy to Other Platforms

The app can be deployed to any platform that supports Next.js 14:
- **Railway**
- **Render**
- **AWS Amplify**
- **Self-hosted** (using Docker)

---

## Troubleshooting

### Common Issues

#### 1. AI Search Not Working

**Symptom:** Getting "Using local parsing (AI unavailable)" message

**Solution:**
- Check `GOOGLE_AI_API_KEY` is set in `.env.local`
- Verify you're using the correct model: `gemini-2.5-flash-lite-preview`
- Check browser console for specific error messages

#### 2. Database Connection Failed

**Symptom:** Can't connect to Supabase

**Solution:**
- Verify all Supabase env variables are correct
- Check if database URL includes the password
- Make sure Supabase project is active

#### 3. Google OAuth Not Working

**Symptom:** Can't sign in with Google

**Solution:**
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Verify redirect URI in Google Console matches your app
- For local dev: `http://localhost:3000/api/auth/callback/google`

#### 4. Build Errors

**Symptom:** Build fails with TypeScript errors

**Solution:**
```bash
# Clear cache and rebuild
rm -rf .next
rm -rf node_modules
pnpm install
pnpm build
```

#### 5. Stripe Webhooks Not Working

**Symptom:** Payments complete but not updating database

**Solution:**
- Use Stripe CLI for local testing:
  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```
- Verify `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint

### Getting Help

- **Documentation Issues:** Check the README.md and other docs in the repo
- **Code Issues:** Review the code comments and TypeScript types
- **API Issues:** Check the browser console and server logs

---

## Next Steps

After setup is complete:

1. ✅ **Test Core Features**
   - User registration and login
   - Apartment search
   - AI-powered search
   - Booking flow
   - Payment processing

2. ✅ **Customize Branding**
   - Update logo in `public/`
   - Customize colors in `tailwind.config.ts`
   - Update meta tags in `app/layout.tsx`

3. ✅ **Add Content**
   - Seed database with real apartments
   - Add neighborhood descriptions
   - Configure email templates

4. ✅ **Enable Features**
   - Set up Meilisearch for advanced search
   - Configure PostHog for analytics
   - Enable Sentry for error tracking

5. ✅ **Deploy to Production**
   - Follow deployment steps above
   - Test all features in production
   - Monitor errors and performance

---

## Important Notes

### AI Model Configuration
⚠️ **Critical:** The project uses `gemini-2.5-flash-lite-preview` model. The following files have been updated:
- `utils/gemini.ts` - Main AI utility
- `services/verification-svc/index.ts` - Document verification
- `tests/unit/gemini.test.ts` - Tests

If Google releases new models, update these files accordingly.

### Security Checklist
- ✅ Never commit `.env.local` to git
- ✅ Rotate API keys regularly
- ✅ Use different keys for development and production
- ✅ Enable Supabase Row Level Security (RLS)
- ✅ Set up proper CORS policies
- ✅ Configure rate limiting for API routes

### Performance Tips
- 🚀 Enable caching for search results
- 🚀 Use CDN for static assets
- 🚀 Optimize images with Next.js Image component
- 🚀 Enable Redis for session storage (production)
- 🚀 Set up Meilisearch for fast search

---

**Happy Coding! 🎉**

For questions or issues, check the documentation or review the codebase comments.
