// FILE: types/search.ts

export interface SearchQuery {
  rawQuery: string;
  bedrooms?: number;
  bathrooms?: number;
  priceRange?: {
    min?: number;
    max?: number;
  };
  location?: {
    district?: number;
    near?: string;
    radius?: number; // meters
  };
  requirements?: string[]; // ['pet_friendly', 'furnished', 'utilities_included']
  amenities?: string[]; // ['wifi', 'ac', 'washing_machine']
  priorities?: string[]; // ['price', 'location', 'size']
  moveInDate?: string;
  leaseDuration?: number; // months
}

export interface ApartmentMatch {
  apartmentId: string;
  score: number; // 0-100
  matchBreakdown: {
    location: number;
    price: number;
    rooms: number;
    amenities: number;
  };
  explanation: string;
  pros: string[];
  cons: string[];
}

export interface SearchResult {
  query: SearchQuery;
  results: ApartmentMatch[];
  totalMatches: number;
  searchTime: number; // milliseconds
}

export interface UserPreferences {
  budget: { min?: number; max?: number };
  location: string[];
  mustHave: string[];
  niceToHave: string[];
  dealBreakers: string[];
}
