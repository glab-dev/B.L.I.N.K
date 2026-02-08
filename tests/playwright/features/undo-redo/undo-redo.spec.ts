import { test, expect } from '../../fixtures/base';
import { AppHelpers } from '../../helpers/app-helpers';

test.describe('Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
  });

  test('should have undo and redo buttons disabled initially @critical', async ({ page }) => {
    await expect(page.locator('#undoBtn')).toBeDisabled();
    await expect(page.locator('#redoBtn')).toBeDisabled();
  });

  test('should enable undo button after panel deletion @critical', async ({ page }) => {
    await page.evaluate(() => {
      saveState();
      deletedPanels.add('0,0');
      calculate();
      updateUndoRedoButtons();
    });
    await page.waitForTimeout(500);

    await expect(page.locator('#undoBtn')).toBeEnabled();
    await expect(page.locator('#redoBtn')).toBeDisabled();
  });

  test('should undo a panel deletion @critical', async ({ page }) => {
    // Delete a panel
    await page.evaluate(() => {
      saveState();
      deletedPanels.add('0,0');
      calculate();
      updateUndoRedoButtons();
    });
    await page.waitForTimeout(300);

    const countBefore = await page.evaluate(() => deletedPanels.size);
    expect(countBefore).toBe(1);

    // Undo
    await page.locator('#undoBtn').click();
    await page.waitForTimeout(500);

    const countAfter = await page.evaluate(() => deletedPanels.size);
    expect(countAfter).toBe(0);

    await expect(page.locator('#undoBtn')).toBeDisabled();
    await expect(page.locator('#redoBtn')).toBeEnabled();
  });

  test('should redo a panel deletion @critical', async ({ page }) => {
    // Delete, undo, then redo
    await page.evaluate(() => {
      saveState();
      deletedPanels.add('0,0');
      calculate();
      updateUndoRedoButtons();
    });
    await page.waitForTimeout(300);

    await page.locator('#undoBtn').click();
    await page.waitForTimeout(300);

    await page.locator('#redoBtn').click();
    await page.waitForTimeout(500);

    const count = await page.evaluate(() => deletedPanels.size);
    expect(count).toBe(1);

    await expect(page.locator('#undoBtn')).toBeEnabled();
    await expect(page.locator('#redoBtn')).toBeDisabled();
  });

  test('should clear redo history after new action', async ({ page }) => {
    // Delete panel A
    await page.evaluate(() => {
      saveState();
      deletedPanels.add('0,0');
      calculate();
      updateUndoRedoButtons();
    });
    await page.waitForTimeout(300);

    // Undo
    await page.locator('#undoBtn').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#redoBtn')).toBeEnabled();

    // New action: delete panel B
    await page.evaluate(() => {
      saveState();
      deletedPanels.add('1,1');
      calculate();
      updateUndoRedoButtons();
    });
    await page.waitForTimeout(300);

    // Redo should be cleared
    await expect(page.locator('#redoBtn')).toBeDisabled();
  });
});
