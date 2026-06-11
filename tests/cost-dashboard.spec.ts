import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dict from '../lib/dictionaries/es.json';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Use the unique worker index to prevent database conflicts during parallel execution
const workerIndex = process.env.TEST_WORKER_INDEX || '0';
const TEST_MACHINE_NAME = `EXCAVADORA E2E TEST ${workerIndex}`;
const TEST_MACHINE_CODE = `EX-E2E-99-${workerIndex}`;

test.describe('Machinery Cost Dashboard E2E', () => {
  test.beforeAll(async () => {
    if (serviceRoleKey) {
      // 1. Clean up first to avoid duplicate keys if a previous test run crashed/interrupted
      await supabaseAdmin
        .from('machinery')
        .delete()
        .eq('external_code', TEST_MACHINE_CODE);

      // 2. Insert our dedicated test machine record
      const { error } = await supabaseAdmin
        .from('machinery')
        .insert({
          machinery_name: TEST_MACHINE_NAME,
          machinery_full_name: TEST_MACHINE_NAME, // The UI displays machinery_full_name, so set this accordingly
          external_code: TEST_MACHINE_CODE,
          is_rented: false,
        });

      if (error) {
        console.error(`Error seeding E2E test machine for worker ${workerIndex}:`, error);
      }
    }
  });

  test.afterAll(async () => {
    if (serviceRoleKey) {
      // 3. Clean up the database by deleting the test machine
      await supabaseAdmin
        .from('machinery')
        .delete()
        .eq('external_code', TEST_MACHINE_CODE);
    }
  });

  test.beforeEach(async ({ page }) => {
    // 4. Perform a real login to establish authentic session cookies from Supabase emulator
    await page.goto('/login');
    const email = process.env.TEST_USER_EMAIL || 'admin@hivaco.com';
    const password = process.env.TEST_USER_PASSWORD || 'password123';
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app');
  });

  test('should render cost aggregates and tables correctly', async ({ page }) => {
    // 5. Assert title of the page is visible (from dictionary translation)
    await expect(page.locator('h1')).toContainText(dict.admin.machinery_cost.title);

    // Assert that our newly seeded test machine is visible in the row list
    await expect(page.locator(`text=${TEST_MACHINE_NAME}`)).toBeVisible();

    // Assert the "Calcular" action button exists (from dictionary translation)
    const calculateBtn = page.locator(`button:has-text("${dict.admin.machinery_cost.calculate}")`);
    await expect(calculateBtn).toBeVisible();

    // Click to execute mathematical cost distribution formulas
    await calculateBtn.click();

    // Assert the toast message indicating successful calculations appears
    // (This string is currently hardcoded in the codebase component, so we keep it literal here)
    await expect(page.locator('text=Cálculos realizados con éxito')).toBeVisible();

    // Wait for the table to be fully rendered and populated
    await expect(page.locator('table')).toBeVisible();

    // Validate calculations columns are visible (using dictionary translations and scroll to fit viewports)
    const totalCostHeader = page.getByText(dict.admin.machinery_cost.total_cost_hr);
    await totalCostHeader.scrollIntoViewIfNeeded();
    await expect(totalCostHeader).toBeVisible();

    const rentRateHeader = page.getByText(dict.admin.machinery_cost.rent_rate_hr);
    await rentRateHeader.scrollIntoViewIfNeeded();
    await expect(rentRateHeader).toBeVisible();
  });
});
