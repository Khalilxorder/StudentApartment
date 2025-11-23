import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
      .from('favorites')
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
    console.error('Favorite save error:', error);
    return NextResponse.json({ error: 'Failed to save apartment' }, { status: 500 });
  }
}
