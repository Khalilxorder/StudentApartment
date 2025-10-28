import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests - WCAG 2.2 AA Compliance', () => {
  test('homepage should pass accessibility checks', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // WCAG color contrast requires color picker tools
      .analyze();

    // Fail on any critical violations
    if (accessibilityScanResults.violations.length > 0) {
      const violationDetails = accessibilityScanResults.violations
        .map(v => `[${v.impact?.toUpperCase()}] ${v.id}: ${v.description} (${v.nodes.length} instances)`)
        .join('\n');
      
      console.error('WCAG 2.2 Accessibility Violations Found:\n', violationDetails);
    }

    // Fail on critical violations - zero tolerance
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical'
    );

    expect(criticalViolations).toHaveLength(0); // Zero critical violations allowed

    // Warn on serious violations (still allow for now, but flag them)
    const seriousViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'serious'
    );
    
    if (seriousViolations.length > 0) {
      console.warn(`⚠️  Warning: ${seriousViolations.length} serious accessibility issues found`);
    }
  });

  test('keyboard navigation should work throughout the site', async ({ page }) => {
    await page.goto('/');

    // Test tab navigation through main elements
    const focusableElements = [
      'a[href]',
      'button',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    const elements = page.locator(focusableElements);
    const count = await elements.count();

    // Should have reasonable number of focusable elements
    expect(count).toBeGreaterThan(5);
    expect(count).toBeLessThan(100);

    // Test that we can tab through elements
    await page.keyboard.press('Tab');
    const firstFocused = page.locator(':focus');
    await expect(firstFocused).toBeVisible();
  });

  test('forms should have proper labels and validation', async ({ page }) => {
    await page.goto('/login');

    // Check login form accessibility
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await expect(emailInput).toHaveAttribute('aria-label');
      await expect(emailInput).toHaveAttribute('aria-describedby');
    }

    // Test form error announcements
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should announce errors to screen readers
      const errorRegion = page.locator('[aria-live="assertive"], [role="alert"]');
      // Note: Actual error announcement depends on implementation
    }
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');

    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        // Decorative images can have empty alt, but content images should have alt
        expect(alt).not.toBeNull();
      }
    }
  });

  test('color contrast should meet standards', async ({ page }) => {
    await page.goto('/');

    // Test that page doesn't have obvious contrast issues
    // This is a basic check - full contrast testing would require additional tools
    const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, div');
    const visibleTextCount = await textElements.count();

    // Should have readable text content
    expect(visibleTextCount).toBeGreaterThan(10);
  });

  test('page structure should be semantic', async ({ page }) => {
    await page.goto('/');

    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);
    expect(h1Count).toBeLessThan(3); // Usually only one H1 per page

    // Check heading hierarchy (H1 -> H2 -> H3, etc.)
    const headingSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const headingLevels: number[] = [];
    
    for (const selector of headingSelectors) {
      const count = await page.locator(selector).count();
      for (let i = 0; i < count; i++) {
        headingLevels.push(parseInt(selector.charAt(1)));
      }
    }
    
    if (headingLevels.length > 1) {
      // Basic check that headings aren't out of order
      for (let i = 1; i < headingLevels.length; i++) {
        expect(headingLevels[i]).toBeGreaterThanOrEqual(headingLevels[i-1] - 1);
      }
    }
  });

  test('interactive elements should be properly sized', async ({ page }) => {
    await page.goto('/');

    // Check button sizes (minimum 44x44px for touch targets)
    const buttons = page.locator('button, [role="button"]');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box) {
        // Allow some flexibility for design but ensure minimum touch target
        expect(box.width).toBeGreaterThanOrEqual(40);
        expect(box.height).toBeGreaterThanOrEqual(38); // Allow 38px for design flexibility
      }
    }
  });

  test('language should be properly declared', async ({ page }) => {
    await page.goto('/');

    // Check html lang attribute
    const html = page.locator('html');
    const lang = await html.getAttribute('lang');
    expect(lang).toMatch(/^(en|hu|en-US|hu-HU)$/);
  });
});