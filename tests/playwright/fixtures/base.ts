import { test as base, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DimensionsSection } from '../page-objects/dimensions.po';
import { PowerSection } from '../page-objects/power.po';
import { DataSection } from '../page-objects/data.po';
import { StructureSection } from '../page-objects/structure.po';
import { CanvasView } from '../page-objects/canvas-view.po';
import { CombinedView } from '../page-objects/combined-view.po';
import { GearList } from '../page-objects/gear-list.po';
import { Navigation } from '../page-objects/navigation.po';
import { TestPatternPage } from '../page-objects/test-pattern.po';
import { RasterMode } from '../page-objects/raster.po';

/**
 * The running app version, read from version.json.
 * tests/smoke-test.js asserts version.json matches APP_VERSION in index.html,
 * so these cannot drift.
 */
const APP_VERSION = JSON.parse(
  readFileSync(resolve(__dirname, '../../../version.json'), 'utf-8')
).version;

/**
 * Extended test fixtures for LED Calculator
 * Provides page objects and utilities for all test files
 */
type TestFixtures = {
  dimensions: DimensionsSection;
  power: PowerSection;
  data: DataSection;
  structure: StructureSection;
  canvasView: CanvasView;
  combinedView: CombinedView;
  gearList: GearList;
  navigation: Navigation;
  testPattern: TestPatternPage;
  raster: RasterMode;
  clearLocalStorage: void;
};

export const test = base.extend<TestFixtures>({
  // The "What's New" popup auto-opens over the welcome page on any version this
  // browser profile hasn't seen, intercepting clicks on the mode buttons.
  // Mark the running version as seen so tests start on a clean app.
  page: async ({ page }, use) => {
    await page.addInitScript((v) => {
      try { localStorage.setItem('lastSeenWelcomeVersion', v); } catch (e) { /* opaque origin */ }
    }, APP_VERSION);
    await use(page);
  },

  dimensions: async ({ page }, use) => {
    const dimensions = new DimensionsSection(page);
    await use(dimensions);
  },

  power: async ({ page }, use) => {
    const power = new PowerSection(page);
    await use(power);
  },

  data: async ({ page }, use) => {
    const data = new DataSection(page);
    await use(data);
  },

  structure: async ({ page }, use) => {
    const structure = new StructureSection(page);
    await use(structure);
  },

  canvasView: async ({ page }, use) => {
    const canvasView = new CanvasView(page);
    await use(canvasView);
  },

  combinedView: async ({ page }, use) => {
    const combinedView = new CombinedView(page);
    await use(combinedView);
  },

  gearList: async ({ page }, use) => {
    const gearList = new GearList(page);
    await use(gearList);
  },

  navigation: async ({ page }, use) => {
    const navigation = new Navigation(page);
    await use(navigation);
  },

  testPattern: async ({ page }, use) => {
    const testPattern = new TestPatternPage(page);
    await use(testPattern);
  },

  raster: async ({ page }, use) => {
    const raster = new RasterMode(page);
    await use(raster);
  },

  clearLocalStorage: async ({ page }, use) => {
    // Use addInitScript so localStorage is cleared after navigation, not on about:blank.
    // Re-seed lastSeenWelcomeVersion in the same script: init scripts run in
    // registration order, so clearing alone would wipe the seed set by the page fixture.
    await page.addInitScript((v) => {
      try {
        localStorage.clear();
        localStorage.setItem('lastSeenWelcomeVersion', v);
      } catch (e) { /* ignore if not accessible */ }
    }, APP_VERSION);
    await use();
  },
});

export { expect } from '@playwright/test';
