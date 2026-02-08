import { test, expect } from '../../fixtures/base';
import { AppHelpers } from '../../helpers/app-helpers';

test.describe('Navigation Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 6, 4);
  });

  test('should show complex mode by default @critical', async ({ page }) => {
    await expect(page.locator('button[data-mode="complex"]')).toHaveClass(/active/);
    await expect(page.locator('#standardContainer')).toBeVisible();
  });

  test('should switch to combined view @critical', async ({ page, navigation }) => {
    await navigation.switchToCombined();

    await expect(page.locator('button[data-mode="combined"]')).toHaveClass(/active/);
    await expect(page.locator('button[data-mode="complex"]')).not.toHaveClass(/active/);
    await expect(page.locator('#combinedContainer')).toBeVisible();
  });

  test('should switch to gear list view @critical', async ({ page, navigation }) => {
    await navigation.switchToGear();

    await expect(page.locator('button[data-mode="gear"]')).toHaveClass(/active/);
    await expect(page.locator('#gearListContainer')).toBeVisible();
  });

  test('should switch to simple mode @mobile', async ({ page, navigation }) => {
    // Simple mode button is only visible on mobile
    const simpleGroup = page.locator('.nav-simple-group');
    const isVisible = await simpleGroup.isVisible();
    if (!isVisible) {
      test.skip();
      return;
    }

    await navigation.switchToSimple();

    await expect(page.locator('button[data-mode="simple"]')).toHaveClass(/active/);
    await expect(page.locator('#standardContainer')).toBeVisible();
  });

  test('should return to complex from gear @critical', async ({ page, navigation }) => {
    await navigation.switchToGear();
    await page.waitForTimeout(200);
    await navigation.switchToComplex();

    await expect(page.locator('#standardContainer')).toBeVisible();
  });

  test('should navigate home to welcome page @critical', async ({ page }) => {
    // Find and click the home button
    const homeBtn = page.locator('.mobile-header-btn').first();
    await homeBtn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('#welcomePage')).toBeVisible();
    await expect(page.locator('.welcome-title')).toContainText('B.L.I.N.K.');
  });

  test('should re-enter app from welcome page', async ({ page }) => {
    // Go home
    const homeBtn = page.locator('.mobile-header-btn').first();
    await homeBtn.click();
    await page.waitForTimeout(500);

    // Re-enter via Complex mode
    await page.locator('.welcome-btn-complex').click();
    await page.waitForSelector('#welcomePage', { state: 'hidden' });

    await expect(page.locator('#standardContainer')).toBeVisible();
  });
});
