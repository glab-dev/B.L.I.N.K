import { test, expect } from '../fixtures/base';
import { CanvasHelpers } from '../helpers/canvas-helpers';
import { AppHelpers } from '../helpers/app-helpers';

/**
 * Walkthrough Tests — Build Real Projects From Scratch
 *
 * These tests recreate actual .ledconfig projects step-by-step through the UI.
 * Run with: npm run test:watch -- tests/playwright/workflows/app-walkthrough.spec.ts
 *
 * Each test builds a complete multi-screen project, configuring every section
 * (dimensions, power, data, structure) and navigating all views.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Configure a screen with common settings shared across most configs */
async function configureScreen(
  page: any,
  dimensions: any,
  power: any,
  data: any,
  structure: any,
  config: {
    panelType: string;
    wide: number;
    high: number;
    voltage?: number;
    breaker?: number;
    phase?: 1 | 3;
    powerType?: 'max' | 'avg';
    processor?: string;
    frameRate?: number;
    bitDepth?: number;
    structureType?: 'hanging' | 'ground' | 'floor';
    bumpers?: boolean;
    redundancy?: boolean;
    arrows?: boolean;
  }
) {
  // Panel type first (affects all calculations)
  await dimensions.panelTypeSelect.selectOption(config.panelType);
  await page.waitForTimeout(300);

  // Dimensions
  await dimensions.setPanelCount(config.wide, config.high);

  // Power
  if (config.powerType) await power.setPowerType(config.powerType);
  if (config.phase) await power.setPhase(config.phase);
  if (config.voltage) await power.setVoltage(config.voltage);
  if (config.breaker) await power.setBreaker(config.breaker);

  // Data
  if (config.processor) {
    await data.processorSelect.selectOption(config.processor);
    await page.waitForTimeout(300);
  }
  if (config.frameRate) await data.setFrameRate(config.frameRate);
  if (config.bitDepth) await data.setBitDepth(config.bitDepth);
  if (config.redundancy !== undefined) await data.toggleRedundancy(config.redundancy);
  if (config.arrows !== undefined) await data.toggleArrows(config.arrows);

  // Structure
  if (config.structureType) await structure.setStructureType(config.structureType);
  if (config.bumpers !== undefined) await structure.toggleBumpers(config.bumpers);

  await page.waitForTimeout(500);
}

/** Rename a screen and set its colors */
async function renameScreen(
  page: any,
  screenIndex: number,
  name: string,
  color1?: string,
  color2?: string
) {
  // Click the edit pencil on the screen tab
  const editBtn = page.locator('#screenTabsContainer .screen-tab').nth(screenIndex).locator('.screen-tab-edit');
  await editBtn.click();
  await page.waitForTimeout(300);

  // Fill the name
  await page.locator('#screenRenameInput').fill(name);

  // Set colors if provided
  if (color1) {
    await page.locator('#screenColorInput').evaluate(
      (el: HTMLInputElement, val: string) => { el.value = val; el.dispatchEvent(new Event('input')); },
      color1
    );
  }
  if (color2) {
    await page.locator('#screenColor2Input').evaluate(
      (el: HTMLInputElement, val: string) => { el.value = val; el.dispatchEvent(new Event('input')); },
      color2
    );
  }

  // Save via evaluate to avoid click target issues
  await page.evaluate('saveScreenRename()');
  await page.waitForTimeout(500);
}

/** Add a new screen (clicks the + button) */
async function addScreen(page: any) {
  await page.locator('#screenAddBtn').click();
  await page.waitForTimeout(500);
}

/** Switch to a screen by tab index */
async function switchToScreen(page: any, index: number) {
  // Use evaluate to call switchToScreen directly — clicking the tab
  // can accidentally hit the edit/close buttons inside it
  const screenIds = await page.evaluate('Object.keys(screens)');
  const screenId = screenIds[index];
  await page.evaluate(`switchToScreen('${screenId}')`);
  await page.waitForTimeout(800);
}

/** Wait for canvas panel dimensions to be set (non-zero)
 *  Note: currentPanelWidth/Height are declared with `let` in index.html,
 *  so they are NOT on `window` — must access directly via eval string. */
