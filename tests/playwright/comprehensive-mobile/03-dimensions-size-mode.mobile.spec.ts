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

  test('should show panel, wall size and pixel inputs together', async ({ dimensions }) => {
    // v2.11.199 removed the Panels / Size / Pixels mode toggle — all three groups render
    // at once, so none of them is ever hidden.
    await expect(dimensions.panelsWideInput).toBeVisible();
    await expect(dimensions.panelsHighInput).toBeVisible();
    await expect(dimensions.wallWidthInput).toBeVisible();
    await expect(dimensions.wallHeightInput).toBeVisible();
    await expect(dimensions.pixelsWideInput).toBeVisible();
    await expect(dimensions.pixelsHighInput).toBeVisible();
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

  test('should derive the panel counts from the wall size', async ({ page, dimensions }) => {
    // Typing a wall size snaps the panel counts to whole panels (syncFromSize).
    await dimensions.setWallSize(10, 8);
    await page.waitForTimeout(300);
    const wide = await dimensions.panelsWideInput.inputValue();
    const high = await dimensions.panelsHighInput.inputValue();
    expect(Number(wide)).toBeGreaterThan(0);
    expect(Number(high)).toBeGreaterThan(0);
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
    // setPanelCount fills width then height, so HEIGHT is the last field typed and becomes
    // the lock's anchor — the ratio re-derives the width and holds the height. (The desktop
    // spec covers the mirror case, where width is typed last and the height re-derives.)
    await dimensions.setPanelCount(8, 4);

    // Scroll aspect ratio into view on mobile
    await dimensions.aspectRatio169Btn.scrollIntoViewIfNeeded();

    // Set 16:9
    await dimensions.setAspectRatio('16:9');
    await page.waitForTimeout(300);
    const wide169 = await dimensions.panelsWideInput.inputValue();

    // Set 4:3
    await dimensions.setAspectRatio('4:3');
    await page.waitForTimeout(300);
    const wide43 = await dimensions.panelsWideInput.inputValue();

    // Different aspect ratios should yield different widths for the same height
    expect(wide169).not.toBe(wide43);
    await expect(dimensions.panelsHighInput).toHaveValue('4');
  });

  test('should show custom aspect ratio inputs', async ({ page, dimensions }) => {
    await dimensions.setAspectRatio('custom');
    await expect(dimensions.customARWidthInput).toBeVisible();
    await expect(dimensions.customARHeightInput).toBeVisible();
  });
});
