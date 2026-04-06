// ==================== PDF PRINT PREVIEW ====================
// Full-screen print preview modal with live canvas preview,
// drag-and-drop element repositioning, and PDF generation.

// ==================== STATE ====================

let pdfPageFormat = 'a4';
let pdfPageOrientation = 'p';

// Page dimensions in mm (updated when format/orientation changes)
let ppPageWidth = 210;
let ppPageHeight = 297;
const PP_MARGIN = 10;

// Page model: array of { pageNum, elements[] }
let pdfPageModel = [];

// Preview scale (mm → canvas pixels)
let ppScale = 1;

// Manual Adjust toggle — when false, drag is disabled
let ppManualAdjust = false;

// Drag state
let ppSelectedElement = null; // { pageIndex, elementId }
let ppDragState = {
  isDragging: false,
  startMouseX: 0,
  startMouseY: 0,
  startElemX: 0,
  startElemY: 0,
  pageIndex: -1,
  draggedElement: null
};
const PP_GRID_SIZE = 2; // mm snap grid

// Cached canvas images (captured once when modal opens, recaptured on print mode change)
let ppCanvasCache = {};

// Track current print mode for recapture detection
let ppCurrentEco = false;
let ppCurrentGreyscale = false;

// Zoom level (1.0 = fit to width, adjustable via +/- buttons)
let ppZoomLevel = 1.0;

// Accent color for banners/headers — set by buildPageModel() based on eco/greyscale mode
let ppCurrentAccentColor = '#10b981';

// Set true during high-res export capture to suppress margin guide lines
let ppIsExporting = false;

// ==================== MODAL OPEN / CLOSE ====================

function openPrintPreview() {
  const modal = document.getElementById('printPreviewModal');
  if (!modal) return;

  // Reset options to defaults
  document.getElementById('ppSpecs').checked = true;
  document.getElementById('ppGearList').checked = true;
  document.getElementById('ppStandard').checked = true;
  document.getElementById('ppPower').checked = true;
  document.getElementById('ppData').checked = true;
  document.getElementById('ppStructure').checked = true;
  document.getElementById('ppCabling').checked = true;
  document.getElementById('ppEcoFriendly').checked = false;
  document.getElementById('ppGreyscale').checked = false;

  // Reset page format/orientation and zoom
  setPdfPageSize('a4');
  setPdfOrientation('p');
  ppZoomLevel = 1.0;
  ppUpdateZoomLabel();

  // Show/hide combined section based on screen count
  const combinedSection = document.getElementById('ppCombinedSection');
  const multiScreenCount = Object.keys(screens).length;
  if (combinedSection) {
    combinedSection.style.display = multiScreenCount > 1 ? 'block' : 'none';
  }
  const combinedCb = document.getElementById('ppCombined');
  if (combinedCb) combinedCb.checked = false;

  // Clear selection and print mode tracking
  ppSelectedElement = null;
  ppDragState.isDragging = false;
  ppCurrentEco = false;
  ppCurrentGreyscale = false;

  // Reset Manual Adjust
  ppManualAdjust = false;
  const ppManualAdjustEl = document.getElementById('ppManualAdjust');
  if (ppManualAdjustEl) ppManualAdjustEl.checked = false;

  // Sync logo UI with current projectLogo state
  const logoData = (typeof projectLogo !== 'undefined') ? projectLogo : null;
  const ppLogoPreview = document.getElementById('ppLogoPreview');
  const ppLogoThumb   = document.getElementById('ppLogoThumb');
  const ppLogoUploadBtn = document.getElementById('ppLogoUploadBtn');
  if (logoData && logoData.data) {
    if (ppLogoThumb)   ppLogoThumb.src = logoData.data;
    if (ppLogoPreview) ppLogoPreview.style.display = 'flex';
    if (ppLogoUploadBtn) ppLogoUploadBtn.style.display = 'none';
  } else {
    if (ppLogoPreview) ppLogoPreview.style.display = 'none';
    if (ppLogoUploadBtn) ppLogoUploadBtn.style.display = '';
  }

  // Show modal
  modal.classList.add('active');

  // Build preview after modal is visible (needs container dimensions)
  // rAF waits for exactly one paint frame (~16ms) instead of arbitrary 100ms timeout
  requestAnimationFrame(() => {
    captureAllCanvasImages(() => {
      rebuildPreview();
    });
  });
}

function closePrintPreview() {
  const modal = document.getElementById('printPreviewModal');
  if (modal) modal.classList.remove('active');

  // Reset print modes that may have been set during capture
  ecoPrintMode = false;
  greyscalePrintMode = false;

  // Clear cached images to free memory
  ppCanvasCache = {};
  pdfPageModel = [];

  // Clear preview canvases
  const container = document.getElementById('previewPagesContainer');
  if (container) container.innerHTML = '';

  // Remove document-level drag listeners if any
  document.removeEventListener('mousemove', ppDocMouseMove);
  document.removeEventListener('mouseup', ppDocMouseUp);

  reopenMenuIfNeeded();
}

// ==================== PAGE SIZE / ORIENTATION ====================

function setPdfPageSize(format) {
  pdfPageFormat = format;
  const a4Btn = document.getElementById('ppSizeA4');
  const letterBtn = document.getElementById('ppSizeLetter');
  if (a4Btn) a4Btn.classList.toggle('active', format === 'a4');
  if (letterBtn) letterBtn.classList.toggle('active', format === 'letter');
  updatePageDimensions();
}

function setPdfOrientation(orient) {
  pdfPageOrientation = orient;
  const pBtn = document.getElementById('ppOrientPortrait');
  const lBtn = document.getElementById('ppOrientLandscape');
  if (pBtn) pBtn.classList.toggle('active', orient === 'p');
  if (lBtn) lBtn.classList.toggle('active', orient === 'l');
  updatePageDimensions();
}

function updatePageDimensions() {
  const dims = {
    'a4': { w: 210, h: 297 },
    'letter': { w: 215.9, h: 279.4 }
  };
  const d = dims[pdfPageFormat] || dims['a4'];
  if (pdfPageOrientation === 'l') {
    ppPageWidth = d.h;
    ppPageHeight = d.w;
  } else {
    ppPageWidth = d.w;
    ppPageHeight = d.h;
  }
}

// ==================== CANVAS CAPTURE ====================

function captureAllCanvasImages(callback) {
  ppCanvasCache = {};

  // Save current screen data
  if (typeof saveCurrentScreenData === 'function') saveCurrentScreenData();

  const originalScreenId = currentScreenId;
  const screenIds = Object.keys(screens).sort((a, b) => {
    const numA = parseInt(a.split('_')[1]);
    const numB = parseInt(b.split('_')[1]);
    return numA - numB;
  });

  // Apply print modes for capture
  const opts = getPrintPreviewOptions();
  ecoPrintMode = opts.ecoFriendly;
  greyscalePrintMode = opts.greyscale;
  ppCurrentEco = opts.ecoFriendly;
  ppCurrentGreyscale = opts.greyscale;

  // Force show layout containers
  const mainContainer = document.querySelector('.main-container');
  const mainWasHidden = mainContainer && mainContainer.style.display === 'none';
  if (mainContainer) mainContainer.style.display = 'block';

  // gearListContainer is the parent of cableDiagramContainer — must be visible so clientWidth > 0
  const containers = ['standardContainer', 'powerContainer', 'dataContainer', 'structureContainer', 'gearListContainer', 'cableDiagramContainer'];
  const savedDisplay = {};
  containers.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      savedDisplay[id] = el.style.display;
      el.style.display = 'block';
    }
  });

  // Force reflow to ensure containers are visible before capture
  if (mainContainer) void mainContainer.offsetWidth;

  // All layout generation, canvas drawing, and toDataURL() are synchronous.
  // No setTimeout delays needed — one rAF ensured reflow, now capture everything in one pass.

  // ---- Per-screen capture (synchronous) ----
  screenIds.forEach(screenId => {
    switchToScreen(screenId);

    // Regenerate layouts for this screen (with current print modes)
    generateLayout('standard');
    generateLayout('power');
    generateLayout('data');
    generateStructureLayout();
    const cableContainer = document.getElementById('cableDiagramContainer');
    const savedCableWidth = cableContainer ? cableContainer.style.width : null;
    if (cableContainer) {
      cableContainer.style.width = '1400px';
      void cableContainer.offsetWidth;
    }
    cableDiagramPdfMode = true;
    if (typeof renderCableDiagram === 'function') {
      renderCableDiagram(screenId);
    }
    cableDiagramPdfMode = false;
    if (cableContainer && savedCableWidth !== null) cableContainer.style.width = savedCableWidth;
    else if (cableContainer) cableContainer.style.width = '';

    // Capture each canvas
    const captures = [
      { id: 'standardCanvas', key: screenId + '_standard' },
      { id: 'powerCanvas', key: screenId + '_power' },
      { id: 'dataCanvas', key: screenId + '_data' },
      { id: 'structureCanvas', key: screenId + '_structure' },
      { id: 'cableDiagramCanvas', key: screenId + '_cabling' }
    ];

    const stdCanvas = document.getElementById('standardCanvas');
    const stdAspectRatio = (stdCanvas && stdCanvas.width > 0) ? stdCanvas.height / stdCanvas.width : null;

    captures.forEach(cap => {
      const canvas = document.getElementById(cap.id);
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const useAspectRatio = (cap.id === 'powerCanvas' && stdAspectRatio !== null)
          ? stdAspectRatio
          : canvas.height / canvas.width;
        const isCableDiagram = cap.id === 'cableDiagramCanvas';
        ppCanvasCache[cap.key] = {
          dataUrl: isCableDiagram ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85),
          aspectRatio: useAspectRatio
        };
      }
    });
  });

  // ---- Combined view capture (synchronous) ----
  if (screenIds.length > 1) {
    const combinedContainer = document.getElementById('combinedContainer');
    const combinedWasHidden = combinedContainer ? combinedContainer.style.display : 'none';
    if (combinedContainer) combinedContainer.style.display = 'block';

    if (typeof combinedSelectedScreens !== 'undefined') {
      combinedSelectedScreens.clear();
      screenIds.forEach(id => combinedSelectedScreens.add(id));
    }

    // Force white background for combined canvases in PDF
    pdfWhiteBgMode = true;
    if (typeof renderCombinedView === 'function') {
      renderCombinedView();
    }
    pdfWhiteBgMode = false;

    const combinedCaptures = [
      { id: 'combinedStandardCanvas', key: 'combined_standard' },
      { id: 'combinedPowerCanvas', key: 'combined_power' },
      { id: 'combinedDataCanvas', key: 'combined_data' },
      { id: 'combinedStructureCanvas', key: 'combined_structure' },
      { id: 'combinedCableDiagramCanvas', key: 'combined_cabling' }
    ];

    combinedCaptures.forEach(cap => {
      const canvas = document.getElementById(cap.id);
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        ppCanvasCache[cap.key] = {
          dataUrl: canvas.toDataURL('image/jpeg', 0.85),
          aspectRatio: canvas.height / canvas.width
        };
      }
    });

    if (combinedContainer) combinedContainer.style.display = combinedWasHidden;
  }

  // ---- Restore app state ----
  switchToScreen(originalScreenId);

  containers.forEach(id => {
    const el = document.getElementById(id);
    if (el && savedDisplay[id] !== undefined) el.style.display = savedDisplay[id];
  });

  if (mainWasHidden && mainContainer) mainContainer.style.display = 'none';

  // Reset print modes
  ecoPrintMode = false;
  greyscalePrintMode = false;

  // Regenerate layouts with normal colors
  generateLayout('standard');
  generateLayout('power');
  generateLayout('data');
  generateStructureLayout();

  if (typeof switchMobileView === 'function' && typeof currentAppMode !== 'undefined') {
    switchMobileView(currentAppMode);
  }

  if (callback) callback();
}

