// ==================== CANVAS EXPORT (PNG/JPEG) ====================
// Exports the canvas view as PNG or JPEG image.

function exportCanvas(){
  try {
    const canvas = document.getElementById('canvasView');
    if(canvas.width === 0 || document.getElementById('canvasContainer').style.display === 'none'){
      showAlert('Please generate a canvas view first by clicking "Calculate".');
      return;
    }
    
    const format = document.getElementById('canvasExportFormat').value;
    
    // Get the canvas size label
    const canvasSizeSelect = document.getElementById('canvasSize');
    const canvasSizeValue = canvasSizeSelect.value;
    let canvasSizeLabel;
    
    // For custom size, use the actual dimensions
    if(canvasSizeValue === 'custom') {
      canvasSizeLabel = `${canvas.width}x${canvas.height}`;
    } else {
      // Clean up the label (e.g., "4K UHD (3840x2160)" -> "4K_UHD_3840x2160")
      canvasSizeLabel = canvasSizeSelect.options[canvasSizeSelect.selectedIndex].text
        .replace(/\s+/g, '_')
        .replace(/[()]/g, '');
    }
    
    const filenameInput = document.getElementById('canvasExportFilename');
    let customName = filenameInput ? filenameInput.value.trim() : '';
    
    // Always include canvas size in filename
    let filename;
    if(customName) {
      // If custom name provided, append canvas size
      filename = `${customName}_${canvasSizeLabel}`;
    } else {
      // Default name with canvas size
      filename = `LED_Wall_Canvas_${canvasSizeLabel}`;
    }
    
    // Clean filename of invalid characters
    filename = filename.replace(/[<>:"/\\|?*]/g, '_');
    
    // Create a clean canvas without selection highlight or border for export
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');

    // Use cached image data without border for clean export
    if(cachedCanvasImageDataForExport) {
      exportCtx.putImageData(cachedCanvasImageDataForExport, 0, 0);
    } else {
      // Force a fresh render to populate clean export cache
      if(typeof showCanvasView === 'function') showCanvasView();
      if(cachedCanvasImageDataForExport) {
        exportCtx.putImageData(cachedCanvasImageDataForExport, 0, 0);
      } else {
        // Last resort: copy canvas as-is
        exportCtx.drawImage(canvas, 0, 0);
      }
    }
    
    // Handle Resolume XML export
    if(format === 'resolume') {
      exportResolumeXML(filename);
      return;
    }

    // Handle Outline export (opens modal)
    if(format === 'outline') {
      showOutlineExportModal();
      return;
    }

    // Export the clean canvas using blob for better mobile compatibility
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const extension = format === 'jpeg' ? '.jpg' : '.png';
    const quality = format === 'jpeg' ? 0.95 : undefined;

    exportCanvas.toBlob(function(blob) {
      if(!blob) {
        showAlert('Failed to create image. Please try again.');
        return;
      }

      const fullFilename = filename + extension;

      // Mobile: use share API for native "Save to Files" option
      var isMobileDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
                           (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      if(isMobileDevice && navigator.canShare) {
        const file = new File([blob], fullFilename, { type: mimeType });
        if(navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file] }).catch(function() {});
          return;
        }
      }

      // Fallback: direct download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fullFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(function() {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    }, mimeType, quality);
  } catch(err) {
    showAlert('Error exporting canvas: ' + err.message);
    console.error('Export error:', err);
  }
}

// ==================== OUTLINE EXPORT ====================
// Exports a transparent PNG with a solid outline border for overlay use.

var _outlineMode = 'canvas'; // 'canvas' or 'screen'
var _outlineFormat = 'png'; // 'png' or 'jpeg'
var _outlineW = 0;
var _outlineH = 0;

function _getCanvasResolution() {
  var canvasSize = document.getElementById('canvasSize').value;
  if(canvasSize === '4K_UHD') return { w: 3840, h: 2160 };
  if(canvasSize === '4K_DCI') return { w: 4096, h: 2160 };
  if(canvasSize === 'HD') return { w: 1920, h: 1080 };
  return {
    w: parseInt(document.getElementById('customCanvasWidth').value) || 1920,
    h: parseInt(document.getElementById('customCanvasHeight').value) || 1080
  };
}

function _getScreenResolution(screenId) {
  var screen = screens[screenId];
  if(!screen || !screen.data) return { w: 0, h: 0 };
  var sd = screen.data;
  var p = getAllPanels()[sd.panelType || 'CB5_MKII'];
  if(!p || !p.res_x || !p.res_y) return { w: 0, h: 0 };
  var pw = sd.panelsWide || 0;
  var ph = sd.panelsHigh || 0;
  var wallW = pw * p.res_x;
  var wallH = ph * p.res_y;
  if(sd.addCB5HalfRow && sd.panelType === 'CB5_MKII') {
    var half = getAllPanels()['CB5_MKII_HALF'];
    if(half) wallH += half.res_y;
  }
  return { w: wallW, h: wallH };
}

function showOutlineExportModal() {
  _outlineMode = 'canvas';

  // Populate screen dropdown with visible screens
  var sel = document.getElementById('outlineScreenSelect');
  sel.innerHTML = '';
  var screenIds = Object.keys(screens).sort(function(a, b) {
    return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
  });
  screenIds.forEach(function(id) {
    var s = screens[id];
    if(!s.visible) return;
    var res = _getScreenResolution(id);
    if(res.w === 0 || res.h === 0) return;
    var opt = document.createElement('option');
    opt.value = id;
    opt.textContent = (s.name || id) + ' (' + res.w + 'x' + res.h + ')';
    sel.appendChild(opt);
  });

  // Reset UI state
  _outlineFormat = 'png';
  document.getElementById('outlineModeCanvas').classList.add('active');
  document.getElementById('outlineModeScreen').classList.remove('active');
  document.getElementById('outlineFormatPNG').classList.add('active');
  document.getElementById('outlineFormatJPEG').classList.remove('active');
  document.getElementById('outlineFormatHint').textContent = 'Transparent background';
  document.getElementById('outlineScreenSelectGroup').style.display = 'none';
  document.getElementById('outlineWidthInput').value = 2;
  document.getElementById('outlineColorInput').value = '#ffffff';

  _updateOutlineDimensions();
  document.getElementById('outlineExportModal').classList.add('active');
}

function closeOutlineExportModal() {
  document.getElementById('outlineExportModal').classList.remove('active');
}

function setOutlineMode(mode) {
  _outlineMode = mode;
  document.getElementById('outlineModeCanvas').classList.toggle('active', mode === 'canvas');
  document.getElementById('outlineModeScreen').classList.toggle('active', mode === 'screen');
  document.getElementById('outlineScreenSelectGroup').style.display = mode === 'screen' ? '' : 'none';

  _updateOutlineDimensions();
}

function setOutlineFormat(fmt) {
  _outlineFormat = fmt;
  document.getElementById('outlineFormatPNG').classList.toggle('active', fmt === 'png');
  document.getElementById('outlineFormatJPEG').classList.toggle('active', fmt === 'jpeg');
  document.getElementById('outlineFormatHint').textContent = fmt === 'png' ? 'Transparent background' : 'Black background';
  updateOutlinePreview();
}

function updateOutlineForScreen() {
  updateOutlinePreview();
}

function _updateOutlineDimensions() {
  // Always use the canvas resolution for both modes
  var res = _getCanvasResolution();
  _outlineW = res.w;
  _outlineH = res.h;
  document.getElementById('outlineDimsLabel').textContent = _outlineW + ' x ' + _outlineH + ' px';
  _updateOutlineMax();
  updateOutlinePreview();
}

function _updateOutlineMax() {
  var maxW = Math.floor(Math.min(_outlineW, _outlineH) / 2);
  if(maxW < 1) maxW = 1;
  var input = document.getElementById('outlineWidthInput');
  input.max = maxW;
  if(parseInt(input.value) > maxW) {
    input.value = maxW;
  }
}

// Draw outline around a screen's active panels, respecting deleted (knocked-out) panels.
// For each active panel, only draws border on edges that are exposed (at boundary or adjacent to a deleted panel).
// ox/oy = pixel offset on the target canvas, scale = multiplier (1 for export, <1 for preview).
function _drawScreenOutline(ctx, sd, allPanels, ox, oy, bw, scale) {
  var panelType = sd.panelType || 'CB5_MKII';
  var p = allPanels[panelType];
  if(!p || !p.res_x || !p.res_y) return false;
  var pw = sd.panelsWide || 0;
  var ph = sd.panelsHigh || 0;
  if(pw === 0 || ph === 0) return false;

  var hasCB5HalfRow = sd.addCB5HalfRow && panelType === 'CB5_MKII';
  var totalRows = hasCB5HalfRow ? ph + 1 : ph;
  var halfPanel = allPanels['CB5_MKII_HALF'];

  // Ensure deletedPanels is a Set
  var deleted = sd.deletedPanels;
  if(deleted && !(deleted instanceof Set)) deleted = new Set(deleted);
  if(!deleted) deleted = new Set();

  var s = scale || 1;

  for(var c = 0; c < pw; c++) {
    for(var r = 0; r < totalRows; r++) {
      var key = c + ',' + r;
      if(deleted.has(key)) continue;

      var isHalfRow = hasCB5HalfRow && (r === ph);
      var panelW = (isHalfRow && halfPanel) ? halfPanel.res_x : p.res_x;
      var panelH = (isHalfRow && halfPanel) ? halfPanel.res_y : p.res_y;

      var px = ox + Math.round(c * p.res_x * s);
      var py = oy + Math.round(r * p.res_y * s);
      var pw2 = Math.round(panelW * s);
      var ph2 = Math.round(panelH * s);

      // Check each edge: exposed if at boundary or neighbor is deleted
      var topExposed    = (r === 0) || deleted.has(c + ',' + (r - 1));
      var bottomExposed = (r === totalRows - 1) || deleted.has(c + ',' + (r + 1));
      var leftExposed   = (c === 0) || deleted.has((c - 1) + ',' + r);
      var rightExposed  = (c === pw - 1) || deleted.has((c + 1) + ',' + r);

      if(topExposed)    ctx.fillRect(px, py, pw2, bw);
      if(bottomExposed) ctx.fillRect(px, py + ph2 - bw, pw2, bw);
      if(leftExposed)   ctx.fillRect(px, py, bw, ph2);
      if(rightExposed)  ctx.fillRect(px + pw2 - bw, py, bw, ph2);

      // Fill inside corner gaps where two edges from adjacent panels don't meet.
      // A corner gap exists when both orthogonal neighbors are active but the diagonal is deleted.
      var hasLeft  = (c > 0) && !deleted.has((c - 1) + ',' + r);
      var hasRight = (c < pw - 1) && !deleted.has((c + 1) + ',' + r);
      var hasTop   = (r > 0) && !deleted.has(c + ',' + (r - 1));
      var hasBot   = (r < totalRows - 1) && !deleted.has(c + ',' + (r + 1));

      // Top-left inside corner: both left+top neighbors active but diagonal is deleted
      if(hasLeft && hasTop && deleted.has((c - 1) + ',' + (r - 1)))
        ctx.fillRect(px, py, bw, bw);
      // Top-right inside corner
      if(hasRight && hasTop && deleted.has((c + 1) + ',' + (r - 1)))
        ctx.fillRect(px + pw2 - bw, py, bw, bw);
      // Bottom-left inside corner
      if(hasLeft && hasBot && deleted.has((c - 1) + ',' + (r + 1)))
        ctx.fillRect(px, py + ph2 - bw, bw, bw);
      // Bottom-right inside corner
      if(hasRight && hasBot && deleted.has((c + 1) + ',' + (r + 1)))
        ctx.fillRect(px + pw2 - bw, py + ph2 - bw, bw, bw);
    }
  }
  return true;
}

function updateOutlinePreview() {
  var canvas = document.getElementById('outlinePreviewCanvas');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');

  if(_outlineW <= 0 || _outlineH <= 0) return;

  // Scale to fit preview (max 400px wide)
  var scale = Math.min(400 / _outlineW, 200 / _outlineH, 1);
  canvas.width = Math.round(_outlineW * scale);
  canvas.height = Math.round(_outlineH * scale);

  // Draw background: checkerboard for PNG (transparency), black for JPEG
  if(_outlineFormat === 'jpeg') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    var checkSize = 8;
    for(var cy = 0; cy < canvas.height; cy += checkSize) {
      for(var cx = 0; cx < canvas.width; cx += checkSize) {
        ctx.fillStyle = ((cx / checkSize + cy / checkSize) % 2 === 0) ? '#555' : '#444';
        ctx.fillRect(cx, cy, checkSize, checkSize);
      }
    }
  }

  var bw = parseInt(document.getElementById('outlineWidthInput').value) || 1;
  var color = document.getElementById('outlineColorInput').value;
  var scaledBw = Math.max(1, Math.round(bw * scale));

  ctx.fillStyle = color;
  var allP = getAllPanels();

  if(_outlineMode === 'canvas') {
    var screenIds = Object.keys(screens).sort(function(a, b) {
      return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
    });
    screenIds.forEach(function(id) {
      var s = screens[id];
      if(!s.visible) return;
      var sd = s.data;
      var ox = ((typeof sd.canvasX === 'number' && !isNaN(sd.canvasX)) ? sd.canvasX : 0) * scale;
      var oy = ((typeof sd.canvasY === 'number' && !isNaN(sd.canvasY)) ? sd.canvasY : 0) * scale;
      _drawScreenOutline(ctx, sd, allP, ox, oy, scaledBw, scale);
    });
  } else {
    // Per screen mode: draw selected screen at its canvas position
    var selId = document.getElementById('outlineScreenSelect').value;
    if(selId && screens[selId]) {
      var sd = screens[selId].data;
      var ox = ((typeof sd.canvasX === 'number' && !isNaN(sd.canvasX)) ? sd.canvasX : 0) * scale;
      var oy = ((typeof sd.canvasY === 'number' && !isNaN(sd.canvasY)) ? sd.canvasY : 0) * scale;
      _drawScreenOutline(ctx, sd, allP, ox, oy, scaledBw, scale);
    }
  }
}

function exportOutlinePNG() {
  try {
    if(_outlineW <= 0 || _outlineH <= 0) {
      showAlert('No valid dimensions to export.');
      return;
    }

    var bw = parseInt(document.getElementById('outlineWidthInput').value) || 1;
    var color = document.getElementById('outlineColorInput').value;
    var fmt = _outlineFormat;
    var ext = fmt === 'jpeg' ? '.jpg' : '.png';
    var mimeType = fmt === 'jpeg' ? 'image/jpeg' : 'image/png';

    var filenameInput = document.getElementById('canvasExportFilename') || document.getElementById('rasterToolbarFilename');
    var customName = filenameInput ? filenameInput.value.trim() : '';
    var allP = getAllPanels();

    if(_outlineMode === 'screen') {
      var selId = document.getElementById('outlineScreenSelect').value;
      var screenName = (screens[selId] && screens[selId].name) ? screens[selId].name.replace(/[<>:"/\\|?*\s]/g, '_') : selId;
      var sd = screens[selId].data;

      var exportCanvas = document.createElement('canvas');
      exportCanvas.width = _outlineW;
      exportCanvas.height = _outlineH;
      var ctx = exportCanvas.getContext('2d');
      if(fmt === 'jpeg') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, _outlineW, _outlineH);
      }
      ctx.fillStyle = color;
      var ox = (typeof sd.canvasX === 'number' && !isNaN(sd.canvasX)) ? sd.canvasX : 0;
      var oy = (typeof sd.canvasY === 'number' && !isNaN(sd.canvasY)) ? sd.canvasY : 0;
      _drawScreenOutline(ctx, sd, allP, ox, oy, bw, 1);

      var fname = customName ? customName + '_' + screenName : 'Outline_' + screenName + '_' + _outlineW + 'x' + _outlineH + '_' + bw + 'px';
      fname = fname.replace(/[<>:"/\\|?*]/g, '_');
      _downloadCanvasBlob(exportCanvas, fname + ext, mimeType);
    } else {
      var exportCanvas = document.createElement('canvas');
      exportCanvas.width = _outlineW;
      exportCanvas.height = _outlineH;
      var ctx = exportCanvas.getContext('2d');
      if(fmt === 'jpeg') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, _outlineW, _outlineH);
      }
      ctx.fillStyle = color;

      var screenIds = Object.keys(screens).sort(function(a, b) {
        return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
      });
      screenIds.forEach(function(id) {
        var s = screens[id];
        if(!s.visible) return;
        var sd = s.data;
        var ox = (typeof sd.canvasX === 'number' && !isNaN(sd.canvasX)) ? sd.canvasX : 0;
        var oy = (typeof sd.canvasY === 'number' && !isNaN(sd.canvasY)) ? sd.canvasY : 0;
        _drawScreenOutline(ctx, sd, allP, ox, oy, bw, 1);
      });

      var fname = customName ? customName + '_outline' : 'Outline_Canvas_' + _outlineW + 'x' + _outlineH + '_' + bw + 'px';
      fname = fname.replace(/[<>:"/\\|?*]/g, '_');
      _downloadCanvasBlob(exportCanvas, fname + ext, mimeType);
    }

    closeOutlineExportModal();
  } catch(err) {
    showAlert('Error exporting outline: ' + err.message);
    console.error('Outline export error:', err);
  }
}

// Returns PNG blob, JPEG blob, and size label (for Export All). callback(pngBlob, jpegBlob, sizeLabel)
function getCanvasExportBlobs(callback) {
  try {
    var canvas = document.getElementById('canvasView');
    if(!canvas || canvas.width === 0) {
      callback(null, null, ''); return;
    }

    // Compute size label (same logic as exportCanvas())
    var canvasSizeSelect = document.getElementById('canvasSize');
    var sizeLabel = canvasSizeSelect.value === 'custom'
      ? canvas.width + 'x' + canvas.height
      : canvasSizeSelect.options[canvasSizeSelect.selectedIndex].text
          .replace(/\s+/g, '_').replace(/[()]/g, '');

    // Build clean export canvas
    var exportCvs = document.createElement('canvas');
    exportCvs.width = canvas.width;
    exportCvs.height = canvas.height;
    var ctx = exportCvs.getContext('2d');
    if(cachedCanvasImageDataForExport) {
      ctx.putImageData(cachedCanvasImageDataForExport, 0, 0);
    } else {
      if(typeof showCanvasView === 'function') showCanvasView();
      if(cachedCanvasImageDataForExport) {
        ctx.putImageData(cachedCanvasImageDataForExport, 0, 0);
      } else {
        ctx.drawImage(canvas, 0, 0);
      }
    }

    exportCvs.toBlob(function(pngBlob) {
      exportCvs.toBlob(function(jpegBlob) {
        callback(pngBlob, jpegBlob, sizeLabel);
      }, 'image/jpeg', 0.95);
    }, 'image/png');
  } catch(e) { callback(null, null, ''); }
}

// ==================== EXPORT ALL — PER-SECTION SCREENSHOTS ====================
// Helpers used by export/export-all.js to bundle hi-res PNG screenshots of
// individual layouts and HTML sections into the ZIP. Mirrors the canvas-render
// pattern in export/pdf.js pdfCaptureCanvases() but emits PNG blobs.

// Draws a comic-book-style header bar onto an output canvas above the source
// canvas image, matching the in-app .layout-title styling (Bangers font,
// #10b981 on #1a1a1a with a black 4-corner outline, slight -2deg rotation).
function _composeLayoutWithHeader(srcCanvas, titleText) {
  var w = srcCanvas.width;
  var h = srcCanvas.height;
  var headerH = Math.max(48, Math.round(w * 0.018));
  var fontSize = Math.round(headerH * 0.6);
  var pad = Math.round(headerH * 0.3);

  var out = document.createElement('canvas');
  out.width = w;
  out.height = h + headerH;
  var ctx = out.getContext('2d');

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, out.width, headerH);

  ctx.save();
  ctx.translate(pad + headerH * 0.4, headerH * 0.5);
  ctx.rotate(-2 * Math.PI / 180);

  ctx.font = '700 ' + fontSize + "px 'Bangers', cursive";
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  var outlineW = Math.max(2, Math.round(fontSize * 0.06));
  ctx.lineWidth = outlineW * 2;
  ctx.strokeStyle = '#000000';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeText(titleText, 0, 0);

  ctx.fillStyle = '#10b981';
  ctx.fillText(titleText, 0, 0);
  ctx.restore();

  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, headerH - 2, out.width, 2);

  ctx.drawImage(srcCanvas, 0, headerH);
  return out;
}

function _layoutTitleText(layout, isCombined) {
  var base = layout === 'power' ? 'Power Layout'
           : layout === 'data' ? 'Data Layout'
           : layout === 'structure' ? 'Structure Layout'
           : layout;
  return isCombined ? base + ' (Combined)' : base;
}

// Render power/data/structure layouts for every screen and emit hi-res PNG blobs.
// callback(results) where results = [{ screenId, layout, blob }, ...]
function captureLayoutScreenshotBlobs(callback) {
  try {
    if (typeof screens === 'undefined') { callback([]); return; }
    var screenIds = Object.keys(screens).sort(function(a, b) {
      return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
    });
    if (screenIds.length === 0) { callback([]); return; }

    var originalScreenId = currentScreenId;
    var mainContainer = document.querySelector('.main-container');
    var mainWasHidden = mainContainer && mainContainer.style.display === 'none';
    if (mainContainer) mainContainer.style.display = 'block';

    var containerIds = ['standardContainer', 'powerContainer', 'dataContainer', 'structureContainer'];
    var savedDisplay = {};
    containerIds.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { savedDisplay[id] = el.style.display; el.style.display = 'block'; }
    });
    if (mainContainer) void mainContainer.offsetWidth;

    var savedLayoutWidths = {};
    containerIds.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { savedLayoutWidths[id] = el.style.width; el.style.width = '4000px'; }
    });
    if (typeof pdfMultiScreenCapture !== 'undefined') pdfMultiScreenCapture = screenIds.length > 1;
    if (typeof pdfLayoutCaptureMode !== 'undefined') pdfLayoutCaptureMode = true;
    void (document.getElementById('powerContainer') || document.body).offsetWidth;

    var captures = [];
    screenIds.forEach(function(screenId) {
      if (typeof switchToScreen === 'function') switchToScreen(screenId);
      try { if (typeof generateLayout === 'function') generateLayout('power'); } catch(e) {}
      try { if (typeof generateLayout === 'function') generateLayout('data'); } catch(e) {}
      try { if (typeof generateStructureLayout === 'function') generateStructureLayout(); } catch(e) {}

      [
        { id: 'powerCanvas',     layout: 'power' },
        { id: 'dataCanvas',      layout: 'data' },
        { id: 'structureCanvas', layout: 'structure' }
      ].forEach(function(cap) {
        var canvas = document.getElementById(cap.id);
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          var composed = _composeLayoutWithHeader(canvas, _layoutTitleText(cap.layout, false));
          captures.push({ screenId: screenId, layout: cap.layout, canvas: composed });
        }
      });
    });

    if (typeof pdfLayoutCaptureMode !== 'undefined') pdfLayoutCaptureMode = false;
    if (typeof pdfMultiScreenCapture !== 'undefined') pdfMultiScreenCapture = false;
    containerIds.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.width = savedLayoutWidths[id] !== undefined ? savedLayoutWidths[id] : '';
    });
    if (typeof switchToScreen === 'function') switchToScreen(originalScreenId);
    containerIds.forEach(function(id) {
      var el = document.getElementById(id);
      if (el && savedDisplay[id] !== undefined) el.style.display = savedDisplay[id];
    });
    if (mainWasHidden && mainContainer) mainContainer.style.display = 'none';

    var blobPromises = captures.map(function(item) {
      return new Promise(function(resolve) {
        item.canvas.toBlob(function(blob) {
          resolve({ screenId: item.screenId, layout: item.layout, blob: blob });
        }, 'image/png');
      });
    });
    Promise.all(blobPromises).then(callback).catch(function() { callback([]); });
  } catch(e) {
    console.error('captureLayoutScreenshotBlobs error:', e);
    callback([]);
  }
}

