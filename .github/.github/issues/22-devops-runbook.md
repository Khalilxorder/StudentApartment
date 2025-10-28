---
title: "DEVOPS & RUNBOOK"
labels: ["devops", "documentation", "infrastructure"]
assignees: []
---

## Description

Create `/docs/runbook.md` and infra scripts:

* Supabase setup (enable PostGIS, vector), Meilisearch deploy, Vercel app, Upstash queues, cron/health checks.
* Backups and restore; incident playbook; monitoring alerts.

## Acceptance Criteria

- [ ] Fresh clone → follow runbook → full stack live on staging
- [ ] All infrastructure components documented
- [ ] Backup/restore procedures tested
- [ ] Monitoring and alerting configured

## Dependencies

- Issue #2 (ENV & CONFIG PACK)

## Estimated Effort
Medium (1-2 days)