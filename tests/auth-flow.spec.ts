import { test, expect } from '@playwright/test';

test.describe('Auth Flow E2E', () => {
  test('should log in successfully and redirect to admin dashboard workspace', async ({ page }) => {
    // 1. Intercept login submission to simulate a successful session creation and cookie state
    await page.route('**/login', async (route) => {
      if (route.request().method() === 'POST') {
        // Inject authenticated credentials cookies
        await page.context().addCookies([
          {
            name: 'sb-access-token',
            value: 'mocked-bearer-token',
            domain: 'localhost',
            path: '/',
          },
          {
            name: 'user_role',
            value: 'admin',
            domain: 'localhost',
            path: '/',
          }
        ]);

        // Fulfill the request with a redirect header
        await route.fulfill({
          status: 303,
          headers: {
            'Location': '/app',
          },
        });
      } else {
        await route.continue();
      }
    });

    // Mock the getUser endpoint for the landing page dashboard load
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-123',
          email: 'admin@hivaco.com',
          user_metadata: { role: 'admin' }
        })
      });
    });

    // 2. Navigate to Login page
    await page.goto('/login');

    // 3. Fill and submit login credentials
    await page.fill('input[name="email"]', 'admin@hivaco.com');
    await page.fill('input[name="password"]', 'password123');

    // Click submit button
    await page.click('button[type="submit"]');

    // 4. Assert successful redirect to admin home page
    await page.waitForURL('**/app');
    await expect(page).toHaveURL(/.*\/app/);
  });
});
