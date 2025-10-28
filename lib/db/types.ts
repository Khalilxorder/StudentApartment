// Database schema types
export type User = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export type ProfileStudent = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  university_id: string | null;
  move_in_date: string | null;
  vibe_preference: number | null; // 0-100 (Calm to Social)
  accessibility_preferences: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

export type ProfileOwner = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_name: string | null;
  stripe_account_id: string | null;
  verification_status: 'pending' | 'verified' | 'rejected' | null;
  created_at: string;
  updated_at: string;
};

export type ProfileAdmin = {
  user_id: string;
  role: 'moderator' | 'admin' | 'superadmin';
  created_at: string;
  updated_at: string;
};

export type Apartment = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  price_huf: number;
  bedrooms: number | null;
  bathrooms: number | null;
  square_meters: number | null;
  district: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_available: boolean;
  furnishing: 'unfurnished' | 'partly_furnished' | 'furnished' | null;
  pets_allowed: boolean | null;
  floor_number: number | null;
  total_floors: number | null;
  amenities: string[] | null;
  features: string[] | null;
  image_count: number | null;
  embedding: number[] | null;
  embedding_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApartmentMedia = {
  id: string;
  apartment_id: string;
  image_url: string;
  blurhash: string | null;
  order: number;
  created_at: string;
};

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  apartment_id: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
};

export type Booking = {
  id: string;
  apartment_id: string;
  student_id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  viewing_date: string;
  viewing_time_start: string;
  viewing_time_end: string;
  created_at: string;
};

export type Review = {
  id: string;
  apartment_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  apartment_id: string;
  student_id: string;
  amount_huf: number;
  stripe_payment_intent_id: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
};

export type RankBanditState = {
  id: string;
  user_id: string | null;
  arm_id: string;
  successes: number;
  failures: number;
  last_updated: string;
};

export type SavedSearch = {
  id: string;
  user_id: string;
  name: string;
  filters: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type SearchLog = {
  id: string;
  user_id: string | null;
  query: string;
  filters: Record<string, any> | null;
  results_count: number;
  ranking_version: string | null;
  created_at: string;
};

export type DigestPreference = {
  id: string;
  user_id: string;
  saved_search_id: string;
  frequency: 'daily' | 'weekly' | 'never';
  last_sent_at: string | null;
  created_at: string;
};

export type ModerationQueue = {
  id: string;
  apartment_id: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at: string | null;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, any> | null;
  created_at: string;
};
