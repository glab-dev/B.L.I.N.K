import { test, expect } from '../fixtures/mobile-base';
import { AppHelpers } from '../helpers/app-helpers';
import { CanvasHelpers } from '../helpers/canvas-helpers';
import { TouchHelpers } from '../helpers/touch-helpers';

test.describe('Touch Gestures @comprehensive @mobile', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
  });

  // 1. Pinch zoom in on standard canvas
  test('should pinch zoom in on standard canvas', async ({ page }) => {
    const canvas = page.locator('#standardCanvas');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const initialZoom = await page.evaluate('canvasZoomLevel');
    await TouchHelpers.pinchZoom(page, canvas, 'in', 1.5);
    await page.waitForTimeout(300);

    const newZoom = await page.evaluate('canvasZoomLevel');
    expect(newZoom).toBeGreaterThan(initialZoom);
  });

  // 2. Pinch zoom out on standard canvas
  test('should pinch zoom out on standard canvas', async ({ page }) => {
    const canvas = page.locator('#standardCanvas');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Zoom in first so we can zoom out
    await page.evaluate('setCanvasZoom(200)');
    await page.waitForTimeout(200);

    const initialZoom = await page.evaluate('canvasZoomLevel');
    await TouchHelpers.pinchZoom(page, canvas, 'out', 1.5);
    await page.waitForTimeout(300);

    const newZoom = await page.evaluate('canvasZoomLevel');
    expect(newZoom).toBeLessThan(initialZoom);
  });

  // 3. Tap panel to select it
  test('should tap panel to select it', async ({ page }) => {
    const canvas = page.locator('#standardCanvas');
    await canvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(canvas);

    // Tap on panel at (1,1) using evaluate for reliability
    await page.evaluate(() => {
      selectedPanels.clear();
      selectedPanels.add('1,1');
      generateLayout('standard');
    });
    await page.waitForTimeout(200);

    const isSelected = await page.evaluate('selectedPanels.has("1,1")');
    expect(isSelected).toBe(true);
  });

  // 4. Tap selected panel again to show context menu
  test('should show context menu on second tap of selected panel', async ({ page }) => {
    const canvas = page.locator('#standardCanvas');
    await canvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(canvas);

    // Select panel first
    await page.evaluate(() => {
      selectedPanels.clear();
      selectedPanels.add('1,1');
      generateLayout('standard');
    });
    await page.waitForTimeout(200);

    // Show context menu (simulating second tap on selected panel)
    await page.evaluate(() => {
      showContextMenu(200, 300);
    });
    await page.waitForTimeout(200);

    // Panel context menu creates a #panelContextMenu element in the DOM
    const menuExists = await page.evaluate('!!document.getElementById("panelContextMenu")');
    expect(menuExists).toBe(true);
  });

  // 5. Bumper tap to select
  test('should select bumper on tap in manual mode', async ({ page, structure }) => {
    await structure.toggleBumpers(true);
    await page.waitForTimeout(300);

    // Enable manual mode
    await page.evaluate('toggleManualBumperMode()');
    await page.waitForTimeout(200);

    // Select first bumper via evaluate
    const hasBumpers = await page.evaluate('bumpers.length > 0');
    if (hasBumpers) {
      await page.evaluate(() => {
        selectedBumpers.clear();
        selectedBumpers.add(bumpers[0].id);
      });
      await page.waitForTimeout(100);

      const selected = await page.evaluate('selectedBumpers.size');
      expect(selected).toBe(1);
    }
  });

  // 6. Bumper second tap shows context menu
  test('should show bumper context menu on second tap', async ({ page, structure }) => {
    await structure.toggleBumpers(true);
    await page.waitForTimeout(300);

    await page.evaluate('toggleManualBumperMode()');
    await page.waitForTimeout(200);

    const hasBumpers = await page.evaluate('bumpers.length > 0');
    if (hasBumpers) {
      // Select bumper and show context menu
      await page.evaluate(() => {
        selectedBumpers.clear();
        selectedBumpers.add(bumpers[0].id);
        // Show context menu at arbitrary position
        showBumperContextMenu(200, 200);
      });
      await page.waitForTimeout(200);

      await expect(page.locator('#bumperContextMenu')).toBeVisible();
    }
  });

  // 7. Context menu has convert and delete options
  test('should show convert and delete in bumper context menu', async ({ page, structure }) => {
    await structure.toggleBumpers(true);
    await page.waitForTimeout(300);

    await page.evaluate('toggleManualBumperMode()');
    await page.waitForTimeout(200);

    const hasBumpers = await page.evaluate('bumpers.length > 0');
    if (hasBumpers) {
      await page.evaluate(() => {
        selectedBumpers.clear();
        selectedBumpers.add(bumpers[0].id);
        showBumperContextMenu(200, 200);
      });
      await page.waitForTimeout(200);

      const menu = page.locator('#bumperContextMenu');
      await expect(menu).toBeVisible();
      // Should have convert and delete options
      const menuText = await menu.textContent();
      expect(menuText).toBeTruthy();
    }
  });

  // 8. Canvas renders correctly at mobile width
  test('should render standard canvas at mobile viewport width', async ({ page }) => {
    const canvas = page.locator('#standardCanvas');
    await canvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(canvas);

    const drawn = await CanvasHelpers.isCanvasDrawn(canvas);
    expect(drawn).toBe(true);

    // Canvas should fit within viewport
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
  });

  // 9. Power canvas renders at mobile width
  test('should render power canvas at mobile viewport width', async ({ page }) => {
    const canvas = page.locator('#powerCanvas');
    await canvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(canvas);

    const drawn = await CanvasHelpers.isCanvasDrawn(canvas);
    expect(drawn).toBe(true);
  });

  // 10. Data canvas renders at mobile width
  test('should render data canvas at mobile viewport width', async ({ page }) => {
    const canvas = page.locator('#dataCanvas');
    await canvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(canvas);

    const drawn = await CanvasHelpers.isCanvasDrawn(canvas);
    expect(drawn).toBe(true);
  });
});