// Render combined power/data/structure views (multi-screen only) and emit blobs.
// callback(results) where results = [{ layout, blob }, ...]
function captureCombinedLayoutBlobs(callback) {
  try {
    if (typeof screens === 'undefined') { callback([]); return; }
    var screenIds = Object.keys(screens);
    if (screenIds.length < 2) { callback([]); return; }
    if (typeof renderCombinedView !== 'function' || typeof combinedSelectedScreens === 'undefined') {
      callback([]); return;
    }

    var savedSet = new Set(combinedSelectedScreens);
    combinedSelectedScreens.clear();
    screenIds.forEach(function(id) { combinedSelectedScreens.add(id); });

    var combinedContainer = document.getElementById('combinedContainer');
    var savedCombinedDisplay = combinedContainer ? combinedContainer.style.display : null;
    if (combinedContainer) combinedContainer.style.display = 'block';

    try { renderCombinedView(); } catch(e) { console.error('renderCombinedView failed:', e); }

    var captures = [];
    [
      { id: 'combinedPowerCanvas',     layout: 'power' },
      { id: 'combinedDataCanvas',      layout: 'data' },
      { id: 'combinedStructureCanvas', layout: 'structure' }
    ].forEach(function(cap) {
      var canvas = document.getElementById(cap.id);
      if (canvas && canvas.width > 100 && canvas.height > 100) {
        var composed = _composeLayoutWithHeader(canvas, _layoutTitleText(cap.layout, true));
        captures.push({ layout: cap.layout, canvas: composed });
      }
    });

    combinedSelectedScreens.clear();
    savedSet.forEach(function(id) { combinedSelectedScreens.add(id); });
    if (combinedContainer && savedCombinedDisplay !== null) combinedContainer.style.display = savedCombinedDisplay;
    if (combinedSelectedScreens.size > 0) {
      try { renderCombinedView(); } catch(e) {}
    }

    var blobPromises = captures.map(function(item) {
      return new Promise(function(resolve) {
        item.canvas.toBlob(function(blob) {
          resolve({ layout: item.layout, blob: blob });
        }, 'image/png');
      });
    });
    Promise.all(blobPromises).then(callback).catch(function() { callback([]); });
  } catch(e) {
    console.error('captureCombinedLayoutBlobs error:', e);
    callback([]);
  }
}

