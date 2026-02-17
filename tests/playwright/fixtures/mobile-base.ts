import { test as base } from './base';
import { TouchHelpers } from '../helpers/touch-helpers';
import { MobileHelpers } from '../helpers/mobile-helpers';

/**
 * Extended mobile test fixtures.
 * Inherits all desktop fixtures (dimensions, power, data, etc.)
 * and adds mobile-specific helpers for touch gestures and layout.
 */
type MobileFixtures = {
  touchHelpers: typeof TouchHelpers;
  mobileHelpers: typeof MobileHelpers;
};

export const test = base.extend<MobileFixtures>({
  touchHelpers: async ({}, use) => {
    await use(TouchHelpers);
  },
  mobileHelpers: async ({}, use) => {
    await use(MobileHelpers);
  },
});

export { expect } from '@playwright/test';
