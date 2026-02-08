import { test, expect } from '../fixtures/base';

/**
 * Smoke Test: App Loads
 * Verifies the app loads without errors and core elements are present.
 * The app shows a welcome page on first load — tests must dismiss it
 * by clicking "Complex" mode before checking app UI elements.
 *
 * Note: The app starts with empty dimension fields (no default values).
 * Canvas and results only appear after dimensions are entered.
 */
test.describe('App Loads @critical @smoke', () => {

  /** Dismiss the welcome page by entering Complex mode */
  async function enterApp(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Click the "Complex" mode button to dismiss the welcome page
    await page.locator('.welcome-btn-complex').click();
    // Wait for the welcome page to hide and the app to render
    await page.waitForSelector('#welcomePage', { state: 'hidden' });
  }

  /** Enter the app and set basic dimensions so the canvas renders */
  async function enterAppWithDimensions(page: import('@playwright/test').Page) {
    await enterApp(page);
    // Set panel dimensions so calculate() runs and canvas renders
    await page.locator('#panelsWide').fill('4');
    await page.locator('#panelsHigh').fill('3');
    // Wait for calculation and canvas render
    await page.waitForTimeout(500);
  }

  test('should load the app without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await enterApp(page);

    // Verify no console errors
    expect(errors.length).toBe(0);
  });

  test('should display the welcome page on first load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Welcome page should be visible
    await expect(page.locator('#welcomePage')).toBeVisible();
    // Mode buttons should be present
    await expect(page.locator('.welcome-btn-simple')).toBeVisible();
    await expect(page.locator('.welcome-btn-complex')).toBeVisible();
  });

  test('should display core UI elements after entering app', async ({ page }) => {
    await enterApp(page);

    // Check for input sections (visible even without dimensions)
    await expect(page.locator('#panelsWide')).toBeVisible();
    await expect(page.locator('#panelsHigh')).toBeVisible();
    await expect(page.locator('#panelType')).toBeVisible();

    // Dimension inputs start empty — no default values
    const panelsWide = await page.locator('#panelsWide').inputValue();
    expect(panelsWide).toBe('');

    // Check for navigation (mobile)
    const isMobile = page.viewportSize()!.width < 768;
    if (isMobile) {
      await expect(
        page.locator('button[data-mode="complex"]')
      ).toBeVisible();
    }
  });

  test('should have panel type selected by default', async ({ page }) => {
    await enterApp(page);

    // Default panel should be selected
    const panelType = await page.locator('#panelType').inputValue();
    expect(panelType).toBeTruthy();
  });

  test('should render standard layout canvas after entering dimensions', async ({ page }) => {
    await enterAppWithDimensions(page);

    // Standard container should now be visible
    await expect(page.locator('#standardContainer')).toBeVisible();

    const canvas = page.locator('#standardCanvas');
    await expect(canvas).toBeVisible();

    const dims = await canvas.evaluate((el: HTMLCanvasElement) => ({
      width: el.width,
      height: el.height,
    }));

    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);

    // Check if canvas has content (not blank)
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
  });
});
