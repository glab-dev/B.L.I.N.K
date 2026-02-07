---
name: debug
description: Systematically debug an issue by tracing data flow backwards from symptom to root cause, then proposing a fix and checking for related cases
---

# Debug — Systematic Root Cause Analysis

## Goal

Find the root cause of a bug by tracing the data flow, not by guessing or patching symptoms.

## Instructions

1. **Reproduce** — Identify the exact user action that triggers the bug. What is expected vs actual?

2. **Trace** — Follow the data flow backwards from symptom to source:
   - Start at the visible symptom (wrong output, broken UI, error)
   - List every function in the chain as `file:line — function() — what it does`
   - Read ALL code in the chain — do not skip or guess
   - Continue until you find where the data first becomes wrong

3. **Root cause** — Identify the actual underlying problem:
   - What is the root cause (not the symptom)?
   - Why does this bug exist? (logic error, missing condition, race condition?)

4. **Fix** — Propose a fix at the root cause level:
   - Show the specific code change
   - Explain why it addresses the root cause, not just the symptom

5. **Related cases** — Check if the same pattern exists elsewhere:
   - Search for similar code that could have the same bug
   - List other locations that should be checked

6. **Verify** — List what to test after the fix:
   - Manual testing steps
   - Relevant Playwright test files
   - New tests to add

## Output Format

### Data Flow Trace
1. `file:line` — `function()` — [what happens]
2. `file:line` — `function()` — **BUG HERE** — [what goes wrong]

### Root Cause
[explanation]

### Fix
[code change]

### Related Cases
[similar patterns to check]

### Verification
[test checklist]

## Constraints

- Do NOT apply quick fixes that mask the problem
- Always trace the full data flow — don't skip steps
- Check for related cases — if it failed here, could it fail elsewhere?
