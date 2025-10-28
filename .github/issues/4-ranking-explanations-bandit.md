---
title: "RANKING + EXPLANATIONS + BANDIT"
labels: ["ranking", "ai", "backend", "critical"]
assignees: []
---

## Description

Complete `services/rank-svc` and `app/api/rank/route.ts`:

```
FinalScore = w1*ConstraintFit + w2*PersonalFit + w3*Accessibility + w4*TrustQuality + w5*MarketValue + w6*Engagement
```

* Implement each component with calculators.
* **Bandit**: ε-greedy or Thompson to slightly shuffle top-N.
* "**Why this is recommended**" widget data (top 3 factors).
* Log `events`: impressions (with rank), clicks, saves, contact, viewings.

## Acceptance Criteria

- [ ] Unit tests for each sub-score and overall score
- [ ] Toggle exploration via feature flag
- [ ] Daily job to refresh weights from `events` (simple logistic regression baseline)
- [ ] "Why this is recommended" widget data structure implemented

## Dependencies

- Issue #1 (DB Foundation)
- Issue #3 (Search Service)

## Estimated Effort
Large (2-3 days)