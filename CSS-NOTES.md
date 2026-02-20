# CSS Architecture Notes

Reference for CSS gotchas, global rules, and specificity patterns in `styles.css`.
**Read this before adding or modifying any button or styled element.**

---

## Global Button Rule (Mobile)

**`styles.css` line ~595** applies to ALL `<button>` elements on mobile (< 640px):

```css
button {
  padding: 12px 20px;
  font-size: 14px;
  width: 100%;
  margin-bottom: 10px;
  min-height: 48px;
}
```

At `@media (min-width: 640px)` (line ~628), buttons switch to `width: auto`.

**Impact:** Any button inside a flex row, modal list, or compact layout will stretch to full width on mobile unless you explicitly override:

```css
.your-button-class {
  width: auto;
  min-height: auto;
  margin-bottom: 0;
}
```

---

## `.btn-small` Specificity

**`styles.css` line ~2012** — `.btn-small` is defined late in the file:

```css
.btn-small {
  padding: 4px 12px;
  font-size: 12px;
}
```

Because it appears after most component styles, it will **override** `padding` and `font-size` set by earlier class selectors with equal specificity.

**Fix:** When a component button needs different sizing than `.btn-small`, use `!important` or a compound selector:

```css
/* Option 1: !important */
.your-component-btn {
  padding: 4px 8px !important;
  font-size: 11px !important;
}

/* Option 2: compound selector (higher specificity) */
.btn-small.your-component-btn {
  padding: 4px 8px;
  font-size: 11px;
}
```

---

## Modal Scrolling (iOS)

`.modal-dialog` and any scrollable container inside modals need `-webkit-overflow-scrolling: touch` for smooth momentum scrolling on iOS Safari.

When adding a new scrollable list inside a modal, always include:

```css
.your-scrollable-list {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

---

## Responsive Breakpoints

| Breakpoint | What changes |
|------------|-------------|
| < 640px | Buttons: `width: 100%`, full mobile layout |
| >= 640px | Buttons: `width: auto` |
| >= 768px | Tablet layout adjustments |

---

## Checklist: Adding or Modifying a Button

- [ ] **Check global `button` rule** — does your button need `width: auto`, `min-height: auto`, `margin-bottom: 0`?
- [ ] **Check `.btn-small` override** — if using `.btn-small`, will its `padding`/`font-size` override your component styles?
- [ ] **Test on mobile width** (< 640px) — does the button stretch, overflow, or break the layout?
- [ ] **Test on desktop width** (>= 640px) — does the button look correct alongside other elements?
- [ ] **Flex containers** — use `flex: 0 0 auto` to prevent buttons from stretching in flex rows
- [ ] **Inside modals** — verify scrolling still works on iOS after adding interactive elements

---

## Utility & Component Classes (styles.css end-of-file)

All static inline styles from `index.html` have been extracted into CSS classes at the bottom of `styles.css` (after the raster/test-pattern sections). The remaining ~65 inline `style=` attributes in `index.html` are **all** `display: none` — JS-toggled visibility that must stay inline.

### Icon sizes
- `.icon-14`, `.icon-16`, `.icon-18` — material icon font-size
- `.icon-18-mr`, `.icon-16-mr` — icon + margin-right

### Checkbox / modal elements
- `.checkbox-label`, `.checkbox-list` — flex checkbox rows
- `.modal-hint`, `.modal-divider`, `.modal-divider-sm` — hint text and separators
- `.modal-body-text` — standard body paragraph (13px, #e0e0e0)

### Modal sizing
- `.modal-sm` (300px), `.modal-320` … `.modal-560` — max-width variants
- `.modal-scrollable` — 85vh + scrollable body child
- `.modal-footer-end` — flex end-justified footer
- `.modal-footer-gap` — footer with 8px gap

### Toggle / label helpers
- `.toggle-label-block`, `.toggle-label-block-2` — block labels with margin
- `.toggle-label-10` — block label, 10px font-size
- `.toggle-label-hidden` — invisible label for alignment
- `.help-text-highlight`, `.help-text-muted` — colored help text

### Slider toggle variants
- `.slider-toggle-btn-tab`, `.slider-toggle-btn-sm`, `.slider-toggle-btn-xs`, `.slider-toggle-btn-scope`

### Toggle button variants
- `.toggle-btn-standalone` — border + box-shadow (comic-book style)
- `.toggle-btn-grouped-left`, `.toggle-btn-grouped-right` — paired buttons
- `.toggle-btn-disabled` — pointer-events: none, full opacity
- `.grouped-btn-shadow` — flex wrapper with shared shadow

### Spacing utilities
- `.mb-0` … `.mb-20` — margin-bottom (0, 2, 4, 8, 10, 12, 14, 16, 20)
- `.mt-4`, `.mt-8`, `.mt-10` — margin-top

### Width utilities
- `.w-full`, `.w-80`, `.w-60` — explicit widths
- `.max-w-160`, `.max-w-180`, `.max-w-200` — max-width
- `.min-w-140` — min-width

### Flex utilities
- `.flex-noshrink`, `.flex-1`, `.flex-1-minw0`, `.flex-2`
- `.flex-col-gap-8` — flex column with 8px gap
- `.d-inline-flex` — display: inline-flex

### Overflow / display utilities
- `.overflow-x-auto`, `.overflow-visible`
- `.text-center`, `.fs-14`

### Cabling section
- `.cabling-3col`, `.cabling-header`, `.cabling-header-general/power/data`
- `.cabling-inputs-2col`, `.cabling-subsection`, `.cabling-divider`, `.cabling-divider-indent`
- `.cabling-data-2col`, `.cabling-pl-6`, `.cabling-header-data-inline`
- `.dist-box-label`, `.dist-box-check`, `.dist-box-row`, `.dist-box-row-mb`

### Canvas view
- `.canvas-zoom-row`, `.canvas-ctrl-btn`, `.canvas-ctrl-btn-lg`
- `.canvas-col-gap16`, `.canvas-controls-row`, `.canvas-export-row`
- `.canvas-hint-text`, `.canvas-info-text`, `.canvas-title-top`
- `.snap-btn-col`
- ID-based: `#canvasViewWrapper`, `#canvasViewport`, `#canvasView`, `#canvasZoomInput`, `#canvasExportFilename`, `#canvasExportFormat`, `#btnExportCanvas`, `#snapModeBtn`

