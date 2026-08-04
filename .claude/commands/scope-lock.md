Declare the exact scope of a coding task before writing any code.

## Instructions

Use this at the start of any coding task to lock scope before touching a single file.

1. **Read the task description** from $ARGUMENTS — understand what is being asked.

2. **Identify the minimal set of changes** required to complete ONLY what was asked:
   - Which specific files will be modified (no others)
   - Which specific functions/lines will change
   - What will NOT be touched even if it looks related

3. **State your scope declaration** in this format:

---

### Scope Lock

**Task:** [one sentence description of what was asked]

**Files I will touch:**
- `path/to/file.js` — [specific function or line range, and why]

**Files I will NOT touch** (even if they look related):
- `path/to/other.js` — [why it's out of scope]

**What I will NOT do:**
- [ ] Rename anything
- [ ] Clean up surrounding code
- [ ] Add error handling not explicitly asked for
- [ ] Refactor patterns I notice along the way
- [ ] Change code style or formatting

---

4. **Wait for confirmation** before writing any code. If the scope looks wrong to the user, adjust before starting.

## Example

`/scope-lock Fix the panel count being off by one when bumpers are enabled`
