---
title: "MEDIA PIPELINE + PHOTO-FIRST OWNER FLOW"
labels: ["media", "frontend", "backend", "owner-flow"]
assignees: []
---

## Description

Finish `media-svc` + owner wizard:

* Upload → **sharp** variants (thumb/medium/XL) → **blurhash** → EXIF strip/orientation → quality heuristic.
* Save to Supabase Storage and `apartment_media`.
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
Large (2 days)