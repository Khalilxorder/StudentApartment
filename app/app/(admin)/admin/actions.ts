'use server';

import { createClient, createServiceRoleClient } from '@/utils/supabaseClient';
import { revalidatePath } from 'next/cache';

type ParsedApartmentForm = {
  title: string;
  address: string;
  district: string;
  price: number;
  description: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  kitchen: number;
  balcony: number;
  isAvailable: boolean;
  imageUrls: string[];
  uploadedImageKeys: string[];
  deletedImageKeys: string[];
};

const DEFAULT_LATITUDE = 47.4979;
const DEFAULT_LONGITUDE = 19.0402;

const parseBoolean = (value: FormDataEntryValue | null): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return ['true', 'on', '1', 'yes'].includes(normalized);
};

const toTrimmedString = (value: FormDataEntryValue | null, field: string) => {
  if (typeof value !== 'string') {
    throw new Error(`${field} is required.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required.`);
  }
  return trimmed;
};

const toPositiveInteger = (value: FormDataEntryValue | null, field: string) => {
  const trimmed = toTrimmedString(value, field);
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${field} must be a positive number.`);
  }
  return parsed;
};

const toNonNegativeInteger = (
  value: FormDataEntryValue | null,
  field: string,
  fallback = 0,
) => {
  if (value === null || (typeof value === 'string' && value.trim() === '')) {
    return fallback;
  }
  const parsed = Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${field} must be 0 or greater.`);
  }
  return parsed;
};

const toBinary = (value: FormDataEntryValue | null, fallback = 0) =>
  toNonNegativeInteger(value, 'Boolean field', fallback) > 0 ? 1 : 0;

