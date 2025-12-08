import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const DEFAULT_LATITUDE = 47.4979;
const DEFAULT_LONGITUDE = 19.0402;

export async function createApartment(formData: FormData) {
  'use server';
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'You must be logged in to list an apartment.' };
  }

  const title = String(formData.get('title') ?? '').trim();
  const address = String(formData.get('address') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const priceValue = Number.parseInt(String(formData.get('price_huf') ?? '').trim(), 10);

  if (!title) {
    return { error: 'Title is required.' };
  }
  if (!address) {
    return { error: 'Address is required.' };
  }
  if (!Number.isFinite(priceValue) || priceValue <= 0) {
    return { error: 'Please provide a valid positive price.' };
  }

  const now = new Date().toISOString();

  const payload = {
    owner_id: session.user.id,
    title,
    description,
    monthly_rent_huf: priceValue,
    price_huf: priceValue,
    room_count: 1,
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    address,
    district: '1',
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
    is_available: true,
    status: 'published' as const,
    published_at: now,
    image_urls: [],
  };

  const { data, error } = await supabase
    .from('apartments')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('Create apartment error:', error);
    return { error: 'Failed to create apartment' };
  }

  revalidatePath('/apartments');
  return { id: data?.id as string };
}
