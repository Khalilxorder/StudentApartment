# Todo #14 Implementation Plan: Hybrid Search UI Badges

## Overview
This todo adds visual origin badges to search results showing whether they came from Structured, Semantic, or AI scoring. It includes a "Why this?" modal with detailed reasoning and feedback capture.

## Components Created

### 1. SearchOriginBadge.tsx (70 LOC)
- Displays search result origin with visual indicators
- Types: structured, semantic, ai-scored, keyword, fallback
- Shows match score percentage
- Hover descriptions explain how result was found
- Helper functions:
  - `determineSearchOrigin(result)` - infers origin from result metadata
  - `getScoreForDisplay(result)` - extracts best available score

### 2. WhyThisModal.tsx (150 LOC)
- Modal showing detailed reasoning for apartment recommendation
- Displays:
  - Match score with progress bar
  - Origin explanation
  - Top 3 reasons from AI/semantic analysis
  - User feedback (helpful/not helpful)
  - AI analysis details if from AI scoring
- Feedback submission triggers ranking updates
- Auto-closes after feedback with confirmation

## Integration Points (Next Steps)

### 1. Update ChatSearch.tsx
- Add state for WhyThisModal visibility/data
- Import SearchOriginBadge and WhyThisModal components
- Add badge to apartment result cards in grid view
- Add click handler to open WhyThisModal with explanation

### 2. Update semantic search API integration
- Ensure results include:
  - `aiScore`: AI personalization score (0-100)
  - `aiReasons`: Array of reason strings from AI
  - `powered_by`: Origin indicator ('semantic', 'keyword', etc)
  - `score`: Base semantic match score
  - `featureMatchScore`: Feature matching score if applicable

### 3. Add feedback endpoint
- POST `/api/search/feedback`
- Accepts: apartmentId, userId, query, helpful (boolean), origin, score
- Logs to `ranking_events` table for Thompson sampling
- Returns acknowledgment

### 4. Update result display logic
- Pass SearchOrigin and score to apartment cards
- Show badge on each result card
- Handle click to open WhyThisModal with reasons
- Display origin indicator on sorting/filtering

## Data Flow

```
User searches
    ↓
API returns results with origin + aiScore + aiReasons
    ↓
ChatSearch renders cards with SearchOriginBadge
    ↓
User clicks badge/card
    ↓
WhyThisModal opens with:
  - apartmentTitle
  - score (aiScore or featureMatchScore)
  - origin (determined from result metadata)
  - reasons (aiReasons or buildExplainReasons())
    ↓
User clicks "helpful" or "not helpful"
    ↓
POST /api/search/feedback
    ↓
Logged to ranking_events for Thompson bandit updates
```

## Scoring Breakdown Display

For AI-scored results:
- Show aiScore percentage
- Display ai Reasons if available
- Flag as "AI Scored" origin

For semantic results:
- Show featureMatchScore or score percentage  
- Display matched features
- Flag as "Semantic" origin

For structured results:
- Show filter criteria match
- Display applied filters
- Flag as "Structured" origin

## Accessibility
- ARIA labels for badges
- Modal with proper focus management
- Keyboard navigation support
- Screen reader descriptions
- Semantic HTML structure

## Testing Strategy

### Unit Tests (SearchOriginBadge)
- determineSearchOrigin() with various result types
- getScoreForDisplay() precedence logic
- Badge rendering with different origins
- Score formatting

### Unit Tests (WhyThisModal)
- Modal open/close
- Feedback submission
- Reason rendering
- Origin label mapping

### E2E Tests (ChatSearch Integration)
- Search query → results with badges
- Click badge → modal opens
- Modal shows correct information
- Feedback submission works
- Modal closes after feedback

## Files to Create/Modify

### Created:
- components/SearchOriginBadge.tsx ✅
- components/WhyThisModal.tsx ✅

### To Modify:
- components/ChatSearch.tsx
- tests/search-origin-badge.test.ts (new)
- tests/why-this-modal.test.ts (new)
- e2e/search-results.spec.ts (extend existing or create)
- app/api/search/feedback/route.ts (new)

## Success Criteria
- ✅ SearchOriginBadge component created
- ✅ WhyThisModal component created
- ⏳ ChatSearch updated to display badges
- ⏳ Feedback endpoint created
- ⏳ Integration tests passing
- ⏳ E2E tests passing
- ⏳ All 27 tests passing
- ⏳ Commit with descriptive message

## Estimated Time
- Components: ✅ 1h
- ChatSearch integration: 1h
- Feedback endpoint: 0.5h
- Tests: 1.5h
- Total: 4h
