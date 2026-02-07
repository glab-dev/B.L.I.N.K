---
name: security
description: Comprehensive security audit scanning for XSS, injection vectors, localStorage vulnerabilities, CDN integrity, export security, and prototype pollution
---

# Security — Full Security Audit

## Goal

Scan the entire codebase for security vulnerabilities across all attack surfaces.

## Instructions

### 1. XSS & Injection Vectors
Search for and audit: `innerHTML`, `insertAdjacentHTML`, `eval()`, `Function()`, `document.write()`, template literals in HTML, `outerHTML`. For each: report line number, whether user input can reach it, severity.

### 2. User Input Paths
Trace every path where external data enters:
- File imports (.ledconfig via FileReader) — JSON validation
- Custom panel/processor names — sanitization before DOM display
- URL parameters (if any)
- Clipboard/paste events (if any)

### 3. localStorage Security
For each key (`ledcalc_custom_panels`, `ledcalc_custom_processors`, `ledcalc_combined_positions`, `dismissedUpdateVersion`): validation on read, malformed JSON handling, XSS potential.

### 4. CDN & External Resources
Check all `<script>` and `<link>` tags: SRI hash presence, HTTPS usage. Report missing SRI hashes.

### 5. Export Security
- PDF export — user data injection potential
- Resolume XML — XML escaping
- .ledconfig — safe roundtrip

### 6. Prototype Pollution
- Object spread/assign from user data
- Bracket notation with user-controlled keys

## Output Format

| Severity | Location | Issue | Recommendation |
|----------|----------|-------|----------------|
| Critical/High/Med/Low | file:line | Description | Fix |

## Constraints

- Scan the FULL codebase, not just recent changes
- Report ALL instances, even if they seem safe — let the user decide
- Group by severity (Critical first)
