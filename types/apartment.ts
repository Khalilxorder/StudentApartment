// FILE: types/apartment.ts

export type Apartment = {
  // Core identification
  id: string;
  created_at: string;
  last_updated_at: string;
  
  // Basic info
  title: string;
  description: string | null;
  price_huf: number;
  district: number | null;
  address: string | null;
  image_urls: string[] | null;
  image_keys?: string[] | null;
  is_available: boolean;
  
  // Owner info
  owner_id?: string | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  owner_response_time_hours?: number | null;
  owner_rating?: number | null;
  
  // Location
  latitude: number | null;
  longitude: number | null;
  neighborhood_description?: string | null;
  nearby_landmarks?: string[] | null;
  public_transport_lines?: string[] | null;
  walkability_score?: number | null;
  safety_score?: number | null;
  
  // Neighborhood Data (from APIs)
  transit_score?: number | null;
  bike_score?: number | null;
  nearby_restaurants_count?: number | null;
  nearby_grocery_count?: number | null;
  nearby_shopping_count?: number | null;
  nearby_cafes_count?: number | null;
  nearby_gyms_count?: number | null;
  nearby_parks_count?: number | null;
  nearby_schools_count?: number | null;
  nearby_hospitals_count?: number | null;
  neighborhood_price_trend?: 'up' | 'down' | 'stable' | null;
  neighborhood_price_change_percent?: number | null;
  
  // Room counts
  bedrooms: number | null;
  bathrooms: number | null;
  kitchen: number | null;
  balcony: number | null;
  
  // Room details
  living_room_size_sqm?: number | null;
  bedroom_sizes_sqm?: number[] | null;
  bathroom_type?: string | null;
  kitchen_type?: string | null;
  storage_type?: string | null;
  workspace_available?: boolean;
  
  // Building details
  furnishing: string | null;
  elevator: string | null;
  building_year_built?: number | null;
  building_last_renovated?: number | null;
  building_material?: string | null;
  building_condition?: string | null;
  building_soundproofing?: string | null;
  insulation_quality?: string | null;
  window_type?: string | null;
  balcony_orientation?: string | null;
  view_type?: string | null;
  
  // Amenities (100+ features)
  air_conditioning?: boolean;
  central_heating?: boolean;
  floor_heating?: boolean;
  dishwasher?: boolean;
  washing_machine?: boolean;
  dryer?: boolean;
  refrigerator?: boolean;
  oven?: boolean;
  microwave?: boolean;
  coffee_machine?: boolean;
  tv?: boolean;
  wifi_speed_mbps?: number | null;
  smart_home_features?: string[] | null;
  security_system?: boolean;
  intercom?: boolean;
  video_doorbell?: boolean;
  alarm_system?: boolean;
  fire_alarm?: boolean;
  carbon_monoxide_detector?: boolean;
  
  // Accessibility
  wheelchair_accessible?: boolean;
  elevator_accessible?: boolean;
  step_free_entrance?: boolean;
  wide_doorways?: boolean;
  accessible_bathroom?: boolean;
  
  // Policies
  smoking_policy?: string | null;
  pet_policy?: string | null;
  guests_allowed?: boolean;
  party_policy?: string | null;
  subletting_allowed?: boolean;
  
  // Financial
  utilities_breakdown?: Record<string, number> | null;
  utility_payment_method?: string | null;
  common_costs_breakdown?: Record<string, number> | null;
  deposit_refund_terms?: string | null;
  lease_flexibility?: string | null;
  early_termination_policy?: string | null;
  
  // Legal/Admin
  contract_type?: string | null;
  registration_possible?: boolean;
  proof_of_income_required?: boolean;
  guarantor_required?: boolean;
  credit_check_required?: boolean;
  documents_required?: string[] | null;
  
  // Lifestyle match
  ideal_tenant_description?: string | null;
  lifestyle_compatibility_tags?: string[] | null;
  age_preference?: string | null;
  occupation_preference?: string | null;
  
  // AI matching metadata
  feature_vector?: number[] | null;
  last_matched_at?: string | null;
  match_quality_scores?: Record<string, number> | null;
  
  // Availability
  available_from?: string | null;
  available_until?: string | null;
  minimum_lease_months?: number | null;
  maximum_lease_months?: number | null;
  viewings_available?: boolean;
  virtual_tour_url?: string | null;
  
  // Stats for ranking
  view_count?: number;
  inquiry_count?: number;
  booking_count?: number;
  response_rate?: number | null;
  
  // Status
  verification_status?: string;
  verification_notes?: string | null;
  featured?: boolean;
  boost_until?: string | null;
  
  // Legacy fields (keeping for backward compatibility)
  size_sqm?: number | null;
  floor_number?: number | null;
  total_floors?: number | null;
  pet_friendly?: boolean;
  smoking_allowed?: boolean;
  utilities_included?: string[] | null;
  amenities?: string[] | null;
  building_age?: number | null;
  distance_to_metro_m?: number | null;
  distance_to_university_m?: number | null;
  neighborhood_tags?: string[] | null;
  lease_min_months?: number | null;
  parking_available?: boolean;
  parking?: boolean;
  heating_type?: string | null;
  cooling_type?: string | null;
  internet_included?: boolean;
  laundry_in_unit?: boolean;
  move_in_cost_huf?: number | null;
  deposit_months?: number | null;
};