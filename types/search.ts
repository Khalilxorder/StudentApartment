export interface SearchQuery {
    rawQuery?: string;
    priorities?: string[];
    priceRange?: {
        min?: number;
        max?: number;
    };
    location?: {
        district?: number;
        near?: string;
    };
    bedrooms?: number;
    bathrooms?: number;
    requirements?: string[];
}

export interface ApartmentMatch {
    apartmentId: string;
    score: number;
    matchBreakdown: {
        price: number;
        location: number;
        rooms: number;
        amenities: number;
    };
    explanation: string;
    pros: string[];
    cons: string[];
}
