import { createClient } from '@/utils/supabaseClient';
import { revalidatePath } from 'next/cache';

export async function createApartment(formData: FormData) {
  'use server';
  const supabase = createClient();

  const title = formData.get('title') as string;
  const address = formData.get('address') as string;
  const price_huf = Number(formData.get('price_huf')) || 0;
  const description = (formData.get('description') as string) || '';

  const { data, error } = await supabase.from('apartments').insert([
    {
      title,
      address,
      price_huf,
      description,
      is_available: true,
    },
  ]).select();

  if (error) {
    console.error('Create apartment error:', error);
    return { error: 'Failed to create apartment' };
  }

  // revalidate the apartments listing page
  revalidatePath('/apartments');

  return data;
}
