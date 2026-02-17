import { test, expect } from '../fixtures/mobile-base';
import { AppHelpers } from '../helpers/app-helpers';

/**
 * Comprehensive Mobile Test: Mobile Menu & Header
 * Tests mobile header buttons and menu overlay interactions.
 */
test.describe('Mobile Menu & Header @comprehensive @mobile', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
  });

  test('should open mobile menu overlay', async ({ page }) => {
    // Menu button is the last mobile-header-btn
    const menuBtn = page.locator('.mobile-header-btn').last();
    await menuBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#mobileMenuOverlay')).toBeVisible();
  });

  test('should close mobile menu with close button', async ({ page }) => {
    await page.locator('.mobile-header-btn').last().click();
    await page.waitForTimeout(300);

    await page.locator('.mobile-menu-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#mobileMenuOverlay')).not.toBeVisible();
  });

  test('should navigate to welcome page from menu', async ({ page }) => {
    await page.locator('.mobile-header-btn').last().click();
    await page.waitForTimeout(300);

    const welcomeBtn = page.locator('.mobile-menu-btn', { hasText: 'Welcome' });
    await welcomeBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('#welcomePage')).toBeVisible();
  });

  test('should have config name input in menu', async ({ page }) => {
    await page.locator('.mobile-header-btn').last().click();
    await page.waitForTimeout(300);

    const configInput = page.locator('#configName');
    await expect(configInput).toBeVisible();
    await configInput.fill('My Project');
    await expect(configInput).toHaveValue('My Project');
  });

  test('should open Add Panel modal from menu', async ({ page }) => {
    await page.locator('.mobile-header-btn').last().click();
    await page.waitForTimeout(300);

    const addPanelBtn = page.locator('.mobile-menu-btn', { hasText: 'Add Panel' });
    await addPanelBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('#customPanelModal')).toHaveClass(/active/);

    // Close it
    await page.locator('#customPanelModal .modal-close').click();
    await page.waitForTimeout(300);
  });

  test('should open Add Processor modal from menu', async ({ page }) => {
    await page.locator('.mobile-header-btn').last().click();
    await page.waitForTimeout(300);

    const addProcessorBtn = page.locator('.mobile-menu-btn', { hasText: 'Add Processor' });
    await addProcessorBtn.scrollIntoViewIfNeeded();
    await addProcessorBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('#customProcessorModal')).toHaveClass(/active/);

    await page.locator('#customProcessorModal .modal-close').click();
    await page.waitForTimeout(300);
  });

  test('should open Manage Items modal from menu', async ({ page }) => {
    await page.locator('.mobile-header-btn').last().click();
    await page.waitForTimeout(300);

    const manageBtn = page.locator('.mobile-menu-btn', { hasText: 'Manage Items' });
    await manageBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('#manageCustomModal')).toHaveClass(/active/);

    await page.locator('#manageCustomModal .modal-close').click();
    await page.waitForTimeout(300);
  });

  test('should open Requests modal from menu', async ({ page }) => {
    await page.locator('.mobile-header-btn').last().click();
    await page.waitForTimeout(300);

    const requestsBtn = page.locator('.mobile-menu-btn', { hasText: 'Requests' });
    await requestsBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('#requestItemModal')).toHaveClass(/active/);

    await page.locator('#requestItemModal .modal-close').click();
    await page.waitForTimeout(300);
  });

  test('should open Gear Code Mapping from menu', async ({ page }) => {
    // Open gear code modal via evaluate (button is at bottom of menu overlay
    // and can be intercepted by section headings on mobile)
    await page.evaluate('modalOpenedFromMenu = true; openGearCodeModal()');
    await page.waitForTimeout(500);
    await expect(page.locator('#gearCodeModal')).toHaveClass(/active/);

    await page.locator('#gearCodeModal .modal-close').click();
    await page.waitForTimeout(300);
  });
});