const toCoordinate = (
  value: FormDataEntryValue | null,
  field: string,
  min: number,
  max: number,
) => {
  const trimmed = toTrimmedString(value, field);
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${field} must be between ${min} and ${max}.`);
  }
  return parsed;
};

const collectFormValues = (formData: FormData, key: string) =>
  Array.from(
    new Set(
      formData
        .getAll(key)
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0),
    ),
  );

const normalizeDistrict = (raw: string) => {
  const digits = raw.match(/\d{1,2}/)?.[0];
  if (!digits) {
    throw new Error('District must be a number between 1 and 23.');
  }
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 23) {
    throw new Error('District must be a number between 1 and 23.');
  }
  return String(parsed);
};

const computeRoomCount = (bedrooms: number, kitchen: number, balcony: number) => {
  const base = Math.max(1, bedrooms);
  return base + kitchen + balcony;
};

const parseApartmentForm = (
  formData: FormData,
  { requireImages }: { requireImages: boolean },
): ParsedApartmentForm => {
  const title = toTrimmedString(formData.get('title'), 'Title');
  const address = toTrimmedString(formData.get('address'), 'Address');
  const district = normalizeDistrict(toTrimmedString(formData.get('district'), 'District'));
  const price = toPositiveInteger(formData.get('price_huf'), 'Monthly rent');
  const description = toTrimmedString(formData.get('description'), 'Description');
  if (description.length < 10) {
    throw new Error('Please provide a slightly longer description (10+ characters).');
  }

  const latitude = toCoordinate(formData.get('latitude'), 'Latitude', -90, 90);
  const longitude = toCoordinate(formData.get('longitude'), 'Longitude', -180, 180);

  const bedrooms = toNonNegativeInteger(formData.get('bedrooms'), 'Bedrooms');
  const bathrooms = toNonNegativeInteger(formData.get('bathrooms'), 'Bathrooms');
  const kitchen = toBinary(formData.get('kitchen'), 1);
  const balcony = toBinary(formData.get('balcony'), 0);
  const isAvailable = parseBoolean(formData.get('is_available'));

  const imageUrls = collectFormValues(formData, 'image_urls');
  if (requireImages && imageUrls.length === 0) {
    throw new Error('Please upload at least one image before submitting.');
  }

  const uploadedImageKeys = collectFormValues(formData, 'uploaded_image_keys');
  const deletedImageKeys = collectFormValues(formData, 'deleted_image_keys');

  return {
    title,
    address,
    district,
    price,
    description,
    latitude,
    longitude,
    bedrooms,
    bathrooms,
    kitchen,
    balcony,
    isAvailable,
    imageUrls,
    uploadedImageKeys,
    deletedImageKeys,
  };
};

const removeStorageFiles = async (keys: string[]) => {
  const uniqueKeys = Array.from(new Set(keys));
  if (uniqueKeys.length === 0) {
    return;
  }

  try {
    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient.storage.from('apartments').remove(uniqueKeys);
    if (error) {
      console.error('Failed to remove storage files:', error.message);
    }
  } catch (error) {
    console.error('Unable to remove storage files:', error);
  }
};

export async function addApartment(formData: FormData) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be logged in to add an apartment.');
  }

  const parsed = parseApartmentForm(formData, { requireImages: true });
  const now = new Date().toISOString();
  const roomCount = computeRoomCount(parsed.bedrooms, parsed.kitchen, parsed.balcony);
  const status = parsed.isAvailable ? 'published' : 'draft';

  const payload = {
    owner_id: session.user.id,
    title: parsed.title,
    description: parsed.description,
    monthly_rent_huf: parsed.price,
    price_huf: parsed.price,
    room_count: roomCount,
    bedrooms: parsed.bedrooms,
    bathrooms: parsed.bathrooms,
    kitchen: parsed.kitchen,
    balcony: parsed.balcony,
    address: parsed.address,
    district: parsed.district,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    is_available: parsed.isAvailable,
    status,
    published_at: parsed.isAvailable ? now : null,
    image_urls: parsed.imageUrls,
  };

  const { data, error } = await supabase
    .from('apartments')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    await removeStorageFiles(parsed.uploadedImageKeys);
    throw new Error(error.message);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/listings');
  revalidatePath('/owner/listings');
  revalidatePath('/apartments');

  return { ok: true, id: data?.id as string };
}

export async function updateApartment(id: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be logged in to update an apartment.');
  }

  const parsed = parseApartmentForm(formData, { requireImages: true });
  const now = new Date().toISOString();
  const roomCount = computeRoomCount(parsed.bedrooms, parsed.kitchen, parsed.balcony);
  const status = parsed.isAvailable ? 'published' : 'draft';

  const updates = {
    title: parsed.title,
    description: parsed.description,
    monthly_rent_huf: parsed.price,
    price_huf: parsed.price,
    room_count: roomCount,
    bedrooms: parsed.bedrooms,
    bathrooms: parsed.bathrooms,
    kitchen: parsed.kitchen,
    balcony: parsed.balcony,
    address: parsed.address,
    district: parsed.district,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    is_available: parsed.isAvailable,
    status,
    published_at: parsed.isAvailable ? now : null,
    image_urls: parsed.imageUrls,
    updated_at: now,
  };

  const { error } = await supabase
    .from('apartments')
    .update(updates)
    .eq('id', id)
    .eq('owner_id', session.user.id);

  if (error) {
    await removeStorageFiles(parsed.uploadedImageKeys);
    throw new Error(error.message);
  }

  if (parsed.deletedImageKeys.length > 0) {
    await removeStorageFiles(parsed.deletedImageKeys);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/listings');
  revalidatePath(`/owner/listings/${id}`);
  revalidatePath('/owner/listings');
  revalidatePath('/apartments');
}

export async function saveDraft(formData: FormData) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be logged in to save a draft.');
  }

  const title = toTrimmedString(formData.get('title'), 'Title');
  const address = toTrimmedString(formData.get('address'), 'Address');
  const price = toPositiveInteger(formData.get('price_huf'), 'Monthly rent');
  const district = normalizeDistrict(
    formData.get('district') ? String(formData.get('district')) : '1',
  );

  const draftId = formData.get('id');
  const now = new Date().toISOString();

  const payload = {
    owner_id: session.user.id,
    title,
    description: formData.get('description') ? String(formData.get('description')).trim() : '',
    monthly_rent_huf: price,
    price_huf: price,
    room_count: 1,
    bedrooms: 0,
    bathrooms: 0,
    kitchen: 1,
    balcony: 0,
    address,
    district,
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
    is_available: false,
    status: 'draft' as const,
    image_urls: collectFormValues(formData, 'image_urls'),
    created_at: now,
    updated_at: now,
  };

  if (draftId && typeof draftId === 'string' && draftId.trim().length > 0) {
    const { error } = await supabase
      .from('apartments')
      .update({ ...payload, created_at: undefined })
      .eq('id', draftId)
      .eq('owner_id', session.user.id);

    if (error) {
      throw new Error(`Failed to update draft: ${error.message}`);
    }

    revalidatePath('/owner/listings');
    return { id: draftId, success: true, message: 'Draft updated' };
  }

  const { data, error } = await supabase
    .from('apartments')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to save draft: ${error.message}`);
  }

  revalidatePath('/owner/listings');
  return { id: data?.id as string, success: true, message: 'Draft saved' };
}

export async function deleteDraft(id: string) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be logged in to delete a draft.');
  }

  const { data, error } = await supabase
    .from('apartments')
    .delete()
    .eq('id', id)
    .eq('owner_id', session.user.id)
    .select('image_urls');

  if (error) {
    throw new Error(`Failed to delete draft: ${error.message}`);
  }

  const urls = (data ?? []).flatMap((row: any) => row.image_urls ?? []);
  const keys = urls
    .map((url: string) => url.split('/').pop() || '')
    .filter((key: string) => key.length > 0);
  if (keys.length > 0) {
    await removeStorageFiles(keys);
  }

  revalidatePath('/owner/listings');
  return { success: true, message: 'Draft deleted' };
}