// ==================== OPTIONS ====================

function getPrintPreviewOptions() {
  return {
    specs: document.getElementById('ppSpecs').checked,
    gearList: document.getElementById('ppGearList').checked,
    standard: document.getElementById('ppStandard').checked,
    power: document.getElementById('ppPower').checked,
    data: document.getElementById('ppData').checked,
    structure: document.getElementById('ppStructure').checked,
    cabling: document.getElementById('ppCabling').checked,
    combined: document.getElementById('ppCombined') ? document.getElementById('ppCombined').checked : false,
    ecoFriendly: document.getElementById('ppEcoFriendly').checked,
    greyscale: document.getElementById('ppGreyscale').checked
  };
}

// Called by every checkbox/toggle change
function onPreviewOptionChange() {
  const opts = getPrintPreviewOptions();

  // Check if eco/greyscale changed — need to recapture canvases
  if (opts.ecoFriendly !== ppCurrentEco || opts.greyscale !== ppCurrentGreyscale) {
    captureAllCanvasImages(() => {
      rebuildPreview();
    });
  } else {
    rebuildPreview();
  }
}

// ==================== MANUAL ADJUST ====================

function ppSetManualAdjust(enabled) {
  ppManualAdjust = enabled;
  // Visual feedback: highlight page canvases when drag is active
  const canvases = document.querySelectorAll('.preview-page-canvas');
  canvases.forEach(function(c) {
    c.style.cursor = enabled ? 'grab' : 'default';
    c.style.outline = enabled ? '2px dashed #2d8a5e' : 'none';
  });
}

// ==================== LOGO UPLOAD ====================

