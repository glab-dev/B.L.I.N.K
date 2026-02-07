import { Page, Locator } from '@playwright/test';

/**
 * Canvas interaction utilities
 * Provides methods for working with HTML5 canvas elements
 */
export class CanvasHelpers {
  /**
   * Check if canvas has been drawn (not blank)
   */
  static async isCanvasDrawn(canvas: Locator): Promise<boolean> {
    return await canvas.evaluate((canvasEl: HTMLCanvasElement) => {
      const ctx = canvasEl.getContext('2d');
      if (!ctx) return false;

      const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
      const data = imageData.data;

      // Check if any pixel is not transparent
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return true; // Alpha channel > 0
      }
      return false;
    });
  }

  /**
   * Get canvas pixel data
   */
  static async getCanvasPixelData(canvas: Locator): Promise<Uint8ClampedArray> {
    return await canvas.evaluate((canvasEl: HTMLCanvasElement) => {
      const ctx = canvasEl.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
      return Array.from(imageData.data) as any;
    }) as any;
  }

  /**
   * Get canvas dimensions
   */
  static async getCanvasDimensions(
    canvas: Locator
  ): Promise<{ width: number; height: number }> {
    return await canvas.evaluate((canvasEl: HTMLCanvasElement) => ({
      width: canvasEl.width,
      height: canvasEl.height,
    }));
  }

  /**
   * Click panel on canvas at specific grid position
   * Note: This is approximate - actual panel detection depends on app's panelSize variable
   */
  static async clickPanelOnCanvas(
    page: Page,
    canvas: Locator,
    col: number,
    row: number,
    panelSize: number = 50
  ): Promise<void> {
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not visible');

    const padding = 20;
    const x = box.x + padding + col * panelSize + panelSize / 2;
    const y = box.y + padding + row * panelSize + panelSize / 2;

    await page.mouse.click(x, y);
  }

  /**
   * Drag on canvas from one point to another
   */
  static async dragOnCanvas(
    page: Page,
    canvas: Locator,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): Promise<void> {
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not visible');

    const startX = box.x + fromX;
    const startY = box.y + fromY;
    const endX = box.x + toX;
    const endY = box.y + toY;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();
  }

  /**
   * Wait for canvas to render (not blank)
   */
  static async waitForCanvasRender(
    canvas: Locator,
    timeout: number = 5000
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await this.isCanvasDrawn(canvas)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Canvas did not render within timeout');
  }

  /**
   * Get panel size from app globals
   */
  static async getPanelSize(page: Page): Promise<number> {
    return await page.evaluate(() => {
      return (window as any).panelSize || 50;
    });
  }
}
