-- Migration: Add viewing slots table for managing apartment viewing time slots
-- Date: 2025-10-20
-- Purpose: Create viewing_slots table to support slot-based viewing bookings

BEGIN;

-- Create viewing_slots table for managing available viewing time slots
CREATE TABLE IF NOT EXISTS public.viewing_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  booked_count integer NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT capacity_not_exceeded CHECK (booked_count <= capacity)
);

-- Indexes for viewing_slots
CREATE INDEX IF NOT EXISTS idx_viewing_slots_apartment ON public.viewing_slots(apartment_id);
CREATE INDEX IF NOT EXISTS idx_viewing_slots_owner ON public.viewing_slots(owner_id);
CREATE INDEX IF NOT EXISTS idx_viewing_slots_start_time ON public.viewing_slots(start_time);
CREATE INDEX IF NOT EXISTS idx_viewing_slots_status ON public.viewing_slots(status);
CREATE INDEX IF NOT EXISTS idx_viewing_slots_time_range ON public.viewing_slots(start_time, end_time);

-- Enable RLS
ALTER TABLE public.viewing_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for viewing_slots
CREATE POLICY "Anyone can view active viewing slots"
  ON public.viewing_slots
  FOR SELECT
  USING (status = 'active');

CREATE POLICY "Owners can manage their apartment viewing slots"
  ON public.viewing_slots
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Create viewing_bookings table for individual bookings
CREATE TABLE IF NOT EXISTS public.viewing_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewing_slot_id uuid NOT NULL REFERENCES public.viewing_slots(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(viewing_slot_id, student_id) -- One booking per student per slot
);

-- Indexes for viewing_bookings
CREATE INDEX IF NOT EXISTS idx_viewing_bookings_slot ON public.viewing_bookings(viewing_slot_id);
CREATE INDEX IF NOT EXISTS idx_viewing_bookings_student ON public.viewing_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_viewing_bookings_status ON public.viewing_bookings(status);

-- Enable RLS
ALTER TABLE public.viewing_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for viewing_bookings
CREATE POLICY "Students can view their own bookings"
  ON public.viewing_bookings
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Owners can view bookings for their slots"
  ON public.viewing_bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.viewing_slots
      WHERE viewing_slots.id = viewing_bookings.viewing_slot_id
      AND viewing_slots.owner_id = auth.uid()
    )
  );

CREATE POLICY "Students can create bookings"
  ON public.viewing_bookings
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their bookings"
  ON public.viewing_bookings
  FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Owners can update bookings for their slots"
  ON public.viewing_bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.viewing_slots
      WHERE viewing_slots.id = viewing_bookings.viewing_slot_id
      AND viewing_slots.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.viewing_slots
      WHERE viewing_slots.id = viewing_bookings.viewing_slot_id
      AND viewing_slots.owner_id = auth.uid()
    )
  );

-- Function to update booked_count when bookings change
CREATE OR REPLACE FUNCTION update_viewing_slot_booked_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.viewing_slots
    SET booked_count = booked_count + 1
    WHERE id = NEW.viewing_slot_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.viewing_slots
    SET booked_count = booked_count - 1
    WHERE id = OLD.viewing_slot_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to maintain booked_count
CREATE TRIGGER trg_update_booked_count_insert
  AFTER INSERT ON public.viewing_bookings
  FOR EACH ROW EXECUTE FUNCTION update_viewing_slot_booked_count();

CREATE TRIGGER trg_update_booked_count_delete
  AFTER DELETE ON public.viewing_bookings
  FOR EACH ROW EXECUTE FUNCTION update_viewing_slot_booked_count();

-- Function to check slot availability
CREATE OR REPLACE FUNCTION is_viewing_slot_available(slot_id uuid)
RETURNS boolean AS $$
DECLARE
  slot_record record;
BEGIN
  SELECT * INTO slot_record
  FROM public.viewing_slots
  WHERE id = slot_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN slot_record.status = 'active'
     AND slot_record.booked_count < slot_record.capacity
     AND slot_record.start_time > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;