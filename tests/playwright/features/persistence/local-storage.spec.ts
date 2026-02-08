import { test, expect } from '../../fixtures/base';
import { AppHelpers } from '../../helpers/app-helpers';
import { StorageHelpers } from '../../helpers/storage-helpers';

test.describe('localStorage Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupApp(page);
  });

  test('should persist custom panels across reload @critical', async ({ page }) => {
    // Seed a custom panel
    await page.evaluate(() => {
      const panels = {
        custom_test_panel: {
          brand: 'TestPersist', name: 'PersistPanel',
          width: 500, height: 500, weight: 10,
          power_max: 200, power_avg: 100, custom: true
        }
      };
      localStorage.setItem('ledcalc_custom_panels', JSON.stringify(panels));
    });

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await AppHelpers.enterApp(page);
    await page.waitForTimeout(500);

    // Verify
    const panels = await StorageHelpers.getCustomPanels(page);
    expect(panels).toBeTruthy();
    expect(panels).toHaveProperty('custom_test_panel');
    expect(panels.custom_test_panel.brand).toBe('TestPersist');
  });

  test('should persist custom processors across reload @critical', async ({ page }) => {
    // Seed a custom processor
    await page.evaluate(() => {
      const procs = {
        custom_test_proc: {
          brand: 'TestProcBrand', name: 'TestProcName',
          port_type: '1g', base_pixels_1g: 400000,
          base_framerate: 60, base_bitdepth: 8,
          total_pixels: 4000000, output_ports: 4,
          outputs: '4 x 1G', custom: true
        }
      };
      localStorage.setItem('ledcalc_custom_processors', JSON.stringify(procs));
    });

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await AppHelpers.enterApp(page);
    await page.waitForTimeout(500);

    // Verify
    const procs = await StorageHelpers.getCustomProcessors(page);
    expect(procs).toBeTruthy();
    expect(procs).toHaveProperty('custom_test_proc');
    expect(procs.custom_test_proc.brand).toBe('TestProcBrand');
  });

  test('should handle malformed localStorage gracefully', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('ledcalc_custom_panels', 'not valid json');
    });

    // Reload — app should not crash
    await page.reload();
    await page.waitForLoadState('networkidle');
    await AppHelpers.enterApp(page);

    // App should be functional
    await expect(page.locator('#panelsWide')).toBeVisible();
    await expect(page.locator('#panelType')).toBeVisible();
  });

  test('should handle empty localStorage', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await AppHelpers.enterApp(page);

    // Should have default state
    await expect(page.locator('#panelsWide')).toBeVisible();
    const panelType = await page.locator('#panelType').inputValue();
    expect(panelType).toBeTruthy();
  });
});
