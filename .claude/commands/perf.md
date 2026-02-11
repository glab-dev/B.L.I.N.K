Audit application performance and identify optimization opportunities.

## Instructions

If $ARGUMENTS specifies a focus area, limit the audit to that area. Otherwise, audit the full app.

### 1. Canvas Rendering

- Check for unnecessary re-renders — is `generateLayout()` or `drawCanvas()` called more often than needed?
- Look for missing `requestAnimationFrame` usage
- Check canvas context `save()`/`restore()` balance
- Identify heavy draw operations that could be cached or optimized
- Check if offscreen canvases are used where beneficial

### 2. DOM Operations

- Identify excessive `innerHTML` rebuilds (should use targeted updates)
- Look for missing document fragments when building multiple elements
- Check for layout thrashing (reading layout properties between writes)
- Find unnecessary DOM queries that could be cached

### 3. Event Listeners

- Find scroll, resize, or input listeners without throttle/debounce
- Identify mousemove/touchmove handlers that do heavy computation
- Check for listeners added in loops or repeatedly without cleanup

### 4. CDN Dependencies

- List all external `<script>` and `<link>` tags with estimated sizes
- Check if any CDN resources are loaded but unused
- Identify resources that could be deferred or loaded async

### 5. localStorage Operations

- Check for oversized stored data
- Identify unnecessary serialization (JSON.stringify on every change vs. batched)
- Look for synchronous reads in hot paths

### 6. Memory Leaks

- Canvas contexts created but never released
- Event listeners added but never removed (especially on dynamic elements)
- Arrays or objects that grow without bounds
- Closures capturing large scopes unnecessarily

### 7. Page Load

- Identify render-blocking scripts that could use `defer` or `async`
- Check if the initial paint is delayed by heavy computation
- Look for resources loaded before they're needed

## Output Format

| Severity | Location | Issue | Recommendation | Impact |
|----------|----------|-------|----------------|--------|
| High/Med/Low | file:line | Description | Fix | Est. improvement |

### Quick Wins
[List of easy fixes with high impact]

### Requires Investigation
[List of potential issues that need profiling to confirm]

## Example

`/perf` or `/perf canvas rendering`
