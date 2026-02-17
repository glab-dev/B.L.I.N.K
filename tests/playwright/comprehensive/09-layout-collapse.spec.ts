import { test, expect } from '../fixtures/base';
import { AppHelpers } from '../helpers/app-helpers';

/**
 * Comprehensive Test: Layout Collapse/Expand
 * Tests collapse/expand for all layout containers and combined sub-layouts.
 */
test.describe('Layout Collapse/Expand @comprehensive @desktop', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
  });

  test('should collapse standard layout', async ({ page }) => {
    await page.locator('#standardCollapseBtn').click();
    await page.waitForTimeout(300);
    // Standard canvas should be hidden
    await expect(page.locator('#standardCanvas')).not.toBeVisible();
  });

  test('should expand standard layout after collapse', async ({ page }) => {
    await page.locator('#standardCollapseBtn').click();
    await page.waitForTimeout(300);
    await page.locator('#standardCollapseBtn').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#standardCanvas')).toBeVisible();
  });

  test('should collapse power layout', async ({ page }) => {
    await page.locator('#powerCollapseBtn').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#powerCanvas')).not.toBeVisible();
  });

  test('should expand power layout after collapse', async ({ page }) => {
    await page.locator('#powerCollapseBtn').click();
    await page.waitForTimeout(300);
    await page.locator('#powerCollapseBtn').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#powerCanvas')).toBeVisible();
  });

  test('should collapse data layout', async ({ page }) => {
    await page.locator('#dataCollapseBtn').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#dataCanvas')).not.toBeVisible();
  });

  test('should collapse structure layout', async ({ page }) => {
    await page.locator('#structureCollapseBtn').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#structureCanvas')).not.toBeVisible();
  });

  test('should collapse and expand all four layouts', async ({ page }) => {
    // Collapse all
    await page.locator('#standardCollapseBtn').click();
    await page.locator('#powerCollapseBtn').click();
    await page.locator('#dataCollapseBtn').click();
    await page.locator('#structureCollapseBtn').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#standardCanvas')).not.toBeVisible();
    await expect(page.locator('#powerCanvas')).not.toBeVisible();
    await expect(page.locator('#dataCanvas')).not.toBeVisible();
    await expect(page.locator('#structureCanvas')).not.toBeVisible();

    // Expand all
    await page.locator('#standardCollapseBtn').click();
    await page.locator('#powerCollapseBtn').click();
    await page.locator('#dataCollapseBtn').click();
    await page.locator('#structureCollapseBtn').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#standardCanvas')).toBeVisible();
    await expect(page.locator('#powerCanvas')).toBeVisible();
    await expect(page.locator('#dataCanvas')).toBeVisible();
    await expect(page.locator('#structureCanvas')).toBeVisible();
  });

  test('should collapse combined standard layout', async ({ page, navigation }) => {
    // Add a second screen so combined view has content
    await page.locator('#screenAddBtn').click();
    await page.waitForTimeout(300);
    await page.locator('#panelsWide').fill('3');
    await page.locator('#panelsHigh').fill('2');
    await page.locator('#panelsHigh').blur();
    await page.waitForTimeout(500);

    await navigation.switchToCombined();
    await page.waitForTimeout(500);

    await page.locator('#combinedStandardCollapseBtn').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#combinedStandardCanvas')).not.toBeVisible();

    // Expand
    await page.locator('#combinedStandardCollapseBtn').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#combinedStandardCanvas')).toBeVisible();
  });

  test('should collapse combined power and data layouts', async ({ page, navigation }) => {
    await page.locator('#screenAddBtn').click();
    await page.waitForTimeout(300);
    await page.locator('#panelsWide').fill('3');
    await page.locator('#panelsHigh').fill('2');
    await page.locator('#panelsHigh').blur();
    await page.waitForTimeout(500);

    await navigation.switchToCombined();
    await page.waitForTimeout(500);

    // Collapse power
    await page.locator('#combinedPowerCollapseBtn').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#combinedPowerCanvas')).not.toBeVisible();

    // Collapse data
    await page.locator('#combinedDataCollapseBtn').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#combinedDataCanvas')).not.toBeVisible();
  });
});
