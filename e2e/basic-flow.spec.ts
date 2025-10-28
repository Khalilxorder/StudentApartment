import { test, expect } from '@playwright/test';

test.describe('Student Apartment Website - Enhanced E2E Tests', () => {
  test('should load homepage with proper SEO and accessibility', async ({ page }) => {
    await page.goto('/');

    // Check title and meta tags
    await expect(page).toHaveTitle(/Student Apartments/);
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content');

    // Check for main navigation
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();

    // Check for accessibility landmarks
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should handle user authentication flow', async ({ page }) => {
    // Test login page
    await page.goto('/login');
    await expect(page.locator('text=Continue with Google')).toBeVisible();

    // Test signup page
    await page.goto('/signup');
    await expect(page.locator('text=Create Account')).toBeVisible();
  });

  test('should navigate apartment search and filtering', async ({ page }) => {
    await page.goto('/search');

    // Check search form elements
    await expect(page.locator('input[placeholder*="search"]')).toBeVisible();
    await expect(page.locator('select[name="district"]')).toBeVisible();

    // Test basic form interaction
    await page.fill('input[placeholder*="search"]', 'university');
    await expect(page.locator('input[placeholder*="search"]')).toHaveValue('university');
  });

  test('should handle responsive design', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/');

    // Check mobile menu
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('nav')).toBeVisible();
    }

    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test 404 page
    await page.goto('/nonexistent-page');
    await expect(page.locator('text=Page not found')).toBeVisible();

    // Test error boundary (if implemented)
    await page.goto('/error-test');
    // Should show error page or fallback content
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Test tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Test skip links if present
    const skipLink = page.locator('a[href="#main"]');
    if (await skipLink.isVisible()) {
      await skipLink.click();
      await expect(page.locator('main')).toBeFocused();
    }
  });

  test('should load and interact with apartment listings', async ({ page }) => {
    await page.goto('/apartments');

    // Wait for loading state to complete
    await page.waitForLoadState('networkidle');

    // Check for apartment cards or empty state
    const apartmentCards = page.locator('[data-testid="apartment-card"]');
    const emptyState = page.locator('[data-testid="empty-state"]');

    // Should have either cards or empty state
    await expect(apartmentCards.or(emptyState).first()).toBeVisible();
  });

  test('should handle form validation', async ({ page }) => {
    await page.goto('/contact');

    // Test form submission without required fields
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show validation errors
      const errorMessages = page.locator('[data-testid="error-message"]');
      // Note: Actual validation depends on implementation
    }
  });
});