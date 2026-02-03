# Implementation Plan: Phase 1 & 2
## Custom Panels & Processors

---

## Phase 1: Custom Panel Refinement

### 🎯 Goal
Make custom panels handle all real-world variations: different shapes, structure types, cable configurations, and regional differences.

---

### 1.1 Panel Shape & Dimensions

#### Current State
- Single width/height input (assumes rectangular)
- CB5 has "Half Panel Row" toggle for rectangular shapes

#### New Implementation

**Add Shape Type Field:**
```javascript
// In custom panel modal
shapeType: {
  type: 'dropdown',
  options: [
    'rectangular',    // Standard (e.g., 500mm × 500mm or 500mm × 1000mm)
    'square',         // Equal width/height
    'triangular',     // Special layout (e.g., creative designs)
    'irregular'       // Custom shapes (user provides notes)
  ],
  default: 'rectangular'
}
```

**Shape-Specific Fields:**
- **Rectangular/Square:** Width, Height (existing)
- **Triangular:** Base, Height, Apex position
- **Irregular:** Width, Height, Notes field (freeform text describing shape)

**Layout Impact:**
- Rectangular: Normal grid layout
- Triangular: Special rendering (show warning: "Manual layout planning required")
- Irregular: Show warning in PDF: "Custom shape - verify layout on-site"

**Implementation Files:**
- `specs/custom-panels.js` - Add shape type field
- `layouts/standard.js` - Handle shape rendering
- `export/pdf.js` - Add shape notes to PDF

---

### 1.2 Structure Hardware Selection

#### Current State
- Assumes all panels use bumpers
- Bumper weights are customizable
- No distinction between hanging/ground/floor

#### New Implementation

**Add Structure Type Field:**
```javascript
structureHardware: {
  type: 'dropdown',
  options: [
    'hanging_bumpers',      // Top-hung with bumpers
    'ground_bumpers',       // Ground support with bumpers
    'floor_frames',         // Floor-standing frames
    'no_structure'          // Panel has integrated mounting
  ],
  default: 'hanging_bumpers'
}
```

**Hardware-Specific Fields:**

**If `hanging_bumpers`:**
- Bumper 1W weight (lbs/kg)
- Bumper 2W weight (lbs/kg)
- Bumper 4W weight (lbs/kg) - if applicable
- **Additional gear:**
  - Shackles per bumper (qty)
  - Cheeseeyes per panel (qty)
  - Rear truss required (yes/no)
  - Connection plates type (2W, 4W)

**If `ground_bumpers`:**
- Base bumper weight (lbs/kg)
- **Additional gear:**
  - Base truss required (yes/no)
  - Sandbags per section (qty)
  - Base plates per bumper (qty)
  - Swivel cheeses (qty)

**If `floor_frames`:**
- Frame 1×1 weight (lbs/kg)
- Frame 2×1 weight (lbs/kg)
- Frame 2×2 weight (lbs/kg)
- Frame 3×2 weight (lbs/kg)
- **Additional gear:**
  - Frame connectors per panel (qty)
  - Leveling feet (yes/no)

**If `no_structure`:**
- No additional gear needed
- Show note: "Panel has integrated mounting system"

**Gear List Impact:**
```javascript
// In buildGearListData()
if (panel.structureHardware === 'hanging_bumpers') {
  gear.push({
    category: 'Rigging Hardware',
    items: [
      `${bumperCount}x 1W Bumpers`,
      `${bumperCount * shacklesPerBumper}x Shackles`,
      `${panelCount * cheeseeyesPerPanel}x Cheeseeyes`,
      // ... connection plates, rear truss, etc.
    ]
  });
} else if (panel.structureHardware === 'ground_bumpers') {
  gear.push({
    category: 'Ground Support',
    items: [
      `${bumperCount}x Base Bumpers`,
      `${sandbagCount}x Sandbags`,
      // ... base truss, plates, etc.
    ]
  });
} else if (panel.structureHardware === 'floor_frames') {
  gear.push({
    category: 'Floor Hardware',
    items: [
      `${frame1x1}x Floor Frame 1×1`,
      `${frame2x1}x Floor Frame 2×1`,
      // ... frame connectors, etc.
    ]
  });
}
```

