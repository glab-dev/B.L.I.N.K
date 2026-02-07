import { test, expect } from '../../fixtures/base';
import path from 'path';
import fs from 'fs/promises';

/**
 * Export Test: Config Save/Load Round-Trip
 * Tests saving and loading configuration with all settings preserved
 */
test.describe('Config Save/Load Round-Trip', () => {
  const tempDir = path.join(__dirname, '../../../temp');

  test.beforeAll(async () => {
    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });
  });

  test.afterAll(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  test.beforeEach(async ({ page, clearLocalStorage }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should save and load configuration preserving all settings @critical @desktop', async ({
    page,
    dimensions,
    power,
    data,
    structure,
  }) => {
    // Configure a complex setup
    await dimensions.setDimensionMode('panels');
    await dimensions.setPanelCount(16, 9);
    await dimensions.setAspectRatio('16:9');

    await power.setPowerType('avg');
    await power.setPhase(1);
    await power.setVoltage(120);
    await power.setBreaker(30);

    await data.setProcessor('Brompton SX40');
    await data.setFrameRate(60);
    await data.setBitDepth(10);
    await data.toggleRedundancy(true);

    await structure.setStructureType('ground');
    await structure.toggleBumpers(true);

    // Wait for calculations
    await page.waitForTimeout(500);

    // Set config name
    const configNameInput = page.locator('#configName');
    await configNameInput.fill('Test_Round_Trip');

    // Save configuration
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Save")').first().click();
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
    await page.waitForTimeout(500);

    // Load configuration
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(downloadPath);

    // Wait for load to complete
    await page.waitForTimeout(1000);

    // Verify all settings were restored
    await expect(dimensions.panelsWideInput).toHaveValue('16');
    await expect(dimensions.panelsHighInput).toHaveValue('9');

    // Check aspect ratio button has active class
    const ar169Active = await dimensions.aspectRatio169Btn.getAttribute(
      'class'
    );
    expect(ar169Active).toContain('active');

    // Check power settings
    const powerAvgActive = await power.powerAvgBtn.getAttribute('class');
    expect(powerAvgActive).toContain('active');

    const phase1Active = await power.phase1Btn.getAttribute('class');
    expect(phase1Active).toContain('active');

    await expect(power.voltageInput).toHaveValue('120');
    await expect(power.breakerInput).toHaveValue('30');

    // Check data settings
    const processorValue = await data.processorSelect.inputValue();
    expect(processorValue).toContain('Brompton_SX40');

    await expect(data.frameRateSelect).toHaveValue('60');
    await expect(data.bitDepthSelect).toHaveValue('10');

    const redundancyActive = await data.dataRedundancyBtn.getAttribute('class');
    expect(redundancyActive).toContain('active');

    // Check structure settings
    await expect(structure.structureTypeSelect).toHaveValue('ground');

    const bumpersActive = await structure.useBumpersBtn.getAttribute('class');
    expect(bumpersActive).toContain('active');

    // Clean up temp file
    await fs.unlink(downloadPath);
  });

  test('should handle multi-screen configuration save/load @desktop', async ({
    page,
    dimensions,
    structure,
  }) => {
    // Add 3 screens (total 4 including default)
    const addScreenBtn = page.locator('.screen-tab-add');
    await addScreenBtn.click();
    await page.waitForTimeout(200);
    await addScreenBtn.click();
    await page.waitForTimeout(200);
    await addScreenBtn.click();
    await page.waitForTimeout(200);

    // Verify 4 screens exist
    const screenTabs = page.locator('.screen-tab');
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
    await structure.setStructureType('floor');

    await screenTabs.nth(3).click();
    await page.waitForTimeout(200);
    await dimensions.setPanelCount(8, 6);
    await structure.setStructureType('hanging');

    // Save config
    await page.locator('#configName').fill('Multi_Screen_Test');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Save")').first().click();
    const download = await downloadPromise;

    const downloadPath = path.join(
      tempDir,
      download.suggestedFilename() || 'multi-screen.ledconfig'
    );
    await download.saveAs(downloadPath);

    // Reload and load
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.locator('input[type="file"]').first().setInputFiles(downloadPath);
    await page.waitForTimeout(1000);

    // Verify all 4 screens exist
    const loadedScreenTabs = page.locator('.screen-tab');
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
    await expect(structure.structureTypeSelect).toHaveValue('floor');

    await loadedScreenTabs.nth(3).click();
    await page.waitForTimeout(200);
    await expect(dimensions.panelsWideInput).toHaveValue('8');
    await expect(structure.structureTypeSelect).toHaveValue('hanging');

    // Clean up
    await fs.unlink(downloadPath);
  });
});