// Rasterize an HTML element to a PNG blob via html2canvas.
// callback(blob | null). opts: { scale, backgroundColor }
function captureHtmlElementBlob(elementId, callback, opts) {
  opts = opts || {};
  try {
    if (typeof html2canvas === 'undefined') { callback(null); return; }
    var el = document.getElementById(elementId);
    if (!el) { callback(null); return; }

    var mainContainer = document.querySelector('.main-container');
    var mainWasHidden = mainContainer && mainContainer.style.display === 'none';
    if (mainContainer) mainContainer.style.display = 'block';

    var savedDisplay = el.style.display;
    var wasHidden = window.getComputedStyle(el).display === 'none';
    if (wasHidden) el.style.display = 'block';
    void el.offsetHeight;

    var captureOpts = {
      scale: opts.scale || 2,
      backgroundColor: opts.backgroundColor === undefined ? '#1a1a1a' : opts.backgroundColor,
      logging: false,
      useCORS: true,
      allowTaint: false
    };

    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function() {
      return html2canvas(el, captureOpts);
    }).then(function(canvas) {
      if (wasHidden) el.style.display = savedDisplay;
      if (mainWasHidden && mainContainer) mainContainer.style.display = 'none';
      canvas.toBlob(function(blob) { callback(blob); }, 'image/png');
    }).catch(function(e) {
      console.error('html2canvas error for #' + elementId + ':', e);
      if (wasHidden) el.style.display = savedDisplay;
      if (mainWasHidden && mainContainer) mainContainer.style.display = 'none';
      callback(null);
    });
  } catch(e) {
    console.error('captureHtmlElementBlob error:', e);
    callback(null);
  }
}

