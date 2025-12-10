-- Create AI Search Sessions table
create table if not exists ai_search_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_token text not null, -- For anonymous users
  current_goal jsonb default '{}'::jsonb,
  summary text,
  last_active_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Index for fast lookup by session token or user
create index if not exists idx_ai_search_sessions_token on ai_search_sessions(session_token);
create index if not exists idx_ai_search_sessions_user on ai_search_sessions(user_id);

-- Create AI Search Messages table
create table if not exists ai_search_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references ai_search_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Index for loading chat history
create index if not exists idx_ai_search_messages_session on ai_search_messages(session_id);
create index if not exists idx_ai_search_messages_created on ai_search_messages(created_at);

-- RLS Policies
alter table ai_search_sessions enable row level security;
alter table ai_search_messages enable row level security;

-- Users can read/write their own sessions (by user_id)
create policy "Users can own sessions"
  on ai_search_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anonymous usage (via service role or public if we want to trust the client with token)
-- For now, we'll likely use an API route (service role) to manage this safely, 
-- or allow public access if the session_token matches (requires custom logic or function).
-- Let's stick to API-mediated access for now for anonymous users to prevent scraping.
