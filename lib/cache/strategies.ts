/**
 * Cache Strategies
 * Implements caching patterns for different data types
 */

import {
    getCache,
    setCache,
    deleteCache,
    deleteCachePattern,
    CACHE_KEYS,
    CACHE_TTL,
} from './redis-client';

/**
 * Search Results Cache
 */
export async function getCachedSearchResults(
    queryHash: string
): Promise<any | null> {
    const key = `${CACHE_KEYS.SEARCH_RESULTS}${queryHash}`;
    return await getCache(key);
}

export async function setCachedSearchResults(
    queryHash: string,
    results: any
): Promise<void> {
    const key = `${CACHE_KEYS.SEARCH_RESULTS}${queryHash}`;
    await setCache(key, results, CACHE_TTL.SEARCH_RESULTS);
}

/**
 * Apartment Details Cache
 */
export async function getCachedApartment(
    apartmentId: string
): Promise<any | null> {
    const key = `${CACHE_KEYS.APARTMENT_DETAILS}${apartmentId}`;
    return await getCache(key);
}

export async function setCachedApartment(
    apartmentId: string,
    apartment: any
): Promise<void> {
    const key = `${CACHE_KEYS.APARTMENT_DETAILS}${apartmentId}`;
    await setCache(key, apartment, CACHE_TTL.APARTMENT_DETAILS);
}

export async function invalidateApartmentCache(
    apartmentId: string
): Promise<void> {
    const key = `${CACHE_KEYS.APARTMENT_DETAILS}${apartmentId}`;
    await deleteCache(key);

    // Also invalidate apartment list caches
    await deleteCachePattern(`${CACHE_KEYS.APARTMENT_LIST}*`);
}

/**
 * User Profile Cache
 */
export async function getCachedUserProfile(
    userId: string
): Promise<any | null> {
    const key = `${CACHE_KEYS.USER_PROFILE}${userId}`;
    return await getCache(key);
}

export async function setCachedUserProfile(
    userId: string,
    profile: any
): Promise<void> {
    const key = `${CACHE_KEYS.USER_PROFILE}${userId}`;
    await setCache(key, profile, CACHE_TTL.USER_PROFILE);
}

export async function invalidateUserProfileCache(
    userId: string
): Promise<void> {
    const key = `${CACHE_KEYS.USER_PROFILE}${userId}`;
    await deleteCache(key);
}

/**
 * Cache warming utilities
 */
export async function warmApartmentCache(apartments: any[]): Promise<void> {
    const promises = apartments.map((apt) =>
        setCachedApartment(apt.id, apt)
    );
    await Promise.all(promises);
}

/**
 * Create cache key hash from search query
 */
export function createSearchQueryHash(query: any): string {
    // Create deterministic hash from query object
    const normalized = JSON.stringify(query, Object.keys(query).sort());
    return Buffer.from(normalized).toString('base64').slice(0, 32);
}
