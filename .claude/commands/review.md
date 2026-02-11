Perform a deep code review of recent changes or a specified section.

## Instructions

1. **Determine the review target**:
   - If $ARGUMENTS specifies a section name, function name, or line range, review that area.
   - If $ARGUMENTS is empty, review the most recent uncommitted changes (`git diff` + `git diff --staged`).
   - If there are no uncommitted changes, review the last commit (`git diff HEAD~1`).

2. **Read all affected code** — do not review code you haven't read.

3. **Check for these issues** (in priority order):

   **Critical:**
   - Broken functionality — does the change do what it's supposed to?
   - Data loss risks — could any state, localStorage, or screen data be lost?
   - Security issues — XSS, unsanitized input, eval usage

   **High:**
   - Event listener leaks — are listeners added but never removed?
   - Memory leaks — canvas contexts not cleaned up, orphaned references
   - Undo/redo consistency — does `saveState()` get called before mutations?
   - Calculation correctness — off-by-one errors, division by zero, NaN propagation

   **Medium:**
   - Mobile/touch compatibility — does it work with touch events, not just mouse?
   - Desktop compatibility — keyboard shortcuts, right-click menus still work?
   - Pattern consistency — does new code follow existing codebase patterns?
   - Edge cases — empty screens, zero-size panels, special characters in names

   **Low:**
   - Code style — naming conventions, indentation, section header format
   - Dead code — unreachable branches, unused variables
   - Performance — unnecessary re-renders, redundant calculations

4. **Pattern search** — When you find a bug, ALWAYS search for the same class of bug across the entire codebase:
   - If a function is missing a sync call, grep for ALL similar functions that might need the same sync
   - If an event listener is missing cleanup, check ALL event listeners in the same file/module
   - If a code path doesn't handle an edge case, check ALL parallel code paths
   - Use Grep to find all instances — do NOT rely on reading just the diff
   - This is the most commonly missed step: finding one bug means there are likely more of the same kind

5. **Output a prioritized checklist** with:
   - Severity (Critical / High / Medium / Low)
   - Line number(s) in the affected file
   - Description of the issue
   - Suggested fix

6. If no issues are found, confirm the code looks good and explain what you checked.
