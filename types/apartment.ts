export interface Apartment {
    id: string;
    title: string;
    description: string;
    price_huf: number;
    address: string;
    district: number;
    latitude: number;
    longitude: number;
    bedrooms: number;
    bathrooms: number;
    kitchen: number;
    balcony: number;
    is_available: boolean;
    image_urls: string[];
    owner_id: string;
    created_at: string;
    updated_at: string;
    // Optional fields that might be present
    amenities?: string[];
    size_sqm?: number;
    floor?: number;
    building_type?: string;
    heating_type?: string;
    owner_name?: string;
    owner_email?: string;
    owner_phone?: string;
    owner_rating?: number;
    owner_response_time_hours?: number;
    floor_number?: number;
    deposit_months?: number;
}
