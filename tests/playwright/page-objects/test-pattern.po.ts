import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Test Pattern Generator
 * Handles navigation, screen dimensions, text/grid/checker/border/circles/sweep options,
 * layers panel, toolbar, menus, canvas rendering, and export/save/load
 */
export class TestPatternPage {
  readonly page: Page;

  // Page container & canvas
  readonly testPatternPage: Locator;
  readonly canvas: Locator;

  // Toolbar buttons
  readonly undoBtn: Locator;
  readonly redoBtn: Locator;
  readonly toolbarResetBtn: Locator;
  readonly quickSaveBtn: Locator;
  readonly quickLoadBtn: Locator;
  readonly quickShareBtn: Locator;
  readonly homeBtn: Locator;

  // Share popup
  readonly sharePopup: Locator;
  readonly sharePngBtn: Locator;
  readonly shareMp4Btn: Locator;

  // Hamburger menu
  readonly hamburgerBtn: Locator;
  readonly hamburgerMenu: Locator;
  readonly menuExportPng: Locator;
  readonly menuSavePattern: Locator;
  readonly menuLoadPattern: Locator;
  readonly menuResetBtn: Locator;

  // Layers panel
  readonly layersBtn: Locator;
  readonly layersPanel: Locator;
  readonly layersList: Locator;

  // File inputs (hidden)
  readonly loadPatternInput: Locator;
  readonly logoFileInput: Locator;
  readonly bgImageFileInput: Locator;

  // Screen Options (Column 1)
  readonly imageNameInput: Locator;
  readonly displayWInput: Locator;
  readonly displayHInput: Locator;
  readonly displaysWideSelect: Locator;
  readonly displaysHighSelect: Locator;
  readonly totalWInput: Locator;
  readonly totalHInput: Locator;

  // Processor Lines
  readonly processorLinesToggle: Locator;
  readonly processorCanvasSizeSelect: Locator;
  readonly processorLineColor: Locator;
  readonly processorCustomSizeContainer: Locator;
  readonly processorCustomW: Locator;
  readonly processorCustomH: Locator;

  // Text Options (Column 2)
  readonly textColor: Locator;
  readonly textSizeRange: Locator;
  readonly showNameCheckbox: Locator;
  readonly showPixelSizeCheckbox: Locator;
  readonly showAspectRatioCheckbox: Locator;
  readonly showSquareCountCheckbox: Locator;

  // Circles
  readonly circlesCheckbox: Locator;
  readonly circleSpinModeSelect: Locator;
  readonly circleRevModeSelect: Locator;
  readonly circleSpinSpeedRange: Locator;

  // Color Bars
  readonly colorBarsCheckbox: Locator;
  readonly colorBarsModeSelect: Locator;
  readonly colorBarsOpacityRange: Locator;

  // Grid Options (Column 3)
  readonly gridColor: Locator;
  readonly crossColor: Locator;
  readonly boundaryColor: Locator;
  readonly bgColor: Locator;
  readonly gridSizeRange: Locator;
  readonly gridWidthRange: Locator;

  // Checker Options
  readonly checkerCheckbox: Locator;
  readonly checkerColor1: Locator;
  readonly checkerColor2: Locator;
  readonly checkerSizeRange: Locator;
  readonly checkerOpacityRange: Locator;
  readonly checkerControls: Locator;

  // Border Options
  readonly borderCheckbox: Locator;
  readonly borderColor1: Locator;
  readonly borderColor2: Locator;
  readonly borderSizeRange: Locator;
  readonly borderOpacityRange: Locator;
  readonly borderControls: Locator;

  // Sweep Options
  readonly sweepCheckbox: Locator;
  readonly sweepColor: Locator;
  readonly sweepColorV: Locator;
  readonly sweepDurationRange: Locator;
  readonly sweepWidthRange: Locator;
  readonly sweepControls: Locator;

  // Logo Options
  readonly logoToggle: Locator;
  readonly logoModeSelect: Locator;
  readonly logoStaticCheckbox: Locator;
  readonly logoSizeRange: Locator;
  readonly logoOpacityRange: Locator;
  readonly logoControls: Locator;