**Implementation Files:**
- `specs/custom-panels.js` - Add structure hardware fields
- `core/gear-data.js` - Update gear list builder
- `structure/weight.js` - Calculate weight based on structure type
- `export/pdf.js` - Include structure-specific gear in PDF

---

### 1.3 Built-in Cable Configuration

#### Current State
- Assumes all panels need external power + data cables
- Cable calculations based on wall-to-distro, proc-to-wall distances

#### New Implementation

**Add Built-in Cable Fields:**
```javascript
builtInCables: {
  power: {
    type: 'dropdown',
    options: [
      'none',              // Requires external power cables
      'input_only',        // Has input, no output (last in chain)
      'input_output'       // Has both (daisy-chain capable)
    ],
    default: 'none'
  },
  data: {
    type: 'dropdown',
    options: [
      'none',              // Requires external data cables
      'input_only',        // Has input, no output
      'input_output'       // Has both (daisy-chain capable)
    ],
    default: 'none'
  },
  cableLength: {
    type: 'number',
    unit: 'meters',
    default: 0.5,        // Length of built-in cable (if applicable)
  }
}
```

**Cable Calculation Impact:**
```javascript
// In calculateCables()
function calculatePowerCables(panelCount, panel, distances) {
  if (panel.builtInCables.power === 'input_output') {
    // Panel has daisy-chain cables
    // Only need: distro → first panel
    const externalCables = Math.ceil(panelCount / circuitSize);
    const jumpers = 0; // No jumpers needed (built-in)
    return { externalCables, jumpers };
  } else if (panel.builtInCables.power === 'input_only') {
    // Each panel needs individual power run
    return { externalCables: panelCount, jumpers: 0 };
  } else {
    // Standard: external jumpers between panels
    return { externalCables: Math.ceil(panelCount / circuitSize),
             jumpers: panelCount - 1 };
  }
}

// Similar logic for data cables
```

**Gear List Updates:**
```javascript
// If built-in cables:
if (panel.builtInCables.power === 'input_output') {
  gear.push(`No power jumpers needed (built-in daisy-chain)`);
} else {
  gear.push(`${jumperCount}x Power Jumpers (0.5m)`);
}
```

**Implementation Files:**
- `specs/custom-panels.js` - Add cable configuration fields
- `core/calculate.js` - Update cable calculations
- `core/gear-data.js` - Update gear list based on cable config
- `export/pdf.js` - Note cable configuration in PDF

---

### 1.4 Power Cable Type (Freeform)

#### Current State
- Assumes Soca power connectors
- No flexibility for different cable types

#### New Implementation

**Add Power Cable Type Field:**
```javascript
powerCableType: {
  type: 'text',
  placeholder: 'e.g., Soca, TRUE1, Soca splay (6 circuits)',
  default: 'Soca',
  maxLength: 100
}
```

**Display in Gear List & PDF:**
```javascript
// In buildGearListData()
const powerCableType = panel.powerCableType || 'Soca';

gear.push({
  category: 'Power Cables',
  items: [
    {
      label: powerCableType,
      qty: cableCount,
      length: `${cableLength}ft`,
      notes: 'Wall to distro'
    }
  ]
});
```

**Examples Users Can Enter:**
- "Soca"
- "PowerCON TRUE1"
- "Soca splay (6 circuits)"
- "Soca splay (3 circuits)"
- "CEEform 32A"
- "Edison C13"

**Note:** This is display-only and doesn't affect calculations. Power calculations continue to use voltage/amperage/breaker values which are already in the panel specs.

**Implementation Files:**
- `specs/custom-panels.js` - Add power cable type text field
- `core/gear-data.js` - Use custom cable type in labels
- `export/pdf.js` - Display cable type in gear list

---

### 1.5 Cable Type Display (Notes Only)

#### Current State
- Assumes Cat5/Cat6 for data
- No variation shown

#### New Implementation

**Add Cable Type Fields (Display Only):**
```javascript
cableTypes: {
  data: {
    type: 'dropdown',
    options: [
      'cat5e',            // Standard Ethernet
      'cat6',             // Faster Ethernet
      'fiber_optic',      // Long-distance, high-bandwidth
      'sdi',              // SDI video
      'hdmi',             // HDMI (short runs)
      'proprietary'       // Custom (manufacturer-specific)
    ],
    default: 'cat5e',
    notes: ''           // Freeform if proprietary
  }
}
```

