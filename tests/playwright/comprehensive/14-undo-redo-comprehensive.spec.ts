import { test, expect } from '../fixtures/base';
import { AppHelpers } from '../helpers/app-helpers';

/**
 * Comprehensive Test: Undo/Redo — All Mutation Types
 * Tests undo/redo for multiple sequential deletions, custom assignments,
 * keyboard shortcuts, and across view/screen switches.
 */
test.describe('Undo/Redo — All Mutation Types @comprehensive @desktop', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 6, 4);
  });

  test('should undo multiple sequential panel deletions', async ({ page }) => {
    // Delete 3 panels
    for (const key of ['0,0', '1,0', '2,0']) {
      await page.evaluate(`
        saveState();
        deletedPanels.add('${key}');
        saveCurrentScreenData();
        calculate();
      `);
      await page.waitForTimeout(200);
    }

    let deleted = await page.evaluate('deletedPanels.size');
    expect(deleted).toBe(3);

    // Undo 3 times
    for (let i = 0; i < 3; i++) {
      await page.locator('#undoBtn').click();
      await page.waitForTimeout(300);
    }

    deleted = await page.evaluate('deletedPanels.size');
    expect(deleted).toBe(0);
  });

  test('should redo after multiple undos', async ({ page }) => {
    // Delete 3 panels
    for (const key of ['0,0', '1,0', '2,0']) {
      await page.evaluate(`
        saveState();
        deletedPanels.add('${key}');
        saveCurrentScreenData();
        calculate();
      `);
      await page.waitForTimeout(200);
    }

    // Undo all 3
    for (let i = 0; i < 3; i++) {
      await page.locator('#undoBtn').click();
      await page.waitForTimeout(200);
    }
    expect(await page.evaluate('deletedPanels.size')).toBe(0);

    // Redo 2
    for (let i = 0; i < 2; i++) {
      await page.locator('#redoBtn').click();
      await page.waitForTimeout(200);
    }
    expect(await page.evaluate('deletedPanels.size')).toBe(2);
  });

  test('should clear redo stack on new action after undo', async ({ page }) => {
    // Delete panel, undo, then delete a different panel
    await page.evaluate(`
      saveState();
      deletedPanels.add('0,0');
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(200);

    await page.locator('#undoBtn').click();
    await page.waitForTimeout(300);

    // New action (different deletion)
    await page.evaluate(`
      saveState();
      deletedPanels.add('1,1');
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(200);

    // Redo should be disabled (stack cleared)
    const redoDisabled = await page.locator('#redoBtn').isDisabled();
    expect(redoDisabled).toBe(true);
  });

  test('should undo custom circuit assignment', async ({ page }) => {
    await page.evaluate(`
      saveState();
      customCircuitAssignments.set('0,0', 5);
      customCircuitAssignments.set('0,1', 5);
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(300);

    expect(await page.evaluate('customCircuitAssignments.size')).toBe(2);

    await page.locator('#undoBtn').click();
    await page.waitForTimeout(300);

    expect(await page.evaluate('customCircuitAssignments.size')).toBe(0);
  });

  test('should undo custom data line assignment', async ({ page }) => {
    await page.evaluate(`
      saveState();
      customDataLineAssignments.set('1,0', 3);
      customDataLineAssignments.set('1,1', 3);
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(300);

    expect(await page.evaluate('customDataLineAssignments.size')).toBe(2);

    await page.locator('#undoBtn').click();
    await page.waitForTimeout(300);

    expect(await page.evaluate('customDataLineAssignments.size')).toBe(0);
  });

  test('should keyboard shortcut Ctrl+Z for undo', async ({ page }) => {
    await page.evaluate(`
      saveState();
      deletedPanels.add('0,0');
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(200);

    expect(await page.evaluate('deletedPanels.size')).toBe(1);

    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);

    expect(await page.evaluate('deletedPanels.size')).toBe(0);
  });

  test('should keyboard shortcut Ctrl+Y for redo', async ({ page }) => {
    await page.evaluate(`
      saveState();
      deletedPanels.add('0,0');
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(200);

    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    expect(await page.evaluate('deletedPanels.size')).toBe(0);

    await page.keyboard.press('Control+y');
    await page.waitForTimeout(300);
    expect(await page.evaluate('deletedPanels.size')).toBe(1);
  });

  test('should maintain undo history across view switches', async ({ page, navigation }) => {
    await page.evaluate(`
      saveState();
      deletedPanels.add('0,0');
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(200);

    // Switch to gear and back
    await navigation.switchToGear();
    await page.waitForTimeout(200);
    await navigation.switchToComplex();
    await page.waitForTimeout(200);

    // Undo should still work
    await page.locator('#undoBtn').click();
    await page.waitForTimeout(300);
    expect(await page.evaluate('deletedPanels.size')).toBe(0);
  });

  test('should undo button be disabled with empty history', async ({ page }) => {
    // Initially undo should be disabled
    const undoDisabled = await page.locator('#undoBtn').isDisabled();
    expect(undoDisabled).toBe(true);

    // After an action, it should be enabled
    await page.evaluate(`
      saveState();
      deletedPanels.add('0,0');
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(200);

    const undoEnabled = await page.locator('#undoBtn').isEnabled();
    expect(undoEnabled).toBe(true);
  });
});
