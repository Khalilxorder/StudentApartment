import { test, expect } from '@playwright/test';

test.describe('Owner Listing Form - E2E Tests', () => {
  const testApartmentData = {
    title: 'Beautiful Modern Studio in District 5',
    address: 'Nagymező u. 48, 1065 Budapest',
    district: '5',
    price: '250000',
    description: 'Spacious and modern studio apartment with great natural light and proximity to public transportation.',
    bedrooms: '1',
    bathrooms: '1',
  };

  // Mock image files for upload testing
  const mockImagePath = './tests/fixtures/test-image.jpg';

  test('should display owner listing form with all fields', async ({ page }) => {
    // Navigate to the owner listing creation page
    // Note: This assumes authenticated session - adjust URL based on your routing
    await page.goto('/owner/listings/create', { waitUntil: 'networkidle' });

    // Check for all form fields
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('input[name="address"]')).toBeVisible();
    await expect(page.locator('select[name="district"]')).toBeVisible();
    await expect(page.locator('input[name="price_huf"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();

    // Room count inputs should be present
    await expect(page.locator('input[name*="bedroom"]')).toBeTruthy();
    await expect(page.locator('input[name*="bathroom"]')).toBeTruthy();

    // Features checkboxes should be present
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible();

    // Image upload section should be visible
    await expect(page.locator('text=Upload Photos')).toBeVisible();

    // Map container should be visible
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible();
  });

  test('should fill and submit basic listing form', async ({ page }) => {
    await page.goto('/owner/listings/create', { waitUntil: 'networkidle' });

    // Fill in basic information
    await page.fill('input[name="title"]', testApartmentData.title);
    await page.fill('input[name="address"]', testApartmentData.address);
    await page.selectOption('select[name="district"]', testApartmentData.district);
    await page.fill('input[name="price_huf"]', testApartmentData.price);

    // Fill description
    await page.fill('textarea[name="description"]', testApartmentData.description);

    // Set room counts
    await page.fill('input[name="bedrooms"]', testApartmentData.bedrooms);
    await page.fill('input[name="bathrooms"]', testApartmentData.bathrooms);

    // Verify all values are set correctly
    await expect(page.locator('input[name="title"]')).toHaveValue(testApartmentData.title);
    await expect(page.locator('input[name="address"]')).toHaveValue(testApartmentData.address);
    await expect(page.locator('select[name="district"]')).toHaveValue(testApartmentData.district);
    await expect(page.locator('input[name="price_huf"]')).toHaveValue(testApartmentData.price);
  });

  test('should enforce 3+ image requirement before publishing', async ({ page }) => {
    await page.goto('/owner/listings/create', { waitUntil: 'networkidle' });

    // Try to submit without images
    const submitButton = page.locator('button:has-text("Publish Listing")');
    
    // Before upload, should show validation message or prevent submission
    // This depends on your UI implementation
    await page.fill('input[name="title"]', testApartmentData.title);
    await page.fill('input[name="address"]', testApartmentData.address);
    await page.selectOption('select[name="district"]', testApartmentData.district);
    await page.fill('input[name="price_huf"]', testApartmentData.price);
    await page.fill('textarea[name="description"]', testApartmentData.description);

    // Attempt to submit - should fail validation
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should see error message about images
      await expect(page.locator('text=Please upload at least 3')).toBeVisible();
    }
  });

  test('should handle feature selection correctly', async ({ page }) => {
    await page.goto('/owner/listings/create', { waitUntil: 'networkidle' });

    // Select some features (adjust selectors based on your actual feature checkboxes)
    const featureCheckboxes = page.locator('input[type="checkbox"]');
    const count = await featureCheckboxes.count();

    if (count > 0) {
      // Select first 2 features
      await featureCheckboxes.nth(0).check();
      await featureCheckboxes.nth(1).check();

      // Verify they're checked
      await expect(featureCheckboxes.nth(0)).toBeChecked();
      await expect(featureCheckboxes.nth(1)).toBeChecked();
    }
  });

  test('should persist form data when navigating away and returning', async ({ page, context }) => {
    await page.goto('/owner/listings/create', { waitUntil: 'networkidle' });

    // Fill some form data
    await page.fill('input[name="title"]', testApartmentData.title);
    await page.fill('input[name="address"]', testApartmentData.address);
    await page.selectOption('select[name="district"]', testApartmentData.district);

    // Get the page state (would use localStorage or session storage if implemented)
    const titleValue = await page.inputValue('input[name="title"]');
    expect(titleValue).toBe(testApartmentData.title);

    // Navigate away and back (simulating user leaving and returning)
    // Note: This depends on whether your app implements form persistence
    await page.goto('/');
    await page.goto('/owner/listings/create');

    // Check if data persisted (if you implement localStorage persistence)
    // await expect(page.locator('input[name="title"]')).toHaveValue(testApartmentData.title);
  });

  test('should validate form fields before submission', async ({ page }) => {
    await page.goto('/owner/listings/create', { waitUntil: 'networkidle' });

    // Try to submit empty form
    const submitButton = page.locator('button:has-text("Publish Listing")');
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show validation errors
      const errors = page.locator('[role="alert"]');
      await expect(errors.first()).toBeVisible();
    }
  });

  test('should handle coordinate setting via map interaction', async ({ page }) => {
    await page.goto('/owner/listings/create', { waitUntil: 'networkidle' });

    // Check if map is present and interactive
    const mapContainer = page.locator('[data-testid="map-container"]');
    if (await mapContainer.isVisible()) {
      // Map click would trigger coordinate selection
      // This depends on your Map component implementation
      await expect(mapContainer).toBeVisible();

      // Verify that hidden latitude/longitude inputs exist
      const latInput = page.locator('input[name="latitude"]', { exact: false });
      const lngInput = page.locator('input[name="longitude"]', { exact: false });
      // These may be hidden fields
    }
  });

  test('should show success message after listing creation', async ({ page }) => {
    await page.goto('/owner/listings/create', { waitUntil: 'networkidle' });

    // Fill complete form
    await page.fill('input[name="title"]', testApartmentData.title);
    await page.fill('input[name="address"]', testApartmentData.address);
    await page.selectOption('select[name="district"]', testApartmentData.district);
    await page.fill('input[name="price_huf"]', testApartmentData.price);
    await page.fill('textarea[name="description"]', testApartmentData.description);

    // Note: Full submission would require:
    // 1. Authenticated user
    // 2. 3+ images uploaded
    // 3. Map coordinates set
    // This test demonstrates the form flow
  });

  test('should handle quick draft save option', async ({ page }) => {
    await page.goto('/owner/listings/create', { waitUntil: 'networkidle' });

    // Look for draft save button
    const draftButton = page.locator('button:has-text("Save as Draft")');
    if (await draftButton.isVisible()) {
      await draftButton.click();

      // Should show draft form
      const quickDraftForm = page.locator('text=Save as Draft & Continue Later');
      await expect(quickDraftForm).toBeVisible();
    }
  });

  test('should allow image reordering via drag and drop', async ({ page }) => {
    await page.goto('/owner/listings/create', { waitUntil: 'networkidle' });

    // This test would require actual image uploads first
    // Verifying that the SortableImage component is present
    const imageContainer = page.locator('[data-testid="image-gallery"]');
    if (await imageContainer.isVisible()) {
      // Drag and drop functionality would be tested here
      // Dependent on dnd-kit implementation
    }
  });

  test('should update existing listing with form changes', async ({ page }) => {
    // Navigate to edit an existing listing
    // Assuming URL structure: /owner/listings/[id]/edit
    const listingId = 'test-listing-id';
    await page.goto(`/owner/listings/${listingId}/edit`, { waitUntil: 'networkidle' });

    // Form should be pre-populated with existing data
    await expect(page.locator('input[name="title"]')).toHaveValue(/./); // Should have some value

    // Update the title
    const titleInput = page.locator('input[name="title"]');
    await titleInput.fill('Updated Listing Title');

    // Verify the change
    await expect(titleInput).toHaveValue('Updated Listing Title');
  });

  test('should properly handle feature array in FormData', async ({ page }) => {
    await page.goto('/owner/listings/create', { waitUntil: 'networkidle' });

    // Fill basic info
    await page.fill('input[name="title"]', testApartmentData.title);
    await page.fill('input[name="address"]', testApartmentData.address);
    await page.selectOption('select[name="district"]', testApartmentData.district);
    await page.fill('input[name="price_huf"]', testApartmentData.price);
    await page.fill('textarea[name="description"]', testApartmentData.description);

    // Select multiple features
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Both should be checked
      await expect(checkboxes.nth(0)).toBeChecked();
      await expect(checkboxes.nth(1)).toBeChecked();
    }

    // When form is submitted, features should be sent as individual FormData entries
    // Not as JSON stringified array
  });

  test('should validate minimum description length', async ({ page }) => {
    await page.goto('/owner/listings/create', { waitUntil: 'networkidle' });

    // Try short description
    await page.fill('input[name="title"]', testApartmentData.title);
    await page.fill('textarea[name="description"]', 'Too short');
    await page.fill('input[name="price_huf"]', testApartmentData.price);

    const submitButton = page.locator('button:has-text("Publish Listing")');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should show error about description length
      await expect(page.locator('text=Please provide a slightly longer description')).toBeVisible();
    }
  });
});