async function waitForPanelDims(page: any, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const dims = await page.evaluate('({ w: currentPanelWidth || 0, h: currentPanelHeight || 0 })');
    if (dims.w > 0 && dims.h > 0) return dims;
    await page.waitForTimeout(200);
  }
  throw new Error('Panel dimensions not set within timeout');
}

/** Get the pixel coordinates for a panel on the standard canvas */
async function getPanelPageCoords(page: any, canvas: any, col: number, row: number) {
  // Ensure panel dimensions are ready
  await waitForPanelDims(page);

  // Access let-scoped globals via eval string (not window.)
  const panelDims = await page.evaluate(`({
    w: currentPanelWidth || 0,
    h: currentPanelHeight || 0,
    cw: document.getElementById('standardCanvas')?.width || 0,
    ch: document.getElementById('standardCanvas')?.height || 0,
  })`);

  if (!panelDims.w || !panelDims.h || !panelDims.cw || !panelDims.ch) {
    throw new Error(`Invalid panel dimensions: ${JSON.stringify(panelDims)}`);
  }

  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not visible');

  // Scale from canvas pixels to page pixels
  const scaleX = box.width / panelDims.cw;
  const scaleY = box.height / panelDims.ch;

  const x = box.x + (col * panelDims.w + panelDims.w / 2) * scaleX;
  const y = box.y + (row * panelDims.h + panelDims.h / 2) * scaleY;

  return { x, y };
}

/** Click a panel on the standard canvas to select it */
async function clickPanel(page: any, canvas: any, col: number, row: number) {
  const { x, y } = await getPanelPageCoords(page, canvas, col, row);
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);
}

/** Right-click a panel to open context menu */
async function rightClickPanel(page: any, canvas: any, col: number, row: number) {
  const { x, y } = await getPanelPageCoords(page, canvas, col, row);
  await page.mouse.click(x, y, { button: 'right' });
  await page.waitForTimeout(300);
}

/** Delete the currently selected panels via context menu */
async function deleteSelectedPanels(page: any, canvas: any, col: number, row: number) {
  await rightClickPanel(page, canvas, col, row);
  // Click the "Delete" option in the context menu
  const menu = page.locator('#panelContextMenu');
  await menu.locator('div', { hasText: /Delete.*panel/ }).click();
  await page.waitForTimeout(500);
}

/** Assign selected panels to a circuit number via context menu */
async function assignCircuit(page: any, canvas: any, col: number, row: number, circuitNum: number) {
  // Set up dialog handler before triggering the prompt
  page.once('dialog', async (dialog: any) => {
    await dialog.accept(String(circuitNum));
  });

  await rightClickPanel(page, canvas, col, row);
  const menu = page.locator('#panelContextMenu');
  await menu.locator('div', { hasText: /Assign Circuit/ }).click();
  await page.waitForTimeout(500);
}

/** Verify the #results text contains expected panel dimensions */
async function verifyResults(page: any, expectedText: string) {
  await expect(page.locator('#results')).toContainText(expectedText);
}

// ─── Test B: 9-Screen Show ─────────────────────────────────────────────────