**Display in Gear List & PDF:**
```javascript
// In buildGearListData()
const dataCableType = panel.cableTypes?.data || 'cat5e';
const dataCableLabel = {
  cat5e: 'Cat5e Ethernet',
  cat6: 'Cat6 Ethernet',
  fiber_optic: 'Fiber Optic',
  sdi: 'SDI Cable',
  hdmi: 'HDMI Cable',
  proprietary: panel.cableTypes.notes || 'Proprietary Cable'
}[dataCableType];

gear.push({
  label: 'Data Cables',
  value: `${cableCount}x ${dataCableLabel} (${length}ft)`
});
```

**Implementation Files:**
- `specs/custom-panels.js` - Add cable type field
- `core/gear-data.js` - Use cable type in labels
- `export/pdf.js` - Display cable type in specs

---

### 1.6 Custom Panel Modal UI Redesign

#### Current Layout Issues
- All fields in single long form
- No grouping or organization
- Overwhelming for new users

#### New Layout

**Tabbed Interface:**
```
┌─────────────────────────────────────────┐
│ [Basic Info] [Dimensions] [Power/Data] │
│              [Structure] [Advanced]     │
├─────────────────────────────────────────┤
│                                         │
│  Currently Viewing: Basic Info          │
│                                         │
│  Brand: [________________]              │
│  Model: [________________]              │
│  Pixel Pitch: [____] mm                 │
│                                         │
│         [Previous]  [Next →]            │
│                                         │
└─────────────────────────────────────────┘
```

**Tab 1: Basic Info** (Everything needed for power/data calculations)
- Brand
- Model
- Pixel Pitch (mm)
- Width, Height (mm or inches based on unit system)
- Resolution Width, Height (pixels)
- Max Power (watts)
- Average Power (watts)
- Brightness (nits)
- Power Cable Type (text: "Soca", "TRUE1", etc.)

**Tab 2: Dimensions & Weight**
- Shape type (rectangular/square/triangular/irregular)
- Depth (mm or inches)
- Weight (with/without frame option)

**Tab 3: Cables**
- Built-in power cables (none/input/input+output)
- Built-in data cables (none/input/input+output)
- Data cable type (cat5/fiber/etc.) - display only

**Tab 4: Structure**
- Structure hardware type (hanging/ground/floor/none)
- **If hanging:** bumper weights, shackles, cheeseeyes, truss
- **If ground:** base bumper weights, sandbags, plates
- **If floor:** frame weights, connectors
- Max hanging count, max stacking count

**Tab 5: Advanced**
- Viewing angle
- IP rating
- Operating temp range
- Refresh rate capability
- Notes (freeform)

**Progress Indicator:**
```
● ○ ○ ○ ○
Basic Info
```

**Implementation Files:**
- `specs/custom-panels.js` - Reorganize modal HTML
- `styles.css` - Tab styling (match comic theme)
- `core/modals.js` - Tab switching logic

---

## Phase 2: Custom Processor Implementation

### 🎯 Goal
Allow users to create custom video processors with accurate data calculations for any panel type.

---

### 2.1 Custom Processor Data Structure

#### Schema
```javascript
const customProcessor = {
  // Basic Info
  brand: 'Megapixel',
  model: 'VX1000',

  // Capacity
  basePixelCapacity: 10400000,    // At 60Hz, 8-bit
  baseFrameRate: 60,              // Hz
  baseBitDepth: 8,                // bits

  // Scaling factors (how capacity changes)
  capacityScaling: {
    frameRate: {
      // capacity multiplier = baseFrameRate / currentFrameRate
      // e.g., 30Hz = 2x capacity, 120Hz = 0.5x capacity
    },
    bitDepth: {
      8: 1.0,      // 100% capacity
      10: 0.8,     // 80% capacity
      12: 0.67     // 67% capacity
    }
  },

  // Outputs
  outputPorts: {
    count: 16,
    type: 'rj45',        // rj45, fiber, custom
    customType: '',      // if type='custom', user specifies (e.g., 'SDI', 'HDMI')
    capacityPerPort: null // null = auto-distribute, or specify per-port limit
  },

  // Distribution Box
  requiresDistroBox: false,       // true/false
  distroBox: {
    model: 'Distro 16x RJ45',
    portsPerBox: 16,
    capacityPerPort: null         // null = same as processor port
  },

  // Direct/Indirect Mode
  supportsDirectMode: true,
  supportsIndirectMode: true,
  indirectModeCapacityMultiplier: 1.0, // Some processors change capacity

  // Additional
  powerDraw: 150,                 // watts
  genlock: true,
  redundancySupport: true,
  notes: ''
};
```

