# LED Wall Calculator — Project Instructions

Claude reads this file automatically at the start of every session.

## Session Startup — ALWAYS Do First

Start the local dev server and open the browser at the beginning of every session:
```
lsof -ti:8000 | xargs kill -9 2>/dev/null        # kill any existing server
npx http-server -p 8000 -c-1 &                   # start with no-cache headers
sleep 2 && open http://localhost:8000             # open in browser
```
**Important:** Always use `npx http-server -c-1` (NOT python's http.server) — the `-c-1` flag sends `Cache-Control: no-cache` headers, preventing stale JS files during development. Python's server caches aggressively and causes the service worker to serve old code.

## Architecture

Modular PWA: `index.html` (~1,405 lines) + 32 external JS modules across 9 directories.

| Region | Location | Content |
|--------|----------|---------|
| CSS | `styles.css` + inline `<style>` | Styling |
| HTML | `index.html` ~1–1200 | DOM structure |
| Inline JS | `index.html` ~1255–1377 | APP_VERSION, global variable declarations, screen globals |
| External JS | 32 files in 9 dirs | All application logic (loaded via `<script>` tags) |

**JS module directories:**
```
core/       — modals, utils, update, state, undo, calculate, init
specs/      — panels, processors, custom-panels, custom-processors
layouts/    — standard, power, data, structure
structure/  — bumpers, plates, weight, drawing
interact/   — standard-canvas, touch-gestures
nav/        — gear, canvas, combined, navigation
export/     — pdf, canvas-export, resolume
config/     — setup, save-load, dom-setup
screens/    — multi-screen
```

All modules use plain `<script>` tags (no build system, global scope). Script load order matters for parse-time code; runtime calls inside functions/DOMContentLoaded are safe regardless of order. Global variables are declared inline in `index.html` to guarantee initialization before any module reads them.

External deps (CDN only — no npm):
- jsPDF 2.5.1 — PDF generation
- html2canvas 1.4.1 — canvas-to-image for PDF
- Material Design Icons — UI icons
- Google Fonts — Bangers, Roboto Condensed

PWA: offline-capable after first load, installable on mobile via manifest (base64-encoded inline).

**Deployment Strategy:** This app is deployed as a self-hosted web application with premium features. The architecture supports:

**Hosting & Infrastructure:**
- **Netlify** — Static site hosting with automatic deployments from GitHub
- **Custom Domain** — Professional branding via custom domain with SSL
- **GitHub** — Version control, CI/CD triggers, collaboration
- **PWA Support** — Installable on mobile/desktop, offline-capable after first load

**Premium Features (Planned):**
- **Stripe** — Payment processing for premium features/subscriptions
- **Supabase** — Backend services (authentication, database, storage)
  - User accounts and saved projects
  - Cloud sync across devices
  - Team collaboration features

**Current Architecture Benefits:**
- Zero build system = instant Netlify deployments
- CDN dependencies = fast global loading
- localStorage = works offline immediately
- Modular structure = easy to add Supabase integration

---

## Netlify & CSP — ALWAYS Follow When Modifying Headers or Service Worker

**Content Security Policy (`netlify.toml` line 15):**
- Every external domain the app loads resources from MUST be listed in the correct CSP directive:
  - `script-src` — CDN scripts (cdn.jsdelivr.net, cdnjs.cloudflare.com)
  - `style-src` — Google Fonts CSS (fonts.googleapis.com)
  - `font-src` — Google Fonts files (fonts.gstatic.com, *.gstatic.com)
  - `connect-src` — anything fetched via `fetch()` or SW, including CDN domains AND font domains
- **When adding a new CDN dependency**, add its domain to BOTH the relevant resource directive AND `connect-src` (because the service worker's `fetch()` calls are governed by `connect-src`)

**Header ordering in `netlify.toml`:**
- Generic cache rules (`/*.js`, `/*.css`) MUST come BEFORE specific no-cache overrides (`/sw.js`, `/version.json`, `/manifest.json`). Netlify applies the last matching rule, so specific rules must come after generic ones to take precedence.

**Service Worker (`sw.js`) — font handling rules:**
- **NEVER pre-cache Google Fonts in `CDN_ASSETS`** — Google Fonts CSS is User-Agent dependent. Pre-caching with the SW's UA serves wrong `@font-face` rules for the actual browser.
- **NEVER intercept Google Fonts in the SW fetch handler** — Safari breaks when the SW intercepts font requests after the `controllerchange` → `reload()` cycle. The SW must `return` (not call `event.respondWith()`) for any request to `googleapis.com` or `gstatic.com`.
- CDN scripts (jsPDF, html2canvas, Supabase) CAN be cached/intercepted by the SW — only fonts are excluded.

---

## Version Management — ALWAYS Follow

**Four places to update on EVERY version change:**

1. `version.json` → `"version"` field + `"updated"` date (YYYY-MM-DD) + `"changelog"` (commit description)
2. `index.html` → `const APP_VERSION = 'X.X.X';` + `const APP_CHANGELOG = '...';` (next line)
3. `sw.js` → `const SW_VERSION = 'X.X.X';` (line 5)

Version strings in all three files must match. `APP_CHANGELOG` and `version.json` `changelog` must match. Default: increment patch (e.g., 2.5.25 → 2.5.26).

Use the `/commit` command to handle this automatically.

---

## Commit Conventions — ALWAYS Follow

- Format: `<Description in present tense> (vX.X.X)`
- Trailer: `Co-Authored-By: Claude <noreply@anthropic.com>`
- Description: concise (8–15 words), starts with a verb
- Example: `Fix cable count for dual-link SDI configurations (v2.5.26)`

Use HEREDOC format for multi-line commit messages.

---

## Code Quality — ALWAYS Follow

- **Read before modifying** — never propose changes to unread code
- **No over-engineering** — no unnecessary abstractions, helpers, wrappers, or extra configurability
- **No scope creep** — don't add features beyond what was asked
- **Clean deletions** — remove dead code completely, no commented-out code or `_unused` vars
- **Follow existing patterns** — if the codebase does something a certain way, match it
- **Check callers** — when changing a function, verify all call sites
- **Event listeners** — verify cleanup when elements are removed
- **Canvas operations** — check context save/restore state management

---

## Root Cause Analysis — ALWAYS Follow

When fixing bugs or addressing issues:

- **Identify the root cause** — don't just patch symptoms
- **Trace the issue to its source** — follow the data flow backwards
- **Ask "why" repeatedly** — understand why the bug exists, not just what it does
- **Fix the underlying problem** — ensure the fix prevents recurrence
- **Consider related cases** — if it failed here, could it fail elsewhere?
- **Verify all affected areas** — check if the root cause impacts other features

**Example:** If a calculation is wrong, don't just fix the output display — trace back through the calculation logic, input validation, and data sources to find where the error originates.

**Anti-pattern:** Applying quick fixes that mask problems without addressing the underlying issue leads to technical debt and recurring bugs.

---

## Security — ALWAYS Check When Writing Code

- Never use `eval()`, `Function()` constructor, or `document.write()`
- **Never use native `alert()`, `confirm()`, or `prompt()`** — use the styled equivalents in `core/modals.js`: `showAlert(message, title)`, `showConfirm(message, title)`, `showPrompt(message, defaultValue, title)`. These return Promises, so use `await` in async functions.
- Sanitize user input before DOM insertion (custom panel/processor names, file imports)
- Prefer `textContent` over `innerHTML` for user-provided strings
- Validate localStorage data on read (handle malformed JSON, unexpected types)
- File imports (.ledconfig): validate structure before applying

---

## Styling — ALWAYS Follow

- **Comic-book theme is non-negotiable**
- Fonts: Bangers (headers), Roboto Condensed (body text, inputs, data, nav labels)
- Black text outlines (`.text-outline-black`), colored borders on containers
- Mobile-first responsive: 768px tablet breakpoint
- Fixed header + bottom nav with safe-area-inset padding
- New UI elements must match existing visual weight, spacing, and color patterns
- **Read `CSS-NOTES.md` before adding or modifying any button or styled element** — it documents global CSS rules, specificity gotchas, and a pre-commit checklist
- **Responsive layout constraints** — UI elements must display consistently across mobile and desktop:
  - Buttons in flex containers: use `flex: 0 0 auto` to prevent stretching
  - Global `button { width: 100% }` applies on mobile — override with `width: auto` for compact buttons
  - Containers with scrollable content: use `overflow-x: hidden` to prevent horizontal scrollbars
  - Test new UI in both mobile and desktop viewport sizes before committing
  - Elements should look the same at any width — avoid viewport-specific font/padding changes
- **Button override checklist** — The global `button` rule (styles.css ~line 595) styles ALL `<button>` elements as full-width green comic-book buttons. Any non-standard button (footer links, FAQ toggles, tab buttons, etc.) MUST explicitly override ALL of these properties:
  ```
  background, border, border-radius, padding, min-height, width,
  margin-bottom, box-shadow, text-shadow, font-size, font-weight,
  color, letter-spacing, -webkit-tap-highlight-color, touch-action
  ```
  If even one property is missed, the global rule bleeds through and breaks the button's appearance. Always read the global `button` rule before adding new buttons.
- **Form element height consistency (40px on desktop)** — ALL form elements in the main input sections MUST render at the same visual height (**40px** on desktop). When changing element sizes, you MUST update ALL of the following in a single pass — never partially:
  - **Element types and their height mechanics** (all use `box-sizing: border-box`):
    - `.slider-toggle-btn` — has `border: none`, sits inside `.slider-toggle` container with `border: 2px solid #000` (4px total). Button min-height = **target − 4px** (e.g., 36px for 40px target).
    - `.toggle-btn` — has own `border: 2px solid #000` included in border-box. min-height = **target** directly (e.g., 40px).
    - `select` and `input[type="number"]` — has own `border: 2px solid #000`. min-height = **target** directly.
    - `.number-input-with-arrows` — wrapper container with `border: 2px solid #000`. Uses explicit `height: target`. Arrow buttons inside (`.number-input-arrows button`) must have `min-height: 0` so they shrink to fit.
  - **Checklist when changing form element heights**:
    1. Update `.slider-toggle-btn` min-height (styles.css ~line 1635)
    2. Update `.toggle-btn` min-height (styles.css ~line 1599)
    3. Update `input[type="number"], input[type="text"], select` min-height (styles.css ~line 522)
    4. Update `.number-input-with-arrows` height (styles.css ~line 1681)
    5. Search `index.html` for ANY inline `style=` on form elements that sets `min-height`, `height`, `padding`, or `font-size` — remove or update ALL of them. Use: `grep -n 'min-height\|padding.*px' index.html` on elements inside `.section-box` containers.
    6. Verify `.number-input-arrows button` min-height is 0 (not a fixed value that would push the container taller).
    7. Check mobile overrides in `@media (max-width: 768px)` (~line 4161) are still correct — don't touch them unless asked.
  - **NEVER use inline `style` attributes to override padding, font-size, min-height, or height on form elements** — these create inconsistencies. Use CSS classes for any size variants.
  - Intentional compact variants (combined-view mini-toggles, dist box position grids) must use dedicated CSS classes, not inline styles.

---

## State Management

- Global variables: `screens{}`, `currentScreenId`, `deletedPanels` (Set), `bumpers[]`
- Data flow: input change → `calculate()` → `generateLayout()` → canvas render
- Undo/redo: call `saveState()` before mutations, max 50 history items
- Screen data: `saveCurrentScreenData()` persists to `screens[currentScreenId].data`
- localStorage keys:
  - `ledcalc_custom_panels` — custom panel specs (JSON)
  - `ledcalc_custom_processors` — custom processor specs (JSON)
  - `ledcalc_combined_positions` — canvas screen positions (JSON)
  - `dismissedUpdateVersion` — update banner dismissal tracking

---

## Testing — ALWAYS Run After Changes

**Mandatory:** Run `node tests/smoke-test.js` — it must pass with **0 failures**.

The smoke test includes:
- Version sync (version.json ↔ APP_VERSION)
- HTML structure validation
- Bracket balance (rough check)
- **Node.js parse validation** — actually parses every inline `<script>` block and every extracted `.js` module with `new Function()`. This catches real syntax errors (try-without-catch, unclosed blocks, etc.) that bracket counting misses.
- Dangerous pattern detection (eval, document.write)

**Manual checklist** (after smoke test passes):
- [ ] App loads without console errors in browser
- [ ] Affected feature works on desktop (mouse + keyboard)
- [ ] Affected feature works on mobile (touch)
- [ ] Canvas renders correctly for all affected layout types (standard, power, data, structure)
- [ ] Undo/redo works after the change
- [ ] localStorage persistence survives page reload
- [ ] PDF export includes the changed content correctly
- [ ] No regressions in adjacent features

**Playwright Tests (Optional - Comprehensive):**
- Run `npm run test:smoke` — Quick functional tests (~2 min)
- Run `npm test` — Full test suite (~10 min with current tests)
- Playwright tests cover:
  - UI interactions (dimensions, power, data, structure)
  - Canvas rendering and interactions
  - Multi-screen workflows
  - Export functionality (PDF, PNG, config save/load)
  - Mobile and desktop browsers
- See `tests/playwright/README.md` for full documentation
- Note: Requires `npm install` and `npx playwright install --with-deps` first

---

## Refactoring Rules

- **ALWAYS incremental**: one section or function at a time
- **NEVER refactor multiple sections in one commit**
- After each change: run `node tests/smoke-test.js` (must pass with 0 failures) + verify in browser
- Preserve all existing behavior — zero functional changes unless explicitly requested
- When modularizing: extract to external `.js` file, add `<script>` tag, remove from index.html, test, commit
- Keep a working app at every step — if something breaks, revert before continuing
- **Never trust bracket counting alone** — the smoke test's Node.js parse validation is the real check

---

## Export & PDF Awareness

- PDF pipeline: `exportPDF()` → html2canvas captures → jsPDF assembles pages
- Multi-screen PDFs iterate all visible screens
- Resolume XML export: must match Arena 7 format
- .led/.ledconfig files: JSON with full screen state — save/load must be symmetric
- When changing calculation outputs: verify they appear correctly in PDF and gear list
- **Export parity** — all exports (PDF, PNG, email, .led/.ledconfig, Resolume XML) must produce identical results on desktop and mobile
- **Cross-format consistency** — when data appears in multiple export formats, it must match:
  - Gear list: gear tab display, PDF gear list column, and email body must show the same items and counts
  - Specs/calculations: PDF specs page must match the values shown in the app UI and saved in .led files
  - Canvas visuals: PDF canvas pages and PNG export must render the same layout
  - Screen data: multi-screen exports (PDF, email, Resolume, .led) must all iterate screens consistently
- When modifying any export pipeline: test the same configuration across all affected export formats to confirm matching output