// Iterate every canvas tab, render it, and emit PNG + JPEG blobs per tab.
// callback(results) where results = [{ canvasId, name, sizeLabel, pngBlob, jpegBlob }, ...]
function getAllCanvasesExportBlobs(callback) {
  try {
    if (typeof canvases === 'undefined' || !canvases) {
      // Fall back to the single-canvas helper for older builds without tabs.
      getCanvasExportBlobs(function(pngBlob, jpegBlob, sizeLabel) {
        callback([{ canvasId: 'canvas_1', name: 'Canvas 1', sizeLabel: sizeLabel, pngBlob: pngBlob, jpegBlob: jpegBlob }]);
      });
      return;
    }
    var ids = Object.keys(canvases).sort(function(a, b) {
      return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
    });
    if (ids.length === 0) { callback([]); return; }

    var originalId = currentCanvasId;
    var results = [];

    function captureNext(i) {
      if (i >= ids.length) {
        // Restore original canvas
        if (originalId && originalId !== currentCanvasId && typeof switchToCanvas === 'function') {
          switchToCanvas(originalId);
        }
        callback(results);
        return;
      }
      var id = ids[i];
      try {
        if (id !== currentCanvasId && typeof switchToCanvas === 'function') {
          switchToCanvas(id);
        } else if (typeof showCanvasView === 'function') {
          showCanvasView();
        }
      } catch(e) {}

      // Allow a frame for the canvas to fully render before reading pixels.
      requestAnimationFrame(function() {
        getCanvasExportBlobs(function(pngBlob, jpegBlob, sizeLabel) {
          var name = (canvases[id] && canvases[id].name) ? canvases[id].name : ('Canvas ' + (i + 1));
          results.push({
            canvasId: id,
            name: name,
            sizeLabel: sizeLabel,
            pngBlob: pngBlob,
            jpegBlob: jpegBlob
          });
          captureNext(i + 1);
        });
      });
    }
    captureNext(0);
  } catch(e) {
    console.error('getAllCanvasesExportBlobs error:', e);
    callback([]);
  }
}

