import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Dimensions Section
 * Handles dimension mode, unit system, panel/wall size inputs, aspect ratio
 */
export class DimensionsSection {
  readonly page: Page;
  readonly dimModePanelsBtn: Locator;
  readonly dimModeSizeBtn: Locator;
  readonly unitImperialBtn: Locator;
  readonly unitMetricBtn: Locator;
  readonly panelsWideInput: Locator;
  readonly panelsHighInput: Locator;
  readonly wallWidthInput: Locator;
  readonly wallHeightInput: Locator;
  readonly aspectRatioNoneBtn: Locator;
  readonly aspectRatio169Btn: Locator;
  readonly aspectRatio43Btn: Locator;
  readonly aspectRatioCustomBtn: Locator;
  readonly customARWidthInput: Locator;
  readonly customARHeightInput: Locator;
  readonly panelTypeSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dimModePanelsBtn = page.locator('#dimModePanelsBtn');
    this.dimModeSizeBtn = page.locator('#dimModeSizeBtn');
    this.unitImperialBtn = page.locator('#unitImperial');
    this.unitMetricBtn = page.locator('#unitMetric');
    this.panelsWideInput = page.locator('#panelsWide');
    this.panelsHighInput = page.locator('#panelsHigh');
    this.wallWidthInput = page.locator('#wallWidth');
    this.wallHeightInput = page.locator('#wallHeight');
    this.aspectRatioNoneBtn = page.locator('#arNoneBtn');
    this.aspectRatio169Btn = page.locator('#ar169Btn');
    this.aspectRatio43Btn = page.locator('#ar43Btn');
    this.aspectRatioCustomBtn = page.locator('#arCustomBtn');
    this.customARWidthInput = page.locator('#customARWidth');
    this.customARHeightInput = page.locator('#customARHeight');
    this.panelTypeSelect = page.locator('#panelType');
  }

  async setDimensionMode(mode: 'panels' | 'size') {
    if (mode === 'panels') {
      await this.dimModePanelsBtn.click();
    } else {
      await this.dimModeSizeBtn.click();
    }
    await this.page.waitForTimeout(100); // Allow UI to update
  }

  async setUnitSystem(system: 'imperial' | 'metric') {
    if (system === 'imperial') {
      await this.unitImperialBtn.click();
    } else {
      await this.unitMetricBtn.click();
    }
    await this.page.waitForTimeout(100);
  }

  async setPanelCount(wide: number, high: number) {
    await this.panelsWideInput.fill(String(wide));
    await this.panelsHighInput.fill(String(high));
    await this.panelsWideInput.blur(); // Trigger calculation
    await this.page.waitForTimeout(300); // Allow calculation to complete
  }

  async setWallSize(width: number, height: number) {
    await this.wallWidthInput.fill(String(width));
    await this.wallHeightInput.fill(String(height));
    await this.wallWidthInput.blur();
    await this.page.waitForTimeout(300);
  }

  async setAspectRatio(ratio: 'none' | '16:9' | '4:3' | 'custom') {
    const btnMap = {
      none: this.aspectRatioNoneBtn,
      '16:9': this.aspectRatio169Btn,
      '4:3': this.aspectRatio43Btn,
      custom: this.aspectRatioCustomBtn,
    };
    await btnMap[ratio].click();
    await this.page.waitForTimeout(100);
  }

  async setCustomAspectRatio(width: number, height: number) {
    await this.setAspectRatio('custom');
    await this.customARWidthInput.fill(String(width));
    await this.customARHeightInput.fill(String(height));
    await this.customARWidthInput.blur();
    await this.page.waitForTimeout(100);
  }

  async selectPanel(panelName: string) {
    await this.panelTypeSelect.selectOption({ label: panelName });
    await this.page.waitForTimeout(300); // Allow calculation
  }
}
