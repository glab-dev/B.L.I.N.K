# LED Wall Calculator

**© 2025 Gabriel Labrecque**
**Fearless Wanderer Productions**

A professional LED wall calculator PWA (Progressive Web App) for planning LED video wall installations. Calculate equipment needs, visualize layouts, generate gear lists, and export detailed PDF reports. Works on mobile and desktop with automatic updates.

---

## Table of Contents

1. [Features Overview](#features-overview)
2. [Mobile vs Desktop](#mobile-vs-desktop)
3. [Getting Started](#getting-started)
4. [Header Controls](#header-controls)
5. [Screen Tabs](#screen-tabs)
6. [Panel Type](#panel-type)
7. [Custom Panels](#custom-panels)
8. [Custom Processors](#custom-processors)
9. [Dimensions](#dimensions)
10. [Power](#power)
11. [Data](#data)
12. [Structure](#structure)
13. [Cabling](#cabling)
14. [Layout Views](#layout-views)
15. [Canvas View](#canvas-view)
16. [Gear List](#gear-list)
17. [PDF Export](#pdf-export)
18. [Keyboard Shortcuts](#keyboard-shortcuts)
19. [Supported Panels](#supported-panels)
20. [Supported Processors](#supported-processors)

---

## Features Overview

### Fully Working Features
- **Multi-screen projects** - Create and manage multiple LED walls in one project
- **Built-in panel library** - 8 pre-configured LED panel types with full specifications
- **Custom panels** - Add your own LED panels with custom specifications
- **Built-in processor library** - 7 pre-configured video processors
- **Power calculations** - Automatic circuit distribution, breaker sizing, phase balancing
- **Data calculations** - Automatic data line routing, port requirements, processor sizing
- **Structure calculations** - Bumper bar distribution, pickup weights, ground support hardware
- **Canvas view** - Multi-screen visualization with drag-and-drop positioning
- **5 layout views** - Standard, Power, Data, Structure, and Gear List
- **PDF export** - Professional multi-page reports with all specifications and layouts
- **Save/Load configurations** - Export and import .ledconfig files
- **Unit conversion** - Toggle between Imperial (ft/lbs) and Metric (m/kg)
- **Automatic updates** - Version checking with update notifications
- **Offline capable** - Works without internet after initial load (PWA)
- **Installable** - Add to home screen on mobile devices

### In Development
- **Custom processors** - Add your own video processors (UI exists, calculations pending)
- **Cabling calculations** - Cable length estimates based on distances

---

## Mobile vs Desktop

The app automatically adapts to your screen size with two distinct modes:

### Mobile Version (Simple Mode)
- **Hamburger menu** - Access all options from the menu icon
- **Condensed results** - Streamlined specs display
- **Touch-optimized** - Large buttons, swipe gestures
- **Collapsible sections** - Tap section headers to expand/collapse
- **Bottom navigation** - Quick access to main functions
- **Single layout view** - One layout visible at a time

### Desktop Version (Complex Mode)
- **Full interface** - All controls visible simultaneously
- **Detailed results** - Complete specifications with all data
- **Side-by-side layouts** - Multiple layout views visible
- **Keyboard shortcuts** - Full keyboard navigation support
- **Larger canvas** - More workspace for multi-screen setups
- **Advanced structure controls** - Full bumper management tools

### Switching Modes
- Mode automatically switches based on screen width
- Reload page after resizing to ensure proper mode detection

---

## Getting Started

1. **Select a Panel Type** - Choose your LED panel from the dropdown
2. **Enter Dimensions** - Input panels wide/high or target wall size
3. **Configure Power** - Set voltage, breaker, and phase settings
4. **Configure Data** - Select processor, frame rate, and bit depth
5. **Review Results** - Check the calculated specifications
6. **View Layouts** - Explore Power, Data, and Structure layouts
7. **Export PDF** - Generate a professional report

---

## Header Controls

- **Config Name** - Enter a name for your configuration
- **Save** - Save current configuration (all screens) to a .ledconfig file
- **Load** - Load a previously saved configuration file
- **Export PDF** - Generate a comprehensive PDF report of all screens
- **Menu (mobile)** - Access all app functions and settings

---

## Screen Tabs

- **Multiple Screens** - Create and manage multiple LED wall screens in one project
- **Add Screen (+)** - Click the + button to add a new screen
- **Switch Screens** - Click on any screen tab to switch between screens
- **Edit Screen** - Click the pencil icon to rename and change screen colors
  - Set primary color (main panel color)
  - Set secondary color (alternating panel color for checkerboard effect)
- **Delete Screen** - Click the X to remove a screen (cannot delete last screen)
- **Screen Colors** - Each screen has unique colors for easy identification in Canvas View

---

## Panel Type

### Built-in Panels
- ROE Black Pearl BP2 V2
- ROE Carbon CB5 MKII
- ROE Carbon CB5 MKII Half Panel
- ROE MC7H
- ROE Black Onyx BO3
- ROE Black Marble BM4 (Matte)
- ROE DM2.6
- INFiLED AMT 8.3

### Panel-Specific Options

**CB5 MKII:**
- Half Panel Row toggle - Add a row of half-height panels at the bottom
- Connection Method - Choose between Air Frame or Connecting Plates

**DM2.6:**
- Automatically uses connecting plates (2-way and 4-way)

**BM4 (Matte):**
- No bumper support (floor panel)

---

## Custom Panels

Add your own LED panels with custom specifications:

### How to Add a Custom Panel
1. Open the hamburger menu
2. Tap "+ Add Custom Panel"
3. Fill in the panel specifications:
   - **Brand** - Manufacturer name
   - **Name** - Panel model name
   - **Pixel Pitch** - LED pitch in mm
   - **Width/Height** - Panel dimensions in mm
   - **Depth** - Panel depth in mm
   - **Resolution X/Y** - Pixel count horizontal/vertical
   - **Power Max/Avg** - Power consumption in watts
   - **Brightness** - Brightness in nits
   - **Max Hanging/Stacking** - Structural limits
   - **Weight** - Panel weight in kg
   - **Bumper Weights** - 1W and 2W bumper weights in lbs

### Managing Custom Panels
1. Open hamburger menu
2. Tap "Manage Custom Items"
3. Select "Panels" tab
4. Edit or delete existing custom panels

Custom panels work with all built-in processors for power and data calculations.

---

## Custom Processors

*(In Development)*

Add your own video processors with custom specifications:

### Available Fields
- **Processor Name** - Display name
- **10G Ports** - Number of 10G output ports
- **1G Ports** - Number of 1G output ports
- **Pixels per 1G Port** - Pixel capacity per 1G port
- **Pixels per 10G Port** - Pixel capacity per 10G port
- **Max Input Resolution** - Maximum supported input resolution
- **Distribution Box** - Optional distribution box configuration

Note: Custom processor calculations are still in development.

---

## Dimensions

### Input Modes
- **Panels** - Enter number of panels wide and high
- **Size** - Enter desired wall width and height (auto-calculates panels needed)

### Unit Systems
- **Imperial** - Feet (ft) and Pounds (lbs)
- **Metric** - Meters (m) and Kilograms (kg)

### Input Fields
- **Panels Wide** - Number of panels horizontally
- **Panels High** - Number of panels vertically
- **Wall Width** - Target width (in Size mode)
- **Wall Height** - Target height (in Size mode)

Size mode automatically snaps to valid panel counts.

---

## Power

- **Voltage** - Input voltage (110V, 120V, 208V, 220V, 230V, 240V)
- **Breaker** - Breaker amperage (15A, 20A, 30A, 50A, 60A)
- **Phase** - 1-phase or 3-phase power
- **Power Basis:**
  - **Max** - Calculate using maximum power consumption (recommended)
  - **Average** - Calculate using average power consumption
- **Max/Circuit** - Override maximum panels per circuit (leave blank for auto)

### Power Calculations
- Automatic circuit distribution based on panel power draw
- Phase balancing for 3-phase systems
- Safety margins applied to all calculations

---

## Data

### Processor Selection
- Brompton SX40 (with XD distribution)
- Brompton S8
- Brompton M2
- Brompton S4
- Brompton T1
- Brompton SQ200
- NovaStar MX40 Pro (with CVT distribution)

### Settings
- **Frame Rate** - 24Hz, 25Hz, 30Hz, 50Hz, 60Hz
- **Bit Depth** - 8-bit, 10-bit, 12-bit
- **Max/Data** - Override maximum panels per data line (leave blank for auto)

### Data Direction
- **Top→Bottom** - Serpentine routing starting from top
- **Bottom→Top** - Serpentine routing starting from bottom
- **All from Top** - All data lines start from top
- **All from Bottom** - All data lines start from bottom

### Options
- **Arrows** - Show/hide data routing arrows on layouts
- **Data Redundancy** - Enable redundant data routing (doubles ports needed)
- **Processor Redundancy** - Double the processor count for backup

---

## Structure

### Configuration Types
- **Hanging** - Wall is flown/rigged from above
- **Ground Stack** - Wall is stacked on the ground with support

### Bumper Controls
- **Bumpers Toggle** - Enable/disable bumper bars
- **4-Way Bumpers** - Use 4-way bumpers (CB5 only)
- **Auto-distribution** - Bumpers automatically distribute across wall width
- **Manual mode** - Manually position and adjust bumpers

### Bumper Interactions
- Right-click/long-press bumpers to change type or delete
- Drag bumpers to reposition (manual mode)
- Pickup weights calculated per bumper position

### Ground Stack Features
- Automatic ground support hardware calculation
- Base plates, outriggers, and bracing for tall walls
- Different calculations based on wall height

---

## Cabling

*(In Development)*

Distance measurements for cable length calculations:

- **Trim Height** - Height from floor to top of wall
- **Wall to Floor** - Distance from bottom of wall to floor
- **Distro to Wall** - Distance from power distribution to wall
- **Proc to Wall** - Distance from processor to wall
- **FOH to Proc** - Distance from Front of House to processor

---

## Layout Views

### Standard Layout
- Shows panel grid with checkerboard coloring
- Click panels to delete/restore them
- Undo/Redo support for panel changes
- Deleted panels shown as dotted outlines
- Panel coordinates displayed on hover

### Power Layout
- Shows power circuit distribution
- Each circuit color-coded
- Displays circuit numbers on panels
- Shows distribution box assignments
- Serpentine circuit routing visualization

### Data Layout
- Shows data routing paths
- Serpentine pattern visualization
- Data line numbers displayed
- Arrows show signal direction (if enabled)
- Port assignments visible

### Structure Layout
- Shows bumper bar positions and types
- Pickup point indicators with weights
- Weight distribution per pickup point
- Connecting plates count (if applicable)
- Ground support hardware visualization
- Manual mode for custom bumper placement

### Gear List
- Complete equipment list for the wall
- Organized by category (Equipment, Rigging, Cabling)
- Quantities and specifications
- Aggregated totals across all screens

---

## Canvas View

Multi-screen canvas visualization for positioning multiple LED walls:

### Canvas Size Presets
- 4K UHD (3840×2160)
- 4K DCI (4096×2160)
- HD (1920×1080)
- Custom dimensions

### Position Controls
- **X Pos** - Horizontal position in pixels
- **Y Pos** - Vertical position in pixels
- **Fine (px)** - Arrow key increment amount
- Drag screens directly on canvas to reposition
- Screens snap to each other and canvas edges

### Zoom Controls
- +/- buttons for zoom in/out
- Direct percentage input
- Reset button to return to 100%
- Ctrl+scroll wheel to zoom (desktop)

### Pan Controls
- Click and drag empty space to pan when zoomed
- Pan resets when zoom returns to 100%

### Screen Visibility
- Toggle individual screens on/off
- Toggle pixel grid overlay
- Toggle X crosshair overlay
- Color-coded checkboxes match screen colors

### Export Options
- Format: PNG, JPEG, or PDF
- Custom filename support
- Exports current canvas view at full resolution

---

## Gear List

Comprehensive equipment summary organized by category:

### Equipment
- Panels (count, weight)
- Processors (type, quantity)
- Distribution boxes (type, quantity)

### Rigging
- Bumper bars by type (1W, 2W, 4W)
- Connecting plates (2-way, 4-way)
- Ground support hardware

### Cabling (In Development)
- Data cables by length
- Power cables by length
- Signal cables

---

## PDF Export

Generate a professional multi-page PDF report containing:

### For Each Screen
- Wall specifications (dimensions, panel count, resolution)
- Power requirements (wattage, circuits, distribution)
- Data specifications (processor, ports, data lines)
- Structure details (config type, bumpers, weights)
- Visual layouts (Standard, Power, Data, Structure)

### Summary Pages
- Configuration overview
- Complete gear list aggregated across all screens
- Canvas view (if multiple screens)

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo (panels, bumpers, canvas moves) |
| Ctrl+Y | Redo |
| Arrow Keys | Fine position adjustment in Canvas View |
| Ctrl+Scroll | Zoom in/out in Canvas View |

---

## Supported Panels

| Panel | Pitch | Size | Resolution | Weight | Max W | Avg W |
|-------|-------|------|------------|--------|-------|-------|
| BP2 V2 | 2.84mm | 500×500mm | 176×176 | 9.35kg | 190W | 95W |
| CB5 MKII | 5.77mm | 600×1200mm | 104×208 | 12.13kg | 480W | 240W |
| CB5 MKII Half | 5.77mm | 600×600mm | 104×104 | 6.69kg | 250W | 125W |
| MC7H | 7.5mm | 600×600mm | 80×80 | 14.8kg | 420W | 210W |
| BO3 | 3.47mm | 500×500mm | 144×144 | 9.35kg | 170W | 85W |
| BM4 (Matte) | 4.76mm | 610×610mm | 128×128 | 16.0kg | 280W | 140W |
| DM2.6 | 2.6mm | 500×500mm | 192×192 | 5.76kg | 180W | 90W |
| INFiLED AMT 8.3 | 8.33mm | 1000×1000mm | 120×120 | 15.8kg | 720W | 360W |

---

## Supported Processors

| Processor | 1G Ports | 10G Ports | Pixels/Port | Distribution |
|-----------|----------|-----------|-------------|--------------|
| Brompton SX40 | 40 | 4 | 2,304,000 | XD Box (10 ports) |
| Brompton S8 | 8 | 0 | 2,304,000 | - |
| Brompton M2 | 2 | 0 | 2,304,000 | - |
| Brompton S4 | 4 | 0 | 2,304,000 | - |
| Brompton T1 | 1 | 0 | 2,304,000 | - |
| Brompton SQ200 | 4 | 0 | 4,000,000 | - |
| NovaStar MX40 Pro | 40 | 4 | 2,600,000 | CVT Box (10 ports) |

---

## Version

v2.0.85 - PWA Edition with Custom Panels

---

## Tips & Best Practices

1. **Start with Panel Type** - Select your panel first as it affects all calculations
2. **Use Data Redundancy** - Enabled by default for professional installations
3. **Check Power Calculations** - Verify circuit counts match your available power
4. **Review Structure Layout** - Confirm pickup weights are within rigging limits
5. **Export PDF** - Always generate a PDF for documentation and sharing
6. **Save Configurations** - Save your work frequently using the Save button
7. **Use Multiple Screens** - Organize complex setups with multiple screen tabs
8. **Add Custom Panels** - Create custom panels for any LED product not in the library

---

## Contact

For support or feature requests, contact Fearless Wanderer Productions.

Email: gablabrecque@gmail.com

---

## License

This project is dual-licensed:

- **Open Source:** You may use, modify, and distribute the software under the terms of the [MIT License](./LICENSE-OPEN.txt).

- **Commercial Use:** For redistribution, resale, or commercial use beyond the MIT terms, a commercial license is required. Please contact [gablabrecque@gmail.com](mailto:gablabrecque@gmail.com) for licensing options and fees.
