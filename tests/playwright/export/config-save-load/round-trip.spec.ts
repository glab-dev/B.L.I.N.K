import { test, expect } from '../../fixtures/base';
import { AppHelpers } from '../../helpers/app-helpers';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

/**
 * Export Test: Config Save/Load Round-Trip
 * Tests saving and loading configuration with all settings preserved
 */
test.describe('Config Save/Load Round-Trip', () => {
  test.beforeEach(async ({ page, clearLocalStorage }) => {
    await AppHelpers.setupApp(page);
    // Force fallback download path — Chromium's showSaveFilePicker and
    // navigator.canShare open native dialogs that don't trigger Playwright's
    // download event. We need the anchor-link fallback.
    await page.evaluate(() => {
      (window as any).showSaveFilePicker = undefined;
      (navigator as any).canShare = undefined;
    });
  });

  test('should save and load configuration preserving all settings @critical @desktop', async ({
    page,
    dimensions,
    power,
    data,
    structure,
  }) => {
    // Use OS temp dir to avoid parallel worker conflicts
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'blink-test-'));

    // Configure a complex setup
    await dimensions.setDimensionMode('panels');
    await dimensions.setPanelCount(16, 9);

    await power.setPowerType('avg');
    await power.setPhase(1);
    await power.setVoltage(120);
    await power.setBreaker(30);

    // Use value-based selection (labels stripped of brand prefix after dynamic rebuild)
    await data.processorSelect.selectOption('Brompton_SX40');
    await page.waitForTimeout(300);
    await data.setFrameRate(60);
    await data.setBitDepth(10);
    await data.toggleRedundancy(true);

    await structure.setStructureType('ground');
    await structure.toggleBumpers(true);

    // Wait for calculations
    await page.waitForTimeout(500);

    // Set config name (input is in the mobile menu, set directly via evaluate)
    await page.evaluate(() => {
      const el = document.getElementById('configName') as HTMLInputElement;
      if (el) el.value = 'Test_Round_Trip';
    });

    // Save using the header save icon button
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button.mobile-header-btn[title="Save Config"]').click();
    const download = await downloadPromise;

    // Save to temp file
    const downloadPath = path.join(
      tempDir,
      download.suggestedFilename() || 'test-config.ledconfig'
    );
    await download.saveAs(downloadPath);

    // Verify file exists
    const fileExists = await fs
      .access(downloadPath)
      .then(() => true)
      .catch(() => false);
    expect(fileExists).toBe(true);

    // Reload page (clear state)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await AppHelpers.enterApp(page);
    await page.waitForTimeout(500);

    // Load configuration via hidden file input
    const fileInput = page.locator('#loadConfigInput');
    await fileInput.setInputFiles(downloadPath);

    // Wait for load to complete
    await page.waitForTimeout(1000);

    // Dismiss the "loaded successfully" alert modal
    const alertModal = page.locator('#customAlertModal.active');
    if (await alertModal.isVisible()) {
      await page.locator('#customAlertOkBtn').click();
      await page.waitForTimeout(300);
    }

    // Verify all settings were restored
    await expect(dimensions.panelsWideInput).toHaveValue('16');
    await expect(dimensions.panelsHighInput).toHaveValue('9');

    // Check power settings via hidden select values (loadScreenData restores
    // select values but not toggle button active classes)
    await expect(page.locator('#powerType')).toHaveValue('avg');
    await expect(page.locator('#phase')).toHaveValue('1');
    await expect(power.voltageInput).toHaveValue('120');
    await expect(power.breakerInput).toHaveValue('30');

    // Check data settings
    const processorValue = await data.processorSelect.inputValue();
    expect(processorValue).toContain('Brompton_SX40');

    await expect(data.frameRateSelect).toHaveValue('60');
    await expect(data.bitDepthSelect).toHaveValue('10');

    // Redundancy button IS restored by loadScreenData
    const redundancyActive = await data.dataRedundancyBtn.getAttribute('class');
    expect(redundancyActive).toContain('active');

    // Check structure settings
    await expect(structure.structureTypeSelect).toHaveValue('ground');

    // Bumpers button IS restored by loadScreenData
    const bumpersActive = await structure.useBumpersBtn.getAttribute('class');
    expect(bumpersActive).toContain('active');

    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should handle multi-screen configuration save/load @desktop', async ({
    page,
    dimensions,
    structure,
  }) => {
    // Use OS temp dir to avoid parallel worker conflicts
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'blink-test-'));

    // Add 3 screens (total 4 including default)
    const addScreenBtn = page.locator('#screenAddBtn');
    await addScreenBtn.click();
    await page.waitForTimeout(200);
    await addScreenBtn.click();
    await page.waitForTimeout(200);
    await addScreenBtn.click();
    await page.waitForTimeout(200);

    // Verify 4 screens exist (scope to screenTabsContainer to exclude canvas tabs)
    const screenTabs = page.locator('#screenTabsContainer .screen-tab');
    await expect(screenTabs).toHaveCount(4);

    // Configure each screen differently
    await screenTabs.nth(0).click();
    await page.waitForTimeout(200);
    await dimensions.setPanelCount(10, 10);
    await structure.setStructureType('hanging');

    await screenTabs.nth(1).click();
    await page.waitForTimeout(200);
    await dimensions.setPanelCount(16, 9);
    await structure.setStructureType('ground');

    await screenTabs.nth(2).click();
    await page.waitForTimeout(200);
    await dimensions.setPanelCount(20, 8);

    await screenTabs.nth(3).click();
    await page.waitForTimeout(200);
    await dimensions.setPanelCount(8, 6);
    await structure.setStructureType('hanging');

    // Set config name and save using header icon
    await page.evaluate(() => {
      const el = document.getElementById('configName') as HTMLInputElement;
      if (el) el.value = 'Multi_Screen_Test';
    });
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button.mobile-header-btn[title="Save Config"]').click();
    const download = await downloadPromise;

    const downloadPath = path.join(
      tempDir,
      download.suggestedFilename() || 'multi-screen.ledconfig'
    );
    await download.saveAs(downloadPath);

    // Reload and load
    await page.reload();
    await page.waitForLoadState('networkidle');
    await AppHelpers.enterApp(page);
    await page.waitForTimeout(500);

    await page.locator('#loadConfigInput').setInputFiles(downloadPath);
    await page.waitForTimeout(1000);

    // Dismiss the "loaded successfully" alert modal
    const alertModal = page.locator('#customAlertModal.active');
    if (await alertModal.isVisible()) {
      await page.locator('#customAlertOkBtn').click();
      await page.waitForTimeout(300);
    }

    // Verify all 4 screens exist (scope to screenTabsContainer to exclude canvas tabs)
    const loadedScreenTabs = page.locator('#screenTabsContainer .screen-tab');
    await expect(loadedScreenTabs).toHaveCount(4);

    // Verify each screen's configuration
    await loadedScreenTabs.nth(0).click();
    await page.waitForTimeout(200);
    await expect(dimensions.panelsWideInput).toHaveValue('10');
    await expect(structure.structureTypeSelect).toHaveValue('hanging');

    await loadedScreenTabs.nth(1).click();
    await page.waitForTimeout(200);
    await expect(dimensions.panelsWideInput).toHaveValue('16');
    await expect(structure.structureTypeSelect).toHaveValue('ground');

    await loadedScreenTabs.nth(2).click();
    await page.waitForTimeout(200);
    await expect(dimensions.panelsWideInput).toHaveValue('20');

    await loadedScreenTabs.nth(3).click();
    await page.waitForTimeout(200);
    await expect(dimensions.panelsWideInput).toHaveValue('8');
    await expect(structure.structureTypeSelect).toHaveValue('hanging');

    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });
});
