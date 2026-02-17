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
  readonly powerInTopBtn: Locator;
  readonly powerInBottomBtn: Locator;
  readonly distBoxPositionControls: Locator;
  readonly distBoxMainHorizSRBtn: Locator;
  readonly distBoxMainHorizCBtn: Locator;
  readonly distBoxMainHorizSLBtn: Locator;
  readonly distBoxMainTopBtn: Locator;
  readonly distBoxMainBottomBtn: Locator;
  readonly distBoxBackupHorizSRBtn: Locator;
  readonly distBoxBackupHorizCBtn: Locator;
  readonly distBoxBackupHorizSLBtn: Locator;
  readonly distBoxBackupTopBtn: Locator;
  readonly distBoxBackupBottomBtn: Locator;
  readonly cableDiagramCanvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.gearListContainer = page.locator('#gearListContent');
    this.wallToFloorInput = page.locator('#wallToFloor');
    this.distroToWallInput = page.locator('#distroToWall');
    this.processorToWallInput = page.locator('#processorToWall');
    this.serverToProcessorInput = page.locator('#serverToProcessor');
    this.cablePickInput = page.locator('#cablePick');
    this.cableDropBehindBtn = page.locator('#cableDropBehindBtn');
    this.cableDropSRBtn = page.locator('#cableDropSRBtn');
    this.cableDropSLBtn = page.locator('#cableDropSLBtn');
    this.distBoxOnWallBtn = page.locator('button:has-text("Dist Box on Wall")');
    this.emailGearListBtn = page.locator('button:has-text("Email Gear List")');
    this.powerInTopBtn = page.locator('#powerInTopBtn');
    this.powerInBottomBtn = page.locator('#powerInBottomBtn');
    this.distBoxPositionControls = page.locator('#distBoxPositionControls');
    this.distBoxMainHorizSRBtn = page.locator('#distBoxMainHorizSRBtn');
    this.distBoxMainHorizCBtn = page.locator('#distBoxMainHorizCBtn');
    this.distBoxMainHorizSLBtn = page.locator('#distBoxMainHorizSLBtn');
    this.distBoxMainTopBtn = page.locator('#distBoxMainTopBtn');
    this.distBoxMainBottomBtn = page.locator('#distBoxMainBottomBtn');
    this.distBoxBackupHorizSRBtn = page.locator('#distBoxBackupHorizSRBtn');
    this.distBoxBackupHorizCBtn = page.locator('#distBoxBackupHorizCBtn');
    this.distBoxBackupHorizSLBtn = page.locator('#distBoxBackupHorizSLBtn');
    this.distBoxBackupTopBtn = page.locator('#distBoxBackupTopBtn');
    this.distBoxBackupBottomBtn = page.locator('#distBoxBackupBottomBtn');
    this.cableDiagramCanvas = page.locator('#cableDiagramCanvas');
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

  async setPowerInPosition(position: 'top' | 'bottom') {
    const btnMap = {
      top: this.powerInTopBtn,
      bottom: this.powerInBottomBtn,
    };
    await btnMap[position].click();
    await this.page.waitForTimeout(100);
  }

  async setDistBoxMainHorizPosition(position: 'sr' | 'center' | 'sl') {
    const btnMap = {
      sr: this.distBoxMainHorizSRBtn,
      center: this.distBoxMainHorizCBtn,
      sl: this.distBoxMainHorizSLBtn,
    };
    await btnMap[position].click();
    await this.page.waitForTimeout(100);
  }

  async setDistBoxMainVertPosition(position: 'top' | 'bottom') {
    const btnMap = {
      top: this.distBoxMainTopBtn,
      bottom: this.distBoxMainBottomBtn,
    };
    await btnMap[position].click();
    await this.page.waitForTimeout(100);
  }

  async emailGearList() {
    await this.emailGearListBtn.click();
    // Note: This will trigger mailto: link, which can't be easily tested
    // The test should verify the href contains the expected format
  }
}
