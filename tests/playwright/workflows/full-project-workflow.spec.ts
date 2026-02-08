import { test, expect } from '../fixtures/base';
import { CanvasHelpers } from '../helpers/canvas-helpers';
import { AppHelpers } from '../helpers/app-helpers';

/**
 * Workflow Test: Full Project Workflow
 * Tests complete multi-screen project creation, configuration, and export
 */
test.describe('Full Project Workflow', () => {
  test.beforeEach(async ({ page, clearLocalStorage }) => {
    // clearLocalStorage uses addInitScript to clear on first navigation
    await AppHelpers.setupApp(page);
  });

  test('should create multi-screen project (main + 2 IMAGs) @critical @desktop', async ({
    page,
    dimensions,
    structure,
    navigation,
  }) => {
    // STEP 1: Configure Main Screen (16x9 hanging)
    await dimensions.setDimensionMode('panels');
    await dimensions.setPanelCount(16, 9);
    await structure.setStructureType('hanging');
    await structure.toggleBumpers(true);
    await page.waitForTimeout(300);

    // Verify calculation results
    await expect(page.locator('#results')).toContainText('16 × 9 panels');

    // STEP 2: Add Left IMAG Screen
    const addScreenBtn = page.locator('#screenAddBtn');
    await addScreenBtn.click();
    await page.waitForTimeout(300);

    // Configure Left IMAG (8x6 hanging)
    await dimensions.setPanelCount(8, 6);
    await structure.setStructureType('hanging');
    await structure.toggleBumpers(true);
    await page.waitForTimeout(300);

    await expect(page.locator('#results')).toContainText('8 × 6 panels');

    // STEP 3: Add Right IMAG Screen
    await addScreenBtn.click();
    await page.waitForTimeout(300);

    // Configure Right IMAG (8x6 hanging)
    await dimensions.setPanelCount(8, 6);
    await structure.setStructureType('hanging');
    await structure.toggleBumpers(true);
    await page.waitForTimeout(300);

    // Verify 3 screens total (scope to screenTabsContainer to exclude canvas tabs)
    const screenTabs = page.locator('#screenTabsContainer .screen-tab');
    await expect(screenTabs).toHaveCount(3);

    // STEP 4: Navigate to Canvas View
    await navigation.switchToCanvas();
    await page.waitForTimeout(500);

    // Verify canvas view loaded
    const canvasElement = page.locator('#canvasView');
    await expect(canvasElement).toBeVisible();

    // STEP 5: Navigate to Combined View
    await navigation.switchToCombined();
    await page.waitForTimeout(500);

    const combinedCanvas = page.locator('#combinedStandardCanvas');
    await expect(combinedCanvas).toBeVisible();

    // Verify combined canvas has content
    const hasContent = await CanvasHelpers.isCanvasDrawn(combinedCanvas);
    expect(hasContent).toBe(true);

    // STEP 6: Navigate to Gear List
    await navigation.switchToGear();
    await page.waitForTimeout(500);

    const gearList = page.locator('#gearListContent');
    await expect(gearList).toBeVisible();

    // Verify gear list has items
    const gearText = await gearList.textContent();
    expect(gearText).toBeTruthy();
    expect(gearText!.length).toBeGreaterThan(0);

    // Should contain bumpers (all 3 screens use hanging)
    expect(gearText).toContain('Bumper');

    // STEP 7: Verify Complex mode (all layouts visible)
    await navigation.switchToComplex();
    await page.waitForTimeout(500);

    const standardCanvas = page.locator('#standardCanvas');
    await expect(standardCanvas).toBeVisible();

    const standardDrawn = await CanvasHelpers.isCanvasDrawn(standardCanvas);
    expect(standardDrawn).toBe(true);

    // In Complex mode, power/data/structure canvases are all visible
    const powerCanvas = page.locator('#powerCanvas');
    await powerCanvas.scrollIntoViewIfNeeded();
    await expect(powerCanvas).toBeVisible();

    const dataCanvas = page.locator('#dataCanvas');
    await dataCanvas.scrollIntoViewIfNeeded();
    await expect(dataCanvas).toBeVisible();

    const structureCanvas = page.locator('#structureCanvas');
    await structureCanvas.scrollIntoViewIfNeeded();
    await expect(structureCanvas).toBeVisible();

    // SUCCESS: Full workflow completed
    // All 3 screens created, configured, and all views render correctly
  });

  test('should switch between screens and preserve data @desktop', async ({
    page,
    dimensions,
  }) => {
    // Create 3 screens with different configs
    await dimensions.setPanelCount(10, 10);

    const addScreenBtn = page.locator('#screenAddBtn');
    await addScreenBtn.click();
    await page.waitForTimeout(200);
    await dimensions.setPanelCount(16, 9);

    await addScreenBtn.click();
    await page.waitForTimeout(200);
    await dimensions.setPanelCount(20, 8);

    // Switch back to screen 1 (scope to screenTabsContainer to exclude canvas tabs)
    const screenTabs = page.locator('#screenTabsContainer .screen-tab');
    await screenTabs.nth(0).click();
    await page.waitForTimeout(200);

    // Verify data preserved
    await expect(dimensions.panelsWideInput).toHaveValue('10');
    await expect(dimensions.panelsHighInput).toHaveValue('10');

    // Switch to screen 2
    await screenTabs.nth(1).click();
    await page.waitForTimeout(200);

    await expect(dimensions.panelsWideInput).toHaveValue('16');
    await expect(dimensions.panelsHighInput).toHaveValue('9');

    // Switch to screen 3
    await screenTabs.nth(2).click();
    await page.waitForTimeout(200);

    await expect(dimensions.panelsWideInput).toHaveValue('20');
    await expect(dimensions.panelsHighInput).toHaveValue('8');
  });
});