---

### 2.2 Custom Processor Modal UI

**Tabbed Interface (Similar to Custom Panels):**

**Tab 1: Basic Info**
```
Brand: [________________]
Model: [________________]
Notes: [________________] (optional)
```

**Tab 2: Capacity**
```
Base Pixel Capacity: [____________] pixels
  At Frame Rate: [60] Hz
  At Bit Depth: [8] bit

┌──────────────────────────────────┐
│ Capacity Auto-Scales Based On:  │
│                                  │
│ Frame Rate:                      │
│ • 30Hz  = 2.0x capacity         │
│ • 60Hz  = 1.0x capacity (base)  │
│ • 120Hz = 0.5x capacity         │
│                                  │
│ Bit Depth:                       │
│ • 8-bit  = 1.0x capacity (base) │
│ • 10-bit = 0.8x capacity        │
│ • 12-bit = 0.67x capacity       │
└──────────────────────────────────┘
```

**Tab 3: Outputs**
```
Output Port Type:
( ) RJ45 Ethernet
( ) Fiber Optic
( ) Custom: [_______________]
    (e.g., SDI, HDMI, Proprietary)

Number of Ports: [16]

Capacity Per Port:
( ) Auto-distribute (recommended)
( ) Manual limit: [______] pixels/port
```

**Tab 4: Distribution Box** (Optional)
```
[✓] Requires Distribution Box

Distribution Box Model: [________________]
Ports Per Box: [16]
Capacity Per Port:
( ) Same as processor port capacity
( ) Custom: [______] pixels/port

Note: System will auto-calculate how many
distro boxes are needed for your wall.
```

**Tab 5: Modes**
```
Supported Modes:
[✓] Direct Mode (processor → panels)
[✓] Indirect Mode (processor → distro → panels)

Indirect Mode Capacity:
( ) Same as direct mode
( ) Different: [___]% of base capacity

Example: Some processors have lower capacity
in indirect mode due to signal routing.
```

**Tab 6: Advanced**
```
Power Draw: [150] watts

Features:
[✓] Genlock Support
[✓] Redundancy Support

Operating Notes: [_______________]
(Optional: special requirements, limitations, etc.)
```

---

### 2.3 Calculation Logic

#### 2.3.1 Pixel Capacity Calculation

```javascript
function calculateProcessorCapacity(processor, frameRate, bitDepth) {
  const { basePixelCapacity, baseFrameRate, baseBitDepth } = processor;

  // Frame rate scaling (inverse relationship)
  const frameRateMultiplier = baseFrameRate / frameRate;
  // e.g., 60Hz base, 30Hz actual = 60/30 = 2.0x capacity

  // Bit depth scaling
  const bitDepthMultiplier = processor.capacityScaling.bitDepth[bitDepth] || 1.0;

  // Final capacity
  const capacity = basePixelCapacity * frameRateMultiplier * bitDepthMultiplier;

  return Math.floor(capacity);
}

// Example:
// Base: 10.4M @ 60Hz, 8-bit
// Actual: 30Hz, 10-bit
// Capacity = 10.4M × (60/30) × 0.8 = 10.4M × 2.0 × 0.8 = 16.64M pixels
```

#### 2.3.2 Port Distribution

