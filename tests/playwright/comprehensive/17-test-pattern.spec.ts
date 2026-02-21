import { test, expect } from '../fixtures/base';
import { CanvasHelpers } from '../helpers/canvas-helpers';

/**
 * Comprehensive Test: Test Pattern Generator
 * Tests navigation, screen dimensions, text/grid/checker/border/circles/sweep options,
 * toolbar, menus, layers panel, canvas rendering, and export/save/load.
 */

test.describe('Test Pattern - Navigation @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should enter test pattern mode from welcome page @critical', async ({ page, testPattern }) => {
    await testPattern.enterTestPatternMode();
    await expect(testPattern.testPatternPage).toBeVisible();
    await expect(page.locator('#welcomePage')).not.toBeVisible();
  });

  test('should show canvas on entry @critical', async ({ page, testPattern }) => {
    await testPattern.enterTestPatternMode();
    await expect(testPattern.canvas).toBeVisible();
    const isDrawn = await CanvasHelpers.isCanvasDrawn(testPattern.canvas);
    expect(isDrawn).toBe(true);
  });

  test('should return to welcome page via home button @critical', async ({ page, testPattern }) => {
    await testPattern.enterTestPatternMode();
    await testPattern.exitToWelcome();
    await expect(page.locator('#welcomePage')).toBeVisible();
    await expect(testPattern.testPatternPage).not.toBeVisible();
  });

  test('should hide main app header and nav in test pattern mode', async ({ page, testPattern }) => {
    await testPattern.enterTestPatternMode();
    await expect(page.locator('.mobile-header')).not.toBeVisible();
    await expect(page.locator('.bottom-nav')).not.toBeVisible();
  });
});

test.describe('Test Pattern - Screen Dimensions @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, testPattern }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await testPattern.enterTestPatternMode();
  });

  test('should have default display size 1920x1080', async ({ testPattern }) => {
    await expect(testPattern.displayWInput).toHaveValue('1920');
    await expect(testPattern.displayHInput).toHaveValue('1080');
  });

  test('should have default total size 1920x1080', async ({ testPattern }) => {
    await expect(testPattern.totalWInput).toHaveValue('1920');
    await expect(testPattern.totalHInput).toHaveValue('1080');
  });

  test('should update total size when display size changes', async ({ testPattern }) => {
    await testPattern.setDisplaySize(3840, 2160);
    await expect(testPattern.totalWInput).toHaveValue('3840');
    await expect(testPattern.totalHInput).toHaveValue('2160');
  });

  test('should compute total from display size x grid count', async ({ testPattern }) => {
    await testPattern.setDisplayGrid(2, 2);
    // 1920 * 2 = 3840, 1080 * 2 = 2160
    await expect(testPattern.totalWInput).toHaveValue('3840');
    await expect(testPattern.totalHInput).toHaveValue('2160');
  });

  test('should set image name', async ({ testPattern }) => {
    await testPattern.imageNameInput.fill('My Test Pattern');
    await expect(testPattern.imageNameInput).toHaveValue('My Test Pattern');
  });
});

test.describe('Test Pattern - Text Options @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, testPattern }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await testPattern.enterTestPatternMode();
  });

  test('should have all text checkboxes checked by default', async ({ testPattern }) => {
    await expect(testPattern.showNameCheckbox).toBeChecked();
    await expect(testPattern.showPixelSizeCheckbox).toBeChecked();
    await expect(testPattern.showAspectRatioCheckbox).toBeChecked();
    await expect(testPattern.showSquareCountCheckbox).toBeChecked();
  });

  test('should toggle show name checkbox', async ({ testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.showNameCheckbox, false);
    await expect(testPattern.showNameCheckbox).not.toBeChecked();
    await testPattern.toggleCheckbox(testPattern.showNameCheckbox, true);
    await expect(testPattern.showNameCheckbox).toBeChecked();
  });

  test('should toggle show pixel size checkbox', async ({ testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.showPixelSizeCheckbox, false);
    await expect(testPattern.showPixelSizeCheckbox).not.toBeChecked();
  });

  test('should toggle show aspect ratio checkbox', async ({ testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.showAspectRatioCheckbox, false);
    await expect(testPattern.showAspectRatioCheckbox).not.toBeChecked();
  });

  test('should toggle show square count checkbox', async ({ testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.showSquareCountCheckbox, false);
    await expect(testPattern.showSquareCountCheckbox).not.toBeChecked();
  });

  test('should adjust text size slider', async ({ page, testPattern }) => {
    await testPattern.setSlider('tpTextSize', 75);
    const valText = await page.locator('#tpTextSizeVal').textContent();
    expect(valText).toBe('75%');
  });
});

