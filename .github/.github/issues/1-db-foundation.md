---
title: "DB Foundation — PostGIS + pgvector + Entities"
labels: ["database", "backend", "critical", "infrastructure"]
assignees: []
---

## Description

Complete SQL migrations to install **PostGIS** and **pgvector**, and create all entities, indexes, and RLS. Include seeds for Budapest districts + ELTE/BME/Corvinus and ~30 realistic listings.

### Tables to Create

* `users`, `profiles_student`, `profiles_owner` (verification, payouts)
* `apartments` (… + `geom geography(Point,4326)`, `commute_cache jsonb`, `completeness_score`, `media_score`, `verified_owner_id`)
* `apartment_media` (variants, blurhash, quality_flags)
* `amenities`, `apartment_amenities`
* `listings_index` (`search_doc tsvector`, `embedding vector(768)`, denormalized doc)
* `favorites`, `saved_searches` (`notify_rules jsonb`)
* `messages`, `viewings`, `events`, `rank_feedback`
* `payouts`, `disputes`, `reports`

### Indexes/RLS Requirements

* GIST on `geom`, IVFFLAT on `embedding`, GIN on `search_doc`/jsonb.
* RLS: students read published, owners their own, admin all; messages participants only; events append-only.

## Acceptance Criteria

- [ ] `pnpm db:migrate`, `pnpm db:seed` succeed
- [ ] Example queries for commute facets & embedding upsert included
- [ ] RLS unit tests verify isolation
- [ ] ~30 realistic Budapest listings seeded with proper PostGIS coordinates

## Dependencies

None

## Estimated Effort
Large (2-3 days)