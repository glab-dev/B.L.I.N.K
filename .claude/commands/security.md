Perform a comprehensive security audit of the entire codebase.

## Instructions

Scan the full codebase (all files, not just recent changes) for security vulnerabilities. This is an on-demand deep audit.

### 1. XSS & Injection Vectors

Search for and audit every instance of:
- `innerHTML` — is user input ever inserted? Is it properly sanitized?
- `insertAdjacentHTML` — same checks
- `eval()`, `Function()` constructor — should never be used
- `document.write()` — should never be used
- Template literals inserted into HTML — check for unescaped user data
- `outerHTML` assignments

For each instance: report the line number, whether user input can reach it, and severity.

### 2. User Input Paths

Trace every path where external data enters the app:
- **File imports** (.ledconfig files via FileReader) — is the JSON validated before applying? Are unexpected properties handled?
- **Custom panel/processor names** — are they sanitized before display in the DOM?
- **URL parameters** (if any) — are they used safely?
- **Clipboard/paste events** (if any) — are they validated?

### 3. localStorage Security

For each localStorage key (`ledcalc_custom_panels`, `ledcalc_custom_processors`, `ledcalc_combined_positions`, `dismissedUpdateVersion`):
- Is data validated when read back? (JSON.parse can throw on malformed data)
- Are unexpected types/structures handled gracefully?
- Could a malicious localStorage value cause XSS or break the app?

### 4. CDN & External Resources

Check all `<script>` and `<link>` tags loading external resources:
- Do they have Subresource Integrity (SRI) hashes?
- Are they loaded over HTTPS?
- Report any missing SRI hashes with the recommended fix.

### 5. Export Security

Review all export functions:
- **PDF export** (`exportPDF()`) — can user data in screen names or panel specs inject content?
- **Resolume XML export** — are values properly XML-escaped?
- **.ledconfig export** — is the JSON structure safe to re-import?

### 6. Prototype Pollution

Check for:
- Object spread/assign from user-controlled data without safeguards
- Property access using bracket notation with user-controlled keys
- `__proto__`, `constructor`, `prototype` not blocked in object operations

### 7. Output

Present findings as a table:

| Severity | Location | Issue | Recommendation |
|----------|----------|-------|----------------|
| Critical/High/Medium/Low | file:line | Description | Fix |

Group by severity (Critical first). Include a summary count at the end.