function ppHandleLogoUpload(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  const MAX_SIZE = 200 * 1024; // 200 KB
  if (file.size > MAX_SIZE) {
    showAlert('Logo file too large. Maximum size is 200 KB.');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    projectLogo = { data: e.target.result, fileName: file.name };

    // Show thumbnail
    const thumb = document.getElementById('ppLogoThumb');
    const preview = document.getElementById('ppLogoPreview');
    if (thumb) thumb.src = projectLogo.data;
    if (preview) preview.style.display = 'flex';

    const uploadBtn = document.getElementById('ppLogoUploadBtn');
    if (uploadBtn) uploadBtn.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function ppRemoveLogo() {
  projectLogo = null;

  const preview = document.getElementById('ppLogoPreview');
  const thumb   = document.getElementById('ppLogoThumb');
  const input   = document.getElementById('ppLogoInput');
  const uploadBtn = document.getElementById('ppLogoUploadBtn');

  if (preview) preview.style.display = 'none';
  if (thumb)   thumb.src = '';
  if (input)   input.value = '';
  if (uploadBtn) uploadBtn.style.display = '';
}

// ==================== PAGE COUNT INDICATOR ====================

function ppUpdatePageCount() {
  const el = document.getElementById('ppPageCount');
  if (!el) return;
  const count = pdfPageModel ? pdfPageModel.length : 0;
  el.textContent = count > 0 ? `${count} page${count === 1 ? '' : 's'}` : '';
}

// ==================== REBUILD PREVIEW ====================

function rebuildPreview() {
  buildPageModel();
  ppUpdatePageCount();
  // Preserve scroll position across re-render
  const scrollArea = document.querySelector('.print-preview-area');
  const savedScroll = scrollArea ? scrollArea.scrollTop : 0;
  renderPreviewPages();
  if (scrollArea) scrollArea.scrollTop = savedScroll;
}

// ==================== PAGE MODEL BUILDER ====================

function buildPageModel() {
  const opts = getPrintPreviewOptions();
  pdfPageModel = [];

  const screenIds = Object.keys(screens).sort((a, b) => {
    const numA = parseInt(a.split('_')[1]);
    const numB = parseInt(b.split('_')[1]);
    return numA - numB;
  });

  const usableWidth  = ppPageWidth  - 2 * PP_MARGIN;
  const usableHeight = ppPageHeight - 2 * PP_MARGIN;

  // Design tokens matching PDF_TOKENS
  const headerH   = 8;   // mm — B.L.I.N.K. REPORT bar
  const screenLblH = 6;  // mm — screen name label
  const summaryH  = 26;  // mm — 4-col summary bar
  const sectionLblH = 5; // mm — "POWER LAYOUT" / "DATA LAYOUT" labels

  // Accent color matching exported PDF (eco/greyscale aware)
  ppCurrentAccentColor = opts.greyscale ? '#555' : opts.ecoFriendly ? '#6b7280' : '#1a3a2a';

  const configName = document.getElementById('configName')?.value?.trim() || 'LED Wall';
  const dateStr    = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });

  // Helper: push a header-bar element onto a page
  function pushHeader(page, y) {
    page.elements.push({
      id: page.pageNum + '_header',
      type: 'banner',
      text: 'B.L.I.N.K. REPORT',
      centerText: configName,
      rightText: dateStr,
      x: PP_MARGIN, y: y, w: usableWidth, h: headerH,
      fontSize: 9
    });
    return y + headerH + 1;
  }

  // Helper: build gear lines split into 3 column arrays (mirrors buildGearListContent)
  function buildGearColumns(screenId) {
    const gearData = (typeof buildGearListData === 'function') ? buildGearListData([screenId]) : null;
    if (!gearData || !gearData.screens || gearData.screens.length === 0) return [[], [], []];
    const sd  = gearData.screens[0];
    const eq  = sd.equipment    || {};
    const rig = sd.rigging      || {};
    const gs  = sd.groundSupport || {};
    const fh  = sd.floorHardware || {};
    const dc  = sd.dataCables   || {};
    const pc  = sd.powerCables  || {};
    const p2d = sd.processorToDistBox || {};
    const sig = gearData.signalCables || {};
    const util = gearData.utility || {};
    const sp  = gearData.spares || {};

    function section(title, lines) {
      if (lines.length === 0) return [];
      return [{ text: title, bold: true, header: true }, ...lines];
    }
    function item(qty, label) {
      return qty > 0 ? [{ text: qty + ' × ' + label }] : [];
    }

    // Col 1: Equipment, Rigging, Ground Support / Floor Hardware
    const eqLines = [];
    if (eq.isFirstScreenInGroup) {
      if (eq.processorCount > 0) eqLines.push({ text: eq.processorCount + ' × ' + (eq.processorName || 'Processor') });
      if (eq.distBoxCount   > 0) eqLines.push({ text: eq.distBoxCount   + ' × ' + (eq.distBoxName   || 'Dist Box') });
    }
    if (eq.activeFullPanels > 0) eqLines.push({ text: eq.activeFullPanels + ' × ' + (eq.panelBrand || '') + ' ' + (eq.panelName || '') });
    if (eq.activeHalfPanels > 0) eqLines.push({ text: eq.activeHalfPanels + ' × ' + (eq.panelBrand || '') + ' ' + (eq.halfPanelName || '') });

    const rigLines = [];
    if (rig.hasRigging) {
      if (rig.bumper1w > 0) rigLines.push({ text: rig.bumper1w + ' × 1W Bumpers' });
      if (rig.bumper2w > 0) rigLines.push({ text: rig.bumper2w + ' × 2W Bumpers' });
      if (rig.bumper4w > 0) rigLines.push({ text: rig.bumper4w + ' × 4W Bumpers' });
      if (rig.plates4way > 0) rigLines.push({ text: rig.plates4way + ' × 4W Conn. Plates' });
      if (rig.plates2way > 0) rigLines.push({ text: rig.plates2way + ' × 2W Conn. Plates' });
      if (rig.shackles  > 0) rigLines.push({ text: rig.shackles  + " × Shackles" });
      if (rig.cheeseye  > 0) rigLines.push({ text: rig.cheeseye  + " × Cheeseye" });
    }
    const gsLines = [];
    if (gs && gs.hasGS) {
      if (gs.rearTruss       > 0) gsLines.push({ text: gs.rearTruss       + ' × Rear Truss' });
      if (gs.baseTruss       > 0) gsLines.push({ text: gs.baseTruss       + ' × Base Truss' });
      if (gs.bridgeClamps    > 0) gsLines.push({ text: gs.bridgeClamps    + ' × Bridge Clamps' });
      if (gs.rearBridgeAdapters > 0) gsLines.push({ text: gs.rearBridgeAdapters + ' × Rear Bridge Adapter' });
      if (gs.sandbags        > 0) gsLines.push({ text: gs.sandbags        + ' × Sandbags' });
    }
    const fhLines = [];
    if (fh && fh.hasFloorFrames) {
      if (fh.frame3x2 > 0) fhLines.push({ text: fh.frame3x2 + ' × 3×2 Frame' });
      if (fh.frame2x2 > 0) fhLines.push({ text: fh.frame2x2 + ' × 2×2 Frame' });
      if (fh.frame2x1 > 0) fhLines.push({ text: fh.frame2x1 + ' × 2×1 Frame' });
      if (fh.frame1x1 > 0) fhLines.push({ text: fh.frame1x1 + ' × 1×1 Frame' });
    }
    const col1 = [
      ...section('EQUIPMENT',       eqLines),
      ...(rigLines.length > 0 ? section('RIGGING HARDWARE', rigLines) : []),
      ...(gsLines.length  > 0 ? section('GROUND SUPPORT',   gsLines)  : []),
      ...(fhLines.length  > 0 ? section('FLOOR HARDWARE',   fhLines)  : []),
    ];

    // Col 2: Data Cables (+ Proc→Dist merged), Power Cables
    const dcLines = [];
    if (dc.jumperCount > 0) dcLines.push({ text: dc.jumperCount + ' × Data Jumpers ' + (dc.dataJumperLen || '') });
    if (dc.crossJumperCount > 0) dcLines.push({ text: dc.crossJumperCount + ' × Data Cross Jumpers ' + (dc.crossJumperLen || '') });
    Object.keys(dc.cat6ByLength || {}).sort((a,b) => b-a).forEach(len => {
      if (dc.cat6ByLength[len] > 0) dcLines.push({ text: dc.cat6ByLength[len] + " × " + len + "' Cat6" });
    });
    if (p2d && p2d.count > 0) {
      dcLines.push({ text: '— Proc → Dist Box —', bold: true });
      dcLines.push({ text: p2d.count + ' × ' + (p2d.cableType || '') + ' ' + (p2d.cableLength || '') + "'" });
    }
    const pcLines = [];
    if (pc.jumperCount > 0) pcLines.push({ text: pc.jumperCount + ' × Power Jumpers ' + (pc.powerJumperLen || '') });
    if (pc.socaSplays  > 0) pcLines.push({ text: pc.socaSplays  + ' × Soca Splays' });
    Object.keys(pc.socaByLength || {}).sort((a,b) => b-a).forEach(len => {
      if (pc.socaByLength[len] > 0) pcLines.push({ text: pc.socaByLength[len] + " × " + len + "' Soca" });
    });
    if (pc.true1_25 > 0) pcLines.push({ text: pc.true1_25 + " × 25' True1" });
    if (pc.true1_10 > 0) pcLines.push({ text: pc.true1_10 + " × 10' True1" });
    if (pc.true1_5  > 0) pcLines.push({ text: pc.true1_5  + " × 5' True1" });
    if (pc.true1Twofer > 0) pcLines.push({ text: pc.true1Twofer + ' × True1 Twofer' });
    const col2 = [
      ...section('DATA CABLES',  dcLines),
      ...(pcLines.length > 0 ? section('POWER CABLES', pcLines) : []),
    ];

    // Col 3: Signal Cables, Utility, Spares
    const scLines = [];
    if (sig) {
      if (sig.serverFiberLine) scLines.push({ text: sig.serverFiberLine.count + ' × ' + sig.serverFiberLine.label });
      Object.keys(sig.sdiByLength || {}).sort((a,b) => b-a).forEach(len => {
        if (sig.sdiByLength[len] > 0) scLines.push({ text: sig.sdiByLength[len] + " × " + len + "' " + (sig.sdiType || 'SDI') });
      });
      if (sig.hdmi && sig.hdmi[25] > 0) scLines.push({ text: sig.hdmi[25] + " × 25' HDMI" });
      if (sig.hdmi && sig.hdmi[10] > 0) scLines.push({ text: sig.hdmi[10] + " × 10' HDMI" });
      if (sig.hdmi && sig.hdmi[6]  > 0) scLines.push({ text: sig.hdmi[6]  + " × 6' HDMI" });
    }
    const utilLines = [];
    if (util) {
      if (util.ug10      > 0) utilLines.push({ text: util.ug10      + " × UG 10'" });
      if (util.ug25      > 0) utilLines.push({ text: util.ug25      + " × UG 25'" });
      if (util.ug50      > 0) utilLines.push({ text: util.ug50      + " × UG 50'" });
      if (util.ugTwofers > 0) utilLines.push({ text: util.ugTwofers + ' × UG Twofers' });
      if (util.powerBars > 0) utilLines.push({ text: util.powerBars + ' × Power Bars' });
    }
    const spLines = [];
    if (sp) {
      Object.entries(sp.panelsByType || {}).forEach(([k,v]) => { if (v > 0) spLines.push({ text: v + ' × ' + k }); });
      if (sp.shackles    > 0) spLines.push({ text: sp.shackles    + ' × Shackles' });
      if (sp.cheeseyes   > 0) spLines.push({ text: sp.cheeseyes   + ' × Cheeseyes' });
      if (sp.true1_25    > 0) spLines.push({ text: sp.true1_25    + " × 25' True1" });
      if (sp.true1_10    > 0) spLines.push({ text: sp.true1_10    + " × 10' True1" });
      if (sp.true1_5     > 0) spLines.push({ text: sp.true1_5     + " × 5' True1" });
      if (sp.true1Twofer > 0) spLines.push({ text: sp.true1Twofer + ' × True1 Twofer' });
    }
    const col3 = [
      ...(scLines.length   > 0 ? section('SIGNAL CABLES', scLines)   : []),
      ...(utilLines.length > 0 ? section('UTILITY',       utilLines) : []),
      ...(spLines.length   > 0 ? section('SPARES',        spLines)   : []),
    ];

    return [col1, col2, col3];
  }

  // Helper: build 4-col summary lines (mirrors buildComplexSummaryBar)
  function buildSummaryColumns(screenId) {
    const screen = screens[screenId];
    if (!screen) return [[], [], [], []];
    const data = screen.data || {};
    const cd   = screen.calculatedData || {};
    const allPanels = (typeof getAllPanels === 'function') ? getAllPanels() : {};
    const p = allPanels[data.panelType] || {};
    const pw = parseInt(data.panelsWide) || 0;
    const ph = parseInt(data.panelsHigh) || 0;
    const activePanels = cd.activePanels || (pw * ph);
    const panelWtLbs = (p.weight_kg || 0) * 2.20462;
    const wallWFt = (pw * (p.width_m  || 0) * 3.28084).toFixed(1);
    const wallHFt = (ph * (p.height_m || 0) * 3.28084).toFixed(1);
    const powerType = data.powerType || 'max';
    const ppp = (powerType === 'max') ? (p.power_max_w || 0) : (p.power_avg_w || 0);
    const totalPowerW = activePanels * ppp;
    const voltage = parseInt(data.voltage) || 208;
    const ampsTotal = voltage > 0 ? totalPowerW / voltage : 0;

    function row(label, value) { return value ? { text: label + ': ' + value } : null; }
    function rows(arr) { return arr.filter(Boolean); }

    const col1 = rows([
      { text: 'PANEL', bold: true, header: true },
      row('Model',       ((p.brand || '') + ' ' + (p.name || '')).trim() || null),
      row('Pitch',       p.pixel_pitch_mm ? p.pixel_pitch_mm + ' mm' : null),
      row('Size',        (p.width_m && p.height_m) ? (p.width_m*3.28084).toFixed(2) + "' × " + (p.height_m*3.28084).toFixed(2) + "'" : null),
      row('Resolution',  (p.res_x && p.res_y) ? p.res_x + ' × ' + p.res_y + ' px' : null),
      row('Weight',      panelWtLbs > 0 ? panelWtLbs.toFixed(1) + ' lbs' : null),
      row('Brightness',  p.brightness_nits ? p.brightness_nits + ' nits' : null),
      row('Max Hang',    p.max_hanging ? String(p.max_hanging) : null),
    ]);
    const col2 = rows([
      { text: 'WALL', bold: true, header: true },
      row('Dims',        (wallWFt > 0 && wallHFt > 0) ? wallWFt + "' × " + wallHFt + "'" : null),
      row('Panels',      activePanels ? pw + '×' + ph + ' (' + activePanels + ')' : null),
      row('Resolution',  (pw > 0 && p.res_x) ? (pw*p.res_x) + ' × ' + (ph*p.res_y) + ' px' : null),
      row('Weight',      activePanels > 0 && panelWtLbs > 0 ? Math.ceil(activePanels * panelWtLbs) + ' lbs' : null),
    ]);
    const col3 = rows([
      { text: 'POWER', bold: true, header: true },
      row('Total',       totalPowerW > 0 ? totalPowerW.toLocaleString() + ' W' : null),
      row('Amps',        ampsTotal > 0 ? ampsTotal.toFixed(1) + ' A @ ' + voltage + 'V' : null),
      row('Circuits',    cd.circuitsNeeded > 0 ? String(cd.circuitsNeeded) : null),
    ]);
    const col4 = rows([
      { text: 'DATA', bold: true, header: true },
      row('Data Lines',  cd.dataLines   > 0 ? String(cd.dataLines)   : null),
      row('Ports Needed',cd.portsNeededFinal > 0 ? String(cd.portsNeededFinal) : null),
      row('Max/Line',    cd.panelsPerDataLine > 0 ? cd.panelsPerDataLine + ' panels' : null),
    ]);
    return [col1, col2, col3, col4];
  }

  // ========== MULTI-SCREEN SUMMARY PAGE ==========
  if (screenIds.length > 1) {
    const sumPage = { pageNum: 1, elements: [] };
    let y = pushHeader(sumPage, PP_MARGIN);
    sumPage.elements.push({
      id: 'summary_title',
      type: 'text', text: 'PROJECT SUMMARY', bold: true,
      x: PP_MARGIN, y: y, w: usableWidth, h: 6, fontSize: 10
    });
    y += 8;

    // Aggregate stats row
    let totalPowerW = 0, totalWeightLbs = 0;
    const panelTypeCounts = {};
    const allPanelsRef = (typeof getAllPanels === 'function') ? getAllPanels() : {};
    screenIds.forEach(sid => {
      const scr = screens[sid];
      const d = (scr && scr.data) || {};
      const cd = (scr && scr.calculatedData) || {};
      const p = allPanelsRef[d.panelType] || {};
      const active = cd.activePanels || (parseInt(d.panelsWide)||0) * (parseInt(d.panelsHigh)||0);
      const ppp = (d.powerType === 'avg') ? (p.power_avg_w||0) : (p.power_max_w||0);
      totalPowerW += active * ppp;
      totalWeightLbs += Math.ceil(active * (p.weight_kg||0) * 2.20462);
      const key = ((p.brand||'') + ' ' + (p.name||d.panelType||'')).trim();
      panelTypeCounts[key] = (panelTypeCounts[key]||0) + active;
    });
    const panelKeys = Object.keys(panelTypeCounts);
    const panelSummary = panelKeys.length === 1
      ? panelTypeCounts[panelKeys[0]] + ' × ' + panelKeys[0]
      : panelKeys.map(k => panelTypeCounts[k] + ' × ' + k).join(', ');

    const statColW = Math.floor(usableWidth / 4);
    const stats = [
      ['Screens', String(screenIds.length)],
      ['Total Power', totalPowerW > 0 ? totalPowerW.toLocaleString() + ' W' : '—'],
      ['Total Weight', totalWeightLbs > 0 ? totalWeightLbs + ' lbs' : '—'],
      ['Panels', panelSummary || '—'],
    ];
    stats.forEach((st, i) => {
      sumPage.elements.push({
        id: 'stat_' + i,
        type: 'textblock',
        lines: [{ text: st[0], bold: true, header: true }, { text: st[1] }],
        x: PP_MARGIN + i * statColW, y: y, w: statColW - 2, h: 12,
        fontSize: 8
      });
    });
    y += 14;

    // Per-screen cards
    sumPage.elements.push({
      id: 'screens_label',
      type: 'text', text: 'SCREENS', bold: true,
      x: PP_MARGIN, y: y, w: usableWidth, h: 5, fontSize: 9
    });
    y += 7;
    screenIds.forEach((sid, i) => {
      const scr = screens[sid];
      const d = (scr && scr.data) || {};
      const p = allPanelsRef[d.panelType] || {};
      const pw2 = parseInt(d.panelsWide)||0;
      const ph2 = parseInt(d.panelsHigh)||0;
      const wFt = (pw2 * (p.width_m||0) * 3.28084).toFixed(1);
      const hFt = (ph2 * (p.height_m||0) * 3.28084).toFixed(1);
      const active = (scr && scr.calculatedData && scr.calculatedData.activePanels) || pw2 * ph2;
      sumPage.elements.push({
        id: 'screen_card_' + i,
        type: 'textblock',
        lines: [
          { text: (scr && scr.name) || sid, bold: true, header: true },
          { text: pw2 + '×' + ph2 + '  ' + wFt + "' × " + hFt + "'  " + active + ' panels' }
        ],
        x: PP_MARGIN, y: y, w: usableWidth, h: 10,
        fontSize: 8
      });
      y += 12;
    });

    pdfPageModel.push(sumPage);
  }

  // ========== PER-SCREEN PAGES — mirrors buildComplexPdf structure ==========
  screenIds.forEach((screenId, sIdx) => {
    const screen = screens[screenId];
    if (!screen) return;

    // ---- PAGE: HERO (header + screen name + 4-col summary + standard grid) ----
    if (opts.specs !== false || opts.standard !== false) {
      const heroPage = { pageNum: pdfPageModel.length + 1, elements: [] };
      let y = pushHeader(heroPage, PP_MARGIN);

      // Screen name label
      heroPage.elements.push({
        id: screenId + '_name',
        type: 'text', text: (screen.name || screenId).toUpperCase(), bold: true,
        x: PP_MARGIN, y: y, w: usableWidth, h: screenLblH, fontSize: 10
      });
      y += screenLblH + 2;

      // 4-column summary bar
      if (opts.specs !== false) {
        const [sc1, sc2, sc3, sc4] = buildSummaryColumns(screenId);
        const colW4 = Math.floor((usableWidth - 3) / 4);
        [[sc1, 0],[sc2, 1],[sc3, 2],[sc4, 3]].forEach(([lines, ci]) => {
          heroPage.elements.push({
            id: screenId + '_sum_' + ci,
            type: 'textblock', lines: lines,
            x: PP_MARGIN + ci * (colW4 + 1), y: y, w: colW4, h: summaryH,
            fontSize: 7
          });
        });
        y += summaryH + 2;
      }

      // Standard grid image
      if (opts.standard !== false && ppCanvasCache[screenId + '_standard']) {
        const cached = ppCanvasCache[screenId + '_standard'];
        const data = screen.data || {};
        const pw = parseInt(data.panelsWide) || 0;
        const ph = parseInt(data.panelsHigh) || 0;
        const remainH = ppPageHeight - y - PP_MARGIN - 8;
        const maxGridW = usableWidth * 0.85;
        const { renderWidth: gw, renderHeight: gh } = (typeof calculateGridScale === 'function')
          ? calculateGridScale(pw, ph, maxGridW, remainH)
          : { renderWidth: maxGridW, renderHeight: remainH };
        const offsetX = (usableWidth - gw) / 2;
        heroPage.elements.push({
          id: screenId + '_standard',
          type: 'layout',
          title: '',
          imageKey: screenId + '_standard',
          x: PP_MARGIN + offsetX, y: y, w: gw, h: gh,
          titleH: 0, fontSize: 9
        });
        y += gh + 2;
        if (pw > 0 && ph > 0) {
          const allPanelsRef2 = (typeof getAllPanels === 'function') ? getAllPanels() : {};
          const p2 = allPanelsRef2[data.panelType] || {};
          if (p2.res_x && p2.res_y) {
            heroPage.elements.push({
              id: screenId + '_res_label',
              type: 'text', text: (pw * p2.res_x) + ' × ' + (ph * p2.res_y) + ' px',
              x: PP_MARGIN, y: y, w: usableWidth, h: 4, fontSize: 7
            });
          }
        }
      }

      pdfPageModel.push(heroPage);
    }

    // ---- PAGE: GEAR LIST ----
    if (opts.gearList !== false) {
      const gearPage = { pageNum: pdfPageModel.length + 1, elements: [] };
      let y = pushHeader(gearPage, PP_MARGIN);

      gearPage.elements.push({
        id: screenId + '_gear_title',
        type: 'text', text: (screen.name || screenId).toUpperCase() + ' — GEAR LIST', bold: true,
        x: PP_MARGIN, y: y, w: usableWidth, h: screenLblH, fontSize: 10
      });
      y += screenLblH + 2;

      const [gc1, gc2, gc3] = buildGearColumns(screenId);
      const gColW = Math.floor((usableWidth - 4) / 3);
      const gColH = ppPageHeight - y - PP_MARGIN - 4;
      [[gc1, 0],[gc2, 1],[gc3, 2]].forEach(([lines, ci]) => {
        gearPage.elements.push({
          id: screenId + '_gear_col_' + ci,
          type: 'textblock', lines: lines,
          x: PP_MARGIN + ci * (gColW + 2), y: y, w: gColW, h: gColH,
          fontSize: 7
        });
      });

      pdfPageModel.push(gearPage);
    }

    // ---- PAGE: POWER + DATA ----
    const hasPowerData = opts.power !== false || opts.data !== false;
    if (hasPowerData) {
      const pdPage = { pageNum: pdfPageModel.length + 1, elements: [] };
      let y = pushHeader(pdPage, PP_MARGIN);

      const maxGridH = Math.floor((usableHeight - headerH - 2 * sectionLblH - 10) / 2);

      if (opts.power !== false && ppCanvasCache[screenId + '_power']) {
        const cached = ppCanvasCache[screenId + '_power'];
        const data = screen.data || {};
        const pw = parseInt(data.panelsWide)||0;
        const ph = parseInt(data.panelsHigh)||0;
        const { renderWidth: gw, renderHeight: gh } = (typeof calculateGridScale === 'function')
          ? calculateGridScale(pw, ph, usableWidth, maxGridH)
          : { renderWidth: usableWidth, renderHeight: maxGridH };
        pdPage.elements.push({
          id: screenId + '_power_lbl',
          type: 'text', text: 'POWER LAYOUT', bold: true,
          x: PP_MARGIN, y: y, w: usableWidth, h: sectionLblH, fontSize: 9
        });
        y += sectionLblH + 1;
        const offX = (usableWidth - gw) / 2;
        pdPage.elements.push({
          id: screenId + '_power',
          type: 'layout', title: '', imageKey: screenId + '_power',
          x: PP_MARGIN + offX, y: y, w: gw, h: gh,
          titleH: 0, fontSize: 9
        });
        y += gh + 3;
      }

      if (opts.data !== false && ppCanvasCache[screenId + '_data']) {
        const cached = ppCanvasCache[screenId + '_data'];
        const data = screen.data || {};
        const pw = parseInt(data.panelsWide)||0;
        const ph = parseInt(data.panelsHigh)||0;
        const { renderWidth: gw, renderHeight: gh } = (typeof calculateGridScale === 'function')
          ? calculateGridScale(pw, ph, usableWidth, maxGridH)
          : { renderWidth: usableWidth, renderHeight: maxGridH };
        pdPage.elements.push({
          id: screenId + '_data_lbl',
          type: 'text', text: 'DATA LAYOUT', bold: true,
          x: PP_MARGIN, y: y, w: usableWidth, h: sectionLblH, fontSize: 9
        });
        y += sectionLblH + 1;
        const offX = (usableWidth - gw) / 2;
        pdPage.elements.push({
          id: screenId + '_data',
          type: 'layout', title: '', imageKey: screenId + '_data',
          x: PP_MARGIN + offX, y: y, w: gw, h: gh,
          titleH: 0, fontSize: 9
        });
      }

      pdfPageModel.push(pdPage);
    }

    // ---- PAGE: STRUCTURE + CABLING ----
    const hasStructCabling = opts.structure !== false || opts.cabling !== false;
    if (hasStructCabling) {
      const scPage = { pageNum: pdfPageModel.length + 1, elements: [] };
      let y = pushHeader(scPage, PP_MARGIN);

      const maxStructH = Math.floor((usableHeight - headerH - 2 * sectionLblH - 10) / 2);

      if (opts.structure !== false && ppCanvasCache[screenId + '_structure']) {
        const data = screen.data || {};
        const pw = parseInt(data.panelsWide)||0;
        const ph = parseInt(data.panelsHigh)||0;
        const { renderWidth: gw, renderHeight: gh } = (typeof calculateGridScale === 'function')
          ? calculateGridScale(pw, ph, usableWidth, maxStructH)
          : { renderWidth: usableWidth, renderHeight: maxStructH };
        scPage.elements.push({
          id: screenId + '_struct_lbl',
          type: 'text', text: 'STRUCTURE LAYOUT', bold: true,
          x: PP_MARGIN, y: y, w: usableWidth, h: sectionLblH, fontSize: 9
        });
        y += sectionLblH + 1;
        const offX = (usableWidth - gw) / 2;
        scPage.elements.push({
          id: screenId + '_structure',
          type: 'layout', title: '', imageKey: screenId + '_structure',
          x: PP_MARGIN + offX, y: y, w: gw, h: gh,
          titleH: 0, fontSize: 9
        });
        y += gh + 3;

        // Structure info textblocks (2 columns)
        const structLines = buildStructureInfoLines(screenId);
        if (structLines.length > 0) {
          const structColW = (usableWidth - 4) / 2;
          const col2Headers = ['Ground Support Hardware', 'Floor Frames', 'Total Structure Weight'];
          let splitIdx = structLines.length;
          for (let i = 0; i < structLines.length; i++) {
            if (structLines[i].header && col2Headers.some(h => structLines[i].text === h)) { splitIdx = i; break; }
          }
          const stH = Math.min(structLines.length * 3.5, 30);
          scPage.elements.push({
            id: screenId + '_struct_info_1', type: 'textblock',
            lines: structLines.slice(0, splitIdx),
            x: PP_MARGIN, y: y, w: structColW, h: stH, fontSize: 7
          });
          if (splitIdx < structLines.length) {
            scPage.elements.push({
              id: screenId + '_struct_info_2', type: 'textblock',
              lines: structLines.slice(splitIdx),
              x: PP_MARGIN + structColW + 4, y: y, w: structColW, h: stH, fontSize: 7
            });
          }
          y += stH + 3;
        }
      }

      if (opts.cabling !== false && ppCanvasCache[screenId + '_cabling']) {
        const cabCached = ppCanvasCache[screenId + '_cabling'];
        const maxCabH = Math.max(10, ppPageHeight - y - PP_MARGIN - sectionLblH - 3);
        const cabW = usableWidth;
        let cabH = cabW * (cabCached.aspectRatio || 0.33);
        if (cabH > maxCabH) cabH = maxCabH;
        scPage.elements.push({
          id: screenId + '_cabling_lbl',
          type: 'text', text: 'CABLING LAYOUT', bold: true,
          x: PP_MARGIN, y: y, w: usableWidth, h: sectionLblH, fontSize: 9
        });
        y += sectionLblH + 1;
        scPage.elements.push({
          id: screenId + '_cabling',
          type: 'layout', title: '', imageKey: screenId + '_cabling',
          x: PP_MARGIN, y: y, w: cabW, h: cabH,
          titleH: 0, fontSize: 9
        });
      }

      pdfPageModel.push(scPage);
    }
  });

  // ========== COMBINED VIEW PAGES (preserved from original) ==========
  if (opts.combined && Object.keys(screens).length > 1) {
    const combinedLayouts = [
      { key: 'combined_standard', title: 'Combined Standard Layout' },
      { key: 'combined_power',    title: 'Combined Power Layout' },
      { key: 'combined_data',     title: 'Combined Data Layout' },
      { key: 'combined_structure', title: 'Combined Structure Layout' },
      { key: 'combined_cabling',  title: 'Combined Cabling Layout' }
    ];
    let combinedPage = { pageNum: pdfPageModel.length + 1, elements: [] };
    let yPos = PP_MARGIN;
    combinedPage.elements.push({
      id: 'combined_header', type: 'text', text: 'COMBINED VIEW', bold: true,
      x: PP_MARGIN, y: yPos, w: usableWidth, h: 8, fontSize: 12
    });
    yPos += 10;
    combinedLayouts.forEach((layout, lIdx) => {
      const cached = ppCanvasCache[layout.key];
      if (!cached) return;
      let imgW = usableWidth;
      let imgH = imgW * cached.aspectRatio;
      if (imgH > 60) { imgH = 60; imgW = 60 / cached.aspectRatio; }
      const neededH = imgH + 10;
      if (yPos + neededH > ppPageHeight - PP_MARGIN) {
        pdfPageModel.push(combinedPage);
        combinedPage = { pageNum: pdfPageModel.length + 1, elements: [] };
        yPos = PP_MARGIN;
      }
      combinedPage.elements.push({
        id: layout.key, type: 'layout', title: layout.title, imageKey: layout.key,
        x: PP_MARGIN, y: yPos, w: imgW, h: 6 + imgH, titleH: 6, fontSize: 9
      });
      yPos += 6 + imgH + 4;
    });
    if (combinedPage.elements.length > 0) pdfPageModel.push(combinedPage);
  }
}

