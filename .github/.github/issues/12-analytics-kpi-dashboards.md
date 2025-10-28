---
title: "ANALYTICS + KPI DASHBOARDS + EVENTS"
labels: ["analytics", "frontend", "backend"]
assignees: []
---

## Description

Finish `analytics-svc` + PostHog setup:

* Capture: impressions (with rank), clicks, saves, contact, message sent, viewing booked, reservation, verification complete.
* Dashboards: **Search→Contact**, **TTFC**, **Listing Quality vs Inquiries**, **Owner Reply SLA**.
* Event helper util to standardize payloads.

## Acceptance Criteria

- [ ] PostHog dashboard JSON exported in repo
- [ ] Data dictionary in `/docs/analytics.md`
- [ ] All key user events captured
- [ ] KPI dashboards provide actionable insights

## Dependencies

- Issue #2 (ENV & CONFIG PACK)

## Estimated Effort
Medium (1-2 days)