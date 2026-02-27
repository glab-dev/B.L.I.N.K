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
  document.getElementById('outlineModeCanvas').classList.add('active');
  document.getElementById('outlineModeScreen').classList.remove('active');
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

  // Reset custom dims when switching modes
  document.getElementById('outlineCustomDims').checked = false;
  document.getElementById('outlineCustomDimsRow').style.display = 'none';

  _updateOutlineDimensions();
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

  // Draw checkerboard background to indicate transparency
  var checkSize = 8;
  for(var cy = 0; cy < canvas.height; cy += checkSize) {
    for(var cx = 0; cx < canvas.width; cx += checkSize) {
      ctx.fillStyle = ((cx / checkSize + cy / checkSize) % 2 === 0) ? '#555' : '#444';
      ctx.fillRect(cx, cy, checkSize, checkSize);
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
      ctx.fillStyle = color;
      var ox = (typeof sd.canvasX === 'number' && !isNaN(sd.canvasX)) ? sd.canvasX : 0;
      var oy = (typeof sd.canvasY === 'number' && !isNaN(sd.canvasY)) ? sd.canvasY : 0;
      _drawScreenOutline(ctx, sd, allP, ox, oy, bw, 1);

      var fname = customName ? customName + '_' + screenName : 'Outline_' + screenName + '_' + _outlineW + 'x' + _outlineH + '_' + bw + 'px';
      fname = fname.replace(/[<>:"/\\|?*]/g, '_');
      _downloadCanvasBlob(exportCanvas, fname + '.png');
    } else {
      var exportCanvas = document.createElement('canvas');
      exportCanvas.width = _outlineW;
      exportCanvas.height = _outlineH;
      var ctx = exportCanvas.getContext('2d');
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
      _downloadCanvasBlob(exportCanvas, fname + '.png');
    }

    closeOutlineExportModal();
  } catch(err) {
    showAlert('Error exporting outline: ' + err.message);
    console.error('Outline export error:', err);
  }
}

function _downloadCanvasBlob(canvas, filename) {
  canvas.toBlob(function(blob) {
    if(!blob) {
      showAlert('Failed to create image. Please try again.');
      return;
    }

    var isMobileDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
                         (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    if(isMobileDevice && navigator.canShare) {
      var file = new File([blob], filename, { type: 'image/png' });
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
  }, 'image/png');
}

