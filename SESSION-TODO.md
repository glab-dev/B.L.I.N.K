# Session TODO

> Claude reads this at session start and updates it during work.
> This file is gitignored — it stays local.

## Current Session
_Updated: 2026-02-09_

### In Progress
- [ ] _None_

### Up Next

#### Quick Fixes
- [x] **Fix mobile welcome page title size** — Restored to fixed 64px (was clamp(36px, 10vw, 64px))
- [ ] **Restore mobile welcome page container** — Re-wrap title, description, buttons, and footer in their original container div (mobile only)
- [x] **Add bumper weights to InfiLED AMT8.3** — Set to estimated 20 lbs (1W) / 40 lbs (2W). **Still need to verify with actual INFiLED spec sheet**
- [x] **Gear list auto-populate on show file load** — Fixed: now loops through all screens after load to populate calculatedData before gear list renders

#### Features
- [x] **Add Open Graph meta tags for link previews** — Added OG + Twitter Card tags to `<head>`. Image URL points to `og-image.png` (not yet created)
- [ ] **Create og-image.png** — Design a 1200x630px branded social card for link previews (dark theme, B.L.I.N.K. logo, green accent). Commit to project root so Netlify serves it at `blink-led.com/og-image.png`
- [ ] **Cable layout visualization in gear tab** — Collapsible visual in the cabling section showing cable routes (data + power), processor/distro boxes as colored labeled squares, and cable measurements (wall-to-floor, cable pick, wall dimensions)
- [ ] **Welcome page redesign** — Better visuals, updated color palette, more content on desktop, different layouts for mobile vs desktop
- [ ] **Cloud storage & project sync** — Auto-save projects to Supabase, access from any signed-in device, project version history
- [ ] **Continue gear code → RP integration** — Keep building out gear code inventory mapping that exports RP-compatible text files (via "Send to Jared" button)
- [x] **Hamburger menu reorganization + Recents** — Menu now: Save|Load|Recents + Export|Send to Jared. Recents modal shows 5 most recent projects, backed by Supabase `user_projects` table (signed in) with localStorage fallback (offline)
- [ ] **"Raster" page** — New entry point similar to Pixl Grid. Canvas view on top with canvas tabs. Canvas options inline in 1 row underneath. Screen options underneath (1 row per screen, all inline): screen name input, panel dropdown, panel dimensions, X/Y coordinates, XY/pixels/X toggles. Panel dropdown includes "add custom panel" option → simplified custom panel modal (brand, model, pixels wide, pixels high only)
- [ ] **Raster ↔ Simple/Complex custom panel bridge** — If a raster-created custom panel is selected in Simple or Complex mode, show a popup telling the user to input more panel info, user confirms, then redirect to the full custom panel modal

#### QA & Verification
- [ ] **Verify cabling features end-to-end** — Test all cabling calculations, cable lengths, routing, and gear list output across different configurations
- [ ] **Write Playwright tests for backend/Supabase features** — Custom panels/processors offline, project sync across devices, downloaded shared items
- [x] **Audit help modal vs README** — Added all 15 missing sections: Header Controls, Screen Tabs, Panel Type, Custom Panels/Processors, Request Items, Dimensions, Power, Data, Structure, Cabling, Combined View, Exports, Supported Panels/Processors tables
- [ ] **Create Playwright test for full app functionality** — Comprehensive end-to-end test covering all major app features

### Done
- [x] Set up CI/CD workflow improvements
