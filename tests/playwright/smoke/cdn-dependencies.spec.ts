import { test, expect } from '../fixtures/base';

/**
 * Smoke Test: CDN Dependencies
 * Verifies jsPDF and html2canvas are loaded correctly
 */
test.describe('CDN Dependencies @smoke', () => {
  test('should load jsPDF library', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const jsPDFLoaded = await page.evaluate(() => {
      return typeof (window as any).jspdf !== 'undefined';
    });

    expect(jsPDFLoaded).toBe(true);
  });

  test('should load html2canvas library', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const html2canvasLoaded = await page.evaluate(() => {
      return typeof (window as any).html2canvas !== 'undefined';
    });

    expect(html2canvasLoaded).toBe(true);
  });

  test('should have PWA manifest', async ({ page }) => {
    await page.goto('/');

    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);
  });

  test('should load all external JS modules', async ({ page }) => {
    const resourceErrors: string[] = [];

    page.on('response', (response) => {
      if (
        response.status() >= 400 &&
        (response.url().endsWith('.js') || response.url().endsWith('.css'))
      ) {
        resourceErrors.push(`${response.status()}: ${response.url()}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify no resource loading errors
    expect(resourceErrors.length).toBe(0);
  });
});
