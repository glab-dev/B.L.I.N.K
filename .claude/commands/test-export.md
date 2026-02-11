Perform a deep review and verification of all export and import pipelines.

## Instructions

Review the code for all export/import features. This is a code-level audit — read the actual implementation and identify issues.

### 1. PDF Export (`exportPDF()`)

Read the full `exportPDF()` function and related helpers. Check for:
- **Page assembly**: Are all visible screens included? Is the iteration correct?
- **Canvas rendering**: Are html2canvas options appropriate? Are there timing/race conditions?
- **Content completeness**: Does each PDF page include all expected data (specs, gear list, layouts)?
- **Layout overflow**: Could content overflow page boundaries? Are margins handled?
- **Font rendering**: Are web fonts available to html2canvas? Could text render as fallback fonts?
- **Large layouts**: What happens with very wide/tall panel configurations?
- **Error handling**: What happens if html2canvas fails? Is the user informed?

### 2. Resolume XML Export

Read the XML export function. Check for:
- **XML structure**: Does it match Resolume Arena 7 format?
- **Coordinate accuracy**: Are InputRect/OutputRect values correct?
- **Screen iteration**: Are non-visible screens correctly skipped?
- **XML escaping**: Are screen names and values properly escaped for XML?
- **Edge cases**: What happens with zero-dimension screens or special characters?

### 3. .ledconfig Save/Load

Read both `saveConfiguration()` and `loadConfiguration()`. Check for:
- **Roundtrip integrity**: Does save → load produce identical state?
- **Data completeness**: Are ALL state variables included? (screens, bumpers, deletedPanels, customCircuitAssignments, customDataLineAssignments, etc.)
- **Map/Set serialization**: Are Map and Set objects properly serialized and deserialized?
- **Version compatibility**: What happens loading a config from an older version?
- **Error handling**: What happens with corrupt or truncated files?
- **Missing fields**: Does load handle configs that lack newer fields gracefully?

### 4. Edge Cases to Verify

For all export types, consider:
- Empty project (no screens configured)
- Single screen with no panels (0x0)
- Very large configurations (100+ panels)
- Special characters in screen names (quotes, angle brackets, unicode)
- Screens with custom panels/processors that don't exist in the current library

### 5. Output

For each export type, report:
- Issues found (with line numbers and severity)
- Edge cases that would cause failures
- Recommended fixes

Include a summary of overall export pipeline health.
