/**
 * Example API Route with Audit Logging
 * 
 * Demonstrates how to integrate audit logging into API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent, computeChanges, getRequestMetadata } from '@/lib/audit-logging';
import { createClient } from '@/utils/supabaseClient';

/**
 * GET /api/apartments/[id]
 * Fetch apartment details
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient();

    const { data: apartment, error } = await supabase
        .from('apartments')
        .select('*')
        .eq('id', params.id)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(apartment);
}

/**
 * PATCH /api/apartments/[id]
 * Update apartment with audit logging
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient();
    const updates = await req.json();
    const metadata = getRequestMetadata(req);

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch old data for change tracking
    const { data: oldData } = await supabase
        .from('apartments')
        .select('*')
        .eq('id', params.id)
        .single();

    if (!oldData) {
        await logAuditEvent({
            user_id: session.user.id,
            action: 'apartment.update',
            resource_type: 'apartment',
            resource_id: params.id,
            status: 'failure',
            error_message: 'Apartment not found',
            ...metadata,
        });

        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Apply updates
    const { data: newData, error } = await supabase
        .from('apartments')
        .update(updates)
        .eq('id', params.id)
        .select()
        .single();

    // Log audit event with change tracking
    await logAuditEvent({
        user_id: session.user.id,
        action: 'apartment.update',
        resource_type: 'apartment',
        resource_id: params.id,
        changes: computeChanges(oldData, newData),
        status: error ? 'failure' : 'success',
        error_message: error?.message,
        metadata: {
            updated_fields: Object.keys(updates),
        },
        ...metadata,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(newData);
}

/**
 * DELETE /api/apartments/[id]
 * Delete apartment with audit logging
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient();
    const metadata = getRequestMetadata(req);

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch data before deletion
    const { data: apartmentData } = await supabase
        .from('apartments')
        .select('*')
        .eq('id', params.id)
        .single();

    // Delete apartment
    const { error } = await supabase
        .from('apartments')
        .delete()
        .eq('id', params.id);

    // Log deletion
    await logAuditEvent({
        user_id: session.user.id,
        action: 'apartment.delete',
        resource_type: 'apartment',
        resource_id: params.id,
        changes: computeChanges(apartmentData, null),
        status: error ? 'failure' : 'success',
        error_message: error?.message,
        ...metadata,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
