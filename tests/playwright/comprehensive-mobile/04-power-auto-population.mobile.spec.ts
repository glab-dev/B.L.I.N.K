import { test, expect } from '../fixtures/mobile-base';
import { AppHelpers } from '../helpers/app-helpers';

/**
 * Comprehensive Mobile Test: Power Auto-Population
 * Tests that max panels per circuit auto-populates based on voltage/breaker/power settings.
 */
test.describe('Power Auto-Population @comprehensive @mobile', () => {
  test.beforeEach(async ({ page }) => {
    await AppHelpers.setupAppWithDimensions(page, 8, 6);
  });

  test('should display auto-calculated Max/Circuit placeholder', async ({ page }) => {
    const maxPanelsPerCircuit = page.locator('#maxPanelsPerCircuit');
    await maxPanelsPerCircuit.scrollIntoViewIfNeeded();
    const placeholder = await maxPanelsPerCircuit.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
    // Placeholder should be a number
    expect(Number(placeholder)).toBeGreaterThan(0);
  });

  test('should update Max/Circuit placeholder when voltage changes', async ({ page, power }) => {
    const maxPanelsPerCircuit = page.locator('#maxPanelsPerCircuit');
    await maxPanelsPerCircuit.scrollIntoViewIfNeeded();
    const placeholder208 = await maxPanelsPerCircuit.getAttribute('placeholder');

    const voltageSelect = page.locator('#voltage');
    await voltageSelect.scrollIntoViewIfNeeded();
    await power.setVoltage(120);
    await page.waitForTimeout(500);

    const placeholder120 = await maxPanelsPerCircuit.getAttribute('placeholder');
    // Lower voltage = fewer panels per circuit
    expect(Number(placeholder120)).toBeLessThan(Number(placeholder208));
  });

  test('should update Max/Circuit placeholder when breaker changes', async ({ page, power }) => {
    const maxPanelsPerCircuit = page.locator('#maxPanelsPerCircuit');
    await maxPanelsPerCircuit.scrollIntoViewIfNeeded();
    const placeholder20 = await maxPanelsPerCircuit.getAttribute('placeholder');

    const breakerSelect = page.locator('#breaker');
    await breakerSelect.scrollIntoViewIfNeeded();
    await power.setBreaker(30);
    await page.waitForTimeout(500);

    const placeholder30 = await maxPanelsPerCircuit.getAttribute('placeholder');
    // Higher breaker = more panels per circuit
    expect(Number(placeholder30)).toBeGreaterThan(Number(placeholder20));
  });

  test('should update Max/Circuit placeholder when switching Max/Avg power', async ({ page, power }) => {
    const maxPanelsPerCircuit = page.locator('#maxPanelsPerCircuit');
    await maxPanelsPerCircuit.scrollIntoViewIfNeeded();
    const placeholderMax = await maxPanelsPerCircuit.getAttribute('placeholder');

    await power.setPowerType('avg');
    await page.waitForTimeout(500);

    const placeholderAvg = await maxPanelsPerCircuit.getAttribute('placeholder');
    // Avg power is lower -> more panels per circuit
    expect(Number(placeholderAvg)).toBeGreaterThan(Number(placeholderMax));
  });

  test('should update results when phase changes', async ({ page, power }) => {
    const resultsBefore = await page.locator('#results').textContent();

    await power.setPhase(1);
    await page.waitForTimeout(500);

    const resultsAfter = await page.locator('#results').textContent();
    // Phase change affects amp display in results
    expect(resultsAfter).not.toBe(resultsBefore);
  });

  test('should preserve user override when auto value changes', async ({ page, power }) => {
    const maxPanelsPerCircuit = page.locator('#maxPanelsPerCircuit');
    await maxPanelsPerCircuit.scrollIntoViewIfNeeded();

    // Set user override
    await power.setMaxPanelsPerCircuit(5);
    await expect(power.maxPanelsPerCircuitInput).toHaveValue('5');

    // Change voltage (which would change auto value)
    const voltageSelect = page.locator('#voltage');
    await voltageSelect.scrollIntoViewIfNeeded();
    await power.setVoltage(120);
    await page.waitForTimeout(500);

    // User override should still be 5
    await expect(power.maxPanelsPerCircuitInput).toHaveValue('5');
  });

  test('should use auto value when user clears override', async ({ page, power }) => {
    const maxPanelsPerCircuit = page.locator('#maxPanelsPerCircuit');
    await maxPanelsPerCircuit.scrollIntoViewIfNeeded();

    // Set override then clear it
    await power.setMaxPanelsPerCircuit(5);
    await power.maxPanelsPerCircuitInput.fill('');
    await power.maxPanelsPerCircuitInput.blur();
    await page.waitForTimeout(300);

    // Placeholder should still show auto value
    const placeholder = await maxPanelsPerCircuit.getAttribute('placeholder');
    expect(Number(placeholder)).toBeGreaterThan(0);
  });

  test('should update circuit count in results when Max/Circuit changes', async ({ page, power }) => {
    const maxPanelsPerCircuit = page.locator('#maxPanelsPerCircuit');
    await maxPanelsPerCircuit.scrollIntoViewIfNeeded();

    // Set low max panels per circuit (more circuits)
    await power.setMaxPanelsPerCircuit(3);
    await page.waitForTimeout(500);
    const resultsLow = await page.locator('#results').textContent();

    // Set high max panels per circuit (fewer circuits)
    await power.setMaxPanelsPerCircuit(50);
    await page.waitForTimeout(500);
    const resultsHigh = await page.locator('#results').textContent();

    // Results should differ
    expect(resultsLow).not.toBe(resultsHigh);
  });

  test('should cascade power changes to gear list circuit count', async ({
    page, power, navigation,
  }) => {
    // Get gear list at default voltage
    await navigation.switchToGear();
    await page.waitForTimeout(300);
    const gearDefault = await page.locator('#gearListContent').textContent();

    // Change voltage to 120V (more circuits needed)
    await navigation.switchToComplex();
    await page.waitForTimeout(200);
    const voltageSelect = page.locator('#voltage');
    await voltageSelect.scrollIntoViewIfNeeded();
    await power.setVoltage(120);
    await page.waitForTimeout(500);

    // Check gear list changed
    await navigation.switchToGear();
    await page.waitForTimeout(300);
    const gearLowV = await page.locator('#gearListContent').textContent();

    expect(gearLowV).not.toBe(gearDefault);
  });

  test('should display auto-calculated Max/Data placeholder', async ({ page }) => {
    const maxPanelsPerData = page.locator('#maxPanelsPerData');
    await maxPanelsPerData.scrollIntoViewIfNeeded();
    const placeholder = await maxPanelsPerData.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
    expect(Number(placeholder)).toBeGreaterThan(0);
  });
});
