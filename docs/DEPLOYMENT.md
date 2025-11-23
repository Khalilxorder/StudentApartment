# Deployment Guide

Deploy the Student Apartment website to production.

## Pre-Deployment Checklist

- [ ] All tests passing: `pnpm test:ci` ✓
- [ ] No TypeScript errors: `pnpm type-check` ✓
- [ ] Lint clean: `pnpm lint` ✓
- [ ] Build succeeds: `pnpm build` ✓
- [ ] Environment validated: `pnpm check:env` ✓
- [ ] Migrations applied to production DB
- [ ] Real API keys configured (not placeholders)
- [ ] Secrets stored in platform secret manager (not `.env` files)

## Environment Variables

### Required for Production

```bash
# Supabase (Database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres:...@db.your-project.supabase.co:5432/postgres

# Google Services
GOOGLE_AI_API_KEY=AIzaSy...
GOOGLE_GEMINI_API_KEY=AIzaSy...
GOOGLE_CLIENT_ID=YOUR_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Stripe (LIVE keys, not test!)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Authentication
NEXTAUTH_SECRET=<generate-random-32-chars>
NEXTAUTH_URL=https://your-production-domain.com

# Email
RESEND_API_KEY=re_...

# Optional but Recommended
REDIS_URL=redis://your-redis-host:6379
MEILISEARCH_HOST=https://your-meilisearch.com
MEILISEARCH_API_KEY=your-key
NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.io/project
ENABLE_REDIS_RATE_LIMITING=true
```

### Generate Secrets

```bash
# NEXTAUTH_SECRET and JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ENCRYPTION_KEY (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Option 1: Deploy to Vercel (Recommended)

### 1. Connect Repository

```bash
npm install -g vercel
vercel link  # Follow prompts to connect your GitHub repo
```

### 2. Set Environment Variables

In Vercel dashboard:
1. Go to Project → Settings → Environment Variables
2. Add all variables from above
3. Select **Production** environment for each
4. Mark sensitive values as Sensitive/Protected

### 3. Deploy

```bash
# Automatic: Push to main branch
git push origin main

# Manual:
vercel deploy --prod
```

### 4. Verify Deployment

```bash
# Check build logs in Vercel dashboard
# Visit https://your-vercel-domain.vercel.app
# Verify health: curl https://your-domain.com/api/health
```

## Option 2: Self-Hosted (Docker)

### 1. Build Docker Image

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod

COPY . .

# Build Next.js
RUN pnpm build

EXPOSE 3000

# Start production server
CMD ["pnpm", "start"]
```

### 2. Build & Run

```bash
# Build
docker build -t student-apartment:latest .

# Run with environment variables
docker run -d \
  -e NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... \
  -e DATABASE_URL=postgresql://... \
  -e GOOGLE_AI_API_KEY=AIzaSy... \
  -e NEXTAUTH_SECRET=your-secret \
  -e NEXTAUTH_URL=https://your-domain.com \
  -p 3000:3000 \
  student-apartment:latest
```

### 3. Use Docker Compose (Production)

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      DATABASE_URL: ${DATABASE_URL}
      GOOGLE_AI_API_KEY: ${GOOGLE_AI_API_KEY}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      # ...add all other required vars
    depends_on:
      - redis
    restart: always

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: always

volumes:
  redis_data:
```

Deploy:
```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# ... set all required variables ...

docker-compose up -d
```

## Database Migrations

### Before First Deploy

```bash
# Create .env.production with production DATABASE_URL
cp .env.production.example .env.production

# Run migrations against production DB
DATABASE_URL="your-production-db-url" pnpm db:migrate

# Verify
DATABASE_URL="your-production-db-url" pnpm db:migrate:verify
```

### Supabase Dashboard Method

1. Go to Supabase Dashboard → Your Project → SQL Editor
2. Run pending migrations manually (see `db/migrations/`)
3. Verify schema with: `\dt` (tables), `\d table_name` (schema)

## Monitoring & Maintenance

### Health Check

```bash
curl https://your-domain.com/api/health
# Should return: { "status": "ok" }
```

### Logs

**Vercel**: Dashboard → Deployments → View logs
**Self-hosted**: `docker logs <container-id>`

### Uptime Monitoring

Use services like:
- **Uptime Robot** (free): https://uptimerobot.com
- **Vercel Analytics**: Built-in
- **Sentry**: Error tracking (see [SECURITY.md](./SECURITY.md))

### Scaling

For high traffic:
- Enable Redis caching: `ENABLE_REDIS_RATE_LIMITING=true`
- Use Vercel Pro for auto-scaling
- Set up CDN (Cloudflare, AWS CloudFront)
- Monitor database connection limits

## Rollback

### Vercel

1. Dashboard → Deployments → Select previous deployment
2. Click "..." → Promote to Production

### Self-Hosted

```bash
# Rollback image
docker run -d \
  -e ... \
  student-apartment:previous-tag
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check `pnpm build` locally; ensure all vars configured |
| Database connection error | Verify `DATABASE_URL`, check IP whitelist in Supabase |
| Rate limiting not working | Set `ENABLE_REDIS_RATE_LIMITING=true`, configure Redis |
| Stripe webhooks not firing | Verify webhook secret in Stripe dashboard matches `STRIPE_WEBHOOK_SECRET` |
| Images not loading | Check public asset paths, verify CDN configuration |

---

**Next**: See [SECURITY.md](./SECURITY.md) for production hardening and [PLAYBOOK.md](./PLAYBOOK.md) for ops.
