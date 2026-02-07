# Git Conventions

## Commit Format

- Message: `<Description in present tense> (vX.X.X)`
- Description: concise (8–15 words), starts with a verb
- Example: `Fix cable count for dual-link SDI configurations (v2.5.26)`

## Version Bumping

Every commit that changes app behavior must bump the version in TWO places:
1. `version.json` → `"version"` field + `"updated"` date (YYYY-MM-DD)
2. `index.html` → `const APP_VERSION = 'X.X.X';` (around line 1257)

Default: patch bump (2.5.25 → 2.5.26). Use minor for new features, major for breaking changes.

## Branch Naming

```
feature/<short-description>    — new features
fix/<short-description>        — bug fixes
refactor/<short-description>   — code restructuring
test/<short-description>       — adding/updating tests
```

## When to Branch

- **Direct to main:** Typo fixes, single-file CSS tweaks, hotfixes, version bumps
- **Feature branch + PR:** New features, 3+ file changes, risky refactors

## What NOT to Commit

- `node_modules/`
- `playwright-report/`
- `test-results/`
- `.env` or `.env.local`
- `.claude/` directory (local IDE settings)
