---
title: "UI ACCESSIBILITY (WCAG 2.2 AA) + PERFORMANCE BUDGETS"
labels: ["accessibility", "performance", "frontend", "critical"]
assignees: []
---

## Description

Add focus states, ARIA labels, alt text, keyboard traversal, color/contrast tokens.

* Performance budget: p95 TTFB < 300ms, LCP < 2.5s, CLS < 0.1.
* Add Axe checks in Playwright + Lighthouse CI gating.

## Acceptance Criteria

- [ ] `lhci` report ≥ 90 Performance/Accessibility on key pages
- [ ] Failing budgets block PRs
- [ ] Full keyboard navigation support
- [ ] Screen reader compatible

## Dependencies

- Issue #2 (ENV & CONFIG PACK)

## Estimated Effort
Medium (1-2 days)