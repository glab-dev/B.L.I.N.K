import { Page } from '@playwright/test';

/**
 * App lifecycle helpers
 * Handles welcome page dismissal and basic app setup for tests
 */
export class AppHelpers {
  /**
   * Dismiss the welcome page by entering Complex mode.
   * Must be called after page.goto('/') and waitForLoadState('networkidle').
   */
  static async enterApp(page: Page, mode: 'complex' | 'simple' = 'complex') {
    const btn = mode === 'complex'
      ? page.locator('.welcome-btn-complex')
      : page.locator('.welcome-btn-simple');
    await btn.click();
    try {
      await page.waitForSelector('#welcomePage', { state: 'hidden', timeout: 5000 });
    } catch {
      // On mobile, the click may not register — use evaluate as reliable fallback
      const fn = mode === 'complex' ? 'enterComplexMode' : 'enterSimpleMode';
      await page.evaluate((f) => (window as any)[f](), fn);
      await page.waitForSelector('#welcomePage', { state: 'hidden' });
    }
  }

  /**
   * Navigate to the app and dismiss the welcome page.
   * Combines goto + networkidle + welcome page dismissal.
   */
  static async setupApp(page: Page, mode: 'complex' | 'simple' = 'complex') {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await this.enterApp(page, mode);
  }

  /**
   * Navigate to the app, dismiss welcome page, and set panel dimensions.
   * This triggers calculate() so canvases and results render.
   */
  static async setupAppWithDimensions(
    page: Page,
    wide: number = 4,
    high: number = 3,
    mode: 'complex' | 'simple' = 'complex'
  ) {
    await this.setupApp(page, mode);
    const panelsWide = page.locator('#panelsWide');
    await panelsWide.scrollIntoViewIfNeeded();
    await panelsWide.fill(String(wide));
    await page.locator('#panelsHigh').fill(String(high));
    await page.locator('#panelsHigh').blur();
    await page.waitForTimeout(500);
  }
}
