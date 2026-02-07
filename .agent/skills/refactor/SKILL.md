---
name: refactor
description: Perform safe incremental refactoring of the B.L.I.N.K. codebase, one function or section at a time, with smoke tests between each step and zero functional changes
---

# Refactor — Safe Incremental Refactoring

## Goal

Refactor code safely by making one small change at a time, verifying each step works before proceeding.

## Instructions

1. Read ALL affected code and all callers/dependents
2. Create a step-by-step plan where each step is independently testable
3. For each step:
   - Make ONE logical change
   - Run `python3 tests/smoke-test.py` — must pass
   - Verify the app still works
   - Only proceed if current step passes
4. If extracting to a new module:
   - Create the new `.js` file
   - Add `<script>` tag in `index.html` (respect load order)
   - Remove code from source
   - Run smoke test
5. After all steps: list manual testing needed

## Rules (Non-Negotiable)

- NEVER change multiple sections in one step
- NEVER trust bracket counting — rely on smoke test parse validation
- ALWAYS keep a working app at every step
- NEVER add features during a refactor — zero functional changes
- If anything breaks, STOP and revert — do NOT fix forward
- Clean deletions only — no commented-out code

## Constraints

- Follow existing architecture (plain JS, script tags, global scope)
- Do NOT suggest converting to modules, TypeScript, or a build system
- Preserve all existing behavior exactly