// ==================== CONTENT BUILDERS ====================

function buildSpecsLines(screenId) {
  const screen = screens[screenId];
  if (!screen || !screen.data) return [];

  const data = screen.data;
  const calc = screen.calculatedData || {};
  const allPanels = getAllPanels();
  const allProcessors = getAllProcessors();
  const panelType = data.panelType || 'CB5_MKII';
  const p = allPanels[panelType];
  const pr = allProcessors[data.processor] || allProcessors['Brompton_SX40'];
  const pw = parseInt(data.panelsWide) || 0;
  const ph = parseInt(data.panelsHigh) || 0;
  const lines = [];

  if (!p || pw === 0 || ph === 0) return lines;

  // Calculate all values matching pdf.js
  const wallResX = pw * p.res_x;
  const wallResY = ph * p.res_y;
  const panelWidthMm = (p.width_m || 0) * 1000;
  const panelHeightMm = (p.height_m || 0) * 1000;
  const wallWidthMm = pw * panelWidthMm;
  const wallHeightMm = ph * panelHeightMm;
  const wallWidthFt = wallWidthMm > 0 ? (wallWidthMm / 304.8).toFixed(2) : '0';
  const wallHeightFt = wallHeightMm > 0 ? (wallHeightMm / 304.8).toFixed(2) : '0';
  const wallWidthM = wallWidthMm > 0 ? (wallWidthMm / 1000).toFixed(2) : '0';
  const wallHeightM = wallHeightMm > 0 ? (wallHeightMm / 1000).toFixed(2) : '0';
  const activePanels = calc.activePanels || (pw * ph);
  const totalPixels = wallResX * wallResY;
  const exportUseConnectingPlates = (panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF') && data.connectionMethod === 'plates';

  const panelWidthFt = (p.width_m * 3.28084).toFixed(3);
  const panelHeightFt = (p.height_m * 3.28084).toFixed(3);
  const panelWidthM = p.width_m.toFixed(3);
  const panelHeightM = p.height_m.toFixed(3);
  const exportPanelWeightKg = (typeof getPanelWeight === 'function') ? getPanelWeight(panelType, exportUseConnectingPlates) : 0;
  const panelWeightLbs = Math.ceil(exportPanelWeightKg * 2.20462);
  const panelOnlyWeightKg = calc.panelWeightOnlyKg || (activePanels * exportPanelWeightKg);
  const panelOnlyWeightLbs = Math.ceil(panelOnlyWeightKg * 2.20462);

  const powerType = data.powerType || 'max';
  const powerPerPanel = powerType === 'max' ? (p.power_max_w || 0) : (p.power_avg_w || 0);
  const totalPowerW = activePanels * powerPerPanel;
  const voltage = parseInt(data.voltage) || 208;
  const breaker = parseInt(data.breaker) || 20;
  const phase = parseInt(data.phase) || 3;
  const ampsSingle = voltage > 0 ? totalPowerW / voltage : 0;
  const ampsPerPhase = phase === 3 ? ampsSingle / 1.732 : ampsSingle;
  const circuitW = voltage * breaker * 1.0;
  const maxPanelsPerCircuit = powerPerPanel > 0 ? Math.floor(circuitW / powerPerPanel) : 0;

  // PANEL section
  lines.push({ text: 'PANEL', bold: true, header: true });
  lines.push({ text: 'Panel: ' + (p.brand || '') + ' ' + (p.name || panelType) });
  lines.push({ text: 'Pixel Pitch: ' + p.pixel_pitch_mm + ' mm' });
  lines.push({ text: 'Panel Size: ' + panelWidthFt + "' × " + panelHeightFt + "' (" + panelWidthM + ' × ' + panelHeightM + ' m)' });
  lines.push({ text: 'Panel Res: ' + p.res_x + ' × ' + p.res_y });
  if (p.brightness_nits) lines.push({ text: 'Brightness: ' + p.brightness_nits + ' nits' });
  if (exportPanelWeightKg) lines.push({ text: 'Weight/Panel: ' + panelWeightLbs + ' lbs (' + Math.ceil(exportPanelWeightKg) + ' kg)' });
  lines.push({ text: 'Panel Power: ' + p.power_max_w + ' W / ' + p.power_avg_w + ' W (Max/Avg)' });
  if (p.max_hanging !== null && p.max_hanging !== undefined) lines.push({ text: 'Max Hanging: ' + p.max_hanging + ' panels' });
  if (p.max_stacking !== null && p.max_stacking !== undefined) lines.push({ text: 'Max Stacking: ' + p.max_stacking + ' panels' });
  if (p.bumper_1w_lbs !== null && p.bumper_1w_lbs !== undefined) {
    lines.push({ text: 'Bumper Weights: 1W=' + Math.ceil(p.bumper_1w_lbs) + ' lbs, 2W=' + Math.ceil(p.bumper_2w_lbs) + ' lbs' });
  }
  lines.push({ text: '' });

  // WALL section
  lines.push({ text: 'WALL', bold: true, header: true });
  lines.push({ text: 'Dimensions: ' + wallWidthFt + "' × " + wallHeightFt + "' (" + pw + ' × ' + ph + ' panels)' });
  lines.push({ text: 'Total Panels: ' + activePanels });
  lines.push({ text: 'Resolution: ' + wallResX + ' × ' + wallResY + ' px' });
  lines.push({ text: 'Total Pixels: ' + totalPixels.toLocaleString() + ' px' });

  // Weight
  const structureType = data.structureType || 'hanging';
  let structureWeightKg = 0;
  if (structureType === 'floor' && p && p.is_floor_panel && p.floor_frames) {
    const floorFrames = calc.floorFrames || {};
    structureWeightKg = floorFrames.totalWeightLbs ? floorFrames.totalWeightLbs / 2.20462 : (floorFrames.totalWeightKg || 0);
  } else {
    structureWeightKg += (calc.bumperWeightKg || 0);
    structureWeightKg += (calc.platesWeightKg || 0);
    if (structureType === 'ground') structureWeightKg += (calc.groundSupportWeightKg || 0);
  }
  const totalWeightKg = panelOnlyWeightKg + structureWeightKg;
  const totalWeightLbs = Math.ceil(totalWeightKg * 2.20462);
  lines.push({ text: 'Total Weight: ' + totalWeightLbs + ' lbs (' + Math.ceil(totalWeightKg) + ' kg)' });
  if (structureWeightKg > 0 || structureType === 'floor') {
    lines.push({ text: '  Panels: ' + panelOnlyWeightLbs + ' lbs (' + Math.ceil(panelOnlyWeightKg) + ' kg)' });
    lines.push({ text: '  Structure: ' + Math.ceil(structureWeightKg * 2.20462) + ' lbs (' + Math.ceil(structureWeightKg) + ' kg)' });
  }
  lines.push({ text: '' });

  // POWER section
  const powerHeader = powerType === 'max' ? 'POWER (MAX)' : 'POWER (AVG)';
  lines.push({ text: powerHeader, bold: true, header: true });
  lines.push({ text: 'Total Power: ' + totalPowerW.toLocaleString() + ' W' });
  lines.push({ text: 'Total Amps: ' + ampsSingle.toFixed(2) + ' A @ ' + voltage + 'V' });
  if (phase === 3) lines.push({ text: 'Amps/Phase: ' + ampsPerPhase.toFixed(2) + ' A @ ' + voltage + 'V' });
  lines.push({ text: 'Circuits: ' + (calc.circuitsNeeded || 0) });
  lines.push({ text: 'Max Panels/Circuit: ' + maxPanelsPerCircuit });
  lines.push({ text: '' });

  // DATA section
  lines.push({ text: 'DATA', bold: true, header: true });
  if (pr) {
    lines.push({ text: 'Processor: ' + (pr.name || data.processor) });
  }
  const portCapacity = pr ? (pr.base_pixels_1g || 0) : 0;
  lines.push({ text: 'Data Lines: ' + (calc.dataLines || 0) });
  lines.push({ text: 'Ports Needed: ' + (calc.portsNeededFinal || calc.portsNeeded || 0) });
  lines.push({ text: 'Port Capacity: ' + portCapacity.toLocaleString() + ' px' });
  lines.push({ text: 'Max Panels/Data: ' + (calc.panelsPerDataLine || 0) });
  const frameRate = data.frameRate || '60';
  const bitDepth = data.bitDepth || '8';
  lines.push({ text: 'Frame Rate: ' + frameRate + ' Hz' });
  lines.push({ text: 'Bit Depth: ' + bitDepth + '-bit' });
  lines.push({ text: 'Redundancy: ' + (data.redundancy ? 'Yes' : 'No') });

  return lines;
}

function buildGearLines(screenId) {
  const screenIds = [screenId];
  if (typeof buildGearListData !== 'function') return [{ text: 'Gear data unavailable' }];

  const gearData = buildGearListData(screenIds);
  const lines = [];

  if (!gearData.screens || gearData.screens.length === 0) return lines;
  const sd = gearData.screens[0];
  const eq = sd.equipment;
  const rig = sd.rigging;
  const gs = sd.groundSupport;
  const fh = sd.floorHardware;
  const dc = sd.dataCables;
  const pc = sd.powerCables;
  const p2d = sd.processorToDistBox;

  function addLine(text, val) {
    if (val === 0 || val === '0' || val === '' || val === null || val === undefined) return;
    const numVal = Number(val);
    if (!isNaN(numVal) && numVal > 0) {
      lines.push({ text: numVal + ' x ' + text.replace(/:$/, '').trim() });
    } else {
      lines.push({ text: text + ' ' + val });
    }
  }

  // Equipment
  lines.push({ text: 'Equipment', bold: true, header: true });
  if (eq.isFirstScreenInGroup && eq.processorCount > 0) {
    lines.push({ text: 'Processor:' });
    lines.push({ text: '  ' + eq.processorCount + ' x ' + eq.processorName });
    if (eq.distBoxCount > 0) lines.push({ text: '  ' + eq.distBoxCount + ' x ' + eq.distBoxName });
  } else if (eq.referencesScreenName) {
    lines.push({ text: 'Processor: See ' + eq.referencesScreenName });
  }
  lines.push({ text: 'Panels:' });
  if (eq.activeHalfPanels > 0) {
    lines.push({ text: '  ' + eq.activeFullPanels + ' x ' + eq.panelBrand + ' ' + eq.panelName });
    lines.push({ text: '  ' + eq.activeHalfPanels + ' x ' + eq.panelBrand + ' ' + eq.halfPanelName });
  } else {
    lines.push({ text: '  ' + eq.activePanels + ' x ' + eq.panelBrand + ' ' + eq.panelName });
  }
  lines.push({ text: '' });

  // Rigging
  if (rig.hasRigging) {
    lines.push({ text: 'Rigging Hardware', bold: true, header: true });
    addLine('1W Bumpers', rig.bumper1w);
    addLine('2W Bumpers', rig.bumper2w);
    addLine('4W Bumpers', rig.bumper4w);
    addLine('4W Connecting Plates', rig.plates4way);
    addLine('2W Connecting Plates', rig.plates2way);
    if (rig.shackles > 0) addLine('5/8" Shackles', rig.shackles);
    if (rig.cheeseye > 0) addLine('Cheeseye', rig.cheeseye);
    lines.push({ text: '' });
  }

  // Ground Support
  if (gs && gs.hasGS) {
    lines.push({ text: 'Ground Support', bold: true, header: true });
    addLine('Rear Truss', gs.rearTruss);
    addLine('Base Truss', gs.baseTruss);
    addLine('Bridge Clamps', gs.bridgeClamps);
    addLine('Rear Bridge Adapter', gs.rearBridgeAdapters);
    addLine('Sandbags', gs.sandbags);
    addLine('Swivel Cheeseborough', gs.swivelCheeseboroughs);
    addLine('Pipe' + gs.pipeLengthStr, gs.pipes);
    lines.push({ text: '' });
  }

  // Floor Hardware
  if (fh && fh.hasFloorFrames) {
    lines.push({ text: 'Floor Hardware', bold: true, header: true });
    if (fh.frame3x2 > 0) addLine('3×2 Frame', fh.frame3x2);
    if (fh.frame2x2 > 0) addLine('2×2 Frame', fh.frame2x2);
    if (fh.frame2x1 > 0) addLine('2×1 Frame', fh.frame2x1);
    if (fh.frame1x1 > 0) addLine('1×1 Frame', fh.frame1x1);
    lines.push({ text: '' });
  }

  // Data Cables
  lines.push({ text: 'Data Cables', bold: true, header: true });
  if (dc.jumperCount > 0) addLine('Data Jumpers ' + dc.dataJumperLen, dc.jumperCount);
  if (dc.crossJumperCount > 0 && dc.crossJumperLen) addLine('Data Cross Jumpers ' + dc.crossJumperLen, dc.crossJumperCount);
  if (dc.cat5CouplerCount > 0) addLine('Cat5 Couplers', dc.cat5CouplerCount);
  const cat6Lengths = Object.keys(dc.cat6ByLength).map(Number).sort(function(a, b) { return b - a; });
  cat6Lengths.forEach(function(len) {
    addLine(len + "' Cat6", dc.cat6ByLength[len]);
  });
  lines.push({ text: '' });

  // Power Cables
  lines.push({ text: 'Power Cables', bold: true, header: true });
  if (pc.jumperCount > 0) addLine('Power Jumpers ' + pc.powerJumperLen, pc.jumperCount);
  addLine('Soca Splays', pc.socaSplays);
  const socaLengths = Object.keys(pc.socaByLength).map(Number).sort(function(a, b) { return b - a; });
  socaLengths.forEach(function(len) {
    addLine(len + "' Soca", pc.socaByLength[len]);
  });
  addLine("25' True1", pc.true1_25);
  addLine("10' True1", pc.true1_10);
  addLine("5' True1", pc.true1_5);
  if (pc.true1Twofer > 0) addLine('True1 Twofer', pc.true1Twofer);
  lines.push({ text: '' });

  // Processor → Dist Box
  if (p2d && p2d.count > 0) {
    lines.push({ text: 'Processor → Dist Box', bold: true, header: true });
    addLine(p2d.cableType + ' ' + p2d.cableLength + "'", p2d.count);
    lines.push({ text: '' });
  }

  return lines;
}

function buildSystemGearLines(screenIds) {
  if (typeof buildGearListData !== 'function') return [];
  const gearData = buildGearListData(screenIds);
  const lines = [];

  // Signal Cables
  const sig = gearData.signalCables;
  if (sig) {
    lines.push({ text: 'Signal Cables', bold: true, header: true });
    if (sig.serverFiberLine) {
      lines.push({ text: sig.serverFiberLine.count + ' x ' + sig.serverFiberLine.label });
    }
    const sdiLengths = Object.keys(sig.sdiByLength).map(Number).sort(function(a, b) { return b - a; });
    sdiLengths.forEach(function(len) {
      if (sig.sdiByLength[len] > 0) {
        lines.push({ text: sig.sdiByLength[len] + " x " + len + "' " + sig.sdiType });
      }
    });
    lines.push({ text: sig.hdmi[25] + " x 25' HDMI" });
    lines.push({ text: sig.hdmi[10] + " x 10' HDMI" });
    lines.push({ text: sig.hdmi[6] + " x 6' HDMI" });
    lines.push({ text: '' });
  }

  // Utility
  const util = gearData.utility;
  if (util) {
    lines.push({ text: 'Utility', bold: true, header: true });
    lines.push({ text: util.ug10 + " x UG 10'" });
    lines.push({ text: util.ug25 + " x UG 25'" });
    lines.push({ text: util.ug50 + " x UG 50'" });
    lines.push({ text: util.ugTwofers + ' x UG Twofers' });
    lines.push({ text: util.powerBars + ' x Power Bars' });
    lines.push({ text: '' });
  }

  // Spares
  const sp = gearData.spares;
  if (sp) {
    lines.push({ text: 'Spares', bold: true, header: true });
    if (sp.panelsByType) {
      Object.entries(sp.panelsByType).forEach(function(entry) {
        if (entry[1] > 0) lines.push({ text: entry[1] + ' x ' + entry[0] });
      });
    }
    if (sp.shackles) lines.push({ text: sp.shackles + ' x Shackles' });
    if (sp.cheeseyes) lines.push({ text: sp.cheeseyes + ' x Cheeseyes' });
    if (sp.crossJumpers) lines.push({ text: sp.crossJumpers + " x Cross Jumpers " + sp.crossJumperLen + "'" });
    if (sp.cat5Couplers) lines.push({ text: sp.cat5Couplers + ' x Cat5 Couplers' });
    if (sp.cat6ByLength) {
      Object.entries(sp.cat6ByLength).sort(function(a, b) { return Number(b[0]) - Number(a[0]); }).forEach(function(entry) {
        if (entry[1] > 0) lines.push({ text: entry[1] + " x " + entry[0] + "' Cat6" });
      });
    }
    if (sp.socaSplays) lines.push({ text: sp.socaSplays + ' x Soca Splays' });
    if (sp.true1_25) lines.push({ text: sp.true1_25 + " x 25' True1" });
    if (sp.true1_10) lines.push({ text: sp.true1_10 + " x 10' True1" });
    if (sp.true1_5) lines.push({ text: sp.true1_5 + " x 5' True1" });
    if (sp.true1Twofer) lines.push({ text: sp.true1Twofer + ' x True1 Twofer' });
    lines.push({ text: '' });
  }

  return lines;
}

function buildStructureInfoLines(screenId) {
  const screen = screens[screenId];
  if (!screen || !screen.data) return [];

  const data = screen.data;
  const calc = screen.calculatedData || {};
  const allPanels = getAllPanels();
  const panelType = data.panelType || 'CB5_MKII';
  const p = allPanels[panelType];
  const pw = parseInt(data.panelsWide) || 0;
  const ph = parseInt(data.panelsHigh) || 0;
  if (!p || pw === 0 || ph === 0) return [];

  const lines = [];
  const wtUnit = (typeof displayWeightUnit !== 'undefined' && displayWeightUnit === 'kg') ? 'kg' : 'lbs';
  const toDisplay = function(kg) {
    return wtUnit === 'lbs' ? Math.ceil(kg * 2.20462) : Math.ceil(kg);
  };

  // Pickup Weights
  if (typeof bumpers !== 'undefined' && bumpers.length > 0) {
    lines.push({ text: 'Pickup Weights', bold: true, header: true });

    function is2wUnder4w(bumper2w, position) {
      var fourWayBumpers = bumpers.filter(function(b) { return b.type === '4w' && b.position === position; });
      for (var i = 0; i < fourWayBumpers.length; i++) {
        var b4w = fourWayBumpers[i];
        var col4wStart = b4w.startCol - 1;
        var col4wEnd = b4w.endCol;
        if (bumper2w.startCol >= col4wStart && bumper2w.endCol <= col4wEnd) return true;
      }
      return false;
    }

    var totalPickupKg = 0;
    var topBumpers = bumpers.filter(function(b) { return b.position === 'top'; });
    var bottomBumpers = bumpers.filter(function(b) { return b.position === 'bottom'; });

    if (topBumpers.length > 0) {
      var sorted = topBumpers.slice().sort(function(a, b) {
        var order = { '4w': 0, '2w': 1, '1w': 2 };
        return order[a.type] - order[b.type];
      });
      var counts = { '4w': 0, '2w': 0, '1w': 0 };
      sorted.forEach(function(bumper) {
        if (bumper.type === '2w' && is2wUnder4w(bumper, 'top')) return;
        counts[bumper.type]++;
        if (typeof calculateBumperPickupWeight === 'function') {
          var weight = calculateBumperPickupWeight(bumper);
          totalPickupKg += weight.kg;
          var label = bumper.type === '4w' ? '4W' : bumper.type === '2w' ? '2W' : '1W';
          lines.push({ text: '  ' + label + ' #' + counts[bumper.type] + ': ' + toDisplay(weight.kg) + ' ' + wtUnit });
        }
      });
    }

    if (bottomBumpers.length > 0) {
      var sortedB = bottomBumpers.slice().sort(function(a, b) {
        var order = { '4w': 0, '2w': 1, '1w': 2 };
        return order[a.type] - order[b.type];
      });
      var countsB = { '4w': 0, '2w': 0, '1w': 0 };
      sortedB.forEach(function(bumper) {
        if (bumper.type === '2w' && is2wUnder4w(bumper, 'bottom')) return;
        countsB[bumper.type]++;
        if (typeof calculateBumperPickupWeight === 'function') {
          var weight = calculateBumperPickupWeight(bumper);
          totalPickupKg += weight.kg;
          var label = bumper.type === '4w' ? '4W' : bumper.type === '2w' ? '2W' : '1W';
          lines.push({ text: '  ' + label + ' #' + countsB[bumper.type] + ': ' + toDisplay(weight.kg) + ' ' + wtUnit });
        }
      });
    }

    lines.push({ text: '  Total: ' + toDisplay(totalPickupKg) + ' ' + wtUnit, bold: true });
    lines.push({ text: '' });
  }

  // Connecting Plates
  var structureType = data.structureType || 'hanging';
  var useConnectingPlates = (typeof shouldUseConnectingPlates === 'function') && shouldUseConnectingPlates(panelType);
  var platesWeightKg = 0;
  if (useConnectingPlates && typeof calculateConnectingPlates === 'function') {
    var plates = calculateConnectingPlates(pw, ph,
      (typeof PLATE_WEIGHTS !== 'undefined') ? PLATE_WEIGHTS.plate2wayKg : 0,
      (typeof PLATE_WEIGHTS !== 'undefined') ? PLATE_WEIGHTS.plate4wayKg : 0);
    platesWeightKg = plates.totalPlateWeight || 0;
    if (plates.total2way > 0 || plates.total4way > 0) {
      lines.push({ text: 'Connecting Plates', bold: true, header: true });
      if (plates.total2way > 0) lines.push({ text: '  2-Way: ' + plates.total2way });
      if (plates.total4way > 0) lines.push({ text: '  4-Way: ' + plates.total4way });
      lines.push({ text: '  Total Weight: ' + toDisplay(platesWeightKg) + ' ' + wtUnit, bold: true });
      lines.push({ text: '' });
    }
  }

  // Ground Support
  var groundSupportWeightKg = 0;
  if (structureType === 'ground' && typeof showBottomBumper !== 'undefined' && showBottomBumper) {
    if (typeof calculateGroundSupportHardware === 'function') {
      var hardware = calculateGroundSupportHardware(pw, ph);
      if (hardware.totalRearTruss > 0 || hardware.totalBridgeClamps > 0 || hardware.totalBaseTruss > 0) {
        lines.push({ text: 'Ground Support Hardware', bold: true, header: true });
        if (hardware.totalRearTruss > 0) lines.push({ text: '  Rear Truss: ' + hardware.totalRearTruss });
        if (hardware.totalBaseTruss > 0) lines.push({ text: '  Base Truss: ' + hardware.totalBaseTruss });
        if (hardware.totalBridgeClamps > 0) lines.push({ text: '  Bridge Clamps: ' + hardware.totalBridgeClamps });
        if (hardware.totalRearBridgeClampAdapters > 0) lines.push({ text: '  Rear Bridge Adapter: ' + hardware.totalRearBridgeClampAdapters });
        if (hardware.totalPipes > 0) {
          var uniqueLengths = [];
          if (hardware.pipeInfo) {
            hardware.pipeInfo.forEach(function(pi) {
              if (uniqueLengths.indexOf(pi.pipeLengthFt) === -1) uniqueLengths.push(pi.pipeLengthFt);
            });
          }
          var pipeLenStr = uniqueLengths.map(function(l) { return l + 'ft'; }).join(', ');
          lines.push({ text: '  Pipe (' + pipeLenStr + '): ' + hardware.totalPipes });
        }
        if (hardware.totalSwivelCheeseboroughs > 0) lines.push({ text: '  Swivel Cheeseborough: ' + hardware.totalSwivelCheeseboroughs });
        if (hardware.totalSandbags > 0) lines.push({ text: '  Sandbags (25lb): ' + hardware.totalSandbags });
        groundSupportWeightKg = hardware.totalWeightKg || 0;
        lines.push({ text: '  Total Weight: ' + toDisplay(groundSupportWeightKg) + ' ' + wtUnit, bold: true });
        lines.push({ text: '' });
      }
    }
  }

  // Floor Frames
  var floorFramesWeightKg = 0;
  if (structureType === 'floor' && p.is_floor_panel && p.floor_frames) {
    if (typeof calculateFloorFrames === 'function' && typeof getFloorFrameCounts === 'function') {
      var frames = calculateFloorFrames(pw, ph, deletedPanels);
      var fc = getFloorFrameCounts(frames);
      if (fc.frame_1x1 > 0 || fc.frame_2x1 > 0 || fc.frame_2x2 > 0 || fc.frame_3x2 > 0) {
        lines.push({ text: 'Floor Frames', bold: true, header: true });
        if (fc.frame_3x2 > 0) {
          lines.push({ text: '  3x2 Frame: ' + fc.frame_3x2 });
          if (p.floor_frames.frame_3x2) floorFramesWeightKg += fc.frame_3x2 * p.floor_frames.frame_3x2.weight_lbs / 2.20462;
        }
        if (fc.frame_2x2 > 0) {
          lines.push({ text: '  2x2 Frame: ' + fc.frame_2x2 });
          if (p.floor_frames.frame_2x2) floorFramesWeightKg += fc.frame_2x2 * p.floor_frames.frame_2x2.weight_lbs / 2.20462;
        }
        if (fc.frame_2x1 > 0) {
          lines.push({ text: '  2x1 Frame: ' + fc.frame_2x1 });
          if (p.floor_frames.frame_2x1) floorFramesWeightKg += fc.frame_2x1 * p.floor_frames.frame_2x1.weight_lbs / 2.20462;
        }
        if (fc.frame_1x1 > 0) {
          lines.push({ text: '  1x1 Frame: ' + fc.frame_1x1 });
          if (p.floor_frames.frame_1x1) floorFramesWeightKg += fc.frame_1x1 * p.floor_frames.frame_1x1.weight_lbs / 2.20462;
        }
        lines.push({ text: '  Total Weight: ' + toDisplay(floorFramesWeightKg) + ' ' + wtUnit, bold: true });
        lines.push({ text: '' });
      }
    }
  }

  // Total Structure Weight
  var bumperHwKg = (typeof calculateTotalBumperWeight === 'function') ? calculateTotalBumperWeight(pw, ph) : 0;
  var totalStructKg = bumperHwKg + platesWeightKg + groundSupportWeightKg + floorFramesWeightKg;
  if (totalStructKg > 0 || structureType === 'floor') {
    lines.push({ text: 'Total Structure Weight', bold: true, header: true });
    if (bumperHwKg > 0 && structureType !== 'floor') lines.push({ text: '  Bumpers: ' + toDisplay(bumperHwKg) + ' ' + wtUnit });
    if (platesWeightKg > 0) lines.push({ text: '  Plates: ' + toDisplay(platesWeightKg) + ' ' + wtUnit });
    if (groundSupportWeightKg > 0) lines.push({ text: '  Ground Support: ' + toDisplay(groundSupportWeightKg) + ' ' + wtUnit });
    if (floorFramesWeightKg > 0) lines.push({ text: '  Floor Frames: ' + toDisplay(floorFramesWeightKg) + ' ' + wtUnit });
    lines.push({ text: '  Total: ' + toDisplay(totalStructKg) + ' ' + wtUnit, bold: true });
  }

  return lines;
}

// ==================== ZOOM CONTROLS ====================

function ppZoomIn() {
  ppZoomLevel = Math.min(ppZoomLevel + 0.25, 3.0);
  ppUpdateZoomLabel();
  ppRenderPreservingScroll();
}

function ppZoomOut() {
  ppZoomLevel = Math.max(ppZoomLevel - 0.25, 0.5);
  ppUpdateZoomLabel();
  ppRenderPreservingScroll();
}

function ppZoomReset() {
  ppZoomLevel = 1.0;
  ppUpdateZoomLabel();
  ppRenderPreservingScroll();
}

function ppRenderPreservingScroll() {
  var scrollArea = document.querySelector('.print-preview-area');
  var scrollRatio = 0;
  if (scrollArea && scrollArea.scrollHeight > scrollArea.clientHeight) {
    scrollRatio = scrollArea.scrollTop / (scrollArea.scrollHeight - scrollArea.clientHeight);
  }
  renderPreviewPages();
  if (scrollArea && scrollArea.scrollHeight > scrollArea.clientHeight) {
    scrollArea.scrollTop = scrollRatio * (scrollArea.scrollHeight - scrollArea.clientHeight);
  }
}

function ppUpdateZoomLabel() {
  const btn = document.querySelector('.preview-zoom-reset');
  if (btn) btn.textContent = Math.round(ppZoomLevel * 100) + '%';
}

// ==================== PREVIEW RENDERER ====================

function renderPreviewPages() {
  const container = document.getElementById('previewPagesContainer');
  if (!container) return;

  container.innerHTML = '';

  // Calculate base scale to fit pages in the preview area, then apply zoom
  const areaWidth = container.clientWidth - 40;
  const baseScale = Math.min(areaWidth / ppPageWidth, 2.5);
  ppScale = Math.max(0.5, baseScale * ppZoomLevel);

  pdfPageModel.forEach((page, pageIndex) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'preview-page-canvas';
    canvas.width = Math.round(ppPageWidth * ppScale);
    canvas.height = Math.round(ppPageHeight * ppScale);
    canvas.dataset.pageIndex = pageIndex;

    const label = document.createElement('div');
    label.className = 'preview-page-label';
    label.textContent = 'Page ' + (pageIndex + 1);

    const wrapper = document.createElement('div');
    wrapper.className = 'preview-page-wrapper';
    wrapper.appendChild(canvas);
    wrapper.appendChild(label);
    container.appendChild(wrapper);

    renderPreviewPage(pageIndex, canvas);

    // Attach per-canvas mousedown (drag start) + hover
    canvas.addEventListener('mousedown', (e) => ppHandlePointerDown(e, canvas, pageIndex));
    canvas.addEventListener('mousemove', (e) => {
      if (!ppDragState.isDragging) {
        // Hover cursor only when not dragging
        const coords = ppGetPageCoords(e, canvas);
        const hitEl = ppHitTestElement(pageIndex, coords.mmX, coords.mmY);
        canvas.style.cursor = hitEl ? 'grab' : 'default';
      }
    });

    // Touch events
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      ppHandlePointerDown(e.touches[0], canvas, pageIndex);
    }, { passive: false });
  });
}

