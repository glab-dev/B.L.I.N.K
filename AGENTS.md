# B.L.I.N.K. — LED Wall Calculator — Project Instructions

This file is loaded automatically by Antigravity/Gemini agents. It defines the project architecture, coding conventions, and rules that ALL agents must follow.

## Session Startup — ALWAYS Do First

Start the local dev server at the beginning of every session:
```powershell
# Windows workaround: use 'cmd /c' to bypass PowerShell script execution policy
cmd /c "npx -y http-server -p 8000"
```
The app will be available at `http://localhost:8000`.

## Agent-Specific Tool Capabilities

*   **Browser-Subagent**: Use the browser tool to verify UI changes visually and run Playwright tests in interactive mode if needed.
*   **Image Generation**: Use `generate_image` to create placeholder assets or UI mockups when requested.
*   **Stitch MCP**: Use the `stitch` server tools for generating layout screens or rapid UI prototyping.

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

**CRITICAL:** This project uses NO build system. All modules are plain `<script>` tags in global scope. There is no webpack, vite, rollup, or bundler. Do NOT suggest adding one. Script load order matters for parse-time code; runtime calls inside functions/DOMContentLoaded are safe regardless of order.

Global variables are declared inline in `index.html` to guarantee initialization before any module reads them.

**External deps (CDN only — no npm for production):**
- jsPDF 2.5.1 — PDF generation
- html2canvas 1.4.1 — canvas-to-image for PDF
- Material Design Icons — UI icons
- Google Fonts — Bangers, Roboto Condensed

**Deployment:** Netlify auto-deploys from GitHub main branch → blink-led.com (via Cloudflare). Backend: Supabase (auth, DB). Email: Resend. Payments (planned): Stripe.

---

## Version Management — ALWAYS Follow

**Two places to update on EVERY version change:**

1. `version.json` → `"version"` field + `"updated"` date (YYYY-MM-DD)
2. `index.html` → `const APP_VERSION = 'X.X.X';` (around line 1257)

Both must match. Default: increment patch (e.g., 2.5.25 → 2.5.26).

---

## Commit Conventions — ALWAYS Follow

- Format: `<Description in present tense> (vX.X.X)`
- Trailer: `Co-Authored-By: <agent name> <noreply@anthropic.com>` or appropriate co-author
- Description: concise (8–15 words), starts with a verb
- Example: `Fix cable count for dual-link SDI configurations (v2.5.26)`

---

## Code Quality — ALWAYS Follow

- **Read before modifying** — never propose changes to unread code
- **No over-engineering** — no unnecessary abstractions, helpers, wrappers, or extra configurability
- **No scope creep** — don't add features beyond what was asked
- **Clean deletions** — remove dead code completely, no commented-out code
- **Follow existing patterns** — if the codebase does something a certain way, match it
- **Check callers** — when changing a function, verify all call sites
- **Event listeners** — verify cleanup when elements are removed
- **Canvas operations** — check context save/restore state management
- **No build system changes** — do NOT suggest adding TypeScript, React, webpack, vite, or any build tooling

---

## Root Cause Analysis — ALWAYS Follow

When fixing bugs:
- **Identify the root cause** — don't just patch symptoms
- **Trace the issue to its source** — follow the data flow backwards
- **Fix the underlying problem** — ensure the fix prevents recurrence
- **Consider related cases** — if it failed here, could it fail elsewhere?

---

## Security — ALWAYS Check

- Never use `eval()`, `Function()` constructor, or `document.write()`
- Sanitize user input before DOM insertion
- Prefer `textContent` over `innerHTML` for user-provided strings
- Validate localStorage data on read (handle malformed JSON)
- File imports (.ledconfig): validate structure before applying

---

## Styling — ALWAYS Follow

- **Comic-book theme is non-negotiable** — do NOT suggest "cleaner" or "modern" redesigns
- Fonts: Bangers (headers), Roboto Condensed (body text, inputs, data, nav labels)
- Black text outlines (`.text-outline-black`), colored borders on containers
- Mobile-first responsive: 768px tablet breakpoint
- Fixed header + bottom nav with safe-area-inset padding
- **Button override checklist** — The global `button` rule (styles.css ~line 595) styles ALL `<button>` elements as full-width green comic-book buttons. Any non-standard button MUST explicitly override ALL of:
  ```
  background, border, border-radius, padding, min-height, width,
  margin-bottom, box-shadow, text-shadow, font-size, font-weight,
  color, letter-spacing, -webkit-tap-highlight-color, touch-action
  ```

---

## State Management

- Global variables: `screens{}`, `currentScreenId`, `deletedPanels` (Set), `bumpers[]`
- Data flow: input change → `calculate()` → `generateLayout()` → canvas render
- Undo/redo: call `saveState()` before mutations, max 50 history items
- Screen data: `saveCurrentScreenData()` persists to `screens[currentScreenId].data`

---

## Testing — ALWAYS Run After Changes

**Mandatory:** Run `python3 tests/smoke-test.py` — must pass with **0 failures**.

**Playwright Tests:** Run `npm run test:smoke` for quick checks, `npm test` for full suite.

---

## Documentation Hierarchy

For detailed instructions in specific areas, refer to these granular rule files:
- [Code Style](file:///c:/Users/gabla/Desktop/LED-Calculator/.agent/rules/code-style.md)
- [CSS Conventions](file:///c:/Users/gabla/Desktop/LED-Calculator/.agent/rules/css-conventions.md)
- [Git Conventions](file:///c:/Users/gabla/Desktop/LED-Calculator/.agent/rules/git-conventions.md)
- [Testing Rules](file:///c:/Users/gabla/Desktop/LED-Calculator/.agent/rules/testing.md)

## Institutional Knowledge

- **Logic Details**: See [App-Rules.md](file:///c:/Users/gabla/Desktop/LED-Calculator/Reference/App-Rules.md) for complex calculation and state logic.
- **Project Context**: Review [Implementation Plans/](file:///c:/Users/gabla/Desktop/LED-Calculator/Implementation%20Plans/) to understand the reasoning behind past architectural shifts.
