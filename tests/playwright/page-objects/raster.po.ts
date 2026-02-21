import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Raster Mode
 * Handles screen table, canvas toolbar, custom panels, and save/load
 *
 * Note: Raster table does full innerHTML re-render — always re-query
 * row locators after add/delete/duplicate operations.
 */
export class RasterMode {
  readonly page: Page;

  // Containers
  readonly screenTableContainer: Locator;
  readonly screenTable: Locator;
  readonly canvasContainer: Locator;
  readonly canvasElement: Locator;

  // Add screen button
  readonly addScreenBtn: Locator;

  // Toolbar elements
  readonly toolbarFilename: Locator;
  readonly toolbarCanvasSize: Locator;
  readonly toolbarCustomW: Locator;
  readonly toolbarCustomH: Locator;
  readonly toolbarX: Locator;
  readonly toolbarY: Locator;
  readonly toolbarFine: Locator;
  readonly toolbarSnap: Locator;
  readonly toolbarFormat: Locator;
  readonly toolbarExport: Locator;

  // File I/O
  readonly loadRasterInput: Locator;

  // Custom Panel Modal
  readonly customPanelModal: Locator;
  readonly cpBrandInput: Locator;
  readonly cpModelInput: Locator;
  readonly cpResXInput: Locator;
  readonly cpResYInput: Locator;
  readonly cpSaveBtn: Locator;
  readonly cpCloseBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    this.screenTableContainer = page.locator('#rasterScreenTableContainer');
    this.screenTable = page.locator('#rasterScreenTable');
    this.canvasContainer = page.locator('#canvasContainer');
    this.canvasElement = page.locator('#canvasView');
    this.addScreenBtn = page.locator('.raster-add-btn');

    // Toolbar
    this.toolbarFilename = page.locator('#rasterToolbarFilename');
    this.toolbarCanvasSize = page.locator('#rasterToolbarCanvasSize');
    this.toolbarCustomW = page.locator('#rasterToolbarCustomW');
    this.toolbarCustomH = page.locator('#rasterToolbarCustomH');
    this.toolbarX = page.locator('#rasterToolbarX');
    this.toolbarY = page.locator('#rasterToolbarY');
    this.toolbarFine = page.locator('#rasterToolbarFine');
    this.toolbarSnap = page.locator('#rasterToolbarSnap');
    this.toolbarFormat = page.locator('#rasterToolbarFormat');
    this.toolbarExport = page.locator('#rasterToolbarExport');

    // File I/O
    this.loadRasterInput = page.locator('#loadRasterInput');

