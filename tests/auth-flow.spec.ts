import { test, expect } from '@playwright/test';

test.describe('Auth Flow E2E', () => {
  test('should log in successfully and redirect to admin dashboard workspace', async ({ page }) => {
    // 1. Navigate to Login page
    await page.goto('/login');

    // 2. Fill and submit login credentials from environment variables
    const email = process.env.TEST_USER_EMAIL || 'admin@hivaco.com';
    const password = process.env.TEST_USER_PASSWORD || 'password123';

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);

    // Click submit button
    await page.click('button[type="submit"]');

    // 3. Assert successful redirect to admin home page
    await page.waitForURL('**/app');
    await expect(page).toHaveURL(/.*\/app/);
  });
});
