Generate a user-facing changelog from recent git commits.

## Instructions

1. **Determine the range** from $ARGUMENTS:
   - If a version is specified (e.g., `v2.8.10`), show changes since that version tag or commit
   - If a count is specified (e.g., `last 10 commits`), use that many commits
   - If $ARGUMENTS is empty, default to the last 20 commits

2. **Read the git log** for the specified range:
   - Run `git log --oneline` for the range
   - Read each commit message

3. **Group commits by type:**
   - **New Features** — commits that add new functionality
   - **Improvements** — enhancements to existing features
   - **Bug Fixes** — corrections to broken behavior
   - **Internal** — refactors, test additions, CI changes (skip these in the output)

4. **Rewrite each commit message** in user-friendly language:
   - Remove version numbers `(vX.X.X)` from descriptions
   - Remove technical jargon (e.g., "refactor" → describe the user-visible effect)
   - Use present tense, user-focused language
   - Skip commits that have no user-visible impact (test additions, internal refactors, docs)

5. **Format the output** as a clean changelog:

## Output Format

### What's New (vX.X.X — vX.X.X)

#### New Features
- [user-friendly description]

#### Improvements
- [user-friendly description]

#### Bug Fixes
- [user-friendly description]

---

If there are very few changes, combine into a single list without category headers.

## Example

`/changelog v2.8.10` or `/changelog last 10 commits`
