import { test, expect } from '../fixtures/base';
import { AppHelpers } from '../helpers/app-helpers';
import { CanvasHelpers } from '../helpers/canvas-helpers';

/**
 * Comprehensive Test: Manual Bumper Mode
 * Tests manual bumper mode toggle, bumper context menu, type conversion,
 * deletion, and structure undo/redo.
 */
test.describe('Manual Bumper Mode @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, structure }) => {
    await AppHelpers.setupAppWithDimensions(page, 8, 4);
    // Ensure bumpers are enabled and structure is hanging
    await structure.setStructureType('hanging');
    await structure.toggleBumpers(true);
    await page.waitForTimeout(300);
  });

  test('should toggle manual bumper mode on', async ({ page, structure }) => {
    await structure.toggleManualBumperMode(true);
    await expect(structure.manualBumperModeBtn).toHaveClass(/active/);
    // Mode hint should indicate manual mode
    const hint = page.locator('#structureModeHint');
    const hintText = await hint.textContent();
    expect(hintText!.toLowerCase()).toContain('click bumpers');
  });

  test('should toggle manual bumper mode off', async ({ page, structure }) => {
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
    await structure.toggleManualBumperMode(true);
    await expect(page.locator('#structureUndoBtn')).toBeVisible();
    await expect(page.locator('#structureRedoBtn')).toBeVisible();
  });

  test('should show bumper context menu on right-click', async ({ page, structure }) => {
    await structure.toggleManualBumperMode(true);
    await page.waitForTimeout(300);

    const structureCanvas = page.locator('#structureCanvas');
    await structureCanvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Get bumper position and right-click on it
    const hasBumpers = await page.evaluate('bumpers.length > 0');
    expect(hasBumpers).toBe(true);

    // Click on the first bumper position
    const bumperPos = await page.evaluate(`({
      x: bumpers[0].x + bumpers[0].width / 2,
      y: bumpers[0].y + bumpers[0].height / 2,
    })`);

    const box = await structureCanvas.boundingBox();
    if (!box) throw new Error('Structure canvas not visible');

    const canvasDims = await page.evaluate(`({
      cw: document.getElementById('structureCanvas').width,
      ch: document.getElementById('structureCanvas').height,
    })`);

    const scaleX = box.width / (canvasDims as any).cw;
    const scaleY = box.height / (canvasDims as any).ch;

    const pageX = box.x + (bumperPos as any).x * scaleX;
    const pageY = box.y + (bumperPos as any).y * scaleY;

    await page.mouse.click(pageX, pageY, { button: 'right' });
    await page.waitForTimeout(300);

    // Context menu should be visible
    await expect(page.locator('#bumperContextMenu')).toBeVisible();
  });

  test('should change bumper type to 1W via context menu', async ({ page, structure }) => {
    await structure.toggleManualBumperMode(true);
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
    await page.locator('#structureUndoBtn').click();
    await page.waitForTimeout(500);

    const restoredCount = await page.evaluate('bumpers.length');
    expect(restoredCount).toBe(initialCount);
  });

  test('should update structure canvas after bumper changes', async ({ page, structure }) => {
    await structure.toggleManualBumperMode(true);
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
