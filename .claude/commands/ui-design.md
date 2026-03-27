Design a UI change with HTML structure, CSS plan, and responsive behavior before implementation.

## Instructions

1. **Parse $ARGUMENTS** to understand what UI change is requested.

2. **Preservation audit — do this BEFORE designing anything new:**
   - Identify every existing element that shares a CSS class, selector, or CSS variable with the area being changed
   - Identify every JS selector (`getElementById`, `querySelector`, etc.) that targets IDs or classes near the change
   - List what must NOT change — these are protected. State them explicitly in the output under "Protected Elements"
   - If a shared utility class or variable must be modified, flag it as HIGH RISK and list all affected elements

3. **Read existing patterns** to ensure the design fits:
   - `styles.css` — current theme colors, CSS variables, font usage, component patterns
   - `CSS-NOTES.md` — button override checklist, specificity gotchas
   - `index.html` — existing HTML structure, class naming conventions
   - The section closest to the proposed UI for pattern matching

4. **Design the HTML structure:**
   - What elements are needed (divs, buttons, inputs, sections)
   - Where in the DOM hierarchy they belong
   - Use NEW, specific class names for new elements to avoid collisions with existing styles
   - IDs and classes following existing naming conventions
   - Semantic HTML where appropriate

5. **Plan the CSS approach:**
   - Which existing classes can be reused (e.g., `.section-card`, `.text-outline-black`, `.section-title`)
   - What new CSS rules are needed — scope them tightly so they cannot bleed onto other elements
   - CSS variable usage (use existing `var(--primary)`, `var(--secondary)`, etc.)
   - Font assignments (Bangers for headers, Roboto Condensed for body)

6. **Check the button override checklist** — if the design includes any `<button>` elements that aren't standard full-width green buttons, list EVERY property that must be overridden:
   ```
   background, border, border-radius, padding, min-height, width,
   margin-bottom, box-shadow, text-shadow, font-size, font-weight,
   color, letter-spacing, -webkit-tap-highlight-color, touch-action
   ```

7. **Responsive behavior:**
   - Mobile layout (< 768px) — how does it look on a phone?
   - Desktop layout (>= 768px) — how does it differ?
   - Touch targets — minimum 44x44px for all interactive elements
   - Safe-area-inset handling for bottom nav

8. **Accessibility notes:**
   - Color contrast (text vs background)
   - Labels for form elements
   - Focus indicators for keyboard navigation
   - ARIA attributes if needed

## Output Format

### UI Design: [feature name]

#### Protected Elements (must not change)
- [element / class / ID] — [why it's in scope and what would break if it changed]

#### HTML Structure
```html
<!-- Skeleton showing element hierarchy, classes, IDs -->
```

#### CSS Plan
```css
/* New rules needed — note scope to prevent bleed */
/* Note which existing classes are reused */
```

#### Button Overrides (if applicable)
```css
/* Full override list for any non-standard buttons */
```

#### Responsive Notes
- **Mobile:** [layout description]
- **Desktop:** [layout description]

#### Accessibility
- [contrast, labels, focus, tap targets]

#### Existing Patterns Reused
- [class name] from [location] — [what it provides]

## Example

`/ui-design Add a premium subscription card to the welcome page`
