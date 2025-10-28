---
title: "RLS, SECURITY, VALIDATION"
labels: ["security", "backend", "critical"]
assignees: []
---

## Description

Harden RLS and API validation everywhere (Zod):

* Rate limiting on all public routes.
* RLS tests for read/write paths by role.
* Audit table for sensitive mutations.

## Acceptance Criteria

- [ ] Test suite demonstrating denied access where appropriate
- [ ] 429 responses on abuse with retry-after headers
- [ ] All API endpoints properly validated with Zod
- [ ] Audit logs capture sensitive operations

## Dependencies

- Issue #1 (DB Foundation)

## Estimated Effort
Medium (1-2 days)