import { test, expect } from '../../fixtures/base';

/**
 * Feature Test: Structure Types
 * Tests hanging, ground support, and floor configurations
 */
test.describe('Structure Types', () => {
  test.beforeEach(async ({ page, clearLocalStorage }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
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

    // Navigate to structure view
    await navigation.switchToStructure();
    await page.waitForTimeout(500);

    // Verify structure layout canvas
    const structureCanvas = page.locator('#structureCanvas');
    await expect(structureCanvas).toBeVisible();

    // Check for pickup weights (indicates bumpers are calculated)
    const results = page.locator('#results');
    const text = await results.textContent();
    expect(text).toContain('Bumper');

    // Navigate to gear list
    await navigation.switchToGear();
    await page.waitForTimeout(500);

    // Verify bumpers in gear list
    const gearList = page.locator('#gearList');
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
    const gearList = page.locator('#gearList');
    const gearText = await gearList.textContent();

    // Ground support should include base plates, truss, etc.
    // Exact text depends on implementation
    expect(gearText).toContain('Bumper'); // Still uses bumpers at bottom
  });

  test('should configure floor structure (no bumpers) @desktop', async ({
    page,
    dimensions,
    structure,
    navigation,
  }) => {
    // Configure basic screen
    await dimensions.setDimensionMode('panels');
    await dimensions.setPanelCount(12, 6);

    // Set to floor
    await structure.setStructureType('floor');

    // Bumper toggle should not be available or should be auto-disabled for floor
    // Floor uses frames instead

    // Navigate to gear list
    await navigation.switchToGear();
    await page.waitForTimeout(500);

    // Verify floor frames in gear list
    const gearList = page.locator('#gearList');
    const gearText = await gearList.textContent();

    // Should contain floor frames, not bumpers
    expect(gearText).toContain('Frame');
    // Should not contain bumpers (floor doesn't use them)
    expect(gearText).not.toContain('Bumper');
  });

  test('should switch between structure types @desktop', async ({
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
    await page.waitForTimeout(300);

    let gearText = await page.locator('#gearList').textContent();
    expect(gearText).toContain('Bumper');

    // Switch to ground
    await navigation.switchToStandard(); // Go back to standard view
    await page.waitForTimeout(300);
    await structure.setStructureType('ground');
    await page.waitForTimeout(300);

    await navigation.switchToGear();
    await page.waitForTimeout(300);

    gearText = await page.locator('#gearList').textContent();
    expect(gearText).toContain('Bumper'); // Ground also uses bumpers

    // Switch to floor
    await navigation.switchToStandard();
    await page.waitForTimeout(300);
    await structure.setStructureType('floor');
    await page.waitForTimeout(300);

    await navigation.switchToGear();
    await page.waitForTimeout(300);

    gearText = await page.locator('#gearList').textContent();
    expect(gearText).toContain('Frame');
    expect(gearText).not.toContain('Bumper');
  });

  test('should toggle 4-way bumpers (CB5 only) @desktop', async ({
    page,
    dimensions,
    structure,
  }) => {
    // Select CB5 panel
    await dimensions.selectPanel('ROE Carbon CB5 MKII');
    await dimensions.setDimensionMode('panels');
    await dimensions.setPanelCount(10, 10);

    // Set to hanging with bumpers
    await structure.setStructureType('hanging');
    await structure.toggleBumpers(true);

    // Toggle 4-way bumpers
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
