import { Page } from '@playwright/test';

/**
 * localStorage interaction utilities
 * Provides methods for working with browser localStorage
 */
export class StorageHelpers {
  /**
   * Clear all localStorage
   */
  static async clearLocalStorage(page: Page): Promise<void> {
    await page.evaluate(() => localStorage.clear());
  }

  /**
   * Get localStorage item
   */
  static async getLocalStorageItem(
    page: Page,
    key: string
  ): Promise<string | null> {
    return await page.evaluate((key) => localStorage.getItem(key), key);
  }

  /**
   * Set localStorage item
   */
  static async setLocalStorageItem(
    page: Page,
    key: string,
    value: string
  ): Promise<void> {
    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key, value }
    );
  }

  /**
   * Get parsed JSON from localStorage
   */
  static async getLocalStorageJSON(page: Page, key: string): Promise<any> {
    const value = await this.getLocalStorageItem(page, key);
    return value ? JSON.parse(value) : null;
  }

  /**
   * Set JSON to localStorage
   */
  static async setLocalStorageJSON(
    page: Page,
    key: string,
    data: any
  ): Promise<void> {
    await this.setLocalStorageItem(page, key, JSON.stringify(data));
  }

  /**
   * Check if localStorage key exists
   */
  static async hasLocalStorageKey(page: Page, key: string): Promise<boolean> {
    return (await this.getLocalStorageItem(page, key)) !== null;
  }

  /**
   * Get all localStorage keys
   */
  static async getAllLocalStorageKeys(page: Page): Promise<string[]> {
    return await page.evaluate(() => Object.keys(localStorage));
  }

  /**
   * Get custom panels from localStorage
   */
  static async getCustomPanels(page: Page): Promise<any> {
    return await this.getLocalStorageJSON(page, 'ledcalc_custom_panels');
  }

  /**
   * Get custom processors from localStorage
   */
  static async getCustomProcessors(page: Page): Promise<any> {
    return await this.getLocalStorageJSON(page, 'ledcalc_custom_processors');
  }

  /**
   * Get combined positions from localStorage
   */
  static async getCombinedPositions(page: Page): Promise<any> {
    return await this.getLocalStorageJSON(page, 'ledcalc_combined_positions');
  }

  /**
   * Wait for localStorage to update
   */
  static async waitForLocalStorageUpdate(
    page: Page,
    key: string,
    timeout: number = 5000
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await this.hasLocalStorageKey(page, key)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`localStorage key "${key}" not found within timeout`);
  }
}
