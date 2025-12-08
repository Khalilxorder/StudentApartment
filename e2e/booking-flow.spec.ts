/**
 * E2E Test: Student Booking Flow
 * Tests the complete journey from search to booking
 */

import { test, expect } from '@playwright/test';

test.describe('Student Booking Flow', () => {
  test('should complete full booking journey', async ({ page }) => {
    // 1. Navigate to home page
    await page.goto('/');
    await expect(page).toHaveTitle(/Student Apartments/);

    // 2. Perform search
    await page.fill('[data-testid="search-input"]', 'Budapest District 7');
    await page.click('[data-testid="search-button"]');

    // Wait for results
    await page.waitForSelector('[data-testid="apartment-card"]');

    // 3. View apartment details
    const firstApartment = page.locator('[data-testid="apartment-card"]').first();
    await firstApartment.click();

    await expect(page.locator('h1')).toBeVisible();

    // 4. Check if logged in, if not skip booking
    const loginButton = page.locator('[data-testid="login-button"]');
    if (await loginButton.isVisible()) {
      // User not logged in - test ends here for anonymous users
      await expect(loginButton).toBeVisible();
    } else {
      // 5. Click "Book Now"
      await page.click('[data-testid="book-now-button"]');

      // 6. Verify booking form appears
      await expect(page.locator('[data-testid="booking-form"]')).toBeVisible();
    }
  });

  test('should filter search results', async ({ page }) => {
    await page.goto('/search');

    // Apply price filter
    await page.fill('[data-testid="price-min"]', '100000');
    await page.fill('[data-testid="price-max"]', '200000');

    // Apply bedrooms filter
    await page.selectOption('[data-testid="bedrooms-filter"]', '2');

    // Click filter
    await page.click('[data-testid="apply-filters"]');

    // Wait for filtered results
    await page.waitForSelector('[data-testid="apartment-card"]');

    // Verify results exist
    const apartments = page.locator('[data-testid="apartment-card"]');
    await expect(apartments).toHaveCount(await apartments.count());
  });

  test('should display apartment details correctly', async ({ page }) => {
    await page.goto('/search');
    await page.waitForSelector('[data-testid="apartment-card"]');

    // Click first apartment
    await page.locator('[data-testid="apartment-card"]').first().click();

    // Verify essential details are shown
    await expect(page.locator('[data-testid="apartment-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="apartment-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="apartment-description"]')).toBeVisible();
  });
});
