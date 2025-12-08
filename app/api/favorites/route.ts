import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * @swagger
 * /api/favorites:
 *   post:
 *     summary: Add apartment to favorites
 *     description: Saves an apartment to user's favorites list
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [apartmentId]
 *             properties:
 *               apartmentId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Favorite saved
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apartmentId } = await request.json();
    if (!apartmentId) {
      return NextResponse.json({ error: 'apartmentId is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('apartment_favorites')
      .upsert(
        {
          user_id: user.id,
          apartment_id: apartmentId,
        },
        { onConflict: 'user_id,apartment_id' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ error }, 'Favorite save error');
    return NextResponse.json({ error: 'Failed to save apartment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apartmentId } = await request.json();
    if (!apartmentId) {
      return NextResponse.json({ error: 'apartmentId is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('apartment_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('apartment_id', apartmentId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ error }, 'Favorite delete error');
    return NextResponse.json({ error: 'Failed to remove apartment' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Return empty array for unauthenticated users (reduces console noise)
      return NextResponse.json({ apartmentIds: [] });
    }

    const { data: favorites, error } = await supabase
      .from('apartment_favorites')
      .select('apartment_id')
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      apartmentIds: favorites?.map(f => f.apartment_id) || []
    });
  } catch (error: any) {
    logger.error({ error }, 'Favorites fetch error');
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}
