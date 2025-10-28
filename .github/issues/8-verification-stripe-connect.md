---
title: "VERIFICATION + STRIPE CONNECT + PAYOUTS"
labels: ["payments", "verification", "backend", "critical"]
assignees: []
---

## Description

Finish `verification-svc` and `/api/webhooks/stripe`:

* Flow: email/phone verify → **Stripe Connect Express onboarding** → status UI → payouts unlocked.
* Badge "Verified Owner".
* Secure, idempotent webhooks; retries; signed secrets.

## Acceptance Criteria

- [ ] Test fixtures for webhooks
- [ ] Clear states: Not Verified / Pending / Verified
- [ ] RLS permits payouts only when verified
- [ ] Stripe Connect Express onboarding flow complete

## Dependencies

- Issue #1 (DB Foundation)
- Issue #2 (ENV & CONFIG PACK)

## Estimated Effort
Large (2-3 days)