```javascript
function calculatePortDistribution(processor, wallPixels, mode) {
  const capacity = calculateProcessorCapacity(processor, frameRate, bitDepth);

  if (mode === 'indirect' && processor.indirectModeCapacityMultiplier !== 1.0) {
    capacity *= processor.indirectModeCapacityMultiplier;
  }

  const portCount = processor.outputPorts.count;

  if (processor.outputPorts.capacityPerPort) {
    // Manual limit per port
    const pixelsPerPort = processor.outputPorts.capacityPerPort;
    const usedPorts = Math.ceil(wallPixels / pixelsPerPort);
    return { usedPorts, pixelsPerPort, capacity };
  } else {
    // Auto-distribute
    const pixelsPerPort = Math.floor(capacity / portCount);
    const usedPorts = Math.ceil(wallPixels / pixelsPerPort);
    return { usedPorts, pixelsPerPort, capacity };
  }
}
```

#### 2.3.3 Distribution Box Calculation

```javascript
function calculateDistroBoxes(processor, usedPorts) {
  if (!processor.requiresDistroBox) {
    return { distroBoxCount: 0, portsPerBox: 0 };
  }

  const portsPerBox = processor.distroBox.portsPerBox;
  const distroBoxCount = Math.ceil(usedPorts / portsPerBox);

  return { distroBoxCount, portsPerBox };
}

// Example:
// Wall needs 24 data ports
// Distro box has 16 ports
// Need: Math.ceil(24 / 16) = 2 distro boxes
```

#### 2.3.4 Multi-Processor Calculation

```javascript
function calculateProcessorCount(wallPixels, processor, frameRate, bitDepth) {
  const capacity = calculateProcessorCapacity(processor, frameRate, bitDepth);

  if (wallPixels > capacity) {
    // Need multiple processors
    const processorCount = Math.ceil(wallPixels / capacity);
    const pixelsPerProcessor = Math.floor(wallPixels / processorCount);

    return { processorCount, pixelsPerProcessor };
  } else {
    return { processorCount: 1, pixelsPerProcessor: wallPixels };
  }
}

// Show warning if multiple processors needed:
// "Wall resolution (20.8M pixels) exceeds processor capacity (10.4M pixels).
//  You will need 2× Megapixel VX1000 processors."
```

---

### 2.4 Integration with Existing Code

#### 2.4.1 Processor Dropdown

**Update processor selector:**
```javascript
// In specs/processors.js or core/calculate.js
function updateProcessorDropdown() {
  const processorSelect = document.getElementById('processor');

  // Standard processors
  const standardProcessors = getAllProcessors(); // Existing function

  // Custom processors from localStorage
  const customProcessors = JSON.parse(
    localStorage.getItem('ledcalc_custom_processors') || '{}'
  );

  // Build dropdown
  processorSelect.innerHTML = '';

  // Standard group
  const standardGroup = document.createElement('optgroup');
  standardGroup.label = 'Standard Processors';
  Object.keys(standardProcessors).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = standardProcessors[key].name;
    standardGroup.appendChild(opt);
  });
  processorSelect.appendChild(standardGroup);

  // Custom group
  if (Object.keys(customProcessors).length > 0) {
    const customGroup = document.createElement('optgroup');
    customGroup.label = 'Custom Processors';
    Object.keys(customProcessors).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${customProcessors[key].brand} ${customProcessors[key].model} (Custom)`;
      customGroup.appendChild(opt);
    });
    processorSelect.appendChild(customGroup);
  }

  // Add custom processor option
  const addOpt = document.createElement('option');
  addOpt.value = '__add_custom__';
  addOpt.textContent = '+ Add Custom Processor...';
  processorSelect.appendChild(addOpt);
}

