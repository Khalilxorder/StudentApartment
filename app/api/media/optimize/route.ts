import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface OptimizeRequest {
  mediaIds?: string[];
  batchId?: string;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * GET /api/media/optimize
 * List pending or completed optimization jobs
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'processing';
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data, error } = await supabase
      .from('media_processing_jobs')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      jobs: data,
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching optimization jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch optimization jobs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/media/optimize
 * Queue media files for optimization
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OptimizeRequest;
    const { mediaIds, priority = 'normal' } = body;

    if (!mediaIds || mediaIds.length === 0) {
      return NextResponse.json(
        { error: 'mediaIds array is required' },
        { status: 400 }
      );
    }

    // Fetch media records
    const { data: mediaFiles, error: fetchError } = await supabase
      .from('media_uploads')
      .select('*')
      .in('id', mediaIds);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    if (!mediaFiles || mediaFiles.length === 0) {
      return NextResponse.json(
        { error: 'No media files found' },
        { status: 404 }
      );
    }

    // Create processing jobs
    const jobs = mediaFiles.map((media) => ({
      media_id: media.id,
      status: 'pending' as const,
      priority,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        original_size: media.size_bytes,
        format: media.mime_type,
      },
    }));

    const { data: createdJobs, error: insertError } = await supabase
      .from('media_processing_jobs')
      .insert(jobs)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // TODO: Send jobs to Bull queue for processing
    // await mediaQueue.addBulk(jobs.map(job => ({
    //   name: 'process-media',
    //   data: job,
    //   priority: priority === 'high' ? 1 : priority === 'low' ? 10 : 5,
    // })));

    return NextResponse.json(
      {
        success: true,
        message: `${createdJobs?.length || 0} jobs queued for optimization`,
        jobs: createdJobs,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error queuing optimization jobs:', error);
    return NextResponse.json(
      { error: 'Failed to queue optimization jobs' },
      { status: 500 }
    );
  }
}
