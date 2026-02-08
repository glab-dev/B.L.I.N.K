import { test, expect } from '../../fixtures/base';
import { AppHelpers } from '../../helpers/app-helpers';
import { StorageHelpers } from '../../helpers/storage-helpers';

test.describe('Custom Processor', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 8, 6);
  });

  test('should open custom processor modal from dropdown @critical', async ({ page, data }) => {
    await data.processorSelect.selectOption('__ADD_CUSTOM_PROCESSOR__');
    await page.waitForTimeout(500);

    await expect(page.locator('#customProcessorModal')).toHaveClass(/active/);
    await expect(page.locator('#customProcessorModalTitle')).toContainText('Add Custom Processor');

    // Close modal
    await page.locator('#customProcessorModal .modal-close').click();
  });

  test('should create a custom processor and see it in dropdown @critical', async ({ page, data }) => {
    await page.evaluate(() => openCustomProcessorModal());
    await page.waitForTimeout(300);

    // Fill form
    await page.locator('#customProcessorBrand').fill('TestBrand');
    await page.locator('#customProcessorName').fill('TestProc');
    await page.locator('#customProcessorPortType').selectOption('1g');
    await page.locator('#customProcessorPixelsPerPort').fill('500000');
    await page.locator('#customProcessorFrameRate').fill('60');
    await page.locator('#customProcessorBitDepth').fill('8');
    await page.locator('#customProcessorTotalPixels').fill('5000000');
    await page.locator('#customProcessorOutputPorts').fill('4');

    // Save
    await page.locator('#customProcessorModal .modal-footer .btn-primary').click();
    await page.waitForTimeout(500);

    // Dismiss any success alert
    const alertVisible = await page.locator('#customAlertModal.active').isVisible().catch(() => false);
    if (alertVisible) {
      await page.locator('#customAlertOkBtn').click();
      await page.waitForTimeout(300);
    }

    // Verify modal closed
    await expect(page.locator('#customProcessorModal')).not.toHaveClass(/active/);

    // Verify processor appears in dropdown
    const options = await data.processorSelect.locator('option').allTextContents();
    const hasCustom = options.some(opt => opt.includes('TestBrand') && opt.includes('TestProc'));
    expect(hasCustom).toBe(true);
  });

  test('should save custom processor to localStorage @critical', async ({ page }) => {
    await page.evaluate(() => openCustomProcessorModal());
    await page.waitForTimeout(300);

    await page.locator('#customProcessorBrand').fill('StorageBrand');
    await page.locator('#customProcessorName').fill('StorageProc');
    await page.locator('#customProcessorPortType').selectOption('1g');
    await page.locator('#customProcessorPixelsPerPort').fill('400000');
    await page.locator('#customProcessorFrameRate').fill('60');
    await page.locator('#customProcessorBitDepth').fill('8');
    await page.locator('#customProcessorTotalPixels').fill('4000000');
    await page.locator('#customProcessorOutputPorts').fill('4');

    await page.locator('#customProcessorModal .modal-footer .btn-primary').click();
    await page.waitForTimeout(500);

    // Dismiss any alert
    const alertVisible = await page.locator('#customAlertModal.active').isVisible().catch(() => false);
    if (alertVisible) {
      await page.locator('#customAlertOkBtn').click();
      await page.waitForTimeout(300);
    }

    const processors = await StorageHelpers.getCustomProcessors(page);
    expect(processors).toBeTruthy();
    const keys = Object.keys(processors);
    const hasProc = keys.some(k => k.includes('StorageBrand') || k.includes('StorageProc'));
    expect(hasProc).toBe(true);
  });

  test('should delete a custom processor via manage modal', async ({ page }) => {
    // First create a processor
    await page.evaluate(() => openCustomProcessorModal());
    await page.waitForTimeout(300);

    await page.locator('#customProcessorBrand').fill('DeleteMe');
    await page.locator('#customProcessorName').fill('DeleteProc');
    await page.locator('#customProcessorPortType').selectOption('1g');
    await page.locator('#customProcessorPixelsPerPort').fill('300000');
    await page.locator('#customProcessorFrameRate').fill('60');
    await page.locator('#customProcessorBitDepth').fill('8');
    await page.locator('#customProcessorTotalPixels').fill('3000000');
    await page.locator('#customProcessorOutputPorts').fill('4');

    await page.locator('#customProcessorModal .modal-footer .btn-primary').click();
    await page.waitForTimeout(500);

    // Dismiss any alert
    const alertVisible = await page.locator('#customAlertModal.active').isVisible().catch(() => false);
    if (alertVisible) {
      await page.locator('#customAlertOkBtn').click();
      await page.waitForTimeout(300);
    }

    // Open manage modal
    await page.evaluate(() => openManageCustomModal());
    await page.waitForTimeout(500);

    // Switch to Processors tab
    await page.locator('#manageTabProcessorsBtn').click();
    await page.waitForTimeout(300);

    // Click Delete
    const deleteBtn = page.locator('#manageCustomProcessorsContent .btn-small:has-text("Delete")').first();
    await deleteBtn.click();
    await page.waitForTimeout(300);

    // Confirm deletion
    await page.locator('#customAlertOkBtn').click();
    await page.waitForTimeout(500);

    // Verify removed from localStorage
    const processors = await StorageHelpers.getCustomProcessors(page);
    if (processors) {
      const keys = Object.keys(processors);
      const stillExists = keys.some(k => k.includes('DeleteMe'));
      expect(stillExists).toBe(false);
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.evaluate(() => openCustomProcessorModal());
    await page.waitForTimeout(300);

    // Leave fields empty and try to save
    await page.locator('#customProcessorModal .modal-footer .btn-primary').click();
    await page.waitForTimeout(300);

    // Alert should appear
    await expect(page.locator('#customAlertModal')).toHaveClass(/active/);

    // Dismiss alert
    await page.locator('#customAlertOkBtn').click();
  });
});
