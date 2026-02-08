import { test, expect } from '../../fixtures/base';
import { AppHelpers } from '../../helpers/app-helpers';

/**
 * Feature Test: Data Calculations — Max Panels Per Data Port
 *
 * Verifies that max panels per data line dynamically updates based on
 * frame rate and bit depth. Reference values from "Brompton panels per
 * port analysis.pdf" (Brompton Tessera spec).
 *
 * Formula: floor(adjustedCapacity / pixelsPerPanel), capped at 500
 *   adjustedCapacity = base_pixels_1g * (baseFR / frameRate) * bitDepthScale
 *   bitDepthScale: 8-bit=1.0, 10-bit=0.8, 12-bit=0.667
 */

/** Extract a numeric spec value from the results panel */
async function getSpecValue(page: any, label: string): Promise<number> {
  const text = await page.locator('#results').textContent();
  const regex = new RegExp(label + ':\\s*([\\d,]+)');
  const match = text.match(regex);
  if (!match) return -1;
  return parseInt(match[1].replace(/,/g, ''));
}

/** Setup app with a specific panel and dimensions (panel first, then dimensions) */
async function setupWithPanel(page: any, panelValue: string, wide: number = 8, high: number = 6) {
  await AppHelpers.setupApp(page, 'complex');
  // Select panel FIRST (triggers resetCalculator which clears dimensions)
  await page.locator('#panelType').selectOption(panelValue);
  await page.waitForTimeout(300);
  // Then set dimensions
  await page.locator('#panelsWide').fill(String(wide));
  await page.locator('#panelsHigh').fill(String(high));
  await page.locator('#panelsHigh').blur();
  await page.waitForTimeout(500);
}

test.describe('Max Panels Per Data — Frame Rate & Bit Depth', () => {

  test.describe('BP2 V2 (176x176 = 30,976 px/panel)', () => {
    test.beforeEach(async ({ page }) => {
      await setupWithPanel(page, 'BP2_V2');
    });

    test('frame rate changes max panels per data @critical', async ({ page, data }) => {
      // 60Hz/8-bit → 16 panels (PDF verified)
      await expect(data.frameRateSelect).toHaveValue('60');
      await expect(data.bitDepthSelect).toHaveValue('8');
      let maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(16);

      // 50Hz/8-bit → 20 panels (PDF verified)
      await data.setFrameRate(50);
      await page.waitForTimeout(300);
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(20);

      // 30Hz/8-bit → 33 panels (PDF verified)
      await data.setFrameRate(30);
      await page.waitForTimeout(300);
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(33);

      // 24Hz/8-bit → 42 panels (PDF verified)
      await data.setFrameRate(24);
      await page.waitForTimeout(300);
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(42);
    });

    test('bit depth changes max panels per data @critical', async ({ page, data }) => {
      // 60Hz/8-bit → 16
      let maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(16);

      // 60Hz/10-bit → 13 (PDF verified)
      await data.setBitDepth(10);
      await page.waitForTimeout(300);
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(13);

      // 60Hz/12-bit → 11 (PDF verified)
      await data.setBitDepth(12);
      await page.waitForTimeout(300);
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(11);
    });

    test('frame rate + bit depth combined effect', async ({ page, data }) => {
      // 50Hz/10-bit → floor(504,000 / 30,976) = 16 (PDF verified)
      await data.setFrameRate(50);
      await data.setBitDepth(10);
      await page.waitForTimeout(300);
      let maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(16);

      // 30Hz/12-bit → floor(700,000 / 30,976) = 22 (PDF verified)
      await data.setFrameRate(30);
      await data.setBitDepth(12);
      await page.waitForTimeout(300);
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(22);
    });
  });

  test.describe('CB5 MKII (104x208 = 21,632 px/panel)', () => {
    test.beforeEach(async ({ page }) => {
      await setupWithPanel(page, 'CB5_MKII');
    });

    test('frame rate and bit depth combinations @critical', async ({ page, data }) => {
      // 60Hz/8-bit → 24 (PDF verified)
      let maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(24);

      // 60Hz/10-bit → 19 (PDF verified)
      await data.setBitDepth(10);
      await page.waitForTimeout(300);
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(19);

      // 30Hz/8-bit → 48 (PDF verified)
      await data.setBitDepth(8);
      await data.setFrameRate(30);
      await page.waitForTimeout(300);
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(48);

      // 30Hz/12-bit → 32 (PDF verified)
      await data.setBitDepth(12);
      await page.waitForTimeout(300);
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(32);
    });
  });

  test.describe('DM2.6 (192x192 = 36,864 px/panel)', () => {
    test.beforeEach(async ({ page }) => {
      await setupWithPanel(page, 'DM2_6');
    });

    test('frame rate and bit depth combinations @critical', async ({ page, data }) => {
      // 60Hz/8-bit → 14 (PDF verified)
      let maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(14);

      // 60Hz/10-bit → 11 (PDF verified)
      await data.setBitDepth(10);
      await page.waitForTimeout(300);
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(11);

      // 50Hz/8-bit → 17 (PDF verified)
      await data.setBitDepth(8);
      await data.setFrameRate(50);
      await page.waitForTimeout(300);
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(17);

      // 30Hz/12-bit → 18 (PDF verified)
      await data.setFrameRate(30);
      await data.setBitDepth(12);
      await page.waitForTimeout(300);
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(18);
    });
  });

  test.describe('CB5 MKII + Half Row (mixed panel calculation)', () => {
    test.beforeEach(async ({ page }) => {
      await setupWithPanel(page, 'CB5_MKII');
    });

    test('half row changes max panels per data @critical', async ({ page, data }) => {
      // Without half row: 60Hz/8-bit → 24
      let maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(24);

      // Toggle half row on
      const halfRowBtn = page.locator('#addCB5HalfRowBtn');
      await halfRowBtn.click();
      await page.waitForTimeout(500);

      // With half row: avg px/panel = (48*21632 + 8*10816) / 56 = ~20,087
      // 60Hz/8-bit → floor(525000 / 20087) = 26
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(26);

      // With half row: 60Hz/10-bit → floor(420000 / 20087) = 20
      await data.setBitDepth(10);
      await page.waitForTimeout(300);
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(20);

      // With half row: 30Hz/8-bit → floor(1050000 / 20087) = 52
      await data.setBitDepth(8);
      await data.setFrameRate(30);
      await page.waitForTimeout(300);
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(52);

      // Toggle half row off → back to normal
      await halfRowBtn.click();
      await page.waitForTimeout(500);

      // 30Hz/8-bit without half row → 48
      maxPanels = await getSpecValue(page, 'Max panels per data line');
      expect(maxPanels).toBe(48);
    });
  });
});

