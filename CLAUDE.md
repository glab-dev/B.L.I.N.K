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

Modular PWA: `index.html` (~3,940 lines) + 49 external JS modules across 10 directories.

| Region | Location | Content |
|--------|----------|---------|
| CSS | `styles.css` + inline `<style>` | Styling |
| Inline JS | `index.html` ~49–68 and ~3710–3875 | APP_VERSION, global variable declarations, screen globals |
| HTML | `index.html` ~69–3625 | DOM structure |
| Script tags | `index.html` ~3628–3708 | CDN deps + all 49 module `<script defer>` tags |
| External JS | 49 files in 10 dirs | All application logic |

**JS module directories:**
```
core/       — modals, utils, phase-balance, update, release-notes, supabase, auth-ui,
              state, undo, calculate, gear-data, init
specs/      — panels, processors, custom-panels, custom-processors
layouts/    — standard, power, data, structure
structure/  — bumpers, plates, weight, drawing
interact/   — standard-canvas, touch-gestures
nav/        — gear, cable-diagram, combined-cable-diagram, canvas, raster, combined,
              navigation, welcome
export/     — canvas-export, title-block, resolume, pdfLayoutEngine, pdf, pdf-preview,
              export-all, export-modal
config/     — setup, save-load, gear-codes, distro-wiring, dom-setup
screens/    — multi-screen
tools/      — testpattern
```

All modules use plain `<script>` tags (no build system, global scope). Script load order matters for parse-time code; runtime calls inside functions/DOMContentLoaded are safe regardless of order. Global variables are declared inline in `index.html` to guarantee initialization before any module reads them.

External deps (CDN only — no npm):
- pdfmake 0.2.9 (+ vfs_fonts) — PDF generation
- html2canvas 1.4.1 — canvas-to-image capture
- pdf.js 3.11.174 — PDF rendering
- supabase-js 2.95.0 — auth, database, storage
- JSZip 3 — zipped multi-file exports
- mp4-muxer 5.1.3 — test pattern video export

Fonts and icons are **self-hosted**, not CDN — `fonts/*.woff2` with `@font-face` at the top of `styles.css` (Bangers, Roboto Condensed, Material Symbols). No Google Fonts requests are made.

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
  - `connect-src` — anything fetched via `fetch()` or SW, including all CDN domains