test.describe('Build 9-screen show with multiple panel types @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage }) => {
    await AppHelpers.setupApp(page);
  });

  test('build complete 9-screen show from scratch', async ({
    page,
    dimensions,
    power,
    data,
    structure,
    navigation,
  }) => {
    // Increase timeout for this long walkthrough
    test.setTimeout(300000);

    // ── Screen 1: USC — 10×4 BP2 V2 ──
    await configureScreen(page, dimensions, power, data, structure, {
      panelType: 'BP2_V2',
      wide: 10,
      high: 4,
      voltage: 208,
      breaker: 20,
      phase: 3,
      powerType: 'max',
      processor: 'Brompton_SX40',
      frameRate: 60,
      bitDepth: 8,
      structureType: 'hanging',
      bumpers: true,
      redundancy: true,
      arrows: true,
    });
    await renameScreen(page, 0, 'USC', '#800080', '#008080');
    await verifyResults(page, '10 × 4');

    // Verify canvas renders
    const standardCanvas = page.locator('#standardCanvas');
    await standardCanvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(standardCanvas);

    // Scroll through all 4 layout canvases
    const powerCanvas = page.locator('#powerCanvas');
    await powerCanvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const dataCanvas = page.locator('#dataCanvas');
    await dataCanvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const structureCanvas = page.locator('#structureCanvas');
    await structureCanvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // ── Screen 2: IMAG SR — 5×4 CB5 MKII ──
    await addScreen(page);
    await configureScreen(page, dimensions, power, data, structure, {
      panelType: 'CB5_MKII',
      wide: 5,
      high: 4,
      voltage: 208,
      breaker: 20,
      phase: 3,
      powerType: 'max',
      processor: 'Brompton_SX40',
      frameRate: 60,
      bitDepth: 8,
      structureType: 'hanging',
      bumpers: true,
      redundancy: true,
      arrows: true,
    });
    await renameScreen(page, 1, 'IMAG SR', '#804040', '#808080');
    await verifyResults(page, '5 × 4');

    // ── Screen 3: IMAG SL — 5×4 CB5 MKII ──
    await addScreen(page);
    await configureScreen(page, dimensions, power, data, structure, {
      panelType: 'CB5_MKII',
      wide: 5,
      high: 4,
      voltage: 208,
      breaker: 20,
      phase: 3,
      powerType: 'max',
      processor: 'Brompton_SX40',
      frameRate: 60,
      bitDepth: 8,
      structureType: 'hanging',
      bumpers: true,
      redundancy: true,
      arrows: true,
    });
    await renameScreen(page, 2, 'IMAG SL', '#408040', '#808080');
    await verifyResults(page, '5 × 4');

    // ── Screen 4: TOP — 20×3 MC7H ──
    await addScreen(page);
    await configureScreen(page, dimensions, power, data, structure, {
      panelType: 'MC7H',
      wide: 20,
      high: 3,
      voltage: 208,
      breaker: 20,
      phase: 3,
      powerType: 'max',
      processor: 'Brompton_SX40',
      frameRate: 60,
      bitDepth: 8,
      structureType: 'hanging',
      bumpers: true,
      redundancy: true,
      arrows: true,
    });
    await renameScreen(page, 3, 'TOP', '#404080', '#808080');
    await verifyResults(page, '20 × 3');

    // ── Screen 5: FLOOR — 6×6 BM4 MATTE (no bumpers) ──
    await addScreen(page);
    await configureScreen(page, dimensions, power, data, structure, {
      panelType: 'BM4_MATTE',
      wide: 6,
      high: 6,
      voltage: 208,
      breaker: 20,
      phase: 3,
      powerType: 'max',
      processor: 'Brompton_SX40',
      frameRate: 60,
      bitDepth: 8,
      structureType: 'hanging',
      bumpers: false,
      redundancy: true,
      arrows: true,
    });
    await renameScreen(page, 4, 'FLOOR', '#808040', '#808080');
    await verifyResults(page, '6 × 6');

    // ── Screen 6: STAge 1 — 4×1 CB5 MKII ──
    await addScreen(page);
    await configureScreen(page, dimensions, power, data, structure, {
      panelType: 'CB5_MKII',
      wide: 4,
      high: 1,
      voltage: 208,
      breaker: 20,
      phase: 3,
      powerType: 'max',
      processor: 'Brompton_SX40',
      frameRate: 60,
      bitDepth: 8,
      structureType: 'hanging',
      bumpers: true,
      redundancy: true,
      arrows: true,
    });
    await renameScreen(page, 5, 'STAge 1', '#408080', '#808080');
    await verifyResults(page, '4 × 1');

    // ── Screen 7: Stage 2 — 4×1 CB5 MKII ──
    await addScreen(page);
    await configureScreen(page, dimensions, power, data, structure, {
      panelType: 'CB5_MKII',
      wide: 4,
      high: 1,
      voltage: 208,
      breaker: 20,
      phase: 3,
      powerType: 'max',
      processor: 'Brompton_SX40',
      frameRate: 60,
      bitDepth: 8,
      structureType: 'hanging',
      bumpers: true,
      redundancy: true,
      arrows: true,
    });
    await renameScreen(page, 6, 'Stage 2', '#804080', '#808080');
    await verifyResults(page, '4 × 1');

    // ── Screen 8: stage 3 low — 10×1 CB5 MKII Half ──
    await addScreen(page);
    await configureScreen(page, dimensions, power, data, structure, {
      panelType: 'CB5_MKII_HALF',
      wide: 10,
      high: 1,
      voltage: 208,
      breaker: 20,
      phase: 3,
      powerType: 'max',
      processor: 'Brompton_SX40',
      frameRate: 60,
      bitDepth: 8,
      structureType: 'hanging',
      bumpers: true,
      redundancy: true,
      arrows: true,
    });
    await renameScreen(page, 7, 'stage 3 low', '#c06030', '#808080');
    await verifyResults(page, '10 × 1');

    // ── Screen 9: stage low 4 — 5×1 CB5 MKII Half ──
    await addScreen(page);
    await configureScreen(page, dimensions, power, data, structure, {
      panelType: 'CB5_MKII_HALF',
      wide: 5,
      high: 1,
      voltage: 208,
      breaker: 20,
      phase: 3,
      powerType: 'max',
      processor: 'Brompton_SX40',
      frameRate: 60,
      bitDepth: 8,
      structureType: 'hanging',
      bumpers: true,
      redundancy: true,
      arrows: true,
    });
    await renameScreen(page, 8, 'stage low 4', '#40a0a0', '#808080');
    await verifyResults(page, '5 × 1');

    // ── Verify all 9 screen tabs exist ──
    const screenTabs = page.locator('#screenTabsContainer .screen-tab');
    await expect(screenTabs).toHaveCount(9);

    // ── Cycle through all screens and verify dimensions persist ──
    const expectedScreens = [
      { name: 'USC', wide: '10', high: '4' },
      { name: 'IMAG SR', wide: '5', high: '4' },
      { name: 'IMAG SL', wide: '5', high: '4' },
      { name: 'TOP', wide: '20', high: '3' },
      { name: 'FLOOR', wide: '6', high: '6' },
      { name: 'STAge 1', wide: '4', high: '1' },
      { name: 'Stage 2', wide: '4', high: '1' },
      { name: 'stage 3 low', wide: '10', high: '1' },
      { name: 'stage low 4', wide: '5', high: '1' },
    ];

    for (let i = 0; i < expectedScreens.length; i++) {
      await switchToScreen(page, i);
      // Wait for panel values to update after screen switch
      await expect(dimensions.panelsWideInput).toHaveValue(expectedScreens[i].wide, { timeout: 5000 });
      await expect(dimensions.panelsHighInput).toHaveValue(expectedScreens[i].high, { timeout: 5000 });
    }

    // ── Navigate to Combined View ──
    await navigation.switchToCombined();
    await page.waitForTimeout(500);
    const combinedCanvas = page.locator('#combinedStandardCanvas');
    await expect(combinedCanvas).toBeVisible();
    const combinedDrawn = await CanvasHelpers.isCanvasDrawn(combinedCanvas);
    expect(combinedDrawn).toBe(true);

    // ── Navigate to Gear List ──
    await navigation.switchToGear();
    await page.waitForTimeout(500);
    const gearContent = page.locator('#gearListContent');
    await expect(gearContent).toBeVisible();
    const gearText = await gearContent.textContent();
    expect(gearText!.length).toBeGreaterThan(0);

    // ── Navigate to Canvas View ──
    await navigation.switchToCanvas();
    await page.waitForTimeout(500);
    const canvasView = page.locator('#canvasView');
    await expect(canvasView).toBeVisible();

    // ── Return to Complex mode ──
    await navigation.switchToComplex();
    await page.waitForTimeout(300);
  });
});

