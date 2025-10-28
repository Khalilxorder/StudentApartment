---
title: "ENV & CONFIG PACK"
labels: ["configuration", "devops", "critical", "infrastructure"]
assignees: []
---

## Description

Create `.env.example` with all keys (Supabase, Stripe, Meilisearch, PostHog, Resend, Mapbox, Upstash, BKK/GTFS), add `config/*` (ESLint, TSConfig, Lighthouse, Playwright, Vitest), and `pnpm` scripts: `dev`, `build`, `start`, `db:migrate`, `db:seed`, `index:all`, `test`, `e2e`, `lhci`.

## Acceptance Criteria

- [ ] Fresh clone → fill `.env` → all scripts run
- [ ] CI workflows for tests + Lighthouse
- [ ] All required environment variables documented
- [ ] Configuration files properly structured for the stack

## Dependencies

None

## Estimated Effort
Medium (1 day)