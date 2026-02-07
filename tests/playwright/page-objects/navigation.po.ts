import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Bottom Navigation
 * Handles switching between Standard, Power, Data, Structure, Gear, Canvas views
 */
export class Navigation {
  readonly page: Page;
  readonly standardBtn: Locator;
  readonly powerBtn: Locator;
  readonly dataBtn: Locator;
  readonly structureBtn: Locator;
  readonly gearBtn: Locator;
  readonly canvasBtn: Locator;
  readonly combinedBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.standardBtn = page.locator('button[data-view="standard"]');
    this.powerBtn = page.locator('button[data-view="power"]');
    this.dataBtn = page.locator('button[data-view="data"]');
    this.structureBtn = page.locator('button[data-view="structure"]');
    this.gearBtn = page.locator('button[data-view="gear"]');
    this.canvasBtn = page.locator('button[data-view="canvas"]');
    this.combinedBtn = page.locator('button[data-view="combined"]');
  }

  async switchToStandard() {
    await this.standardBtn.click();
    await this.page.waitForTimeout(200);
  }

  async switchToPower() {
    await this.powerBtn.click();
    await this.page.waitForTimeout(200);
  }

  async switchToData() {
    await this.dataBtn.click();
    await this.page.waitForTimeout(200);
  }

  async switchToStructure() {
    await this.structureBtn.click();
    await this.page.waitForTimeout(200);
  }

  async switchToGear() {
    await this.gearBtn.click();
    await this.page.waitForTimeout(200);
  }

  async switchToCanvas() {
    await this.canvasBtn.click();
    await this.page.waitForTimeout(200);
  }

  async switchToCombined() {
    await this.combinedBtn.click();
    await this.page.waitForTimeout(200);
  }
}
