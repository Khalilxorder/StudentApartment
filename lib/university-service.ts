
export interface University {
    id: string;
    name: string;
    shortName: string;
    latitude: number;
    longitude: number;
    address: string;
}

export const universities: University[] = [
    {
        id: 'bme',
        name: 'Budapest University of Technology and Economics',
        shortName: 'BME',
        latitude: 47.481121,
        longitude: 19.055375,
        address: 'Műegyetem rkp. 3, 1111'
    },
    {
        id: 'elte-btk',
        name: 'ELTE Faculty of Humanities',
        shortName: 'ELTE BTK',
        latitude: 47.493979,
        longitude: 19.060136,
        address: 'Múzeum krt. 4, 1088'
    },
    {
        id: 'elte-ttk',
        name: 'ELTE Faculty of Science',
        shortName: 'ELTE TTK',
        latitude: 47.473449,
        longitude: 19.062402,
        address: 'Pázmány Péter stny. 1/A, 1117'
    },
    {
        id: 'corvinus',
        name: 'Corvinus University of Budapest',
        shortName: 'Corvinus',
        latitude: 47.486202,
        longitude: 19.058316,
        address: 'Fővám tér 8, 1093'
    },
    {
        id: 'semmelweis',
        name: 'Semmelweis University',
        shortName: 'Semmelweis',
        latitude: 47.486450,
        longitude: 19.066060,
        address: 'Üllői út 26, 1085'
    },
    {
        id: 'bge',
        name: 'Budapest Business University',
        shortName: 'BGE',
        latitude: 47.505708,
        longitude: 19.113063,
        address: 'Buzogány u. 10-12, 1149'
    }
];

export function getUniversities(): University[] {
    return universities;
}

export function getUniversityById(id: string): University | undefined {
    return universities.find(u => u.id === id);
}

/**
 * Calculates the distance between two points in meters using the Haversine formula.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres
    return Math.round(d);
}

export function isWithinDistance(
    targetLat: number,
    targetLon: number,
    checkLat: number,
    checkLon: number,
    maxDistanceMeters: number
): boolean {
    return calculateDistance(targetLat, targetLon, checkLat, checkLon) <= maxDistanceMeters;
}
