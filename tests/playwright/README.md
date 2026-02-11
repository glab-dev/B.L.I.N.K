# Playwright Test Suite for LED Calculator

Comprehensive end-to-end test suite for the LED Wall Calculator PWA.

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps
```

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run tests with UI (interactive mode)
npm run test:ui

# Run tests in headed browser (watch execution)
npm run test:headed

# Debug a specific test
npm run test:debug
```

### By Category

```bash
# Smoke tests (fast, ~2 min)
npm run test:smoke

# Feature tests
npm run test:features

# Workflow tests
npm run test:workflows

# Export tests
npm run test:export

# Interaction tests
npm run test:interactions
```

### By Device

```bash
# Desktop browsers only (Chrome, Firefox, Safari)
npm run test:desktop

# Mobile browsers only (iPhone 13 Pro, Pixel 5)
npm run test:mobile
```

### By Priority

```bash
# Critical path tests only
npm run test:critical
```

## Test Structure

```
tests/playwright/
├── fixtures/          # Test fixtures and extensions
├── helpers/           # Utility functions
├── page-objects/      # Page object models
├── test-data/         # Sample configs and expected outputs
├── smoke/             # Smoke tests
├── features/          # Feature-specific tests
├── interactions/      # Canvas and UI interaction tests
├── export/            # Export functionality tests
├── workflows/         # End-to-end workflow tests
├── calculations/      # Calculation accuracy tests
├── state-management/  # Undo/redo, localStorage tests
├── responsive/        # Mobile/desktop responsive tests
└── performance/       # Performance benchmark tests
```

## Writing Tests

### Basic Test Pattern

```typescript
import { test, expect } from '../fixtures/base';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page, clearLocalStorage }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should do something @critical @desktop', async ({
    page,
    dimensions,
    navigation,
  }) => {
    // Use page objects
    await dimensions.setPanelCount(10, 10);

    // Make assertions
    await expect(page.locator('#results')).toContainText('10 wide');
  });
});
```

### Using Page Objects

Page objects are automatically available in test fixtures:

- `dimensions` - Dimensions section (panel/size mode, aspect ratio)
- `power` - Power section (max/avg, phase, voltage)
- `data` - Data section (processors, frame rate, redundancy)
- `structure` - Structure section (hanging, ground, floor, bumpers)
- `canvasView` - Canvas view (positioning, zoom, export)
- `combinedView` - Combined view (multi-screen positioning)
- `gearList` - Gear list (cabling, export)
- `navigation` - Bottom navigation (view switching)

### Using Helpers

```typescript
import { CanvasHelpers } from '../helpers/canvas-helpers';
import { StorageHelpers } from '../helpers/storage-helpers';

// Check if canvas rendered
const isDrawn = await CanvasHelpers.isCanvasDrawn(canvas);

// Get localStorage data
const customPanels = await StorageHelpers.getCustomPanels(page);
```

### Test Tags

Use tags to organize tests:

- `@critical` - Critical path tests
- `@smoke` - Smoke tests
- `@desktop` - Desktop-specific tests
- `@mobile` - Mobile-specific tests
- `@slow` - Tests that take longer to run

## Viewing Reports

```bash
# Open HTML report
npm run test:report
```

The HTML report includes:
- Test results with screenshots
- Video recordings of failures
- Trace files for debugging

## CI/CD Integration

Tests are designed to run in CI with the following environment variables:

- `CI=true` - Enables CI mode (single worker, retries enabled)

Example GitHub Actions workflow included in plan documentation.

## Test Coverage

Current test coverage includes:

### Implemented ✅
- **Smoke tests**: App loads, CDN dependencies
- **Dimensions**: Panel mode, aspect ratio lock, units
- **Structure types**: Hanging, ground support, floor
- **Config save/load**: Round-trip with all settings
- **Multi-screen workflows**: Create, configure, switch screens

### To Implement
- Panel selection and custom panels
- Power configuration
- Data configuration (processors, redundancy)
- Canvas interactions (drag, zoom, pan)
- Touch gestures (pinch zoom, double-tap)
- PDF export
- Canvas export (PNG, JPEG, Resolume XML)
- Bumper manual mode
- Undo/redo
- State management
- Performance tests
- Visual regression tests

## Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `feature-name.spec.ts`
3. Use page objects for UI interactions
4. Add tags for categorization
5. Update this README with test description

## Troubleshooting

### Tests fail with timeout
- Increase timeout in `playwright.config.ts`
- Add more `waitForTimeout` calls for slow operations

### Canvas not rendering
- Ensure calculation completes before checking canvas
- Use `CanvasHelpers.waitForCanvasRender()` helper

### Download tests fail
- Check temp directory permissions
- Verify download path in test

### Mobile tests don't work
- Verify viewport size in config matches mobile dimensions
- Check that `isMobile: true` and `hasTouch: true` are set

## Performance Notes

- Full test suite: ~40 minutes
- Smoke tests: ~2 minutes
- Critical tests: ~5 minutes

Parallel execution is enabled by default for speed.

## Contributing

When adding tests:
1. Follow existing patterns in similar test files
2. Use page objects instead of direct selectors
3. Add helpful comments for complex test logic
4. Tag tests appropriately
5. Keep tests focused and atomic
