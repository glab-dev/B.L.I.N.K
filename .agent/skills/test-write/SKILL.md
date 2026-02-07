---
name: test-write
description: Generate Playwright end-to-end tests for a specific feature or section of the B.L.I.N.K. app, following existing page object patterns and test conventions
---

# Test Write — Generate Playwright Tests

## Goal

Generate a complete Playwright spec file that follows existing project conventions and thoroughly tests a given feature.

## Instructions

1. Identify which feature or section to test
2. Read the test infrastructure:
   - `tests/playwright/fixtures/base.ts` — available page objects and fixtures
   - Relevant page object in `tests/playwright/page-objects/`
   - An existing spec file for pattern reference (e.g., `features/structure/structure-types.spec.ts`)
3. Read the actual app code for the feature:
   - HTML structure in `index.html` (element IDs, classes)
   - JS logic in the relevant module file
4. Generate a complete spec file with:
   - Imports from fixtures/base (adjust path depth for directory nesting)
   - `test.describe` block named after the feature
   - Individual `test()` cases covering:
     - Happy path (normal usage)
     - Edge cases (empty values, boundaries)
     - Mobile-specific behavior (tag `@mobile`)
     - Desktop-specific behavior (tag `@desktop`)
   - Use page object methods — not raw selectors
   - Use existing helpers: `CanvasHelpers`, `StorageHelpers`, `CustomAssertions`
5. Write to the correct test directory (features/, interactions/, export/, etc.)

## Test Naming Convention

```typescript
test('should [expected behavior] when [user action]', async ({ page }) => {
```

## Constraints

- Follow existing test patterns exactly — don't invent new conventions
- Use page object methods when available
- Tag mobile/desktop specific tests appropriately
- Verify with `python3 tests/smoke-test.py` after writing
