# GitHub Actions Secrets Setup Guide

**Purpose**: Configure all required secrets for CI/CD pipeline  
**Location**: https://github.com/Khalilxorder/StudentApartment/settings/secrets/actions  
**Total Secrets**: 25 required + 5 optional  
**Estimated Time**: 30-45 minutes

---

## 🔐 Required Secrets (25)

### 1. Supabase Configuration (4 secrets)

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Source**: https://supabase.com/dashboard/project/kdlxbtuovimrouwuxoyc/settings/api
- **Value**: `https://kdlxbtuovimrouwuxoyc.supabase.co`
- **Public**: Yes (safe to expose)
- **Used By**: Frontend + Backend

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Source**: Same page as above (Project API keys → anon/public)
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long JWT token)
- **Public**: Yes (has Row Level Security)
- **Used By**: Frontend + Backend

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Source**: Same page (Project API keys → service_role)
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long JWT token)
- **Public**: ⚠️ NO - Keep secret! Bypasses RLS
- **Used By**: Backend only, migrations, admin operations

#### `DATABASE_URL`
- **Source**: Supabase Dashboard → Settings → Database → Connection string
- **Format**: `postgresql://postgres:[YOUR-PASSWORD]@db.kdlxbtuovimrouwuxoyc.supabase.co:5432/postgres`
- **Note**: Replace `[YOUR-PASSWORD]` with your actual database password
- **Used By**: Migrations, scripts, Prisma

---

### 2. Google Cloud Services (5 secrets)

#### `GOOGLE_AI_API_KEY`
- **Source**: https://aistudio.google.com/apikey
- **Value**: `AIzaSy...` (39 characters starting with AIzaSy)
- **⚠️ IMPORTANT**: Use NEW key (after revoking exposed ones)
- **Used By**: AI search, semantic embeddings, query analysis
- **Billing**: Must enable billing for production quotas

#### `GOOGLE_GEMINI_API_KEY`
- **Source**: Same as GOOGLE_AI_API_KEY
- **Value**: Same key as GOOGLE_AI_API_KEY
- **Note**: Alias for compatibility
- **Used By**: Gemini-specific features

#### `NEXT_PUBLIC_MAPS_API_KEY`
- **Source**: https://console.cloud.google.com/apis/credentials
- **Value**: `AIzaSy...` (39 characters)
- **⚠️ IMPORTANT**: Use NEW key with restrictions
- **Restrictions**: Maps JavaScript API, Places API, Geocoding API
- **Used By**: Map display, location search, geocoding

#### `GOOGLE_SIGN_IN_API_KEY`
- **Source**: https://console.cloud.google.com/apis/credentials → OAuth 2.0 Client ID
- **Value**: OAuth Client ID (starts with numbers, ends with .apps.googleusercontent.com)
- **⚠️ IMPORTANT**: Use NEW OAuth client with proper redirect URIs
- **Used By**: Google OAuth sign-in

#### `GOOGLE_CLIENT_SECRET`
- **Source**: Same OAuth 2.0 Client page (click on client → Client secret)
- **Value**: `GOCSPX-...` (starts with GOCSPX-)
- **Used By**: OAuth flow completion

---

### 3. Stripe Payment Processing (3 secrets)

#### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Source**: https://dashboard.stripe.com/test/apikeys
- **Value**: `pk_test_...` (for test mode) or `pk_live_...` (for production)
- **Public**: Yes (safe to expose)
- **Used By**: Frontend payment forms

#### `STRIPE_SECRET_KEY`
- **Source**: Same page (Secret key)
- **Value**: `sk_test_...` (for test mode) or `sk_live_...` (for production)
- **⚠️ CRITICAL**: Never expose publicly!
- **Used By**: Backend payment processing

#### `STRIPE_WEBHOOK_SECRET`
- **Source**: https://dashboard.stripe.com/test/webhooks
- **Value**: `whsec_...` (signing secret from webhook endpoint)
- **Setup**: Create endpoint at `https://your-vercel-app.vercel.app/api/webhooks/stripe`
- **Used By**: Webhook signature verification

---

### 4. Search & Indexing (3 secrets)