// ==================== EXPORT ALL — PDF PAGE PNG RENDERING ====================
// Builds a tiny PDF containing only the requested sections (e.g. specs-only or
// gear-only), then rasterizes every page to a PNG blob via pdf.js. This guarantees
// pixel-perfect parity with the real PDF — no separate HTML capture path.

function _ensurePdfJsWorker() {
  if (typeof pdfjsLib === 'undefined') return false;
  if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  return true;
}

// Renders pages of `pdfBlob` to PNG blobs. opts: { scale, startPage, endPage }.
// Defaults: scale=2 (~144 DPI), startPage=1, endPage=last. Backwards-compatible
// with the older `renderPdfBlobToPngBlobs(blob, scale, callback)` 3-arg form.
// callback(blobs) where blobs is an array of { pageNumber, blob } in page order.
function renderPdfBlobToPngBlobs(pdfBlob, opts, callback) {
  if (typeof opts === 'function') { callback = opts; opts = {}; }
  if (typeof opts === 'number') { opts = { scale: opts }; }
  opts = opts || {};
  var scale = opts.scale || 2;
  var startPage = opts.startPage || 1;
  var endPage = opts.endPage;

  try {
    if (!pdfBlob) { callback([]); return; }
    if (!_ensurePdfJsWorker()) { callback([]); return; }

    pdfBlob.arrayBuffer().then(function(buf) {
      return pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function(pdf) {
      var numPages = pdf.numPages;
      var lastPage = (endPage && endPage <= numPages) ? endPage : numPages;
      var firstPage = Math.max(1, startPage);
      var pageNums = [];
      for (var i = firstPage; i <= lastPage; i++) pageNums.push(i);

      var pageResults = [];
      function renderNext(idx) {
        if (idx >= pageNums.length) { callback(pageResults); return; }
        var pageNum = pageNums[idx];
        pdf.getPage(pageNum).then(function(page) {
          var viewport = page.getViewport({ scale: scale });
          var canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          var ctx = canvas.getContext('2d');
          return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function() {
            return new Promise(function(resolve) {
              canvas.toBlob(function(blob) {
                pageResults.push({ pageNumber: pageNum, blob: blob });
                resolve();
              }, 'image/png');
            });
          });
        }).then(function() { renderNext(idx + 1); }).catch(function(e) {
          console.error('pdf.js page render error:', e);
          renderNext(idx + 1);
        });
      }
      renderNext(0);
    }).catch(function(e) {
      console.error('renderPdfBlobToPngBlobs error:', e);
      callback([]);
    });
  } catch(e) {
    console.error('renderPdfBlobToPngBlobs threw:', e);
    callback([]);
  }
}