// Listen for add custom
processorSelect.addEventListener('change', (e) => {
  if (e.target.value === '__add_custom__') {
    openCustomProcessorModal();
    e.target.value = previousValue; // Restore previous selection
  }
});
```

#### 2.4.2 Data Calculations

**Update `core/calculate.js`:**
```javascript
function calculateDataRequirements() {
  const selectedProcessor = document.getElementById('processor').value;
  const frameRate = parseInt(document.getElementById('frameRate').value);
  const bitDepth = parseInt(document.getElementById('bitDepth').value);

  // Get processor object (standard or custom)
  let processor;
  if (selectedProcessor.startsWith('CUSTOM_')) {
    const customProcessors = JSON.parse(
      localStorage.getItem('ledcalc_custom_processors') || '{}'
    );
    processor = customProcessors[selectedProcessor];
  } else {
    processor = getAllProcessors()[selectedProcessor];
  }

  // Calculate capacity
  const capacity = calculateProcessorCapacity(processor, frameRate, bitDepth);

  // Calculate ports needed
  const { usedPorts, pixelsPerPort } = calculatePortDistribution(
    processor,
    totalWallPixels,
    currentMode
  );

  // Calculate distro boxes if needed
  const { distroBoxCount, portsPerBox } = calculateDistroBoxes(processor, usedPorts);

  // Calculate processor count if needed
  const { processorCount, pixelsPerProcessor } = calculateProcessorCount(
    totalWallPixels,
    processor,
    frameRate,
    bitDepth
  );

  // Update UI
  updateDataResults({
    processor,
    capacity,
    usedPorts,
    pixelsPerPort,
    distroBoxCount,
    processorCount
  });
}
```

#### 2.4.3 Gear List Updates

**Update `core/gear-data.js`:**
```javascript
function buildProcessorGear(screenIds) {
  const processor = getSelectedProcessor();
  const processorCount = calculateProcessorCount(...);
  const distroBoxCount = calculateDistroBoxes(...).distroBoxCount;

  const gear = [];

  // Processors
  gear.push({
    category: 'Video Processing',
    items: [
      {
        label: `${processor.brand} ${processor.model}`,
        qty: processorCount,
        notes: `${capacity / 1000000}M pixels @ ${frameRate}Hz, ${bitDepth}-bit`
      }
    ]
  });

  // Distribution boxes (if needed)
  if (distroBoxCount > 0) {
    gear[0].items.push({
      label: processor.distroBox.model,
      qty: distroBoxCount,
      notes: `${processor.distroBox.portsPerBox} ports per box`
    });
  }

  // Data cables
  const cableType = processor.outputPorts.type === 'fiber'
    ? 'Fiber Optic'
    : 'Cat6 Ethernet';

  gear.push({
    category: 'Data Cables',
    items: [
      {
        label: `${cableType} (Processor → ${distroBoxCount > 0 ? 'Distro' : 'Panels'})`,
        qty: usedPorts,
        length: calculateCableLength(...)
      }
    ]
  });

  return gear;
}
```

---

### 2.5 Validation & Error Handling

#### Capacity Warnings
```javascript
// Show warning if wall exceeds processor capacity
if (totalWallPixels > capacity) {
  showWarning(
    `Wall resolution (${(totalWallPixels/1000000).toFixed(1)}M pixels) ` +
    `exceeds processor capacity (${(capacity/1000000).toFixed(1)}M pixels). ` +
    `You will need ${processorCount}× ${processor.brand} ${processor.model}.`
  );
}

