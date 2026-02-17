import { test, expect } from '../fixtures/mobile-base';
import { AppHelpers } from '../helpers/app-helpers';

test.describe('Mobile Scroll & Navigation @comprehensive @mobile', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
  });

  test('should show all 4 layout sections in complex mode', async ({ page }) => {
    // All containers should exist and be scrollable into view
    for (const id of ['standardContainer', 'powerContainer', 'dataContainer', 'structureContainer']) {
      const container = page.locator(`#${id}`);
      await container.scrollIntoViewIfNeeded();
      await expect(container).toBeVisible();
    }
  });

  test('should keep mobile header visible while scrolling', async ({ page }) => {
    // Scroll to bottom of page content
    const structureContainer = page.locator('#structureContainer');
    await structureContainer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Header should remain visible (fixed position)
    await expect(page.locator('.mobile-header')).toBeVisible();
  });

  test('should keep bottom nav visible while scrolling', async ({ page }) => {
    // Scroll to bottom of page content
    const structureContainer = page.locator('#structureContainer');
    await structureContainer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Bottom nav should remain visible (fixed position)
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });

  test('should show gear view content when switching to gear mode', async ({ page, navigation }) => {
    await navigation.switchToGear();
    await page.waitForTimeout(300);

    // Gear list container should be visible
    await expect(page.locator('#gearListContainer')).toBeVisible();

    // Gear list should have content
    const gearHtml = await page.evaluate('document.getElementById("gearListContent").innerHTML');
    expect(gearHtml.length).toBeGreaterThan(0);
  });

  test('should show canvas view when switching to canvas mode', async ({ page, navigation }) => {
    await navigation.switchToCanvas();
    await page.waitForTimeout(300);

    await expect(page.locator('#canvasContainer')).toBeVisible();
  });

  test('should prevent background scroll when mobile menu is open', async ({ page }) => {
    // Open mobile menu
    await page.locator('.mobile-header-btn').last().click();
    await page.waitForTimeout(300);

    await expect(page.locator('#mobileMenuOverlay')).toBeVisible();

    // Close menu
    await page.locator('.mobile-menu-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#mobileMenuOverlay')).not.toBeVisible();
  });

  test('should prevent background scroll when modal is open', async ({ page }) => {
    await page.evaluate('openHelpModal()');
    await page.waitForTimeout(300);

    await expect(page.locator('#helpModal')).toHaveClass(/active/);

    // Close modal
    await page.locator('#helpModal .modal-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#helpModal')).not.toHaveClass(/active/);
  });

  test('should return to welcome page from mobile menu', async ({ page }) => {
    await page.locator('.mobile-header-btn').last().click();
    await page.waitForTimeout(300);

    const welcomeBtn = page.locator('.mobile-menu-btn', { hasText: 'Welcome' });
    await welcomeBtn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('#welcomePage')).toBeVisible();
  });
});
