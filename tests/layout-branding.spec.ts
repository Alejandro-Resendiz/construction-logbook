import { test, expect } from '@playwright/test';
import dict from '../lib/dictionaries/es.json';

test.describe('Adaptive Layout and Branding E2E', () => {
  test.describe('Public (unauthenticated) routes', () => {
    test('should render MVP Banner visible on public layout', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByText(dict.banner.mvp.message)).toBeVisible();
    });

    test('should render Standard Footer at the bottom of the page', async ({ page }) => {
      await page.goto('/login');
      const footer = page.getByRole('contentinfo').last();
      await expect(footer).toBeVisible();
      await expect(footer).toContainText('Hecho con ♥ en México');
      await expect(footer).toContainText(process.env.NEXT_PUBLIC_BRAND_PUBLISHER || 'RMA');
    });
  });

  test.describe('Authenticated desktop layout', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      const email = process.env.TEST_USER_EMAIL || 'admin@hivaco.com';
      const password = process.env.TEST_USER_PASSWORD || 'password123';
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app');
    });

    test('should display sidebar with navigation, logout, and publisher', async ({ page }) => {
      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible();
      await expect(sidebar).toContainText(dict.admin.logout);
      await expect(sidebar).toContainText(process.env.NEXT_PUBLIC_BRAND_PUBLISHER || 'RMA');
    });
  });

  test.describe('Mobile authenticated layout', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      const email = process.env.TEST_USER_EMAIL || 'admin@hivaco.com';
      const password = process.env.TEST_USER_PASSWORD || 'password123';
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/app');
    });

    test('should open sidebar via hamburger and show logout and publisher', async ({ page }) => {
      await page.locator('button:has(svg.lucide-menu)').first().click();

      const sidebar = page.locator('aside').last();
      await expect(sidebar).toBeVisible();
      await expect(sidebar).toContainText(dict.admin.logout);
      await expect(sidebar).toContainText(process.env.NEXT_PUBLIC_BRAND_PUBLISHER || 'RMA');
    });
  });
});
