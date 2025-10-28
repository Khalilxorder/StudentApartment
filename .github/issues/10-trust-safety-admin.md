---
title: "TRUST & SAFETY + ADMIN QUEUE"
labels: ["moderation", "admin", "security", "backend"]
assignees: []
---

## Description

Finish `trust-safety-svc` + `/app/admin`:

* Duplicate detection (perceptual hash + address/price similarity).
* Image NSFW placeholder + chat moderation blocklist.
* Abuse report flow and admin review queue.

## Acceptance Criteria

- [ ] Admin console triage (duplicates, NSFW, reports)
- [ ] Audit logs for admin actions
- [ ] Unit tests for duplicate heuristic + blocklist
- [ ] NSFW content properly flagged and handled

## Dependencies

- Issue #1 (DB Foundation)
- Issue #5 (MEDIA PIPELINE)

## Estimated Effort
Medium (1-2 days)