import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for LED Calculator PWA
 * Tests run on desktop (Chrome, Firefox, Safari) and mobile (iPhone 13 Pro, Pixel 5)
 */
export default defineConfig({
  testDir: './tests/playwright',

  // Run tests in parallel for speed
  fullyParallel: true,

  // Fail build on CI if you accidentally left test.only in source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,

  // Limit workers on CI for stability
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Shared settings for all projects
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Increase timeout for complex canvas operations
    actionTimeout: 10000,
  },

  // Test timeout (2 minutes per test)
  timeout: 120000,

  // Expect timeout (10 seconds for assertions)
  expect: {
    timeout: 10000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
      },
    },

    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        // Override with iPhone 13 Pro dimensions for consistency
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },

    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13 Pro'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },

    {
      name: 'tablet-ipad',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  // Start local server before tests
  webServer: {
    command: 'python3 -m http.server 8000',
    port: 8000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
