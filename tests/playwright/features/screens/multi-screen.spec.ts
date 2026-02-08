import { test, expect } from '../../fixtures/base';
import { AppHelpers } from '../../helpers/app-helpers';

/**
 * Feature Test: Multi-Screen Management
 * Tests add/remove/rename screens, data preservation across screen switches
 */
test.describe('Multi-Screen', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 6, 4);
  });

  test('should start with Screen 1 @critical', async ({ page }) => {
    const tabs = page.locator('#screenTabsContainer .screen-tab');
    await expect(tabs).toHaveCount(1);

    // First tab should say "Screen 1"
    const tabText = await tabs.first().textContent();
    expect(tabText).toContain('Screen 1');
  });

  test('should add a new screen @critical', async ({ page }) => {
    // Click the + button to add a screen
    await page.locator('#screenAddBtn').click();
    await page.waitForTimeout(300);

    // Should now have 2 screen tabs
    const tabs = page.locator('#screenTabsContainer .screen-tab');
    await expect(tabs).toHaveCount(2);

    // Second tab should say "Screen 2"
    const tab2Text = await tabs.nth(1).textContent();
    expect(tab2Text).toContain('Screen 2');
  });

  test('should switch between screens @critical', async ({ page }) => {
    // Add a second screen
    await page.locator('#screenAddBtn').click();
    await page.waitForTimeout(300);

    // Set dimensions on Screen 2
    await page.locator('#panelsWide').fill('10');
    await page.locator('#panelsHigh').fill('8');
    await page.locator('#panelsHigh').blur();
    await page.waitForTimeout(500);

    // Switch back to Screen 1
    const tabs = page.locator('#screenTabsContainer .screen-tab');
    await tabs.first().click();
    await page.waitForTimeout(500);

    // Screen 1 should still have original dimensions
    const panelsWide = await page.locator('#panelsWide').inputValue();
    const panelsHigh = await page.locator('#panelsHigh').inputValue();
    expect(panelsWide).toBe('6');
    expect(panelsHigh).toBe('4');
  });

  test('should preserve screen data when switching @critical', async ({
    page,
  }) => {
    // Add a second screen
    await page.locator('#screenAddBtn').click();
    await page.waitForTimeout(300);

    // Set specific config on Screen 2
    await page.locator('#panelsWide').fill('12');
    await page.locator('#panelsHigh').fill('6');
    await page.locator('#panelsHigh').blur();
    await page.waitForTimeout(500);

    // Switch to Screen 1
    const tabs = page.locator('#screenTabsContainer .screen-tab');
    await tabs.first().click();
    await page.waitForTimeout(500);

    // Switch back to Screen 2
    await tabs.nth(1).click();
    await page.waitForTimeout(500);

    // Screen 2 should still have its dimensions
    const panelsWide = await page.locator('#panelsWide').inputValue();
    const panelsHigh = await page.locator('#panelsHigh').inputValue();
    expect(panelsWide).toBe('12');
    expect(panelsHigh).toBe('6');
  });

  test('should rename a screen', async ({ page }) => {
    // Click the rename/edit button on Screen 1 tab
    const editBtn = page.locator('#screenTabsContainer .screen-tab').first().locator('button');
    await editBtn.click();
    await page.waitForTimeout(300);

    // Rename modal should appear
    const renameModal = page.locator('#screenRenameModal');
    await expect(renameModal).toBeVisible();

    // Enter new name
    const nameInput = renameModal.locator('input[type="text"]');
    await nameInput.fill('Main Stage');

    // Confirm rename (click save/OK button in modal)
    const saveBtn = renameModal.locator('button').filter({ hasText: /save|ok|rename|confirm/i });
    if (await saveBtn.count() > 0) {
      await saveBtn.first().click();
    } else {
      // Try pressing Enter
      await nameInput.press('Enter');
    }
    await page.waitForTimeout(300);

    // Tab should show new name
    const tabText = await page.locator('#screenTabsContainer .screen-tab').first().textContent();
    expect(tabText).toContain('Main Stage');
  });

  test('should add multiple screens', async ({ page }) => {
    // Add 3 more screens (total 4)
    for (let i = 0; i < 3; i++) {
      await page.locator('#screenAddBtn').click();
      await page.waitForTimeout(300);
    }

    // Should have 4 screen tabs
    const tabs = page.locator('#screenTabsContainer .screen-tab');
    await expect(tabs).toHaveCount(4);
  });

  test('should highlight the active screen tab', async ({ page }) => {
    // Add a second screen
    await page.locator('#screenAddBtn').click();
    await page.waitForTimeout(300);

    const tabs = page.locator('#screenTabsContainer .screen-tab');

    // Screen 2 should be active (just added)
    await expect(tabs.nth(1)).toHaveClass(/active/);
    await expect(tabs.first()).not.toHaveClass(/active/);

    // Switch to Screen 1
    await tabs.first().click();
    await page.waitForTimeout(300);

    // Screen 1 should now be active
    await expect(tabs.first()).toHaveClass(/active/);
    await expect(tabs.nth(1)).not.toHaveClass(/active/);
  });
});
