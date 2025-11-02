# Database Migration Guide

**Purpose**: Run database schema migrations in production  
**Issue**: Local network cannot reach Supabase (ENOTFOUND error)  
**Solution**: Run migrations via Vercel CLI or GitHub Actions  
**Estimated Time**: 15-30 minutes

---

## 🔍 Problem: Local Network Blocked

### Symptoms:
```bash
$ pnpm db:migrate
Error: getaddrinfo ENOTFOUND db.kdlxbtuovimrouwuxoyc.supabase.co
```

### Root Cause:
- DNS resolves to IPv6 but connection fails
- Likely firewall/VPN configuration issue
- Local machine cannot reach Supabase directly

### Verification:
```powershell
# Test connection
Test-NetConnection -ComputerName db.kdlxbtuovimrouwuxoyc.supabase.co -Port 5432

# Should show: TcpTestSucceeded : False
```

---

## ✅ Solution 1: Run via Vercel CLI (Recommended)

### Prerequisites:
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Link to your project
cd "c:\Users\Administrator\Desktop\All Student apartment files\SA-GitHub-Upload"
vercel link
```

### Step 1: Pull Production Environment
```bash
# Download production env vars to .env.production
vercel env pull .env.production

# Verify DATABASE_URL is present
cat .env.production | findstr DATABASE_URL
```

### Step 2: Run Migrations Locally Against Production DB
```bash
# Set environment to production
$env:NODE_ENV="production"

# Load production env vars
$env:DATABASE_URL=(Get-Content .env.production | Select-String "DATABASE_URL" | ForEach-Object { $_ -replace "DATABASE_URL=","" })

# Run migrations
pnpm db:migrate

# Expected output:
# ✅ Migration 001_initial_schema.sql applied
# ✅ Migration 002_add_apartments.sql applied
# ✅ All migrations applied successfully
```

### Step 3: Verify Migrations Applied
```bash
# Check migration history
$env:DATABASE_URL=(Get-Content .env.production | Select-String "DATABASE_URL" | ForEach-Object { $_ -replace "DATABASE_URL=","" })

psql $env:DATABASE_URL -c "SELECT * FROM _prisma_migrations ORDER BY applied_at DESC LIMIT 5;"

# Should show recent migrations with timestamps
```

---

## ✅ Solution 2: Run via GitHub Actions

### Prerequisites:
- GitHub Actions secrets configured (see GITHUB_SECRETS_SETUP.md)
- `DATABASE_URL` secret added to repository

### Step 1: Create Migration Workflow

Create `.github/workflows/db-migrate.yml`:

```yaml
name: Database Migration

on:
  workflow_dispatch:  # Manual trigger
    inputs:
      confirm:
        description: 'Type "migrate" to confirm'
        required: true
        default: ''

jobs:
  migrate:
    runs-on: ubuntu-latest
    if: github.event.inputs.confirm == 'migrate'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          echo "Running database migrations..."
          pnpm db:migrate
          echo "✅ Migrations completed"
      
      - name: Verify migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          echo "Verifying migration history..."
          psql $DATABASE_URL -c "SELECT migration_name, applied_at FROM _prisma_migrations ORDER BY applied_at DESC LIMIT 5;"
```

### Step 2: Trigger Workflow

1. Go to: https://github.com/Khalilxorder/StudentApartment/actions
2. Click "Database Migration" workflow
3. Click "Run workflow"
4. Type "migrate" in the confirmation input
5. Click "Run workflow"

### Step 3: Monitor Execution

1. Watch workflow progress in Actions tab
2. Check logs for:
   ```
   Running database migrations...
   ✅ Migration 001_initial_schema.sql applied
   ✅ All migrations completed
   ```
3. Verify no errors in workflow output

---

## ✅ Solution 3: Direct psql Connection (If VPN Fixed)

### Prerequisites:
- VPN/firewall configured to allow Supabase connections
- PostgreSQL client installed

### Step 1: Test Connection
```bash
# Get DATABASE_URL from .env.local
$databaseUrl = Get-Content .env.local | Select-String "DATABASE_URL=" | ForEach-Object { $_ -replace "DATABASE_URL=","" }

# Test connection
psql $databaseUrl -c "SELECT version();"

# Should show: PostgreSQL 15.x on x86_64-pc-linux-gnu
```

### Step 2: Run Migrations
```bash
# If connection works, run migrations normally
pnpm db:migrate

