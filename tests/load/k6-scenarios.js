/**
 * K6 Load Testing Scenarios
 * Tests API endpoints under load to validate performance baselines
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 10 },  // Ramp up to 10 users
        { duration: '1m', target: 50 },   // Ramp up to 50 users
        { duration: '2m', target: 50 },   // Stay at 50 users for 2 minutes
        { duration: '30s', target: 100 }, // Spike to 100 users
        { duration: '1m', target: 100 },  // Stay at 100 users
        { duration: '30s', target: 0 },   // Ramp down to 0
    ],
    thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
        http_req_failed: ['rate<0.01'],                 // Error rate < 1%
        errors: ['rate<0.05'],                          // Custom error metric < 5%
    },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const testApartmentId = 'test-apt-123';
const testEmail = `test-${Date.now()}@example.com`;

export default function () {
    // Test 1: Homepage
    const homeRes = http.get(`${BASE_URL}/`);
    check(homeRes, {
        'homepage status 200': (r) => r.status === 200,
        'homepage loads quickly': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    sleep(1);

    // Test 2: Search API
    const searchRes = http.get(`${BASE_URL}/api/search?q=budapest&district=7`);
    check(searchRes, {
        'search status 200': (r) => r.status === 200,
        'search returns data': (r) => r.json('results') !== undefined,
        'search responds quickly': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    sleep(2);

    // Test 3: Apartment Details
    const apartmentRes = http.get(`${BASE_URL}/api/apartments/${testApartmentId}`);
    check(apartmentRes, {
        'apartment details loads': (r) => [200, 404].includes(r.status),
    }) || errorRate.add(1);

    sleep(1);

    // Test 4: Health Check
    const healthRes = http.get(`${BASE_URL}/api/health`);
    check(healthRes, {
        'health check passes': (r) => r.status === 200,
        'health check fast': (r) => r.timings.duration < 100,
    }) || errorRate.add(1);

    sleep(1);
}

/**
 * Smoke Test - Quick validation
 */
export function smokeTest() {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
        'smoke test passes': (r) => r.status === 200,
    });
}

/**
 * Stress Test - Break point testing
 */
export const stressOptions = {
    stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '10m', target: 0 },
    ],
};

/**
 * Spike Test - Sudden traffic surge
 */
export const spikeOptions = {
    stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 1000 }, // Sudden spike
        { duration: '3m', target: 1000 },
        { duration: '10s', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '10s', target: 0 },
    ],
};

/**
 * Soak Test - Long duration stability
 */
export const soakOptions = {
    stages: [
        { duration: '2m', target: 50 },
        { duration: '3h', target: 50 },
        { duration: '2m', target: 0 },
    ],
};