// Build a section-only PDF blob using the existing pdfmake pipeline. Mirrors
// getPdfBlobForExportAll() but applies the supplied opts mask.
function _getSectionOnlyPdfBlob(opts, callback) {
  try {
    if (!window.pdfMake || typeof buildComplexPdf !== 'function') { callback(null); return; }
    if (typeof saveCurrentScreenData === 'function') saveCurrentScreenData();
    if (typeof ecoPrintMode !== 'undefined') ecoPrintMode = false;
    if (typeof greyscalePrintMode !== 'undefined') greyscalePrintMode = false;

    var canvasCache = (typeof pdfCaptureCanvases === 'function') ? pdfCaptureCanvases() : {};

    if (typeof ecoPrintMode !== 'undefined') ecoPrintMode = false;
    if (typeof greyscalePrintMode !== 'undefined') greyscalePrintMode = false;
    try { if (typeof generateLayout === 'function') { generateLayout('standard'); generateLayout('power'); generateLayout('data'); } } catch(e) {}
    try { if (typeof generateStructureLayout === 'function') generateStructureLayout(); } catch(e) {}
    if (typeof switchMobileView === 'function' && typeof currentAppMode !== 'undefined') {
      try { switchMobileView(currentAppMode); } catch(e) {}
    }

    var docDef = buildComplexPdf(opts, canvasCache);
    pdfMake.createPdf(docDef).getBlob(function(blob) { callback(blob); });
  } catch(e) {
    console.error('_getSectionOnlyPdfBlob error:', e);
    callback(null);
  }
}

