# GitHub Issues Creation Commands
# Run these commands manually after installing and authenticating GitHub CLI

# First, install GitHub CLI and authenticate:
# winget install --id GitHub.cli
# gh auth login

# Then run these commands to create all 25 issues:

gh issue create --title "DB Foundation — PostGIS + pgvector + Entities" --label "database,backend,critical,infrastructure" --body "## Description

Complete SQL migrations to install **PostGIS** and **pgvector**, and create all entities, indexes, and RLS. Include seeds for Budapest districts + ELTE/BME/Corvinus and ~30 realistic listings.

### Tables to Create

* \`users\`, \`profiles_student\`, \`profiles_owner\` (verification, payouts)
* \`apartments\` (… + \`geom geography(Point,4326)\`, \`commute_cache jsonb\`, \`completeness_score\`, \`media_score\`, \`verified_owner_id\`)
* \`apartment_media\` (variants, blurhash, quality_flags)
* \`amenities\`, \`apartment_amenities\`
* \`listings_index\` (\`search_doc tsvector\`, \`embedding vector(768)\`, denormalized doc)
* \`favorites\`, \`saved_searches\` (\`notify_rules jsonb\`)
* \`messages\`, \`viewings\`, \`events\`, \`rank_feedback\`
* \`payouts\`, \`disputes\`, \`reports\`

### Indexes/RLS Requirements

* GIST on \`geom\`, IVFFLAT on \`embedding\`, GIN on \`search_doc\`/jsonb.
* RLS: students read published, owners their own, admin all; messages participants only; events append-only.

## Acceptance Criteria

- [ ] \`pnpm db:migrate\`, \`pnpm db:seed\` succeed
- [ ] Example queries for commute facets & embedding upsert included
- [ ] RLS unit tests verify isolation
- [ ] ~30 realistic Budapest listings seeded with proper PostGIS coordinates

## Dependencies

None

## Estimated Effort
Large (2-3 days)"

gh issue create --title "ENV & CONFIG PACK" --label "configuration,devops,critical,infrastructure" --body "## Description

Create \`.env.example\` with all keys (Supabase, Stripe, Meilisearch, PostHog, Resend, Mapbox, Upstash, BKK/GTFS), add \`config/*\` (ESLint, TSConfig, Lighthouse, Playwright, Vitest), and \`pnpm\` scripts: \`dev\`, \`build\`, \`start\`, \`db:migrate\`, \`db:seed\`, \`index:all\`, \`test\`, \`e2e\`, \`lhci\`.

## Acceptance Criteria

- [ ] Fresh clone → fill \`.env\` → all scripts run
- [ ] CI workflows for tests + Lighthouse
- [ ] All required environment variables documented
- [ ] Configuration files properly structured for the stack

## Dependencies

None

## Estimated Effort
Medium (1 day)"

gh issue create --title "SEARCH SERVICE (PostGIS + Meilisearch + pgvector)" --label "search,backend,ai,critical" --body "## Description

Finish \`services/search-svc\` and \`app/api/search/route.ts\` to **compose three layers**:
A) **Structured** (PostGIS/SQL): price/bounds/rooms/availability/**commute ≤ X** from \`commute_cache\`.
B) **Keyword** (Meilisearch): typo-tolerant on title/desc/amenities/district.
C) **Semantic** (pgvector): embeddings for query vs \`listings_index.embedding\`.

Add:

* \`/scripts/sync_meilisearch.ts\` (index/updates)
* \`/scripts/build_embeddings.ts\` (batch build)
* Reason codes per hit (e.g., \`commute<=18m\`, \`verified\`, \`price_index_good\`).

## Acceptance Criteria

- [ ] Seed → index → query \"quiet studio near ELTE under 180k\" returns sensible top results with **reason codes**
- [ ] p95 API < 250ms with warm cache (mock Meilisearch if needed)
- [ ] Graceful degradation when a layer fails
- [ ] All three search layers working together

## Dependencies

- Issue #1 (DB Foundation)

## Estimated Effort
Large (2-3 days)"

gh issue create --title "RANKING + EXPLANATIONS + BANDIT" --label "ranking,ai,backend,critical" --body "## Description

Complete \`services/rank-svc\` and \`app/api/rank/route.ts\`:

\`\`\`
FinalScore = w1*ConstraintFit + w2*PersonalFit + w3*Accessibility + w4*TrustQuality + w5*MarketValue + w6*Engagement
\`\`\`

* Implement each component with calculators.
* **Bandit**: ε-greedy or Thompson to slightly shuffle top-N.
* \"**Why this is recommended**\" widget data (top 3 factors).
* Log \`events\`: impressions (with rank), clicks, saves, contact, viewings.

## Acceptance Criteria

- [ ] Unit tests for each sub-score and overall score
- [ ] Toggle exploration via feature flag
- [ ] Daily job to refresh weights from \`events\` (simple logistic regression baseline)
- [ ] \"Why this is recommended\" widget data structure implemented

## Dependencies

- Issue #1 (DB Foundation)
- Issue #3 (Search Service)

## Estimated Effort
Large (2-3 days)"

gh issue create --title "MEDIA PIPELINE + PHOTO-FIRST OWNER FLOW" --label "media,frontend,backend,owner-flow" --body "## Description

Finish \`media-svc\` + owner wizard:

* Upload → **sharp** variants (thumb/medium/XL) → **blurhash** → EXIF strip/orientation → quality heuristic.
* Save to Supabase Storage and \`apartment_media\`.
* Owner wizard: **drag-drop**, reorder, auto-extract amenities/address from text, **completeness scorecard**, pricing hint.

### Rules

* Block publish if < 3 photos or completeness < threshold.
* Recommend ≥ 6 photos.

## Acceptance Criteria

- [ ] Full UI works on mobile/desktop
- [ ] Unit tests for image processing functions
- [ ] Happy-path E2E: create listing in < 5 minutes
- [ ] Completeness scorecard prevents publishing low-quality listings

## Dependencies

- Issue #1 (DB Foundation)

## Estimated Effort
Large (2 days)"

gh issue create --title "COMMUTE SERVICE (BKK GTFS + Fallback)" --label "commute,backend,infrastructure" --body "## Description

Finish \`commute-svc\`: job that computes \`commute_cache\` to ELTE/BME/Corvinus. Use BKK GTFS (or mockable adapter). Add straight-line distance fallback with calibrated multiplier.

## Acceptance Criteria

- [ ] \`pnpm scripts:commute:build\` updates caches for seeds
- [ ] Search facets **≤15/20/30 min** functional
- [ ] Tests cover API unavailability fallback
- [ ] Commute times accurate for Budapest public transport

## Dependencies

- Issue #1 (DB Foundation)

## Estimated Effort
Medium (1-2 days)"

gh issue create --title "PRICING SERVICE (Hedonic Index + Owner Hints)" --label "pricing,backend,analytics" --body "## Description

Implement \`pricing-svc\`: district baseline per-sqm + adjustments (rooms, lift, renovated, proximity to metro/tram). Compute **z-score**; show \"Under / Fair / Over\" band to owners with tips.

## Acceptance Criteria

- [ ] \`/scripts/rebuild_pricing_index.ts\` produces index artifacts
- [ ] Owner UI component shows band + suggested range
- [ ] Tests with synthetic data
- [ ] Pricing recommendations help owners set competitive prices

## Dependencies

- Issue #1 (DB Foundation)

## Estimated Effort
Medium (1-2 days)"

gh issue create --title "VERIFICATION + STRIPE CONNECT + PAYOUTS" --label "payments,verification,backend,critical" --body "## Description

Finish \`verification-svc\` and \`/api/webhooks/stripe\`:

* Flow: email/phone verify → **Stripe Connect Express onboarding** → status UI → payouts unlocked.
* Badge \"Verified Owner\".
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
Large (2-3 days)"

gh issue create --title "MESSAGING + VIEWING SCHEDULER + RESERVATIONS" --label "messaging,frontend,backend,critical" --body "## Description

Complete \`messaging-svc\` and related routes:

* Chat with **contact-info masking** until \"intent\" (viewing/booking). Profanity/contact filter. Rate limits.
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
Large (3 days)"

gh issue create --title "TRUST & SAFETY + ADMIN QUEUE" --label "moderation,admin,security,backend" --body "## Description

Finish \`trust-safety-svc\` + \`/app/admin\`:

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
Medium (1-2 days)"

gh issue create --title "RLS, SECURITY, VALIDATION" --label "security,backend,critical" --body "## Description

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
Medium (1-2 days)"

gh issue create --title "ANALYTICS + KPI DASHBOARDS + EVENTS" --label "analytics,frontend,backend" --body "## Description

Finish \`analytics-svc\` + PostHog setup:

* Capture: impressions (with rank), clicks, saves, contact, message sent, viewing booked, reservation, verification complete.
* Dashboards: **Search→Contact**, **TTFC**, **Listing Quality vs Inquiries**, **Owner Reply SLA**.
* Event helper util to standardize payloads.

## Acceptance Criteria

- [ ] PostHog dashboard JSON exported in repo
- [ ] Data dictionary in \`/docs/analytics.md\`
- [ ] All key user events captured
- [ ] KPI dashboards provide actionable insights

## Dependencies

- Issue #2 (ENV & CONFIG PACK)

## Estimated Effort
Medium (1-2 days)"

gh issue create --title "SAVED SEARCHES + NOTIFICATIONS (Resend)" --label "notifications,email,backend" --body "## Description

Complete \`notify-svc\`:

* Saved searches with **daily digest at 09:00 CET** and **instant alert** for super-matches (score threshold).
* Email templates HU/EN, unsubscribe/manage UI.

## Acceptance Criteria

- [ ] Cron/queue wiring documented
- [ ] Previewable emails included
- [ ] Playwright test for save → receives digest (mock)
- [ ] Unsubscribe functionality works properly

## Dependencies

- Issue #1 (DB Foundation)
- Issue #2 (ENV & CONFIG PACK)
- Issue #3 (SEARCH SERVICE)

## Estimated Effort
Medium (1-2 days)"

gh issue create --title "STUDENT ONBOARDING + 'BEST FOR YOU' + COMPARE" --label "onboarding,frontend,critical" --body "## Description

Finish onboarding (budget, move-in, duration, target uni, must-haves, roommates, quiet/social, consent).

* After submit: **Best for You** list with **reason chips**.
* **Compare** up to 3 listings (commute, price/m², amenities, rules, verification, photos) + shareable URL.

## Acceptance Criteria

- [ ] Mobile-first, HU/EN copy
- [ ] Events tracked
- [ ] E2E test covers full journey
- [ ] \"Best for You\" recommendations personalized and explained

## Dependencies

- Issue #4 (RANKING + EXPLANATIONS)

## Estimated Effort
Large (2 days)"

gh issue create --title "UI ACCESSIBILITY (WCAG 2.2 AA) + PERFORMANCE BUDGETS" --label "accessibility,performance,frontend,critical" --body "## Description

Add focus states, ARIA labels, alt text, keyboard traversal, color/contrast tokens.

* Performance budget: p95 TTFB < 300ms, LCP < 2.5s, CLS < 0.1.
* Add Axe checks in Playwright + Lighthouse CI gating.

## Acceptance Criteria

- [ ] \`lhci\` report ≥ 90 Performance/Accessibility on key pages
- [ ] Failing budgets block PRs
- [ ] Full keyboard navigation support
- [ ] Screen reader compatible

## Dependencies

- Issue #2 (ENV & CONFIG PACK)

## Estimated Effort
Medium (1-2 days)"

gh issue create --title "SEO + CONTENT (Budapest Students)" --label "seo,content,frontend" --body "## Description

Implement SSR landing pages for **districts** and **universities** with preset filters.

* Dynamic OG images per listing.
* Sitemap, robots, structured data, and content pages (\"How reservations work\", \"Verification & Safety\", \"For Owners: List in 5 minutes\").

## Acceptance Criteria

- [ ] Lighthouse SEO ≥ 95
- [ ] OG images render with price, area, commute chips
- [ ] Sitemap and structured data implemented
- [ ] Content pages provide clear value propositions

## Dependencies

None

## Estimated Effort
Medium (1-2 days)"

gh issue create --title "I18N (HU/EN) + MICROCOPY" --label "i18n,frontend,content" --body "## Description

Add \`i18n\` with \`en.json\`, \`hu.json\` for onboarding, search chips, compare hints, owner scorecard, verification steps, emails.

## Acceptance Criteria

- [ ] Language switch persists
- [ ] All UI and emails localized
- [ ] Hungarian translations accurate for Budapest context
- [ ] Date/number formatting localized

## Dependencies

None

## Estimated Effort
Medium (1 day)"

gh issue create --title "EXPLAINABILITY WIDGET" --label "frontend,ux,ai" --body "## Description

Implement the \"Why this is recommended\" component on cards/detail using rank-svc explanations (top 3 factors + weights + preference link).

## Acceptance Criteria

- [ ] Consistency tests verifying explanations match calculated scores
- [ ] Widget shows on listing cards and detail pages
- [ ] Clear, understandable explanations for ranking factors
- [ ] Link to adjust preferences

## Dependencies

- Issue #4 (RANKING + EXPLANATIONS)

## Estimated Effort
Small (0.5 days)"

gh issue create --title "PRIVACY CENTER (GDPR)" --label "privacy,gdpr,frontend,backend" --body "## Description

Add a privacy center:

* Personalization toggle.
* **Export data** (ZIP with JSON + media refs).
* **Delete account** with grace period + undo email.

## Acceptance Criteria

- [ ] Download works end-to-end
- [ ] Docs covering DSR workflow
- [ ] GDPR compliance for EU users
- [ ] Clear privacy controls and data management

## Dependencies

- Issue #1 (DB Foundation)

## Estimated Effort
Medium (1 day)"

gh issue create --title "ADMIN CONSOLE (Moderation + Metrics + Flags)" --label "admin,moderation,backend,frontend" --body "## Description

Finish \`/app/admin\`:

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
Medium (1-2 days)"

gh issue create --title "TESTING & CI SUITE" --label "testing,ci,quality" --body "## Description

Provide a full testing strategy: Vitest unit tests for all services, Playwright E2E for **student** and **owner** flows, Axe a11y, Lighthouse CI.

## Acceptance Criteria

- [ ] One-command CI runs green on fresh clone
- [ ] Fixtures and factories included
- [ ] Test coverage meets standards
- [ ] E2E tests cover critical user journeys

## Dependencies

- Issue #2 (ENV & CONFIG PACK)

## Estimated Effort
Large (2-3 days)"

gh issue create --title "DEVOPS & RUNBOOK" --label "devops,documentation,infrastructure" --body "## Description

Create \`/docs/runbook.md\` and infra scripts:

* Supabase setup (enable PostGIS, vector), Meilisearch deploy, Vercel app, Upstash queues, cron/health checks.
* Backups and restore; incident playbook; monitoring alerts.

## Acceptance Criteria

- [ ] Fresh clone → follow runbook → full stack live on staging
- [ ] All infrastructure components documented
- [ ] Backup/restore procedures tested
- [ ] Monitoring and alerting configured

## Dependencies

- Issue #2 (ENV & CONFIG PACK)

## Estimated Effort
Medium (1-2 days)"

gh issue create --title "PERFORMANCE TUNING & CACHING" --label "performance,optimization,backend,frontend" --body "## Description

Add API caching (Edge where appropriate), image CDN, React Query caching, N+1 guards, indexes review.

## Acceptance Criteria

- [ ] Benchmarks before/after; p95 improvements documented
- [ ] API response times meet performance budgets
- [ ] Image loading optimized
- [ ] Database queries optimized

## Dependencies

- Issue #15 (UI ACCESSIBILITY + PERFORMANCE)

## Estimated Effort
Medium (1-2 days)"

gh issue create --title "MARKETING EMAILS & REFERRALS" --label "marketing,email,backend" --body "## Description

Create referral program (students/owners) tracked in PostHog; Resend emails for invites and milestones.

## Acceptance Criteria

- [ ] Referral codes, attribution, and email flows tested
- [ ] PostHog tracks referral conversions
- [ ] Email templates for different milestone events
- [ ] Referral program incentivizes growth

## Dependencies

- Issue #12 (ANALYTICS + KPI DASHBOARDS)
- Issue #13 (SAVED SEARCHES + NOTIFICATIONS)

## Estimated Effort
Medium (1 day)"

gh issue create --title "FINAL QA MATRIX & GO-LIVE CHECKLIST" --label "qa,golive,critical,documentation" --body "## Description

Deliver \`/docs/qa-checklist.md\` and \`/docs/golive.md\` covering: cross-browser, mobile breakpoints, HU locale, slow network, payments/webhooks retries, RLS pen-tests, Lighthouse/Axe budgets, PostHog events.

## Acceptance Criteria

- [ ] All items checkable with commands/scripts included
- [ ] Comprehensive pre-launch checklist
- [ ] QA matrix covers all critical scenarios
- [ ] Go-live procedures documented and tested

## Dependencies

- All previous issues

## Estimated Effort
Small (0.5 days)"