function renderPreviewPage(pageIndex, canvasEl) {
  const page = pdfPageModel[pageIndex];
  if (!page) return;

  if (!canvasEl) {
    const container = document.getElementById('previewPagesContainer');
    if (!container) return;
    const canvases = container.querySelectorAll('.preview-page-canvas');
    canvasEl = canvases[pageIndex];
    if (!canvasEl) return;
  }

  const ctx = canvasEl.getContext('2d');
  const s = ppScale;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

  // Light gray margin guides (suppressed during high-res export capture)
  if (!ppIsExporting) {
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(
      PP_MARGIN * s, PP_MARGIN * s,
      (ppPageWidth - 2 * PP_MARGIN) * s,
      (ppPageHeight - 2 * PP_MARGIN) * s
    );
    ctx.setLineDash([]);
  }

  // Draw each element
  page.elements.forEach(el => {
    drawPreviewElement(ctx, el, s, pageIndex);
  });
}

function drawPreviewElement(ctx, el, scale, pageIndex) {
  const s = scale;
  const x = el.x * s;
  const y = el.y * s;
  const w = el.w * s;
  const h = el.h * s;

  const isSelected = ppSelectedElement &&
    ppSelectedElement.pageIndex === pageIndex &&
    ppSelectedElement.elementId === el.id;

  const isOverlapping = el.overlapping;

  switch (el.type) {
    case 'text':
      ctx.save();
      ctx.font = (el.bold ? 'bold ' : '') + Math.max(8, el.fontSize * s * 0.35) + 'px Arial';
      ctx.fillStyle = el.color || '#000';
      ctx.textBaseline = 'top';
      if (el.align === 'right') {
        ctx.textAlign = 'right';
        ctx.fillText(el.text, x + w, y);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(el.text, x, y);
      }
      if (isSelected) {
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        ctx.setLineDash([]);
      }
      if (isOverlapping) {
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
      }
      ctx.restore();
      break;

    case 'banner':
      ctx.save();
      ctx.fillStyle = ppCurrentAccentColor || '#10b981';
      ctx.fillRect(x, y, w, h);
      const bSize = Math.max(6, el.fontSize * s * 0.35);
      ctx.font = 'bold ' + bSize + 'px Arial';
      ctx.fillStyle = (ppCurrentAccentColor === '#10b981') ? '#111' : '#fff';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(el.text || '', x + 3 * s, y + h / 2);
      if (el.centerText) {
        ctx.font = 'bold ' + Math.max(5, el.fontSize * s * 0.4) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(el.centerText, x + w / 2, y + h / 2);
      }
      if (el.rightText) {
        ctx.font = Math.max(5, el.fontSize * s * 0.3) + 'px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(el.rightText, x + w - 3 * s, y + h / 2);
      }
      if (isSelected) {
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        ctx.setLineDash([]);
      }
      ctx.restore();
      break;

    case 'textblock':
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, w, h);
      if (isSelected || isOverlapping) {
        ctx.strokeStyle = isSelected ? '#2196F3' : '#ff9800';
        ctx.lineWidth = 2;
        if (isSelected) ctx.setLineDash([4, 3]);
        ctx.strokeRect(x, y, w, h);
        if (isSelected) ctx.setLineDash([]);
      }

      if (el.lines && el.lines.length > 0) {
        const lineH = Math.max(6, 3.5 * s);
        let ty = y + 3 * s;
        const maxLines = Math.floor(h / lineH);
        const accent = ppCurrentAccentColor || '#10b981';
        const rowAlt = accent === '#555' ? '#f0f0f0' : accent === '#6b7280' ? '#f5f5f5' : '#f0fdf4';
        let altRowIdx = 0;

        el.lines.slice(0, maxLines).forEach(line => {
          const text = typeof line === 'string' ? line : line.text;
          const isBold = typeof line === 'object' && line.bold;
          const isHeader = typeof line === 'object' && line.header;

          if (!text || text.trim() === '') {
            ty += lineH * 0.5;
            return;
          }

          // Row background fill
          if (isHeader) {
            // Light tinted section header background + accent left bar
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = accent;
            ctx.fillRect(x, ty - s * 0.5, w, lineH + s * 0.5);
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = accent;
            ctx.fillRect(x, ty - s * 0.5, 2 * s, lineH + s * 0.5);
            altRowIdx = 0;
          } else if (altRowIdx % 2 === 0) {
            ctx.fillStyle = rowAlt;
            ctx.fillRect(x, ty, w, lineH);
            altRowIdx++;
          } else {
            altRowIdx++;
          }

          ctx.font = (isBold ? 'bold ' : '') + Math.max(6, el.fontSize * s * 0.35) + 'px Arial';
          ctx.fillStyle = isHeader ? '#333' : '#555';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(text, x + (isHeader ? 4 : 2) * s, ty, w - 6 * s);
          ty += lineH;
        });
      }
      ctx.restore();
      break;

    case 'image':
      ctx.save();
      const cached = ppCanvasCache[el.imageKey];
      if (cached && cached.imgElement) {
        ctx.drawImage(cached.imgElement, x, y, w, h);
      } else if (cached && cached.dataUrl) {
        const img = new Image();
        img.onload = () => {
          cached.imgElement = img;
          // Re-render this page to show the loaded image
          renderPreviewPage(pageIndex);
        };
        img.src = cached.dataUrl;
        // Draw placeholder while loading
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, w, h);
      } else {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#999';
        ctx.font = Math.max(8, 10 * s * 0.35) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('[Image]', x + w / 2, y + h / 2);
      }

      ctx.strokeStyle = isSelected ? '#2196F3' : (isOverlapping ? '#ff9800' : '#ccc');
      ctx.lineWidth = (isSelected || isOverlapping) ? 2 : 1;
      if (isSelected) ctx.setLineDash([4, 3]);
      ctx.strokeRect(x, y, w, h);
      if (isSelected) ctx.setLineDash([]);
      ctx.restore();
      break;

    case 'layout':
      ctx.save();
      const layoutTitlePx = el.titleH * s;
      const layoutImgY = y + layoutTitlePx;
      const layoutImgH = h - layoutTitlePx;

      // Draw title as plain bold text (no background fill)
      const ltSize = Math.max(6, el.fontSize * s * 0.35);
      ctx.font = 'bold ' + ltSize + 'px Arial';
      ctx.fillStyle = '#333';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(el.title.toUpperCase(), x, y);

      const cachedLayout = ppCanvasCache[el.imageKey];
      if (cachedLayout && cachedLayout.imgElement) {
        ctx.drawImage(cachedLayout.imgElement, x, layoutImgY, w, layoutImgH);
      } else if (cachedLayout && cachedLayout.dataUrl) {
        const img = new Image();
        img.onload = () => {
          cachedLayout.imgElement = img;
          renderPreviewPage(pageIndex);
        };
        img.src = cachedLayout.dataUrl;
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, layoutImgY, w, layoutImgH);
      } else {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, layoutImgY, w, layoutImgH);
        ctx.fillStyle = '#999';
        ctx.font = Math.max(8, 10 * s * 0.35) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('[Image]', x + w / 2, layoutImgY + layoutImgH / 2);
      }

      // Selection/overlap border around entire element (title + image)
      if (isSelected || isOverlapping) {
        ctx.strokeStyle = isSelected ? '#2196F3' : '#ff9800';
        ctx.lineWidth = 2;
        if (isSelected) ctx.setLineDash([4, 3]);
        ctx.strokeRect(x, y, w, h);
        if (isSelected) ctx.setLineDash([]);
      }
      ctx.restore();
      break;

    case 'watermark':
      ctx.save();
      ctx.font = Math.max(5, el.fontSize * s * 0.35) + 'px Arial';
      ctx.fillStyle = el.color || '#aaa';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(el.text, x, y);
      ctx.restore();
      break;
  }
}

