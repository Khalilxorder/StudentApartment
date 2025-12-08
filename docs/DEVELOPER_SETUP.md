# Developer Setup Guide

## Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Git**: Latest version
- **Supabase Account**: https://supabase.com
- **Stripe Account** (optional): https://stripe.com

---

## Quick Start (5 minutes)

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-org/student-apartments.git
   cd student-apartments
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure Environment**
   Edit `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   DATABASE_URL=postgresql://...
   ```

5. **Run Database Migrations**
   ```bash
   npm run db:migrate
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

7. **Open Browser**
   Visit http://localhost:3000

---

## Detailed Setup

### 1. Supabase Configuration

1. Create project at https://supabase.com
2. Get credentials from **Settings → API**
3. Copy to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. Database Setup

Run migrations to create tables:
```bash
npm run db:migrate
```

Seed data (optional):
```bash
npm run db:seed
```

### 3. Additional Services (Optional)

#### Stripe (Payments)
1. Create account at https://stripe.com
2. Get TEST API keys from **Developers → API keys**
3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

#### Google Maps (Location)
1. Enable Maps JavaScript API at https://console.cloud.google.com
2. Create API key
3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_MAPS_API_KEY=AIzaSy...
   ```

#### Sentry (Error Tracking)
1. Create project at https://sentry.io
2. Copy DSN
3. Add to `.env.local`:
   ```
   SENTRY_DSN=https://...@sentry.io/...
   ```

---

## Development Workflow

### Running Tests
```bash
# Unit tests
npm test

# E2E tests
npm run e2e

# Coverage
npm run test:coverage
```

### Linting & Formatting
```bash
# Check linting
npm run lint

# Auto-fix linting
npm run lint:fix

# Type check
npm run type-check
```

### Building
```bash
# Production build
npm run build

# Start production server
npm start
```

---

## Project Structure

```
student-apartments/
├── app/                    # Next.js app directory
│   ├── (app)/             # Main app routes
│   ├── api/               # API endpoints
│   ├── error.tsx          # Error boundary
│   └── layout.tsx         # Root layout
├── components/             # React components
├── lib/                    # Utility libraries
│   ├── logger.ts          # Structured logging
│   ├── error-handler.ts   # Error handling
│   └── database-optimizations.ts
├── services/               # External service integrations
├── supabase/              # Database
│   └── migrations/        # SQL migrations
├── docs/                   # Documentation
│   ├── API.md             # API documentation
│   ├── RUNBOOK.md         # Incident response
│   ├── DISASTER_RECOVERY.md
│   └── PERFORMANCE.md
├── e2e/                    # End-to-end tests
├── .env.example           # Environment template
└── package.json           # Dependencies
```

---

## Common Tasks

### Creating a New API Route
1. Create file in `app/api/your-route/route.ts`
2. Use standardized responses:
   ```typescript
   import { successResponse, ApiErrors } from '@/lib/api-response';
   
   export async function GET() {
     return successResponse({ data: 'value' });
   }
   ```

### Adding a Database Migration
1. Create file: `supabase/migrations/YYYYMMDD_description.sql`
2. Write SQL:
   ```sql
   CREATE TABLE IF NOT EXISTS your_table (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
3. Run: `npm run db:migrate`

### Creating a Component
1. Create in `components/YourComponent.tsx`
2. Export from `components/index.ts`
3. Import where needed

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
```

### Database Connection Issues
1. Check `.env.local` has correct `DATABASE_URL`
2. Verify Supabase project is active
3. Check firewall/network settings

### Build Errors
1. Clear cache:
   ```bash
   rm -rf .next
   npm run build
   ```
2. Check TypeScript errors: `npm run type-check`

---

## Getting Help

- **Documentation**: See `/docs` folder
- **Issues**: https://github.com/your-org/student-apartments/issues
- **Team Chat**: [Slack/Discord link]
- **On-Call**: See [RUNBOOK.md](./RUNBOOK.md)

---

## Pre-commit Hooks

Automatically run before each commit:
- Type checking
- Linting
- Format checking

To install:
```bash
chmod +x scripts/pre-commit.js
ln -s ../../scripts/pre-commit.js .git/hooks/pre-commit
```

To bypass (not recommended):
```bash
git commit --no-verify
```
