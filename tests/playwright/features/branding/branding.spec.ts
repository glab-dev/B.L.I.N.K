import { test, expect } from '../../fixtures/base';

test.describe('Branding', () => {
  test('should display B.L.I.N.K. in welcome page title @critical', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.welcome-title')).toContainText('B.L.I.N.K.');
  });

  test('should have B.L.I.N.K. in page title @critical', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const title = await page.title();
    expect(title).toContain('B.L.I.N.K.');
  });

  test('should have B.L.I.N.K. in apple-mobile-web-app-title', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const appTitle = await page.locator('meta[name="apple-mobile-web-app-title"]').getAttribute('content');
    expect(appTitle).toContain('B.L.I.N.K.');
  });

  test('should display subtitle on welcome page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const subtitle = page.locator('.welcome-subtitle').first();
    await expect(subtitle).toBeVisible();
  });
});
