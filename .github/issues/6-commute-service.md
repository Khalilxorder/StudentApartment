---
title: "COMMUTE SERVICE (BKK GTFS + Fallback)"
labels: ["commute", "backend", "infrastructure"]
assignees: []
---

## Description

Finish `commute-svc`: job that computes `commute_cache` to ELTE/BME/Corvinus. Use BKK GTFS (or mockable adapter). Add straight-line distance fallback with calibrated multiplier.

## Acceptance Criteria

- [ ] `pnpm scripts:commute:build` updates caches for seeds
- [ ] Search facets **≤15/20/30 min** functional
- [ ] Tests cover API unavailability fallback
- [ ] Commute times accurate for Budapest public transport

## Dependencies

- Issue #1 (DB Foundation)

## Estimated Effort
Medium (1-2 days)