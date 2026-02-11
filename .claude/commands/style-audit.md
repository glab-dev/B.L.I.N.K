Perform a comprehensive UI and CSS consistency audit.

## Instructions

Scan the full codebase for styling inconsistencies, unused CSS, and accessibility issues.

### 1. Unused CSS Rules

- Scan all CSS rules in the `<style>` block
- For each class/id selector, check if it's actually used in the HTML or referenced in JS
- Report unused rules with line numbers

### 2. Font Consistency

The theme fonts are:
- **Bangers** — headers, titles
- **Roboto Condensed** — body text, form inputs, data displays, nav labels

Note: Permanent Marker is loaded via Google Fonts CDN but not used anywhere. It should be flagged for removal.

Check for:
- Any hardcoded font-family that doesn't use one of these three
- Elements using system fonts (Arial, Helvetica, sans-serif) where a theme font should be used
- Inconsistent font-weight usage

### 3. Color Palette

Identify the color palette used across the CSS:
- List all unique color values (#hex, rgb, rgba, named colors)
- Flag any colors that appear only once (potential inconsistencies)
- Check that similar shades are using the same value (not slightly different hex codes)
- Verify the comic-book aesthetic is consistent (dark backgrounds, bright accents, black outlines)

### 4. Responsive Breakpoints

- List all `@media` queries
- Verify they use consistent breakpoints (primary: 768px)
- Flag any one-off breakpoints that differ from the pattern
- Check for missing responsive handling on new elements

### 5. Inline Styles

Search for inline `style=` attributes in the HTML and `element.style.` assignments in JS:
- Flag any that should be CSS classes instead
- Note: some dynamic styles (canvas positioning, calculated widths) are legitimately inline

### 6. Accessibility Basics

- **Tap targets**: check buttons and interactive elements have minimum 44x44px touch targets
- **Contrast**: verify text is readable against its background (especially on colored containers)
- **Labels**: check that form inputs have associated labels or aria-labels
- **Focus indicators**: verify keyboard-navigable elements have visible focus styles

### 7. Output

Group findings by category. For each issue:
- Line number
- Description
- Recommended fix

Include a summary with counts per category.
