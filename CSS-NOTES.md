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
