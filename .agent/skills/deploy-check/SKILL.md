---
name: deploy-check
description: Run a comprehensive pre-deployment verification checklist including version sync, smoke tests, security checks, and CDN health
---

# Deploy Check — Pre-Deployment Verification

## Goal

Run a comprehensive checklist to verify the app is ready for deployment. Report pass/fail for each check.

## Instructions

Run ALL checks in order:

1. **Version Sync** — Verify `version.json` version matches `index.html` APP_VERSION
2. **Smoke Test** — Run `python3 tests/smoke-test.py` (must pass with 0 failures)
3. **Git Status** — Check for uncommitted changes or untracked files
4. **Debug Artifacts** — Search for leftover `console.log`, `debugger`, `alert()` statements
5. **Security** — Check for `eval()`, `Function()` constructor, `document.write()`
6. **Export Parity** — Verify export functions reference consistent data sources
7. **Service Worker** — Check if `sw.js` cache version was updated
8. **CDN Health** — Verify all CDN URLs use HTTPS, check for SRI hashes

## Output Format

| # | Check | Status | Details |
|---|-------|--------|---------|
| 1 | Version Sync | PASS/FAIL | ... |
| 2 | Smoke Test | PASS/FAIL | ... |
| ... | ... | ... | ... |

### Overall: READY / NOT READY

## Constraints

- Do NOT skip any checks
- Report ALL findings, even minor warnings
- A single FAIL means NOT READY
