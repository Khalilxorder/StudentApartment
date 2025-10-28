-- Align messages schema with UUID-based participants
-- Adds explicit conversation identifiers and backfills existing rows

BEGIN;

-- 1. Add new columns if they do not yet exist
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS conversation_key text,
  ADD COLUMN IF NOT EXISTS conversation_id uuid;

-- 2. Backfill conversation_key for legacy rows (apartment + sorted participants)
WITH ordered_participants AS (
  SELECT
    id,
    apartment_id,
    LEAST(sender_id::text, receiver_id::text) AS participant_a,
    GREATEST(sender_id::text, receiver_id::text) AS participant_b
  FROM public.messages
)
UPDATE public.messages m
SET conversation_key = op.apartment_id::text || '::' || op.participant_a || '::' || op.participant_b
FROM ordered_participants op
WHERE m.id = op.id
  AND (m.conversation_key IS NULL OR m.conversation_key = '');

-- 3. Backfill deterministic conversation_id using UUID v5 for stable grouping
UPDATE public.messages
SET conversation_id = uuid_generate_v5(
  '00000000-0000-0000-0000-000000000001'::uuid,
  conversation_key
)
WHERE conversation_key IS NOT NULL
  AND conversation_key <> ''
  AND conversation_id IS NULL;

-- 4. Enforce constraints once data is in place
ALTER TABLE public.messages
  ALTER COLUMN conversation_key SET NOT NULL,
  ALTER COLUMN conversation_id SET NOT NULL;

ALTER TABLE public.messages
  ALTER COLUMN conversation_id SET DEFAULT uuid_generate_v4();

-- 5. Indexes to speed up conversation lookups
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_key
  ON public.messages (conversation_key);

COMMIT;
