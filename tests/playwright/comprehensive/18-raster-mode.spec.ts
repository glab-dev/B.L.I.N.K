import { test, expect } from '../fixtures/base';
import { CanvasHelpers } from '../helpers/canvas-helpers';

/**
 * Comprehensive Test: Raster Mode
 * Tests entry, screen table management, overlay toggles, canvas toolbar,
 * custom panel modal, canvas rendering, and save/load.
 */

test.describe('Raster Mode - Entry & Layout @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should enter raster mode from welcome page @critical', async ({ page, raster }) => {
    await raster.enterRasterMode();
    await expect(page.locator('#welcomePage')).not.toBeVisible();
    await expect(raster.screenTableContainer).toBeVisible();
  });

  test('should show canvas and screen table on entry', async ({ page, raster }) => {
    await raster.enterRasterMode();
    await expect(raster.canvasContainer).toBeVisible();
    await expect(raster.screenTableContainer).toBeVisible();
  });

  test('should hide canvas screen toggles in raster mode', async ({ page, raster }) => {
    await raster.enterRasterMode();
    await expect(page.locator('#canvasScreenToggles')).not.toBeVisible();
  });

  test('should show raster toolbar', async ({ page, raster }) => {
    await raster.enterRasterMode();
    await expect(page.locator('#rasterCanvasToolbar')).toBeVisible();
  });
});

test.describe('Raster Mode - Screen Table @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, raster }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await raster.enterRasterMode();
  });

  test('should render one default screen row @critical', async ({ raster }) => {
    const count = await raster.getScreenCount();
    expect(count).toBe(1);
  });

  test('should show all table columns', async ({ page, raster }) => {
    const headers = raster.screenTable.locator('thead th');
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('should add a new screen @critical', async ({ raster }) => {
    await raster.addScreen();
    const count = await raster.getScreenCount();
    expect(count).toBe(2);
  });

  test('should duplicate a screen', async ({ raster }) => {
    // Set name on first screen
    await raster.setScreenName(0, 'LED Wall A');
    await raster.duplicateScreen(0);
    const count = await raster.getScreenCount();
    expect(count).toBe(2);
    // Duplicated screen should have "(Copy)" suffix
    const name = await raster.getScreenName(1);
    expect(name).toContain('(Copy)');
  });

  test('should delete a screen', async ({ raster }) => {
    // Add a second screen first
    await raster.addScreen();
    expect(await raster.getScreenCount()).toBe(2);
    // Delete the second screen
    await raster.deleteScreen(1);
    expect(await raster.getScreenCount()).toBe(1);
  });

  test('should not delete the last screen', async ({ page, raster }) => {
    // Try to delete the only screen — should show alert
    await raster.deleteScreen(0);
    // The custom alert modal should appear
    const alertModal = page.locator('#customAlertModal');
    await expect(alertModal).toHaveClass(/active/);
    // Dismiss alert via OK button
    await page.locator('#customAlertOkBtn').click();
    await page.waitForTimeout(200);
    // Screen should still be there
    expect(await raster.getScreenCount()).toBe(1);
  });

  test('should edit screen name @critical', async ({ raster }) => {
    await raster.setScreenName(0, 'Main Stage');
    const name = await raster.getScreenName(0);
    expect(name).toBe('Main Stage');
  });

  test('should set panel type via dropdown', async ({ raster }) => {
    const row = raster.getScreenRows().nth(0);
    const select = row.locator('.raster-select');
    // Get available options and select one that isn't the default
    const options = await select.locator('option').all();
    // Select a known built-in panel if available
    await raster.selectPanel(0, 'CB5_MKII');
    await expect(select).toHaveValue('CB5_MKII');
  });

  test('should set columns and rows', async ({ raster }) => {
    await raster.setScreenCols(0, 8);
    await raster.setScreenRows(0, 4);
    const row = raster.getScreenRows().nth(0);
    // .raster-num order: Tile X(0), Tile Y(1), Cols(2), Rows(3), Offset X(4), Offset Y(5)
    const colsInput = row.locator('input.raster-num').nth(2);
    const rowsInput = row.locator('input.raster-num').nth(3);
    await expect(colsInput).toHaveValue('8');
    await expect(rowsInput).toHaveValue('4');
  });

  test('should set offset X and Y', async ({ raster }) => {
    await raster.setScreenOffset(0, 100, 50);
    const row = raster.getScreenRows().nth(0);
    const xInput = row.locator('input.raster-num').nth(4);
    const yInput = row.locator('input.raster-num').nth(5);
    await expect(xInput).toHaveValue('100');
    await expect(yInput).toHaveValue('50');
  });

  test('should show tile X and tile Y as readonly', async ({ raster }) => {
    const row = raster.getScreenRows().nth(0);
    const tileXCell = row.locator('td[data-label="Tile X"] input');
    const tileYCell = row.locator('td[data-label="Tile Y"] input');
    await expect(tileXCell).toHaveAttribute('readonly', '');
    await expect(tileYCell).toHaveAttribute('readonly', '');
  });
});

