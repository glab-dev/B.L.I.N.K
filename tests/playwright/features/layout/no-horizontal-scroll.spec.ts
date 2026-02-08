import { test, expect } from '../../fixtures/base';
import { AppHelpers } from '../../helpers/app-helpers';

test.describe('No Horizontal Scroll', () => {

  async function checkNoHorizontalScroll(page: import('@playwright/test').Page) {
    const hasScroll = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasScroll).toBe(false);
  }

  test('should have no horizontal scroll at 375px mobile width @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
    await page.waitForTimeout(500);
    await checkNoHorizontalScroll(page);
  });

  test('should have no horizontal scroll at 390px mobile width @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
    await page.waitForTimeout(500);
    await checkNoHorizontalScroll(page);
  });

  test('should have no horizontal scroll at 768px tablet width', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
    await page.waitForTimeout(500);
    await checkNoHorizontalScroll(page);
  });

  test('should have no horizontal scroll at 1024px tablet width', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
    await page.waitForTimeout(500);
    await checkNoHorizontalScroll(page);
  });

  test('should have no horizontal scroll at 1920px desktop width @desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
    await page.waitForTimeout(500);
    await checkNoHorizontalScroll(page);
  });

  test('should have no horizontal scroll in gear list view @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
    await page.locator('button[data-mode="gear"]').click();
    await page.waitForTimeout(300);
    await checkNoHorizontalScroll(page);
  });

  test('should have no horizontal scroll in combined view @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
    await page.locator('button[data-mode="combined"]').click();
    await page.waitForTimeout(300);
    await checkNoHorizontalScroll(page);
  });
});
