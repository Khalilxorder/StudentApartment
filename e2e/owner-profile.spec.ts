// FILE: e2e/owner-profile.spec.ts
// End-to-end tests for owner profile management

import { test, expect } from '@playwright/test';

test.describe('Owner Profile Management', () => {
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';
  const testEmail = `owner-${Date.now()}@test.local`;
  const testPassword = 'TestPassword123!';

  // Helper to signup and login
  async function signupAndLogin(page) {
    // Navigate to signup
    await page.goto(`${baseUrl}/signup`);
    await page.waitForLoadState('networkidle');

    // Fill signup form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Sign Up")');

    // Wait for redirect to dashboard
    await page.waitForURL(`**/owner`, { timeout: 10000 });
  }

  test.beforeEach(async ({ page }) => {
    // Start fresh for each test
    await page.context().clearCookies();
  });

  test('should load profile page for authenticated owner', async ({ page }) => {
    await signupAndLogin(page);

    // Navigate to profile
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    // Check page title
    await expect(page.locator('h1:has-text("Owner Profile")')).toBeVisible();

    // Check sidebar
    await expect(page.locator('text=Profile Overview')).toBeVisible();
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
  });

  test('should fill basic information and see completeness score update', async ({ page }) => {
    await signupAndLogin(page);
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    // Completeness should start at 0 for new profile
    const completenessText = await page.locator('text="Completeness Score"').evaluate(el => 
      el.parentElement?.textContent || ''
    );
    expect(completenessText).toContain('0%');

    // Fill full name
    await page.fill('input[id="full_name"]', 'John Doe');
    
    // Fill phone
    await page.fill('input[id="phone"]', '+36201234567');

    // Click save
    await page.click('button:has-text("Save Changes")');

    // Wait for success alert
    await page.waitForEvent('dialog');
    const dialog = page.context().on('dialog', (dialog) => {
      expect(dialog.message()).toContain('Profile updated successfully');
    });

    // Reload page to check persistence
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    // Verify values persisted
    const fullNameInput = await page.inputValue('input[id="full_name"]');
    expect(fullNameInput).toBe('John Doe');

    const phoneInput = await page.inputValue('input[id="phone"]');
    expect(phoneInput).toBe('+36201234567');

    // Check completeness score increased (15 for name + 10 for phone = 25)
    const updatedCompletenessText = await page.locator('text="Completeness Score"').evaluate(el => 
      el.parentElement?.textContent || ''
    );
    expect(updatedCompletenessText).toContain('25%');
  });

  test('should fill business information', async ({ page }) => {
    await signupAndLogin(page);
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    // Fill business info
    await page.fill('input[id="company_name"]', 'Budapest Properties Ltd.');
    await page.fill('input[id="license_number"]', 'BPL-12345');
    await page.select('select[id="years_experience"]', '10+');
    await page.fill('input[id="website"]', 'https://budapestroperties.com');

    // Save
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(500);

    // Reload and verify
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    expect(await page.inputValue('input[id="company_name"]')).toBe('Budapest Properties Ltd.');
    expect(await page.inputValue('input[id="license_number"]')).toBe('BPL-12345');
    expect(await page.selectOption('select[id="years_experience"]')).toContain('10+');
    expect(await page.inputValue('input[id="website"]')).toBe('https://budapestroperties.com');
  });

  test('should fill bio and update completeness', async ({ page }) => {
    await signupAndLogin(page);
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    // Fill only required fields first
    await page.fill('input[id="full_name"]', 'Jane Smith');
    await page.fill('input[id="phone"]', '+36701234567');
    await page.fill('textarea[id="bio"]', 'I have 15 years of experience managing student housing properties in Budapest.');

    // Save and check completeness (15+10+15 = 40)
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(500);

    // Reload
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    const bioValue = await page.inputValue('textarea[id="bio"]');
    expect(bioValue).toContain('15 years of experience');
  });

  test('should select specializations', async ({ page }) => {
    await signupAndLogin(page);
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    // Check specializations
    const studentHousingCheckbox = page.locator('label:has-text("Student Housing") input[type="checkbox"]');
    const luxuryCheckbox = page.locator('label:has-text("Luxury Properties") input[type="checkbox"]');

    // Check both
    await studentHousingCheckbox.check();
    await luxuryCheckbox.check();

    // Verify checked
    await expect(studentHousingCheckbox).toBeChecked();
    await expect(luxuryCheckbox).toBeChecked();

    // Save
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(500);

    // Reload and verify persisted
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    await expect(studentHousingCheckbox).toBeChecked();
    await expect(luxuryCheckbox).toBeChecked();
  });

  test('should add social media links', async ({ page }) => {
    await signupAndLogin(page);
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    // Fill social links
    await page.fill('input[id="facebook"]', 'https://facebook.com/budapestroperties');
    await page.fill('input[id="instagram"]', 'https://instagram.com/budapestroperties');
    await page.fill('input[id="linkedin"]', 'https://linkedin.com/company/budapest-properties');

    // Save
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(500);

    // Reload and verify
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    expect(await page.inputValue('input[id="facebook"]')).toBe('https://facebook.com/budapestroperties');
    expect(await page.inputValue('input[id="instagram"]')).toBe('https://instagram.com/budapestroperties');
    expect(await page.inputValue('input[id="linkedin"]')).toBe('https://linkedin.com/company/budapest-properties');
  });

  test('should update contact preference', async ({ page }) => {
    await signupAndLogin(page);
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    // Change contact preference
    await page.selectOption('select[id="preferred_contact"]', 'phone');

    // Save
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(500);

    // Reload and verify
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    const selected = await page.selectOption('select[id="preferred_contact"]');
    expect(selected).toContain('phone');
  });

  test('should show profile completeness progress for excellent profile', async ({ page }) => {
    await signupAndLogin(page);
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    // Fill complete profile
    await page.fill('input[id="full_name"]', 'Complete Owner');
    await page.fill('input[id="phone"]', '+36201234567');
    await page.fill('textarea[id="bio"]', 'Experienced property manager');
    await page.fill('input[id="company_name"]', 'Complete Properties');
    await page.fill('input[id="website"]', 'https://complete.com');
    await page.select('select[id="years_experience"]', '10+');
    await page.fill('input[id="facebook"]', 'https://facebook.com/complete');
    
    // Check Student Housing
    await page.locator('label:has-text("Student Housing") input[type="checkbox"]').check();

    // Save
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(500);

    // Reload
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    // Verify excellent status
    const completenessText = await page.locator('text="Completeness Score"').evaluate(el => 
      el.parentElement?.textContent || ''
    );
    expect(completenessText).toContain('100%');
    
    // Check for excellent status message
    await expect(page.locator('text=Excellent! Your profile is complete')).toBeVisible();
  });

  test('should require full name and phone', async ({ page }) => {
    await signupAndLogin(page);
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    // Try to submit empty required fields
    const fullNameInput = page.locator('input[id="full_name"]');
    const phoneInput = page.locator('input[id="phone"]');

    // Clear any pre-filled values
    await fullNameInput.fill('');
    await phoneInput.fill('');

    // Check required attributes
    const fullNameRequired = await fullNameInput.getAttribute('required');
    const phoneRequired = await phoneInput.getAttribute('required');

    expect(fullNameRequired).toBe('');
    expect(phoneRequired).toBe('');
  });

  test('should clear form and reset to empty', async ({ page }) => {
    await signupAndLogin(page);
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    // Fill some fields
    await page.fill('input[id="full_name"]', 'Test Owner');
    await page.fill('input[id="company_name"]', 'Test Company');

    // Fill without saving
    await page.fill('input[id="full_name"]', '');
    await page.fill('input[id="company_name"]', '');

    // Values should be cleared in form
    expect(await page.inputValue('input[id="full_name"]')).toBe('');
    expect(await page.inputValue('input[id="company_name"]')).toBe('');
  });

  test('should display profile info in sidebar', async ({ page }) => {
    await signupAndLogin(page);
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    // Check sidebar info
    await expect(page.locator('text=Email')).toBeVisible();
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
    
    await expect(page.locator('text=Member Since')).toBeVisible();
    const memberSinceText = await page.locator('text=Member Since').evaluate(el =>
      el.parentElement?.textContent || ''
    );
    expect(memberSinceText).not.toContain('N/A');
  });

  test('should show profile tips in sidebar', async ({ page }) => {
    await signupAndLogin(page);
    await page.goto(`${baseUrl}/owner/profile`);
    await page.waitForLoadState('networkidle');

    // Check tips section
    await expect(page.locator('text=Profile Tips')).toBeVisible();
    await expect(page.locator('text=Complete your profile to build trust with tenants')).toBeVisible();
    await expect(page.locator('text=Add your company info for professional credibility')).toBeVisible();
  });
});