test.describe('Raster Mode - Overlay Toggles @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, raster }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await raster.enterRasterMode();
  });

  test('should toggle X/Y coordinates overlay', async ({ raster }) => {
    const btn = await raster.getOverlayButton(0, 0);
    // Check initial state
    const initialClass = await btn.getAttribute('class');
    const wasActive = initialClass?.includes('active');
    // Toggle
    await raster.toggleOverlay(0, 0);
    const newBtn = await raster.getOverlayButton(0, 0);
    if (wasActive) {
      await expect(newBtn).not.toHaveClass(/active/);
    } else {
      await expect(newBtn).toHaveClass(/active/);
    }
  });

  test('should toggle pixel dimensions overlay', async ({ raster }) => {
    const btn = await raster.getOverlayButton(0, 1);
    const initialClass = await btn.getAttribute('class');
    const wasActive = initialClass?.includes('active');
    await raster.toggleOverlay(0, 1);
    const newBtn = await raster.getOverlayButton(0, 1);
    if (wasActive) {
      await expect(newBtn).not.toHaveClass(/active/);
    } else {
      await expect(newBtn).toHaveClass(/active/);
    }
  });

  test('should toggle crosshair overlay', async ({ raster }) => {
    const btn = await raster.getOverlayButton(0, 2);
    const initialClass = await btn.getAttribute('class');
    const wasActive = initialClass?.includes('active');
    await raster.toggleOverlay(0, 2);
    const newBtn = await raster.getOverlayButton(0, 2);
    if (wasActive) {
      await expect(newBtn).not.toHaveClass(/active/);
    } else {
      await expect(newBtn).toHaveClass(/active/);
    }
  });

  test('should toggle screen visibility @critical', async ({ raster }) => {
    const btn = await raster.getActiveButton(0);
    const initialClass = await btn.getAttribute('class');
    const wasActive = initialClass?.includes('active');
    await raster.toggleScreenVisible(0);
    const newBtn = await raster.getActiveButton(0);
    if (wasActive) {
      await expect(newBtn).not.toHaveClass(/active/);
    } else {
      await expect(newBtn).toHaveClass(/active/);
    }
  });
});

test.describe('Raster Mode - Canvas Toolbar @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, raster }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await raster.enterRasterMode();
  });

  test('should have default canvas size 4K UHD', async ({ raster }) => {
    await expect(raster.toolbarCanvasSize).toHaveValue('4K_UHD');
  });

  test('should set canvas size to 4K DCI', async ({ raster }) => {
    await raster.setCanvasSize('4K_DCI');
    await expect(raster.toolbarCanvasSize).toHaveValue('4K_DCI');
  });

  test('should set canvas size to HD', async ({ raster }) => {
    await raster.setCanvasSize('HD');
    await expect(raster.toolbarCanvasSize).toHaveValue('HD');
  });

  test('should show custom inputs when custom selected', async ({ page, raster }) => {
    await raster.setCanvasSize('custom');
    await expect(page.locator('#rasterCustomW')).toBeVisible();
    await expect(page.locator('#rasterCustomH')).toBeVisible();
  });

  test('should hide custom inputs when preset selected', async ({ page, raster }) => {
    await raster.setCanvasSize('custom');
    await expect(page.locator('#rasterCustomW')).toBeVisible();
    await raster.setCanvasSize('4K_UHD');
    await expect(page.locator('#rasterCustomW')).not.toBeVisible();
  });

  test('should set custom canvas size', async ({ raster }) => {
    await raster.setCustomCanvasSize(2560, 1440);
    await expect(raster.toolbarCustomW).toHaveValue('2560');
    await expect(raster.toolbarCustomH).toHaveValue('1440');
  });

  test('should toggle snap mode', async ({ raster }) => {
    // Snap is on by default
    await expect(raster.toolbarSnap).toHaveClass(/active/);
    await raster.toggleSnap(false);
    await expect(raster.toolbarSnap).not.toHaveClass(/active/);
    await raster.toggleSnap(true);
    await expect(raster.toolbarSnap).toHaveClass(/active/);
  });

  test('should set fine pixel increment', async ({ raster }) => {
    await raster.toolbarFine.fill('5');
    await raster.toolbarFine.blur();
    await raster.page.waitForTimeout(100);
    await expect(raster.toolbarFine).toHaveValue('5');
  });

  test('should set export filename', async ({ raster }) => {
    await raster.toolbarFilename.fill('TestRaster');
    await expect(raster.toolbarFilename).toHaveValue('TestRaster');
  });

  test('should select export formats', async ({ raster }) => {
    await raster.toolbarFormat.selectOption('jpeg');
    await expect(raster.toolbarFormat).toHaveValue('jpeg');
    await raster.toolbarFormat.selectOption('resolume');
    await expect(raster.toolbarFormat).toHaveValue('resolume');
    await raster.toolbarFormat.selectOption('png');
    await expect(raster.toolbarFormat).toHaveValue('png');
  });
});

