import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Canvas View
 * Handles canvas tabs, screen positioning, zoom/pan, export
 *
 * Note: Canvas options (#canvasSize, #canvasX, etc.) are in a hidden section-content.
 * The visible controls are in the raster toolbar (#rasterToolbar*).
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
  readonly filenameInput: Locator;
  readonly formatSelect: Locator;
  readonly fineInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvasElement = page.locator('#canvasView');
    this.addCanvasBtn = page.locator('.canvas-tab-add');
    this.zoomInBtn = page.locator('#canvasContainer button[onclick="zoomCanvas(0.25)"]');
    this.zoomOutBtn = page.locator('#canvasContainer button[onclick="zoomCanvas(-0.25)"]');
    this.zoomInput = page.locator('#canvasZoomInput');
    this.resetZoomBtn = page.locator('#canvasContainer button[onclick="resetCanvasZoom()"]');
    // Toolbar elements (visible) — the hidden section-content controls are synced from these
    this.canvasSizeSelect = page.locator('#rasterToolbarCanvasSize');
    this.customCanvasWidthInput = page.locator('#rasterToolbarCustomW');
    this.customCanvasHeightInput = page.locator('#rasterToolbarCustomH');
    this.xPositionInput = page.locator('#rasterToolbarX');
    this.yPositionInput = page.locator('#rasterToolbarY');
    this.snapToggleBtn = page.locator('#rasterToolbarSnap');
    this.exportCanvasBtn = page.locator('#rasterToolbarExport');
    this.filenameInput = page.locator('#rasterToolbarFilename');
    this.formatSelect = page.locator('#rasterToolbarFormat');
    this.fineInput = page.locator('#rasterToolbarFine');
  }

  async setZoom(percentage: number) {
    await this.zoomInput.fill(String(percentage));
    await this.zoomInput.dispatchEvent('change');
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
    await this.canvasSizeSelect.scrollIntoViewIfNeeded();
    await this.canvasSizeSelect.selectOption(size);
    await this.page.waitForTimeout(200);
  }

  async setCustomCanvasSize(width: number, height: number) {
    await this.setCanvasSize('custom');
    await this.customCanvasWidthInput.scrollIntoViewIfNeeded();
    await this.customCanvasWidthInput.fill(String(width));
    await this.customCanvasHeightInput.fill(String(height));
    await this.customCanvasWidthInput.blur();
    await this.page.waitForTimeout(200);
  }

  async setScreenPosition(x: number, y: number) {
    await this.xPositionInput.scrollIntoViewIfNeeded();
    await this.xPositionInput.fill(String(x));
    await this.yPositionInput.fill(String(y));
    await this.xPositionInput.blur();
    await this.page.waitForTimeout(200);
  }

  async toggleSnap(enable: boolean) {
    await this.snapToggleBtn.scrollIntoViewIfNeeded();
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
