---
title: "ADMIN CONSOLE (Moderation + Metrics + Flags)"
labels: ["admin", "moderation", "backend", "frontend"]
assignees: []
---

## Description

Finish `/app/admin`:

* Moderation queue, metrics panel, user management (ban/verify override), feature flags.
* Protected by admin role; audited actions.

## Acceptance Criteria

- [ ] Playwright tests for role protection + actions logged
- [ ] Admin can moderate content and manage users
- [ ] Feature flags work for gradual rollouts
- [ ] Audit trail for all admin actions

## Dependencies

- Issue #10 (TRUST & SAFETY)

## Estimated Effort
Medium (1-2 days)