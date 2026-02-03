# Cabling Features Test Checklist

## Overview
Comprehensive test checklist for the cabling calculation system in the LED Wall Calculator.

---

## Input Validation Tests

### Basic Inputs
- [ ] Wall to Floor: accepts 0, integers, decimals
- [ ] Distro to Wall: accepts 0, integers, decimals
- [ ] Proc to Wall: accepts 0, integers, decimals
- [ ] Server to Proc: accepts 0, integers, decimals
- [ ] Cable Pick: accepts 0, integers, decimals
- [ ] All inputs: persist to localStorage
- [ ] All inputs: saved in screen data
- [ ] All inputs: included in .ledconfig export/import

### Toggle Controls
- [ ] Cable Drop: Behind (default)
- [ ] Cable Drop: SR (stage right)
- [ ] Cable Drop: SL (stage left)
- [ ] Dist Box on Wall: Off (default)
- [ ] Dist Box on Wall: On (changes routing)

---

## Calculation Tests

### SOCA (Power) Cables
- [ ] Count matches number of SOCA splays needed
- [ ] Each cable length calculated correctly based on:
  - Wall height (vertical distance)
  - Wall to floor distance
  - Distro to wall distance
  - Cable pick allowance
  - Drop position (SR/SL adds horizontal distance)
- [ ] Cables rounded up to standard lengths: 25, 50, 75, 100, 150, 200, 250, 300
- [ ] Detail section shows actual vs rounded lengths

### Data Cables (Cat6/Fiber)
- [ ] Count matches number of data lines (with redundancy if enabled)
- [ ] Standard routing (no dist box on wall):
  - Cables run from processor to each data line entry point
  - Full wall height included
  - Drop position affects horizontal distance
- [ ] Dist box on wall routing:
  - Data cables from dist box to each entry point (shorter)
  - Processor-to-dist-box cables calculated separately
  - Uses fiber if distance > 200'
- [ ] Knockout panels:
  - Bridge cables calculated for non-adjacent panels in same data line
  - Manhattan distance with BFS pathfinding around knockouts
- [ ] Detail section shows per-line breakdown

### Processor-to-Distribution-Box Cables
- [ ] Only appear when dist box on wall is enabled
- [ ] 2 cables per dist box (main + backup)
- [ ] Type: Cat6A if ≤200', Fiber if >200'
- [ ] Length: processor distance + wall to floor + wall height + cable pick
- [ ] Fiber requirement warning shown in gear list

### Knockout Bridge Cables
- [ ] Detected when data line jumps across knockout gaps
- [ ] Manhattan distance calculated between non-adjacent panels
- [ ] Detail shows from/to panel coordinates
- [ ] Rounded to standard lengths

---

## Integration Tests

### Gear List Display
- [ ] SOCA cables grouped by length
- [ ] Data cables (Cat6) grouped by length
- [ ] Processor-to-dist-box cables shown with type and length
- [ ] Knockout bridge cables listed separately
- [ ] Detail dropdown shows actual calculations
- [ ] Spares section includes relevant cable types

### PDF Export
- [ ] All cable calculations appear in PDF gear list
- [ ] Formatting matches screen display
- [ ] Detail sections expandable in PDF
- [ ] Multi-screen: each screen has correct cabling

### Email Export
- [ ] Plain text format includes all cable counts
- [ ] Lengths formatted correctly (e.g., "2x 100' Cat6")
- [ ] Detail sections omitted (summary only)
- [ ] No encoding issues with units (')
- [ ] Line breaks work properly on mobile devices

### Config Save/Load
- [ ] All cabling inputs saved to .ledconfig
- [ ] Cable drop position saved
- [ ] Dist box on wall toggle saved
- [ ] Loaded config restores all cabling settings
- [ ] Recalculation after load produces same results

---

## Edge Cases

### Panel Configurations
- [ ] 1x1 panel (minimal)
- [ ] Large array (20x20+)
- [ ] Non-square aspect ratios (16:9, 21:9)
- [ ] CB5 with half row (affects wall height)
- [ ] Panels with knockouts (affects data line routing)
- [ ] Custom data line assignments

### Extreme Values
- [ ] All cabling inputs = 0
- [ ] Very large distances (500'+)
- [ ] Cable pick only (other distances = 0)
- [ ] SR/SL drop with narrow wall (adds significant distance)
- [ ] Dist box on wall with no dist box count (edge case)

### Data Configurations
- [ ] Redundancy on/off (doubles data cable count)
- [ ] Processor redundancy (affects processor-to-dist-box count)
- [ ] All_top data start direction
- [ ] All_bottom data start direction
- [ ] Serpentine top start
- [ ] Serpentine bottom start
- [ ] Custom data line assignments with knockouts

### Multi-Screen Scenarios
- [ ] Multiple screens with different cabling inputs
- [ ] Gear list toggles: select/deselect screens updates totals
- [ ] Shared processor across screens (cabling for first screen only)
- [ ] Different cable drop positions per screen

---

## Performance Tests
- [ ] Large arrays (30x30) calculate cables in < 1 second
- [ ] Switching screens updates cabling immediately
- [ ] Real-time input updates don't lag (debouncing if needed)

---

## Visual/UI Tests
- [ ] Cabling inputs section visible in gear tab
- [ ] Inputs aligned properly on mobile
- [ ] Toggle buttons responsive (cable drop, dist box)
- [ ] Cable layout diagram (if implemented) renders correctly
- [ ] Gear list cable sections formatted with comic theme
- [ ] Detail dropdowns clickable and styled

---

## Regression Tests
- [ ] Changes to panel type recalculate cables
- [ ] Changes to panel dimensions recalculate cables
- [ ] Changes to processor type affect dist box requirements
- [ ] Undo/redo preserves cabling inputs
- [ ] Changing tabs doesn't lose cabling inputs

---

## Testing Notes

### Standard Cable Lengths
The system rounds up to these standard lengths: **25, 50, 75, 100, 150, 200, 250, 300** feet.
For cables longer than 300', it uses ceiling(length/50)*50.

### Fiber Threshold
Cables exceeding **200 feet** automatically upgrade from Cat6A to Fiber.

### BFS Pathfinding
When knockout panels create gaps in data lines, the system uses breadth-first search to find the shortest Manhattan distance around obstacles.

### Files Involved
- **nav/gear.js** - Main cabling calculation engine
- **core/gear-data.js** - Shared data builder (gear tab, PDF, email)
- **core/state.js** - Cabling state management
- **config/save-load.js** - Cabling data persistence
- **config/dom-setup.js** - Event listeners for cabling inputs
- **export/pdf.js** - Email export (uses gear-data.js)

---

## Last Updated
2026-02-03
