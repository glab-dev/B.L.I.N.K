import { test, expect } from '../fixtures/mobile-base';
import { AppHelpers } from '../helpers/app-helpers';

/**
 * Comprehensive Mobile Test: Dimensions -- Size Mode
 * Tests the Size dimension mode (wall width/height), unit switching, and aspect ratio in size mode.
 */
test.describe('Dimensions -- Size Mode @comprehensive @mobile', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupApp(page, 'complex');
  });

  test('should switch to Size mode and show wall size inputs', async ({ page, dimensions }) => {
    await dimensions.setDimensionMode('size');
    await expect(dimensions.wallWidthInput).toBeVisible();
    await expect(dimensions.wallHeightInput).toBeVisible();
  });

  test('should hide panel count inputs in Size mode', async ({ page, dimensions }) => {
    await dimensions.setDimensionMode('size');
    await expect(dimensions.panelsWideInput).not.toBeVisible();
    await expect(dimensions.panelsHighInput).not.toBeVisible();
  });

  test('should calculate panel count from wall dimensions', async ({ page, dimensions }) => {
    await dimensions.setDimensionMode('size');
    await dimensions.setWallSize(10, 8);
    await page.waitForTimeout(500);

    // Results should show calculated panels
    const results = await page.locator('#results').textContent();
    expect(results!.length).toBeGreaterThan(0);
    // Should contain dimension text (some form of W x H)
    expect(results).toMatch(/\u00d7/);
  });

  test('should switch back to Panels mode and show panel inputs', async ({ page, dimensions }) => {
    await dimensions.setDimensionMode('size');
    await dimensions.setDimensionMode('panels');
    await expect(dimensions.panelsWideInput).toBeVisible();
    await expect(dimensions.panelsHighInput).toBeVisible();
    await expect(dimensions.wallWidthInput).not.toBeVisible();
  });

  test('should show metric labels when metric selected', async ({ page, dimensions }) => {
    await dimensions.setDimensionMode('panels');
    await dimensions.setPanelCount(4, 3);

    await dimensions.setUnitSystem('metric');
    await page.waitForTimeout(300);
    const resultsMetric = await page.locator('#results').textContent();

    await dimensions.setUnitSystem('imperial');
    await page.waitForTimeout(300);
    const resultsImperial = await page.locator('#results').textContent();

    // Results should differ between unit systems
    expect(resultsMetric).not.toBe(resultsImperial);
  });

  test('should switch to Size mode with metric units', async ({ page, dimensions }) => {
    await dimensions.setUnitSystem('metric');
    await dimensions.setDimensionMode('size');
    await dimensions.setWallSize(3, 2);
    await page.waitForTimeout(500);

    const results = await page.locator('#results').textContent();
    expect(results!.length).toBeGreaterThan(0);
  });

  test('should apply aspect ratio buttons in Panels mode', async ({ page, dimensions }) => {
    await dimensions.setPanelCount(8, 4);

    // Scroll aspect ratio into view on mobile
    await dimensions.aspectRatio169Btn.scrollIntoViewIfNeeded();

    // Set 16:9
    await dimensions.setAspectRatio('16:9');
    await page.waitForTimeout(300);
    const high169 = await dimensions.panelsHighInput.inputValue();

    // Set 4:3
    await dimensions.setAspectRatio('4:3');
    await page.waitForTimeout(300);
    const high43 = await dimensions.panelsHighInput.inputValue();

    // Different aspect ratios should yield different heights for same width
    expect(high169).not.toBe(high43);
  });

  test('should show custom aspect ratio inputs', async ({ page, dimensions }) => {
    await dimensions.setAspectRatio('custom');
    await expect(dimensions.customARWidthInput).toBeVisible();
    await expect(dimensions.customARHeightInput).toBeVisible();
  });
});
