# Inventory Codes Settings Modal — Implementation Plan

## Goal
Add a settings modal where users can assign item codes and descriptions to gear list items. When exporting, these populate a tab-delimited `.txt` file (same format as `Gear List Inventory.txt`).

---

## Files to Create

### 1. `config/inventory-codes.js` (~180 lines)

**Master catalog + storage layer.** Defines:

- **`INVENTORY_SLOTS`** — array of `{ key, label, category }` objects covering all ~95 gear item types, organized by category:
  - Processors (5), Dist Boxes (2), Panels (8), Bumpers per panel (~18), Rigging (4), Ground Support (7), Floor Frames (4), Data Cables (Cat6A 12 lengths + jumpers + couplers), Power Cables (soca + true1 + jumpers), Signal Cables (SDI 12G + 3G + HDMI + fiber), Utility (5)

- **Storage functions:**
  - `loadInventoryCodes()` — reads from `ledcalc_inventory_codes` localStorage key
  - `saveInventoryCodes()` — writes to localStorage
  - `getInventoryCode(slotKey)` — returns `{ code, desc }` or `{ code: '', desc: '' }`
  - `setInventoryCode(slotKey, code, desc)` — sets and saves
  - `exportInventoryCodes()` — downloads as `.json` file
  - `importInventoryCodes(jsonString)` — parses, validates, saves

- **Slot key convention:** `{category}_{identifier}` — e.g., `proc_brompton_sx40`, `cat6a_50ft`, `bumper_1w_cb5_mkii`

- All codes and descriptions **start blank** (no defaults)

### 2. `config/inventory-modal.js` (~250 lines)

**Modal UI logic.** Defines:

- `openInventoryCodesModal()` — dynamically builds modal body:
  - Search input at top (filters items by label as user types)
  - Collapsible accordion sections per category (collapsed by default)
  - Each item row: `[Label] [Code input] [Description input]`
- `closeInventoryCodesModal()`
- `saveInventoryCodesFromModal()` — reads all inputs, saves to localStorage
- `filterInventoryItems(searchText)` — shows/hides rows by label match
- `toggleInventoryCategory(key)` — accordion expand/collapse
- `importInventoryCodesFromFile()` — triggers hidden file input
- `handleInventoryCodesImport(event)` — processes imported JSON

Follows same patterns as `openManageCustomModal()` in `specs/custom-panels.js`.

---

## Files to Modify

### 3. `index.html`

- **Add modal HTML** (~line 234, after existing modals): `modal-overlay` / `modal-dialog` with `max-width: 600px` (wider for label + code + desc columns). Footer: Import, Export, Cancel, Save.
- **Add menu button** (~line 360, Custom Items section): `"Inventory Codes"` button with `modalOpenedFromMenu = true; openInventoryCodesModal(); closeMobileMenu();` pattern.
- **Add hidden file input** for import: `<input type="file" id="importInventoryCodesInput" accept=".json" ...>`
- **Add 2 script tags** before `export/pdf.js` (~line 1251):
  ```html
  <script src="config/inventory-codes.js"></script>
  <script src="config/inventory-modal.js"></script>
  ```

### 4. `export/pdf.js` — `buildGearInventoryContent()` (lines 245-434)

**Replace all hardcoded lookup tables** with `getInventoryCode()` calls:

| Old pattern | New pattern |
|-------------|-------------|
| `procCodes['Brompton_SX40']` | `getInventoryCode('proc_brompton_sx40')` |
| `panelCodes['CB5_MKII']` | `getInventoryCode('panel_cb5_mkii')` |
| `bumperCodes[pt].b1w` | `getInventoryCode('bumper_1w_' + pt.toLowerCase())` |
| `cat6Map[50]` | `getInventoryCode('cat6a_50ft')` |
| `sdi12GMap[100]` | `getInventoryCode('sdi12g_100ft')` |
| `fiberMap[500]` | `getInventoryCode('fiber_500ft')` |
| Inline `'CP4FIXED'` | `getInventoryCode('plate_4way_fixed')` |

**Fallback descriptions preserved** — when `desc` is blank, fall back to existing generated label (e.g., `info.desc || "CAT6A EtherCON Cable " + len + "'"`).

**Delete** the 7 hardcoded lookup tables (`procCodes`, `panelCodes`, `bumperCodes`, `baseCodes`, `cat6Map`, `sdi12GMap`, `fiberMap`).

### 5. `styles.css`

Add ~50 lines for inventory modal:
- `.inventory-search` — full-width search input
- `.inventory-category` — accordion header (Bangers font, colored, toggle arrow)
- `.inventory-items` — collapsible content
- `.inventory-item-row` — 3-column grid: label + code + description
- `.inventory-item-code`, `.inventory-item-desc` — compact inputs (13px, Roboto Condensed)
- Matches comic-book theme (black borders, box shadows)

### 6. `version.json` + `index.html` APP_VERSION — increment patch

---

## Implementation Order

1. Create `config/inventory-codes.js` (data layer)
2. Add styles to `styles.css`
3. Create `config/inventory-modal.js` (UI logic)
4. Modify `index.html` (modal HTML, menu button, file input, script tags)
5. Modify `export/pdf.js` (replace hardcoded tables)
6. Version bump + smoke test

---

## Verification

1. **Smoke test** passes with 0 failures
2. **Browser testing:**
   - Modal opens from hamburger menu → Inventory Codes
   - Accordion sections expand/collapse, search filters items
   - Save persists to localStorage, survives reload
   - Export/Import `.json` works for sharing code mappings
   - `.txt` gear list export uses saved codes and descriptions
   - Blank codes export with fallback descriptions
   - Modal matches comic-book theme on desktop and mobile
