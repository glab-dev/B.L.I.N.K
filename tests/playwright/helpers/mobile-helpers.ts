import { Page, expect } from '@playwright/test';

/**
 * Mobile-specific setup and utility methods.
 * Handles mobile menu, scrolling, and layout assertions.
 */
export class MobileHelpers {
  /**
   * Open the mobile menu overlay via the menu header button.
   */
  static async openMenu(page: Page) {
    const menuBtn = page.locator('.mobile-header-btn').last();
    await menuBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#mobileMenuOverlay')).toBeVisible();
  }

  /**
   * Close the mobile menu overlay.
   */
  static async closeMenu(page: Page) {
    await page.locator('.mobile-menu-close').click();
    await page.waitForTimeout(300);
  }

  /**
   * Open a modal from the mobile menu.
   * Opens the menu, clicks the specified button, and waits for the modal.
   */
  static async openModalFromMenu(
    page: Page,
    buttonText: string,
    modalSelector: string
  ) {
    await this.openMenu(page);
    const btn = page.locator('.mobile-menu-btn', { hasText: buttonText });
    await btn.click();
    await page.waitForTimeout(500);
    await expect(page.locator(modalSelector)).toHaveClass(/active/);
  }

  /**
   * Scroll a section into view, accounting for fixed header (56px) and bottom nav (70px).
   */
  static async scrollToSection(page: Page, sectionId: string) {
    await page.locator(`#${sectionId}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
  }

  /**
   * Assert the mobile layout is correct: header visible, bottom nav visible.
   */
  static async assertMobileLayout(page: Page) {
    // Mobile header should be visible
    await expect(page.locator('.mobile-header')).toBeVisible();
    // Bottom nav should be visible
    await expect(page.locator('.bottom-nav')).toBeVisible();
  }

  /**
   * Get computed height of an element in pixels.
   */
  static async getElementHeight(page: Page, selector: string): Promise<number> {
    return page.locator(selector).evaluate((el) => {
      return parseFloat(getComputedStyle(el).height);
    });
  }
}
