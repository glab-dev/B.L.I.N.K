import { test, expect } from '../fixtures/mobile-base';

/**
 * Comprehensive Mobile Test: Auth Modal UI
 * Tests auth modal UI interactions (not actual auth, which requires Supabase).
 */
test.describe('Auth Modal UI @comprehensive @mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should open auth modal with Sign In tab active', async ({ page }) => {
    await page.locator('.welcome-btn-signin:not(.welcome-install-btn)').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#authModal')).toHaveClass(/active/);
    await expect(page.locator('#authTabSignIn')).toHaveClass(/active/);
  });

  test('should switch to Sign Up tab', async ({ page }) => {
    await page.locator('.welcome-btn-signin:not(.welcome-install-btn)').click();
    await page.waitForTimeout(300);

    await page.locator('#authTabSignUp').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#authTabSignUp')).toHaveClass(/active/);
    await expect(page.locator('#authTabSignIn')).not.toHaveClass(/active/);
    // Password confirm should be visible
    await expect(page.locator('#authPasswordConfirm')).toBeVisible();
  });

  test('should switch back to Sign In tab', async ({ page }) => {
    await page.locator('.welcome-btn-signin:not(.welcome-install-btn)').click();
    await page.waitForTimeout(300);

    await page.locator('#authTabSignUp').click();
    await page.waitForTimeout(200);
    await page.locator('#authTabSignIn').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#authTabSignIn')).toHaveClass(/active/);
    await expect(page.locator('#authPasswordConfirm')).not.toBeVisible();
  });

  test('should show forgot password link', async ({ page }) => {
    await page.locator('.welcome-btn-signin:not(.welcome-install-btn)').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#authForgotLink')).toBeVisible();
  });

  test('should switch to reset mode via forgot password', async ({ page }) => {
    await page.locator('.welcome-btn-signin:not(.welcome-install-btn)').click();
    await page.waitForTimeout(300);

    await page.locator('#authForgotLink').click();
    await page.waitForTimeout(300);

    // Should show reset mode (password field hidden, button text changes)
    const submitText = await page.locator('#authSubmitBtn').textContent();
    expect(submitText!.toLowerCase()).toContain('reset');
  });

  test('should have email and password inputs', async ({ page }) => {
    await page.locator('.welcome-btn-signin:not(.welcome-install-btn)').click();
    await page.waitForTimeout(300);

    // Ensure we're on the Sign In tab (previous test may have left reset mode active)
    await page.locator('#authTabSignIn').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#authEmail')).toBeVisible();
    await expect(page.locator('#authPassword')).toBeVisible();
  });

  test('should close auth modal', async ({ page }) => {
    await page.locator('.welcome-btn-signin:not(.welcome-install-btn)').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#authModal')).toHaveClass(/active/);

    await page.locator('#authModal .modal-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#authModal')).not.toHaveClass(/active/);
  });

  test('should fill email and password fields', async ({ page }) => {
    await page.locator('.welcome-btn-signin:not(.welcome-install-btn)').click();
    await page.waitForTimeout(300);

    await page.locator('#authEmail').fill('test@example.com');
    await page.locator('#authPassword').fill('password123');

    await expect(page.locator('#authEmail')).toHaveValue('test@example.com');
    await expect(page.locator('#authPassword')).toHaveValue('password123');
  });
});
