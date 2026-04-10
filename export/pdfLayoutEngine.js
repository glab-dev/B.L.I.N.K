// ==================== PDF LAYOUT ENGINE ====================
// Shared layout calculation module used by pdf.js and pdf-preview.js.
// Provides design tokens, grid scaling, structure table packing,
// and page composition logic. Does NOT render anything itself.

// ==================== DESIGN TOKENS ====================

const PDF_TOKENS = {
  colors: {
    headerBg:        '#1a3a2a',  // dark green — B.L.I.N.K. REPORT header bar
    sectionHeaderBg: '#2d6b4a',  // medium green — gear list section headers
    sectionBodyBg:   '#f8f8f5',  // off-white — gear list section bodies
    sectionBorder:   '#e5e5e0',  // light gray — section body border
    summaryBg:       '#f5f5f0',  // light warm gray — summary column background
    summaryAccent:   '#2d8a5e',  // green — summary column header accent line
    textPrimary:     '#222222',  // near-black — main text
    textSecondary:   '#444444',  // dark gray — body text
    textItem:        '#333333',  // dark gray — gear list line items
    textMuted:       '#888888',  // medium gray — labels/captions
    textFaint:       '#aaaaaa',  // light gray — page numbers
    headerText:      '#ffffff',  // white — text on header and section bars
  },
  typography: {
    headerTitle:  { size: 11, bold: true  },  // "B.L.I.N.K. REPORT"
    screenLabel:  { size: 11, bold: true  },  // "SCREEN 1"
    summaryLabel: { size: 9,  bold: true  },  // column headers: PANEL, WALL, etc.
    summaryBody:  { size: 8               },  // spec values in summary bar
    sectionHdr:   { size: 9,  bold: true  },  // gear list section header text
    sectionItem:  { size: 8.5             },  // gear list line items
    gridLabel:    { size: 10, bold: true  },  // "POWER LAYOUT", "DATA LAYOUT"
    resolutionLbl:{ size: 9               },  // "1920 × 1080 px" below grid
    pageFooter:   { size: 8               },  // "Page X of Y"
  },
  // All spacing values in pdfmake points (1 pt = 1/72 inch ≈ 0.353 mm)
  layout: {
    pageMarginLeft:   28,   // pt — left/right page margins
    pageMarginRight:  28,   // pt
    pageMarginTop:    28,   // pt
    pageMarginBottom: 16,   // pt
    headerBarH:       26,   // pt — B.L.I.N.K. REPORT header bar height
    screenLabelH:     18,   // pt — "SCREEN 1" label height
    sectionLabelH:    20,   // pt — "POWER LAYOUT" / "DATA LAYOUT" label height
    legendH:          32,   // pt — power or data legend estimated height
    resolutionLblH:   14,   // pt — resolution label below standard grid
    summaryBarH:      72,   // pt — 4-col summary bar for simple mode (~5 rows)
    summaryBarHExp:   100,  // pt — 4-col summary bar for complex mode (~8 rows)
    footerH:          14,   // pt — "Page X of Y" footer
    afterHeaderGap:   8,    // pt — gap below header bar
    afterLabelGap:    6,    // pt — gap below section labels
    columnGap:        8,    // pt — gap between summary columns
    sectionGap:       6,    // pt — gap between gear list sections
  }
};

// ==================== PAGE DIMENSIONS ====================

/**
 * Returns page dimensions and usable content area in pdfmake points.
 * @param {string} format - 'a4' or 'letter'
 * @param {string} orientation - 'p' (portrait) or 'l' (landscape)
 * @returns {{ pageWidth, pageHeight, contentWidth, usableHeight }}
 */
function pdfGetPageDimensions(format, orientation) {
  const isLandscape = orientation === 'l';
  const isLetter    = format === 'letter';
  const w = isLandscape ? (isLetter ? 792 : 842) : (isLetter ? 612 : 595);
  const h = isLandscape ? (isLetter ? 612 : 595) : (isLetter ? 792 : 842);
  const m = PDF_TOKENS.layout;
  return {
    pageWidth:    w,
    pageHeight:   h,
    contentWidth: w - m.pageMarginLeft - m.pageMarginRight,
    usableHeight: h - m.pageMarginTop  - m.pageMarginBottom,
  };
}

