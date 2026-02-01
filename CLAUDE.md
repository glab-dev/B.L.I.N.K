# LED Wall Calculator — Project Instructions

Claude reads this file automatically at the start of every session.

## Architecture

Modular PWA: `index.html` (~2,365 lines) + 30 external JS modules across 7 directories.

| Region | Location | Content |
|--------|----------|---------|
| CSS | `styles.css` + inline `<style>` | Styling |
| HTML | `index.html` ~1–1200 | DOM structure |
| Inline JS | `index.html` ~1256–2365 | Globals, DOMContentLoaded handlers, touch gestures |
| External JS | 30 files in 7 dirs | All application logic (loaded via `<script>` tags) |

**JS module directories:**
```
core/       — modals, utils, state, undo, calculate
specs/      — panels, processors, custom-panels, custom-processors
layouts/    — standard, power, data, structure
structure/  — bumpers, plates, weight, drawing
interact/   — standard-canvas
nav/        — complex, simple, gear, canvas, combined, navigation
export/     — pdf, canvas-export, resolume
config/     — setup, save-load
screens/    — multi-screen
```

All modules use plain `<script>` tags (no build system, global scope). Script load order matters for parse-time code; runtime calls inside functions/DOMContentLoaded are safe regardless of order. Global variables are declared inline in `index.html` to guarantee initialization before any module reads them.

External deps (CDN only — no npm):
- jsPDF 2.5.1 — PDF generation
- html2canvas 1.4.1 — canvas-to-image for PDF
- Material Design Icons — UI icons
- Google Fonts — Bangers, Roboto Condensed (Permanent Marker is loaded but unused — remove when convenient)

PWA: offline-capable after first load, installable on mobile via manifest (base64-encoded inline).

**App Store goal:** This app is intended for paid distribution on iOS App Store and Google Play. Keep this in mind when making architectural decisions:
- CDN dependencies must eventually be bundled locally (app stores may reject external script loading)
- A native wrapper (e.g., Capacitor) will be needed for store submission
- All features must work fully offline with no network dependency
- The modularization effort directly supports this — clean file structure is easier to wrap for native distribution

---

## Version Management — ALWAYS Follow

**Three places to update on EVERY version change:**

1. `version.json` → `"version"` field + `"updated"` date (YYYY-MM-DD)
2. `index.html` → `const APP_VERSION = 'X.X.X';` (around line 1258)

Both must match. Default: increment patch (e.g., 2.5.25 → 2.5.26).

Use the `/commit` command to handle this automatically.

---

## Commit Conventions — ALWAYS Follow

- Format: `<Description in present tense> (vX.X.X)`
- Trailer: `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`
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

## Security — ALWAYS Check When Writing Code

- Never use `eval()`, `Function()` constructor, or `document.write()`
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

**Mandatory:** Run `python3 tests/smoke-test.py` — it must pass with **0 failures**.

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

---

## Refactoring Rules

- **ALWAYS incremental**: one section or function at a time
- **NEVER refactor multiple sections in one commit**
- After each change: run `python3 tests/smoke-test.py` (must pass with 0 failures) + verify in browser
- Preserve all existing behavior — zero functional changes unless explicitly requested
- When modularizing: extract to external `.js` file, add `<script>` tag, remove from index.html, test, commit
- Keep a working app at every step — if something breaks, revert before continuing
- **Never trust bracket counting alone** — the smoke test's Node.js parse validation is the real check

---

## Export & PDF Awareness

- PDF pipeline: `exportPDF()` → html2canvas captures → jsPDF assembles pages
- Multi-screen PDFs iterate all visible screens
- Resolume XML export: must match Arena 7 format
- .ledconfig files: JSON with full screen state — save/load must be symmetric
- When changing calculation outputs: verify they appear correctly in PDF and gear list
