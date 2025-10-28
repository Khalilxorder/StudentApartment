---
title: "SAVED SEARCHES + NOTIFICATIONS (Resend)"
labels: ["notifications", "email", "backend"]
assignees: []
---

## Description

Complete `notify-svc`:

* Saved searches with **daily digest at 09:00 CET** and **instant alert** for super-matches (score threshold).
* Email templates HU/EN, unsubscribe/manage UI.

## Acceptance Criteria

- [ ] Cron/queue wiring documented
- [ ] Previewable emails included
- [ ] Playwright test for save → receives digest (mock)
- [ ] Unsubscribe functionality works properly

## Dependencies

- Issue #1 (DB Foundation)
- Issue #2 (ENV & CONFIG PACK)
- Issue #3 (SEARCH SERVICE)

## Estimated Effort
Medium (1-2 days)