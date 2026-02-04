# Welcome Page Implementation Plan — B.L.I.N.K.

## Overview

Add a full-screen welcome page as the entry point to the LED Calculator app. The welcome page displays the app branding (B.L.I.N.K.), mode selection buttons (Simple/Complex), a Sign In placeholder, and an in-app help modal. Always shown on load — no persistence.

---

## Files to Create

| File | Purpose |
|------|---------|
| `nav/welcome.js` (~80 lines) | Welcome page show/hide logic, mode entry, bottom nav reconfiguration |
| `Implementation Plans/Welcome-Page.md` | Copy of this plan |

## Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Add welcome page HTML + help modal HTML after `<body>` tag; add global variable; add `<script>` tag; add "Welcome Page" button to hamburger menu |
| `styles.css` | Append welcome page + help modal CSS (~180 lines) |
| `nav/navigation.js` | Guard `initMobileUI()` to show welcome page on load instead of switching to simple view |
| `core/init.js` | Guard initial `calculate()` and `showCanvasView()` behind `isWelcomePageVisible` check |

---

## 1. HTML — Welcome Page (`index.html`, after `<body>` tag, before line 62)

```html
<!-- Welcome Page -->
<div id="welcomePage" class="welcome-page">
  <div class="welcome-content">
    <!-- Logo placeholder (swap with <img> when logo is designed) -->
    <div class="welcome-logo-container">
      <h1 class="welcome-title">B.L.I.N.K.</h1>
    </div>
    <p class="welcome-subtitle">Build Layout Intelligence for Networked Kits</p>
    <div class="welcome-divider"></div>
    <p class="welcome-label">LED Calculator</p>

    <!-- Mode Selection -->
    <div class="welcome-buttons">
      <button class="welcome-btn welcome-btn-simple" onclick="enterSimpleMode()">
        <span class="welcome-btn-title">Simple</span>
        <span class="welcome-btn-desc">Quick setup with essential tools</span>
      </button>
      <button class="welcome-btn welcome-btn-complex" onclick="enterComplexMode()">
        <span class="welcome-btn-title">Complex</span>
        <span class="welcome-btn-desc">Full suite with layouts, gear & combined view</span>
      </button>
    </div>

    <!-- Sign In (placeholder) -->
    <button class="welcome-btn-signin" onclick="showAlert('Sign in coming soon!')">
      <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 6px;">login</span>
      Sign In
    </button>

    <!-- Help -->
    <button class="welcome-btn-help" onclick="openHelpModal()">
      <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 6px;">help_outline</span>
      How to Use This App
    </button>

    <!-- Footer -->
    <div class="welcome-footer">
      <span id="welcomeVersionNumber"></span>
      <span>&copy; 2025 Gabriel Labrecque &bull; Fearless Wanderer Productions</span>
    </div>
  </div>
</div>
```

### Visual hierarchy (top → bottom):
1. **B.L.I.N.K.** — 64px Bangers, green + black stroke (dominant). Wrapped in `.welcome-logo-container` so an `<img>` can be swapped in later.
2. **Build Layout Intelligence for Networked Kits** — 14px Roboto Condensed, muted gray
3. **Green divider bar** — 60px wide, comic shadow
4. **LED Calculator** — 22px Bangers, light text
5. **Simple / Complex buttons** — large comic-style cards with descriptions
6. **Sign In** — outlined ghost button, secondary importance
7. **How to Use This App** — subtle text link, tertiary
8. **Version + Copyright** — 10px footer

---

## 2. HTML — Help Modal (`index.html`, after welcome page HTML)

Uses the existing `.modal-overlay` / `.modal-dialog` pattern from `core/modals.js`. Contains hardcoded HTML with key README sections:

- Getting Started (step-by-step)
- Simple vs Complex mode explanation
- Mobile vs Desktop differences
- Keyboard Shortcuts table
- Quick Tips
- "Full documentation on GitHub" link at bottom

```html
<div id="helpModal" class="modal-overlay">
  <div class="modal-dialog" style="max-width: 560px; max-height: 85vh;">
    <div class="modal-header">
      <h2 class="modal-title">How to Use B.L.I.N.K.</h2>
      <button class="modal-close" onclick="closeHelpModal()">&times;</button>
    </div>
    <div class="modal-body" style="overflow-y: auto; max-height: calc(85vh - 80px); padding: 16px;">
      <!-- Condensed getting-started content styled with existing theme -->
    </div>
  </div>
</div>
```

