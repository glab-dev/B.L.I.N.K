import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Bottom Navigation
 *
 * Bottom nav modes (via data-mode attribute):
 *   - complex: Shows all layout views (standard, power, data, structure) simultaneously
 *   - combined: Combined multi-screen canvas view
 *   - gear: Gear list view
 *   - simple: Simple mode (single layout at a time)
 *   - canvas: Canvas export view (uses data-view="canvas")
 *
 * Note: In Complex mode, standard/power/data/structure layouts are all visible
 * on the same page — there are no separate navigation buttons for them.
 */
export class Navigation {
  readonly page: Page;
  readonly complexBtn: Locator;
  readonly combinedBtn: Locator;
  readonly gearBtn: Locator;
  readonly simpleBtn: Locator;
  readonly canvasBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.complexBtn = page.locator('button[data-mode="complex"]');
    this.combinedBtn = page.locator('button[data-mode="combined"]');
    this.gearBtn = page.locator('button[data-mode="gear"]');
    this.simpleBtn = page.locator('button[data-mode="simple"]');
    this.canvasBtn = page.locator('button[data-view="canvas"]');
  }

  async switchToComplex() {
    await this.complexBtn.click();
    await this.page.waitForTimeout(200);
  }

  async switchToCombined() {
    await this.combinedBtn.click();
    await this.page.waitForTimeout(200);
  }

  async switchToGear() {
    await this.gearBtn.click();
    await this.page.waitForTimeout(200);
  }

  async switchToSimple() {
    await this.simpleBtn.click();
    await this.page.waitForTimeout(200);
  }

  async switchToCanvas() {
    await this.canvasBtn.click();
    await this.page.waitForTimeout(200);
  }

  // Legacy aliases for backward compatibility
  async switchToStandard() { await this.switchToComplex(); }
  async switchToPower() { await this.switchToComplex(); }
  async switchToData() { await this.switchToComplex(); }
  async switchToStructure() { await this.switchToComplex(); }
}
