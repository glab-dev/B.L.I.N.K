Perform safe, incremental refactoring with verification between each step.

## Instructions

1. **Parse $ARGUMENTS** to identify what to refactor (function, section, module, pattern).

2. **Read ALL affected code** before making any changes:
   - The code to be refactored
   - All callers and dependents (search for function names, variable references)
   - Any related tests in `tests/playwright/`

3. **Create a step-by-step refactoring plan** where each step:
   - Makes exactly ONE logical change
   - Can be independently tested
   - Preserves ALL existing behavior — zero functional changes
   - Is small enough to easily revert if something breaks

4. **Execute each step** following this cycle:
   - Make the change
   - Run `python3 tests/smoke-test.py` — must pass with 0 failures
   - Verify the app still works (note what to check in browser)
   - Only proceed to the next step if the current step passes

5. **If extracting to a new module:**
   - Create the new `.js` file with the extracted code
   - Add the `<script>` tag in `index.html` (respect load order — runtime calls inside functions are safe regardless of order, but parse-time code depends on load order)
   - Remove the code from the source file
   - Run smoke test
   - Verify in browser

6. **After all steps complete:**
   - List what manual testing is needed
   - List which Playwright tests cover the refactored area
   - Confirm zero functional changes were made

## Rules (Non-Negotiable)

- NEVER change multiple sections in one step
- NEVER trust bracket counting alone — the smoke test's Node.js parse validation is the real check
- ALWAYS keep a working app at every step
- NEVER add features or "improvements" during a refactor
- If anything breaks, STOP and revert before continuing — do NOT try to fix forward
- Clean deletions only — no commented-out code, no `_unused` variables, no `// removed` comments

## Output Format

### Refactoring Plan: [what's being refactored]

#### Step 1: [description]
- Change: [what specifically changes]
- Verify: [what to check]
- Smoke test: Pass/Fail

#### Step 2: [description]
...

#### Post-Refactoring Checklist
- [ ] All smoke tests pass
- [ ] No functional changes
- [ ] Manual verification: [list]
- [ ] Playwright coverage: [list relevant test files]

## Example

`/refactor Extract modal logic from index.html into core/modals.js`
