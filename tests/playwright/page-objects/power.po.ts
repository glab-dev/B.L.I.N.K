import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Power Section
 * Handles power basis, phase, voltage, breaker, circuit configuration
 */
export class PowerSection {
  readonly page: Page;
  readonly powerMaxBtn: Locator;
  readonly powerAvgBtn: Locator;
  readonly phase3Btn: Locator;
  readonly phase1Btn: Locator;
  readonly voltageInput: Locator;
  readonly breakerInput: Locator;
  readonly maxPanelsPerCircuitInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.powerMaxBtn = page.locator('button:has-text("Max")').first();
    this.powerAvgBtn = page.locator('button:has-text("Avg")').first();
    this.phase3Btn = page.locator('button:has-text("3Ø")');
    this.phase1Btn = page.locator('button:has-text("1Ø")');
    this.voltageInput = page.locator('#voltage');
    this.breakerInput = page.locator('#breaker');
    this.maxPanelsPerCircuitInput = page.locator('#maxPanelsPerCircuit');
  }

  async setPowerType(type: 'max' | 'avg') {
    if (type === 'max') {
      await this.powerMaxBtn.click();
    } else {
      await this.powerAvgBtn.click();
    }
    await this.page.waitForTimeout(100);
  }

  async setPhase(phase: 1 | 3) {
    if (phase === 3) {
      await this.phase3Btn.click();
    } else {
      await this.phase1Btn.click();
    }
    await this.page.waitForTimeout(100);
  }

  async setVoltage(voltage: number) {
    await this.voltageInput.fill(String(voltage));
    await this.voltageInput.blur();
    await this.page.waitForTimeout(100);
  }

  async setBreaker(breaker: number) {
    await this.breakerInput.fill(String(breaker));
    await this.breakerInput.blur();
    await this.page.waitForTimeout(100);
  }

  async setMaxPanelsPerCircuit(max: number) {
    await this.maxPanelsPerCircuitInput.fill(String(max));
    await this.maxPanelsPerCircuitInput.blur();
    await this.page.waitForTimeout(100);
  }
}
