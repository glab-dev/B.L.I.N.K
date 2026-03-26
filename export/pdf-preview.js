// ==================== PDF PRINT PREVIEW ====================
// Full-screen print preview modal with live canvas preview,
// drag-and-drop element repositioning, and PDF generation.

// ==================== STATE ====================

let pdfPageFormat = 'a4';
let pdfPageOrientation = 'p';

// Cached canvas images (captured once when modal opens, recaptured on print mode change)
let ppCanvasCache = {};

// Track current print mode for recapture detection
let ppCurrentEco = false;
let ppCurrentGreyscale = false;

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

  // Reset page format/orientation
  setPdfPageSize('a4');
  setPdfOrientation('p');

  // Show/hide combined section based on screen count
  const combinedSection = document.getElementById('ppCombinedSection');
  const multiScreenCount = Object.keys(screens).length;
  if (combinedSection) {
    combinedSection.style.display = multiScreenCount > 1 ? 'block' : 'none';
  }
  const combinedCb = document.getElementById('ppCombined');
  if (combinedCb) combinedCb.checked = false;

  // Reset print mode tracking
  ppCurrentEco = false;
  ppCurrentGreyscale = false;

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

  // Clear preview container
  const container = document.getElementById('previewPagesContainer');
  if (container) container.innerHTML = '';

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
  // pdfPageFormat and pdfPageOrientation are read directly by buildPdfDocDefinition in pdf.js
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

  const containers = ['standardContainer', 'powerContainer', 'dataContainer', 'structureContainer', 'cableDiagramContainer'];
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
    if (typeof renderCableDiagram === 'function') {
      renderCableDiagram(screenId);
    }

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

    if (typeof renderCombinedView === 'function') {
      renderCombinedView();
    }

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


// ==================== REBUILD PREVIEW ====================

function rebuildPreview() {
  renderPdfPreview(getPrintPreviewOptions());
}

// ==================== PDF PREVIEW RENDER (iframe) ====================

function renderPdfPreview(opts) {
  if (!opts) opts = getPrintPreviewOptions();
  const container = document.getElementById('previewPagesContainer');
  if (!container) return;

  // Show loading state
  container.innerHTML = '<p style="color:#888;text-align:center;padding:60px 20px;font-family:sans-serif;font-size:14px;">Generating preview\u2026</p>';

  if (typeof pdfMake === 'undefined' || typeof buildPdfDocDefinition === 'undefined') {
    container.innerHTML = '<p style="color:#f87171;text-align:center;padding:60px 20px;font-family:sans-serif;font-size:14px;">PDF library not loaded. Check your connection and refresh.</p>';
    return;
  }

  // iOS Safari cannot display PDF data URLs in iframes
  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isiOS) {
    container.innerHTML = '<p style="color:#888;text-align:center;padding:60px 20px;font-family:sans-serif;font-size:14px;">Preview not available on iOS.<br>Tap <strong>Export PDF</strong> to download.</p>';
    return;
  }

  try {
    ecoPrintMode = opts.ecoFriendly;
    greyscalePrintMode = opts.greyscale;
    const docDef = buildPdfDocDefinition(opts, ppCanvasCache);
    ecoPrintMode = false;
    greyscalePrintMode = false;

    pdfMake.createPdf(docDef).getDataUrl(function(dataUrl) {
      container.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:100%;height:calc(100vh - 100px);min-height:500px;border:none;display:block;';
      iframe.src = dataUrl;
      container.appendChild(iframe);
    });
  } catch (err) {
    console.error('[PDF Preview] Error:', err);
    ecoPrintMode = false;
    greyscalePrintMode = false;
    container.innerHTML = '<p style="color:#f87171;text-align:center;padding:60px 20px;font-family:sans-serif;font-size:14px;">Error generating preview. Try Export PDF instead.</p>';
  }
}

// ==================== EXPORT FROM PREVIEW ====================

function exportFromPreview() {
  const opts = getPrintPreviewOptions();
  // Save cache ref before closePrintPreview() clears ppCanvasCache
  const canvasCache = ppCanvasCache;
  closePrintPreview();

  if (typeof pdfMake === 'undefined' || typeof buildPdfDocDefinition === 'undefined') {
    showAlert('PDF library not loaded. Please check your internet connection and refresh the page.');
    return;
  }

  ecoPrintMode = opts.ecoFriendly;
  greyscalePrintMode = opts.greyscale;
  const docDef = buildPdfDocDefinition(opts, canvasCache);
  ecoPrintMode = false;
  greyscalePrintMode = false;

  const dateStr = new Date().toISOString().slice(0, 10);
  const cfgName = (document.getElementById('configName')?.value?.trim() || 'LED_Wall').replace(/[<>:"/\\|?*]/g, '_');
  const filename = cfgName + '_' + dateStr + '.pdf';

  const isMobile = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
    (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent));

  if (isMobile && navigator.share && navigator.canShare) {
    pdfMake.createPdf(docDef).getBlob(function(blob) {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: filename }).catch(function() {
          pdfMake.createPdf(docDef).download(filename);
        });
      } else {
        pdfMake.createPdf(docDef).download(filename);
      }
    });
  } else {
    pdfMake.createPdf(docDef).download(filename);
  }
}
