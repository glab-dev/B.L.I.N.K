Systematically debug an issue using root cause analysis.

## Instructions

1. **Parse the bug report** from $ARGUMENTS — extract the symptom, expected behavior, and any context provided.

2. **Reproduce** — Identify the exact user action that triggers the bug:
   - What input or interaction causes it?
   - What is the expected behavior vs. actual behavior?
   - Is it consistent or intermittent?

3. **Trace** — Follow the data flow backwards from symptom to source:
   - Start at the visible symptom (wrong output, broken UI, error)
   - Trace through each function in the chain, listing every step as `file:line — function() — what it does`
   - Continue until you reach the point where the data first becomes wrong
   - Read ALL code in the chain — do not skip or guess

4. **Root cause** — Identify the actual underlying problem:
   - What is the root cause (not the symptom)?
   - Why does this bug exist? (logic error, missing condition, wrong assumption, race condition?)
   - Is it a regression or has it always been broken?

5. **Fix** — Propose a fix at the root cause level:
   - Show the specific code change needed
   - Explain why this fix addresses the root cause, not just the symptom
   - Note any side effects the fix might have

6. **Related cases** — Check if the same pattern exists elsewhere:
   - Search for similar code patterns that could have the same bug
   - List any other locations that should be checked or fixed

7. **Verify** — List what to test after the fix:
   - Manual testing steps
   - Which Playwright test files cover this area
   - Any new test cases that should be added

## Output Format

### Bug: [symptom summary]

#### Data Flow Trace
1. `file:line` — `function()` — [what happens]
2. `file:line` — `function()` — [what happens]
3. `file:line` — `function()` — **BUG HERE** — [what goes wrong]

#### Root Cause
[explanation]

#### Fix
[code change with explanation]

#### Related Cases
- `file:line` — [same pattern, needs checking]

#### Verification
- [ ] [manual test step]
- [ ] [Playwright test to run]
- [ ] [new test to write]

## Example

`/debug Power calculation wrong for 3-phase 208V with ROE CB5`
