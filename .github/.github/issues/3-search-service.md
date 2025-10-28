---
title: "SEARCH SERVICE (PostGIS + Meilisearch + pgvector)"
labels: ["search", "backend", "ai", "critical"]
assignees: []
---

## Description

Finish `services/search-svc` and `app/api/search/route.ts` to **compose three layers**:
A) **Structured** (PostGIS/SQL): price/bounds/rooms/availability/**commute ≤ X** from `commute_cache`.
B) **Keyword** (Meilisearch): typo-tolerant on title/desc/amenities/district.
C) **Semantic** (pgvector): embeddings for query vs `listings_index.embedding`.

Add:

* `/scripts/sync_meilisearch.ts` (index/updates)
* `/scripts/build_embeddings.ts` (batch build)
* Reason codes per hit (e.g., `commute<=18m`, `verified`, `price_index_good`).

## Acceptance Criteria

- [ ] Seed → index → query "quiet studio near ELTE under 180k" returns sensible top results with **reason codes**
- [ ] p95 API < 250ms with warm cache (mock Meilisearch if needed)
- [ ] Graceful degradation when a layer fails
- [ ] All three search layers working together

## Dependencies

- Issue #1 (DB Foundation)

## Estimated Effort
Large (2-3 days)