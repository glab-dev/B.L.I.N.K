import { test, expect } from '../fixtures/mobile-base';
import { AppHelpers } from '../helpers/app-helpers';
import { MobileHelpers } from '../helpers/mobile-helpers';

test.describe('Responsive Layout @comprehensive @mobile', () => {

  test('should show mobile header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await AppHelpers.enterApp(page, 'complex');

    const header = page.locator('.mobile-header');
    await expect(header).toBeVisible();

    // Header should have action buttons
    const buttons = header.locator('.mobile-header-btn');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(3); // home, folder/save, menu
  });

  test('should show bottom nav with mode buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await AppHelpers.enterApp(page, 'complex');

    const bottomNav = page.locator('.bottom-nav');
    await expect(bottomNav).toBeVisible();

    // Should have mode toggle buttons
    await expect(page.locator('button[data-mode="complex"]')).toBeVisible();
    await expect(page.locator('button[data-mode="combined"]')).toBeVisible();
    await expect(page.locator('button[data-mode="gear"]')).toBeVisible();
  });

  test('should have compact form elements on mobile', async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);

    // Check that select elements exist and are usable
    const panelSelect = page.locator('#panelType');
    await expect(panelSelect).toBeVisible();

    // Input fields should be visible and interactive
    const panelsWide = page.locator('#panelsWide');
    await expect(panelsWide).toBeVisible();
  });

  test('should hide combined cabling container on mobile', async ({ page, navigation }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
    await navigation.switchToCombined();
    await page.waitForTimeout(500);

    // Combined cabling is hidden on mobile
    const cabling = page.locator('#combinedCablingContainer');
    await expect(cabling).not.toBeVisible();
  });

  test('should hide combined gear list container on mobile', async ({ page, navigation }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
    await navigation.switchToCombined();
    await page.waitForTimeout(500);

    // Combined gear list is hidden on mobile
    const gearList = page.locator('#combinedGearListContainer');
    await expect(gearList).not.toBeVisible();
  });

  test('should render all four layout canvases within viewport', async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);

    // All canvases should be renderable (scrollable into view)
    for (const id of ['standardCanvas', 'powerCanvas', 'dataCanvas', 'structureCanvas']) {
      const canvas = page.locator(`#${id}`);
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);

      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
      // Canvas width should not exceed viewport (390px) plus some padding
      expect(box!.width).toBeLessThanOrEqual(400);
    }
  });

  test('should display welcome page correctly on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const welcomePage = page.locator('#welcomePage');
    await expect(welcomePage).toBeVisible();

    // Mode buttons should be visible
    await expect(page.locator('.welcome-btn-simple')).toBeVisible();
    await expect(page.locator('.welcome-btn-complex')).toBeVisible();
    await expect(page.locator('.welcome-btn-raster')).toBeVisible();
  });

  test('should switch between all navigation modes', async ({ page, navigation }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await AppHelpers.enterApp(page, 'complex');
    await page.locator('#panelsWide').fill('4');
    await page.locator('#panelsHigh').fill('3');
    await page.locator('#panelsHigh').blur();
    await page.waitForTimeout(500);

    // Complex mode (default)
    await expect(page.locator('button[data-mode="complex"]')).toHaveClass(/active/);

    // Switch to Gear
    await navigation.switchToGear();
    await expect(page.locator('button[data-mode="gear"]')).toHaveClass(/active/);

    // Switch to Combined
    await navigation.switchToCombined();
    await expect(page.locator('button[data-mode="combined"]')).toHaveClass(/active/);

    // Switch to Canvas
    await navigation.switchToCanvas();
    // Canvas uses data-view not data-mode
    await expect(page.locator('button[data-view="canvas"]')).toHaveClass(/active/);

    // Back to Complex
    await navigation.switchToComplex();
    await expect(page.locator('button[data-mode="complex"]')).toHaveClass(/active/);
  });

  test('should show results section on mobile', async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);

    const results = page.locator('#results');
    await results.scrollIntoViewIfNeeded();
    const text = await results.textContent();
    expect(text!.length).toBeGreaterThan(0);
  });

  test('should have scrollable content between fixed header and nav', async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);

    // Scroll to the structure section (should be way below fold)
    const structureContainer = page.locator('#structureContainer');
    await structureContainer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Should be visible after scrolling
    await expect(structureContainer).toBeVisible();

    // Mobile header should still be visible (fixed)
    await expect(page.locator('.mobile-header')).toBeVisible();
  });
});
