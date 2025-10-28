-- Migration: Add payment_status to bookings table
-- Date: 2025-10-19
-- Purpose: Support payment status tracking for booking lifecycle

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_id text;

-- Create index for payment_status queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_id ON public.bookings(payment_id);

COMMENT ON COLUMN public.bookings.payment_status IS 'Status of payment: unpaid, paid, or refunded';
COMMENT ON COLUMN public.bookings.payment_method IS 'Payment method used (e.g., stripe, bank_transfer)';
COMMENT ON COLUMN public.bookings.payment_id IS 'External payment provider reference ID';