---

## 3. HTML — Hamburger Menu Addition (`index.html`, ~line 547)

Add a "Welcome Page" button as a new section at the top of `.mobile-menu-content`:

```html
<div class="mobile-menu-section">
  <button class="mobile-menu-btn" onclick="closeMobileMenu(); showWelcomePage();">
    <span class="material-symbols-outlined" style="font-size: 16px; margin-right: 6px; vertical-align: middle;">home</span>
    Welcome Page
  </button>
</div>
```

---

## 4. HTML — Global Variable (`index.html`, inline `<script>` ~line 1481)

```javascript
let isWelcomePageVisible = true;
```

---

## 5. HTML — Script Tag (`index.html`, after `nav/navigation.js` script tag)

```html
<script src="nav/welcome.js"></script>
```

---

## 6. CSS — Welcome Page Styles (`styles.css`, append at end)

Key styles:
- `.welcome-page` — `position: fixed; inset: 0; z-index: 5000; display: flex; align-items: center; justify-content: center;` with halftone overlay `::before`
- `.welcome-title` — 64px Bangers, green, black stroke/shadow (matches header h1 pattern)
- `.welcome-btn` — 4px black border, comic box shadow, press effect (`translate(4px, 4px)` on `:active`)
- `.welcome-btn-signin` — outlined ghost style (2px border, transparent bg, green text)
- `.welcome-btn-help` — borderless text link style
- `.welcome-logo-container` — container for future `<img>` logo swap
- Desktop (768px+): buttons side-by-side, larger title (80px), wider content (480px)
- Mobile: buttons stacked vertically, 64px title, full-width content

---

## 7. JavaScript — `nav/welcome.js` (new file)

### Functions:

**`showWelcomePage()`**
- Sets `isWelcomePageVisible = true`
- Shows `#welcomePage`, hides header, bottom nav, all app containers
- Sets `body.style.overflow = 'hidden'`
- Sets version number text

**`hideWelcomePage()`**
- Sets `isWelcomePageVisible = false`
- Hides `#welcomePage`, restores header + bottom nav
- Restores `body.style.overflow`

**`configureBottomNavForMode(mode)`**
- **Simple**: hide `.nav-complex-group` groups, show `.nav-simple-group`. Result: `[Simple] [Canvas]`
- **Complex**: show `.nav-complex-group` groups, hide `.nav-simple-group`. Result: `[Complex | Combined] [Gear] [Canvas]`

**`enterSimpleMode()`** — `hideWelcomePage()` → `configureBottomNavForMode('simple')` → `switchAppMode('simple')`

**`enterComplexMode()`** — `hideWelcomePage()` → `configureBottomNavForMode('complex')` → `switchAppMode('complex')`

**`openHelpModal()`** / **`closeHelpModal()`** — show/hide the help modal overlay

---

## 8. Modifications — `nav/navigation.js`

### `initMobileUI()` (line 364-370)

Replace:
```javascript
switchMobileView('simple');
if(typeof calculate === 'function') {
  setTimeout(calculate, 100);
}
```

With:
```javascript
if (typeof isWelcomePageVisible !== 'undefined' && isWelcomePageVisible) {
  showWelcomePage();
} else {
  switchMobileView('simple');
  if(typeof calculate === 'function') {
    setTimeout(calculate, 100);
  }
}
```

---

## 9. Modifications — `core/init.js`

### DOMContentLoaded handler (lines 71-88)

Guard initial `calculate()` and `showCanvasView()`:

```javascript
if (typeof isWelcomePageVisible === 'undefined' || !isWelcomePageVisible) {
  setTimeout(() => { calculate(); }, 100);
  // ...
  setTimeout(() => { showCanvasView(); }, 150);
}
```

Keep `initializeScreenSystem()`, `loadScreenData()`, `updateSuggestedCircuitLimit()`, `updateSuggestedDataLimit()`, and canvas interaction init (`initCanvasWheelZoom`, etc.) running unconditionally — they set up state that's needed when the user enters a mode.

