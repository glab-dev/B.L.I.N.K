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
  document.getElementById('outlineCustomDims').checked = false;
  document.getElementById('outlineCustomDimsRow').style.display = 'none';
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
  if(!document.getElementById('outlineCustomDims').checked) {
    _updateOutlineDimensions();
  }
}

function toggleOutlineCustomDims() {
  var custom = document.getElementById('outlineCustomDims').checked;
  document.getElementById('outlineCustomDimsRow').style.display = custom ? '' : 'none';
  if(custom) {
    document.getElementById('outlineCustomW').value = _outlineW;
    document.getElementById('outlineCustomH').value = _outlineH;
  } else {
    _updateOutlineDimensions();
  }
}

function updateOutlineFromCustomDims() {
  _outlineW = parseInt(document.getElementById('outlineCustomW').value) || 1;
  _outlineH = parseInt(document.getElementById('outlineCustomH').value) || 1;
  _updateOutlineMax();
  updateOutlinePreview();
}

function _updateOutlineDimensions() {
  if(_outlineMode === 'canvas') {
    var res = _getCanvasResolution();
    _outlineW = res.w;
    _outlineH = res.h;
  } else {
    var selId = document.getElementById('outlineScreenSelect').value;
    if(selId) {
      var res = _getScreenResolution(selId);
      _outlineW = res.w;
      _outlineH = res.h;
    }
  }
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

function _drawOutlineRect(ctx, x, y, w, h, bw) {
  // Draw 4 non-overlapping strips
  ctx.fillRect(x, y, w, bw);                        // top
  ctx.fillRect(x, y + h - bw, w, bw);               // bottom
  ctx.fillRect(x, y + bw, bw, h - 2 * bw);          // left
  ctx.fillRect(x + w - bw, y + bw, bw, h - 2 * bw); // right
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

  // Clear (transparent)
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  var bw = parseInt(document.getElementById('outlineWidthInput').value) || 1;
  var color = document.getElementById('outlineColorInput').value;
  var scaledBw = Math.max(1, Math.round(bw * scale));

  ctx.fillStyle = color;

  if(_outlineMode === 'canvas') {
    // Full canvas mode: draw outline around each visible screen
    var allP = getAllPanels();
    var screenIds = Object.keys(screens).sort(function(a, b) {
      return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
    });
    var drewAny = false;
    screenIds.forEach(function(id) {
      var s = screens[id];
      if(!s.visible) return;
      var sd = s.data;
      var p = allP[sd.panelType || 'CB5_MKII'];
      if(!p || !p.res_x || !p.res_y) return;
      var pw = sd.panelsWide || 0;
      var ph = sd.panelsHigh || 0;
      if(pw === 0 || ph === 0) return;
      var wallW = pw * p.res_x;
      var wallH = ph * p.res_y;
      if(sd.addCB5HalfRow && sd.panelType === 'CB5_MKII') {
        var half = allP['CB5_MKII_HALF'];
        if(half) wallH += half.res_y;
      }
      var ox = ((typeof sd.canvasX === 'number' && !isNaN(sd.canvasX)) ? sd.canvasX : 0) * scale;
      var oy = ((typeof sd.canvasY === 'number' && !isNaN(sd.canvasY)) ? sd.canvasY : 0) * scale;
      _drawOutlineRect(ctx, ox, oy, Math.round(wallW * scale), Math.round(wallH * scale), scaledBw);
      drewAny = true;
    });
    // If no screens visible, draw outline around entire canvas
    if(!drewAny) {
      _drawOutlineRect(ctx, 0, 0, canvas.width, canvas.height, scaledBw);
    }
  } else {
    // Per screen mode: single outline at full dimensions
    _drawOutlineRect(ctx, 0, 0, canvas.width, canvas.height, scaledBw);
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

    if(_outlineMode === 'screen') {
      // Per screen: export a single outline for the selected screen
      var selId = document.getElementById('outlineScreenSelect').value;
      var screenName = (screens[selId] && screens[selId].name) ? screens[selId].name.replace(/[<>:"/\\|?*\s]/g, '_') : selId;

      var exportCanvas = document.createElement('canvas');
      exportCanvas.width = _outlineW;
      exportCanvas.height = _outlineH;
      var ctx = exportCanvas.getContext('2d');
      ctx.fillStyle = color;
      _drawOutlineRect(ctx, 0, 0, _outlineW, _outlineH, bw);

      var fname = customName ? customName + '_' + screenName : 'Outline_' + screenName + '_' + _outlineW + 'x' + _outlineH + '_' + bw + 'px';
      fname = fname.replace(/[<>:"/\\|?*]/g, '_');
      _downloadCanvasBlob(exportCanvas, fname + '.png');
    } else {
      // Full canvas: draw outlines around each visible screen
      var exportCanvas = document.createElement('canvas');
      exportCanvas.width = _outlineW;
      exportCanvas.height = _outlineH;
      var ctx = exportCanvas.getContext('2d');
      ctx.fillStyle = color;

      var allP = getAllPanels();
      var screenIds = Object.keys(screens).sort(function(a, b) {
        return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
      });
      var drewAny = false;
      screenIds.forEach(function(id) {
        var s = screens[id];
        if(!s.visible) return;
        var sd = s.data;
        var p = allP[sd.panelType || 'CB5_MKII'];
        if(!p || !p.res_x || !p.res_y) return;
        var pw = sd.panelsWide || 0;
        var ph = sd.panelsHigh || 0;
        if(pw === 0 || ph === 0) return;
        var wallW = pw * p.res_x;
        var wallH = ph * p.res_y;
        if(sd.addCB5HalfRow && sd.panelType === 'CB5_MKII') {
          var half = allP['CB5_MKII_HALF'];
          if(half) wallH += half.res_y;
        }
        var ox = (typeof sd.canvasX === 'number' && !isNaN(sd.canvasX)) ? sd.canvasX : 0;
        var oy = (typeof sd.canvasY === 'number' && !isNaN(sd.canvasY)) ? sd.canvasY : 0;
        _drawOutlineRect(ctx, ox, oy, wallW, wallH, bw);
        drewAny = true;
      });

      if(!drewAny) {
        _drawOutlineRect(ctx, 0, 0, _outlineW, _outlineH, bw);
      }

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

