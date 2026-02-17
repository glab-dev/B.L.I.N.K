import { Page, Locator } from '@playwright/test';

/**
 * Canvas Interaction Helpers
 * Reusable functions for clicking, right-clicking, and selecting panels on the standard canvas.
 * Extracted from app-walkthrough.spec.ts for use across multiple test files.
 */

/** Wait for canvas panel dimensions to be set (non-zero).
 *  Note: currentPanelWidth/Height are declared with `let` in index.html,
 *  so they are NOT on `window` — must access directly via eval string. */
export async function waitForPanelDims(page: Page, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const dims = await page.evaluate('({ w: currentPanelWidth || 0, h: currentPanelHeight || 0 })');
    if ((dims as any).w > 0 && (dims as any).h > 0) return dims;
    await page.waitForTimeout(200);
  }
  throw new Error('Panel dimensions not set within timeout');
}

/** Get the pixel coordinates for a panel on the standard canvas */
export async function getPanelPageCoords(page: Page, canvas: Locator, col: number, row: number) {
  await waitForPanelDims(page);

  const panelDims = await page.evaluate(`({
    w: currentPanelWidth || 0,
    h: currentPanelHeight || 0,
    cw: document.getElementById('standardCanvas')?.width || 0,
    ch: document.getElementById('standardCanvas')?.height || 0,
  })`) as { w: number; h: number; cw: number; ch: number };

  if (!panelDims.w || !panelDims.h || !panelDims.cw || !panelDims.ch) {
    throw new Error(`Invalid panel dimensions: ${JSON.stringify(panelDims)}`);
  }

  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not visible');

  const scaleX = box.width / panelDims.cw;
  const scaleY = box.height / panelDims.ch;

  const x = box.x + (col * panelDims.w + panelDims.w / 2) * scaleX;
  const y = box.y + (row * panelDims.h + panelDims.h / 2) * scaleY;

  return { x, y };
}

/** Click a panel on the standard canvas to select it */
export async function clickPanel(page: Page, canvas: Locator, col: number, row: number) {
  const { x, y } = await getPanelPageCoords(page, canvas, col, row);
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);
}

/** Right-click a panel to open context menu */
export async function rightClickPanel(page: Page, canvas: Locator, col: number, row: number) {
  const { x, y } = await getPanelPageCoords(page, canvas, col, row);
  await page.mouse.click(x, y, { button: 'right' });
  await page.waitForTimeout(300);
}

/** Delete the currently selected panels via context menu */
export async function deleteSelectedPanels(page: Page, canvas: Locator, col: number, row: number) {
  await rightClickPanel(page, canvas, col, row);
  const menu = page.locator('#panelContextMenu');
  await menu.locator('div', { hasText: /Delete.*panel/ }).click();
  await page.waitForTimeout(500);
}
