'use server';

import { createClient } from '@/utils/supabaseClient';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export async function addApartment(formData: FormData) {
  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login?error=You must be logged in.');
  }

  try {
    const images = formData.getAll('images') as File[];
    const imageUrls: string[] = [];

    // 1. Upload images to Supabase Storage
    for (const image of images) {
      if (image && image.size > 0) {
        const fileName = `${uuidv4()}-${image.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('apartments')
          .upload(fileName, image);

        if (uploadError) {
          throw new Error(uploadError.message);
        }
        
        const { data: urlData } = supabase.storage
          .from('apartments')
          .getPublicUrl(uploadData.path);
        
        imageUrls.push(urlData.publicUrl);
      }
    }

    // 2. Get the rest of the form data
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const price_huf = Number(formData.get('price_huf'));
    // ... get all your other form fields here ...

    // 3. Insert all data into the database
    const { error: insertError } = await supabase.from('apartments').insert({
      title,
      description,
      price_huf,
      image_urls: imageUrls,
      // ... add all your other fields ...
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    // 4. If successful, revalidate the paths
    revalidatePath('/apartments');
    revalidatePath('/admin');

    // 5. If everything succeeded, redirect to the public apartments page
    redirect('/apartments?success=Apartment+added+successfully!');

  } catch (error) {
    // If any step failed, redirect with an error message
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    redirect(`/admin?error=${encodeURIComponent(errorMessage)}`);
  }
}