// Show warning if using > 80% of capacity
if (totalWallPixels > capacity * 0.8) {
  showWarning(
    `Using ${((totalWallPixels/capacity)*100).toFixed(0)}% of processor capacity. ` +
    `Consider adding redundancy or lowering frame rate/bit depth.`
  );
}
```

#### Port Count Warnings
```javascript
if (usedPorts > processor.outputPorts.count) {
  showWarning(
    `Wall requires ${usedPorts} data ports, but processor only has ` +
    `${processor.outputPorts.count} ports. ` +
    `${distroBoxCount > 0
      ? `${distroBoxCount} distribution boxes will be used.`
      : 'You may need multiple processors or a distribution system.'}`
  );
}
```

---

### 2.6 PDF Export Updates

**Include Custom Processor Specs:**
```javascript
// In export/pdf.js
function addProcessorSpecs(pdf, processor, y) {
  pdf.setFont('roboto', 'bold');
  pdf.text('VIDEO PROCESSOR', 20, y);
  y += 6;

  pdf.setFont('roboto', 'normal');
  pdf.text(`${processor.brand} ${processor.model}`, 25, y);
  y += 5;

  if (processor.custom) {
    // Show custom processor details
    pdf.text(`Capacity: ${(processor.basePixelCapacity/1000000).toFixed(1)}M pixels @ ${processor.baseFrameRate}Hz, ${processor.baseBitDepth}-bit`, 25, y);
    y += 5;
    pdf.text(`Ports: ${processor.outputPorts.count}× ${processor.outputPorts.type.toUpperCase()}`, 25, y);
    y += 5;

    if (processor.requiresDistroBox) {
      pdf.text(`Distribution: ${processor.distroBox.model} (${processor.distroBox.portsPerBox} ports)`, 25, y);
      y += 5;
    }

    if (processor.notes) {
      pdf.text(`Notes: ${processor.notes}`, 25, y);
      y += 5;
    }
  }

  return y;
}
```

---

## Testing Strategy

### Phase 1: Custom Panels
1. **Create test custom panel with extreme specs:**
   - Triangular shape
   - Ground support bumpers
   - Built-in power/data cables
   - EU power standard (PowerCON)
   - Fiber optic data

2. **Verify calculations:**
   - Structure weight correct?
   - Cable counts accurate?
   - Gear list includes correct hardware?
   - PDF shows all custom specs?

3. **Test save/load:**
   - Save config with custom panel
   - Reload
   - Verify all fields preserved

### Phase 2: Custom Processors
1. **Create test custom processor:**
   - 8M pixel capacity @ 60Hz, 8-bit
   - 12 output ports (RJ45)
   - Requires distro box (16 ports)
   - Supports direct + indirect mode

2. **Test scenarios:**
   - Small wall (< capacity): 1 processor, direct mode
   - Medium wall (> capacity, < 2×): 2 processors
   - Large wall: Multiple processors + distro boxes

3. **Verify calculations:**
   - Capacity scales correctly with frame rate/bit depth
   - Port distribution accurate
   - Distro box count correct
   - Gear list includes all components

4. **Test with different panels:**
   - Standard panel (BP2)
   - Custom panel (from Phase 1)
   - High-res panel (small pitch, lots of pixels)

### Playwright Tests
```typescript
// tests/playwright/features/panels/custom-panels-advanced.spec.ts
test('should create custom panel with all options', async ({ page }) => {
  // Test shape, structure, cables, region
  // Verify calculations update
  // Check PDF export
});

// tests/playwright/features/processors/custom-processors.spec.ts
test('should create custom processor and calculate correctly', async ({ page }) => {
  // Test capacity scaling
  // Test port distribution
  // Test distro box calculations
  // Verify across multiple panel types
});
```

---

## Implementation Order

### Week 1-2: Phase 1 - Custom Panels
1. Add shape type field
2. Add structure hardware selection
3. Add built-in cable configuration
4. Add regional power standards
5. Reorganize modal UI (tabs)
6. Update calculations
7. Update gear list
8. Update PDF export
9. Test & verify

### Week 3-4: Phase 2 - Custom Processors
1. Create processor modal UI (tabs)
2. Implement capacity calculation logic
3. Implement port distribution
4. Implement distro box calculations
5. Add to processor dropdown
6. Update data calculations
7. Update gear list
8. Update PDF export
9. Test across all panel types
10. Add warnings & validation

### Week 5: Testing & Refinement
1. Run smoke tests
2. Run Playwright tests
3. Manual testing (all scenarios)
4. Fix bugs
5. Documentation updates

---

## Success Criteria

### Phase 1: Custom Panels ✓
- [ ] All panel shapes supported (rectangular, square, triangular, irregular)
- [ ] All structure types work (hanging, ground, floor)
- [ ] Built-in cables reduce external cable counts correctly
- [ ] Regional power standards show correct connectors
- [ ] Modal UI is clean and organized
- [ ] All calculations accurate
- [ ] PDF export includes all custom specs
- [ ] Save/load preserves all custom panel data

### Phase 2: Custom Processors ✓
- [ ] Custom processor creation modal works
- [ ] Capacity scales correctly with frame rate & bit depth
- [ ] Port distribution accurate
- [ ] Distro box calculations correct
- [ ] Works with ALL panel types (standard + custom)
- [ ] Gear list includes correct components
- [ ] PDF export shows processor specs
- [ ] Warnings shown when capacity exceeded
- [ ] Multiple processor scenarios handled
- [ ] Save/load preserves custom processors

---

## Next Steps

Once you approve this plan, we'll start with:
1. **Phase 1, Task 1:** Add shape type field to custom panel modal
2. Test the change
3. Commit
4. Move to next task

Incremental, tested, working app at every step. 🚀