    // Custom Panel Modal
    this.customPanelModal = page.locator('#rasterCustomPanelModal');
    this.cpBrandInput = page.locator('#rasterCpBrand');
    this.cpModelInput = page.locator('#rasterCpModel');
    this.cpResXInput = page.locator('#rasterCpResX');
    this.cpResYInput = page.locator('#rasterCpResY');
    this.cpSaveBtn = page.locator('.raster-save-panel-btn');
    this.cpCloseBtn = page.locator('#rasterCustomPanelModal .modal-close');
  }

  // --- Navigation ---

  async enterRasterMode() {
    await this.page.locator('.welcome-btn-raster').click();
    await this.page.waitForSelector('#welcomePage', { state: 'hidden', timeout: 5000 });
    await this.page.waitForTimeout(500);
  }

  // --- Screen Table ---

  getScreenRows() {
    return this.screenTable.locator('tbody tr');
  }

  async getScreenCount() {
    return await this.getScreenRows().count();
  }

  async addScreen() {
    await this.addScreenBtn.click();
    await this.page.waitForTimeout(300);
  }

  async setScreenName(rowIndex: number, name: string) {
    const row = this.getScreenRows().nth(rowIndex);
    const nameInput = row.locator('.raster-name');
    await nameInput.fill(name);
    await this.page.waitForTimeout(600); // 500ms debounce
  }

  async setScreenCols(rowIndex: number, cols: number) {
    const row = this.getScreenRows().nth(rowIndex);
    // .raster-num order per row: Tile X(0), Tile Y(1), Cols(2), Rows(3), Offset X(4), Offset Y(5)
    const colsInput = row.locator('input.raster-num').nth(2);
    await colsInput.fill(String(cols));
    await colsInput.blur();
    await this.page.waitForTimeout(600);
  }

  async setScreenRows(rowIndex: number, rows: number) {
    const row = this.getScreenRows().nth(rowIndex);
    const rowsInput = row.locator('input.raster-num').nth(3);
    await rowsInput.fill(String(rows));
    await rowsInput.blur();
    await this.page.waitForTimeout(600);
  }

  async setScreenOffset(rowIndex: number, x: number, y: number) {
    const row = this.getScreenRows().nth(rowIndex);
    const xInput = row.locator('input.raster-num').nth(4);
    const yInput = row.locator('input.raster-num').nth(5);
    await xInput.fill(String(x));
    await yInput.fill(String(y));
    await yInput.blur();
    await this.page.waitForTimeout(300);
  }

  async selectPanel(rowIndex: number, panelValue: string) {
    const row = this.getScreenRows().nth(rowIndex);
    const select = row.locator('.raster-select');
    await select.selectOption(panelValue);
    await this.page.waitForTimeout(300);
  }

  async duplicateScreen(rowIndex: number) {
    const row = this.getScreenRows().nth(rowIndex);
    await row.locator('.raster-duplicate-btn').click();
    await this.page.waitForTimeout(300);
  }

  async deleteScreen(rowIndex: number) {
    const row = this.getScreenRows().nth(rowIndex);
    await row.locator('.raster-delete-btn').click();
    await this.page.waitForTimeout(300);
  }

  async toggleOverlay(rowIndex: number, overlayIndex: number) {
    const row = this.getScreenRows().nth(rowIndex);
    // Overlay buttons are inside td[data-label="Overlays"]: 0=X/Y, 1=Px, 2=Crosshair
    const overlayBtns = row.locator('td[data-label="Overlays"] .raster-toggle-btn');
    await overlayBtns.nth(overlayIndex).click();
    await this.page.waitForTimeout(300);
  }

  async getOverlayButton(rowIndex: number, overlayIndex: number) {
    const row = this.getScreenRows().nth(rowIndex);
    return row.locator('td[data-label="Overlays"] .raster-toggle-btn').nth(overlayIndex);
  }

  async toggleScreenVisible(rowIndex: number) {
    const row = this.getScreenRows().nth(rowIndex);
    // Active toggle is in td[data-label="Active"]
    const activeBtn = row.locator('td[data-label="Active"] .raster-toggle-btn');
    await activeBtn.click();
    await this.page.waitForTimeout(300);
  }

  async getActiveButton(rowIndex: number) {
    const row = this.getScreenRows().nth(rowIndex);
    return row.locator('td[data-label="Active"] .raster-toggle-btn');
  }

  async getScreenName(rowIndex: number) {
    const row = this.getScreenRows().nth(rowIndex);
    return await row.locator('.raster-name').inputValue();
  }

  // --- Canvas Toolbar ---

  async setCanvasSize(size: string) {
    await this.toolbarCanvasSize.selectOption(size);
    await this.page.waitForTimeout(300);
  }

  async setCustomCanvasSize(width: number, height: number) {
    await this.setCanvasSize('custom');
    await this.toolbarCustomW.fill(String(width));
    await this.toolbarCustomH.fill(String(height));
    await this.toolbarCustomH.blur();
    await this.page.waitForTimeout(300);
  }

  async toggleSnap(enable: boolean) {
    const isActive = (await this.toolbarSnap.getAttribute('class'))?.includes('active');
    if (enable !== !!isActive) {
      await this.toolbarSnap.click();
      await this.page.waitForTimeout(100);
    }
  }

  // --- Custom Panel Modal ---

  async openCustomPanelModal(rowIndex: number) {
    const row = this.getScreenRows().nth(rowIndex);
    const select = row.locator('.raster-select');
    await select.selectOption('__ADD_CUSTOM__');
    await this.page.waitForTimeout(300);
  }

  async fillAndSaveCustomPanel(brand: string, model: string, resX: number, resY: number) {
    await this.cpBrandInput.fill(brand);
    await this.cpModelInput.fill(model);
    await this.cpResXInput.fill(String(resX));
    await this.cpResYInput.fill(String(resY));
    await this.cpSaveBtn.click();
    await this.page.waitForTimeout(300);
  }
}