test.describe('Test Pattern - Grid Options @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, testPattern }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await testPattern.enterTestPatternMode();
  });

  test('should have default color values', async ({ testPattern }) => {
    await expect(testPattern.gridColor).toHaveValue('#d23de6');
    await expect(testPattern.crossColor).toHaveValue('#00ff7b');
    await expect(testPattern.boundaryColor).toHaveValue('#249be5');
    await expect(testPattern.bgColor).toHaveValue('#000000');
  });

  test('should adjust grid size slider', async ({ page, testPattern }) => {
    await testPattern.setSlider('tpGridSize', 80);
    const valText = await page.locator('#tpGridSizeVal').textContent();
    expect(valText).toBe('80%');
  });

  test('should adjust grid width slider', async ({ page, testPattern }) => {
    await testPattern.setSlider('tpGridWidth', 30);
    const valText = await page.locator('#tpGridWidthVal').textContent();
    expect(valText).toBe('30%');
  });
});

test.describe('Test Pattern - Checker & Border @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, testPattern }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await testPattern.enterTestPatternMode();
  });

  test('should have checker off by default', async ({ testPattern }) => {
    await expect(testPattern.checkerCheckbox).not.toBeChecked();
  });

  test('should toggle checker on', async ({ testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.checkerCheckbox, true);
    await expect(testPattern.checkerCheckbox).toBeChecked();
  });

  test('should adjust checker size when enabled', async ({ page, testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.checkerCheckbox, true);
    await testPattern.setSlider('tpCheckerSize', 70);
    const valText = await page.locator('#tpCheckerSizeVal').textContent();
    expect(valText).toBe('70%');
  });

  test('should have border off by default', async ({ testPattern }) => {
    await expect(testPattern.borderCheckbox).not.toBeChecked();
  });

  test('should toggle border on', async ({ testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.borderCheckbox, true);
    await expect(testPattern.borderCheckbox).toBeChecked();
  });

  test('should adjust border size when enabled', async ({ page, testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.borderCheckbox, true);
    await testPattern.setSlider('tpBorderSize', 60);
    // Border size label uses a different val span
    const slider = await page.locator('#tpBorderSize');
    await expect(slider).toHaveValue('60');
  });
});

test.describe('Test Pattern - Circles & Color Bars @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, testPattern }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await testPattern.enterTestPatternMode();
  });

  test('should have circles on by default', async ({ testPattern }) => {
    await expect(testPattern.circlesCheckbox).toBeChecked();
  });

  test('should toggle circles off and on', async ({ testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.circlesCheckbox, false);
    await expect(testPattern.circlesCheckbox).not.toBeChecked();
    await testPattern.toggleCheckbox(testPattern.circlesCheckbox, true);
    await expect(testPattern.circlesCheckbox).toBeChecked();
  });

  test('should change circle spin mode', async ({ testPattern }) => {
    await testPattern.circleSpinModeSelect.selectOption('center');
    await expect(testPattern.circleSpinModeSelect).toHaveValue('center');
  });

  test('should have color bars on by default', async ({ testPattern }) => {
    await expect(testPattern.colorBarsCheckbox).toBeChecked();
  });

  test('should change color bars mode', async ({ testPattern }) => {
    await testPattern.colorBarsModeSelect.selectOption('center');
    await expect(testPattern.colorBarsModeSelect).toHaveValue('center');
  });
});

