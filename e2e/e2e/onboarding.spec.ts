import { test, expect } from '@playwright/test';

test.describe('User Onboarding Flow', () => {
  test('should complete full student onboarding journey', async ({ page }) => {
    // Navigate to the signup page
    await page.goto('/signup');

    // Fill out signup form
    await page.fill('input[name="email"]', 'teststudent@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');

    // Click signup button
    await page.click('button[type="submit"]');

    // Should redirect to onboarding
    await expect(page).toHaveURL(/\/onboarding/);

    // Step 1: User type selection
    await page.click('button[data-user-type="student"]');

    // Step 2: Personal information
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="phone"]', '+36 30 123 4567');
    await page.selectOption('select[name="university"]', 'University of Budapest');
    await page.fill('input[name="studentId"]', 'UB123456');
    await page.click('button[data-step="next"]');

    // Step 3: Preferences
    await page.selectOption('select[name="budget"]', '100000-150000');
    await page.check('input[name="furnished"][value="true"]');
    await page.check('input[name="petFriendly"][value="true"]');
    await page.selectOption('select[name="moveInDate"]', '2024-09');
    await page.click('button[data-step="next"]');

    // Step 4: Verification documents
    // Upload ID document
    await page.setInputFiles('input[name="idDocument"]', {
      name: 'test-id.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    });

    // Upload proof of enrollment
    await page.setInputFiles('input[name="enrollmentDocument"]', {
      name: 'test-enrollment.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake-pdf-data'),
    });

    await page.click('button[data-step="next"]');

    // Should complete onboarding and redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify welcome message
    await expect(page.locator('text=Welcome to Student Apartments')).toBeVisible();
  });

  test('should complete full owner onboarding journey', async ({ page }) => {
    // Navigate to the signup page
    await page.goto('/signup');

    // Fill out signup form
    await page.fill('input[name="email"]', 'testowner@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');

    // Click signup button
    await page.click('button[type="submit"]');

    // Should redirect to onboarding
    await expect(page).toHaveURL(/\/onboarding/);

    // Step 1: User type selection
    await page.click('button[data-user-type="owner"]');

    // Step 2: Personal information
    await page.fill('input[name="firstName"]', 'Jane');
    await page.fill('input[name="lastName"]', 'Smith');
    await page.fill('input[name="phone"]', '+36 30 987 6543');
    await page.fill('input[name="company"]', 'Property Management Ltd');
    await page.check('input[name="hasInsurance"][value="true"]');
    await page.click('button[data-step="next"]');

    // Step 3: Property information
    await page.fill('input[name="propertyCount"]', '5');
    await page.selectOption('select[name="experience"]', '3-5');
    await page.check('input[name="acceptsStudents"][value="true"]');
    await page.check('input[name="providesFurnished"][value="true"]');
    await page.click('button[data-step="next"]');

    // Step 4: Verification documents
    // Upload business license
    await page.setInputFiles('input[name="businessLicense"]', {
      name: 'test-license.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake-license-data'),
    });

    // Upload property ownership documents
    await page.setInputFiles('input[name="ownershipDocuments"]', {
      name: 'test-ownership.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake-ownership-data'),
    });

    await page.click('button[data-step="next"]');

    // Should complete onboarding and redirect to owner dashboard
    await expect(page).toHaveURL(/\/owner/);

    // Verify owner dashboard
    await expect(page.locator('text=Owner Dashboard')).toBeVisible();
  });

  test('should handle form validation errors', async ({ page }) => {
    await page.goto('/signup');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();

    // Fill invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');

    // Should show email validation error
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();

    // Fill mismatched passwords
    await page.fill('input[name="email"]', 'valid@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await page.click('button[type="submit"]');

    // Should show password mismatch error
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should allow navigation between onboarding steps', async ({ page }) => {
    await page.goto('/signup');

    // Complete signup
    await page.fill('input[name="email"]', 'navigationtest@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Step 1: User type
    await expect(page.locator('text=What type of user are you?')).toBeVisible();
    await page.click('button[data-user-type="student"]');

    // Step 2: Personal info
    await expect(page.locator('text=Tell us about yourself')).toBeVisible();
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.click('button[data-step="next"]');

    // Step 3: Preferences
    await expect(page.locator('text=What are you looking for?')).toBeVisible();

    // Go back to step 2
    await page.click('button[data-step="back"]');
    await expect(page.locator('text=Tell us about yourself')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toHaveValue('Test');

    // Go forward again
    await page.click('button[data-step="next"]');
    await expect(page.locator('text=What are you looking for?')).toBeVisible();
  });
});