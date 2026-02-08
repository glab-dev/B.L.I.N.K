import { test, expect } from '../../fixtures/base';
import { AppHelpers } from '../../helpers/app-helpers';

/**
 * Feature Test: Power Configuration
 * Tests power basis toggle, phase selection, voltage, breaker, max panels per circuit
 */
test.describe('Power Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 8, 6);
  });

  test('should toggle between Max and Avg power basis @critical', async ({
    page,
    power,
  }) => {
    // Default should be Max
    await expect(power.powerMaxBtn).toHaveClass(/active/);

    // Switch to Avg
    await power.setPowerType('avg');
    await expect(power.powerAvgBtn).toHaveClass(/active/);
    await expect(power.powerMaxBtn).not.toHaveClass(/active/);

    // Switch back to Max
    await power.setPowerType('max');
    await expect(power.powerMaxBtn).toHaveClass(/active/);
    await expect(power.powerAvgBtn).not.toHaveClass(/active/);
  });

  test('should toggle between 3-phase and 1-phase @critical', async ({
    page,
    power,
  }) => {
    // Default should be 3-phase
    await expect(power.phase3Btn).toHaveClass(/active/);

    // Switch to 1-phase
    await power.setPhase(1);
    await expect(power.phase1Btn).toHaveClass(/active/);
    await expect(power.phase3Btn).not.toHaveClass(/active/);

    // Switch back to 3-phase
    await power.setPhase(3);
    await expect(power.phase3Btn).toHaveClass(/active/);
    await expect(power.phase1Btn).not.toHaveClass(/active/);
  });

  test('should update voltage value @critical', async ({ page, power }) => {
    // Set voltage to 120
    await power.setVoltage(120);
    await expect(power.voltageInput).toHaveValue('120');

    // Set voltage to 240
    await power.setVoltage(240);
    await expect(power.voltageInput).toHaveValue('240');
  });

  test('should update breaker value @critical', async ({ page, power }) => {
    // Set breaker to 30
    await power.setBreaker(30);
    await expect(power.breakerInput).toHaveValue('30');

    // Set breaker to 15
    await power.setBreaker(15);
    await expect(power.breakerInput).toHaveValue('15');
  });

  test('should update max panels per circuit', async ({ page, power }) => {
    // Set max panels per circuit
    await power.setMaxPanelsPerCircuit(10);
    await expect(power.maxPanelsPerCircuitInput).toHaveValue('10');

    await power.setMaxPanelsPerCircuit(5);
    await expect(power.maxPanelsPerCircuitInput).toHaveValue('5');
  });

  test('should render power layout canvas after configuration @critical', async ({
    page,
    power,
  }) => {
    // In Complex mode, all layout canvases are visible on the same page
    // Power canvas should be visible (scroll into view if needed)
    const powerCanvas = page.locator('#powerCanvas');
    await powerCanvas.scrollIntoViewIfNeeded();
    await expect(powerCanvas).toBeVisible();

    // Canvas should have content
    const hasContent = await powerCanvas.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext('2d');
      if (!ctx) return false;
      const imageData = ctx.getImageData(0, 0, el.width, el.height);
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) return true;
      }
      return false;
    });
    expect(hasContent).toBe(true);
  });

  test('should recalculate when switching from 3-phase to 1-phase', async ({
    page,
    power,
  }) => {
    // Get results text with 3-phase
    await power.setPhase(3);
    await page.waitForTimeout(300);
    const results3Phase = await page.locator('#results').textContent();

    // Switch to 1-phase — results should change
    await power.setPhase(1);
    await page.waitForTimeout(300);
    const results1Phase = await page.locator('#results').textContent();

    // Results should differ between phase configurations
    expect(results3Phase).not.toBe(results1Phase);
  });

  test('should recalculate when changing voltage', async ({ page, power }) => {
    // Get results with default voltage (208)
    await page.waitForTimeout(300);
    const results208 = await page.locator('#results').textContent();

    // Change to 120V
    await power.setVoltage(120);
    await page.waitForTimeout(300);
    const results120 = await page.locator('#results').textContent();

    // Results should differ
    expect(results208).not.toBe(results120);
  });
});
