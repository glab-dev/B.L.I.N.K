import { test, expect } from '../fixtures/base';
import { AppHelpers } from '../helpers/app-helpers';
import { CanvasHelpers } from '../helpers/canvas-helpers';

/**
 * Comprehensive Test: Combined View
 * Tests combined view interactions: screen toggles, canvases, zoom, cabling, specs, gear list.
 */
test.describe('Combined View @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, navigation }) => {
    // Set up with 2 screens
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
    // Add second screen via evaluate (more reliable than clicking button)
    await page.evaluate('addNewScreen()');
    await page.waitForTimeout(300);
    await page.locator('#panelsWide').fill('3');
    await page.locator('#panelsHigh').fill('2');
    await page.locator('#panelsHigh').blur();
    await page.waitForTimeout(500);

    await navigation.switchToCombined();
    await page.waitForTimeout(500);

    // Screens start unselected — select all so combined view renders
    await page.evaluate(() => {
      Object.keys(screens).forEach(id => {
        if (!combinedSelectedScreens.has(id)) {
          toggleCombinedScreen(id);
        }
      });
    });
    await page.waitForTimeout(500);
  });

  test('should display combined view with screen toggles', async ({ page }) => {
    await expect(page.locator('#combinedContainer')).toBeVisible();
    await expect(page.locator('#combinedScreenToggles')).toBeVisible();
    // Should have toggle buttons for screens
    const toggles = page.locator('#combinedScreenToggles button');
    const count = await toggles.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should render combined standard canvas', async ({ page }) => {
    const canvas = page.locator('#combinedStandardCanvas');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const drawn = await CanvasHelpers.isCanvasDrawn(canvas);
    expect(drawn).toBe(true);
  });

  test('should render combined power canvas', async ({ page }) => {
    const canvas = page.locator('#combinedPowerCanvas');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const drawn = await CanvasHelpers.isCanvasDrawn(canvas);
    expect(drawn).toBe(true);
  });

  test('should render combined data canvas', async ({ page }) => {
    const canvas = page.locator('#combinedDataCanvas');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const drawn = await CanvasHelpers.isCanvasDrawn(canvas);
    expect(drawn).toBe(true);
  });

  test('should render combined structure canvas', async ({ page }) => {
    const canvas = page.locator('#combinedStructureCanvas');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const drawn = await CanvasHelpers.isCanvasDrawn(canvas);
    expect(drawn).toBe(true);
  });

  test('should toggle screen visibility in combined view', async ({ page }) => {
    // Get the screen ID from the first toggle button
    const firstToggle = page.locator('#combinedScreenToggles button').first();
    const screenId = await firstToggle.getAttribute('data-screen-id');
    expect(screenId).toBeTruthy();

    // Screens are selected in beforeEach — verify it starts selected
    const startSelected = await page.evaluate(`combinedSelectedScreens.has('${screenId}')`);
    expect(startSelected).toBe(true);

    // Toggle OFF (deselect)
    await page.evaluate(`toggleCombinedScreen('${screenId}')`);
    await page.waitForTimeout(500);

    // Verify screen was removed from selection
    const isSelected = await page.evaluate(`combinedSelectedScreens.has('${screenId}')`);
    expect(isSelected).toBe(false);

    // Toggle back ON (re-select)
    await page.evaluate(`toggleCombinedScreen('${screenId}')`);
    await page.waitForTimeout(500);
    const isSelectedAgain = await page.evaluate(`combinedSelectedScreens.has('${screenId}')`);
    expect(isSelectedAgain).toBe(true);
  });

  test('should reset positions', async ({ page, combinedView }) => {
    await combinedView.resetPositions();
    // Should not error
    await page.waitForTimeout(300);
    const canvas = page.locator('#combinedStandardCanvas');
    const drawn = await CanvasHelpers.isCanvasDrawn(canvas);
    expect(drawn).toBe(true);
  });

  test('should toggle manual adjust mode', async ({ page, combinedView }) => {
    await combinedView.toggleManualAdjust(true);
    await expect(page.locator('#manualAdjustBtn')).toHaveClass(/active/);

    await combinedView.toggleManualAdjust(false);
    await expect(page.locator('#manualAdjustBtn')).not.toHaveClass(/active/);
  });

  test('should zoom combined view via input', async ({ page, combinedView }) => {
    await combinedView.setZoom(150);
    await expect(combinedView.zoomInput).toHaveValue('150');
  });

  test('should display combined cabling section', async ({ page }) => {
    await expect(page.locator('#combinedCablingContainer')).toBeVisible();
    // Combined cabling inputs should be present
    await expect(page.locator('#combinedCablingWallToFloor')).toBeVisible();
  });

  test('should display combined specs section', async ({ page }) => {
    const specsContainer = page.locator('#combinedSpecsContainer');
    await specsContainer.scrollIntoViewIfNeeded();
    await expect(specsContainer).toBeVisible();
    // Wait for specs content to be populated
    await page.waitForFunction(
      () => (document.getElementById('combinedSpecsContent')?.innerHTML.length ?? 0) > 0,
      null,
      { timeout: 5000 }
    );
    const html = await page.locator('#combinedSpecsContent').innerHTML();
    expect(html.length).toBeGreaterThan(0);
  });

  test('should toggle combined power type', async ({ page }) => {
    const avgBtn = page.locator('#combinedPowerAvgBtn');
    const maxBtn = page.locator('#combinedPowerMaxBtn');

    // Check if the buttons exist (they may be conditionally shown)
    if (await avgBtn.isVisible()) {
      await avgBtn.click();
      await page.waitForTimeout(200);
      await expect(avgBtn).toHaveClass(/active/);

      await maxBtn.click();
      await page.waitForTimeout(200);
      await expect(maxBtn).toHaveClass(/active/);
    }
  });

  test('should display combined gear list', async ({ page }) => {
    const gearContent = page.locator('#combinedGearListContent');
    await gearContent.scrollIntoViewIfNeeded();
    // Wait for gear list to be populated
    await page.waitForFunction(
      () => (document.getElementById('combinedGearListContent')?.innerHTML.length ?? 0) > 0,
      null,
      { timeout: 5000 }
    );
    const html = await gearContent.innerHTML();
    expect(html.length).toBeGreaterThan(0);
  });
});