// ==================== GRID SCALING ====================

/**
 * Calculates how to scale a panel grid to fill available space
 * while preserving aspect ratio. Works in any consistent unit (pt, mm, px).
 *
 * @param {number} panelsWide     - columns of panels
 * @param {number} panelsHigh     - rows of panels (use fractional for CB5 half-row)
 * @param {number} availableWidth - available width
 * @param {number} availableHeight- available height
 * @returns {{ renderWidth, renderHeight, offsetX }}
 */
function calculateGridScale(panelsWide, panelsHigh, availableWidth, availableHeight) {
  if (!panelsWide || !panelsHigh || panelsWide <= 0 || panelsHigh <= 0) {
    return { renderWidth: availableWidth, renderHeight: availableHeight, offsetX: 0 };
  }

  const aspectRatio = panelsWide / panelsHigh;

  let renderWidth  = availableWidth;
  let renderHeight = renderWidth / aspectRatio;

  if (renderHeight > availableHeight) {
    renderHeight = availableHeight;
    renderWidth  = renderHeight * aspectRatio;
  }

  const offsetX = (availableWidth - renderWidth) / 2;
  return { renderWidth, renderHeight, offsetX };
}

// ==================== STRUCTURE TABLE PACKING ====================

/**
 * Assigns structure tables into columns using shortest-column-first algorithm.
 * Maintains source order within each column.
 *
 * @param {Array<{label: string, rows: Array}>} tables - structure tables from calculation engine
 * @param {number} maxCols - maximum columns (default 3)
 * @returns {Array<Array>} - array of columns; each column is an array of table objects
 */
function packStructureTables(tables, maxCols) {
  maxCols = maxCols || 3;
  if (!tables || tables.length === 0) return [];

  const numCols = Math.min(tables.length, maxCols);
  const columns = [];
  for (let i = 0; i < numCols; i++) {
    columns.push({ tables: [], totalHeight: 0 });
  }

  function estimateTableHeight(table) {
    // header bar (20pt) + each row (12pt each)
    return 20 + ((table.rows ? table.rows.length : 0) * 12);
  }

  tables.forEach(function(table) {
    // Find shortest column
    let shortestIdx = 0;
    for (let i = 1; i < numCols; i++) {
      if (columns[i].totalHeight < columns[shortestIdx].totalHeight) {
        shortestIdx = i;
      }
    }
    columns[shortestIdx].tables.push(table);
    columns[shortestIdx].totalHeight += estimateTableHeight(table);
  });

  return columns.map(function(c) { return c.tables; });
}

// ==================== PAGE COMPOSITION ====================

/**
 * Determines whether the four layout diagrams (power, data, structure, cabling)
 * can all fit on a single page instead of two separate pages.
 *
 * Wide/short walls (e.g., 17×7) render as flat strips and leave lots of vertical
 * space. Square/tall walls (e.g., 10×10) fill more vertical space and need two pages.
 *
 * @param {number} pw   - panels wide
 * @param {number} ph   - panels high
 * @param {string} format      - 'a4' or 'letter'
 * @param {string} orientation - 'p' or 'l'
 * @param {number} structureTablesPt - estimated height of structure tables in pt (optional)
 * @returns {boolean} - true if all four layouts fit on one page
 */
