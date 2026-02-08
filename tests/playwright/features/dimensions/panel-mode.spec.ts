import { test, expect } from '../../fixtures/base';
import { CanvasHelpers } from '../../helpers/canvas-helpers';
import { AppHelpers } from '../../helpers/app-helpers';

/**
 * Feature Test: Dimensions - Panel Mode
 * Tests panel count input and calculations
 */
test.describe('Dimensions - Panel Mode', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupApp(page);
  });

  test('should set panel count and calculate dimensions @critical @desktop', async ({
    page,
    dimensions,
  }) => {
    // Set to panel mode
    await dimensions.setDimensionMode('panels');

    // Set 10x10 panels
    await dimensions.setPanelCount(10, 10);

    // Verify results appear with dimension info
    const results = page.locator('#results');
    await expect(results).toBeVisible();
    await expect(results).toContainText('10 × 10 panels');

    // Verify canvas renders
    const standardCanvas = page.locator('#standardCanvas');
    await expect(standardCanvas).toBeVisible();

    // Verify canvas has content
    await CanvasHelpers.waitForCanvasRender(standardCanvas);
    const isDrawn = await CanvasHelpers.isCanvasDrawn(standardCanvas);
    expect(isDrawn).toBe(true);
  });

  test('should respect aspect ratio lock 16:9 @desktop @mobile', async ({
    page,
    dimensions,
  }) => {
    await dimensions.setDimensionMode('panels');
    await dimensions.setAspectRatio('16:9');

    // Set width to 16
    await dimensions.panelsWideInput.fill('16');
    await dimensions.panelsWideInput.blur();
    await page.waitForTimeout(300);

    // Height should auto-calculate to 9
    await expect(dimensions.panelsHighInput).toHaveValue('9');

    // Change width to 32
    await dimensions.panelsWideInput.fill('32');
    await dimensions.panelsWideInput.blur();
    await page.waitForTimeout(300);

    // Height should auto-calculate to 18
    await expect(dimensions.panelsHighInput).toHaveValue('18');
  });

  test('should respect aspect ratio lock 4:3 @desktop', async ({
    page,
    dimensions,
  }) => {
    await dimensions.setDimensionMode('panels');
    await dimensions.setAspectRatio('4:3');

    // Set width to 12
    await dimensions.panelsWideInput.fill('12');
    await dimensions.panelsWideInput.blur();
    await page.waitForTimeout(300);

    // Height should auto-calculate to 9
    await expect(dimensions.panelsHighInput).toHaveValue('9');
  });

  test('should handle custom aspect ratio @desktop', async ({
    page,
    dimensions,
  }) => {
    await dimensions.setDimensionMode('panels');
    await dimensions.setCustomAspectRatio(21, 9); // Ultrawide

    await dimensions.panelsWideInput.fill('21');
    await dimensions.panelsWideInput.blur();
    await page.waitForTimeout(300);

    await expect(dimensions.panelsHighInput).toHaveValue('9');
  });

  test('should switch between imperial and metric units @desktop', async ({
    page,
    dimensions,
  }) => {
    await dimensions.setDimensionMode('panels');
    await dimensions.setPanelCount(10, 10);

    // Check imperial (default)
    const resultsImperial = await page.locator('#results').textContent();
    expect(resultsImperial).toContain('ft');

    // Switch to metric
    await dimensions.setUnitSystem('metric');

    const resultsMetric = await page.locator('#results').textContent();
    expect(resultsMetric).toContain('m');
    expect(resultsMetric).not.toContain('ft');
  });

  test('should handle large panel counts @desktop', async ({
    page,
    dimensions,
  }) => {
    await dimensions.setDimensionMode('panels');
    await dimensions.setPanelCount(32, 18); // 576 panels

    // Verify results
    await expect(page.locator('#results')).toContainText('32 × 18 panels');

    // Verify canvas renders (may take longer for large configs)
    const standardCanvas = page.locator('#standardCanvas');
    await page.waitForTimeout(2000); // Allow extra time for large render

    const isDrawn = await CanvasHelpers.isCanvasDrawn(standardCanvas);
    expect(isDrawn).toBe(true);
  });
});
