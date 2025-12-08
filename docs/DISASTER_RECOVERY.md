# Disaster Recovery Plan

## Overview
This document outlines procedures for data backup, recovery, and business continuity for the Student Apartment application.

## Recovery Time Objective (RTO) & Recovery Point Objective (RPO)

| Component | RTO | RPO | Notes |
|-----------|-----|-----|-------|
| Database | 1 hour | 24 hours | Supabase daily backups |
| Application | 30 minutes | N/A | Stateless, redeploy from Git |
| User uploads (Storage) | 1 hour | 24 hours | Supabase storage backups |
| Configuration | 15 minutes | N/A | Stored in Git + env vars |

---

## Backup Strategy

### Database (Supabase)
- **Automatic**: Daily backups (retained for 7 days on paid plan)
- **Location**: Supabase infrastructure
- **Access**: Via Supabase dashboard or CLI

**How to restore**:
```bash
# Using Supabase CLI
supabase db dump -f backup.sql
supabase db reset
psql $DATABASE_URL < backup.sql
```

### Storage Buckets
- **Automatic**: Supabase backup (if configured)
- **Manual**: Use Supabase CLI to download/upload

**How to backup manually**:
```bash
# List all files
supabase storage list apartment-images

# Download all (requires script)
# [Create download script if needed]
```

### Application Code
- **Source**: GitHub repository
- **Backups**: Git history provides complete version control
- **Recovery**: Redeploy from any commit

### Environment Variables & Secrets
- **Primary**: Vercel project settings (encrypted)
- **Backup**: Securely store in password manager (1Password, LastPass)
- **Recovery**: Re-configure via Vercel dashboard or CLI

---

## Disaster Scenarios & Recovery Procedures

### Scenario 1: Complete Database Loss
**Impact**: Total data loss, application unusable

**Recovery**:
1. Contact Supabase support immediately
2. Restore from latest backup (max 24h data loss)
3. Verify data integrity via `npm run db:migrate`
4. Test application functionality
5. Notify affected users of potential data loss

**Prevention**:
- Upgrade to Supabase paid plan (7-day retention)
- Implement off-site backup strategy (export to S3/GCS weekly)

### Scenario 2: Application Down (Vercel outage)
**Impact**: Frontend/API unavailable

**Recovery**:
1. Check Vercel status page
2. Deploy to backup platform:
   - Netlify: `netlify deploy --prod`
   - Self-hosted: `npm run build && npm start`
3. Update DNS to point to backup (if needed)

**Prevention**:
- Maintain deployment configs for multiple platforms
- Implement health check monitoring with auto-failover

### Scenario 3: Ransomware / Security Breach
**Impact**: Data compromised, unauthorized access

**Recovery**:
1. **Immediate**: Rotate all API keys and secrets
2. **Isolate**: Disable compromised accounts
3. **Assess**: Determine breach scope via logs
4. **Restore**: From known-good backup (may be >24h old)
5. **Notify**: Users affected (GDPR compliance)

**Prevention**:
- Enable 2FA on all admin accounts
- Regular security audits
- Implement WAF (Web Application Firewall)

### Scenario 4: Accidental Data Delete
**Impact**: User data or listings deleted

**Recovery**:
1. Check Git history for code changes
2. Restore from database backup
3. Apply delta changes (transactions after backup)

**Prevention**:
- Implement soft deletes (`deleted_at` column)
- Add confirmation dialogs for bulk operations
- Enable Row Level Security (RLS) in Supabase

---

## Data Retention Policy (GDPR Compliance)

### User Data
- **Active accounts**: Retained indefinitely
- **Deleted accounts**: 30-day grace period, then hard delete
- **Anonymized data**: Retained for analytics (non-PII)

### Logs
- **Application logs**: 30 days (Sentry)
- **Access logs**: 90 days (Vercel)
- **Audit logs**: 1 year (database)

### User Rights
- **Right to access**: Provide data export within 30 days
- **Right to erasure**: Delete within 30 days of request
- **Right to portability**: JSON export of user data

---

## Testing & Drills

**Frequency**: Quarterly

**Test Scenarios**:
1. Database restore from backup
2. Application redeploy to alternate platform
3. Secret rotation without downtime

**Documentation**: Record results and update procedures

---

## Emergency Contacts

- **Supabase Support**: support@supabase.io
- **Vercel Support**: support@vercel.com
- **Security Incident**: security@your-company.com
- **Legal (GDPR)**: legal@your-company.com
