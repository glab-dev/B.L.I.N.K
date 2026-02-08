import { test, expect } from '../../fixtures/base';
import { AppHelpers } from '../../helpers/app-helpers';

/**
 * Feature Test: Data Configuration
 * Tests processor selection, frame rate, bit depth, direction, redundancy toggles
 */
test.describe('Data Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 8, 6);
  });

  test('should select different processors @critical', async ({
    page,
    data,
  }) => {
    // Default processor should be Brompton SX40
    await expect(data.processorSelect).toHaveValue('Brompton_SX40');

    // Switch to S8
    await data.processorSelect.selectOption('Brompton_S8');
    await page.waitForTimeout(300);
    await expect(data.processorSelect).toHaveValue('Brompton_S8');

    // Switch to M2
    await data.processorSelect.selectOption('Brompton_M2');
    await page.waitForTimeout(300);
    await expect(data.processorSelect).toHaveValue('Brompton_M2');
  });

  test('should change frame rate @critical', async ({ page, data }) => {
    // Default is 60 Hz
    await expect(data.frameRateSelect).toHaveValue('60');

    // Change to 30 Hz
    await data.setFrameRate(30);
    await expect(data.frameRateSelect).toHaveValue('30');

    // Change to 24 Hz
    await data.setFrameRate(24);
    await expect(data.frameRateSelect).toHaveValue('24');
  });

  test('should change bit depth @critical', async ({ page, data }) => {
    // Default is 8 bit
    await expect(data.bitDepthSelect).toHaveValue('8');

    // Change to 10 bit
    await data.setBitDepth(10);
    await expect(data.bitDepthSelect).toHaveValue('10');

    // Change to 12 bit
    await data.setBitDepth(12);
    await expect(data.bitDepthSelect).toHaveValue('12');
  });

  test('should change data direction @critical', async ({ page, data }) => {
    // Default should be "top" (Top → Bottom)
    await expect(data.dataDirectionSelect).toHaveValue('top');

    // Change to Bottom → Top
    await data.setDataDirection('bottom');
    await expect(data.dataDirectionSelect).toHaveValue('bottom');

    // Change to All from Top
    await data.setDataDirection('all_top');
    await expect(data.dataDirectionSelect).toHaveValue('all_top');

    // Change to All from Bottom
    await data.setDataDirection('all_bottom');
    await expect(data.dataDirectionSelect).toHaveValue('all_bottom');
  });

  test('should toggle arrows button', async ({ page, data }) => {
    const arrowsBtn = page.locator('#showArrowsBtn');

    // Default should be active
    await expect(arrowsBtn).toHaveClass(/active/);

    // Toggle off
    await data.toggleArrows(false);
    await expect(arrowsBtn).not.toHaveClass(/active/);

    // Toggle on
    await data.toggleArrows(true);
    await expect(arrowsBtn).toHaveClass(/active/);
  });

  test('should toggle data flip button', async ({ page, data }) => {
    const flipBtn = page.locator('#dataFlipBtn');

    // Default should be inactive
    await expect(flipBtn).not.toHaveClass(/active/);

    // Toggle on
    await data.toggleDataFlip(true);
    await expect(flipBtn).toHaveClass(/active/);

    // Toggle off
    await data.toggleDataFlip(false);
    await expect(flipBtn).not.toHaveClass(/active/);
  });

  test('should toggle data redundancy', async ({ page, data }) => {
    const redunBtn = page.locator('#redundancyBtn');

    // Toggle redundancy — check state changes
    const initialActive = (await redunBtn.getAttribute('class'))?.includes('active');
    await redunBtn.click();
    await page.waitForTimeout(200);

    const afterClick = (await redunBtn.getAttribute('class'))?.includes('active');
    expect(afterClick).not.toBe(initialActive);
  });

  test('should toggle processor redundancy', async ({ page, data }) => {
    const procRedunBtn = page.locator('#processorRedundancyBtn');

    // Default should be inactive
    await expect(procRedunBtn).not.toHaveClass(/active/);

    // Toggle on
    await data.toggleProcessorRedundancy(true);
    await expect(procRedunBtn).toHaveClass(/active/);

    // Toggle off
    await data.toggleProcessorRedundancy(false);
    await expect(procRedunBtn).not.toHaveClass(/active/);
  });

  test('should render data layout canvas @critical', async ({
    page,
    data,
  }) => {
    // In Complex mode, all layout canvases are visible on the same page
    const dataCanvas = page.locator('#dataCanvas');
    await dataCanvas.scrollIntoViewIfNeeded();
    await expect(dataCanvas).toBeVisible();

    // Canvas should have content
    const hasContent = await dataCanvas.evaluate((el: HTMLCanvasElement) => {
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

  test('should recalculate when changing processor', async ({
    page,
    data,
  }) => {
    // Get results with SX40
    await page.waitForTimeout(300);
    const resultsSX40 = await page.locator('#results').textContent();

    // Switch to S4 (different port count)
    await data.processorSelect.selectOption('Brompton_S4');
    await page.waitForTimeout(300);
    const resultsS4 = await page.locator('#results').textContent();

    // Results should change with different processor
    expect(resultsSX40).not.toBe(resultsS4);
  });

  test('should recalculate when changing bit depth', async ({
    page,
    data,
  }) => {
    // Get results with 8-bit
    await page.waitForTimeout(300);
    const results8bit = await page.locator('#results').textContent();

    // Switch to 10-bit
    await data.setBitDepth(10);
    await page.waitForTimeout(300);
    const results10bit = await page.locator('#results').textContent();

    // Higher bit depth uses more bandwidth — results should differ
    expect(results8bit).not.toBe(results10bit);
  });
});
