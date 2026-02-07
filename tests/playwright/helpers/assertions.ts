import { expect, Page, Locator } from '@playwright/test';

/**
 * Custom assertion helpers for LED Calculator tests
 */
export class CustomAssertions {
  /**
   * Assert canvas has rendered content
   */
  static async assertCanvasRendered(canvas: Locator): Promise<void> {
    const dims = await canvas.evaluate((el: HTMLCanvasElement) => ({
      width: el.width,
      height: el.height,
    }));

    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);

    // Check if canvas has pixel data
    const hasContent = await canvas.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext('2d');
      if (!ctx) return false;
      const imageData = ctx.getImageData(0, 0, el.width, el.height);
      const data = imageData.data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return true;
      }
      return false;
    });

    expect(hasContent).toBe(true);
  }

  /**
   * Assert element has active class
   */
  static async assertIsActive(locator: Locator): Promise<void> {
    const classList = await locator.getAttribute('class');
    expect(classList).toContain('active');
  }

  /**
   * Assert element does not have active class
   */
  static async assertNotActive(locator: Locator): Promise<void> {
    const classList = await locator.getAttribute('class');
    expect(classList).not.toContain('active');
  }

  /**
   * Assert calculation results are visible
   */
  static async assertCalculationResults(page: Page): Promise<void> {
    const results = page.locator('#results');
    await expect(results).toBeVisible();

    const text = await results.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(0);
  }

  /**
   * Assert panel count matches expected
   */
  static async assertPanelCount(
    page: Page,
    expectedWide: number,
    expectedHigh: number
  ): Promise<void> {
    const results = page.locator('#results');
    const text = await results.textContent();

    expect(text).toContain(`${expectedWide} wide`);
    expect(text).toContain(`${expectedHigh} high`);
  }

  /**
   * Assert no console errors
   */
  static async assertNoConsoleErrors(page: Page): Promise<void> {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Give it a moment to catch any errors
    await page.waitForTimeout(1000);

    expect(errors.length).toBe(0);
  }

  /**
   * Assert gear list has items
   */
  static async assertGearListPopulated(page: Page): Promise<void> {
    const gearList = page.locator('#gearList');
    await expect(gearList).toBeVisible();

    const items = await gearList.locator('.gear-item').count();
    expect(items).toBeGreaterThan(0);
  }

  /**
   * Assert screen tab exists
   */
  static async assertScreenTabExists(
    page: Page,
    screenName: string
  ): Promise<void> {
    const tab = page.locator(`.screen-tab:has-text("${screenName}")`);
    await expect(tab).toBeVisible();
  }

  /**
   * Assert download started
   * Note: This waits for a download event but doesn't verify the file content
   */
  static async assertDownloadStarted(page: Page): Promise<void> {
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    // The calling test should trigger the download action
    const download = await downloadPromise;
    expect(download).toBeTruthy();
    expect(download.suggestedFilename()).toBeTruthy();
  }
}
