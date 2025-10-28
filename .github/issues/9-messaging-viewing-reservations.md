---
title: "MESSAGING + VIEWING SCHEDULER + RESERVATIONS"
labels: ["messaging", "frontend", "backend", "critical"]
assignees: []
---

## Description

Complete `messaging-svc` and related routes:

* Chat with **contact-info masking** until "intent" (viewing/booking). Profanity/contact filter. Rate limits.
* **Viewing scheduler**: owner availability → student books → send **ICS** to both; reschedule/cancel.
* **Reservations**: Stripe setup intent/temp hold with clear refund policy (no escrow v1).

## Acceptance Criteria

- [ ] E2E: student messages → books viewing → both receive ICS → optional reservation hold
- [ ] Moderation prevents raw emails/phones pre-intent
- [ ] Tests: rate limits, ICS content, Stripe sandbox
- [ ] Contact information properly masked until intent shown

## Dependencies

- Issue #1 (DB Foundation)
- Issue #8 (VERIFICATION + STRIPE CONNECT)

## Estimated Effort
Large (3 days)