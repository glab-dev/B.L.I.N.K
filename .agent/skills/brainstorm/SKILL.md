---
name: brainstorm
description: Analyze a feature idea with implementation approaches, pros/cons, complexity ratings, and scope estimation for the B.L.I.N.K. LED calculator app
---

# Brainstorm — Feature Ideation & Impact Analysis

## Goal

Produce a structured analysis of a feature idea with 2-3 implementation approaches, rated by complexity, risk, and user impact.

## Instructions

1. Read relevant existing code to understand what's already in place
2. Identify which files and functions relate to the proposed feature
3. Note existing patterns that should be followed
4. Generate 2-3 implementation approaches with different tradeoffs
5. For each approach: list affected files, reusable functions, and new code needed
6. Rate each: Complexity (Low/Med/High), Risk (Low/Med/High), User Impact (Low/Med/High)
7. Estimate scope: files to create/modify, test categories needing updates
8. Flag architecture decisions that need user input — don't assume
9. Recommend one approach with justification

## Output Format

### Feature: [name]

| # | Approach | Complexity | Risk | User Impact | Files |
|---|----------|-----------|------|-------------|-------|
| 1 | ... | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... | ... |

**Recommended:** Approach [#] — [justification]

**Affected Files:** [list with file:line]

**Open Questions:** [decisions needing user input]

## Constraints

- Do NOT suggest adding a build system (TypeScript, React, webpack, vite)
- Follow existing architecture patterns (plain JS, global scope, CDN deps)
- Consider the comic-book theme when proposing UI changes