// ─── Test A: 3-Screen Show with Knockouts ───────────────────────────────────

test.describe('Build 3-screen show with knockouts and custom circuits @desktop', () => {
  test.beforeEach(async ({ page, clearLocalStorage }) => {
    await AppHelpers.setupApp(page);
  });

  test('build combined show with knockouts and circuit assignments', async ({
    page,
    dimensions,
    power,
    data,
    structure,
    navigation,
    gearList,
  }) => {
    // Increase timeout for this long walkthrough
    test.setTimeout(300000);

    const standardCanvas = page.locator('#standardCanvas');

    // ── Screen 1: SR — 4×5 INFiLED AMT 8.3 ──
    await configureScreen(page, dimensions, power, data, structure, {
      panelType: 'INFILED_AMT8_3',
      wide: 4,
      high: 5,
      voltage: 208,
      breaker: 20,
      phase: 3,
      powerType: 'max',
      processor: 'Brompton_SX40',
      frameRate: 60,
      bitDepth: 8,
      structureType: 'hanging',
      bumpers: true,
      redundancy: true,
      arrows: true,
    });

    // Set gear cable lengths
    await navigation.switchToGear();
    await gearList.setCableLength('wallToFloor', 5);
    await gearList.setCableLength('distroToWall', 10);
    await gearList.setCableLength('processorToWall', 15);
    await gearList.setCableLength('serverToProcessor', 50);
    await navigation.switchToComplex();
    await page.waitForTimeout(300);

    await verifyResults(page, '4 × 5');

    // Scroll to standard canvas for panel interactions
    await standardCanvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(standardCanvas);
    await page.waitForTimeout(500);

    // ── Knock out 3 panels: col 3, rows 1-3 (one at a time) ──
    await clickPanel(page, standardCanvas, 3, 1);
    await deleteSelectedPanels(page, standardCanvas, 3, 1);

    await clickPanel(page, standardCanvas, 3, 2);
    await deleteSelectedPanels(page, standardCanvas, 3, 2);

    await clickPanel(page, standardCanvas, 3, 3);
    await deleteSelectedPanels(page, standardCanvas, 3, 3);

    // Verify 17 active panels (20 - 3 = 17)
    const srActivePanels = await page.evaluate('currentPw * currentPh - (deletedPanels?.size || 0)');
    expect(srActivePanels).toBe(17);

    // ── Assign custom circuits: col 2 (all 5 rows) + panel (3,4) → circuit 3 ──
    await page.evaluate(`
      saveState();
      ['2,0','2,1','2,2','2,3','2,4','3,4'].forEach(k => customCircuitAssignments.set(k, 3));
      calculate();
    `);
    await page.waitForTimeout(500);

    // Rename screen to SR
    await renameScreen(page, 0, 'SR', '#800080', '#008080');

    // ── Screen 2: C — 4×4 INFiLED AMT 8.3 ──
    await addScreen(page);
    await configureScreen(page, dimensions, power, data, structure, {
      panelType: 'INFILED_AMT8_3',
      wide: 4,
      high: 4,
      voltage: 208,
      breaker: 20,
      phase: 3,
      powerType: 'max',
      processor: 'Brompton_SX40',
      frameRate: 60,
      bitDepth: 8,
      structureType: 'hanging',
      bumpers: true,
      redundancy: true,
      arrows: true,
    });
    await verifyResults(page, '4 × 4');

    // Scroll to canvas
    await standardCanvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(standardCanvas);
    await page.waitForTimeout(500);

    // ── Knock out 4 corner panels ──
    // Top-left (0,0)
    await clickPanel(page, standardCanvas, 0, 0);
    await deleteSelectedPanels(page, standardCanvas, 0, 0);

    // Top-right (3,0)
    await clickPanel(page, standardCanvas, 3, 0);
    await deleteSelectedPanels(page, standardCanvas, 3, 0);

    // Bottom-right (3,3)
    await clickPanel(page, standardCanvas, 3, 3);
    await deleteSelectedPanels(page, standardCanvas, 3, 3);

    // Bottom-left (0,3)
    await clickPanel(page, standardCanvas, 0, 3);
    await deleteSelectedPanels(page, standardCanvas, 0, 3);

    // Verify 12 active panels (16 - 4 = 12)
    const cActivePanels = await page.evaluate('currentPw * currentPh - (deletedPanels?.size || 0)');
    expect(cActivePanels).toBe(12);

    // ── Assign custom circuits for C screen ──
    await page.evaluate(`
      saveState();
      ['0,1','0,2','1,0','1,1','1,2','1,3'].forEach(k => customCircuitAssignments.set(k, 5));
      ['2,0','2,1','2,2','2,3','3,1','3,2'].forEach(k => customCircuitAssignments.set(k, 6));
      calculate();
    `);
    await page.waitForTimeout(500);

    // Set canvas position for C screen
    await navigation.switchToCanvas();
    await page.waitForTimeout(300);
    await page.locator('#canvasX').fill('480');
    await page.locator('#canvasY').fill('60');
    await page.locator('#canvasY').blur();
    await page.waitForTimeout(300);
    await navigation.switchToComplex();
    await page.waitForTimeout(300);

    // Rename screen to C
    await renameScreen(page, 1, 'C', '#804040', '#808080');

    // ── Screen 3: SL — 4×5 INFiLED AMT 8.3 ──
    await addScreen(page);
    await configureScreen(page, dimensions, power, data, structure, {
      panelType: 'INFILED_AMT8_3',
      wide: 4,
      high: 5,
      voltage: 208,
      breaker: 20,
      phase: 3,
      powerType: 'max',
      processor: 'Brompton_SX40',
      frameRate: 60,
      bitDepth: 8,
      structureType: 'hanging',
      bumpers: true,
      redundancy: true,
      arrows: true,
    });
    await verifyResults(page, '4 × 5');

    // Scroll to canvas
    await standardCanvas.scrollIntoViewIfNeeded();
    await CanvasHelpers.waitForCanvasRender(standardCanvas);
    await page.waitForTimeout(500);

    // ── Knock out 3 panels: col 0, rows 1-3 (one at a time) ──
    await clickPanel(page, standardCanvas, 0, 1);
    await deleteSelectedPanels(page, standardCanvas, 0, 1);

    await clickPanel(page, standardCanvas, 0, 2);
    await deleteSelectedPanels(page, standardCanvas, 0, 2);

    await clickPanel(page, standardCanvas, 0, 3);
    await deleteSelectedPanels(page, standardCanvas, 0, 3);

    // Verify 17 active panels (20 - 3 = 17)
    const slActivePanels = await page.evaluate('currentPw * currentPh - (deletedPanels?.size || 0)');
    expect(slActivePanels).toBe(17);

    // ── Assign custom circuits for SL screen ──
    await page.evaluate(`
      saveState();
      customCircuitAssignments.set('0,0', 1);
      customCircuitAssignments.set('0,4', 2);
      ['1,0','1,1','1,2','1,3','1,4'].forEach(k => customCircuitAssignments.set(k, 2));
      ['2,0','2,1','2,2','2,3','2,4'].forEach(k => customCircuitAssignments.set(k, 3));
      ['3,0','3,1','3,2','3,3','3,4'].forEach(k => customCircuitAssignments.set(k, 4));
      calculate();
    `);
    await page.waitForTimeout(500);

    // Set canvas position for SL screen
    await navigation.switchToCanvas();
    await page.waitForTimeout(300);
    await page.locator('#canvasX').fill('960');
    await page.locator('#canvasY').fill('0');
    await page.locator('#canvasY').blur();
    await page.waitForTimeout(300);
    await navigation.switchToComplex();
    await page.waitForTimeout(300);

    // Rename screen to SL
    await renameScreen(page, 2, 'SL', '#408040', '#808080');

    // ── Verify 3 screen tabs ──
    const screenTabs = page.locator('#screenTabsContainer .screen-tab');
    await expect(screenTabs).toHaveCount(3);

    // ── Navigate to Canvas View — verify screens are positioned ──
    await navigation.switchToCanvas();
    await page.waitForTimeout(500);
    const canvasView = page.locator('#canvasView');
    await expect(canvasView).toBeVisible();
    const canvasDrawn = await CanvasHelpers.isCanvasDrawn(canvasView);
    expect(canvasDrawn).toBe(true);

    // ── Navigate to Combined View ──
    await navigation.switchToCombined();
    await page.waitForTimeout(500);
    const combinedCanvas = page.locator('#combinedStandardCanvas');
    await expect(combinedCanvas).toBeVisible();
    const combinedDrawn = await CanvasHelpers.isCanvasDrawn(combinedCanvas);
    expect(combinedDrawn).toBe(true);

    // ── Navigate to Gear List ──
    await navigation.switchToGear();
    await page.waitForTimeout(500);
    const gearContent = page.locator('#gearListContent');
    await expect(gearContent).toBeVisible();
    const gearText = await gearContent.textContent();
    expect(gearText!.length).toBeGreaterThan(0);
    // Should contain bumpers (all 3 screens use hanging with bumpers)
    expect(gearText).toContain('Bumper');

    // ── Return to Complex mode and scroll through layouts ──
    await navigation.switchToComplex();
    await page.waitForTimeout(300);

    await standardCanvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const powerCanvas = page.locator('#powerCanvas');
    await powerCanvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const dataCanvas = page.locator('#dataCanvas');
    await dataCanvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const structureCanvas = page.locator('#structureCanvas');
    await structureCanvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  });
});
