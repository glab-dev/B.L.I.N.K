import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Structure Section
 * Handles structure type (hanging, ground, floor), bumpers, weight calculations
 */
export class StructureSection {
  readonly page: Page;
  readonly structureTypeSelect: Locator;
  readonly useBumpersBtn: Locator;
  readonly use4WayBumpersBtn: Locator;
  readonly manualBumperModeBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.structureTypeSelect = page.locator('#structureType');
    this.useBumpersBtn = page.locator('button:has-text("Bumpers")').first();
    this.use4WayBumpersBtn = page.locator('button:has-text("4-Way Bumpers")');
    this.manualBumperModeBtn = page.locator(
      'button:has-text("Manual Mode")'
    );
  }

  async setStructureType(type: 'hanging' | 'ground' | 'floor') {
    await this.structureTypeSelect.selectOption(type);
    await this.page.waitForTimeout(300);
  }

  async toggleBumpers(enable: boolean) {
    const isActive = (await this.useBumpersBtn.getAttribute('class'))?.includes(
      'active'
    );
    if (enable !== isActive) {
      await this.useBumpersBtn.click();
      await this.page.waitForTimeout(100);
    }
  }

  async toggle4WayBumpers(enable: boolean) {
    const isActive = (
      await this.use4WayBumpersBtn.getAttribute('class')
    )?.includes('active');
    if (enable !== isActive) {
      await this.use4WayBumpersBtn.click();
      await this.page.waitForTimeout(100);
    }
  }

  async toggleManualBumperMode(enable: boolean) {
    const isActive = (
      await this.manualBumperModeBtn.getAttribute('class')
    )?.includes('active');
    if (enable !== isActive) {
      await this.manualBumperModeBtn.click();
      await this.page.waitForTimeout(100);
    }
  }
}