  // BG Image
  readonly bgImageToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.testPatternPage = page.locator('#testPatternPage');
    this.canvas = page.locator('#tpCanvas');

    // Toolbar
    this.undoBtn = page.locator('#tpUndoBtn');
    this.redoBtn = page.locator('#tpRedoBtn');
    this.toolbarResetBtn = page.locator('#tpToolbarResetBtn');
    this.quickSaveBtn = page.locator('#tpQuickSaveBtn');
    this.quickLoadBtn = page.locator('#tpQuickLoadBtn');
    this.quickShareBtn = page.locator('#tpQuickShareBtn');
    this.homeBtn = page.locator('.tp-home-btn');

    // Share popup
    this.sharePopup = page.locator('#tpSharePopup');
    this.sharePngBtn = page.locator('#tpSharePng');
    this.shareMp4Btn = page.locator('#tpShareMp4');

    // Hamburger
    this.hamburgerBtn = page.locator('#tpHamburgerBtn');
    this.hamburgerMenu = page.locator('#tpHamburgerMenu');
    this.menuExportPng = page.locator('#tpExportPng');
    this.menuSavePattern = page.locator('#tpSavePatternFile');
    this.menuLoadPattern = page.locator('#tpLoadPatternFile');
    this.menuResetBtn = page.locator('#tpResetBtn');

    // Layers
    this.layersBtn = page.locator('#tpLayersBtn');
    this.layersPanel = page.locator('#tpLayersPanel');
    this.layersList = page.locator('#tpLayersList');

    // File inputs
    this.loadPatternInput = page.locator('#tpLoadPatternInput');
    this.logoFileInput = page.locator('#tpLogoFile');
    this.bgImageFileInput = page.locator('#tpBgImageFile');

    // Screen Options
    this.imageNameInput = page.locator('#tpImageName');
    this.displayWInput = page.locator('#tpDisplayW');
    this.displayHInput = page.locator('#tpDisplayH');
    this.displaysWideSelect = page.locator('#tpDisplaysWide');
    this.displaysHighSelect = page.locator('#tpDisplaysHigh');
    this.totalWInput = page.locator('#tpTotalW');
    this.totalHInput = page.locator('#tpTotalH');

    // Processor Lines
    this.processorLinesToggle = page.locator('#tpProcessorLinesToggle');
    this.processorCanvasSizeSelect = page.locator('#tpProcessorCanvasSize');
    this.processorLineColor = page.locator('#tpProcessorLineColor');
    this.processorCustomSizeContainer = page.locator('#tpProcessorCustomSize');
    this.processorCustomW = page.locator('#tpProcessorCustomW');
    this.processorCustomH = page.locator('#tpProcessorCustomH');

    // Text Options
    this.textColor = page.locator('#tpTextColor');
    this.textSizeRange = page.locator('#tpTextSize');
    this.showNameCheckbox = page.locator('#tpShowName');
    this.showPixelSizeCheckbox = page.locator('#tpShowPixelSize');
    this.showAspectRatioCheckbox = page.locator('#tpShowAspectRatio');
    this.showSquareCountCheckbox = page.locator('#tpShowSquareCount');

    // Circles
    this.circlesCheckbox = page.locator('#tpCircles');
    this.circleSpinModeSelect = page.locator('#tpCircleSpinMode');
    this.circleRevModeSelect = page.locator('#tpCircleRevMode');
    this.circleSpinSpeedRange = page.locator('#tpCircleSpinSpeed');

    // Color Bars
    this.colorBarsCheckbox = page.locator('#tpColorBars');
    this.colorBarsModeSelect = page.locator('#tpColorBarsMode');
    this.colorBarsOpacityRange = page.locator('#tpColorBarsOpacity');

    // Grid Options
    this.gridColor = page.locator('#tpGridColor');
    this.crossColor = page.locator('#tpCrossColor');
    this.boundaryColor = page.locator('#tpBoundaryColor');
    this.bgColor = page.locator('#tpBgColor');
    this.gridSizeRange = page.locator('#tpGridSize');
    this.gridWidthRange = page.locator('#tpGridWidth');

