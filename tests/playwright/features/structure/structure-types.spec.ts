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

    // The per-screen Gear tab stopped listing rigging hardware in v2.9.17 (it lives in the
    // Combined gear list and the PDF now), so the specs panel above is where the bumper
    // count surfaces for a single screen.
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

    // Ground support still uses bumpers — the specs panel reports their weight.
    const text = await page.locator('#results').textContent();
    expect(text).toContain('Bumper');
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

    // Floor hardware is not listed in the per-screen Gear tab (see v2.9.17), so assert the
    // frames the app actually worked out for this wall.
    // `screens` is a bare script-scope global, not a property of window, so evaluate it by
    // expression rather than through a closure.
    const frames: any = await page.evaluate(
      'screens[currentScreenId].calculatedData.floorFrames'
    );
    expect(frames).toBeTruthy();
    const frameTotal =
      (frames.frame_1x1 || 0) +
      (frames.frame_2x1 || 0) +
      (frames.frame_2x2 || 0) +
      (frames.frame_3x2 || 0);
    expect(frameTotal).toBeGreaterThan(0);
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

    let text = await page.locator('#results').textContent();
    expect(text).toContain('Bumper');

    // Switch to ground
    await structure.setStructureType('ground');
    await page.waitForTimeout(300);

    text = await page.locator('#results').textContent();
    expect(text).toContain('Bumper'); // Ground also uses bumpers
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