test.describe('Test Pattern - Sweep @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, testPattern }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await testPattern.enterTestPatternMode();
  });

  test('should have sweep off by default', async ({ testPattern }) => {
    await expect(testPattern.sweepCheckbox).not.toBeChecked();
  });

  test('should toggle sweep on', async ({ testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.sweepCheckbox, true);
    await expect(testPattern.sweepCheckbox).toBeChecked();
  });

  test('should adjust sweep duration', async ({ page, testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.sweepCheckbox, true);
    await testPattern.setSlider('tpSweepDuration', 3);
    const valText = await page.locator('#tpSweepDurationVal').textContent();
    expect(valText).toBe('3s');
  });
});

test.describe('Test Pattern - Processor Lines @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, testPattern }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await testPattern.enterTestPatternMode();
  });

  test('should have processor lines off by default', async ({ testPattern }) => {
    await expect(testPattern.processorLinesToggle).not.toBeChecked();
  });

  test('should toggle processor lines on', async ({ testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.processorLinesToggle, true);
    await expect(testPattern.processorLinesToggle).toBeChecked();
  });

  test('should show custom size inputs when custom selected', async ({ testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.processorLinesToggle, true);
    await testPattern.processorCanvasSizeSelect.selectOption('custom');
    await expect(testPattern.processorCustomSizeContainer).toBeVisible();
  });

  test('should hide custom size when preset selected', async ({ testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.processorLinesToggle, true);
    await testPattern.processorCanvasSizeSelect.selectOption('custom');
    await expect(testPattern.processorCustomSizeContainer).toBeVisible();
    await testPattern.processorCanvasSizeSelect.selectOption('4K_UHD');
    await expect(testPattern.processorCustomSizeContainer).not.toBeVisible();
  });
});

test.describe('Test Pattern - Toolbar & Menus @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, testPattern }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await testPattern.enterTestPatternMode();
  });

  test('should open and close hamburger menu', async ({ testPattern }) => {
    await testPattern.openHamburgerMenu();
    await expect(testPattern.hamburgerMenu).toBeVisible();
    // Click hamburger again to close
    await testPattern.hamburgerBtn.click();
    await testPattern.page.waitForTimeout(200);
    await expect(testPattern.hamburgerMenu).not.toBeVisible();
  });

  test('should open and close layers panel', async ({ testPattern }) => {
    await testPattern.openLayersPanel();
    await expect(testPattern.layersPanel).toBeVisible();
    await testPattern.closeLayersPanel();
    await expect(testPattern.layersPanel).not.toBeVisible();
  });

  test('should display layer items in layers panel', async ({ testPattern }) => {
    await testPattern.openLayersPanel();
    const items = testPattern.layersList.locator('.tp-layer-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have undo disabled initially', async ({ testPattern }) => {
    await expect(testPattern.undoBtn).toBeDisabled();
  });

  test('should have redo disabled initially', async ({ testPattern }) => {
    await expect(testPattern.redoBtn).toBeDisabled();
  });

  test('should reset pattern to defaults @critical', async ({ page, testPattern }) => {
    // Change image name
    await testPattern.imageNameInput.fill('Custom Name');
    await expect(testPattern.imageNameInput).toHaveValue('Custom Name');
    // Change display size
    await testPattern.setDisplaySize(3840, 2160);
    // Reset
    await testPattern.resetPattern();
    // Verify defaults restored
    await expect(testPattern.displayWInput).toHaveValue('1920');
    await expect(testPattern.displayHInput).toHaveValue('1080');
  });
});

test.describe('Test Pattern - Canvas Rendering @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, testPattern }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await testPattern.enterTestPatternMode();
  });

  test('should render non-blank canvas on entry @critical', async ({ testPattern }) => {
    await CanvasHelpers.waitForCanvasRender(testPattern.canvas);
    const isDrawn = await CanvasHelpers.isCanvasDrawn(testPattern.canvas);
    expect(isDrawn).toBe(true);
  });

  test('should re-render after dimension change', async ({ testPattern }) => {
    await testPattern.setDisplaySize(3840, 2160);
    await testPattern.page.waitForTimeout(600);
    const isDrawn = await CanvasHelpers.isCanvasDrawn(testPattern.canvas);
    expect(isDrawn).toBe(true);
  });

  test('should re-render after toggling checker', async ({ testPattern }) => {
    await testPattern.toggleCheckbox(testPattern.checkerCheckbox, true);
    await testPattern.page.waitForTimeout(300);
    const isDrawn = await CanvasHelpers.isCanvasDrawn(testPattern.canvas);
    expect(isDrawn).toBe(true);
  });
});