#### `MEILISEARCH_HOST`
- **Source**: Your Meilisearch instance
- **Value**: `http://localhost:7700` (dev) or `https://your-meilisearch.com` (prod)
- **Note**: For CI/CD, use cloud-hosted Meilisearch or mock
- **Used By**: Search indexing, semantic search

#### `MEILISEARCH_MASTER_KEY`
- **Source**: Your Meilisearch admin panel or deployment
- **Value**: Random string (32+ characters)
- **Used By**: Index management, admin operations

#### `MEILISEARCH_API_KEY`
- **Source**: Meilisearch dashboard → API Keys
- **Value**: Search-only API key
- **Used By**: Frontend search queries

---

### 5. Email & Notifications (2 secrets)

#### `RESEND_API_KEY`
- **Source**: https://resend.com/api-keys
- **Value**: `re_...` (starts with re_)
- **Used By**: Transactional emails (verification, notifications)
- **Free Tier**: 100 emails/day

#### `SMTP_HOST` + `SMTP_PORT` + `SMTP_USER` + `SMTP_PASS`
- **Alternative**: If using SMTP instead of Resend
- **Common**: Gmail SMTP: smtp.gmail.com:587
- **Used By**: Email notifications

---

### 6. Authentication (2 secrets)

#### `NEXTAUTH_SECRET`
- **Source**: Generate with: `openssl rand -base64 32`
- **Value**: Random 32+ character string
- **⚠️ CRITICAL**: Must be same across all environments
- **Used By**: NextAuth session encryption

#### `NEXTAUTH_URL`
- **Source**: Your deployment URL
- **Value**: `https://your-vercel-app.vercel.app` (production)
- **Note**: Different for staging/production
- **Used By**: OAuth callback URLs

---

### 7. Vercel Deployment (3 secrets)

#### `VERCEL_TOKEN`
- **Source**: https://vercel.com/account/tokens
- **Value**: Long alphanumeric token
- **Scope**: Full access to your Vercel projects
- **Used By**: CI/CD automated deployments

#### `VERCEL_ORG_ID`
- **Source**: Vercel project settings → General
- **Value**: `team_...` or `user_...`
- **Used By**: Vercel CLI authentication

#### `VERCEL_PROJECT_ID`
- **Source**: Same page as VERCEL_ORG_ID
- **Value**: `prj_...`
- **Used By**: Target project for deployments

---

### 8. Monitoring & Observability (2 optional)

#### `SENTRY_DSN`
- **Source**: https://sentry.io/settings/[your-org]/projects/[your-project]/keys/
- **Value**: `https://[key]@[org].ingest.sentry.io/[project]`
- **Optional**: Only if using Sentry
- **Used By**: Error tracking and monitoring

#### `NEXT_PUBLIC_POSTHOG_KEY`
- **Source**: https://posthog.com/project/settings
- **Value**: `phc_...`
- **Optional**: Only if using PostHog
- **Used By**: Analytics and user behavior tracking

---

## 🚀 Quick Add Script

### Method 1: GitHub Web UI (Easiest)

1. Go to: https://github.com/Khalilxorder/StudentApartment/settings/secrets/actions
2. Click **"New repository secret"**
3. Add each secret one by one:
   - Name: `SECRET_NAME`
   - Value: `secret_value`
   - Click **"Add secret"**

### Method 2: GitHub CLI (Faster)