### Combined view
- `.combined-layout`, `.combined-hint-box`, `.combined-interaction-hints`
- `.combined-layouts-wrap`, `.combined-specs-layout`
- `.combined-zoom-btn`, `.combined-zoom-btn-plus`
- ID-based: `#combinedScreenToggles`, `#combinedPositionControls`, `#combinedZoomInput`

### Gear / cable section
- `.gear-list-layout`, `.cable-diagram-wrap`
- `.content-text`, `.content-text-padded` — gear/specs text styling
- ID-based: `#gearScreenToggles`, `#cableDiagramCanvas`

### Gear code modal
- ID-based: `#gearCodeModal .modal-dialog/header/body/footer`
- `.gc-toggle-margin`, `.gc-search-row`, `.gc-scope-row`, `.gc-scope-label`, `.gc-content-area`, `.gc-footer-left`

### One-off component classes
- `.pwa-install-icon` — PWA modal app icon
- `.color-picker-row`, `.color-picker-input`, `.color-preview` — screen color pickers
- `.btn-duplicate` — blue duplicate button
- `.btn-danger-text`, `.btn-delete-text` — red text buttons
- `.select-fw-14` — full-width select, 14px
- `.input-fw-bbox` — full-width with border-box
- `.input-placeholder-color` — 60px input with placeholder gray
- `.dimension-toggles-row` — flex row for dimension toggles
- `.compact-row-nowrap` — compact-row without wrapping
- `.label-block-mb8` — block label with 8px margin
- `.toggle-group-6` — toggle-group with 6px gap
- `.hint-compact`, `.hint-muted`, `.request-hint` — hint text variants
- `.weight-title` — weight section header
- `.loading-text` — loading placeholder
- `.textarea-tall` — min-height: 200px
- `.link-inherit` — inherits color, underlined
- `.help-footnote` — small muted footnote
- `.mobile-menu-header-col`, `.mobile-menu-label-accent`
- `.raster-table-layout`, `.raster-table-scroll`, `.raster-help-text`
- `.canvas-tabs-layout`, `.canvas-container-layout`
- `.nav-flex-1`, `.nav-flex-2` — bottom nav flex sizing
