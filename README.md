# B.L.I.N.K. — LED Calculator

**Build Layout Intelligence for Networked Kits**

**© 2025 Gabriel Labrecque**
**Fearless Wanderer Productions**

A professional LED wall calculator PWA (Progressive Web App) for planning LED video wall installations. Calculate equipment needs, visualize layouts, generate gear lists, and export detailed PDF reports. Works on mobile and desktop with automatic updates.

---

## Table of Contents

1. [Features Overview](#features-overview)
2. [Welcome Page](#welcome-page)
3. [Mobile vs Desktop](#mobile-vs-desktop)
4. [Getting Started](#getting-started)
5. [Header Controls](#header-controls)
6. [Screen Tabs](#screen-tabs)
7. [Panel Type](#panel-type)
8. [Custom Panels](#custom-panels)
9. [Custom Processors](#custom-processors)
10. [Sign In & Cloud Sync](#sign-in--cloud-sync)
11. [Community Sharing](#community-sharing)
12. [Request New Items](#request-new-items)
13. [Dimensions](#dimensions)
14. [Power](#power)
15. [Data](#data)
16. [Structure](#structure)
17. [Cabling](#cabling)
18. [Layout Views](#layout-views)
19. [Canvas View](#canvas-view)
20. [Combined View](#combined-view)
21. [Gear List](#gear-list)
22. [Exports](#exports)
23. [Keyboard Shortcuts](#keyboard-shortcuts)
24. [Supported Panels](#supported-panels)
25. [Supported Processors](#supported-processors)
26. [Tips & Best Practices](#tips--best-practices)

---

## Features Overview

### Core Features
- **Welcome page** — Choose Simple or Complex mode on launch with B.L.I.N.K. branding
- **Multi-screen projects** — Create and manage multiple LED walls in one project
- **Built-in panel library** — 8 pre-configured LED panel types with full specifications
- **Custom panels** — Add your own LED panels with custom specifications
- **Built-in processor library** — 7 pre-configured video processors
- **Custom processors** — Create custom processors with port types, pixel capacity, and distribution box support
- **Power calculations** — Automatic circuit distribution, breaker sizing, phase balancing
- **Data calculations** — Automatic data line routing, port requirements, processor sizing
- **Structure calculations** — Bumper bar distribution, pickup weights, ground support hardware
- **Canvas view** — Multi-screen visualization with drag-and-drop positioning
- **5 layout views** — Standard, Power, Data, Structure, and Gear List
- **5 export formats** — PDF, PNG, email gear list, Resolume XML, .ledconfig files
- **Unit conversion** — Toggle between Imperial (ft/lbs) and Metric (m/kg)
- **Aspect ratio lock** — Auto-calculate dimensions for 16:9, 4:3, or custom ratios
- **Request new items** — Email request system for new panels and processors
- **Automatic updates** — Version checking with update notifications
- **Offline capable** — Works without internet after initial load (PWA)
- **Installable** — Add to home screen on mobile devices

### Cloud Features
- **User accounts** — Sign in with email/password, cloud sync across devices
- **Community sharing** — Share custom panels/processors with the community
- **Device sync** — Custom panels and processors sync across all your devices

### In Development
- **Cabling calculations** — Cable length estimates based on distances
- **Saved projects** — Cloud storage for project configurations

---

## Welcome Page

The app opens to a welcome page every time it loads. The welcome page displays:

- **B.L.I.N.K.** — App title (Build Layout Intelligence for Networked Kits)
- **Simple** button — Opens a streamlined interface with Simple and Canvas tabs
- **Complex** button — Opens the full app with Complex, Combined, Gear, and Canvas tabs
- **Sign In / Sign Out** — Sign in for device sync and community sharing (shows "Sign Out" when logged in)
- **How to Use This App** — Opens an in-app help guide

You can return to the welcome page at any time from the hamburger menu or by pressing the browser back button.

---

## Mobile vs Desktop

The app works on both mobile and desktop devices. Both platforms support Simple and Complex modes.

### Simple Mode
- Condensed specs display with essential information only
- Bottom navigation: **Simple** and **Canvas** tabs
- Power section visible, structure and data direction controls hidden

### Complex Mode
- Full specifications with all data and detailed results
- Bottom navigation: **Complex | Combined**, **Gear**, and **Canvas** tabs
- All sections visible including structure, data direction, and layout views

### Mobile (Touch)
- **Tap once** — Select bumper or element
- **Tap again** — Open options menu (replaces right-click)
- **Hold and drag** — Move bumpers or screens
- **Hamburger menu** — Access all options from the menu icon
- **Pinch zoom** — Zoom in/out on canvas
- **Web Share API** — Native share sheet for PDF, PNG, Resolume, and gear list exports

### Desktop (Mouse)
- **Mouse controls** — Click, drag, right-click for interactions
- **Right-click menus** — Context menus for bumpers and panels
- **Scroll wheel** — Ctrl+scroll to zoom canvas
- **Keyboard shortcuts** — Full keyboard navigation support
- **Hover tooltips** — Additional info on hover

---

## Getting Started

1. **Choose a Mode** — Select Simple or Complex on the welcome page
2. **Select a Panel Type** — Choose your LED panel from the dropdown
3. **Enter Dimensions** — Input panels wide/high or target wall size
4. **Configure Power** — Set voltage, breaker, and phase settings
5. **Configure Data** — Select processor, frame rate, and bit depth
6. **Review Results** — Check the calculated specifications
7. **View Layouts** — Explore Power, Data, and Structure layouts (Complex mode)
8. **Export** — Generate a PDF report, share gear list, or save configuration

---

## Header Controls

- **Load** — Load a previously saved .ledconfig file
- **Save** — Save current configuration (all screens) to a .ledconfig file
- **Menu** — Access settings, custom items, exports, and app info

---

## Screen Tabs

- **Multiple Screens** — Create and manage multiple LED wall screens in one project
- **Add Screen (+)** — Click the + button to add a new screen
- **Switch Screens** — Click on any screen tab to switch between screens
- **Edit Screen** — Click the pencil icon to rename and change screen colors
  - Set primary color (main panel color)
  - Set secondary color (alternating panel color for checkerboard effect)
- **Delete Screen** — Click the X to remove a screen (cannot delete last screen)
- **Screen Colors** — Each screen has unique colors for easy identification in Canvas View

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
- Half Panel Row toggle — Add a row of half-height panels at the bottom
- Connection Method — Choose between Air Frame or Connecting Plates

**DM2.6:**
- Automatically uses connecting plates (2-way and 4-way)

**BM4 (Matte):**
- No bumper support (floor panel)

---

## Custom Panels

Add your own LED panels with custom specifications.

### How to Add a Custom Panel
1. Open the hamburger menu
2. Tap "Add Custom Panel"
3. Fill in the panel specifications:
   - **Brand** — Manufacturer name
   - **Name** — Panel model name
   - **Pixel Pitch** — LED pitch in mm
   - **Width/Height** — Panel dimensions in mm
   - **Depth** — Panel depth in mm
   - **Resolution X/Y** — Pixel count horizontal/vertical
   - **Power Max/Avg** — Power consumption in watts
   - **Brightness** — Brightness in nits
   - **Max Hanging/Stacking** — Structural limits
   - **Weight** — Panel weight in kg
   - **Bumper Weights** — 1W and 2W bumper weights in lbs

### Managing Custom Panels
1. Open hamburger menu
2. Tap "Manage Custom Items"
3. Select "Panels" tab
4. Edit or delete existing custom panels

Custom panels work with all built-in and custom processors for power and data calculations.

---

## Custom Processors

Add your own video processors with custom specifications.

### How to Add a Custom Processor
1. Open the hamburger menu
2. Tap "Add Custom Processor"
3. Fill in the processor specifications:
   - **Brand** — Manufacturer name
   - **Name** — Processor model name
   - **Port Type** — 1G or 10G
   - **Pixels per Port** — Pixel capacity per output port
   - **Frame Rate** — Default frame rate (Hz)
   - **Bit Depth** — Default bit depth
   - **Total Pixels** — Total pixel capacity
   - **Output Ports** — Number of output ports
   - **Direct Connectivity** — Whether the processor connects directly without distribution boxes
   - **Distribution Box** — Optional distribution box configuration (name, ports per box)

### Managing Custom Processors
1. Open hamburger menu
2. Tap "Manage Custom Items"
3. Select "Processors" tab
4. Edit or delete existing custom processors

Custom processors appear in the processor dropdown grouped by brand with a "(Custom)" label.

---

## Sign In & Cloud Sync

Sign in to sync your custom panels and processors across all your devices.

### How to Sign In
1. On the welcome page, tap "Sign In"
2. Enter your email and password
3. If you don't have an account, switch to "Create Account" tab
4. Once signed in, your custom items sync automatically

### Account Features
- **Device sync** — Custom panels and processors sync across all signed-in devices
- **Community sharing** — Share your custom items with other users
- **Password reset** — Reset your password via email link

### Sign Out
- When signed in, the welcome page shows "Sign Out" for quick access
- You can also sign out from the hamburger menu

---

## Community Sharing

Share your custom panels and processors with the community.

### How to Share
1. Create and save a custom panel or processor
2. Open it for editing (Manage Custom Items → Edit)
3. Click the "Share" button (purple)
4. Your item is submitted for approval

### Community Browser
1. Open hamburger menu → "Manage Custom Items"
2. Switch to the "Community" tab
3. Browse approved community panels and processors
4. Click "Add" to download an item to your library

### Community Items
- Community-sourced items appear in dropdowns with a ★ star indicator
- Downloaded community items are saved to your local library
- Items sync to your account if signed in

---

## Request New Items

Want a panel or processor added to the built-in library?

### How to Request
1. Open the hamburger menu
2. Tap "Request New Item"
3. Fill in the brand, model name, and any additional info (spec sheet links, etc.)
4. Tap "Send Request" — this opens your email app with a pre-filled message

---

## Dimensions

### Input Modes
- **Panels** — Enter number of panels wide and high
- **Size** — Enter desired wall width and height (auto-calculates panels needed)

### Unit Systems
- **Imperial** — Feet (ft) and Pounds (lbs)
- **Metric** — Meters (m) and Kilograms (kg)

### Aspect Ratio Lock
Lock the aspect ratio to automatically calculate panels high based on panels wide:
- **None** — No aspect ratio lock (manual entry)
- **16:9** — Standard widescreen ratio
- **4:3** — Traditional video ratio
- **Custom** — Enter your own width:height ratio

When an aspect ratio is selected, entering panels wide will automatically calculate panels high based on the panel's pixel dimensions to best match the target ratio.

---

## Power

- **Voltage** — Input voltage (110V, 120V, 208V, 220V, 230V, 240V)
- **Breaker** — Breaker amperage (15A, 20A, 30A, 50A, 60A)
- **Phase** — 1-phase or 3-phase power
- **Power Basis:**
  - **Max** — Calculate using maximum power consumption (recommended)
  - **Average** — Calculate using average power consumption
- **Max/Circuit** — Override maximum panels per circuit (leave blank for auto)

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
- Custom processors (user-created)

### Settings
- **Frame Rate** — 24Hz, 25Hz, 30Hz, 50Hz, 60Hz, 120Hz
- **Bit Depth** — 8-bit, 10-bit, 12-bit
- **Max/Data** — Override maximum panels per data line (leave blank for auto)

### Data Direction (Complex Mode)
- **Top→Bottom** — Serpentine routing starting from top
- **Bottom→Top** — Serpentine routing starting from bottom
- **All from Top** — All data lines start from top
- **All from Bottom** — All data lines start from bottom

### Options (Complex Mode)
- **Arrows** — Show/hide data routing arrows on layouts
- **Data Redundancy** — Enable redundant data routing (doubles ports needed)
- **Processor Redundancy** — Double the processor count for backup

### NovaStar MX40 Pro Connection Modes

**Direct Mode:**
- 20 outputs directly on the processor
- Without redundancy: 20 main data lines
- With redundancy: 10 main + 10 backup (max 10 data lines with backup)
- No CVT distribution boxes needed

**Indirect Mode (CVT Boxes):**
- Uses CVT-10 Pro distribution boxes
- Each CVT box has 10 outputs
- Without redundancy: 10 main data lines per CVT
- With redundancy: 5 main + 5 backup per CVT
- Each MX40 Pro can drive up to 4 CVT boxes (40 total outputs, or 20 with redundancy)

Processor count is automatically calculated based on total pixel count and port requirements.

---

## Structure

### Configuration Types (Complex Mode)
- **Hanging** — Wall is flown/rigged from above
- **Ground Stack** — Wall is stacked on the ground with support

### Bumper Controls
- **Bumpers Toggle** — Enable/disable bumper bars
- **4-Way Bumpers** — Use 4-way bumpers (CB5 only)
- **Auto-distribution** — Bumpers automatically distribute across wall width
- **Manual mode** — Manually position and adjust bumpers

### Bumper Interactions
- **Desktop:** Right-click bumpers for options (change type, delete)
- **Mobile:** Tap to select, tap again for options, hold and drag to move
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

- **Trim Height** — Height from floor to top of wall
- **Wall to Floor** — Distance from bottom of wall to floor
- **Distro to Wall** — Distance from power distribution to wall
- **Proc to Wall** — Distance from processor to wall
- **FOH to Proc** — Distance from Front of House to processor

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

Multi-screen canvas visualization for positioning multiple LED walls.

### Canvas Size Presets
- 4K UHD (3840×2160)
- 4K DCI (4096×2160)
- HD (1920×1080)
- Custom dimensions

### Position Controls
- **X Pos** — Horizontal position in pixels
- **Y Pos** — Vertical position in pixels
- **Fine (px)** — Arrow key increment amount
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

## Combined View

View and manage multiple screens together in a unified interface.

### Screen Selection
- Select which screens to include in the combined view
- Click screen buttons to toggle selection
- All selected screens are displayed together

### Combined Standard Layout
- View all selected screens in one layout
- **Zoom Controls** — Zoom in/out (50%-200%) to see detail or overview
- **Manual Adjust** — Enable to drag screens to custom positions
- **Reset** — Reset all positions and zoom to defaults

### Panel Selection (Multi-Screen)
- Click panels to select/deselect across any screen
- Ctrl/Cmd+click for multi-select
- Drag to rectangle-select multiple panels
- Right-click selected panels for circuit/data assignment

### Combined Specs
- Aggregated specifications across all selected screens
- Total panels by type
- Combined power, weight, and dimension totals
- Total data lines and amp calculations

### Additional Combined Layouts
- **Power Layout** — Combined power distribution view
- **Data Layout** — Combined data routing view
- **Structure Layout** — Combined structure/bumper view

---

## Gear List

Comprehensive equipment summary organized by category.

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

## Exports

### PDF Export
Generate a professional multi-page PDF report containing:
- **Per screen:** Wall specs, power requirements, data specs, structure details, visual layouts
- **Summary pages:** Configuration overview, complete gear list, canvas view
- **Options:** Eco-friendly mode (lighter colors), greyscale mode

### PNG/JPEG Export
Export the canvas view as an image file at full resolution. On mobile, uses the native share sheet.

### Email Gear List
Share the gear list via email with a formatted breakdown of all equipment, rigging, and cabling organized by screen. On mobile, uses the native share sheet.

### Resolume XML Export
Export screen configurations as Resolume Arena 7 compatible XML files for LED mapping.

### Configuration Files
- **Save** — Export all screens as a .ledconfig file
- **Load** — Import a previously saved .ledconfig file to restore all screen configurations

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo (panels, bumpers, canvas moves) |
| Ctrl+Y | Redo |
| Delete | Remove selected panels |
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
| Brompton S8 | 8 | 0 | 2,304,000 | — |
| Brompton M2 | 2 | 0 | 2,304,000 | — |
| Brompton S4 | 4 | 0 | 2,304,000 | — |
| Brompton T1 | 1 | 0 | 2,304,000 | — |
| Brompton SQ200 | 4 | 0 | 4,000,000 | — |
| NovaStar MX40 Pro | 40 | 4 | 2,600,000 | CVT Box (10 ports) |

---

## Tips & Best Practices

1. **Start with Panel Type** — Select your panel first as it affects all calculations
2. **Use Data Redundancy** — Enabled by default for professional installations
3. **Check Power Calculations** — Verify circuit counts match your available power
4. **Review Structure Layout** — Confirm pickup weights are within rigging limits
5. **Export PDF** — Always generate a PDF for documentation and sharing
6. **Save Configurations** — Save your work frequently using the Save button
7. **Use Multiple Screens** — Organize complex setups with multiple screen tabs
8. **Add Custom Panels** — Create custom panels for any LED product not in the library
9. **Add Custom Processors** — Create custom processors for any video processor not in the library

---

## Contact

For support or feature requests, contact Fearless Wanderer Productions.

Email: gablabrecque@gmail.com

---

## License

This software is proprietary. All rights reserved.

The source code, design, and content of B.L.I.N.K. are the intellectual property of Gabriel Labrecque / Fearless Wanderer Productions. Unauthorized copying, modification, distribution, or use is strictly prohibited.

For commercial licensing inquiries, see [LICENSE-COMMERCIAL.txt](./LICENSE-COMMERCIAL.txt) or contact [gablabrecque@gmail.com](mailto:gablabrecque@gmail.com).
