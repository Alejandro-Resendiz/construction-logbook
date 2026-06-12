import { test, expect } from '@playwright/test';
import dict from '../lib/dictionaries/es.json';

test.describe('MVP Banner and XLSX Disablement E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Perform a real login to establish authentic session cookies from Supabase emulator
    await page.goto('/login');
    const email = process.env.TEST_USER_EMAIL || 'admin@hivaco.com';
    const password = process.env.TEST_USER_PASSWORD || 'password123';
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app');
  });

  test('should render the MVP banner app-wide with correct dictionary message', async ({ page }) => {
    const banner = page.locator(`text=${dict.banner.mvp.message}`);
    await expect(banner).toBeVisible();
  });

  test('should render the dashboard title', async ({ page }) => {
    await page.goto('/app/logbook', { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toContainText(dict.admin.dashboard_title);
  });

  test('should disable Excel export and display premium tooltip', async ({ page }) => {
    // Go to the machinery logbook dashboard
    await page.goto('/app/logbook', { waitUntil: 'networkidle' });

    // Wait for the dashboard title to be visible to ensure page is loaded
    await expect(page.locator('h1')).toContainText(dict.admin.dashboard_title);

    // Select the first machinery options to render export buttons
    const selectLabel = dict.admin.select_machine;
    const select = page.locator(`select:has-previous-sibling(label:has-text("${selectLabel}"))`);
    
    // In case sibling selector is tricky, we can select by option count or content
    const machineSelect = page.locator('select').first();
    await expect(machineSelect).toBeVisible();
    
    // Select the first available option (excluding the placeholder)
    const options = await machineSelect.locator('option').all();
    if (options.length > 1) {
      const val = await options[1].getAttribute('value');
      if (val) {
        await machineSelect.selectOption(val);
      }
    }

    // Excel button must be disabled
    const excelButton = page.getByRole('button', { name: dict.admin.export_excel });
    await expect(excelButton).toBeVisible();
    await expect(excelButton).toBeDisabled();

    // Verify tooltip contains the premium text
    const tooltipText = page.getByText(dict.feature.xlsx.premium.tooltip);
    await expect(tooltipText).toBeAttached();
  });

  test('should disable CSV export on main dashboard and display premium tooltip', async ({ page }) => {
    // Go to the main dashboard
    await page.goto('/app');

    // Click on the "Calcular" button to reveal the export button
    const calculateBtn = page.getByRole('button', { name: dict.admin.machinery_cost.calculate });
    await expect(calculateBtn).toBeVisible();
    await calculateBtn.click();

    // Now, the Export CSV button should be rendered (disabled)
    const csvButton = page.getByRole('button', { name: dict.admin.machinery_cost.export });
    await expect(csvButton).toBeVisible();
    await expect(csvButton).toBeDisabled();

    // Verify CSV premium tooltip
    const csvTooltipText = page.getByText(dict.feature.csv.premium.tooltip);
    await expect(csvTooltipText).toBeAttached();
  });
});
