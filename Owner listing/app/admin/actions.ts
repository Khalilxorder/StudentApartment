'use server';

import { createClient } from '@/utils/supabaseClient';
import { revalidatePath } from 'next/cache';

export async function addApartment(formData: FormData) {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('You must be logged in to add an apartment.');
  }

  // Basic fields
  const price_huf = Number(formData.get('price_huf'));
  const description = formData.get('description') as string;
  const latitude = Number(formData.get('latitude'));
  const longitude = Number(formData.get('longitude'));
  const is_available = formData.get('is_available') === 'on';

  // Additional attributes
  const privacy_level = formData.get('privacy_level') as string;
  const natural_light = formData.get('natural_light') as string;

  // Room counts
  const roomCounts = {
    bedroom: Number(formData.get('bedroom')),
    bathroom: Number(formData.get('bathroom')),
    kitchen: Number(formData.get('kitchen')),
    balcony: Number(formData.get('balcony')),
    garden: Number(formData.get('garden')),
    living_room: Number(formData.get('living_room')),
    storage: Number(formData.get('storage')),
  };

  // Uploaded image URLs from client
  const image_urls = formData.getAll('image_urls') as string[];
  const image_keys = formData.getAll('image_keys') as string[];

  // Features/amenities
  const features = JSON.parse(formData.get('features') as string || '[]') as string[];

  // Insert into Supabase
  const { error } = await supabase.from('apartments').insert({
    user_id: session.user.id,
    price_huf,
    description,
    latitude,
    longitude,
    is_available,
    privacy_level,
    natural_light,
    image_urls,
    image_keys,
    amenities: features,
    ...roomCounts,
    created_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  // Revalidate admin page
  revalidatePath('/admin');
}

export async function updateApartment(id: string, formData: FormData) {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('You must be logged in to update an apartment.');
  }

  // Basic fields
  const price_huf = Number(formData.get('price_huf'));
  const description = formData.get('description') as string;
  const latitude = Number(formData.get('latitude'));
  const longitude = Number(formData.get('longitude'));
  const is_available = formData.get('is_available') === 'on';

  const privacy_level = formData.get('privacy_level') as string;
  const natural_light = formData.get('natural_light') as string;

  const roomCounts = {
    bedroom: Number(formData.get('bedroom')),
    bathroom: Number(formData.get('bathroom')),
    kitchen: Number(formData.get('kitchen')),
    balcony: Number(formData.get('balcony')),
    garden: Number(formData.get('garden')),
    living_room: Number(formData.get('living_room')),
    storage: Number(formData.get('storage')),
  };

  const image_urls = formData.getAll('image_urls') as string[];
  const image_keys = formData.getAll('image_keys') as string[];
  const deleted_image_keys = formData.getAll('deleted_image_keys') as string[];

  // Features/amenities
  const features = JSON.parse(formData.get('features') as string || '[]') as string[];

  // If any images were deleted (by key), remove them from storage
  for (const key of deleted_image_keys) {
    try {
      await supabase.storage.from('apartments').remove([key]);
    } catch (err) {
      console.warn('Failed to remove image from storage', err);
    }
  }

  // Update apartment row
  const { error } = await supabase.from('apartments').update({
    price_huf,
    description,
    latitude,
    longitude,
    is_available,
    privacy_level,
    natural_light,
    image_urls,
    image_keys,
    amenities: features,
    ...roomCounts,
    last_updated_at: new Date().toISOString(),
  }).eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin');
  revalidatePath('/apartments');
}