# Should complete successfully
```

---

## 📝 Migration Files

### Location:
```
db/migrations/
├── 20241019000001_initial_schema.sql
├── 20241019000002_add_apartments_table.sql
├── 20241019000003_add_users_profiles.sql
├── 20241019000004_add_messaging_system.sql
├── 20241019000005_add_payments_table.sql
├── 20241019000006_add_trust_safety.sql
├── 20241019000007_add_search_analytics.sql
└── 20241019000008_add_notifications.sql
```

### Key Tables Created:
- `apartments` - Property listings
- `user_profiles` - Extended user info
- `messages` - User-to-user messaging
- `bookings` - Reservation system
- `payments` - Payment tracking
- `trust_safety_reports` - Moderation
- `search_queries` - Analytics
- `notifications` - User notifications

---

## 🔍 Verification Checklist

After running migrations, verify:

### 1. Check Migration History
```sql
-- Via psql
psql $DATABASE_URL -c "
  SELECT 
    migration_name, 
    applied_at,
    execution_time
  FROM _prisma_migrations 
  ORDER BY applied_at DESC;
"
```

### 2. Verify Tables Exist
```sql
-- Check table count
psql $DATABASE_URL -c "
  SELECT COUNT(*) as table_count
  FROM information_schema.tables
  WHERE table_schema = 'public';
"

-- Should show: 15-20 tables
```

### 3. Check Key Tables
```sql
-- Verify apartments table
psql $DATABASE_URL -c "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'apartments'
  ORDER BY ordinal_position;
"

-- Should show columns: id, title, description, price, bedrooms, etc.
```

### 4. Test Data Access
```sql
-- Check for seed data
psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM universities;
  SELECT COUNT(*) FROM amenities;
"

-- Should show: universities > 0, amenities > 0 (if seed script run)
```

---

## 🚨 Troubleshooting

### Error: "Migration already applied"
**Cause**: Migration file modified after being applied  
**Solution**: 
```sql
-- Check migration checksums
SELECT migration_name, checksum FROM _prisma_migrations;

-- If checksum mismatch, either:
-- 1. Revert migration file to original
-- 2. Delete migration record (dangerous!)
-- 3. Create new migration with changes
```

### Error: "Column already exists"
**Cause**: Partial migration failure, some objects created  
**Solution**:
```sql
-- Rollback partial changes
-- Option 1: Drop specific objects
DROP TABLE IF EXISTS problematic_table CASCADE;

-- Option 2: Reset migration
DELETE FROM _prisma_migrations WHERE migration_name = 'problematic_migration';

-- Then re-run migration
```

### Error: "Permission denied"
**Cause**: DATABASE_URL using read-only role  
**Solution**: Ensure using `postgres` superuser or role with CREATE privileges

### Error: "Timeout connecting to database"
**Cause**: Database paused or network issue  
**Solution**:
1. Check Supabase dashboard - unpause database
2. Verify DATABASE_URL is correct
3. Try from different network (use GitHub Actions)

---

## 📋 Post-Migration Tasks

### 1. Seed Reference Data
```bash
# Run seed script
pnpm db:seed

# Or manually via SQL
psql $DATABASE_URL -f db/seed.sql
```

### 2. Create Indexes (Performance)
```sql
-- Key indexes for search performance
CREATE INDEX IF NOT EXISTS idx_apartments_location ON apartments USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_apartments_price ON apartments (price);
CREATE INDEX IF NOT EXISTS idx_apartments_bedrooms ON apartments (bedrooms);
CREATE INDEX IF NOT EXISTS idx_messages_users ON messages (sender_id, receiver_id);
```

### 3. Update Row Level Security (RLS)
```sql
-- Enable RLS on public tables
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies (see db/migrations/rls_policies.sql)
```

### 4. Vacuum and Analyze
```sql
-- Optimize database after migrations
VACUUM ANALYZE;

-- Check table statistics
SELECT schemaname, tablename, n_live_tup 
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC;
```

---

## ✅ Success Criteria

Mark migration as complete when:

- [ ] All migration files executed without errors
- [ ] `_prisma_migrations` table shows all migrations applied
- [ ] Key tables exist (apartments, user_profiles, messages, etc.)
- [ ] Seed data loaded successfully
- [ ] Indexes created
- [ ] RLS policies applied
- [ ] `pnpm db:status` shows "All migrations applied"

---

## 🔗 Related Documentation

- Supabase Migrations: https://supabase.com/docs/guides/cli/managing-environments
- PostgreSQL psql: https://www.postgresql.org/docs/current/app-psql.html
- Vercel CLI: https://vercel.com/docs/cli

---

## 📊 Migration Status Tracking

### Check Current Status:
```bash
# Via pnpm script
pnpm db:status

# Output:
# ✅ 8 migrations applied
# ⏳ 0 migrations pending
# 📊 Database is up to date
```

### Manual Status Check:
```sql
-- Count applied migrations
SELECT COUNT(*) as applied_count 
FROM _prisma_migrations 
WHERE success = true;

-- List pending migrations (if any)
SELECT migration_name 
FROM _prisma_migrations 
WHERE success = false;
```

---

**Last Updated**: November 2, 2025  
**Status**: Ready for execution  
**Recommended Method**: Vercel CLI (Solution 1)  
**Next Step**: Run migrations, then build embeddings
