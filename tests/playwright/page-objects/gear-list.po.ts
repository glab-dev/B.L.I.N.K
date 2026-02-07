import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Gear List View
 * Handles gear list display, cabling configuration, email export
 */
export class GearList {
  readonly page: Page;
  readonly gearListContainer: Locator;
  readonly wallToFloorInput: Locator;
  readonly distroToWallInput: Locator;
  readonly processorToWallInput: Locator;
  readonly serverToProcessorInput: Locator;
  readonly cablePickInput: Locator;
  readonly cableDropBehindBtn: Locator;
  readonly cableDropSRBtn: Locator;
  readonly cableDropSLBtn: Locator;
  readonly distBoxOnWallBtn: Locator;
  readonly emailGearListBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.gearListContainer = page.locator('#gearList');
    this.wallToFloorInput = page.locator('#wallToFloor');
    this.distroToWallInput = page.locator('#distroToWall');
    this.processorToWallInput = page.locator('#processorToWall');
    this.serverToProcessorInput = page.locator('#serverToProcessor');
    this.cablePickInput = page.locator('#cablePick');
    this.cableDropBehindBtn = page.locator(
      'button[data-cable-drop="behind"]'
    );
    this.cableDropSRBtn = page.locator('button[data-cable-drop="sr"]');
    this.cableDropSLBtn = page.locator('button[data-cable-drop="sl"]');
    this.distBoxOnWallBtn = page.locator('button:has-text("Dist Box on Wall")');
    this.emailGearListBtn = page.locator('button:has-text("Email Gear List")');
  }

  async setCableLength(type: string, length: number) {
    const inputMap: Record<string, Locator> = {
      wallToFloor: this.wallToFloorInput,
      distroToWall: this.distroToWallInput,
      processorToWall: this.processorToWallInput,
      serverToProcessor: this.serverToProcessorInput,
      cablePick: this.cablePickInput,
    };

    await inputMap[type].fill(String(length));
    await inputMap[type].blur();
    await this.page.waitForTimeout(100);
  }

  async setCableDropPosition(position: 'behind' | 'sr' | 'sl') {
    const btnMap = {
      behind: this.cableDropBehindBtn,
      sr: this.cableDropSRBtn,
      sl: this.cableDropSLBtn,
    };
    await btnMap[position].click();
    await this.page.waitForTimeout(100);
  }

  async toggleDistBoxOnWall(enable: boolean) {
    const isActive = (
      await this.distBoxOnWallBtn.getAttribute('class')
    )?.includes('active');
    if (enable !== isActive) {
      await this.distBoxOnWallBtn.click();
      await this.page.waitForTimeout(100);
    }
  }

  async getGearItems(): Promise<string[]> {
    const items = await this.gearListContainer.locator('.gear-item').allTextContents();
    return items;
  }

  async emailGearList() {
    await this.emailGearListBtn.click();
    // Note: This will trigger mailto: link, which can't be easily tested
    // The test should verify the href contains the expected format
  }
}
