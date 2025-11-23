# Student Apartment Website - Documentation

This directory contains all essential documentation for development, deployment, and operations.

## Quick Links

- **[README.md](./README.md)** — Overview, quick start, local setup
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Environment setup, build, deployment steps
- **[SECURITY.md](./SECURITY.md)** — Rate limiting, CSRF, auth flows, best practices
- **[PLAYBOOK.md](./PLAYBOOK.md)** — Ops runbook, common tasks, troubleshooting
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design, data flow, service diagram

## Overview

This is a Next.js 14 student apartment marketplace with:
- **Database**: Supabase (PostgreSQL + real-time)
- **Payments**: Stripe
- **Search**: Meilisearch + semantic search
- **AI**: Google Gemini with OpenAI fallback
- **Maps**: Google Maps + local area insights
- **Auth**: Supabase OAuth + NextAuth
- **Cache**: Redis (optional, defaults to in-memory)

## Getting Started

1. **Local Development**: See [README.md](./README.md)
2. **Deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
3. **Production**: See [SECURITY.md](./SECURITY.md) and [PLAYBOOK.md](./PLAYBOOK.md)

## Key Commands

```bash
# Setup & validation
pnpm install           # Install dependencies
pnpm check:env         # Validate environment variables
pnpm db:migrate        # Run database migrations

# Development
pnpm dev              # Start dev server (http://localhost:3000)
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript checks
pnpm test             # Run tests (watch mode)
pnpm test:ci          # Run tests once

# Building & deployment
pnpm build            # Build for production
pnpm start            # Start production server

# Database & seeding
pnpm db:seed          # Seed with sample data
pnpm db:reset         # Reset database (dev only)

# Search indexing
pnpm sync:meilisearch # Sync apartments to search index

# Quality checks
pnpm seo:audit        # Lighthouse + SEO audit
pnpm e2e              # Playwright smoke tests
```

## Environment Setup

Copy `.env.example` to `.env.local` and populate with real credentials:

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase, Google, Stripe keys
pnpm check:env        # Validate configuration
```

For production, use platform secret managers:
- **Vercel**: Settings → Environment Variables
- **Other hosts**: Use Docker secrets or CI/CD secret manager

## Deployment

### Quick Deploy to Vercel

1. Connect your GitHub repo to Vercel
2. Add environment variables in Vercel settings (see [DEPLOYMENT.md](./DEPLOYMENT.md))
3. Vercel auto-deploys on push to `main`

### Self-Hosted (Docker)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Dockerfile and deployment instructions.

## Support

- **Questions?** Check [PLAYBOOK.md](./PLAYBOOK.md)
- **Errors?** Run `pnpm check:env` and review logs
- **Security concerns?** See [SECURITY.md](./SECURITY.md)

---

**Last updated**: November 7, 2025
**Repo**: https://github.com/Khalilxorder/StudentApartment
