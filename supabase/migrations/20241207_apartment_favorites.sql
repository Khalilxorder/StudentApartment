-- Create apartment_favorites table for the compare/save feature
-- This table stores user's saved apartments for comparison

CREATE TABLE IF NOT EXISTS public.apartment_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure a user can only save an apartment once
    CONSTRAINT unique_user_apartment UNIQUE (user_id, apartment_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_apartment_favorites_user_id ON public.apartment_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_apartment_favorites_apartment_id ON public.apartment_favorites(apartment_id);

-- Enable Row Level Security
ALTER TABLE public.apartment_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own favorites
CREATE POLICY "Users can view their own favorites"
    ON public.apartment_favorites
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own favorites
CREATE POLICY "Users can add their own favorites"
    ON public.apartment_favorites
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
    ON public.apartment_favorites
    FOR DELETE
    USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON public.apartment_favorites TO authenticated;
GRANT SELECT ON public.apartment_favorites TO anon;
