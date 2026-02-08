import { test, expect } from '../../fixtures/base';
import { AppHelpers } from '../../helpers/app-helpers';

test.describe('Request Modal', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupApp(page);
  });

  test('should open request modal with Panel tab active @critical', async ({ page }) => {
    await page.evaluate(() => openRequestItemModal());
    await page.waitForTimeout(300);

    await expect(page.locator('#requestItemModal')).toHaveClass(/active/);
    await expect(page.locator('#requestTypePanelBtn')).toHaveClass(/active/);
    await expect(page.locator('#requestItemFields')).toBeVisible();
    await expect(page.locator('#requestOtherFields')).toBeHidden();
    await expect(page.locator('#requestFeatureFields')).toBeHidden();
    await expect(page.locator('#requestBrand')).toBeVisible();
    await expect(page.locator('#requestModel')).toBeVisible();
  });

  test('should switch to Processor tab', async ({ page }) => {
    await page.evaluate(() => openRequestItemModal());
    await page.waitForTimeout(300);

    await page.locator('#requestTypeProcessorBtn').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#requestTypeProcessorBtn')).toHaveClass(/active/);
    await expect(page.locator('#requestTypePanelBtn')).not.toHaveClass(/active/);
    await expect(page.locator('#requestItemFields')).toBeVisible();
  });

  test('should switch to Other tab and show text area', async ({ page }) => {
    await page.evaluate(() => openRequestItemModal());
    await page.waitForTimeout(300);

    await page.locator('#requestTypeOtherBtn').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#requestTypeOtherBtn')).toHaveClass(/active/);
    await expect(page.locator('#requestItemFields')).toBeHidden();
    await expect(page.locator('#requestOtherFields')).toBeVisible();
    await expect(page.locator('#requestOtherText')).toBeVisible();
  });

  test('should switch to Feature tab and show text area', async ({ page }) => {
    await page.evaluate(() => openRequestItemModal());
    await page.waitForTimeout(300);

    await page.locator('#requestTypeFeatureBtn').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#requestTypeFeatureBtn')).toHaveClass(/active/);
    await expect(page.locator('#requestFeatureFields')).toBeVisible();
    await expect(page.locator('#requestItemFields')).toBeHidden();
    await expect(page.locator('#requestOtherFields')).toBeHidden();
    await expect(page.locator('#requestFeatureText')).toBeVisible();
  });

  test('should validate empty panel request fields', async ({ page }) => {
    await page.evaluate(() => openRequestItemModal());
    await page.waitForTimeout(300);

    // Submit with empty fields
    await page.locator('#requestItemModal .modal-footer .btn-primary').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#customAlertModal')).toHaveClass(/active/);
    await page.locator('#customAlertOkBtn').click();
  });

  test('should close modal with close button', async ({ page }) => {
    await page.evaluate(() => openRequestItemModal());
    await page.waitForTimeout(300);

    await page.locator('#requestItemModal .modal-close').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#requestItemModal')).not.toHaveClass(/active/);
  });
});
