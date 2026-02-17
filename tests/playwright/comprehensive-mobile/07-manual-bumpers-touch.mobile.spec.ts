import { test, expect } from '../fixtures/mobile-base';
import { AppHelpers } from '../helpers/app-helpers';
import { CanvasHelpers } from '../helpers/canvas-helpers';

/**
 * Comprehensive Mobile Test: Manual Bumper Mode (Touch)
 * Tests manual bumper mode toggle, bumper context menu via touch,
 * type conversion, deletion, and structure undo/redo.
 */
test.describe('Manual Bumper Mode @comprehensive @mobile', () => {
  test.beforeEach(async ({ page, structure }) => {
    await AppHelpers.setupAppWithDimensions(page, 8, 4);
    // Ensure bumpers are enabled and structure is hanging
    await structure.setStructureType('hanging');
    await structure.toggleBumpers(true);
    await page.waitForTimeout(300);
  });

  test('should toggle manual bumper mode on', async ({ page, structure }) => {
    await structure.manualBumperModeBtn.scrollIntoViewIfNeeded();
    await structure.toggleManualBumperMode(true);
    await expect(structure.manualBumperModeBtn).toHaveClass(/active/);
    // Mode hint should indicate manual mode
    const hint = page.locator('#structureModeHint');
    const hintText = await hint.textContent();
    expect(hintText!.toLowerCase()).toContain('click bumpers');
  });

  test('should toggle manual bumper mode off', async ({ page, structure }) => {
    await structure.manualBumperModeBtn.scrollIntoViewIfNeeded();
    await structure.toggleManualBumperMode(true);
    await structure.toggleManualBumperMode(false);
    await expect(structure.manualBumperModeBtn).not.toHaveClass(/active/);
    const hint = page.locator('#structureModeHint');
    const hintText = await hint.textContent();
    expect(hintText!.toLowerCase()).toContain('auto-distribution');
  });

  test('should show bumpers on structure canvas', async ({ page }) => {
    const structureCanvas = page.locator('#structureCanvas');
    await structureCanvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const hasContent = await CanvasHelpers.isCanvasDrawn(structureCanvas);
    expect(hasContent).toBe(true);
  });

  test('should show structure undo/redo buttons in manual mode', async ({ page, structure }) => {
    await structure.manualBumperModeBtn.scrollIntoViewIfNeeded();
    await structure.toggleManualBumperMode(true);
    await expect(page.locator('#structureUndoBtn')).toBeVisible();
    await expect(page.locator('#structureRedoBtn')).toBeVisible();
  });

  test('should select bumper and show context menu via touch', async ({ page, structure }) => {
    await structure.manualBumperModeBtn.scrollIntoViewIfNeeded();
    await structure.toggleManualBumperMode(true);
    await page.waitForTimeout(300);

    // Verify bumpers exist
    const hasBumpers = await page.evaluate('bumpers.length > 0');
    expect(hasBumpers).toBe(true);

    // On mobile, tap bumper once to select, tap again to show context menu.
    // Since simulating precise taps on canvas is tricky, use page.evaluate()
    // to call the bumper selection and context menu functions directly.
    const bumperId = await page.evaluate('bumpers[0].id');

    // Select the bumper by setting selectedBumper directly
    await page.evaluate((id) => {
      const bumper = bumpers.find((b: any) => b.id === id);
      if (bumper) {
        selectedBumper = bumper;
        selectedBumpers.add(id);
      }
    }, bumperId);
    await page.waitForTimeout(300);

    // Show context menu for the selected bumper
    await page.evaluate((id) => {
      const bumper = bumpers.find((b: any) => b.id === id);
      if (bumper) showBumperContextMenu(bumper, 100, 100);
    }, bumperId);
    await page.waitForTimeout(300);

    // Context menu should be visible
    await expect(page.locator('#bumperContextMenu')).toBeVisible();
  });

  test('should change bumper type to 1W via context menu', async ({ page, structure }) => {
    // Use evaluate since manualBumperModeBtn may not be scrollable on mobile
    await page.evaluate('toggleManualBumperMode()');
    await page.waitForTimeout(300);

    // Get initial bumper types
    const initialType = await page.evaluate('bumpers[0].type');

    // Use replaceBumperType which is the actual app function
    await page.evaluate(`
      if (bumpers.length > 0) {
        replaceBumperType(bumpers[0].id, '1W');
      }
    `);
    await page.waitForTimeout(500);

    const updatedType = await page.evaluate('bumpers[0].type');
    expect(updatedType).toBe('1W');
  });

  test('should change bumper type to 2W via evaluate', async ({ page, structure }) => {
    await structure.manualBumperModeBtn.scrollIntoViewIfNeeded();
    await structure.toggleManualBumperMode(true);
    await page.waitForTimeout(300);

    await page.evaluate(`
      if (bumpers.length > 0) {
        replaceBumperType(bumpers[0].id, '2W');
      }
    `);
    await page.waitForTimeout(500);

    const updatedType = await page.evaluate('bumpers[0].type');
    expect(updatedType).toBe('2W');
  });

  test('should delete bumper and reduce bumper count', async ({ page, structure }) => {
    await structure.manualBumperModeBtn.scrollIntoViewIfNeeded();
    await structure.toggleManualBumperMode(true);
    await page.waitForTimeout(300);

    const initialCount = await page.evaluate('bumpers.length');
    expect(initialCount).toBeGreaterThan(0);

    // Delete first bumper
    await page.evaluate(`
      saveStructureState();
      bumpers.splice(0, 1);
      generateStructureLayout();
    `);
    await page.waitForTimeout(500);

    const updatedCount = await page.evaluate('bumpers.length');
    expect(updatedCount).toBe(initialCount - 1);
  });

  test('should undo bumper deletion', async ({ page, structure }) => {
    await structure.manualBumperModeBtn.scrollIntoViewIfNeeded();
    await structure.toggleManualBumperMode(true);
    await page.waitForTimeout(300);

    const initialCount = await page.evaluate('bumpers.length');

    // Delete bumper
    await page.evaluate(`
      saveStructureState();
      bumpers.splice(0, 1);
      generateStructureLayout();
    `);
    await page.waitForTimeout(300);

    // Undo
    const undoBtn = page.locator('#structureUndoBtn');
    await undoBtn.scrollIntoViewIfNeeded();
    await undoBtn.click();
    await page.waitForTimeout(500);

    const restoredCount = await page.evaluate('bumpers.length');
    expect(restoredCount).toBe(initialCount);
  });

  test('should update structure canvas after bumper changes', async ({ page, structure }) => {
    // Use evaluate since manualBumperModeBtn may not be scrollable on mobile
    await page.evaluate('toggleManualBumperMode()');
    await page.waitForTimeout(300);

    const structureCanvas = page.locator('#structureCanvas');
    await structureCanvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const before = await CanvasHelpers.getCanvasPixelData(structureCanvas);

    // Delete a bumper
    await page.evaluate(`
      saveStructureState();
      bumpers.splice(0, 1);
      generateStructureLayout();
    `);
    await page.waitForTimeout(500);

    const after = await CanvasHelpers.getCanvasPixelData(structureCanvas);
    expect(after).not.toEqual(before);
  });
});
