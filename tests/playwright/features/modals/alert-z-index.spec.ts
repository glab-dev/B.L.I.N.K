import { test, expect } from '../../fixtures/base';
import { AppHelpers } from '../../helpers/app-helpers';

test.describe('Alert Z-Index', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupApp(page);
  });

  test('should display alert above other modals @critical', async ({ page }) => {
    // Open custom processor modal
    await page.evaluate(() => openCustomProcessorModal());
    await page.waitForTimeout(300);

    await expect(page.locator('#customProcessorModal')).toHaveClass(/active/);

    // Trigger alert by saving with empty fields
    await page.locator('#customProcessorModal .modal-footer .btn-primary').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#customAlertModal')).toHaveClass(/active/);

    // Verify z-index hierarchy
    const alertZ = await page.locator('#customAlertModal').evaluate(
      el => parseInt(window.getComputedStyle(el).zIndex) || 0
    );
    const processorZ = await page.locator('#customProcessorModal').evaluate(
      el => parseInt(window.getComputedStyle(el).zIndex) || 0
    );

    expect(alertZ).toBeGreaterThan(processorZ);

    // Alert OK should be clickable
    await page.locator('#customAlertOkBtn').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#customAlertModal')).not.toHaveClass(/active/);
    // Underlying modal should still be open
    await expect(page.locator('#customProcessorModal')).toHaveClass(/active/);
  });

  test('should display alert above request modal @critical', async ({ page }) => {
    await page.evaluate(() => openRequestItemModal());
    await page.waitForTimeout(300);

    // Trigger alert by submitting empty form
    await page.locator('#requestItemModal .modal-footer .btn-primary').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#customAlertModal')).toHaveClass(/active/);

    // Verify z-index
    const alertZ = await page.locator('#customAlertModal').evaluate(
      el => parseInt(window.getComputedStyle(el).zIndex) || 0
    );
    const requestZ = await page.locator('#requestItemModal').evaluate(
      el => parseInt(window.getComputedStyle(el).zIndex) || 0
    );

    expect(alertZ).toBeGreaterThan(requestZ);

    await page.locator('#customAlertOkBtn').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#customAlertModal')).not.toHaveClass(/active/);
    await expect(page.locator('#requestItemModal')).toHaveClass(/active/);
  });
});