// ==================== DRAG AND DROP (CROSS-PAGE) ====================

function ppGetPageCoords(pointerEvent, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const px = (pointerEvent.clientX - rect.left) * scaleX;
  const py = (pointerEvent.clientY - rect.top) * scaleY;
  return {
    mmX: px / ppScale,
    mmY: py / ppScale
  };
}

function ppHitTestElement(pageIndex, mmX, mmY) {
  const page = pdfPageModel[pageIndex];
  if (!page) return null;

  for (let i = page.elements.length - 1; i >= 0; i--) {
    const el = page.elements[i];
    if (el.type === 'watermark') continue;
    if (mmX >= el.x && mmX <= el.x + el.w && mmY >= el.y && mmY <= el.y + el.h) {
      return el;
    }
  }
  return null;
}

function ppFindPageCanvasAtPoint(clientX, clientY) {
  const container = document.getElementById('previewPagesContainer');
  if (!container) return null;
  const canvases = container.querySelectorAll('.preview-page-canvas');
  for (let i = 0; i < canvases.length; i++) {
    const rect = canvases[i].getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      return { canvas: canvases[i], pageIndex: parseInt(canvases[i].dataset.pageIndex) };
    }
  }
  return null;
}

function ppHandlePointerDown(e, canvas, pageIndex) {
  // Drag is only active when Manual Adjust is on
  if (!ppManualAdjust) return;

  const coords = ppGetPageCoords(e, canvas);
  const hitEl = ppHitTestElement(pageIndex, coords.mmX, coords.mmY);

  if (hitEl) {
    ppSelectedElement = { pageIndex, elementId: hitEl.id };
    ppDragState.isDragging = true;
    ppDragState.startMouseX = e.clientX;
    ppDragState.startMouseY = e.clientY;
    ppDragState.startElemX = hitEl.x;
    ppDragState.startElemY = hitEl.y;
    ppDragState.pageIndex = pageIndex;
    ppDragState.draggedElement = hitEl;
    canvas.style.cursor = 'grabbing';

    // Use document-level listeners for cross-page drag
    document.addEventListener('mousemove', ppDocMouseMove);
    document.addEventListener('mouseup', ppDocMouseUp);

    // Touch
    document.addEventListener('touchmove', ppDocTouchMove, { passive: false });
    document.addEventListener('touchend', ppDocTouchEnd);
  } else {
    ppSelectedElement = null;
    ppDragState.isDragging = false;
  }

  renderPreviewPage(pageIndex);
}