- **When adding a new CDN dependency**, add its domain to BOTH the relevant resource directive AND `connect-src` (because the service worker's `fetch()` calls are governed by `connect-src`)
- **Fonts are self-hosted** — `fonts/*.woff2` with `@font-face` at the top of `styles.css`. `font-src 'self'` is correct and no font domain belongs in any directive. Do not reintroduce Google Fonts.

**Header ordering in `netlify.toml`:**
- Generic cache rules (`/*.js`, `/*.css`) MUST come BEFORE specific no-cache overrides (`/sw.js`, `/version.json`, `/manifest.json`). Netlify applies the last matching rule, so specific rules must come after generic ones to take precedence.

**Service Worker (`sw.js`) — asset rules:**
- **Keep the self-hosted fonts in `LOCAL_ASSETS`** — the three `fonts/*.woff2` files must stay pre-cached or the app renders with fallback fonts offline.
- **Every module loaded by a `<script>` tag in `index.html` must appear in `LOCAL_ASSETS`** — a module that's missing simply isn't available offline. Verify after adding a module.
- CDN scripts (pdfmake, html2canvas, pdf.js, Supabase, JSZip) CAN be cached and intercepted by the SW.

---

## Version Management — ALWAYS Follow

**Four places to update on EVERY version change:**

1. `version.json` → `"version"` field + `"updated"` date (YYYY-MM-DD) + `"changelog"` (commit description)
2. `index.html` → `const APP_VERSION = 'X.X.X';` + `const APP_CHANGELOG = '...';` (next line)
3. `sw.js` → `const SW_VERSION = 'X.X.X';` (line 5)
4. `core/release-notes.js` → prepend a new `{ version, date, notes }` entry to the top of the `RELEASE_NOTES` array (newest first). `notes` = the commit description (same string as the changelog).

Version strings in `version.json`, `index.html`, and `sw.js` must match. `APP_CHANGELOG`, `version.json` `changelog`, and the new `RELEASE_NOTES` `notes` must match. Default: increment patch (e.g., 2.5.25 → 2.5.26).

Use the `/commit` command to handle this automatically.

**Public release — one-time version reset:** For the public launch, reset the version to `1.0.0` across all three files (`version.json`, `APP_VERSION` in `index.html`, `SW_VERSION` in `sw.js`) in a single manual pass — do NOT use `/commit` for the reset itself (it auto-bumps the patch and would produce the wrong number). This is safe even though it lowers the number: the update check (`core/update.js`) compares versions by *inequality* (`!==`), not order, so existing users still get the update banner. After the reset, `/commit` resumes normally from `1.0.1`. Tag the release commit `git tag v1.0.0` (no tags exist yet).

---

## Commit Conventions — ALWAYS Follow

- Format: `<Description in present tense> (vX.X.X)`
- Trailer: `Co-Authored-By: Claude <noreply@anthropic.com>`
- Description: concise (8–15 words), starts with a verb
- Example: `Fix cable count for dual-link SDI configurations (v2.5.26)`

Use HEREDOC format for multi-line commit messages.

---

## Skill Auto-Triggers — ALWAYS Use the Right Skill

Do NOT freehand these tasks. Invoke the matching skill first, every time, without being asked:

| Task | Skill to invoke |
|------|----------------|
| Committing changes | `/commit` |
| Planning / discussing a new feature | `/brainstorm` |
| Investigating or fixing a bug | `/debug` |
| Adding or changing any UI element | `/ui-design` |
| Code review | `/review` |
| Refactoring code | `/refactor` |
| Performance investigation | `/perf` |
| Security audit | `/security` |
| CSS / style consistency check | `/style-audit` |
| Pre-deployment verification | `/deploy-check` |
| Generating changelog | `/changelog` |
| Writing tests | `/test-write` |
| Verifying exports | `/test-export` |
| Scoping a task before coding | `/scope-lock` |

---

## Hard Stops — NEVER Do These Without Explicit Permission

These are non-negotiable. If tempted to do any of the following, STOP and ask first:

- **Touch code outside the exact file/function reported** — a bug in `calculatePower()` means touching ONLY `calculatePower()`, not the functions around it
- **Rename or restructure anything** — variable names, function names, file organization: leave them exactly as-is unless renaming is the explicit task
- **Clean up "while you're in there"** — no reformatting, no removing unused vars, no fixing unrelated things you notice
- **Override a decision the user already made** — if they chose an approach, implement it; don't substitute your own preference
- **Add anything not asked for** — no extra error handling, no comments, no console.logs, no fallbacks, no convenience wrappers

---

## Preservation Rules — NEVER Break Existing Working Code or UI

Before touching ANY CSS or HTML, run this mental checklist:

**CSS changes:**
- What other elements share this selector, class, or CSS variable? List them. Verify they are unaffected.
- Does the new rule have higher specificity than existing ones? Could it bleed onto unintended elements?
- If changing a CSS variable (`var(--primary)`, etc.) — search for every place it's used before changing it.
- If changing a shared utility class (`.section-card`, `.text-outline-black`, etc.) — check every element that uses it.

**HTML changes:**
- Are there JS selectors (`getElementById`, `querySelector`, `getElementsByClassName`) that target any ID or class being added, moved, or renamed? They will silently break.
- Does the new HTML position affect existing flex/grid layout, z-index stacking, or scroll context?

**After every UI change — verify these haven't regressed:**
- [ ] The changed element looks correct on mobile AND desktop
- [ ] Adjacent elements (above, below, beside) still look exactly as before
- [ ] No new horizontal scrollbar appeared
- [ ] No other section of the app changed appearance
- [ ] Run `node tests/smoke-test.js` — 0 failures

**The rule:** If you cannot confidently answer "nothing else will change", you must read more code before proceeding.

---

## Code Quality — ALWAYS Follow

- **Read before modifying** — never propose changes to unread code. Open and read the file first, every time.
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

## Supabase — ALWAYS Follow When Adding Tables

- **When creating ANY new Supabase `public` table, apply the grants + RLS pattern in `supabase/grants-reference.sql`** — don't just write the `supabase.from(...)` client code. Emit the `GRANT` to `anon`/`authenticated`/`service_role`, `enable row level security`, and the RLS policies alongside it.
- **Why:** Supabase's Data API default changed — new `public` tables are no longer auto-exposed to supabase-js/PostgREST/GraphQL. Enforced on this project (ref `wdprtbmhekougwnkpcdu`) from **2026-10-30**. Without an explicit GRANT, reads/writes fail with PostgREST error `42501`.
- The 6 existing tables are already granted — never re-run their reference blocks (`CREATE POLICY` errors on duplicate names).

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

- **The PDF has ONE rendering path — the preview IS the PDF:**
  - `export/pdf.js` owns the pdfmake document definition (`buildSimplePdf`, `buildComplexPdf`, `buildPdfDocDefinition`). Every visual change to the PDF is made here, once.
  - `export/pdf-preview.js` owns only the preview chrome: the toggle options, page size/orientation, logo upload, and the eco/greyscale print-colour modes. It defines no document builders.
  - Both `rebuildPreview()` and `exportFromPreview()` call the same `buildSimplePdf`/`buildComplexPdf` and hand the result to `pdfMake.createPdf()`. The preview renders that blob with PDF.js into `#pdfPreviewPages`; export downloads it. What the user previews is byte-for-byte the PDF they get.
- PDF pipeline: `pdfCaptureCanvases()` → `buildSimplePdf`/`buildComplexPdf` → `pdfMake.createPdf()`
- jsPDF is NOT used anywhere in the app. html2canvas is used only by `export/canvas-export.js` for PNG export, never by the PDF path.
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
