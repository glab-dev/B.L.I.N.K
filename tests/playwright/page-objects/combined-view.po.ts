import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Combined View
 * Handles multi-screen positioning, manual adjust, zoom
 */
export class CombinedView {
  readonly page: Page;
  readonly combinedCanvas: Locator;
  readonly manualAdjustBtn: Locator;
  readonly mirrorCanvasBtn: Locator;
  readonly resetPositionsBtn: Locator;
  readonly zoomSlider: Locator;
  readonly zoomInput: Locator;
  readonly selectAllBtn: Locator;
  readonly selectNoneBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.combinedCanvas = page.locator('#combinedCanvas');
    this.manualAdjustBtn = page.locator('button:has-text("Manual Adjust")');
    this.mirrorCanvasBtn = page.locator('button:has-text("Mirror Canvas")');
    this.resetPositionsBtn = page.locator(
      'button:has-text("Reset Positions")'
    );
    this.zoomSlider = page.locator('#combinedZoomSlider');
    this.zoomInput = page.locator('#combinedZoomInput');
    this.selectAllBtn = page.locator('button:has-text("All")').first();
    this.selectNoneBtn = page.locator('button:has-text("None")').first();
  }

  async toggleManualAdjust(enable: boolean) {
    const isActive = (
      await this.manualAdjustBtn.getAttribute('class')
    )?.includes('active');
    if (enable !== isActive) {
      await this.manualAdjustBtn.click();
      await this.page.waitForTimeout(100);
    }
  }

  async mirrorCanvasLayout() {
    await this.mirrorCanvasBtn.click();
    await this.page.waitForTimeout(200);
  }

  async resetPositions() {
    await this.resetPositionsBtn.click();
    await this.page.waitForTimeout(200);
  }

  async setZoom(percentage: number) {
    await this.zoomInput.fill(String(percentage));
    await this.page.waitForTimeout(200);
  }

  async toggleScreen(screenId: string, visible: boolean) {
    const toggle = this.page.locator(`#combinedScreenToggle_${screenId}`);
    const isActive = (await toggle.getAttribute('class'))?.includes('active');
    if (visible !== isActive) {
      await toggle.click();
      await this.page.waitForTimeout(100);
    }
  }

  async selectAllScreens() {
    await this.selectAllBtn.click();
    await this.page.waitForTimeout(200);
  }

  async selectNoScreens() {
    await this.selectNoneBtn.click();
    await this.page.waitForTimeout(200);
  }
}