// Returns specs PDF page PNG blobs (one entry per page). The cover/summary
// page (always page 1) is skipped — only the actual specs content is returned.
// callback([{ pageNumber, blob }, ...])
function getSpecsPdfPagePngBlobs(callback) {
  var opts = { specs: true, gearList: false, standard: false, power: false, data: false, structure: false, cabling: false, combined: false, ecoFriendly: false, greyscale: false };
  _getSectionOnlyPdfBlob(opts, function(blob) {
    if (!blob) { callback([]); return; }
    renderPdfBlobToPngBlobs(blob, { scale: 2, startPage: 2 }, callback);
  });
}

// Returns gear list PDF page PNG blobs (one entry per page). Cover/summary
// page is skipped — same rationale as getSpecsPdfPagePngBlobs.
function getGearListPdfPagePngBlobs(callback) {
  var opts = { specs: false, gearList: true, standard: false, power: false, data: false, structure: false, cabling: false, combined: false, ecoFriendly: false, greyscale: false };
  _getSectionOnlyPdfBlob(opts, function(blob) {
    if (!blob) { callback([]); return; }
    renderPdfBlobToPngBlobs(blob, { scale: 2, startPage: 2 }, callback);
  });
}

function _downloadCanvasBlob(canvas, filename, mimeType) {
  mimeType = mimeType || 'image/png';
  var quality = mimeType === 'image/jpeg' ? 0.92 : undefined;
  canvas.toBlob(function(blob) {
    if(!blob) {
      showAlert('Failed to create image. Please try again.');
      return;
    }

    var isMobileDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
                         (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    if(isMobileDevice && navigator.canShare) {
      var file = new File([blob], filename, { type: mimeType });
      if(navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file] }).catch(function() {});
        return;
      }
    }

    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(function() {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }, mimeType, quality);
}

