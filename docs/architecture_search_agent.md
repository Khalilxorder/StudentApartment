# Collaborative Search Agent Architecture

## Overview
The Collaborative Search Agent transforms the apartment search from a keyword-based query into a persistent, evolving conversation. The agent works with the user to build a structured "Search Profile" (Goal), refining verification through natural language.

## Core Concepts

### 1. The "Search Goal" (State)
Instead of stateless queries effectively, the agent maintains a **Search Goal**.
This goal is a structured JSON object representing what the user wants.

```typescript
interface SearchGoal {
  budget: { min?: number; max?: number; currency: 'HUF' | 'EUR' };
  location: { 
    districts: number[]; 
    poi_proximity?: { target: string; max_minutes: number }[]; // e.g. "near ELTE"
  };
  features: {
    must_have: string[]; // e.g. ["balcony", "pet_friendly"]
    nice_to_have: string[];
  };
  occupancy: {
    type: 'student' | 'couple' | 'roommate';
    count: number;
  };
  status: 'exploring' | 'refining' | 'monitoring';
}
```

### 2. The Feedback Loop
1.  **User Input**: "I want a place near ELTE, max 150k."
2.  **AI Analysis**: 
    *   Extracts intents: `location: near ELTE`, `budget: 150k`.
    *   Updates `SearchGoal`.
3.  **Visual Update**: The UI updates the "Search Dashboard" card to show the new criteria.
4.  **Database Sync**: The updated goal and message history are saved to Supabase.
5.  **Confirmation/Refinement**: AI replies: "Got it. 150k near ELTE. Do you need a separate bedroom?"

### 3. Data Model

#### `ai_search_sessions`
Stores the high-level state of a search thread.
*   `id`: UUID
*   `user_id`: UUID (optional, for logged-in users)
*   `session_token`: String (cookie-based ID for anonymous persistence)
*   `current_goal`: JSONB (The `SearchGoal` object)
*   `summary`: Text (Short description of search)
*   `last_active_at`: Timestamp

#### `ai_search_messages`
Stores the actual conversation.
*   `id`: UUID
*   `session_id`: UUID (FK)
*   `role`: 'user' | 'assistant'
*   `content`: Text
*   `metadata`: JSONB (Used for debugging or specific UI triggers)

## UI Components

### FloatingChatPanel (Enhanced)
*   **Top Section**: The Chat (History + Input).
*   **Overlay/Side Panel**: "Search Dashboard" (The visual representation of `SearchGoal`).
    *   The dashboard auto-updates as the conversation progresses.
    *   Users can *manually* edit the dashboard (e.g., click specific districts), which sends a system message to the chat ("User manually updated districts to 7, 8").

## Migration Strategy
1.  Create Supabase tables.
2.  Update `FloatingChatPanel` to fetch/store messages in Supabase instead of `localStorage`.
3.  Implement the "Goal Extraction" logic (OpenAI function calling or JSON mode).
