---
name: review
description: Deep code review prioritized by severity — critical bugs, security issues, event listener leaks, calculation errors, mobile compatibility, and code style
---

# Review — Code Review

## Goal

Perform a thorough code review of recent changes or a specified section, prioritized by severity.

## Instructions

1. Determine the review target:
   - If a section/function is specified, review that area
   - Otherwise, review uncommitted changes (`git diff` + `git diff --staged`)
   - If no uncommitted changes, review the last commit (`git diff HEAD~1`)

2. Read ALL affected code — do not review code you haven't read

3. Check for issues in priority order:

   **Critical:** Broken functionality, data loss risks, security issues (XSS, eval, unsanitized input)

   **High:** Event listener leaks, memory leaks, undo/redo consistency (`saveState()` calls), calculation correctness

   **Medium:** Mobile/touch compatibility, desktop compatibility, pattern consistency, edge cases

   **Low:** Code style, dead code, performance

4. Output a prioritized checklist with severity, line numbers, description, and suggested fix

## Constraints

- Read before reviewing — never comment on code you haven't read
- Focus on real issues, not style nitpicks
- Consider the no-build-system architecture
- Check canvas context save/restore balance
- Verify event listener cleanup
