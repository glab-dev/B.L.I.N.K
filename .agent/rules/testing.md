# Testing Rules

## Mandatory After Every Code Change

Run `python3 tests/smoke-test.py` — must pass with **0 failures**.

The smoke test checks:
- Version sync (version.json ↔ APP_VERSION in index.html)
- HTML structure validation
- Node.js parse validation of all JS (catches real syntax errors)
- Dangerous pattern detection (eval, document.write)

## Playwright Tests

- Framework: Playwright with TypeScript
- Config: `playwright.config.ts` at project root
- Test fixtures: `tests/playwright/fixtures/base.ts` (provides 8 page objects)
- Page objects: `tests/playwright/page-objects/` (Dimensions, Power, Data, Structure, Canvas, Combined, GearList, Navigation)
- Helpers: `tests/playwright/helpers/` (CanvasHelpers, StorageHelpers, CustomAssertions)

### When Writing Tests

- Import fixtures from `../fixtures/base` (adjust path depth)
- Use page object methods — don't write raw CSS selectors when a method exists
- Tag mobile-specific tests with `@mobile`, desktop with `@desktop`
- Follow the pattern in existing spec files (e.g., `features/structure/structure-types.spec.ts`)
- Run `npm run test:smoke` for quick checks, `npm test` for full suite

### Test Directory Structure

```
tests/playwright/
├── smoke/          — App loads, CDN deps (always run)
├── features/       — Feature-specific tests
├── interactions/   — Canvas and UI interaction tests
├── export/         — Export pipeline tests
├── state-management/ — Undo/redo, localStorage
├── calculations/   — Calculation accuracy
├── responsive/     — Mobile/desktop layouts
├── performance/    — Load times, render speed
└── visual-regression/ — Screenshot comparison
```
