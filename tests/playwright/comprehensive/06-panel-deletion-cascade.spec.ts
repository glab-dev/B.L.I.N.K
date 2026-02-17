import { test, expect } from '../fixtures/base';
import { AppHelpers } from '../helpers/app-helpers';
import { CanvasHelpers } from '../helpers/canvas-helpers';
import { clickPanel, deleteSelectedPanels } from '../helpers/canvas-interaction-helpers';

/**
 * Comprehensive Test: Panel Deletion Cascade
 * Tests panel deletion and verifies cascading updates to power/data/structure/weight.
 * Also tests custom circuit and custom data line assignment.
 */
test.describe('Panel Deletion Cascade @comprehensive @desktop', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
  });

  test('should delete a panel via evaluate and update active panel count', async ({ page }) => {
    const initialResults = await page.locator('#results').textContent();
    expect(initialResults).toContain('4 × 3');

    // Delete a panel
    await page.evaluate(`
      saveState();
      deletedPanels.add('0,0');
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(500);

    // Active panel count should decrease (12 - 1 = 11)
    const activePanels = await page.evaluate('currentPw * currentPh - deletedPanels.size');
    expect(activePanels).toBe(11);
  });

  test('should update weight when panels deleted', async ({ page }) => {
    const initialResults = await page.locator('#results').textContent();

    // Delete 3 panels
    await page.evaluate(`
      saveState();
      deletedPanels.add('0,0');
      deletedPanels.add('0,1');
      deletedPanels.add('0,2');
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(500);

    const updatedResults = await page.locator('#results').textContent();
    // Results should be different (less weight)
    expect(updatedResults).not.toBe(initialResults);
  });

  test('should show deleted panels as dashed on standard canvas', async ({ page }) => {
    const standardCanvas = page.locator('#standardCanvas');
    await standardCanvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(standardCanvas);

    // Get initial canvas data
    const initialData = await CanvasHelpers.getCanvasPixelData(standardCanvas);

    // Delete a panel
    await page.evaluate(`
      saveState();
      deletedPanels.add('0,0');
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(500);

    // Canvas should have changed (deleted panel rendered differently)
    const updatedData = await CanvasHelpers.getCanvasPixelData(standardCanvas);
    expect(initialData).not.toEqual(updatedData);
  });

  test('should restore deleted panel via undo', async ({ page }) => {
    // Delete a panel
    await page.evaluate(`
      saveState();
      deletedPanels.add('0,0');
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(500);

    let deletedCount = await page.evaluate('deletedPanels.size');
    expect(deletedCount).toBe(1);

    // Undo
    await page.locator('#undoBtn').click();
    await page.waitForTimeout(500);

    deletedCount = await page.evaluate('deletedPanels.size');
    expect(deletedCount).toBe(0);
  });

  test('should handle deleting all panels in a column', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Delete entire first column (0,0), (0,1), (0,2)
    await page.evaluate(`
      saveState();
      deletedPanels.add('0,0');
      deletedPanels.add('0,1');
      deletedPanels.add('0,2');
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(500);

    const activePanels = await page.evaluate('currentPw * currentPh - deletedPanels.size');
    expect(activePanels).toBe(9);
    expect(consoleErrors).toHaveLength(0);
  });

  test('should update structure weights when panels deleted', async ({ page, structure }) => {
    // Ensure bumpers are enabled
    await structure.toggleBumpers(true);
    await page.waitForTimeout(300);

    const structureCanvas = page.locator('#structureCanvas');
    await structureCanvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const initialData = await CanvasHelpers.getCanvasPixelData(structureCanvas);

    // Delete panels
    await page.evaluate(`
      saveState();
      deletedPanels.add('0,0');
      deletedPanels.add('0,1');
      deletedPanels.add('0,2');
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(500);

    // Structure canvas should have updated
    const updatedData = await CanvasHelpers.getCanvasPixelData(structureCanvas);
    expect(initialData).not.toEqual(updatedData);
  });

  test('should assign custom circuit to panels', async ({ page }) => {
    // Assign circuit 5 to some panels
    await page.evaluate(`
      saveState();
      customCircuitAssignments.set('0,0', 5);
      customCircuitAssignments.set('0,1', 5);
      customCircuitAssignments.set('0,2', 5);
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(500);

    const assignments = await page.evaluate('customCircuitAssignments.size');
    expect(assignments).toBe(3);

    // Power canvas should have rendered with the custom circuits
    const powerCanvas = page.locator('#powerCanvas');
    await powerCanvas.scrollIntoViewIfNeeded();
    const hasContent = await CanvasHelpers.isCanvasDrawn(powerCanvas);
    expect(hasContent).toBe(true);
  });

  test('should assign custom data line to panels', async ({ page }) => {
    // Assign data line 3 to some panels
    await page.evaluate(`
      saveState();
      customDataLineAssignments.set('1,0', 3);
      customDataLineAssignments.set('1,1', 3);
      customDataLineAssignments.set('1,2', 3);
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(500);

    const assignments = await page.evaluate('customDataLineAssignments.size');
    expect(assignments).toBe(3);

    // Data canvas should have rendered with the custom data lines
    const dataCanvas = page.locator('#dataCanvas');
    await dataCanvas.scrollIntoViewIfNeeded();
    const hasContent = await CanvasHelpers.isCanvasDrawn(dataCanvas);
    expect(hasContent).toBe(true);
  });

  test('should undo custom circuit assignment', async ({ page }) => {
    await page.evaluate(`
      saveState();
      customCircuitAssignments.set('0,0', 5);
      saveCurrentScreenData();
      calculate();
    `);
    await page.waitForTimeout(300);

    let assignments = await page.evaluate('customCircuitAssignments.size');
    expect(assignments).toBe(1);

    // Undo
    await page.locator('#undoBtn').click();
    await page.waitForTimeout(500);

    assignments = await page.evaluate('customCircuitAssignments.size');
    expect(assignments).toBe(0);
  });
});
