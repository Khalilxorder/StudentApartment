export interface OwnerProfileFormData {
    full_name: string | null;
    phone: string | null;
    bio: string | null;
    company_name: string | null;
    license_number: string | null;
    years_experience: number | string | null;
    specializations: string[];
    preferred_contact_method: string;
    website: string | null;
    social_links: {
        facebook: string;
        instagram: string;
        linkedin: string;
    };
    avatar_url: string | null;
    tax_id: string | null;
}

export const calculateProfileCompletenessScore = (data: Partial<OwnerProfileFormData>): number => {
    let score = 0;
    if (data.full_name) score += 20;
    if (data.phone) score += 20;
    if (data.bio) score += 15;
    if (data.company_name) score += 10;
    if (data.license_number) score += 10;
    if (data.years_experience) score += 10;
    if (data.website) score += 10;
    if (data.specializations && data.specializations.length > 0) score += 5;
    return score;
};

export const getCompletenessLevel = (score: number): string => {
    if (score >= 80) return 'High';
    if (score >= 50) return 'Medium';
    return 'Low';
};

export const getCompletenessPercentage = (scoreOrData: number | Partial<OwnerProfileFormData>): number => {
    if (typeof scoreOrData === 'number') {
        return scoreOrData;
    }
    return calculateProfileCompletenessScore(scoreOrData);
};
