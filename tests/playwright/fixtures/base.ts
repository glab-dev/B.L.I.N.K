import { test as base, Page } from '@playwright/test';
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
    // Use addInitScript so localStorage is cleared after navigation, not on about:blank
    await page.addInitScript(() => {
      try { localStorage.clear(); } catch (e) { /* ignore if not accessible */ }
    });
    await use();
  },
});

export { expect } from '@playwright/test';