test.describe('Test Pattern - Export & Save/Load @comprehensive @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage, testPattern }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await testPattern.enterTestPatternMode();
  });

  test('should export PNG via hamburger menu @critical', async ({ page, testPattern, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || !!isMobile, 'Download tests only work on Chromium desktop');
    const downloadPromise = page.waitForEvent('download');
    await testPattern.openHamburgerMenu();
    await testPattern.menuExportPng.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });

  test('should save pattern file @critical', async ({ page, testPattern, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || !!isMobile, 'Download tests only work on Chromium desktop');
    // Disable showSaveFilePicker so it falls through to blob download
    await page.evaluate(() => { (window as any).showSaveFilePicker = undefined; });
    const downloadPromise = page.waitForEvent('download');
    await testPattern.quickSaveBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.blinktp$/);
  });

  test('should load pattern file and restore state', async ({ page, testPattern }) => {
    // Create a valid pattern file matching tpSavePatternFile output format.
    // State keys use internal variable names (e.g. tpCirclesOn, tpCheckerOn).
    const patternData = {
      type: 'testpattern',
      version: '1.0',
      timestamp: new Date().toISOString(),
      name: 'Test Load',
      state: {
        tpDisplayW: 2560,
        tpDisplayH: 1440,
        tpDisplaysWide: 1,
        tpDisplaysHigh: 1,
        tpImageName: 'Test Load',
        tpShowName: true,
        tpShowPixelSize: true,
        tpShowAspectRatio: true,
        tpShowSquareCount: true,
        tpCirclesOn: true,
        tpColorBarsOn: true,
        tpColorBarsMode: 'default',
        tpColorBarsOpacity: 100,
        tpCheckerOn: false,
        tpCheckerBorderOn: false,
        tpSweepOn: false,
        tpLogoOn: false,
        tpBgImageOn: false,
        tpProcessorLinesOn: false,
        tpGridSizePct: 50,
        tpGridWidthPct: 50,
        tpTextSizePct: 50,
        tpTextColor: '#ffffff',
        tpGridColor: '#d23de6',
        tpCrossColor: '#00ff7b',
        tpBoundaryColor: '#249be5',
        tpBgColor: '#000000',
        tpCircleSpinMode: 'static',
        tpCircleRevMode: 'none',
        tpCircleSpinSpeed: 50,
        tpCheckerColor1: '#000000',
        tpCheckerColor2: '#1a1a1a',
        tpCheckerSizePct: 50,
        tpCheckerOpacity: 100,
        tpBorderColor1: '#ffffff',
        tpBorderColor2: '#000000',
        tpBorderSizePct: 50,
        tpBorderOpacity: 100,
        tpSweepColor: '#ffffff',
        tpSweepColorV: '#ffffff',
        tpSweepDuration: 5,
        tpSweepWidthPct: 2,
        tpSweepFps: 60,
        tpLogoImage: null,
        tpLogoSizePct: 50,
        tpLogoMode: 'default',
        tpLogoStatic: false,
        tpLogoOpacity: 100,
        tpBgImage: null,
        tpProcessorCanvasSize: '4K_UHD',
        tpProcessorCanvasW: 3840,
        tpProcessorCanvasH: 2160,
        tpProcessorLineColor: '#ff0000',
        tpLayerOrder: ['checker', 'bgImage', 'checkerBorder', 'grid', 'displayBoundaries', 'processorLines', 'circles', 'crosshair', 'colorBars', 'logo', 'outerBorder', 'sweep']
      }
    };
    const buffer = Buffer.from(JSON.stringify(patternData));
    await testPattern.loadPatternInput.setInputFiles({
      name: 'test.blinktp',
      mimeType: 'application/json',
      buffer
    });
    await page.waitForTimeout(1000);
    // Verify restored state
    await expect(testPattern.displayWInput).toHaveValue('2560');
    await expect(testPattern.displayHInput).toHaveValue('1440');
  });
});
