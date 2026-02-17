import { test, expect } from '../fixtures/base';
import { AppHelpers } from '../helpers/app-helpers';

/**
 * Comprehensive Test: Panel Type Cascading Effects
 * Tests panel type selection effects: CB5 half row, connecting plates, DM2.6 behavior,
 * BM4 auto-floor, placeholder updates on panel change.
 */
test.describe('Panel Type Cascading Effects @comprehensive @desktop', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupApp(page, 'complex');
  });

  test('should iterate through all panel types without errors', async ({ page, dimensions }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const panelTypes = [
      'BP2_V2', 'CB5_MKII', 'CB5_MKII_HALF', 'MC7H',
      'BO3', 'BM4_MATTE', 'DM2_6', 'INFILED_AMT8_3',
    ];

    for (const panel of panelTypes) {
      await dimensions.panelTypeSelect.selectOption(panel);
      await page.waitForTimeout(300);
      await dimensions.setPanelCount(4, 3);

      // Results should be visible and non-empty
      const resultsText = await page.locator('#results').textContent();
      expect(resultsText!.length).toBeGreaterThan(0);
    }

    // No console errors should have occurred
    expect(consoleErrors).toHaveLength(0);
  });

  test('should show CB5 half panel row toggle when CB5 MKII selected', async ({ page, dimensions }) => {
    await dimensions.panelTypeSelect.selectOption('CB5_MKII');
    await page.waitForTimeout(300);
    await dimensions.setPanelCount(5, 4);

    await expect(page.locator('#cb5HalfPanelToggle')).toBeVisible();
    await expect(page.locator('#addCB5HalfRowBtn')).toBeVisible();
  });

  test('should toggle CB5 half panel row on and off', async ({ page, dimensions }) => {
    await dimensions.panelTypeSelect.selectOption('CB5_MKII');
    await page.waitForTimeout(300);
    await dimensions.setPanelCount(5, 4);

    const btn = page.locator('#addCB5HalfRowBtn');
    // Toggle on
    await btn.click();
    await page.waitForTimeout(300);
    await expect(btn).toHaveClass(/active/);

    // Toggle off
    await btn.click();
    await page.waitForTimeout(300);
    await expect(btn).not.toHaveClass(/active/);
  });

  test('should hide CB5 half panel toggle for non-CB5 panels', async ({ page, dimensions }) => {
    await dimensions.panelTypeSelect.selectOption('MC7H');
    await page.waitForTimeout(300);
    await dimensions.setPanelCount(4, 3);

    await expect(page.locator('#cb5HalfPanelToggle')).not.toBeVisible();
  });

  test('should show connecting plates choice for CB5 MKII', async ({ page, dimensions }) => {
    await dimensions.panelTypeSelect.selectOption('CB5_MKII');
    await page.waitForTimeout(300);
    await dimensions.setPanelCount(5, 4);

    await expect(page.locator('#connectingPlatesSection')).toBeVisible();
    await expect(page.locator('#cb5ConnectionChoice')).toBeVisible();
    // Default should be Air Frame
    await expect(page.locator('#connectionAirframeBtn')).toHaveClass(/active/);
  });

  test('should switch between Air Frame and Plates for CB5', async ({ page, dimensions }) => {
    await dimensions.panelTypeSelect.selectOption('CB5_MKII');
    await page.waitForTimeout(300);
    await dimensions.setPanelCount(5, 4);

    // Switch to Plates
    await page.locator('#connectionPlatesBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#connectionPlatesBtn')).toHaveClass(/active/);
    await expect(page.locator('#connectionAirframeBtn')).not.toHaveClass(/active/);

    // Switch back to Air Frame
    await page.locator('#connectionAirframeBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#connectionAirframeBtn')).toHaveClass(/active/);
  });

  test('should show DM2.6 connecting plates info (not choice)', async ({ page, dimensions }) => {
    await dimensions.panelTypeSelect.selectOption('DM2_6');
    await page.waitForTimeout(300);
    await dimensions.setPanelCount(4, 3);

    await expect(page.locator('#connectingPlatesSection')).toBeVisible();
    await expect(page.locator('#dm26ConnectionInfo')).toBeVisible();
    await expect(page.locator('#cb5ConnectionChoice')).not.toBeVisible();
  });

  test('should hide connecting plates for BP2 V2', async ({ page, dimensions }) => {
    await dimensions.panelTypeSelect.selectOption('BP2_V2');
    await page.waitForTimeout(300);
    await dimensions.setPanelCount(4, 3);

    await expect(page.locator('#connectingPlatesSection')).not.toBeVisible();
  });

  test('should auto-set structure to Floor for BM4 Matte', async ({ page, dimensions, structure }) => {
    await dimensions.panelTypeSelect.selectOption('BM4_MATTE');
    await page.waitForTimeout(300);
    await dimensions.setPanelCount(4, 3);

    await expect(structure.structureTypeSelect).toHaveValue('floor');
  });

  test('should update Max/Circuit placeholder when panel type changes', async ({ page, dimensions }) => {
    await dimensions.panelTypeSelect.selectOption('BP2_V2');
    await page.waitForTimeout(300);
    await dimensions.setPanelCount(8, 6);

    const placeholder1 = await page.locator('#maxPanelsPerCircuit').getAttribute('placeholder');

    await dimensions.panelTypeSelect.selectOption('INFILED_AMT8_3');
    await page.waitForTimeout(500);

    const placeholder2 = await page.locator('#maxPanelsPerCircuit').getAttribute('placeholder');

    // Different panels have different power draws, so placeholder should differ
    expect(placeholder1).not.toBe(placeholder2);
  });

  test('should update Max/Data placeholder when panel type changes', async ({ page, dimensions }) => {
    await dimensions.panelTypeSelect.selectOption('BP2_V2');
    await page.waitForTimeout(300);
    await dimensions.setPanelCount(8, 6);

    const placeholder1 = await page.locator('#maxPanelsPerData').getAttribute('placeholder');

    await dimensions.panelTypeSelect.selectOption('CB5_MKII');
    await page.waitForTimeout(500);

    const placeholder2 = await page.locator('#maxPanelsPerData').getAttribute('placeholder');

    // Different panels have different pixel counts, so placeholder should differ
    expect(placeholder1).not.toBe(placeholder2);
  });
});
