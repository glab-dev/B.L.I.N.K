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
17. [Layout Views](#layout-views)
18. [Canvas View](#canvas-view)
19. [Raster](#raster)
20. [Combined View](#combined-view)
21. [Cable Tab](#cable-tab)
22. [Exports](#exports)
23. [Test Pattern Generator](#test-pattern-generator)
24. [Keyboard Shortcuts](#keyboard-shortcuts)
25. [Supported Panels](#supported-panels)
26. [Supported Processors](#supported-processors)
27. [Tips & Best Practices](#tips--best-practices)

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
- **Cabling calculations** — Cable routing diagram with distance inputs and automatic cable length calculation
- **Canvas view** — Multi-screen visualization with drag-and-drop positioning
- **Raster mode** — Canvas mapping for LED raster workflows with spreadsheet-style screen table
- **6 layout views** — Standard, Power, Data, Structure, Combined, and Cable
- **SOCA circuit grouping** — Group circuits onto SOCA runs, balance phase legs, share a distro across screens
- **Manual assignment** — Assign circuit numbers, SOCA numbers, and data ports by hand
- **Test pattern generator** — Professional test patterns with layers, animations, processor lines, save/load, PNG and MP4 export
- **Export formats** — PDF report, PNG/JPEG, MP4, gear list (text or email), Resolume XML, and .blinkled / .blinkrast / .blinktp files
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
- **Saved projects** — Cloud storage for project configurations

---

## Welcome Page

The app opens to a welcome page every time it loads. The welcome page displays:

- **B.L.I.N.K.** — App title (Build Layout Intelligence for Networked Kits)
- **Simple** button — Opens a streamlined interface with Simple and Canvas tabs
- **Complex** button — Opens the full app with Complex, Combined, Cable, and Canvas tabs
- **Raster** button — Opens canvas mapping mode for LED raster workflows
- **Test Pattern** button — Opens the test pattern generator
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
- Bottom navigation: **Complex | Combined**, **Cable**, and **Canvas** tabs
- All sections visible including structure, data direction, and layout views

### Mobile (Touch)
- **Select Mode** — Panel and bumper selection is off until you enable Select Mode above the layout, so scrolling never selects by accident
- **Tap once** — Select bumper or element (with Select Mode on)
- **Tap again** — Open options menu (replaces right-click)
- **Hold and drag** — Move bumpers or screens
- **Hamburger menu** — Access all options from the menu icon
- **Pinch zoom** — Zoom in/out on canvas
- **Web Share API** — Native share sheet for PDF, PNG, Resolume, and gear list exports

### Desktop (Mouse)
- **Mouse controls** — Click, drag, right-click for interactions
- **Drag-box select** — Drag across the layout to select a region of panels
- **Right-click menus** — Context menus for bumpers and panels
- **Scroll wheel** — Ctrl+scroll to zoom canvas
- **Keyboard shortcuts** — Full keyboard navigation support
- **Hover tooltips** — Additional info on hover

---

## Getting Started

1. **Choose a Mode** — Select Simple or Complex on the welcome page
2. **Select a Panel Type** — Choose your LED panel from the dropdown
3. **Enter Dimensions** — Input panels wide/high, target wall size, or target pixel count
4. **Configure Power** — Set voltage, breaker, and phase settings
5. **Configure Data** — Select processor, frame rate, and bit depth
6. **Review Results** — Check the calculated specifications
7. **View Layouts** — Explore Power, Data, and Structure layouts (Complex mode)
8. **Export** — Generate a PDF report, share gear list, or save configuration

---

## Header Controls

- **Home** — Return to the welcome page
- **Recents** — Reopen a recent project; loaded files keep their saved file name
- **Quick Save** — Save over the current project without a dialog
- **Export** — Open the export menu (PDF Report, Canvas, Test Pattern, Gear List, Export All)
- **Menu** — Access settings, custom items, exports, and app info

### Menu Sections
- **Configuration** — Save, Save As, Load, Recent, Export, Send to Jared
- **Custom Items** — Add Panel, Add Processor, Manage Items, Requests
- **Inventory** — Gear Code Mapping, to map gear to your own inventory codes
- **Power** — Distro Wiring, to set which leg (X / Y / Z) each SOCA circuit is wired to
- **Install** — Install B.L.I.N.K. as an app where the browser supports it
- **Release Notes** — "What's New" from the welcome page footer, also shown once per update

---

## Screen Tabs

- **Multiple Screens** — Create and manage multiple LED wall screens in one project
- **Add Screen (+)** — Click the + button to add a new screen
- **Switch Screens** — Click on any screen tab to switch between screens
- **Edit Screen** — Click the pencil icon to rename, recolor, duplicate, or reset a screen
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
- **Pixels** — Enter target pixel width and height (auto-calculates panels needed)

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
- **Derate** — Apply the NEC 80% continuous-load derate to circuit capacity
- **Max/Circuit** — Override maximum panels per circuit (leave blank for auto)

### Power Calculations
- Automatic circuit distribution based on panel power draw
- Phase balancing for 3-phase systems
- Safety margins applied to all calculations

### Circuits & SOCA (Complex Mode)
A SOCA groups circuits onto one multi-circuit cable run. Controls sit above the Power layout:
- **SOCA Outlines** — Draw a border around the panels each SOCA feeds
- **SOCA Label** — Show the SOCA name across its panels
- **SOCA Naming** — Number the SOCAs (123) or letter them (ABC)
- **Phase Balance** — Even the load across legs; a legend below the layout shows the result
- **Color by Leg** — Color panels by phase leg instead of by circuit
- **Share Distro** — Chain screens onto one distro so legs balance across the whole group
- **Circuit table** — Lists each SOCA, its circuits, and their loads below the layout

**Manual assignment** — Select panels in the Power layout and use the panel menu for **Assign Circuit #** and **Assign SOCA #**. A manual assignment always wins; Share Distro only auto-fills numbers you have not claimed. Cable lengths and gear counts follow your assignments.

**Distro Wiring** (Menu → Power) — Type the leg(s) each SOCA circuit is wired to. 120 V circuits sit on one leg (e.g. `X`), 208 V circuits bridge two (e.g. `XY`). Blank cells use the standard rotation.

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
- **Frame Rate** — 24Hz, 25Hz, 30Hz, 50Hz, 60Hz
- **Bit Depth** — 8-bit, 10-bit, 12-bit
- **Max/Data** — Override maximum panels per data line (leave blank for auto)

### Data Direction (Complex Mode)
- **Top→Bottom** — Serpentine routing starting from top
- **Bottom→Top** — Serpentine routing starting from bottom
- **All from Top** — All data lines start from top
- **All from Bottom** — All data lines start from bottom

### Options (Complex Mode)
- **Arrows / Flip** — Show/hide data routing arrows, or flip their direction
- **View** — Front View or Rear View (mirrors the routing for cabling from behind)
- **Data Labels** — Number each data line on the panels
- **Data Redundancy** — Enable redundant data routing (doubles ports needed)
- **Processor Redundancy** — Double the processor count for backup

### Data Lines & Ports (Complex Mode)
- **Data Line Map** — Table below the Data layout with Line, Panel, Unit, and Port columns
- **Assign Data Port** — Select panels and use the panel menu to set the processor, distribution box, and port for a line. Processor and box accept a letter or a number; Auto leaves the app to pick.
- The app warns before taking a port another line already holds, and manual assignments drive gear list counts
- With Data Redundancy on, the map also shows each line's backup destination, and those loop-back ports appear in the PDF
- **Connection Mode** — Per screen, run a processor direct or through its distribution box

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

## Layout Views

**Select Mode** — Panel selection is off until you turn Select Mode on above the layout. It applies to the Standard, Power, Data, and Combined layouts; bumpers have their own Select Mode in Structure. Use the ▼ button on a layout title to collapse or expand it.

### Standard Layout
- Shows panel grid with checkerboard coloring
- Click panels to delete/restore them
- Assign circuits, SOCAs, or data lines from the panel menu
- Undo/Redo support for panel changes
- Deleted panels shown as dotted outlines
- Panel coordinates displayed on hover

### Power Layout
- Shows power circuit distribution
- Each circuit color-coded
- Displays circuit numbers on panels
- SOCA outlines, SOCA labels, and SOCA naming (123 or ABC)
- Phase Balance, Color by Leg, and Share Distro toggles
- Circuit table listing each SOCA, its circuits, and their loads
- Serpentine circuit routing visualization

### Data Layout
- Shows data routing paths
- Serpentine pattern visualization
- Data line numbers displayed
- Front View / Rear View toggle
- Arrows show signal direction (if enabled), with a Flip option
- Data Labels toggle, plus the data line map with Line, Panel, Unit, and Port columns
- Port assignments visible, including backup destinations when redundancy is on

### Structure Layout
- Shows bumper bar positions and types
- Pickup point indicators with weights
- Weight distribution per pickup point
- Connecting plates count (if applicable)
- Ground support hardware visualization
- Manual mode for custom bumper placement
- Red centre-of-wall mark

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

### Screens Table
The Canvas page shows the same spreadsheet-style table as Raster mode — a row per screen with:
- **Name**, **Color 1 / Color 2**, **Panel** type
- **Tile X / Tile Y** — Panel pixel resolution
- **Cols / Rows** — Panels wide and high
- **Offset X / Offset Y** — Pixel position on the canvas
- **Overlays** — Per-screen X/Y coordinates, pixel dimensions, and crosshair
- **Active** — Show/hide the screen on the canvas
- **Duplicate** — Copy a screen row

### Canvas Tabs
- **Add Canvas (+)** — Add more than one canvas when your screens don't all fit on one
- Each canvas keeps its own size, positions, and visible screens

### Header/Footer Band
- **Enable** — Add a title block band to the canvas
- **Position** — Header or footer
- **Band Height** — Height of the band

### Export Options
- Format: PNG, JPEG, or Resolume XML
- Scope: the whole canvas, or each screen at its native resolution
- Custom filename support
- Exports at full resolution

---

## Raster

Canvas mapping mode for LED raster workflows. Access from the "Raster" button on the welcome page.

### Screen Table
A spreadsheet-style table to manage all screens at once:
- **Name** — Editable screen name
- **Color 1 / Color 2** — Per-screen panel colors
- **Panel** — Select panel type (built-in or custom) per screen
- **Tile X / Tile Y** — Panel pixel resolution (read-only, from panel specs)
- **Cols / Rows** — Number of panels wide and high
- **Offset X / Offset Y** — Pixel position on the canvas
- **Overlays** — Per-screen toggles for X/Y coordinates, pixel dimensions, and crosshair
- **Active** — Show/hide individual screens on the canvas
- **+ Add Screen** — Add new screens with built-in or custom panels

### Toolbar
- **Filename** — Custom filename for exports
- **Save / Load** — Save and load .blinkrast project files
- **Canvas Size** — 4K UHD, 4K DCI, HD, or Custom dimensions
- **X/Y Pos** — Pixel position of selected screen
- **Fine (px)** — Arrow key increment for precise adjustments
- **Snap** — Toggle snapping to other screens and canvas edges
- **Format** — PNG, JPEG, or Resolume export
- **Export** — Save the canvas at full resolution

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
- **Select Mode** — Turn it on before selecting panels, same as the Complex layouts
- Click panels to select/deselect across any screen
- Ctrl/Cmd+click for multi-select
- Drag to rectangle-select multiple panels
- Right-click selected panels to assign circuits, SOCAs, or data ports, or to reset that layout

### Combined Specs
- Aggregated specifications across all selected screens
- Total panels by type
- Combined power, weight, and dimension totals
- Total data lines and amp calculations
- SOCA and data line counts per screen

### Multi-Screen Power & Data
- **Share Distro** and **Phase Balance** — Balance legs across every selected screen at once
- **Per-screen processor pickers** — Set processor and distribution box per screen, or apply one to all
- Each screen keeps its own connection mode

> Projects saved before the combined view existed open with nothing selected — pick your screens to build the arrangement.

### Additional Combined Layouts
- **Power Layout** — Combined power distribution view, with SOCA outlines and labels
- **Data Layout** — Combined data routing view, labelled per screen by processor or distribution box
- **Structure Layout** — Combined structure/bumper view
- **Cable Layout** — Combined cable diagram and cable list

---

## Cable Tab

Cabling calculations, cable layout diagram, and gear list. Available in Complex mode via the **Cable** tab in the bottom navigation.

### Cabling Inputs
- **General** — Wall to Floor distance, Cable Pick height, Cable Drop position (Behind, SR, SL)
- **Power** — Distro to Drop distance, Power In position (Top, Bottom)
- **Data** — Proc to Drop distance, Server to Proc distance, Dist Box on-wall toggle with main/backup position controls (SR/C/SL, Top/Bottom)

### Cable Diagram
- Front-view layout showing cable routing from LED wall to processor and power distribution
- Updates automatically when cabling inputs change

### Gear List
Comprehensive equipment summary organized by category:
- **Equipment** — Panels (count, weight), processors (type, quantity), distribution boxes
- **Rigging** — Bumper bars by type (1W, 2W, 4W), connecting plates, ground support hardware
- **Cabling** — Data, power, and signal cables with calculated lengths and standard sizes

---

## Exports

### Export Menu
The header Export icon opens a menu with:
- **PDF Report** — Opens the print preview
- **Canvas** — PNG, native resolution, outline, title block, or Resolume
- **Test Pattern** — PNG image or MP4 video
- **Gear List** — Text file or Send to Jared
- **Export All** — Every format at once, zipped

### PDF Export
Generate a professional multi-page PDF report containing:
- **Per screen:** Wall specs, power requirements, data specs, structure details, visual layouts
- **Summary pages:** Configuration overview, complete gear list, canvas view
- **Section toggles:** Choose which layouts and pages are included
- **Page Size:** A4 or Letter
- **Orientation:** Portrait or Landscape
- **SOCA Outlines / SOCA Label:** Toggle for the power pages
- **Logo:** Upload a logo for the title block
- **Print colours:** Eco Friendly (lighter colors) or Greyscale

The preview *is* the PDF — what you see in the preview is byte-for-byte what exports.

### PNG/JPEG Export
Export the canvas view as an image file at full resolution, or each screen at its native resolution. On mobile, uses the native share sheet.

### Gear List
Export the gear list as a text file, or send it by email with a formatted breakdown of all equipment, rigging, and cabling organized by screen. On mobile, uses the native share sheet.

### Resolume XML Export
Export screen configurations as Resolume Arena 7 compatible XML files for LED mapping.

### Configuration Files
- **Save** — Export all screens as a .blinkled file
- **Load** — Import a previously saved .blinkled file to restore all screen configurations
- **.blinkrast** — Raster mode projects
- **.blinktp** — Test pattern projects

---

## Test Pattern Generator

Generate professional test pattern images and videos for LED walls and displays. Access from the "Test Pattern" button on the welcome page.

### Configuration (Column 1)
- **Image Name** — Custom label displayed on the pattern
- **Display Size [px]** — Single display resolution in pixels (e.g. 1920×1080)
- **Displays** — Number of displays in the grid (up to 12×12)
- **Total Size [px]** — Auto-calculated total pixel resolution (Display Size × Displays)
- **Quick Patterns** — One-tap presets: SMPTE, Grid, Checker, Gradient, Strobe, Solid
- **Processor Lines** — Toggle + canvas size selector (4K UHD, 4K DCI, HD, or custom) to show where processor canvas boundaries fall on the pattern, with configurable line color

### Background (Column 2)
- **BG Color** — Background fill color picker
- **Checker** — Toggle checker pattern overlay with size slider, opacity slider, and dual color pickers
- **Checker Border** — Toggle border checker pattern with size slider, opacity slider, and dual color pickers
- **Solid Color** — Fill the whole pattern with one color for uniformity checks
- **Gradient** — Gradient wash with direction control for banding checks

### Visual Controls (Column 2)
- **Grid Size** — Adjustable grid square size (slider, 0–100%)
- **Grid Line Width** — Thickness of grid lines (slider, 0–100%)
- **Text Size** — Size of overlay text labels (slider, 0–100%)
- **Color Pickers** — Grid, text, crosshair, display boundary colors

### Toggle Elements (Column 3)
- **Name** — Show/hide the image name label
- **Pixel Size** — Show/hide the pixel dimensions
- **Ratio** — Show/hide the aspect ratio
- **Squares** — Show/hide grid square count
- **Circles** — Show/hide alignment circles, with spin mode (static, spin center, spin corners, spin all), matching reverse modes, and speed control
- **Color Bars** — Color calibration bars with mode selector (default, center circle, corner circles, all circles, corners + center) and opacity slider
- **Cross / Cross Outline** — Show/hide the center cross and its outline
- **Displays** — Show/hide the per-display boundary lines

### Logo & BG Image (Column 4)
- **Logo** — Upload custom logo with size slider, opacity slider, placement mode (default/circle), and static option
- **BG Image** — Upload a background image that scales to fill the pattern

### Sweep Animation (Column 4)
- **Sweep** — Animated sweep for testing display sync
- **Style** — Default, Horz, Vert, Radar, or Circle
- **H/V Colors** — Independent color pickers for horizontal and vertical sweeps
- **Duration** — Sweep cycle duration (1–30 seconds)
- **Width** — Sweep line width (0.5–10%)

### Strobe & Scroll
- **Strobe** — Full-field strobe with speed and intensity sliders
- **Scroll** — Diagonal scroll with speed, plus a bounce mode with its own speed

### Layers
- **Layers button** — Opens a drag-and-drop panel to reorder all visual elements (checker, grid, circles, crosshair, color bars, logo, etc.)
- **Fixed layers** — Background fill is always bottom; coordinate labels and center text are always top
- **Reorderable** — 12 middle layers can be dragged above or below each other

### Save / Load
- **Save Pattern** — Save all settings (including images) to a .blinktp file
- **Load Pattern** — Load a previously saved .blinktp file to restore all settings
- **Toolbar buttons** — Quick save/load buttons in the header toolbar
- **Hamburger menu** — Save Pattern / Load Pattern menu items

### Live Output
- **Live Out** — Open a popup window that mirrors the test pattern canvas in real-time
- **Fullscreen** — Press F or double-click to enter fullscreen mode for display testing
- **Cursor auto-hide** — Cursor hides automatically after 2 seconds of inactivity

### Export
- **Export PNG** — Save the test pattern at full resolution
- **Export MP4** — Export animated patterns (sweep, spinning circles) as MP4 video with configurable framerate (23.98–120 fps)

### Toolbar & Header
- **Undo / Redo** — Full undo/redo history for all changes
- **Reset** — Restore all settings to defaults
- **Save / Load** — Quick file save/load buttons
- **Share** — Quick share popup with PNG and MP4 export
- **Layers** — Open the layer reorder panel
- **Home** — Return to the welcome page
- **Menu** — Hamburger menu with exports, save/load, framerate, and reset

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
| Brompton M2 | 4 | 0 | 2,304,000 | — |
| Brompton S4 | 4 | 0 | 2,304,000 | — |
| Brompton T1 | 1 | 0 | 2,304,000 | — |
| Brompton SQ200 | 8 | 0 | 4,000,000 | Dual 100G QSFP28 |
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
