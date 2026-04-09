// ==================== PDF PRINT PREVIEW ====================
// Preview modal renders the actual pdfmake PDF in an iframe — guaranteed 1:1 match with export.

// ==================== STATE ====================

let pdfPageFormat = 'a4';
let pdfPageOrientation = 'p';

// Page dimensions in mm (kept for updatePageDimensions — pdfmake uses these via pdfPageFormat/pdfPageOrientation)
let ppPageWidth = 210;
let ppPageHeight = 297;

// Canvas cache reuse — avoid re-capturing canvases when only doc-level options change
let _ppCanvasCache = null;
let _ppLastEco = false;
let _ppLastGreyscale = false;

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

  // Invalidate canvas cache so first open always re-captures
  _ppCanvasCache = null;
  _ppLastEco = false;
  _ppLastGreyscale = false;

  // Show modal then render
  modal.classList.add('active');
  requestAnimationFrame(() => rebuildPreview());
}

function closePrintPreview() {
  const modal = document.getElementById('printPreviewModal');
  if (modal) modal.classList.remove('active');

  // Reset print modes
  ecoPrintMode = false;
  greyscalePrintMode = false;

  // Revoke blob URL and clear iframe
  const iframe = document.getElementById('pdfPreviewFrame');
  if (iframe) {
    if (iframe._blobUrl) {
      URL.revokeObjectURL(iframe._blobUrl);
      iframe._blobUrl = null;
    }
    iframe.src = 'about:blank';
  }

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

// ==================== CANVAS CAPTURE (kept for exportFromPreview compatibility) ====================

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

    // Capture each canvas — skip for empty/default walls (≤1 panel total)
    const _capData = screens[screenId] && screens[screenId].data || {};
    const _capPw = parseInt(_capData.panelsWide) || 0;
    const _capPh = parseInt(_capData.panelsHigh) || 0;
    const captures = (_capPw * _capPh > 1) ? [
      { id: 'standardCanvas', key: screenId + '_standard' },
      { id: 'powerCanvas', key: screenId + '_power' },
      { id: 'dataCanvas', key: screenId + '_data' },
      { id: 'structureCanvas', key: screenId + '_structure' },
      { id: 'cableDiagramCanvas', key: screenId + '_cabling' }
    ] : [];

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

// Called by every checkbox/toggle change — always rebuilds the iframe
function onPreviewOptionChange() {
  rebuildPreview();
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

// ==================== REBUILD PREVIEW ====================

function rebuildPreview() {
  const iframe = document.getElementById('pdfPreviewFrame');
  if (!iframe) return;

  const opts = getPrintPreviewOptions();
  const needsCapture = !_ppCanvasCache ||
    opts.ecoFriendly !== _ppLastEco ||
    opts.greyscale !== _ppLastGreyscale;

  if (needsCapture) {
    // Slow path: canvas recapture needed — show overlay, clear iframe
    if (iframe._blobUrl) { URL.revokeObjectURL(iframe._blobUrl); iframe._blobUrl = null; }
    iframe.src = 'about:blank';
    const loader = document.getElementById('pdfPreviewLoading');
    if (loader) loader.style.display = 'flex';
    setTimeout(function() {
      ecoPrintMode = opts.ecoFriendly;
      greyscalePrintMode = opts.greyscale;
      _ppCanvasCache = pdfCaptureCanvases();
      _ppLastEco = opts.ecoFriendly;
      _ppLastGreyscale = opts.greyscale;
      ecoPrintMode = false;
      greyscalePrintMode = false;

      // Set modes so headers/gear list/combined diagram render with correct colors
      ecoPrintMode = opts.ecoFriendly;
      greyscalePrintMode = opts.greyscale;
      const docDef = buildComplexPdf(opts, _ppCanvasCache);
      ecoPrintMode = false;
      greyscalePrintMode = false;

      pdfMake.createPdf(docDef).getBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        iframe._blobUrl = url;
        iframe.src = url;
        if (loader) loader.style.display = 'none';
      });
    }, 0);
  } else {
    // Fast path: cache valid — no overlay, old PDF stays visible, silently swap when ready
    ecoPrintMode = opts.ecoFriendly;
    greyscalePrintMode = opts.greyscale;
    const docDef = buildComplexPdf(opts, _ppCanvasCache);
    ecoPrintMode = false;
    greyscalePrintMode = false;

    pdfMake.createPdf(docDef).getBlob(function(blob) {
      const oldUrl = iframe._blobUrl;
      const url = URL.createObjectURL(blob);
      iframe._blobUrl = url;
      iframe.src = url;
      if (oldUrl) URL.revokeObjectURL(oldUrl);
    });
  }
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
