import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * GET /api/media/[id]
 * Get media details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await supabase
      .from('media_uploads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      media: data,
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media/[id]
 * Delete media and all related data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get media details first
    const { data: media, error: fetchError } = await supabase
      .from('media_uploads')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Delete from storage
    if (media.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('apartment-media')
        .remove([media.storage_path]);

      if (storageError) {
        console.warn('Failed to delete from storage:', storageError);
        // Continue anyway, delete DB record
      }
    }

    // Delete processing jobs
    await supabase
      .from('media_processing_jobs')
      .delete()
      .eq('media_id', id);

    // Delete analytics
    await supabase
      .from('media_analytics')
      .delete()
      .eq('media_id', id);

    // Delete media record
    const { error: deleteError } = await supabase
      .from('media_uploads')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
}
