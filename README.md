# LED Wall Calculator

**© 2025 Gabriel Labrecque**  
**Fearless Wanderer Productions**

A professional LED wall calculator for planning LED video wall installations. Calculate equipment needs, visualize layouts, generate gear lists, and export detailed PDF reports.

---

## Table of Contents

1. [Header Controls](#header-controls)
2. [Screen Tabs](#screen-tabs)
3. [Panel Type](#panel-type)
4. [Dimensions](#dimensions)
5. [Power](#power)
6. [Data](#data)
7. [Structure](#structure)
8. [Cabling](#cabling)
9. [Layout Views](#layout-views)
10. [Canvas View](#canvas-view)
11. [Gear List](#gear-list)
12. [PDF Export](#pdf-export)

---

## Header Controls

- **Config Name** – Enter a name for your configuration
- **Save** – Save current configuration (all screens) to a .ledconfig file
- **Load** – Load a previously saved configuration file
- **Export PDF** – Generate a comprehensive PDF report of all screens

---

## Screen Tabs

- **Multiple Screens** – Create and manage multiple LED wall screens in one project
- **Add Screen (+)** – Click the + button to add a new screen
- **Switch Screens** – Click on any screen tab to switch between screens
- **Edit Screen** – Click the pencil icon to rename and change screen colors
  - Set primary color (main panel color)
  - Set secondary color (alternating panel color for checkerboard effect)
- **Delete Screen** – Click the X to remove a screen (cannot delete last screen)
- **Screen Colors** – Each screen has unique colors for easy identification in Canvas View

---

## Panel Type

- **Panel Selection** – Choose from supported LED panel types:
  - ROE Black Pearl BP2 V2
  - ROE Carbon CB5 MKII
  - ROE Carbon CB5 MKII Half Panel
  - ROE MC7H
  - ROE Black Onyx BO3
  - ROE Black Marble BM4 – MATTE
  - ROE DM2.6
  - INFiLED AMT 8.3

- **CB5 MKII Options:**
  - Half Panel Row toggle – Add a row of half-height panels
  - Connection Method – Choose between Air Frame or Connecting Plates

- **DM2.6 Options:**
  - Automatically uses connecting plates (2-way and 4-way)

---

## Dimensions

- **Input Mode Toggle:**
  - **Panels** – Enter number of panels wide and high
  - **Size** – Enter desired wall width and height (calculates panels needed)

- **Units Toggle:**
  - **Imperial** – Feet (ft) and Pounds (lbs)
  - **Metric** – Meters (m) and Kilograms (kg)

- **Inputs:**
  - Panels Wide – Number of panels horizontally
  - Panels High – Number of panels vertically
  - Wall Width – Target width (in Size mode)
  - Wall Height – Target height (in Size mode)

---

## Power

- **Voltage** – Input voltage (default: 208V)
- **Breaker** – Breaker amperage (default: 20A)
- **Phase** – Select 1-phase or 3-phase power (default: 3-phase)
- **Power Basis:**
  - **Max** – Calculate using maximum power consumption
  - **Average** – Calculate using average power consumption
- **Max/Circuit** – Override maximum panels per circuit (leave blank for auto-calculation)

---

## Data

- **Processor** – Select video processor:
  - Brompton SX40
  - Brompton S8
  - Brompton M2
  - Brompton S4
  - Brompton T1
  - Brompton SQ200
  - NovaStar MX40 Pro

- **Frame Rate** – Select refresh rate: 24Hz, 25Hz, 30Hz, 50Hz, 60Hz
- **Bit Depth** – Select color depth: 8-bit, 10-bit, 12-bit
- **Max/Data** – Override maximum panels per data line (leave blank for auto-calculation)

- **Data Direction:**
  - Top→Bottom – Serpentine routing starting from top
  - Bottom→Top – Serpentine routing starting from bottom
  - All from Top – All data lines start from top
  - All from Bottom – All data lines start from bottom

- **Options:**
  - **Arrows** – Show/hide data routing arrows on layouts
  - **Data Redundancy** – Enable redundant data routing (ON by default)
  - **Processor Redundancy** – Double the processor count for backup

---

## Structure

- **Config Type:**
  - **Hanging** – Wall is flown/rigged from above
  - **Ground Stack** – Wall is stacked on the ground with support

- **Bumpers** – Toggle bumper bars on/off
- **4-Way Bumpers** – Use 4-way bumpers (CB5 only)

- **Bumper Controls:**
  - Auto-distribution – Bumpers automatically distribute across wall width
  - Right-click bumpers – Change type (1W/2W) or delete
  - Manual mode – Manually position and adjust bumpers

- **Ground Stack Features:**
  - Automatic ground support hardware calculation for walls over 8 panels high
  - Base plates, outriggers, and bracing calculations

---

## Cabling

All distance measurements for cable length calculations:

- **Trim Height** – Height from floor to top of wall (for hanging walls)
- **Wall to Floor** – Distance from bottom of wall to floor
- **Distro to Wall** – Distance from power distribution to wall
- **Proc to Wall** – Distance from processor to wall
- **FOH to Proc** – Distance from Front of House to processor (for signal cables)

---

## Layout Views

Five different layout visualizations:

### Standard Layout
- Shows panel grid with checkerboard coloring
- Click panels to delete/restore them
- Undo/Redo support for panel changes
- Deleted panels shown as dotted outlines

### Power Layout
- Shows power circuit distribution
- Each circuit color-coded
- Displays circuit numbers on panels
- Shows distribution box assignments

### Data Layout
- Shows data routing paths
- Serpentine pattern visualization
- Data line numbers displayed
- Arrows show signal direction (if enabled)
- Port assignments visible

### Structure Layout
- Shows bumper bar positions and types
- Pickup point indicators
- Weight distribution per pickup point
- Connecting plates count (if applicable)
- Ground support hardware (if applicable)
- Manual mode for custom bumper placement

### Gear List
- Complete equipment list for the wall
- Organized by category
- Quantities and specifications

---

## Canvas View

Multi-screen canvas visualization:

- **Canvas Size Presets:**
  - 4K UHD (3840×2160)
  - 4K DCI (4096×2160)
  - HD (1920×1080)
  - Custom dimensions

- **Position Controls:**
  - X Pos – Horizontal position in pixels
  - Y Pos – Vertical position in pixels
  - Drag screens directly on canvas to reposition
  - Arrow keys for fine positioning

- **Snap Mode** – Snap to pixel grid when moving
- **Fine (px)** – Arrow key increment amount

- **Zoom Controls:**
  - +/- buttons for zoom in/out
  - Direct percentage input
  - Reset button
  - Ctrl+scroll wheel to zoom

- **Pan Controls:**
  - Click and drag to pan when zoomed
  - Shows all screens with their colors

- **Export Options:**
  - Format: PNG, JPEG, or PDF
  - Custom filename
  - Exports current canvas view

- **Screen Visibility:**
  - Toggle individual screens on/off in canvas view
  - Color-coded checkboxes match screen colors

---

## Gear List

Comprehensive equipment summary:

- **Panels** – Total panel count and weight
- **Processors** – Number and type of processors needed
- **Data Cables** – Port-to-panel cables required
- **Distribution** – Power distribution requirements
- **Power Cables** – Distro-to-panel power cables
- **Signal Cables** – SDI cables from FOH to processors
- **Utility Cables** – Network and power for processors
- **Structure** – Bumper bars by type (1W/2W)
- **Connecting Plates** – 2-way and 4-way plates (if applicable)
- **Ground Support** – Base plates, outriggers, bracing (if applicable)

---

## PDF Export

Generate a professional PDF report containing:

- **Configuration summary for each screen**
- **Wall specifications:**
  - Dimensions (panels and physical size)
  - Total panel count and weight
  - Pixel resolution

- **Power requirements:**
  - Total wattage
  - Circuit count
  - Distribution boxes needed

- **Data specifications:**
  - Processor count and type
  - Data lines and port usage
  - Frame rate and bit depth

- **Structure details:**
  - Configuration type
  - Bumper quantities
  - Pickup weights

- **Complete gear list**

- **Visual layouts:**
  - Standard layout diagram
  - Power layout diagram
  - Data layout diagram
  - Structure layout diagram

---

## Keyboard Shortcuts

- **Ctrl+Z** – Undo (in Standard Layout, Structure Layout, Canvas View)
- **Ctrl+Y** – Redo
- **Arrow Keys** – Fine position adjustment in Canvas View
- **Ctrl+Scroll** – Zoom in/out in Canvas View

---

## Tips & Best Practices

1. **Start with Panel Type** – Select your panel first as it affects all calculations
2. **Use Data Redundancy** – Enabled by default for professional installations
3. **Check Power Calculations** – Verify circuit counts match your available power
4. **Review Structure Layout** – Confirm pickup weights are within rigging limits
5. **Export PDF** – Always generate a PDF for documentation and sharing
6. **Save Configurations** – Save your work frequently using the Save button
7. **Use Multiple Screens** – Organize complex setups with multiple screen tabs

---

## Supported Panel Specifications

| Panel | Pixel Pitch | Size (mm) | Weight | Max Power | Avg Power |
|-------|-------------|-----------|--------|-----------|-----------|
| BP2 V2 | 2.84mm | 500×500 | 8.5kg | 220W | 73W |
| CB5 MKII | 5.77mm | 500×500 | 9.8kg | 145W | 60W |
| MC7H | 7.8mm | 500×500 | 7.5kg | 200W | 80W |
| BO3 | 3.9mm | 600×337.5 | 8.0kg | 180W | 72W |
| BM4 | 3.9mm | 600×337.5 | 6.5kg | 230W | 80W |
| DM2.6 | 2.6mm | 500×500 | 7.5kg | 200W | 70W |

---

## Version

v172 – Multi-Screen Edition

---

## Contact

For support or feature requests, contact Fearless Wanderer Productions.

## License

This project is dual-licensed:

- **Open Source:** You may use, modify, and distribute the software under the terms of the [MIT License](./LICENSE-OPEN.txt).

- **Commercial Use:** For redistribution, resale, or commercial use beyond the MIT terms, a commercial license is required. Please contact [gablabrecque@gmail.com](mailto:gablabrecque@gmail.com) for licensing options and fees.