---

## 10. Bottom Nav Behavior Summary

| Mode | Visible Buttons | Layout |
|------|----------------|--------|
| Simple | Simple, Canvas | `[Simple] [Canvas]` — two even standalone buttons |
| Complex | Complex, Combined, Gear, Canvas | `[Complex | Combined] [Gear] [Canvas]` — 2+1+1 layout |

**Complex mode nav**: Complex and Combined are grouped together in one toggle (they share a border/background as a connected pair). Gear and Canvas are standalone buttons with their own borders, visually separate from each other and from the Complex/Combined group.

**Implementation**: Restructure the bottom nav HTML to support this. Instead of the current 2 fixed `nav-mode-toggle` groups, use 3 containers:
- Group 1 (`nav-mode-toggle`, flex: 2): Complex + Combined
- Group 2 (`nav-mode-toggle`, flex: 1): Gear (standalone)
- Group 3 (`nav-mode-toggle`, flex: 1): Canvas (standalone)

For Simple mode, hide groups 1–2 and show two standalone buttons: Simple + Canvas. `configureBottomNavForMode()` handles toggling the display of these groups.

**Bottom nav HTML restructure** (`index.html`, lines 1587-1608):
```html
<nav class="bottom-nav">
  <!-- Complex mode groups -->
  <div class="nav-mode-toggle nav-complex-group" style="flex: 2;">
    <button class="nav-toggle-btn active" data-mode="complex" onclick="switchAppMode('complex')">
      <span>Complex</span>
    </button>
    <button class="nav-toggle-btn" data-mode="combined" onclick="switchAppMode('combined')">
      <span>Combined</span>
    </button>
  </div>
  <div class="nav-mode-toggle nav-complex-group" style="flex: 1;">
    <button class="nav-toggle-btn" data-mode="gear" onclick="switchAppMode('gear')">
      <span>Gear</span>
    </button>
  </div>

  <!-- Simple mode group (hidden by default) -->
  <div class="nav-mode-toggle nav-simple-group" style="flex: 1; display: none;">
    <button class="nav-toggle-btn" data-mode="simple" onclick="switchAppMode('simple')">
      <span>Simple</span>
    </button>
  </div>

  <!-- Canvas (always visible) -->
  <div class="nav-mode-toggle" style="flex: 1;">
    <button class="nav-toggle-btn" data-view="canvas" onclick="switchMobileView('canvas')">
      <span>Canvas</span>
    </button>
  </div>
</nav>
```

`configureBottomNavForMode()` toggles `.nav-complex-group` and `.nav-simple-group` visibility.

---

## 11. Implementation Order

1. Add `let isWelcomePageVisible = true;` global variable to `index.html`
2. Add welcome page HTML to `index.html` (after `<body>`)
3. Add help modal HTML to `index.html` (after welcome page)
4. Add "Welcome Page" button to hamburger menu in `index.html`
5. Append welcome page + help modal CSS to `styles.css`
6. Create `nav/welcome.js` with all welcome page functions
7. Add `<script src="nav/welcome.js">` tag to `index.html`
8. Modify `nav/navigation.js` — guard `initMobileUI()` for welcome page
9. Modify `core/init.js` — guard initial `calculate()` and `showCanvasView()`
10. Copy plan to `Implementation Plans/Welcome-Page.md`

---

## 12. Verification

1. **Smoke test**: `python3 tests/smoke-test.py` — must pass with 0 failures
2. **Browser — Welcome page**: App loads showing welcome page, header and bottom nav are hidden
3. **Browser — Simple mode**: Click Simple → app shows with Simple + Canvas tabs only, calculations run
4. **Browser — Complex mode**: Click Complex → app shows with Complex/Combined/Gear/Canvas tabs
5. **Browser — Return**: Hamburger menu → "Welcome Page" returns to welcome screen
6. **Browser — Help modal**: "How to Use" opens scrollable help modal, works from welcome page
7. **Browser — Sign In**: Shows "coming soon" alert
8. **Mobile**: Touch targets, safe-area padding, vertical button stacking
9. **Desktop (768px+)**: Side-by-side buttons, wider layout
