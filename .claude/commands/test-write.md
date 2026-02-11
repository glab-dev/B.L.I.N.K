Generate Playwright end-to-end tests for a specific feature or section of the app.

## Instructions

1. **Parse $ARGUMENTS** to identify which feature or section to test.

2. **Read the test infrastructure** to understand available patterns:
   - `tests/playwright/fixtures/base.ts` — available page objects and custom fixtures
   - The relevant page object in `tests/playwright/page-objects/` — available methods and selectors
   - An existing spec file as a pattern reference (e.g., `tests/playwright/features/structure/structure-types.spec.ts`)

3. **Read the actual app code** for the feature:
   - HTML structure in `index.html` — element IDs, classes, structure
   - JS logic in the relevant module file — what interactions are possible, what state changes
   - Any related CSS that affects visibility or behavior

4. **Generate a complete spec file** with:
   - Proper imports from `../fixtures/base` or `../../fixtures/base` (match nesting depth)
   - `test.describe` block named after the feature
   - Individual `test()` cases for:
     - **Happy path**: Normal usage, expected inputs, standard interactions
     - **Edge cases**: Empty values, boundary values, rapid interactions
     - **Mobile-specific**: Tag with `@mobile` where touch behavior differs
     - **Desktop-specific**: Tag with `@desktop` where keyboard/mouse behavior differs
   - Use existing helpers: `CanvasHelpers`, `StorageHelpers`, `CustomAssertions`
   - Use page object methods — don't write raw selectors when a page object method exists

5. **Write the spec file** to the correct directory:
   - Feature tests: `tests/playwright/features/<section>/`
   - Interaction tests: `tests/playwright/interactions/<area>/`
   - State tests: `tests/playwright/state-management/`
   - Export tests: `tests/playwright/export/<type>/`
   - Responsive tests: `tests/playwright/responsive/`
   - Calculation tests: `tests/playwright/calculations/`

6. **Verify** — Run the smoke test to ensure no syntax errors: `python3 tests/smoke-test.py`

## Test Naming Convention

```typescript
test('should [expected behavior] when [user action]', async ({ page, dimensionsSection }) => {
```

## Example

`/test-write power configuration section`
