# Code Style Rules

## Architecture Constraints

- This project uses NO build system — plain `<script>` tags, global scope, no imports/exports
- Do NOT suggest adding TypeScript, React, webpack, vite, rollup, or any bundler
- All JS modules are loaded via `<script>` tags in `index.html`
- Script load order matters for parse-time code; runtime calls inside functions are safe regardless of order
- Global variables are declared inline in `index.html`

## Patterns to Follow

- Follow existing patterns in the codebase — match naming conventions, file structure, and code style
- Read code before modifying it — never propose changes to unread code
- Check all callers when changing a function signature
- Verify event listener cleanup when elements are removed
- Check canvas context save/restore balance

## Patterns to Avoid

- No over-engineering — no unnecessary abstractions, helpers, or wrappers
- No scope creep — don't add features beyond what was asked
- No commented-out code or `_unused` variables — clean deletions only
- No `eval()`, `Function()` constructor, or `document.write()`
- No npm packages for production code — CDN only for external dependencies
