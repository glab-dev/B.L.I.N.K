import { test, expect } from '../fixtures/base';
import { AppHelpers } from '../helpers/app-helpers';

/**
 * Comprehensive Test: NovaStar MX40 Pro Mode & All Processors
 * Tests NovaStar MX40 Direct/Indirect mode toggle and iterates through all processors.
 */
test.describe('NovaStar MX40 Pro & All Processors @comprehensive @desktop', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 8, 6);
  });

  test('should show MX40 mode toggle when NovaStar MX40 Pro selected', async ({ page, data }) => {
    await data.processorSelect.selectOption('NovaStar_MX40_Pro');
    await page.waitForTimeout(300);
    await expect(page.locator('#mx40ModeToggleRow')).toBeVisible();
    await expect(page.locator('#mx40DirectBtn')).toHaveClass(/active/);
  });

  test('should hide MX40 mode toggle for non-MX40 processors', async ({ page, data }) => {
    await data.processorSelect.selectOption('NovaStar_MX40_Pro');
    await page.waitForTimeout(300);
    await expect(page.locator('#mx40ModeToggleRow')).toBeVisible();

    await data.processorSelect.selectOption('Brompton_SX40');
    await page.waitForTimeout(300);
    await expect(page.locator('#mx40ModeToggleRow')).not.toBeVisible();
  });

  test('should switch between Direct and Indirect modes', async ({ page, data }) => {
    await data.processorSelect.selectOption('NovaStar_MX40_Pro');
    await page.waitForTimeout(300);

    // Switch to Indirect
    await page.locator('#mx40IndirectBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#mx40IndirectBtn')).toHaveClass(/active/);
    await expect(page.locator('#mx40DirectBtn')).not.toHaveClass(/active/);

    // Switch back to Direct
    await page.locator('#mx40DirectBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#mx40DirectBtn')).toHaveClass(/active/);
    await expect(page.locator('#mx40IndirectBtn')).not.toHaveClass(/active/);
  });

  test('should recalculate when switching MX40 modes', async ({ page, data }) => {
    await data.processorSelect.selectOption('NovaStar_MX40_Pro');
    await page.waitForTimeout(500);
    const resultsDirect = await page.locator('#results').textContent();

    await page.locator('#mx40IndirectBtn').click();
    await page.waitForTimeout(500);
    const resultsIndirect = await page.locator('#results').textContent();

    expect(resultsDirect).not.toBe(resultsIndirect);
  });

  test('should iterate through all processors without errors', async ({ page, data }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const processors = [
      'Brompton_SX40', 'Brompton_S8', 'Brompton_M2',
      'Brompton_S4', 'Brompton_T1', 'Brompton_SQ200',
      'NovaStar_MX40_Pro',
    ];

    for (const processor of processors) {
      await data.processorSelect.selectOption(processor);
      await page.waitForTimeout(500);

      // Results should be visible and non-empty
      const resultsText = await page.locator('#results').textContent();
      expect(resultsText!.length).toBeGreaterThan(0);
    }

    expect(consoleErrors).toHaveLength(0);
  });

  test('should iterate through all frame rates and bit depths', async ({ page, data }) => {
    const frameRates = ['24', '25', '30', '50', '60'];
    const bitDepths = ['8', '10', '12'];

    for (const fr of frameRates) {
      await data.frameRateSelect.selectOption(fr);
      await page.waitForTimeout(200);
      await expect(data.frameRateSelect).toHaveValue(fr);
    }

    for (const bd of bitDepths) {
      await data.bitDepthSelect.selectOption(bd);
      await page.waitForTimeout(200);
      await expect(data.bitDepthSelect).toHaveValue(bd);
    }
  });
});
