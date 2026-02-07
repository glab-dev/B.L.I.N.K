---
name: perf
description: Audit performance of the B.L.I.N.K. app including canvas rendering, DOM operations, event listeners, CDN dependencies, localStorage usage, and memory leaks
---

# Perf — Performance Audit

## Goal

Identify performance bottlenecks and optimization opportunities across the app.

## Instructions

Check each area:

1. **Canvas rendering** — unnecessary re-renders, missing requestAnimationFrame, heavy draw calls, context save/restore
2. **DOM operations** — excessive innerHTML rebuilds, layout thrashing, missing document fragments
3. **Event listeners** — scroll/resize/input without throttle/debounce, mousemove handlers doing heavy work
4. **CDN dependencies** — external scripts/styles sizes, unused CDN resources, defer/async opportunities
5. **localStorage** — oversized data, unnecessary serialization on every change
6. **Memory leaks** — canvas contexts not released, orphaned listeners, growing arrays
7. **Page load** — render-blocking scripts, resources loaded before needed

## Output Format

| Severity | Location | Issue | Recommendation | Impact |
|----------|----------|-------|----------------|--------|
| High/Med/Low | file:line | Description | Fix | Est. improvement |

### Quick Wins
[Easy fixes with high impact]

### Requires Investigation
[Issues needing profiling to confirm]

## Constraints

- Focus on measurable improvements, not theoretical optimizations
- Consider the no-build-system constraint — suggestions must work with plain script tags
- Don't suggest framework migrations as performance solutions
