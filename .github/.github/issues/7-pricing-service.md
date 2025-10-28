---
title: "PRICING SERVICE (Hedonic Index + Owner Hints)"
labels: ["pricing", "backend", "analytics"]
assignees: []
---

## Description

Implement `pricing-svc`: district baseline per-sqm + adjustments (rooms, lift, renovated, proximity to metro/tram). Compute **z-score**; show "Under / Fair / Over" band to owners with tips.

## Acceptance Criteria

- [ ] `/scripts/rebuild_pricing_index.ts` produces index artifacts
- [ ] Owner UI component shows band + suggested range
- [ ] Tests with synthetic data
- [ ] Pricing recommendations help owners set competitive prices

## Dependencies

- Issue #1 (DB Foundation)

## Estimated Effort
Medium (1-2 days)