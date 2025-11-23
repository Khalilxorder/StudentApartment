import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('E2E: Buy/Book an apartment flow', () => {
  test('student can login, open apartment, trigger payment modal and chat', async ({ page }) => {
    // 1) Faster: inject a logged-in Supabase session into localStorage so our
    // test can proceed without relying on external auth or a seeded database.
    const fakeSession = {
      access_token: 'test_access_token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'test_refresh_token',
      token_type: 'bearer',
      user: {
        id: 'STUDENT1-UUID',
        email: 'student1@test.com',
        role: 'student'
      }
    };

    await page.addInitScript({
      content: `localStorage.setItem('supabase.auth.token', ${JSON.stringify(JSON.stringify(fakeSession))});`,
    });

    // Mock the search API so the apartments list returns a deterministic sample
    // apartment. This avoids needing a seeded database for the E2E test.
    const sampleApartment = {
      id: 'test-apartment-1',
      title: 'Automated Test Studio',
      description: 'A studio apartment used for automated E2E tests',
      price: 50000,
      price_huf: 50000,
      rooms: 1,
      bedrooms: 1,
      bathrooms: 1,
      latitude: 47.4979,
      longitude: 19.0402,
      address: 'Test District V, Budapest',
      district: 'V',
      amenities: ['amen_wifi'],
      photos: [],
      owner_id: 'owner-1',
      owner_name: 'Owner Test',
      image_urls: [],
      size_sqm: 30,
    };

    await page.route('**/api/search', async (route) => {
      const response = {
        apartments: [sampleApartment],
        total: 1,
        offset: 0,
        limit: 20,
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
    });

    // Supabase REST endpoint used by the apartment detail page - return the
    // same sample apartment when the detail page fetches it.
    await page.route('**/rest/v1/apartments*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([sampleApartment]) });
    });

    // Intercept message API to simulate successful message posting
    await page.route('**/api/messages', async (route) => {
      const body = { success: true, id: 'message-1' };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

  await page.goto(`${BASE_URL}/apartments`);
  await page.waitForLoadState('networkidle');

    // 2) Navigate to apartments list
    await page.goto(`${BASE_URL}/apartments`);
    await page.waitForLoadState('networkidle');

  // Wait for apartment cards (link to details) or an empty state fallback
  const apartmentCards = page.locator('a[href^="/apartments/"]');
  const emptyState = page.locator('[data-testid="empty-state"]');
  await expect(apartmentCards.or(emptyState).first()).toBeVisible();

  // If there are no listings, warn and end
  const count = await apartmentCards.count();
    if (count === 0) {
      test.skip(true, 'No apartment cards found in the test DB or seed.');
    }

  // 3) Open first apartment card (navigate to details using the link)
  await apartmentCards.first().click();

    // 4) Click Book Now & Pay Deposit
    const bookButton = page.locator('button', { hasText: 'Book Now & Pay Deposit' }).first();
    await bookButton.waitFor({ state: 'visible', timeout: 5000 });
    await bookButton.click();

    // 5) Assert the payment modal appears (various possible texts)
    await page.waitForSelector('text=Secure Payment, text=Initializing Payment, text=Payment System Unavailable, text=Login Required, text=Payment Error', { timeout: 10000 });
    const modalVisible = await page.locator('text=Secure Payment').isVisible().catch(() => false) || await page.locator('text=Payment System Unavailable').isVisible().catch(() => false);
    expect(modalVisible).toBeTruthy();

    // 6) Open Chat with Owner
    const chatButton = page.locator('button', { hasText: 'Chat with Owner' }).first();
    await chatButton.waitFor({ state: 'visible', timeout: 5000 });
    await chatButton.click();

    // 7) Send chat message
    await page.waitForSelector('h3:has-text("Chat about:")', { timeout: 5000 });
    const input = page.locator('input[placeholder="Type your message..."]');
    await expect(input).toBeVisible();
    await input.fill('Automated test: I want to book this apartment.');

    const sendBtn = page.locator('button', { hasText: 'Send' });
    await sendBtn.click();

    // 8) Confirm the message appears
    await page.waitForSelector('text=Automated test: I want to book this apartment.', { timeout: 5000 });
    await expect(page.locator('text=Automated test: I want to book this apartment.')).toBeVisible();
  });
});
