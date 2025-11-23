# Operations Playbook

Common tasks, troubleshooting, and incident response for production operations.

## Table of Contents

1. [Monitoring & Health](#monitoring--health)
2. [Common Tasks](#common-tasks)
3. [Troubleshooting](#troubleshooting)
4. [Incident Response](#incident-response)
5. [Maintenance](#maintenance)

---

## Monitoring & Health

### Daily Checks

```bash
# Application health
curl -s https://your-domain.com/api/health | jq '.'

# Database connectivity
curl -s https://your-domain.com/api/health/db | jq '.'

# Search engine status
curl -s https://your-domain.com/api/search/health | jq '.'
```

### Key Metrics

- **Response time**: Target <500ms for 95th percentile
- **Error rate**: Keep <0.1%
- **Uptime**: Target 99.9%
- **Database connections**: Monitor pool exhaustion
- **Cache hit rate**: Aim for >80% if Redis enabled

### Monitoring Setup

**Vercel**:
- Built-in analytics: Deployments → Analytics
- Set up alerts for failed deployments

**Self-Hosted**:
- Use Prometheus + Grafana for metrics
- Configure alerts via PagerDuty or similar

**Observability**:
- Sentry for error tracking: https://sentry.io
- PostHog for product analytics: https://posthog.com
- Datadog or New Relic for infrastructure

---

## Common Tasks

### Deploy New Version

```bash
# 1. Test locally
pnpm lint && pnpm type-check && pnpm test:ci && pnpm build

# 2. Push to main (Vercel auto-deploys)
git add .
git commit -m "feat: description"
git push origin main

# 3. Wait for Vercel build (~2-3 min)

# 4. Verify deployment
curl -s https://your-domain.com/api/health | jq '.'
```

### Rollback to Previous Version

**Vercel**:
```
Dashboard → Deployments → Find previous deployment → "..." → "Promote to Production"
```

**Self-Hosted (Docker)**:
```bash
docker ps  # Find current container
docker stop <container-id>
docker run -d -e ... student-apartment:previous-tag
```

### Run Database Migration

```bash
# Local (dev)
pnpm db:migrate

# Production
DATABASE_URL="your-prod-url" pnpm db:migrate

# Verify
DATABASE_URL="your-prod-url" psql -c "SELECT name FROM migrations ORDER BY created_at DESC LIMIT 5;"
```

### Seed Database

```bash
# Dev
pnpm db:seed

# Production (caution!)
DATABASE_URL="your-prod-url" pnpm db:seed

# Verify
DATABASE_URL="your-prod-url" psql -c "SELECT COUNT(*) FROM apartments;"
```

### Reindex Search (Meilisearch)

```bash
# Rebuild all search indices
pnpm sync:meilisearch

# Verify
curl -s "http://localhost:7700/indexes" | jq '.results[] | {uid, stats}'
```

### Clear Cache

```bash
# If using Redis
redis-cli FLUSHDB

# Vercel auto-purges ISR caches on deploy
```

### Backup Database

```bash
# Supabase: Automatic daily backups (check Settings → Database → Backups)

# Manual SQL dump
pg_dump -Fc "your-database-url" > backup_$(date +%Y%m%d).dump

# Restore from backup
pg_restore -d "your-database-url" backup_20231107.dump
```

### Scale Application

For increased traffic:

```bash
# 1. Verify current resource usage
# Vercel: Dashboard → Usage & Performance

# 2. Enable Redis caching
# In Vercel settings, set: ENABLE_REDIS_RATE_LIMITING=true

# 3. Increase pool size
# In database settings: Connection Pool Size = 30-50

# 4. Upgrade Vercel plan if needed
# Go to Settings → Billing → Upgrade to Pro or Enterprise
```

---

## Troubleshooting

### Database Connection Failures

**Symptom**: `ECONNREFUSED` or `ENOTFOUND` errors

**Diagnosis**:
```bash
# Test connection
psql "your-database-url"

# Check IP whitelist in Supabase
# Settings → Database → Connection pooling → IP whitelist
```

**Solution**:
1. Verify `DATABASE_URL` is correct
2. Add your IP/VPN to Supabase IP whitelist (if self-hosted)
3. Check Supabase dashboard for connection pool status
4. Increase pool size if exhausted

### High Memory Usage

**Symptom**: App crashes or becomes unresponsive

**Diagnosis**:
```bash
# Check Next.js build size
pnpm build

# Analyze bundle
npm install -g next-bundle-analyzer
# Add to next.config.js: withBundleAnalyzer config
pnpm build
```

**Solution**:
1. Identify large dependencies: `npm ls --depth=0`
2. Consider code splitting: Use `dynamic()` for large components
3. Remove unused dependencies: `npm prune`
4. Enable ISR (Incremental Static Regeneration) for static pages
5. Upgrade to Vercel Pro for more memory

### High API Latency

**Symptom**: Requests slow, especially to `/api/apartments`, `/api/search`

**Diagnosis**:
```bash
# Measure response time
time curl https://your-domain.com/api/apartments

# Check database query performance
# Supabase: Logs → Slow Queries

# Check external API latency
curl -w "@curl-format.txt" -o /dev/null -s https://api.google.com/ai/...
```

**Solution**:
1. Add caching headers: `Cache-Control: public, max-age=3600`
2. Enable Meilisearch for search queries
3. Use ISR for apartment listings
4. Paginate results (default to 20 items)
5. Add database indexes on frequently filtered columns
6. Use CDN (Cloudflare, AWS CloudFront)

### Authentication Issues

**Symptom**: Users can't login or logout

**Diagnosis**:
```bash
# Check Supabase auth service
curl -s "https://your-project.supabase.co/auth/v1/health"

# Verify NextAuth configuration
# In .env: NEXTAUTH_URL must match your domain
# NEXTAUTH_SECRET must be set

# Check cookies (browser dev tools)
# Look for: `__Secure-authjs.session-token` or similar
```

**Solution**:
1. Verify `NEXTAUTH_URL` matches production domain
2. Regenerate `NEXTAUTH_SECRET` if compromised
3. Clear browser cookies and retry login
4. Check Supabase email confirmation settings
5. Review auth logs in Supabase Dashboard

### Search Not Working

**Symptom**: `/search` page returns no results or errors

**Diagnosis**:
```bash
# Check Meilisearch health
curl http://localhost:7700/health

# Check indices
curl http://localhost:7700/indexes | jq '.results'

# Test search
curl http://localhost:7700/indexes/apartments/search \
  -H "X-Meili-API-Key: your-key" \
  -d '{"q": "studio"}'
```

**Solution**:
1. Ensure Meilisearch is running
2. Run index sync: `pnpm sync:meilisearch`
3. Check `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY`
4. Verify apartments exist in database
5. Increase Meilisearch RAM if indexing slow

### Rate Limiting Too Aggressive

**Symptom**: Legitimate users get 429 errors

**Diagnosis**:
```bash
# Check current rate limit config
grep "checkRateLimit" lib/security-middleware.ts

# Monitor limits if using Redis
redis-cli KEYS "ratelimit:*" | wc -l
```

**Solution**:
1. Adjust thresholds in `lib/security-middleware.ts`
2. Increase window size from 15 min to 30 min
3. Increase request limit from 100 to 200
4. Whitelist known good IPs
5. Disable rate limiting temporarily for debugging: `ENABLE_REDIS_RATE_LIMITING=false`

---

## Incident Response

### Incident Severity Levels

| Level | Impact | Response Time |
|-------|--------|--------|
| 🔴 **Critical** | Service down, data loss | 15 min |
| 🟠 **High** | Significant user impact | 1 hour |
| 🟡 **Medium** | Partial impact, workaround available | 4 hours |
| 🟢 **Low** | Minimal impact | 24 hours |

### Incident Checklist

1. **Assess Severity**: Determine level from table above
2. **Notify Team**: Post to #incidents channel, page on-call engineer
3. **Gather Data**:
   - Check error rate: Vercel Dashboard or Sentry
   - Review recent deployments
   - Check third-party status (Stripe, Google, Supabase)
   - Monitor database performance
4. **Isolate**: Rollback if recent deploy suspected, or disable feature
5. **Fix**: Apply fix, test locally, deploy
6. **Verify**: Monitor for 30 min, confirm metrics return to normal
7. **Postmortem**: Schedule review within 48 hours
8. **Document**: Update incident log for compliance

### Example Scenarios

#### Scenario 1: Application crashes on deploy

```bash
# 1. Rollback immediately
# Vercel: Find last good deployment → Promote to Production

# 2. Investigate locally
pnpm build  # Fails? See error
pnpm lint && pnpm type-check  # Type errors?

# 3. Fix and redeploy
git revert <bad-commit>
git push origin main
```

#### Scenario 2: Database connection pool exhausted

```bash
# 1. Increase pool size
# Supabase Settings → Database → Connection Pooling → Size: 30-50

# 2. Identify connection leaks
# Check app logs for unclosed connections

# 3. Restart application
# Vercel: Deployments → "..." → "Redeploy"
```

#### Scenario 3: Stripe webhook not firing

```bash
# 1. Check webhook status
# Stripe Dashboard → Developers → Webhooks → Click endpoint

# 2. Verify webhook secret
echo $STRIPE_WEBHOOK_SECRET

# 3. Test manually
curl -X POST https://your-domain.com/api/webhooks/stripe \
  -H "stripe-signature: test" \
  -d @stripe-event.json

# 4. Resend failed events
# Stripe Dashboard → Webhooks → Attempted deliveries → "Resend"
```

---

## Maintenance

### Weekly Tasks

- [ ] Check Vercel analytics for anomalies
- [ ] Review error rate in Sentry
- [ ] Verify backup completion (Supabase)
- [ ] Check security alerts (GitHub Dependabot)

### Monthly Tasks

- [ ] Run full test suite
- [ ] Update dependencies: `pnpm update`
- [ ] Review database performance
- [ ] Audit access logs
- [ ] Test disaster recovery procedures

### Quarterly Tasks

- [ ] Security audit (dependencies, code)
- [ ] Performance optimization review
- [ ] Rotate API keys and secrets
- [ ] Update documentation
- [ ] Capacity planning review

### Annual Tasks

- [ ] Full security assessment
- [ ] Disaster recovery drill
- [ ] Compliance audit
- [ ] Architecture review

### Maintenance Window Schedule

Use `vercel env add` to set maintenance window:

```bash
VERCEL_MAINTENANCE_WINDOW="2-4 UTC every Sunday"
```

Notifies users during planned downtime for:
- Database migrations
- Major upgrades
- Infrastructure maintenance

---

## Emergency Contacts

- **Vercel Support**: support@vercel.com
- **Supabase Support**: https://supabase.com/support
- **Stripe Support**: https://support.stripe.com
- **On-Call**: See your team's contact list

---

**Need help?** Check the relevant guide:
- [README.md](./README.md) — Getting started
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Deployment procedures
- [SECURITY.md](./SECURITY.md) — Security & auth
