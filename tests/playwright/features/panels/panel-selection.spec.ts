import { test, expect } from '../../fixtures/base';
import { AppHelpers } from '../../helpers/app-helpers';

/**
 * Feature Test: Panel Selection
 * Tests panel type dropdown, specs update, canvas re-render, custom panel creation
 */
test.describe('Panel Selection', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 6, 4);
  });

  test('should have a default panel selected @critical', async ({
    page,
    dimensions,
  }) => {
    const panelType = await dimensions.panelTypeSelect.inputValue();
    expect(panelType).toBeTruthy();
  });

  test('should list all built-in panel types @critical', async ({
    page,
    dimensions,
  }) => {
    const options = await dimensions.panelTypeSelect.locator('option').allTextContents();

    // Should have multiple panel options
    expect(options.length).toBeGreaterThan(3);

    // Should include known panel types (text may be abbreviated)
    const optionsText = options.join(', ');
    expect(optionsText).toContain('BP2');
    expect(optionsText).toContain('CB5');
    expect(optionsText).toContain('BO3');
  });

  test('should switch panel type and update results @critical', async ({
    page,
    dimensions,
  }) => {
    // Get initial results
    const initialResults = await page.locator('#results').textContent();

    // Get all option values to find a different panel
    const options = await dimensions.panelTypeSelect.locator('option').evaluateAll(
      (opts: HTMLOptionElement[]) => opts.map(o => ({ value: o.value, text: o.textContent }))
    );
    const currentValue = await dimensions.panelTypeSelect.inputValue();

    // Find a different panel option (skip "Add Custom Panel..." option)
    const differentPanel = options.find(
      o => o.value !== currentValue && !o.text?.includes('Custom')
    );
    expect(differentPanel).toBeTruthy();

    // Switch to different panel
    await dimensions.panelTypeSelect.selectOption(differentPanel!.value);
    await page.waitForTimeout(500);

    // Results should update (different panel = different specs)
    const newResults = await page.locator('#results').textContent();
    expect(newResults).not.toBe(initialResults);
  });

  test('should re-render canvas when switching panels @critical', async ({
    page,
    dimensions,
  }) => {
    // Get initial canvas state
    const canvas = page.locator('#standardCanvas');
    const initialData = await canvas.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext('2d');
      if (!ctx) return '';
      return ctx.getImageData(0, 0, 10, 10).data.toString();
    });

    // Switch to a different panel
    const options = await dimensions.panelTypeSelect.locator('option').evaluateAll(
      (opts: HTMLOptionElement[]) => opts.map(o => o.value)
    );
    const currentValue = await dimensions.panelTypeSelect.inputValue();
    const differentPanel = options.find(v => v !== currentValue && v !== 'custom');

    if (differentPanel) {
      await dimensions.panelTypeSelect.selectOption(differentPanel);
      await page.waitForTimeout(500);

      // Canvas should have been re-rendered
      const newData = await canvas.evaluate((el: HTMLCanvasElement) => {
        const ctx = el.getContext('2d');
        if (!ctx) return '';
        return ctx.getImageData(0, 0, 10, 10).data.toString();
      });

      // Panel dimensions differ so canvas layout changes
      expect(newData).not.toBe(initialData);
    }
  });

  test('should open custom panel modal when "Add Custom Panel" is selected', async ({
    page,
    dimensions,
  }) => {
    // Select "Add Custom Panel..." option
    const options = await dimensions.panelTypeSelect.locator('option').evaluateAll(
      (opts: HTMLOptionElement[]) => opts.map(o => ({ value: o.value, text: o.textContent }))
    );
    const customOption = options.find(o => o.text?.includes('Custom'));

    if (customOption) {
      await dimensions.panelTypeSelect.selectOption(customOption.value);
      await page.waitForTimeout(500);

      // Custom panel modal should appear
      const modal = page.locator('#customPanelModal');
      await expect(modal).toBeVisible();
    }
  });

  test('should preserve panel selection after entering dimensions', async ({
    page,
    dimensions,
  }) => {
    // Switch to CB5
    const options = await dimensions.panelTypeSelect.locator('option').evaluateAll(
      (opts: HTMLOptionElement[]) => opts.map(o => ({ value: o.value, text: o.textContent }))
    );
    const cb5Option = options.find(o => o.text?.includes('CB5') && !o.text?.includes('Half'));

    if (cb5Option) {
      await dimensions.panelTypeSelect.selectOption(cb5Option.value);
      await page.waitForTimeout(300);

      // Change dimensions
      await dimensions.setPanelCount(10, 8);

      // Panel selection should still be CB5
      const selectedValue = await dimensions.panelTypeSelect.inputValue();
      expect(selectedValue).toBe(cb5Option.value);
    }
  });
});
