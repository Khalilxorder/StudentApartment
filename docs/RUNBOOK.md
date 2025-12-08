# Enterprise Runbook

## Incident Response

### Severity Levels
- **P0 (Critical)**: System down, data loss, security breach
- **P1 (High)**: Major feature unavailable, significant performance degradation
- **P2 (Medium)**: Minor feature issues, some users affected
- **P3 (Low)**: Cosmetic issues, no functional impact

### Response Workflow

#### 1. Detection & Acknowledgment (5 min)
- Monitor Sentry for error spikes
- Check `/api/health` endpoint
- Acknowledge incident in monitoring system

#### 2. Triage (15 min)
- Determine severity level
- Identify affected components
- Check recent deployments (last 24h)
- Review application logs

#### 3. Communication
- **P0/P1**: Update status page immediately
- **P2/P3**: Queue for next maintenance window
- Notify stakeholders via email/Slack

#### 4. Investigation & Resolution
- Check Sentry for stack traces and user impact
- Review logs: `kubectl logs` or Vercel logs
- Database: Check Supabase dashboard for connection issues
- External services: Verify Stripe, Google Maps API status

#### 5. Recovery
- Deploy hotfix if needed
- Verify via health check endpoint
- Monitor error rates for 30 minutes

#### 6. Post-Mortem (Within 72h)
- Document root cause
- Identify preventative measures
- Update runbook with learnings

---

## Common Issues & Solutions

### Database connection failures
**Symptoms**: 503 errors, `/api/health` shows database error

**Steps**:
1. Check Supabase dashboard (supabase.com)
2. Verify `DATABASE_URL` is correct
3. Check connection pool limits
4. Restart application if connection pool exhausted

### Rate limiting issues
**Symptoms**: 429 errors, users reporting "Too many requests"

**Steps**:
1. Check `lib/security-middleware.ts` rate limit config (Current: 300 req/15min)
2. Review user IP patterns for abuse
3. Temporarily increase limit if legitimate traffic spike
4. Add IP to whitelist if needed

### Sentry DSN not configured
**Symptoms**: Errors not appearing in Sentry

**Steps**:
1. Verify `SENTRY_DSN` in environment variables
2. Check instrumentation.ts is loading Sentry configs
3. Restart application

### Build failures
**Symptoms**: Deployment fails, TypeScript errors

**Steps**:
1. Check GitHub Actions / Vercel build logs
2. Run `npm run type-check` locally
3. Review recent commits for breaking changes
4. Rollback to last known good deployment

---

## Escalation Paths

### L1: On-Call Engineer
- First responder for all incidents
- Handle P2/P3 incidents independently
- Escalate P0/P1 to L2

### L2: Senior Engineer / Tech Lead
- Handle P0/P1 incidents
- Approve hotfix deployments
- Coordinate with external teams

### L3: Engineering Manager
- Major outages affecting business
- Security incidents
- Coordination with executive team

---

## Key Commands

### Health Check
```bash
curl https://your-domain.com/api/health
```

### View Logs (Vercel)
```bash
vercel logs --project=your-project
```

### Database Migration
```bash
npm run db:migrate
```

### Rollback Deployment (Vercel)
1. Go to Vercel dashboard
2. Select previous deployment
3. Click "Promote to Production"

---

## Monitoring Dashboards

- **Sentry**: https://sentry.io/organizations/your-org
- **Vercel**: https://vercel.com/dashboard
- **Supabase**: https://supabase.com/dashboard/project/your-project
- **Stripe**: https://dashboard.stripe.com

---

## Emergency Contacts

- **On-Call**: [Configure on-call rotation]
- **Database Admin**: [Supabase support]
- **Infrastructure**: [Vercel support]