function ppDocMouseMove(e) {
  if (!ppDragState.isDragging || !ppDragState.draggedElement) return;

  const target = ppFindPageCanvasAtPoint(e.clientX, e.clientY);
  if (!target) return;

  const el = ppDragState.draggedElement;
  const currentPageIndex = ppDragState.pageIndex;
  const targetPageIndex = target.pageIndex;

  // If mouse moved to a different page, transfer the element
  if (targetPageIndex !== currentPageIndex) {
    // Remove from current page
    const currentPage = pdfPageModel[currentPageIndex];
    const elIdx = currentPage.elements.indexOf(el);
    if (elIdx !== -1) currentPage.elements.splice(elIdx, 1);

    // Add to target page
    const targetPage = pdfPageModel[targetPageIndex];
    targetPage.elements.push(el);

    // Update state
    ppDragState.pageIndex = targetPageIndex;
    ppSelectedElement.pageIndex = targetPageIndex;

    // Reset start position for smooth transition
    const coords = ppGetPageCoords(e, target.canvas);
    ppDragState.startMouseX = e.clientX;
    ppDragState.startMouseY = e.clientY;
    ppDragState.startElemX = coords.mmX - el.w / 2;
    ppDragState.startElemY = coords.mmY - el.h / 2;

    // Re-render both pages
    renderPreviewPage(currentPageIndex);
  }

  // Update position on current (or new) page
  const coords = ppGetPageCoords(e, target.canvas);
  let newX = ppDragState.startElemX + (e.clientX - ppDragState.startMouseX) / ppScale;
  let newY = ppDragState.startElemY + (e.clientY - ppDragState.startMouseY) / ppScale;

  // Snap to grid
  newX = Math.round(newX / PP_GRID_SIZE) * PP_GRID_SIZE;
  newY = Math.round(newY / PP_GRID_SIZE) * PP_GRID_SIZE;

  // Constrain within margins
  newX = Math.max(PP_MARGIN, Math.min(newX, ppPageWidth - PP_MARGIN - el.w));
  newY = Math.max(PP_MARGIN, Math.min(newY, ppPageHeight - PP_MARGIN - el.h));

  el.x = newX;
  el.y = newY;

  renderPreviewPage(ppDragState.pageIndex);
}

