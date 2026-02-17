import { test, expect } from '../fixtures/base';
import { AppHelpers } from '../helpers/app-helpers';

/**
 * Comprehensive Test: Modals
 * Tests every modal open/close/tab-switch behavior.
 */
test.describe('Modals @comprehensive @desktop', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
  });

  // ── Help Modal ──

  test('should open help modal', async ({ page }) => {
    await page.evaluate('openHelpModal()');
    await page.waitForTimeout(300);
    await expect(page.locator('#helpModal')).toHaveClass(/active/);
  });

  test('should switch help tabs between Simple and Complex', async ({ page }) => {
    await page.evaluate('openHelpModal()');
    await page.waitForTimeout(300);

    // Click Complex tab
    const complexTab = page.locator('.help-tab-btn', { hasText: 'Complex' });
    await complexTab.click();
    await page.waitForTimeout(200);
    await expect(complexTab).toHaveClass(/active/);

    // Click Simple tab
    const simpleTab = page.locator('.help-tab-btn', { hasText: 'Simple' });
    await simpleTab.click();
    await page.waitForTimeout(200);
    await expect(simpleTab).toHaveClass(/active/);
  });

  test('should close help modal', async ({ page }) => {
    await page.evaluate('openHelpModal()');
    await page.waitForTimeout(300);
    await page.locator('#helpModal .modal-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#helpModal')).not.toHaveClass(/active/);
  });

  // ── Custom Panel Modal ──

  test('should open custom panel modal with Specs tab', async ({ page }) => {
    await page.evaluate('openCustomPanelModal()');
    await page.waitForTimeout(300);
    await expect(page.locator('#customPanelModal')).toHaveClass(/active/);
    await expect(page.locator('#cpTabSpecsBtn')).toHaveClass(/active/);
  });

  test('should switch custom panel tabs: Specs, Cables, Structure, Gear', async ({ page }) => {
    await page.evaluate('openCustomPanelModal()');
    await page.waitForTimeout(300);

    // Cables tab
    await page.locator('#cpTabCablesBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#cpTabCablesBtn')).toHaveClass(/active/);
    await expect(page.locator('#cpTabCables')).toBeVisible();

    // Structure tab
    await page.locator('#cpTabStructureBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#cpTabStructureBtn')).toHaveClass(/active/);
    await expect(page.locator('#cpTabStructure')).toBeVisible();

    // Gear tab
    await page.locator('#cpTabGearBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#cpTabGearBtn')).toHaveClass(/active/);
    await expect(page.locator('#cpTabGear')).toBeVisible();

    // Back to Specs
    await page.locator('#cpTabSpecsBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#cpTabSpecsBtn')).toHaveClass(/active/);
    await expect(page.locator('#cpTabSpecs')).toBeVisible();
  });

  test('should fill all custom panel specs fields', async ({ page }) => {
    await page.evaluate('openCustomPanelModal()');
    await page.waitForTimeout(300);

    await page.locator('#customPanelBrand').fill('TestBrand');
    await page.locator('#customPanelName').fill('TestPanel');
    await page.locator('#customPanelPixelPitch').fill('2.5');
    await page.locator('#customPanelWidth').fill('500');
    await page.locator('#customPanelHeight').fill('500');
    await page.locator('#customPanelDepth').fill('80');
    await page.locator('#customPanelResX').fill('200');
    await page.locator('#customPanelResY').fill('200');
    await page.locator('#customPanelPowerMax').fill('150');
    await page.locator('#customPanelPowerAvg').fill('75');
    await page.locator('#customPanelBrightness').fill('1200');
    await page.locator('#customPanelWeight').fill('8');

    await expect(page.locator('#customPanelBrand')).toHaveValue('TestBrand');
    await expect(page.locator('#customPanelName')).toHaveValue('TestPanel');
    await expect(page.locator('#customPanelPixelPitch')).toHaveValue('2.5');
  });

  test('should toggle removable frame checkbox and show weight fields', async ({ page }) => {
    await page.evaluate('openCustomPanelModal()');
    await page.waitForTimeout(300);

    const checkbox = page.locator('#customPanelRemovableFrame');
    await checkbox.check();
    await page.waitForTimeout(200);
    await expect(page.locator('#frameWeightFields')).toBeVisible();

    await checkbox.uncheck();
    await page.waitForTimeout(200);
    await expect(page.locator('#frameWeightFields')).not.toBeVisible();
  });

  test('should toggle jumpers built-in in cables tab', async ({ page }) => {
    await page.evaluate('openCustomPanelModal()');
    await page.waitForTimeout(300);
    await page.locator('#cpTabCablesBtn').click();
    await page.waitForTimeout(200);

    // Checkbox may be hidden (custom styled) — use evaluate to toggle
    await page.evaluate('document.getElementById("cpJumpersBuiltin").click()');
    await page.waitForTimeout(200);
    const isChecked = await page.evaluate('document.getElementById("cpJumpersBuiltin").checked');
    expect(isChecked).toBe(true);
  });

  test('should close custom panel modal with Cancel', async ({ page }) => {
    await page.evaluate('openCustomPanelModal()');
    await page.waitForTimeout(300);
    await page.evaluate('closeCustomPanelModal()');
    await page.waitForTimeout(300);
    await expect(page.locator('#customPanelModal')).not.toHaveClass(/active/);
  });

  // ── Custom Processor Modal ──

  test('should open custom processor modal', async ({ page }) => {
    await page.evaluate('openCustomProcessorModal()');
    await page.waitForTimeout(300);
    await expect(page.locator('#customProcessorModal')).toHaveClass(/active/);
  });

  test('should toggle processor dist box fields', async ({ page }) => {
    await page.evaluate('openCustomProcessorModal()');
    await page.waitForTimeout(300);

    // Checkbox may be hidden (custom styled) — use evaluate to toggle
    await page.evaluate('document.getElementById("cpProcessorDistBox").click()');
    await page.waitForTimeout(200);
    await expect(page.locator('#cpProcessorDistBoxFields')).toBeVisible();

    await page.evaluate('document.getElementById("cpProcessorDistBox").click()');
    await page.waitForTimeout(200);
    await expect(page.locator('#cpProcessorDistBoxFields')).not.toBeVisible();
  });

  test('should close custom processor modal', async ({ page }) => {
    await page.evaluate('openCustomProcessorModal()');
    await page.waitForTimeout(300);
    await page.evaluate('closeCustomProcessorModal()');
    await page.waitForTimeout(300);
    await expect(page.locator('#customProcessorModal')).not.toHaveClass(/active/);
  });

  // ── PDF Export Modal ──

  test('should open PDF export modal with all checkboxes checked', async ({ page }) => {
    await page.evaluate('openPdfExportModal()');
    await page.waitForTimeout(300);
    await expect(page.locator('#pdfExportModal')).toHaveClass(/active/);

    // All section checkboxes should be checked by default
    await expect(page.locator('#pdfExportSpecs')).toBeChecked();
    await expect(page.locator('#pdfExportGearList')).toBeChecked();
    await expect(page.locator('#pdfExportStandard')).toBeChecked();
    await expect(page.locator('#pdfExportPower')).toBeChecked();
    await expect(page.locator('#pdfExportData')).toBeChecked();
    await expect(page.locator('#pdfExportStructure')).toBeChecked();
  });

  test('should toggle PDF export section checkboxes', async ({ page }) => {
    await page.evaluate('openPdfExportModal()');
    await page.waitForTimeout(300);

    // Uncheck specs
    await page.locator('#pdfExportSpecs').uncheck();
    await expect(page.locator('#pdfExportSpecs')).not.toBeChecked();

    // Re-check specs
    await page.locator('#pdfExportSpecs').check();
    await expect(page.locator('#pdfExportSpecs')).toBeChecked();
  });

  test('should toggle eco friendly and greyscale (mutually exclusive)', async ({ page }) => {
    await page.evaluate('openPdfExportModal()');
    await page.waitForTimeout(300);

    // Check eco-friendly
    await page.locator('#pdfExportEcoFriendly').check();
    await expect(page.locator('#pdfExportEcoFriendly')).toBeChecked();
    await expect(page.locator('#pdfExportGreyscale')).not.toBeChecked();

    // Check greyscale — eco should uncheck
    await page.locator('#pdfExportGreyscale').check();
    await page.waitForTimeout(100);
    await expect(page.locator('#pdfExportGreyscale')).toBeChecked();
    await expect(page.locator('#pdfExportEcoFriendly')).not.toBeChecked();
  });

  // ── Screen Rename Modal ──

  test('should open screen rename modal', async ({ page }) => {
    // Click edit button on first screen tab
    const editBtn = page.locator('#screenTabsContainer .screen-tab').first().locator('.screen-tab-edit');
    await editBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#screenRenameModal')).toHaveClass(/active/);
  });

  test('should change screen name and save', async ({ page }) => {
    const editBtn = page.locator('#screenTabsContainer .screen-tab').first().locator('.screen-tab-edit');
    await editBtn.click();
    await page.waitForTimeout(300);

    await page.locator('#screenRenameInput').fill('Test Screen');
    await page.evaluate('saveScreenRename()');
    await page.waitForTimeout(500);

    // Tab should show new name
    const tabText = await page.locator('#screenTabsContainer .screen-tab').first().textContent();
    expect(tabText).toContain('Test Screen');
  });

  // ── Manage Custom Items Modal ──

  test('should open manage custom modal and switch tabs', async ({ page }) => {
    await page.evaluate('openManageCustomModal()');
    await page.waitForTimeout(300);
    await expect(page.locator('#manageCustomModal')).toHaveClass(/active/);
    await expect(page.locator('#manageTabPanelsBtn')).toHaveClass(/active/);

    // Switch to processors tab
    await page.locator('#manageTabProcessorsBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#manageTabProcessorsBtn')).toHaveClass(/active/);
    await expect(page.locator('#manageTabPanelsBtn')).not.toHaveClass(/active/);

    // Switch to community tab
    await page.locator('#manageTabCommunityBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#manageTabCommunityBtn')).toHaveClass(/active/);

    // Close
    await page.locator('#manageCustomModal .modal-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#manageCustomModal')).not.toHaveClass(/active/);
  });

  // ── Gear Code Mapping Modal ──

  test('should open gear code modal and interact with tabs/search/scope', async ({ page }) => {
    await page.evaluate('openGearCodeModal()');
    await page.waitForTimeout(300);
    await expect(page.locator('#gearCodeModal')).toHaveClass(/active/);

    // Switch tabs
    await page.locator('#gcTabRiggingBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#gcTabRiggingBtn')).toHaveClass(/active/);

    await page.locator('#gcTabCablesBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#gcTabCablesBtn')).toHaveClass(/active/);

    await page.locator('#gcTabEquipmentBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#gcTabEquipmentBtn')).toHaveClass(/active/);

    // Search filter
    await page.locator('#gearCodeSearch').fill('test');
    await page.waitForTimeout(200);
    await expect(page.locator('#gearCodeSearch')).toHaveValue('test');

    // Scope toggle
    await page.locator('#gcScopeProject').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#gcScopeProject')).toHaveClass(/active/);

    await page.locator('#gcScopeGlobal').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#gcScopeGlobal')).toHaveClass(/active/);

    // Close
    await page.locator('#gearCodeModal .modal-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#gearCodeModal')).not.toHaveClass(/active/);
  });

  // ── Terms Modal ──

  test('should open terms modal from welcome page', async ({ page }) => {
    // Go back to welcome page
    await page.locator('.mobile-header-btn').first().click();
    await page.waitForTimeout(500);

    // Click Terms of Use
    const termsBtn = page.locator('.welcome-footer-link', { hasText: 'Terms of Use' });
    await termsBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#termsModal')).toHaveClass(/active/);

    // Close
    await page.locator('#termsModal .modal-close').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#termsModal')).not.toHaveClass(/active/);
  });

  // ── Request Item Modal ──

  test('should open request item modal and switch types', async ({ page }) => {
    await page.evaluate('openRequestItemModal()');
    await page.waitForTimeout(300);
    await expect(page.locator('#requestItemModal')).toHaveClass(/active/);

    // Click Panel type
    await page.locator('#requestTypePanelBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#requestTypePanelBtn')).toHaveClass(/active/);
    // Brand and Model fields should be visible
    await expect(page.locator('#requestBrand')).toBeVisible();
    await expect(page.locator('#requestModel')).toBeVisible();

    // Click Feature type
    await page.locator('#requestTypeFeatureBtn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#requestTypeFeatureBtn')).toHaveClass(/active/);
    await expect(page.locator('#requestFeatureText')).toBeVisible();

    // Close
    await page.locator('#requestItemModal .btn-secondary').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#requestItemModal')).not.toHaveClass(/active/);
  });
});
