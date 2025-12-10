-- Migration: Atomic Booking RPC Function
-- Purpose: Ensures race-condition-free viewing slot booking

CREATE OR REPLACE FUNCTION book_viewing_slot(
    p_slot_id UUID,
    p_student_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_slot RECORD;
    v_existing_booking RECORD;
    v_booking RECORD;
    v_result JSON;
BEGIN
    -- Lock the slot row to prevent concurrent modifications
    SELECT * INTO v_slot
    FROM viewing_slots
    WHERE id = p_slot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Viewing slot not found'
        );
    END IF;

    -- Check if slot is available (using existing RPC logic if available, or inline check)
    IF v_slot.status != 'available' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Viewing slot is not available'
        );
    END IF;

    -- Check for existing booking by this student
    SELECT * INTO v_existing_booking
    FROM viewing_bookings
    WHERE viewing_slot_id = p_slot_id
      AND student_id = p_student_id;

    IF FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'You already have a booking for this slot'
        );
    END IF;

    -- Create the booking
    INSERT INTO viewing_bookings (viewing_slot_id, student_id, notes)
    VALUES (p_slot_id, p_student_id, p_notes)
    RETURNING * INTO v_booking;

    -- Update slot status to 'booked'
    UPDATE viewing_slots
    SET status = 'booked'
    WHERE id = p_slot_id;

    RETURN json_build_object(
        'success', true,
        'booking', row_to_json(v_booking)
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION book_viewing_slot(UUID, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION book_viewing_slot IS 'Atomically books a viewing slot, preventing race conditions';
