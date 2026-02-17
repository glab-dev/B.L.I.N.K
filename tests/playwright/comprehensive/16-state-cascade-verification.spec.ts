import { test, expect } from '../fixtures/base';
import { AppHelpers } from '../helpers/app-helpers';
import { CanvasHelpers } from '../helpers/canvas-helpers';

/**
 * Comprehensive Test: State Cascade Verification
 * End-to-end verification that input changes cascade through the entire system:
 * calculation → layout → weight → gear list.
 */
test.describe('State Cascade Verification @comprehensive @desktop', () => {

  test('should cascade panel type change through all outputs', async ({
    page, dimensions,
  }) => {
    await AppHelpers.setupAppWithDimensions(page, 8, 6);

    // Record initial gear list
    const initialGear = await page.evaluate(
      'document.getElementById("gearListContent").innerHTML'
    );
    expect(initialGear).toContain('BP2');

    // Switch panel type — this triggers resetCalculator() which clears dimensions
    await dimensions.panelTypeSelect.selectOption('CB5_MKII');
    await page.waitForTimeout(500);

    // Re-enter dimensions (reset clears them)
    await dimensions.setPanelCount(4, 3);
    await page.waitForTimeout(500);

    // Gear list should now mention the new panel type
    const gearHtml = await page.evaluate(
      'document.getElementById("gearListContent").innerHTML'
    );
    expect(gearHtml.length).toBeGreaterThan(0);
    expect(gearHtml).toContain('CB5');
    expect(gearHtml).not.toBe(initialGear);
  });

  test('should cascade voltage change to power layout and results', async ({
    page, power,
  }) => {
    await AppHelpers.setupAppWithDimensions(page, 8, 6);

    const initialResults = await page.locator('#results').textContent();
    const powerCanvas = page.locator('#powerCanvas');
    await powerCanvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(powerCanvas);
    const initialPowerData = await CanvasHelpers.getCanvasPixelData(powerCanvas);

    // Change voltage
    await power.setVoltage(120);
    await page.waitForTimeout(500);

    // Results should differ
    const updatedResults = await page.locator('#results').textContent();
    expect(updatedResults).not.toBe(initialResults);

    // Power canvas should re-render (different circuit groupings)
    await powerCanvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(powerCanvas);
    const updatedPowerData = await CanvasHelpers.getCanvasPixelData(powerCanvas);
    expect(updatedPowerData).not.toEqual(initialPowerData);
  });

  test('should cascade frame rate change to data layout', async ({
    page, data,
  }) => {
    await AppHelpers.setupAppWithDimensions(page, 8, 6);

    // Record max/data placeholder
    const placeholder1 = await page.locator('#maxPanelsPerData').getAttribute('placeholder');

    const dataCanvas = page.locator('#dataCanvas');
    await dataCanvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(dataCanvas);
    const initialDataPx = await CanvasHelpers.getCanvasPixelData(dataCanvas);

    // Change frame rate from 60 to 30
    await data.setFrameRate(30);
    await page.waitForTimeout(500);

    // Placeholder should change (more panels per data line at lower frame rate)
    const placeholder2 = await page.locator('#maxPanelsPerData').getAttribute('placeholder');
    expect(placeholder2).not.toBe(placeholder1);

    // Data canvas should re-render
    await dataCanvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(dataCanvas);
    const updatedDataPx = await CanvasHelpers.getCanvasPixelData(dataCanvas);
    expect(updatedDataPx).not.toEqual(initialDataPx);
  });

  test('should cascade structure type change to structure layout', async ({
    page, structure,
  }) => {
    await AppHelpers.setupAppWithDimensions(page, 6, 4);
    await structure.toggleBumpers(true);
    await page.waitForTimeout(300);

    const structureCanvas = page.locator('#structureCanvas');
    await structureCanvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(structureCanvas);
    const hangingData = await CanvasHelpers.getCanvasPixelData(structureCanvas);

    // Switch from hanging to ground
    await structure.setStructureType('ground');
    await page.waitForTimeout(500);

    await structureCanvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(structureCanvas);
    const groundData = await CanvasHelpers.getCanvasPixelData(structureCanvas);
    expect(groundData).not.toEqual(hangingData);
  });

  test('should cascade panel deletion to weight display', async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 6, 4);
    const initialResults = await page.locator('#results').textContent();

    // Delete 4 panels
    await page.evaluate(`
      saveState();
      deletedPanels.add('0,0');
      deletedPanels.add('0,1');
      deletedPanels.add('0,2');
      deletedPanels.add('0,3');
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(500);

    const updatedResults = await page.locator('#results').textContent();
    expect(updatedResults).not.toBe(initialResults);
  });

  test('should cascade bumper toggle to structure canvas and results', async ({
    page, structure,
  }) => {
    await AppHelpers.setupAppWithDimensions(page, 6, 4);
    await structure.setStructureType('hanging');
    await structure.toggleBumpers(true);
    await page.waitForTimeout(300);

    // Record results with bumpers enabled
    const resultsWithBumpers = await page.locator('#results').textContent();

    // Structure canvas should have content
    const structureCanvas = page.locator('#structureCanvas');
    await structureCanvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(structureCanvas);
    expect(await CanvasHelpers.isCanvasDrawn(structureCanvas)).toBe(true);

    // Disable bumpers
    await structure.toggleBumpers(false);
    await page.waitForTimeout(300);

    // Results should change (different weight without bumpers)
    const resultsWithoutBumpers = await page.locator('#results').textContent();
    expect(resultsWithoutBumpers).not.toBe(resultsWithBumpers);
  });

  test('should cascade redundancy toggle to processor count', async ({
    page, data,
  }) => {
    await AppHelpers.setupAppWithDimensions(page, 8, 6);

    // Read gear list before redundancy
    const gearBefore = await page.evaluate(
      'document.getElementById("gearListContent").innerHTML'
    );

    // Enable processor redundancy
    await data.toggleProcessorRedundancy(true);
    await page.waitForTimeout(500);

    // Gear list should have more processors
    const gearAfter = await page.evaluate(
      'document.getElementById("gearListContent").innerHTML'
    );
    expect(gearAfter).not.toBe(gearBefore);
  });

  test('should cascade bit depth change through data calculations', async ({
    page, data,
  }) => {
    await AppHelpers.setupAppWithDimensions(page, 8, 6);

    // Get max panels per data at 8-bit
    const placeholder8bit = await page.locator('#maxPanelsPerData').getAttribute('placeholder');

    // Change to 10-bit
    await data.setBitDepth(10);
    await page.waitForTimeout(500);

    const placeholder10bit = await page.locator('#maxPanelsPerData').getAttribute('placeholder');

    // Higher bit depth = fewer panels per data line
    expect(Number(placeholder10bit)).toBeLessThan(Number(placeholder8bit));
  });
});