test.describe('Raster Mode - Custom Panel Modal @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, raster }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await raster.enterRasterMode();
  });

  test('should open custom panel modal from dropdown @critical', async ({ raster }) => {
    await raster.openCustomPanelModal(0);
    await expect(raster.customPanelModal).toHaveClass(/active/);
  });

  test('should close custom panel modal via close button', async ({ raster }) => {
    await raster.openCustomPanelModal(0);
    await expect(raster.customPanelModal).toHaveClass(/active/);
    await raster.cpCloseBtn.click();
    await raster.page.waitForTimeout(200);
    await expect(raster.customPanelModal).not.toHaveClass(/active/);
  });

  test('should save a custom panel @critical', async ({ page, raster }) => {
    await raster.openCustomPanelModal(0);
    await raster.fillAndSaveCustomPanel('TestBrand', 'TestModel', 192, 192);
    // Modal should close
    await expect(raster.customPanelModal).not.toHaveClass(/active/);
    // Panel dropdown should now contain the custom panel
    const row = raster.getScreenRows().nth(0);
    const select = row.locator('.raster-select');
    const selectedValue = await select.inputValue();
    expect(selectedValue).toContain('TestModel');
  });
});

test.describe('Raster Mode - Canvas Rendering @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, raster }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await raster.enterRasterMode();
  });

  test('should render canvas after setting dimensions @critical', async ({ page, raster }) => {
    await raster.setScreenCols(0, 4);
    await raster.setScreenRows(0, 3);
    await page.waitForTimeout(500);
    const isDrawn = await CanvasHelpers.isCanvasDrawn(raster.canvasElement);
    expect(isDrawn).toBe(true);
  });

  test('should update canvas after adding a screen', async ({ page, raster }) => {
    await raster.setScreenCols(0, 4);
    await raster.setScreenRows(0, 3);
    await raster.addScreen();
    await raster.setScreenCols(1, 2);
    await raster.setScreenRows(1, 2);
    await page.waitForTimeout(500);
    const isDrawn = await CanvasHelpers.isCanvasDrawn(raster.canvasElement);
    expect(isDrawn).toBe(true);
  });
});

test.describe('Raster Mode - Save/Load @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, raster }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await raster.enterRasterMode();
  });

  test('should trigger save raster file download @critical', async ({ page, raster, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || !!isMobile, 'Download tests only work on Chromium desktop');
    // Disable showSaveFilePicker so it falls through to blob download
    await page.evaluate(() => { (window as any).showSaveFilePicker = undefined; });
    await raster.toolbarFilename.fill('TestRaster');
    const downloadPromise = page.waitForEvent('download');
    // Click the save button in the canvas toolbar
    await page.locator('.toolbar-save button').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.blinkrast$/);
  });

  test('should load a raster file @critical', async ({ page, raster }) => {
    // Create a valid .blinkrast file with 2 screens
    const rasterData = {
      type: 'raster',
      version: 1,
      canvas: {
        size: '4K_UHD',
        customW: 3840,
        customH: 2160,
        snapMode: true,
        arrowKeyIncrement: 1
      },
      screens: {
        screen_1: {
          name: 'Screen Alpha',
          color: '#ff0000',
          color2: '#cc0000',
          visible: true,
          data: {
            panelType: 'CB5_MKII',
            panelsWide: 4,
            panelsHigh: 3,
            canvasX: 0,
            canvasY: 0,
            showCoordinates: true,
            showPixelDimensions: true,
            showCrosshair: false
          }
        },
        screen_2: {
          name: 'Screen Beta',
          color: '#00ff00',
          color2: '#00cc00',
          visible: false,
          data: {
            panelType: 'CB5_MKII',
            panelsWide: 2,
            panelsHigh: 2,
            canvasX: 100,
            canvasY: 0,
            showCoordinates: true,
            showPixelDimensions: false,
            showCrosshair: false
          }
        }
      },
      canvases: {},
      customPanels: []
    };
    const buffer = Buffer.from(JSON.stringify(rasterData));
    await raster.loadRasterInput.setInputFiles({
      name: 'test.blinkrast',
      mimeType: 'application/json',
      buffer
    });
    await page.waitForTimeout(1000);
    // Verify 2 screen rows loaded
    const count = await raster.getScreenCount();
    expect(count).toBe(2);
  });
});
