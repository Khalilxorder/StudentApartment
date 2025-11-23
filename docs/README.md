# Quick Start Guide

Get the Student Apartment website running in 5 minutes.

## Prerequisites

- Node.js 18+ (or use `nvm use`)
- pnpm 8+ (`npm install -g pnpm`)
- Git
- A Supabase project (free tier OK)

## Step 1: Clone & Install

```bash
# Clone the repo
git clone https://github.com/Khalilxorder/StudentApartment.git
cd StudentApartment/SA-GitHub-Upload

# Install dependencies
pnpm install

# Validate environment
pnpm check:env
```

## Step 2: Configure Environment

```bash
# Copy the template
cp .env.example .env.local

# Edit .env.local with your credentials:
# - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# - DATABASE_URL (for migrations)
# - GOOGLE_AI_API_KEY, GOOGLE_CLIENT_ID/SECRET
# - STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# - NEXTAUTH_SECRET (can be any random string for dev)
# - NEXTAUTH_URL (http://localhost:3000 for local)

nano .env.local  # or open in your editor
pnpm check:env   # Verify all required vars are set
```

## Step 3: Setup Database

```bash
# Run migrations to create tables
pnpm db:migrate

# (Optional) Seed with sample data
pnpm db:seed
```

## Step 4: Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — you're done! 🎉

## Common Tasks

### Login / Signup

- Visit [http://localhost:3000/signup](http://localhost:3000/signup)
- Use test Google OAuth credentials or email/password

### View Admin Dashboard

- Visit [http://localhost:3000/admin](http://localhost:3000/admin)
- Requires admin role (see database seeding)

### Test AI Features

- Go to apartment details → "Get AI Insights"
- Ensure `GOOGLE_AI_API_KEY` is configured

### Search Apartments

- Use [http://localhost:3000/search](http://localhost:3000/search)
- Requires Meilisearch (optional for local dev)

## Stopping & Cleaning Up

```bash
# Stop dev server
Ctrl+C

# Clear cache & lock files
rm -rf .next node_modules pnpm-lock.yaml
pnpm install
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ENOTFOUND` error | Check internet connection and Supabase URL in `.env.local` |
| `Environment validation failed` | Run `pnpm check:env` and see which vars are missing |
| Database migration fails | Ensure `DATABASE_URL` points to your Supabase project |
| AI endpoints return 403 | Verify `GOOGLE_AI_API_KEY` is valid |
| Search not working | Meilisearch is optional; run `pnpm sync:meilisearch` if needed |

## Next Steps

- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
- Check [SECURITY.md](./SECURITY.md) for auth & rate limiting
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview

---

**Got stuck?** See [PLAYBOOK.md](./PLAYBOOK.md) for more detailed troubleshooting.
