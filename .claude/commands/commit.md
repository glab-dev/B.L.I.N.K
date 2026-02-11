Commit the current changes with an automatic version bump.

## Instructions

1. **Read the current version** from `version.json` in the project root.

2. **Determine the bump type** from $ARGUMENTS:
   - If $ARGUMENTS contains "major", "minor", or "patch", use that bump type.
   - If $ARGUMENTS is empty or doesn't specify a bump type, default to "patch".
   - Any remaining text in $ARGUMENTS after the bump type is the commit description.

3. **Calculate the new version**:
   - Patch: 2.5.25 → 2.5.26
   - Minor: 2.5.25 → 2.6.0
   - Major: 2.5.25 → 3.0.0

4. **Update version in all locations**:
   - `version.json`: update the `"version"` field to the new version and `"updated"` field to today's date (YYYY-MM-DD format).
   - `index.html`: find the line `const APP_VERSION = '...';` (around line 3545) and update the version string.

5. **Generate the commit description**:
   - If a description was provided in $ARGUMENTS, use it.
   - Otherwise, auto-generate a concise description (8–15 words, present tense, starts with a verb) by reviewing `git diff --staged` after staging. Do NOT ask the user for a description — always generate it yourself.

6. **Stage and commit**:
   - Run `git add` for all modified files (be specific — list the files, don't use `git add .`).
   - Commit with the message format: `<description> (vX.X.X)`
   - Use a HEREDOC for the commit message.
   - Include the trailer: `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`

7. **Push to remote**: Run `git push` to push the commit to the remote repository.

8. **Show the result**: Display the commit hash and message using `git log -1`.

## Example

User runs: `/commit Fix cable count for dual-link SDI`

Result:
- version.json: 2.5.25 → 2.5.26, updated date set to today
- APP_VERSION in index.html: '2.5.25' → '2.5.26'
- Commit message: `Fix cable count for dual-link SDI (v2.5.26)`

User runs: `/commit minor Add gear list export feature`

Result:
- version.json: 2.5.25 → 2.6.0
- Commit message: `Add gear list export feature (v2.6.0)`
