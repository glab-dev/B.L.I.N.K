---
name: changelog
description: Generate a user-facing changelog from recent git commits, grouped by type and rewritten in non-technical language
---

# Changelog — User-Facing Release Notes

## Goal

Generate a clean, user-friendly changelog from git history that can be used in "What's New" sections or release notes.

## Instructions

1. Read git log for the specified range (default: last 20 commits)
2. Group commits by type:
   - **New Features** — new functionality added
   - **Improvements** — enhancements to existing features
   - **Bug Fixes** — corrections to broken behavior
   - **Internal** — skip these (refactors, test additions, CI changes)
3. Rewrite each commit message in user-friendly language:
   - Remove version numbers (vX.X.X)
   - Remove technical jargon
   - Use present tense, user-focused language
   - Skip commits with no user-visible impact
4. Format as a numbered list with category headers

## Output Format

### What's New (vX.X.X — vX.X.X)

#### New Features
- [user-friendly description]

#### Improvements
- [user-friendly description]

#### Bug Fixes
- [user-friendly description]

## Constraints

- Only include changes visible to users
- Use plain language, no technical terms
- Keep descriptions concise (one sentence each)