function ppDocMouseUp(e) {
  if (ppDragState.isDragging) {
    ppDragState.isDragging = false;
    ppDragState.draggedElement = null;

    // Reset cursor on all canvases
    const container = document.getElementById('previewPagesContainer');
    if (container) {
      container.querySelectorAll('.preview-page-canvas').forEach(c => {
        c.style.cursor = 'default';
      });
    }

    checkOverlaps(ppSelectedElement ? ppSelectedElement.pageIndex : -1);

    // Remove any pages that are now blank (only watermark left)
    ppRemoveBlankPages();
  }

  document.removeEventListener('mousemove', ppDocMouseMove);
  document.removeEventListener('mouseup', ppDocMouseUp);
}

function ppDocTouchMove(e) {
  if (!ppDragState.isDragging) return;
  e.preventDefault();
  // Reuse mouse logic with touch coordinates
  ppDocMouseMove({
    clientX: e.touches[0].clientX,
    clientY: e.touches[0].clientY,
    preventDefault: function() {}
  });
}

function ppDocTouchEnd(e) {
  ppDocMouseUp(e);
  document.removeEventListener('touchmove', ppDocTouchMove);
  document.removeEventListener('touchend', ppDocTouchEnd);
}

function ppRemoveBlankPages() {
  let removed = false;

  for (let i = pdfPageModel.length - 1; i >= 0; i--) {
    const page = pdfPageModel[i];
    // A page is "blank" if it has no elements, or only watermark elements
    const hasContent = page.elements.some(el => el.type !== 'watermark');
    if (!hasContent) {
      pdfPageModel.splice(i, 1);
      removed = true;

      // Adjust selected element's page index if needed
      if (ppSelectedElement) {
        if (ppSelectedElement.pageIndex === i) {
          ppSelectedElement = null;
        } else if (ppSelectedElement.pageIndex > i) {
          ppSelectedElement.pageIndex--;
        }
      }
    }
  }

  if (removed) {
    // Renumber pages
    pdfPageModel.forEach((page, idx) => { page.pageNum = idx + 1; });
    // Preserve scroll position across re-render
    const scrollArea = document.querySelector('.print-preview-area');
    const savedScroll = scrollArea ? scrollArea.scrollTop : 0;
    renderPreviewPages();
    if (scrollArea) scrollArea.scrollTop = savedScroll;
  }
}

function checkOverlaps(pageIndex) {
  const page = pdfPageModel[pageIndex];
  if (!page) return;

  page.elements.forEach(el => { el.overlapping = false; });

  for (let i = 0; i < page.elements.length; i++) {
    for (let j = i + 1; j < page.elements.length; j++) {
      const a = page.elements[i];
      const b = page.elements[j];
      if (a.type === 'watermark' || b.type === 'watermark') continue;

      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
        a.overlapping = true;
        b.overlapping = true;
      }
    }
  }

  renderPreviewPage(pageIndex);
}

// ==================== EXPORT FROM PREVIEW ====================

function exportFromPreview() {
  if (!window.pdfMake) {
    showAlert('PDF library not loaded. Please check your connection and refresh.');
    return;
  }

  const opts = getPrintPreviewOptions();

  // Loading overlay
  const overlay = document.createElement('div');
  overlay.id = 'ppExportOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(26,26,26,0.95);z-index:10000;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;font-family:-apple-system,Arial,sans-serif;';
  overlay.innerHTML = '<div style="font-size:20px;margin-bottom:12px;">Exporting PDF...</div><div id="ppExportStatus" style="font-size:13px;color:#888;">Capturing layouts\u2026</div>';
  document.body.appendChild(overlay);

  function removeOverlay() {
    const el = document.getElementById('ppExportOverlay');
    if (el) el.remove();
  }

  function setStatus(msg) {
    const el = document.getElementById('ppExportStatus');
    if (el) el.textContent = msg;
  }

  // Apply eco/greyscale modes so canvas captures use correct colors
  ecoPrintMode = opts.ecoFriendly;
  greyscalePrintMode = opts.greyscale;

  // Capture high-res canvas images (same path as simple mode export)
  const canvasCache = pdfCaptureCanvases();

  // Restore normal colors after capture
  ecoPrintMode = false;
  greyscalePrintMode = false;
  generateLayout('standard');
  generateLayout('power');
  generateLayout('data');
  generateStructureLayout();
  if (typeof switchMobileView === 'function' && typeof currentAppMode !== 'undefined') {
    switchMobileView(currentAppMode);
  }

  setStatus('Building PDF\u2026');

  // Re-apply for doc generation
  ecoPrintMode = opts.ecoFriendly;
  greyscalePrintMode = opts.greyscale;

  const docDef = buildComplexPdf(opts, canvasCache);

  ecoPrintMode = false;
  greyscalePrintMode = false;

  setStatus('Saving\u2026');

  const configName = document.getElementById('configName')?.value?.trim() || 'LED Wall';
  const dateStr    = new Date().toISOString().slice(0, 10);
  const filename   = configName.replace(/[^a-z0-9]/gi, '_') + '_LED_Report_' + dateStr + '.pdf';

  const isMobile = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
    (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent));

  if (isMobile && navigator.share && navigator.canShare) {
    pdfMake.createPdf(docDef).getBlob(function(blob) {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file] }).then(function() {
          removeOverlay();
          closePrintPreview();
        }).catch(function() {
          pdfMake.createPdf(docDef).download(filename, function() {
            removeOverlay();
            closePrintPreview();
          });
        });
      } else {
        pdfMake.createPdf(docDef).download(filename, function() {
          removeOverlay();
          closePrintPreview();
        });
      }
    });
  } else {
    pdfMake.createPdf(docDef).download(filename, function() {
      removeOverlay();
      closePrintPreview();
    });
  }
}
