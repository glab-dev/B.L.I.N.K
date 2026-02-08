import { test, expect } from '../../fixtures/base';
import { AppHelpers } from '../../helpers/app-helpers';

/**
 * Feature Test: Structure Types
 * Tests hanging, ground support, and floor configurations
 */
test.describe('Structure Types', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupApp(page);
  });

  test('should configure hanging structure with bumpers @critical @desktop', async ({
    page,
    dimensions,
    structure,
    navigation,
  }) => {
    // Configure basic screen
    await dimensions.setDimensionMode('panels');
    await dimensions.setPanelCount(10, 10);

    // Set to hanging
    await structure.setStructureType('hanging');

    // Enable bumpers
    await structure.toggleBumpers(true);

    // Navigate to structure view (already in complex mode, just scroll)
    const structureCanvas = page.locator('#structureCanvas');
    await structureCanvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Verify structure layout canvas
    await expect(structureCanvas).toBeVisible();

    // Verify results show bumper weight info
    const results = page.locator('#results');
    const text = await results.textContent();
    expect(text).toContain('Bumper');

    // Navigate to gear list
    await navigation.switchToGear();
    await page.waitForTimeout(500);

    // Verify bumpers in gear list
    const gearList = page.locator('#gearListContent');
    const gearText = await gearList.textContent();
    expect(gearText).toContain('Bumper');
  });

  test('should configure ground support structure @desktop', async ({
    page,
    dimensions,
    structure,
    navigation,
  }) => {
    // Configure basic screen
    await dimensions.setDimensionMode('panels');
    await dimensions.setPanelCount(20, 8);

    // Set to ground support
    await structure.setStructureType('ground');

    // Enable bumpers
    await structure.toggleBumpers(true);

    // Navigate to gear list
    await navigation.switchToGear();
    await page.waitForTimeout(500);

    // Verify ground support hardware in gear list
    const gearList = page.locator('#gearListContent');
    const gearText = await gearList.textContent();

    // Ground support should include bumpers at bottom
    expect(gearText).toContain('Bumper');
  });

  test('should configure floor structure with frames @desktop', async ({
    page,
    dimensions,
    structure,
    navigation,
  }) => {
    // Select BM4 floor panel (floor frames only work with floor panels)
    // Use value-based selection — more reliable than label-based
    await dimensions.panelTypeSelect.selectOption('BM4_MATTE');
    await page.waitForTimeout(300);
    await page.waitForTimeout(300);

    // Configure screen
    await dimensions.setDimensionMode('panels');
    await dimensions.setPanelCount(6, 4);

    // BM4 should auto-set to floor, but explicitly set it
    await structure.setStructureType('floor');
    await page.waitForTimeout(300);

    // Navigate to gear list
    await navigation.switchToGear();
    await page.waitForTimeout(500);

    // Verify floor frames in gear list
    const gearList = page.locator('#gearListContent');
    const gearText = await gearList.textContent();

    // Should contain floor frames
    expect(gearText).toContain('Frame');
  });

  test('should switch between hanging and ground structure @desktop', async ({
    page,
    dimensions,
    structure,
    navigation,
  }) => {
    await dimensions.setDimensionMode('panels');
    await dimensions.setPanelCount(10, 10);

    // Start with hanging
    await structure.setStructureType('hanging');
    await structure.toggleBumpers(true);
    await page.waitForTimeout(300);

    await navigation.switchToGear();
    await page.waitForTimeout(500);

    let gearText = await page.locator('#gearListContent').textContent();
    expect(gearText).toContain('Bumper');

    // Switch to ground
    await navigation.switchToComplex();
    await page.waitForTimeout(300);
    await structure.setStructureType('ground');
    await page.waitForTimeout(300);

    await navigation.switchToGear();
    await page.waitForTimeout(500);

    gearText = await page.locator('#gearListContent').textContent();
    expect(gearText).toContain('Bumper'); // Ground also uses bumpers
  });

  test('should toggle 4-way bumpers (CB5 only) @desktop', async ({
    page,
    dimensions,
    structure,
  }) => {
    // Select CB5 panel (supports 4-way bumpers)
    // Use value-based selection — more reliable than label-based
    await dimensions.panelTypeSelect.selectOption('CB5_MKII');
    await page.waitForTimeout(300);
    await page.waitForTimeout(300);

    await dimensions.setDimensionMode('panels');
    await dimensions.setPanelCount(10, 10);

    // Set to hanging with bumpers
    await structure.setStructureType('hanging');
    await structure.toggleBumpers(true);
    await page.waitForTimeout(300);

    // Toggle 4-way bumpers (should be visible for CB5)
    await structure.toggle4WayBumpers(true);
    await page.waitForTimeout(300);

    // Verify calculations updated (4-way distributes differently)
    const results = page.locator('#results');
    await expect(results).toBeVisible();

    // Toggle back to 2-way
    await structure.toggle4WayBumpers(false);
    await page.waitForTimeout(300);

    await expect(results).toBeVisible();
  });
});