test.describe('Max Panels Per Data — Placeholder & Override', () => {

  test('placeholder updates dynamically with frame rate', async ({ page, data }) => {
    await setupWithPanel(page, 'BP2_V2');

    const input = data.maxPanelsPerDataInput;

    // At 60Hz/8-bit, placeholder should be 16
    await expect(input).toHaveAttribute('placeholder', '16');

    // Change to 50Hz → placeholder should be 20
    await data.setFrameRate(50);
    await page.waitForTimeout(300);
    await expect(input).toHaveAttribute('placeholder', '20');

    // Change to 30Hz → placeholder should be 33
    await data.setFrameRate(30);
    await page.waitForTimeout(300);
    await expect(input).toHaveAttribute('placeholder', '33');
  });

  test('placeholder updates dynamically with bit depth', async ({ page, data }) => {
    await setupWithPanel(page, 'BP2_V2');

    const input = data.maxPanelsPerDataInput;

    // At 60Hz/10-bit → 13
    await data.setBitDepth(10);
    await page.waitForTimeout(300);
    await expect(input).toHaveAttribute('placeholder', '13');

    // At 60Hz/12-bit → 11
    await data.setBitDepth(12);
    await page.waitForTimeout(300);
    await expect(input).toHaveAttribute('placeholder', '11');
  });

  test('user override preserved when frame rate changes', async ({ page, data }) => {
    await setupWithPanel(page, 'BP2_V2');

    // Enter a manual value
    await data.setMaxPanelsPerData(10);
    await page.waitForTimeout(300);

    // Change frame rate — user input value should be preserved
    await data.setFrameRate(30);
    await page.waitForTimeout(300);
    await expect(data.maxPanelsPerDataInput).toHaveValue('10');

    // Specs display shows the suggested (auto) value, not the user override
    // The user override affects data routing but the display shows port capacity
    const maxPanels = await getSpecValue(page, 'Max panels per data line');
    expect(maxPanels).toBe(33); // Suggested value for 30Hz/8-bit BP2 V2
  });
});

test.describe('Max Panels Per Data — Port Capacity Display', () => {

  test('port capacity updates with frame rate and bit depth @critical', async ({ page, data }) => {
    await setupWithPanel(page, 'BP2_V2');

    // 60Hz/8-bit → 525,000
    let portCapacity = await getSpecValue(page, 'Port Capacity');
    expect(portCapacity).toBe(525000);

    // 30Hz/8-bit → 1,050,000
    await data.setFrameRate(30);
    await page.waitForTimeout(300);
    portCapacity = await getSpecValue(page, 'Port Capacity');
    expect(portCapacity).toBe(1050000);

    // 60Hz/10-bit → 420,000
    await data.setFrameRate(60);
    await data.setBitDepth(10);
    await page.waitForTimeout(300);
    portCapacity = await getSpecValue(page, 'Port Capacity');
    expect(portCapacity).toBe(420000);

    // 50Hz/12-bit → floor(350,000 * 60/50) = 420,000
    await data.setFrameRate(50);
    await data.setBitDepth(12);
    await page.waitForTimeout(300);
    portCapacity = await getSpecValue(page, 'Port Capacity');
    expect(portCapacity).toBe(420000);
  });
});
