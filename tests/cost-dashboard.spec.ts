import { test, expect } from '@playwright/test';

test.describe('Machinery Cost Dashboard E2E', () => {
  test('should render cost aggregates and tables correctly', async ({ page }) => {
    // 1. Inject mock authentication cookies into the browser context
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

    // Mock Supabase getUser endpoint if client-side validation is performed
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

    // 2. Navigate to the main dashboard workspace page
    await page.goto('/app');

    // 3. Assertions for the dashboard UI
    // Assert title of the page is visible
    await expect(page.locator('h1')).toContainText('Costos de Maquinaria');

    // Assert that seeded record for Excavadora A is visible in the row list
    await expect(page.locator('text=Excavadora A')).toBeVisible();

    // Assert the "Calcular" action button exists
    const calculateBtn = page.locator('button:has-text("Calcular")');
    await expect(calculateBtn).toBeVisible();

    // Click to execute mathematical cost distribution formulas
    await calculateBtn.click();

    // Assert the toast message indicating successful calculations appears
    await expect(page.locator('text=Cálculos realizados con éxito')).toBeVisible();

    // Validate calculations columns are visible
    await expect(page.locator('text=Costo Total/h')).toBeVisible();
    await expect(page.locator('text=Tarifa Renta/h')).toBeVisible();
  });
});
