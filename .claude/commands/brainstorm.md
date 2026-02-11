Analyze a feature idea with implementation approaches, impact analysis, and scope estimation.

## Instructions

1. **Parse the request** from $ARGUMENTS — extract the feature idea or concept to analyze.

2. **Read relevant existing code** to understand what's already in place:
   - Identify which files and functions relate to the proposed feature
   - Note existing patterns that should be followed
   - Check for any existing partial implementations

3. **Generate 2-3 implementation approaches** with different tradeoffs. For each approach:
   - Describe the approach in 2-3 sentences
   - List specific files that would be created or modified
   - Identify existing functions/utilities that can be reused

4. **Rate each approach** on:

   | Criteria | Rating |
   |----------|--------|
   | Complexity | Low / Medium / High |
   | Risk | Low / Medium / High |
   | User impact | Low / Medium / High |
   | Files affected | Count |

5. **Estimate scope** for the recommended approach:
   - Number of files to create or modify
   - Which test categories need new tests (features, interactions, exports, etc.)
   - Which existing tests might break or need updates

6. **Flag architecture decisions** that need user input — don't assume, list the open questions.

7. **Recommend one approach** with a brief justification.

## Output Format

### Feature: [name]

#### Approaches

| # | Approach | Complexity | Risk | User Impact | Files |
|---|----------|-----------|------|-------------|-------|
| 1 | ... | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... | ... |

#### Recommended: Approach [#]
[Justification]

#### Affected Files
- [file:line] — [what changes]

#### Open Questions
- [decisions that need user input]

## Example

`/brainstorm Add cloud project saving with Supabase`
