import { test, expect } from '../fixtures/mobile-base';
import { AppHelpers } from '../helpers/app-helpers';

/**
 * Comprehensive Mobile Test: Layout Collapse/Expand
 * Tests collapse/expand for all layout containers and combined sub-layouts.
 */
test.describe('Layout Collapse/Expand @comprehensive @mobile', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 4, 3);
  });

  test('should collapse standard layout', async ({ page }) => {
    const collapseBtn = page.locator('#standardCollapseBtn');
    await collapseBtn.scrollIntoViewIfNeeded();
    await collapseBtn.click();
    await page.waitForTimeout(300);
    // Standard canvas should be hidden
    await expect(page.locator('#standardCanvas')).not.toBeVisible();
  });

  test('should expand standard layout after collapse', async ({ page }) => {
    const collapseBtn = page.locator('#standardCollapseBtn');
    await collapseBtn.scrollIntoViewIfNeeded();
    await collapseBtn.click();
    await page.waitForTimeout(300);
    await collapseBtn.scrollIntoViewIfNeeded();
    await collapseBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#standardCanvas')).toBeVisible();
  });

  test('should collapse power layout', async ({ page }) => {
    const collapseBtn = page.locator('#powerCollapseBtn');
    await collapseBtn.scrollIntoViewIfNeeded();
    await collapseBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#powerCanvas')).not.toBeVisible();
  });

  test('should expand power layout after collapse', async ({ page }) => {
    const collapseBtn = page.locator('#powerCollapseBtn');
    await collapseBtn.scrollIntoViewIfNeeded();
    await collapseBtn.click();
    await page.waitForTimeout(300);
    await collapseBtn.scrollIntoViewIfNeeded();
    await collapseBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#powerCanvas')).toBeVisible();
  });

  test('should collapse data layout', async ({ page }) => {
    const collapseBtn = page.locator('#dataCollapseBtn');
    await collapseBtn.scrollIntoViewIfNeeded();
    await collapseBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#dataCanvas')).not.toBeVisible();
  });

  test('should collapse structure layout', async ({ page }) => {
    const collapseBtn = page.locator('#structureCollapseBtn');
    await collapseBtn.scrollIntoViewIfNeeded();
    await collapseBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#structureCanvas')).not.toBeVisible();
  });

  test('should collapse and expand all four layouts', async ({ page }) => {
    // Collapse all
    const standardBtn = page.locator('#standardCollapseBtn');
    const powerBtn = page.locator('#powerCollapseBtn');
    const dataBtn = page.locator('#dataCollapseBtn');
    const structureBtn = page.locator('#structureCollapseBtn');

    await standardBtn.scrollIntoViewIfNeeded();
    await standardBtn.click();
    await powerBtn.scrollIntoViewIfNeeded();
    await powerBtn.click();
    await dataBtn.scrollIntoViewIfNeeded();
    await dataBtn.click();
    await structureBtn.scrollIntoViewIfNeeded();
    await structureBtn.click();
    await page.waitForTimeout(300);

    await expect(page.locator('#standardCanvas')).not.toBeVisible();
    await expect(page.locator('#powerCanvas')).not.toBeVisible();
    await expect(page.locator('#dataCanvas')).not.toBeVisible();
    await expect(page.locator('#structureCanvas')).not.toBeVisible();

    // Expand all
    await standardBtn.scrollIntoViewIfNeeded();
    await standardBtn.click();
    await powerBtn.scrollIntoViewIfNeeded();
    await powerBtn.click();
    await dataBtn.scrollIntoViewIfNeeded();
    await dataBtn.click();
    await structureBtn.scrollIntoViewIfNeeded();
    await structureBtn.click();
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

    const collapseBtn = page.locator('#combinedStandardCollapseBtn');
    await collapseBtn.scrollIntoViewIfNeeded();
    await collapseBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#combinedStandardCanvas')).not.toBeVisible();

    // Expand
    await collapseBtn.scrollIntoViewIfNeeded();
    await collapseBtn.click();
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
    const powerBtn = page.locator('#combinedPowerCollapseBtn');
    await powerBtn.scrollIntoViewIfNeeded();
    await powerBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#combinedPowerCanvas')).not.toBeVisible();

    // Collapse data
    const dataBtn = page.locator('#combinedDataCollapseBtn');
    await dataBtn.scrollIntoViewIfNeeded();
    await dataBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#combinedDataCanvas')).not.toBeVisible();
  });
});