function canCollapseLayoutPages(pw, ph, format, orientation, structureTablesPt) {
  const dims = pdfGetPageDimensions(format || 'a4', orientation || 'p');
  const m    = PDF_TOKENS.layout;
  const cw   = dims.contentWidth;
  const uh   = dims.usableHeight;
  const stH  = structureTablesPt || m.legendH * 2; // fallback estimate

  // Fixed overhead: header + 4 labels + 2 legends (power, data) + structure tables + 2 resolution labels + footer
  const overhead =
    m.headerBarH  + m.afterHeaderGap +
    4 * (m.sectionLabelH + m.afterLabelGap) +
    2 * m.legendH  +
    stH            +
    2 * m.resolutionLblH +
    m.footerH      +
    40; // padding buffer

  if (overhead >= uh) return false;

  const availableForGrids = uh - overhead;

  // Each grid gets 1/4 of the remaining space as its maximum height
  const maxEachGrid = availableForGrids / 4;

  // Calculate actual rendered heights using the aspect ratio
  const { renderHeight: powerH  } = calculateGridScale(pw, ph, cw, maxEachGrid);
  const { renderHeight: dataH   } = calculateGridScale(pw, ph, cw, maxEachGrid);
  const { renderHeight: structH } = calculateGridScale(pw, ph, cw, maxEachGrid * 1.2);

  // Cabling diagram is typically very wide (approx 3:1 aspect ratio)
  const cablingAspect = 3.0;
  const cablingH = Math.min(cw / cablingAspect, maxEachGrid);

  const totalUsed = overhead + powerH + dataH + structH + cablingH;
  return totalUsed <= uh;
}

/**
 * Returns the page plan for a single screen in complex mode.
 * Determines how many pages the screen will use and whether layout pages collapse.
 *
 * @param {number} pw   - panels wide
 * @param {number} ph   - panels high
 * @param {object} opts - toggle options { specs, gearList, standard, power, data, structure, cabling }
 * @param {string} format      - 'a4' or 'letter'
 * @param {string} orientation - 'p' or 'l'
 * @returns {{ pageCount, collapseLayouts }}
 */
function buildComplexPagePlan(pw, ph, opts, format, orientation) {
  const hasHero    = opts.specs || opts.standard;
  const hasLayouts = opts.power || opts.data || opts.structure || opts.cabling;

  // Landscape uses adaptive multi-column packing — different page counts
  if (orientation === 'l') {
    const panels = pw * ph;
    const gw = pw * 28;
    let lsCls = 'large';
    if (panels <= 15 && gw <= 170)      lsCls = 'tiny';
    else if (panels <= 20 && gw <= 200) lsCls = 'small';
    else if (panels <= 40 && gw <= 260) lsCls = 'medium';

    let lsPages = 0;
    if (hasHero)      lsPages++;
    if (opts.gearList) lsPages++;
    if (hasLayouts) {
      if (lsCls === 'tiny')   lsPages += 1; // all layouts on 1 page
      if (lsCls === 'small')  lsPages += 2; // 3-up + struct/cable
      if (lsCls === 'medium') lsPages += 2; // canvas+2up + struct/cable
      if (lsCls === 'large')  lsPages += 3; // canvas, power+data, struct+cable
    }
    return { pageCount: lsPages, collapseLayouts: lsCls === 'tiny' };
  }

  // Portrait: existing logic unchanged
  let pageCount = 0;
  if (hasHero)      pageCount++;
  if (opts.gearList) pageCount++;

  if (hasLayouts) {
    const collapseLayouts = canCollapseLayoutPages(pw, ph, format, orientation, null);
    if (collapseLayouts) {
      pageCount++;
    } else {
      const hasPowerData    = opts.power || opts.data;
      const hasStructCabling = opts.structure || opts.cabling;
      if (hasPowerData)     pageCount++;
      if (hasStructCabling) pageCount++;
    }
    return { pageCount, collapseLayouts };
  }

  return { pageCount, collapseLayouts: false };
}

/**
 * Estimates the height (in pt) of a 4-column summary bar.
 * @param {string} mode - 'simple' or 'complex'
 * @returns {number} estimated height in points
 */
function estimateSummaryBarHeight(mode) {
  // simple: ~5 data rows per column; complex: ~9 data rows per column
  const rows = (mode === 'complex') ? 9 : 5;
  return rows * 11 + 24; // 11pt per row + label + padding
}
