import { test, expect } from '../fixtures/base';

/**
 * Comprehensive Test: Welcome Page
 * Tests all interactive elements on the welcome page: mode buttons, FAQ, footer links.
 */
test.describe('Welcome Page @comprehensive @desktop', () => {
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

  test('should auto-show the What\'s New popup on an unseen version', async ({ page }) => {
    // The base fixture marks the running version as seen so the popup stays out of
    // the way. Undo that here to exercise the real first-load behaviour.
    await page.addInitScript(() => {
      try { localStorage.removeItem('lastSeenWelcomeVersion'); } catch (e) { /* opaque origin */ }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Popup opens over the welcome page and is populated from RELEASE_NOTES
    await expect(page.locator('#releaseNotesModal')).toHaveClass(/active/);
    expect(await page.locator('#releaseNotesList .release-note-entry').count()).toBeGreaterThanOrEqual(1);

    // Closing it releases the welcome page for interaction
    await page.locator('#releaseNotesModal .modal-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#releaseNotesModal')).not.toHaveClass(/active/);

    await page.locator('.welcome-btn-complex').click();
    await page.waitForSelector('#welcomePage', { state: 'hidden' });
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

  test('should toggle FAQ accordion items', async ({ page }) => {
    const faqQuestions = page.locator('.welcome-faq-q');
    const count = await faqQuestions.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Click first FAQ to expand
    await faqQuestions.first().click();
    await page.waitForTimeout(300);
    const faqAnswer = page.locator('.welcome-faq-a').first();
    await expect(faqAnswer).toBeVisible();

    // Click again to collapse
    await faqQuestions.first().click();
    await page.waitForTimeout(300);
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
