import { test, expect } from '../fixtures/base';
import { AppHelpers } from '../helpers/app-helpers';
import { CanvasHelpers } from '../helpers/canvas-helpers';

/**
 * Comprehensive Test: Cabling Section
 * Tests all cabling inputs, cable drop/power in positions, dist box controls,
 * and cable diagram canvas rendering.
 */
test.describe('Cabling Section @comprehensive @desktop', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 6, 4);
    // Navigate to gear tab where cabling section lives
    await page.locator('button[data-mode="gear"]').click();
    await page.waitForTimeout(300);
  });

  // ── Distance Inputs ──

  test('should display cabling section with all inputs', async ({ page, gearList }) => {
    await expect(gearList.wallToFloorInput).toBeVisible();
    await expect(gearList.cablePickInput).toBeVisible();
    await expect(gearList.distroToWallInput).toBeVisible();
    await expect(gearList.processorToWallInput).toBeVisible();
    await expect(gearList.serverToProcessorInput).toBeVisible();
  });

  test('should set Wall to Floor distance', async ({ page, gearList }) => {
    await gearList.setCableLength('wallToFloor', 10);
    await expect(gearList.wallToFloorInput).toHaveValue('10');
  });

  test('should set Cable Pick distance', async ({ page, gearList }) => {
    await gearList.setCableLength('cablePick', 5);
    await expect(gearList.cablePickInput).toHaveValue('5');
  });

  test('should set Distro to Wall distance', async ({ page, gearList }) => {
    await gearList.setCableLength('distroToWall', 15);
    await expect(gearList.distroToWallInput).toHaveValue('15');
  });

  test('should set Processor to Wall distance', async ({ page, gearList }) => {
    await gearList.setCableLength('processorToWall', 20);
    await expect(gearList.processorToWallInput).toHaveValue('20');
  });

  test('should set Server to Processor distance', async ({ page, gearList }) => {
    await gearList.setCableLength('serverToProcessor', 75);
    await expect(gearList.serverToProcessorInput).toHaveValue('75');
  });

  // ── Cable Drop Position ──

  test('should switch cable drop to SR', async ({ page, gearList }) => {
    await gearList.setCableDropPosition('sr');
    await expect(gearList.cableDropSRBtn).toHaveClass(/active/);
    await expect(gearList.cableDropBehindBtn).not.toHaveClass(/active/);
  });

  test('should switch cable drop to SL', async ({ page, gearList }) => {
    await gearList.setCableDropPosition('sl');
    await expect(gearList.cableDropSLBtn).toHaveClass(/active/);
    await expect(gearList.cableDropBehindBtn).not.toHaveClass(/active/);
  });

  test('should switch cable drop back to Behind', async ({ page, gearList }) => {
    await gearList.setCableDropPosition('sr');
    await gearList.setCableDropPosition('behind');
    await expect(gearList.cableDropBehindBtn).toHaveClass(/active/);
    await expect(gearList.cableDropSRBtn).not.toHaveClass(/active/);
  });

  // ── Power In Position ──

  test('should switch power in position to Bottom', async ({ page, gearList }) => {
    await gearList.setPowerInPosition('bottom');
    await expect(gearList.powerInBottomBtn).toHaveClass(/active/);
    await expect(gearList.powerInTopBtn).not.toHaveClass(/active/);
  });

  test('should switch power in position to Top', async ({ page, gearList }) => {
    await gearList.setPowerInPosition('bottom');
    await gearList.setPowerInPosition('top');
    await expect(gearList.powerInTopBtn).toHaveClass(/active/);
    await expect(gearList.powerInBottomBtn).not.toHaveClass(/active/);
  });

  // ── Dist Box On Wall ──

  test('should toggle dist box on wall', async ({ page, gearList }) => {
    // Click to enable dist box
    await page.locator('#distBoxOnWallLabel').click();
    await page.waitForTimeout(200);
    // Check mark should appear
    const checkText = await page.locator('#distBoxOnWallCheck').textContent();
    expect(checkText).toContain('✓');
    // Position controls should become visible
    await expect(gearList.distBoxPositionControls).toBeVisible();
  });

  test('should set main dist box horizontal position SR/C/SL', async ({ page, gearList }) => {
    // Enable dist box first
    await page.locator('#distBoxOnWallLabel').click();
    await page.waitForTimeout(200);

    await gearList.setDistBoxMainHorizPosition('sr');
    await expect(gearList.distBoxMainHorizSRBtn).toHaveClass(/active/);

    await gearList.setDistBoxMainHorizPosition('center');
    await expect(gearList.distBoxMainHorizCBtn).toHaveClass(/active/);
    await expect(gearList.distBoxMainHorizSRBtn).not.toHaveClass(/active/);

    await gearList.setDistBoxMainHorizPosition('sl');
    await expect(gearList.distBoxMainHorizSLBtn).toHaveClass(/active/);
  });

  test('should set main dist box vertical position Top/Bot', async ({ page, gearList }) => {
    await page.locator('#distBoxOnWallLabel').click();
    await page.waitForTimeout(200);

    await gearList.setDistBoxMainVertPosition('bottom');
    await expect(gearList.distBoxMainBottomBtn).toHaveClass(/active/);
    await expect(gearList.distBoxMainTopBtn).not.toHaveClass(/active/);

    await gearList.setDistBoxMainVertPosition('top');
    await expect(gearList.distBoxMainTopBtn).toHaveClass(/active/);
  });

  // ── Cable Diagram Canvas ──

  test('should render cable diagram canvas', async ({ page, gearList }) => {
    await gearList.cableDiagramCanvas.scrollIntoViewIfNeeded();
    await expect(gearList.cableDiagramCanvas).toBeVisible();
    const hasContent = await CanvasHelpers.isCanvasDrawn(gearList.cableDiagramCanvas);
    expect(hasContent).toBe(true);
  });

  test('should update cable diagram when drop position changes', async ({ page, gearList }) => {
    await gearList.cableDiagramCanvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Get initial canvas state
    const initialData = await CanvasHelpers.getCanvasPixelData(gearList.cableDiagramCanvas);

    // Change cable drop position
    await gearList.setCableDropPosition('sr');
    await page.waitForTimeout(500);

    // Get updated canvas state
    const updatedData = await CanvasHelpers.getCanvasPixelData(gearList.cableDiagramCanvas);

    // Canvas should have changed
    expect(initialData).not.toEqual(updatedData);
  });

  // ── Gear List Content ──

  test('should display populated gear list content', async ({ page, gearList }) => {
    const gearContent = page.locator('#gearListContent');
    await expect(gearContent).toBeVisible();
    const text = await gearContent.textContent();
    expect(text!.length).toBeGreaterThan(0);
  });
});
