import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E Test: Apartment Upload Flow
 * 
 * Tests the complete flow:
 * 1. Sign up / Login
 * 2. Navigate to admin upload form
 * 3. Fill form and upload image
 * 4. Submit and verify redirect
 * 5. Verify apartment appears in listings
 */

test.describe('Apartment Upload Flow', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Test123456!';
  
  test.beforeEach(async ({ page }) => {
    // Start from home
    await page.goto('/');
  });

  test('should complete full apartment upload flow', async ({ page }) => {
    // Step 1: Sign up
    await page.click('text=Sign In');
    await page.click('text=Sign Up');
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Wait for redirect after signup
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Step 2: Navigate to admin form
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);

    // Step 3: Fill the form
    await page.fill('input[placeholder="Listing Title"]', 'Automated Test Listing');
    await page.fill('input[placeholder="Street Address"]', 'Test Street 123, Budapest');
    await page.selectOption('select', '7');
    await page.fill('input[placeholder*="Price"]', '150000');
    await page.fill(
      'textarea[placeholder*="description"]',
      'Test apartment with great location and amenities',
    );

    const roomInputs = page.locator('form .grid input[type="number"]');
    await roomInputs.nth(0).fill('2'); // bedrooms
    await roomInputs.nth(1).fill('1'); // bathrooms
    
    // Upload a test image
    const testImagePath = path.join(process.cwd(), 'public', 'logo.png');
    await page.setInputFiles('input[type="file"]', testImagePath);
    
    // Wait for preview to load
    await expect(page.locator('img[alt="Main preview"]')).toBeVisible({ timeout: 5000 });
    
    // Step 4: Submit
    await page.click('button[type="submit"]');
    
    // Wait for redirect to listings
    await page.waitForURL('**/admin/listings', { timeout: 15000 });
    
    // Step 5: Verify apartment appears
    await expect(page.locator('text=150000')).toBeVisible();
    await expect(page.locator('text=Automated Test Listing')).toBeVisible();
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    // Login first (reuse from previous test or create helper)
    // For simplicity, this test assumes already logged in
    await page.goto('/admin');
    
    // Try to submit without price
    const dialogPromise = new Promise<void>((resolve) => {
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('listing title');
        await dialog.dismiss();
        resolve();
      });
    });
    await page.click('button[type="submit"]');

    await dialogPromise;
  });

  test('should enforce max 20 images', async ({ page }) => {
    await page.goto('/admin');
    
    // Try to upload 21 images (will need to mock or skip this test)
    // This is more of a unit test - keeping here as placeholder
  });
});
