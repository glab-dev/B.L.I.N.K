Run a comprehensive pre-deployment verification checklist.

## Instructions

Run each check in order and report pass/fail with details. Do NOT skip checks — run all of them.

### 1. Version Sync

- Read `version.json` and extract the version
- Read `index.html` and find `const APP_VERSION = '...'`
- Verify they match exactly
- **FAIL** if they don't match

### 2. Smoke Test

- Run `python3 tests/smoke-test.py`
- **FAIL** if any test fails (exit code non-zero)

### 3. Git Status

- Run `git status`
- **WARN** if there are uncommitted changes
- **WARN** if there are untracked files that look like they should be committed (new .js files, HTML changes)
- **PASS** if working tree is clean

### 4. Debug Artifacts

Search the codebase for leftover debugging code:
- `console.log(` — flag any that aren't in error handling paths
- `console.error(` — these are usually fine, but flag unusual ones
- `debugger` statements — **FAIL** if any exist
- `alert(` — **FAIL** if any exist outside of intentional user notifications

### 5. Security Quick-Check

- Search for `eval(` — **FAIL** if found
- Search for `Function(` constructor — **FAIL** if found
- Search for `document.write(` — **FAIL** if found
- Search for `innerHTML` with user-controlled input — **WARN** if found

### 6. Export Parity

- Verify that export functions (`exportPDF`, `exportPNG`, `saveConfiguration`, `exportResolumeXML`) exist and reference consistent data sources
- Check that multi-screen exports iterate `screens` consistently

### 7. Service Worker

- Check if `sw.js` exists and if its cache version has been updated recently
- **WARN** if the cache version is stale (hasn't changed in recent commits)

### 8. CDN Health

- List all external CDN URLs from `<script>` and `<link>` tags
- Verify they use HTTPS
- **WARN** for any missing Subresource Integrity (SRI) hashes

## Output Format

### Pre-Deploy Check Results

| # | Check | Status | Details |
|---|-------|--------|---------|
| 1 | Version Sync | PASS/FAIL | version.json: X.X.X, APP_VERSION: X.X.X |
| 2 | Smoke Test | PASS/FAIL | X tests passed, X failed |
| 3 | Git Status | PASS/WARN | Clean / X uncommitted changes |
| 4 | Debug Artifacts | PASS/WARN/FAIL | X console.logs, X debuggers |
| 5 | Security | PASS/WARN/FAIL | Details |
| 6 | Export Parity | PASS/WARN | Details |
| 7 | Service Worker | PASS/WARN | Cache version status |
| 8 | CDN Health | PASS/WARN | X URLs checked, X missing SRI |

### Overall: READY / NOT READY
[Summary of any failures or warnings that need attention]
