import { test, expect } from '../fixtures/mobile-base';

/**
 * Comprehensive Mobile Test: Welcome Page
 * Tests all interactive elements on the welcome page: mode buttons, FAQ, footer links.
 */
test.describe('Welcome Page @comprehensive @mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display all three mode buttons', async ({ page }) => {
    await expect(page.locator('.welcome-btn-simple')).toBeVisible();
    await expect(page.locator('.welcome-btn-complex')).toBeVisible();
    await expect(page.locator('.welcome-btn-raster')).toBeVisible();
  });

  test('should enter Simple mode and hide welcome page', async ({ page }) => {
    await page.locator('.welcome-btn-simple').click();
    await page.waitForSelector('#welcomePage', { state: 'hidden' });
    await expect(page.locator('#welcomePage')).not.toBeVisible();
  });

  test('should enter Complex mode and show complex nav', async ({ page }) => {
    await page.locator('.welcome-btn-complex').click();
    await page.waitForSelector('#welcomePage', { state: 'hidden' });
    await expect(page.locator('button[data-mode="complex"]')).toHaveClass(/active/);
  });

  test('should enter Raster mode and show canvas/raster UI', async ({ page }) => {
    await page.locator('.welcome-btn-raster').click();
    await page.waitForSelector('#welcomePage', { state: 'hidden' });
    await expect(page.locator('#rasterScreenTableContainer')).toBeVisible();
  });

  test('should open Help modal from footer', async ({ page }) => {
    const helpBtn = page.locator('.welcome-footer-link', { hasText: 'Help' });
    await helpBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#helpModal')).toHaveClass(/active/);

    // Close
    await page.locator('#helpModal .modal-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#helpModal')).not.toHaveClass(/active/);
  });

  test('should open Terms modal from footer', async ({ page }) => {
    const termsBtn = page.locator('.welcome-footer-link', { hasText: 'Terms of Use' });
    await termsBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#termsModal')).toHaveClass(/active/);

    // Close
    await page.locator('#termsModal .modal-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#termsModal')).not.toHaveClass(/active/);
  });

  // FAQ section is display:none on mobile (< 768px) — only visible on desktop
  test.skip('should toggle FAQ accordion items', async ({ page }) => {
    const faqQuestions = page.locator('.welcome-faq-q');
    const count = await faqQuestions.count();
    expect(count).toBeGreaterThanOrEqual(1);

    await page.evaluate(() => {
      (document.querySelectorAll('.welcome-faq-q')[0] as HTMLElement).click();
    });
    await page.waitForTimeout(600);
    const faqAnswer = page.locator('.welcome-faq-a').first();
    await expect(faqAnswer).toBeVisible();

    await page.evaluate(() => {
      (document.querySelectorAll('.welcome-faq-q')[0] as HTMLElement).click();
    });
    await page.waitForTimeout(600);
    await expect(faqAnswer).not.toBeVisible();
  });

  test('should open Auth modal from sign in button', async ({ page }) => {
    await page.locator('.welcome-btn-signin:not(.welcome-install-btn)').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#authModal')).toHaveClass(/active/);

    // Close
    await page.locator('#authModal .modal-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#authModal')).not.toHaveClass(/active/);
  });

  test('should show version info in footer', async ({ page }) => {
    const versionLine = page.locator('#welcomeVersionLine');
    await expect(versionLine).toBeVisible();
    const text = await versionLine.textContent();
    expect(text!.length).toBeGreaterThan(0);
  });
});
