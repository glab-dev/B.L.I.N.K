import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Canvas View
 * Handles canvas tabs, screen positioning, zoom/pan, export
 */
export class CanvasView {
  readonly page: Page;
  readonly canvasElement: Locator;
  readonly addCanvasBtn: Locator;
  readonly zoomInBtn: Locator;
  readonly zoomOutBtn: Locator;
  readonly zoomInput: Locator;
  readonly resetZoomBtn: Locator;
  readonly canvasSizeSelect: Locator;
  readonly customCanvasWidthInput: Locator;
  readonly customCanvasHeightInput: Locator;
  readonly xPositionInput: Locator;
  readonly yPositionInput: Locator;
  readonly snapToggleBtn: Locator;
  readonly exportCanvasBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvasElement = page.locator('#canvasView');
    this.addCanvasBtn = page.locator('.canvas-tab-add');
    this.zoomInBtn = page.locator('button:has-text("+")').first();
    this.zoomOutBtn = page.locator('button:has-text("−")').first();
    this.zoomInput = page.locator('#canvasZoomInput');
    this.resetZoomBtn = page.locator('button:has-text("Reset Zoom")');
    this.canvasSizeSelect = page.locator('#canvasSize');
    this.customCanvasWidthInput = page.locator('#customCanvasWidth');
    this.customCanvasHeightInput = page.locator('#customCanvasHeight');
    this.xPositionInput = page.locator('#canvasXPos');
    this.yPositionInput = page.locator('#canvasYPos');
    this.snapToggleBtn = page.locator('button:has-text("Snap")');
    this.exportCanvasBtn = page.locator('button:has-text("Export Canvas")');
  }

  async setZoom(percentage: number) {
    await this.zoomInput.fill(String(percentage));
    await this.zoomInput.press('Enter');
    await this.page.waitForTimeout(200);
  }

  async zoomIn() {
    await this.zoomInBtn.click();
    await this.page.waitForTimeout(100);
  }

  async zoomOut() {
    await this.zoomOutBtn.click();
    await this.page.waitForTimeout(100);
  }

  async resetZoom() {
    await this.resetZoomBtn.click();
    await this.page.waitForTimeout(100);
  }

  async setCanvasSize(size: string) {
    await this.canvasSizeSelect.selectOption(size);
    await this.page.waitForTimeout(200);
  }

  async setCustomCanvasSize(width: number, height: number) {
    await this.setCanvasSize('custom');
    await this.customCanvasWidthInput.fill(String(width));
    await this.customCanvasHeightInput.fill(String(height));
    await this.customCanvasWidthInput.blur();
    await this.page.waitForTimeout(200);
  }

  async setScreenPosition(x: number, y: number) {
    await this.xPositionInput.fill(String(x));
    await this.yPositionInput.fill(String(y));
    await this.xPositionInput.blur();
    await this.page.waitForTimeout(200);
  }

  async toggleSnap(enable: boolean) {
    const isActive = (await this.snapToggleBtn.getAttribute('class'))?.includes(
      'active'
    );
    if (enable !== isActive) {
      await this.snapToggleBtn.click();
      await this.page.waitForTimeout(100);
    }
  }

  async toggleScreenVisibility(screenId: string, visible: boolean) {
    const toggle = this.page.locator(`#screenToggle_${screenId}`);
    const isActive = (await toggle.getAttribute('class'))?.includes('active');
    if (visible !== isActive) {
      await toggle.click();
      await this.page.waitForTimeout(100);
    }
  }

  async exportCanvas() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportCanvasBtn.click();
    return await downloadPromise;
  }
}
