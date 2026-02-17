import { test, expect } from '../fixtures/base';
import { AppHelpers } from '../helpers/app-helpers';
import { CanvasHelpers } from '../helpers/canvas-helpers';

/**
 * Comprehensive Test: Canvas View
 * Tests all canvas view interactions: zoom, canvas size, position, snap, export options.
 */
test.describe('Canvas View @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, navigation }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
    await navigation.switchToCanvas();
    await page.waitForTimeout(300);
  });

  test('should display canvas view with canvas element', async ({ page, canvasView }) => {
    await expect(page.locator('#canvasContainer')).toBeVisible();
    await expect(canvasView.canvasElement).toBeVisible();
  });

  test('should zoom in with + button', async ({ page, canvasView }) => {
    const initialZoom = await canvasView.zoomInput.inputValue();
    await canvasView.zoomIn();
    const newZoom = await canvasView.zoomInput.inputValue();
    expect(Number(newZoom)).toBeGreaterThan(Number(initialZoom));
  });

  test('should zoom out with - button', async ({ page, canvasView }) => {
    // Zoom in first so we can zoom out
    await canvasView.zoomIn();
    await canvasView.zoomIn();
    const beforeZoom = await canvasView.zoomInput.inputValue();
    await canvasView.zoomOut();
    const afterZoom = await canvasView.zoomInput.inputValue();
    expect(Number(afterZoom)).toBeLessThan(Number(beforeZoom));
  });

  test('should set zoom via input field', async ({ page, canvasView }) => {
    await canvasView.setZoom(200);
    await expect(canvasView.zoomInput).toHaveValue('200');
  });

  test('should reset zoom', async ({ page, canvasView }) => {
    await canvasView.zoomIn();
    await canvasView.zoomIn();
    await canvasView.resetZoom();
    await expect(canvasView.zoomInput).toHaveValue('100');
  });

  test('should set canvas size to 4K DCI', async ({ page, canvasView }) => {
    await canvasView.setCanvasSize('4K_DCI');
    await expect(canvasView.canvasSizeSelect).toHaveValue('4K_DCI');
  });

  test('should set canvas size to HD', async ({ page, canvasView }) => {
    await canvasView.setCanvasSize('HD');
    await expect(canvasView.canvasSizeSelect).toHaveValue('HD');
  });

  test('should set custom canvas size', async ({ page, canvasView }) => {
    await canvasView.setCustomCanvasSize(2000, 1000);
    await expect(canvasView.canvasSizeSelect).toHaveValue('custom');
    // Custom W/H wrapper divs should be visible
    await expect(page.locator('#rasterCustomW')).toBeVisible();
    await expect(page.locator('#rasterCustomH')).toBeVisible();
  });

  test('should cycle through all canvas size options', async ({ page, canvasView }) => {
    const sizes = ['4K_UHD', '4K_DCI', 'HD', 'custom'];
    for (const size of sizes) {
      await canvasView.setCanvasSize(size);
      await expect(canvasView.canvasSizeSelect).toHaveValue(size);
    }
  });

  test('should set X and Y position', async ({ page, canvasView }) => {
    await canvasView.xPositionInput.scrollIntoViewIfNeeded();
    await canvasView.xPositionInput.fill('100');
    await canvasView.yPositionInput.fill('50');
    await canvasView.yPositionInput.blur();
    await page.waitForTimeout(200);
    await expect(canvasView.xPositionInput).toHaveValue('100');
    await expect(canvasView.yPositionInput).toHaveValue('50');
  });

  test('should toggle snap mode', async ({ page, canvasView }) => {
    await canvasView.snapToggleBtn.scrollIntoViewIfNeeded();
    // Snap is on by default
    await expect(canvasView.snapToggleBtn).toHaveClass(/active/);

    // Toggle off
    await canvasView.toggleSnap(false);
    await expect(canvasView.snapToggleBtn).not.toHaveClass(/active/);

    // Toggle on
    await canvasView.toggleSnap(true);
    await expect(canvasView.snapToggleBtn).toHaveClass(/active/);
  });

  test('should set fine pixel increment', async ({ page, canvasView }) => {
    await canvasView.fineInput.scrollIntoViewIfNeeded();
    await canvasView.fineInput.fill('5');
    await canvasView.fineInput.blur();
    await page.waitForTimeout(100);
    await expect(canvasView.fineInput).toHaveValue('5');
  });

  test('should set export filename', async ({ page, canvasView }) => {
    await canvasView.filenameInput.scrollIntoViewIfNeeded();
    await canvasView.filenameInput.fill('TestExport');
    await expect(canvasView.filenameInput).toHaveValue('TestExport');
  });

  test('should select export format PNG/JPEG/Resolume', async ({ page, canvasView }) => {
    await canvasView.formatSelect.scrollIntoViewIfNeeded();

    await canvasView.formatSelect.selectOption('jpeg');
    await expect(canvasView.formatSelect).toHaveValue('jpeg');

    await canvasView.formatSelect.selectOption('resolume');
    await expect(canvasView.formatSelect).toHaveValue('resolume');

    await canvasView.formatSelect.selectOption('png');
    await expect(canvasView.formatSelect).toHaveValue('png');
  });

  test('should show canvas undo/redo buttons', async ({ page }) => {
    const undoBtn = page.locator('#canvasUndoBtn');
    const redoBtn = page.locator('#canvasRedoBtn');
    await expect(undoBtn).toBeVisible();
    await expect(redoBtn).toBeVisible();
  });

  test('should show screen visibility toggles', async ({ page }) => {
    const toggleContainer = page.locator('#canvasScreenToggles');
    await expect(toggleContainer).toBeVisible();
    // Should have at least one screen toggle button
    const toggles = toggleContainer.locator('button');
    const count = await toggles.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