    // Checker
    this.checkerCheckbox = page.locator('#tpChecker');
    this.checkerColor1 = page.locator('#tpCheckerColor1');
    this.checkerColor2 = page.locator('#tpCheckerColor2');
    this.checkerSizeRange = page.locator('#tpCheckerSize');
    this.checkerOpacityRange = page.locator('#tpCheckerOpacity');
    this.checkerControls = page.locator('#tpCheckerControls');

    // Border
    this.borderCheckbox = page.locator('#tpCheckerBorder');
    this.borderColor1 = page.locator('#tpBorderColor1');
    this.borderColor2 = page.locator('#tpBorderColor2');
    this.borderSizeRange = page.locator('#tpBorderSize');
    this.borderOpacityRange = page.locator('#tpBorderOpacity');
    this.borderControls = page.locator('#tpBorderControls');

    // Sweep
    this.sweepCheckbox = page.locator('#tpSweep');
    this.sweepColor = page.locator('#tpSweepColor');
    this.sweepColorV = page.locator('#tpSweepColorV');
    this.sweepDurationRange = page.locator('#tpSweepDuration');
    this.sweepWidthRange = page.locator('#tpSweepWidth');
    this.sweepControls = page.locator('#tpSweepControls');

    // Logo
    this.logoToggle = page.locator('#tpLogoToggle');
    this.logoModeSelect = page.locator('#tpLogoMode');
    this.logoStaticCheckbox = page.locator('#tpLogoStatic');
    this.logoSizeRange = page.locator('#tpLogoSize');
    this.logoOpacityRange = page.locator('#tpLogoOpacity');
    this.logoControls = page.locator('#tpLogoControls');

    // BG Image
    this.bgImageToggle = page.locator('#tpBgImageToggle');
  }

  // --- Navigation ---

  async enterTestPatternMode() {
    await this.page.locator('.welcome-btn-testpattern').click();
    await this.page.waitForSelector('#testPatternPage', { state: 'visible', timeout: 5000 });
    await this.page.waitForTimeout(500); // Allow canvas to render
  }

  async exitToWelcome() {
    await this.homeBtn.click();
    await this.page.waitForSelector('#welcomePage', { state: 'visible', timeout: 5000 });
  }

  // --- Screen Dimensions ---

  async setDisplaySize(width: number, height: number) {
    await this.displayWInput.fill(String(width));
    await this.displayHInput.fill(String(height));
    await this.displayHInput.blur();
    await this.page.waitForTimeout(500); // 400ms debounce in scheduleDimensionRedraw
  }

  async setDisplayGrid(wide: number, high: number) {
    await this.displaysWideSelect.selectOption(String(wide));
    await this.displaysHighSelect.selectOption(String(high));
    await this.page.waitForTimeout(500);
  }

  // --- Toggles & Sliders ---

  async toggleCheckbox(checkbox: Locator, enable: boolean) {
    const isChecked = await checkbox.isChecked();
    if (enable !== isChecked) {
      // TP checkboxes use .cp-mini-toggle — the input is hidden (opacity:0, 0x0).
      // Click the parent label instead, which toggles the checkbox.
      const label = checkbox.locator('..');
      await label.click();
      await this.page.waitForTimeout(200);
    }
  }

  async setSlider(sliderId: string, value: number) {
    await this.page.evaluate(([id, val]) => {
      const el = document.getElementById(id) as HTMLInputElement;
      el.value = String(val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, [sliderId, String(value)]);
    await this.page.waitForTimeout(200);
  }

  // --- Menus & Panels ---

  async openHamburgerMenu() {
    await this.hamburgerBtn.click();
    await this.page.waitForTimeout(200);
  }

  async openLayersPanel() {
    const isVisible = await this.layersPanel.isVisible();
    if (!isVisible) {
      await this.layersBtn.click();
      await this.page.waitForTimeout(200);
    }
  }

  async closeLayersPanel() {
    const isVisible = await this.layersPanel.isVisible();
    if (isVisible) {
      await this.layersBtn.click();
      await this.page.waitForTimeout(200);
    }
  }

  async resetPattern() {
    await this.openHamburgerMenu();
    await this.menuResetBtn.click();
    await this.page.waitForTimeout(500);
  }
}
