import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Data Section
 * Handles processor selection, frame rate, bit depth, redundancy, data direction
 */
export class DataSection {
  readonly page: Page;
  readonly processorSelect: Locator;
  readonly frameRateSelect: Locator;
  readonly bitDepthSelect: Locator;
  readonly maxPanelsPerDataInput: Locator;
  readonly dataDirectionSelect: Locator;
  readonly showArrowsBtn: Locator;
  readonly dataFlipBtn: Locator;
  readonly dataRedundancyBtn: Locator;
  readonly processorRedundancyBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.processorSelect = page.locator('#processor');
    this.frameRateSelect = page.locator('#frameRate');
    this.bitDepthSelect = page.locator('#bitDepth');
    this.maxPanelsPerDataInput = page.locator('#maxPanelsPerData');
    this.dataDirectionSelect = page.locator('#dataDirection');
    this.showArrowsBtn = page.locator('button:has-text("Arrows")');
    this.dataFlipBtn = page.locator('button:has-text("Flip")');
    this.dataRedundancyBtn = page.locator('button:has-text("Data Redundancy")');
    this.processorRedundancyBtn = page.locator(
      'button:has-text("Processor Redundancy")'
    );
  }

  async setProcessor(processor: string) {
    await this.processorSelect.selectOption({ label: processor });
    await this.page.waitForTimeout(300);
  }

  async setFrameRate(frameRate: number) {
    await this.frameRateSelect.selectOption(String(frameRate));
    await this.page.waitForTimeout(100);
  }

  async setBitDepth(bitDepth: number) {
    await this.bitDepthSelect.selectOption(String(bitDepth));
    await this.page.waitForTimeout(100);
  }

  async setMaxPanelsPerData(max: number) {
    await this.maxPanelsPerDataInput.fill(String(max));
    await this.maxPanelsPerDataInput.blur();
    await this.page.waitForTimeout(100);
  }

  async setDataDirection(direction: string) {
    await this.dataDirectionSelect.selectOption(direction);
    await this.page.waitForTimeout(100);
  }

  async toggleArrows(enable: boolean) {
    const isActive = (await this.showArrowsBtn.getAttribute('class'))?.includes(
      'active'
    );
    if (enable !== isActive) {
      await this.showArrowsBtn.click();
      await this.page.waitForTimeout(100);
    }
  }

  async toggleDataFlip(enable: boolean) {
    const isActive = (await this.dataFlipBtn.getAttribute('class'))?.includes(
      'active'
    );
    if (enable !== isActive) {
      await this.dataFlipBtn.click();
      await this.page.waitForTimeout(100);
    }
  }

  async toggleRedundancy(enable: boolean) {
    const isActive = (
      await this.dataRedundancyBtn.getAttribute('class')
    )?.includes('active');
    if (enable !== isActive) {
      await this.dataRedundancyBtn.click();
      await this.page.waitForTimeout(100);
    }
  }

  async toggleProcessorRedundancy(enable: boolean) {
    const isActive = (
      await this.processorRedundancyBtn.getAttribute('class')
    )?.includes('active');
    if (enable !== isActive) {
      await this.processorRedundancyBtn.click();
      await this.page.waitForTimeout(100);
    }
  }
}