```bash
# Install GitHub CLI
# Windows: winget install GitHub.cli
# Mac: brew install gh
# Login
gh auth login

# Add secrets (replace with your actual values)
gh secret set NEXT_PUBLIC_SUPABASE_URL --body "https://kdlxbtuovimrouwuxoyc.supabase.co"
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --body "your_anon_key_here"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "your_service_role_key_here"
gh secret set DATABASE_URL --body "postgresql://postgres:password@db.kdlxbtuovimrouwuxoyc.supabase.co:5432/postgres"

gh secret set GOOGLE_AI_API_KEY --body "your_new_google_ai_key"
gh secret set GOOGLE_GEMINI_API_KEY --body "your_new_google_ai_key"
gh secret set NEXT_PUBLIC_MAPS_API_KEY --body "your_new_maps_key"
gh secret set GOOGLE_SIGN_IN_API_KEY --body "your_oauth_client_id"
gh secret set GOOGLE_CLIENT_SECRET --body "your_oauth_secret"

gh secret set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY --body "pk_test_your_key"
gh secret set STRIPE_SECRET_KEY --body "sk_test_your_key"
gh secret set STRIPE_WEBHOOK_SECRET --body "whsec_your_secret"

gh secret set MEILISEARCH_HOST --body "http://localhost:7700"
gh secret set MEILISEARCH_MASTER_KEY --body "your_master_key"
gh secret set MEILISEARCH_API_KEY --body "your_api_key"

gh secret set RESEND_API_KEY --body "re_your_key"

gh secret set NEXTAUTH_SECRET --body "$(openssl rand -base64 32)"
gh secret set NEXTAUTH_URL --body "https://your-vercel-app.vercel.app"

gh secret set VERCEL_TOKEN --body "your_vercel_token"
gh secret set VERCEL_ORG_ID --body "your_org_id"
gh secret set VERCEL_PROJECT_ID --body "your_project_id"

# Optional
gh secret set SENTRY_DSN --body "your_sentry_dsn"
gh secret set NEXT_PUBLIC_POSTHOG_KEY --body "your_posthog_key"
```

### Method 3: Bulk Import Script (PowerShell)

```powershell
# Save this as setup-github-secrets.ps1
# Run: .\setup-github-secrets.ps1

$secrets = @{
    "NEXT_PUBLIC_SUPABASE_URL" = "https://kdlxbtuovimrouwuxoyc.supabase.co"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY" = "your_anon_key"
    # ... add all secrets here
}

foreach ($secret in $secrets.GetEnumerator()) {
    Write-Host "Adding $($secret.Key)..."
    gh secret set $secret.Key --body $secret.Value
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $($secret.Key) added successfully"
    } else {
        Write-Host "❌ Failed to add $($secret.Key)"
    }
}
```

---

## ✅ Verification

### Check Secrets Are Set

```bash
# List all secrets (values are hidden)
gh secret list

# Should show all 25+ secrets with "Updated" timestamps
```

### Test CI/CD Pipeline

1. Push a commit to trigger GitHub Actions:
   ```bash
   git commit --allow-empty -m "test: Trigger CI with new secrets"
   git push origin main
   ```

2. Check workflow: https://github.com/Khalilxorder/StudentApartment/actions

3. Verify:
   - ✅ Build succeeds
   - ✅ Tests run
   - ✅ No "secret not found" errors
   - ✅ Deployment completes

---

## 🔍 Troubleshooting

### Issue: "Secret not found" in GitHub Actions

**Solution**: Check secret name matches exactly (case-sensitive)
```yaml
# .github/workflows/ci-cd.yml
env:
  GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY }}  # Must match exactly
```

### Issue: "Invalid secret value"

**Solution**: 
- Remove quotes if copying from .env.local
- Ensure no newlines or spaces
- Check for special characters that need escaping

### Issue: Workflow still failing after adding secrets

**Solution**:
1. Re-run workflow (may need to re-trigger)
2. Check logs for specific error
3. Verify secret value is correct (delete and re-add)

### Issue: Database connection fails in CI

**Solution**:
- Ensure `DATABASE_URL` includes password
- Check Supabase allows connections from GitHub Actions IPs
- Verify database is not paused

---

## 📋 Checklist

Before marking this todo as complete, verify:

- [ ] All 25 required secrets added to GitHub
- [ ] `gh secret list` shows all secrets
- [ ] Pushed test commit triggers CI successfully
- [ ] GitHub Actions workflow completes without errors
- [ ] No "secret not found" or "undefined" errors in logs
- [ ] Build and test steps pass
- [ ] Deployment step completes (if configured)

**Estimated Completion Time**: 30-45 minutes  
**Dependencies**: Must complete security tasks (new API keys) first  
**Blocks**: CI/CD pipeline, automated deployments

---

## 🔗 Related Documentation

- GitHub Actions Docs: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- Vercel Environment Variables: https://vercel.com/docs/concepts/projects/environment-variables
- Supabase API Keys: https://supabase.com/docs/guides/api#api-keys

---

**Last Updated**: November 2, 2025  
**Status**: Ready for configuration  
**Next Step**: Add secrets after completing security key rotation
