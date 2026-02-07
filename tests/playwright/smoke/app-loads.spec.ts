import { test, expect } from '../fixtures/base';

/**
 * Smoke Test: App Loads
 * Verifies the app loads without errors and core elements are present
 */
test.describe('App Loads @critical @smoke', () => {
  test('should load the app without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify no console errors
    expect(errors.length).toBe(0);
  });

  test('should display core UI elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for main sections
    await expect(page.locator('#panelsWide')).toBeVisible();
    await expect(page.locator('#panelsHigh')).toBeVisible();
    await expect(page.locator('#panelType')).toBeVisible();

    // Check for canvas
    await expect(page.locator('#standardCanvas')).toBeVisible();

    // Check for navigation (mobile)
    const isMobile = page.viewportSize()!.width < 768;
    if (isMobile) {
      await expect(
        page.locator('button[data-view="standard"]')
      ).toBeVisible();
    }
  });

  test('should have default configuration loaded', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Default panel should be selected
    const panelType = await page.locator('#panelType').inputValue();
    expect(panelType).toBeTruthy();

    // Default dimensions should be set
    const panelsWide = await page.locator('#panelsWide').inputValue();
    const panelsHigh = await page.locator('#panelsHigh').inputValue();

    expect(parseInt(panelsWide)).toBeGreaterThan(0);
    expect(parseInt(panelsHigh)).toBeGreaterThan(0);
  });

  test('should render standard layout canvas', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for canvas to render
    await page.waitForTimeout(1000);

    const canvas = page.locator('#standardCanvas');
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
