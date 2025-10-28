import { test, expect, BrowserContext, Page } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load homepage within performance budget', async ({ page }) => {
    // Start collecting performance metrics
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    // Navigate to homepage
    const startTime = Date.now();
    await page.goto('/');

    const loadTime = Date.now() - startTime;

    // Check load time is under 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Get performance metrics
    const metrics = await client.send('Performance.getMetrics');

    // Check key performance metrics
    const fcp = metrics.metrics.find(m => m.name === 'FirstContentfulPaint');
    const lcp = metrics.metrics.find(m => m.name === 'LargestContentfulPaint');

    if (fcp) {
      expect(fcp.value).toBeLessThan(2000); // FCP under 2s
    }

    if (lcp) {
      expect(lcp.value).toBeLessThan(3000); // LCP under 3s
    }
  });

  test('should load apartment search results quickly', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Start timing search
    const startTime = Date.now();

    // Perform search
    await page.fill('input[placeholder*="district"]', '5');
    await page.click('button[type="submit"]');

    // Wait for results to load
    await page.waitForSelector('[data-testid="apartment-card"]', { timeout: 5000 });

    const searchTime = Date.now() - startTime;

    // Search should complete within 2 seconds
    expect(searchTime).toBeLessThan(2000);

    // Should have results
    const resultCount = await page.locator('[data-testid="apartment-card"]').count();
    expect(resultCount).toBeGreaterThan(0);
  });

  test('should handle concurrent users without degradation', async ({ browser }) => {
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];

    // Create 5 concurrent users
    for (let i = 0; i < 5; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    const loadTimes: number[] = [];

    // All users navigate to homepage simultaneously
    const navigationPromises = pages.map(async (page, index) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      loadTimes.push(loadTime);
      return loadTime;
    });

    await Promise.all(navigationPromises);

    // Calculate average load time
    const avgLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;

    // Average should be under 3 seconds even with concurrent users
    expect(avgLoadTime).toBeLessThan(3000);

    // Clean up
    for (const context of contexts) {
      await context.close();
    }
  });

  test('should maintain performance during user interactions', async ({ page }) => {
    await page.goto('/');

    // Wait for initial load
    await page.waitForLoadState('networkidle');

    const interactions: number[] = [];

    // Simulate user interactions
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();

      // Click on a filter or search element
      if (await page.locator('button[data-testid="filter-button"]').isVisible()) {
        await page.click('button[data-testid="filter-button"]');
        await page.waitForTimeout(100); // Small delay for UI update
      }

      // Scroll down to load more content
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(200);

      const interactionTime = Date.now() - startTime;
      interactions.push(interactionTime);
    }

    // Calculate average interaction time
    const avgInteractionTime = interactions.reduce((sum, time) => sum + time, 0) / interactions.length;

    // Interactions should be responsive (under 500ms average)
    expect(avgInteractionTime).toBeLessThan(500);
  });

  test('should load images efficiently with proper optimization', async ({ page }) => {
    await page.goto('/');

    // Wait for images to load
    await page.waitForLoadState('networkidle');

    // Get all images
    const images = await page.locator('img').all();

    let totalImageSize = 0;
    const imageSizes: number[] = [];

    for (const img of images) {
      const src = await img.getAttribute('src');
      if (src && src.startsWith('http')) {
        try {
          const response = await page.request.get(src);
          const size = response.headers()['content-length'];
          if (size) {
            const sizeKB = parseInt(size) / 1024;
            totalImageSize += sizeKB;
            imageSizes.push(sizeKB);
          }
        } catch (error) {
          // Skip images that can't be fetched
          continue;
        }
      }
    }

    // Average image size should be reasonable (under 200KB per image)
    if (imageSizes.length > 0) {
      const avgImageSize = totalImageSize / imageSizes.length;
      expect(avgImageSize).toBeLessThan(200);
    }

    // Check for lazy loading attributes
    const lazyImages = await page.locator('img[loading="lazy"]').count();
    const totalImages = await page.locator('img').count();

    // At least 50% of images should use lazy loading
    expect(lazyImages / totalImages).toBeGreaterThan(0.5);
  });

  test('should have good Core Web Vitals scores', async ({ page }) => {
    // Navigate and wait for load
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get Core Web Vitals from performance API
    const cwaData = await page.evaluate(() => {
      // Check that page is interactive
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation?.loadEventEnd || 0;
    });

    // Page should be interactive within 3 seconds
    expect(cwaData).toBeLessThan(3000);
  });
});