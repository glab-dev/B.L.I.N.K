// ==================== HEADER / FOOTER BAND ====================
// A header or footer band with three equal, inline cells, each independently
// assignable to Company Logo / Show Logo / Title Block / Empty. The band renders
// LIVE on the canvas via a separate sibling canvas (#canvasBand) stacked above
// (header) or below (footer) the untouched #canvasView — so canvasView stays
// pixel-clean (the normal PNG/JPEG export never includes the band) and all canvas
// interactivity (hit-testing, drag, snap) is unaffected.
//
// State is PER CANVAS TAB: canvases[id].data.titleBlock. The band only exports via
// the dedicated "Canvas + Title Block" format and the Export All "title block/"
// folder, both of which composite the clean canvas cache + band.

var TB_LOGO_MAX_BYTES = 200 * 1024; // 200 KB, matches the PDF logo cap

function tbDefaultState() {
  return {
    enabled: false,
    position: 'footer',          // 'footer' | 'header'
    height: 240,                 // band height in px at canvas resolution
    cells: [                     // exactly 3, left -> right
      { type: 'show',    image: null, imageName: '', title: '', subtitle: '', _img: null },
      { type: 'title',   image: null, imageName: '', title: '', subtitle: '', _img: null },
      { type: 'company', image: null, imageName: '', title: '', subtitle: '', _img: null }
    ]
  };
}

// The band config for the active canvas tab (created on first access).
function getCurrentTitleBlock() {
  if(typeof canvases === 'undefined' || !currentCanvasId || !canvases[currentCanvasId]) return null;
  var d = canvases[currentCanvasId].data;
  if(!d) return null;
  if(!d.titleBlock) d.titleBlock = tbDefaultState();
  return d.titleBlock;
}

// ==================== HELPERS ====================

function _tbBandHeight(tb) {
  var h = parseInt(tb && tb.height, 10);
  if(isNaN(h) || h < 40) h = 240;
  return h;
}

// Auto-fills the Panel Type / Canvas Size lines for a Title Block cell from the
// current visible screens (visibility is per-canvas) and canvas resolution.
function _tbGetAutoInfo(canvasResX, canvasResY) {
  var allPanels = (typeof getAllPanels === 'function') ? getAllPanels() : {};
  var counts = {};
  Object.keys(screens || {}).forEach(function(id) {
    var s = screens[id];
    if(!s || !s.visible) return;
    var d = s.data || {};
    if(!(d.panelsWide > 0 && d.panelsHigh > 0)) return;
    var pt = d.panelType || '';
    if(pt) counts[pt] = (counts[pt] || 0) + 1;
  });
  var keys = Object.keys(counts);
  var panelLine = '';
  if(keys.length === 1) {
    var p = allPanels[keys[0]];
    if(p) panelLine = (p.name || keys[0]) + ': ' + (p.res_x || '?') + 'px x ' + (p.res_y || '?') + 'px';
  } else if(keys.length > 1) {
    panelLine = 'Mixed panels';
  }
  return { panelLine: panelLine, canvasLine: 'W:' + canvasResX + 'p x H:' + canvasResY + 'p' };
}

// Loads (once) the given band's cell logo data URLs into Image objects, then calls back.
function tbEnsureImagesLoaded(tb, callback) {
  if(!tb) { if(callback) callback(); return; }
  var pending = 0;
  var done = false;
  function check() { if(pending === 0 && !done) { done = true; if(callback) callback(); } }
  tb.cells.forEach(function(cell) {
    if((cell.type === 'company' || cell.type === 'show') && cell.image) {
      if(cell._img && cell._img.complete && cell._img._src === cell.image) return;
      pending++;
      var img = new Image();
      img._src = cell.image;
      img.onload = function() { cell._img = img; pending--; check(); };
      img.onerror = function() { cell._img = null; pending--; check(); };
      img.src = cell.image;
    } else {
      cell._img = null;
    }
  });
  check();
}

// ==================== BAND RENDERING ====================

function drawTitleBlockBand(ctx, tb, bx, by, bw, bh, canvasResX, canvasResY) {
  if(!tb) return;
  var cellW = bw / 3;
  for(var i = 0; i < 3; i++) {
    var cx = bx + i * cellW;
    var cell = tb.cells[i] || { type: 'empty' };

    // Subtle cell border so the three cells read as squared-up and inline
    ctx.save();
    var lw = Math.max(1, bh * 0.008);
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = lw;
    ctx.strokeRect(cx + lw / 2, by + lw / 2, cellW - lw, bh - lw);
    ctx.restore();

    if(cell.type === 'title') {
      _tbDrawTitleCell(ctx, cx, by, cellW, bh, cell, canvasResX, canvasResY);
    } else if(cell.type === 'company' || cell.type === 'show') {
      _tbDrawLogoCell(ctx, cx, by, cellW, bh, cell);
    }
  }
}

function _tbDrawLogoCell(ctx, cx, cy, cw, ch, cell) {
  var img = cell._img;
  if(!img || !img.complete || !img.naturalWidth) return;
  var pad = Math.min(cw, ch) * 0.12;
  var availW = cw - pad * 2;
  var availH = ch - pad * 2;
  var scale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight);
  var dw = img.naturalWidth * scale;
  var dh = img.naturalHeight * scale;
  ctx.drawImage(img, cx + (cw - dw) / 2, cy + (ch - dh) / 2, dw, dh);
}

function _tbDrawTitleCell(ctx, cx, cy, cw, ch, cell, canvasResX, canvasResY) {
  var info = _tbGetAutoInfo(canvasResX, canvasResY);
  var hasInfo = !!(info.panelLine || info.canvasLine);
  var pad = ch * 0.12;
  var leftX = cx + pad;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  function drawOutlined(text, x, y, size, font) {
    ctx.font = font;
    var ow = Math.max(2, size * 0.07);
    ctx.lineWidth = ow * 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x, y);
  }

  var title = (cell.title || '').trim();
  var subtitle = (cell.subtitle || '').trim();
  var titleSize = ch * 0.30;
  var subSize = ch * 0.20;
  if(title) drawOutlined(title, leftX, cy + ch * 0.45, titleSize, "700 " + titleSize + "px 'Bangers', cursive");
  if(subtitle) drawOutlined(subtitle, leftX, cy + ch * 0.72, subSize, "700 " + subSize + "px 'Bangers', cursive");

  if(hasInfo) {
    var infoSize = ch * 0.13;
    var lineH = infoSize * 1.35;
    var infoX = cx + cw * 0.52;
    var iy = cy + pad + infoSize;
    ctx.font = infoSize + "px 'Roboto Condensed', sans-serif";
    function infoPair(label, value) {
      ctx.fillStyle = '#bbbbbb'; ctx.fillText(label, infoX, iy); iy += lineH;
      ctx.fillStyle = '#ffffff'; ctx.fillText(value, infoX, iy); iy += lineH * 1.1;
    }
    if(info.panelLine) infoPair('Panel Type:', info.panelLine);
    if(info.canvasLine) infoPair('Canvas Size:', info.canvasLine);
  }
  ctx.restore();
}

// ==================== LIVE ON-CANVAS BAND ====================
// Renders the active tab's band into the separate #canvasBand element stacked
// above/below #canvasView inside the zoom/pan viewport. Called at the end of
// showCanvasView(), AFTER the clean export cache is snapshotted.
function renderCanvasBand() {
  var band = document.getElementById('canvasBand');
  var canvasView = document.getElementById('canvasView');
  var viewport = document.getElementById('canvasViewport');
  var wrapper = document.getElementById('canvasViewWrapper');
  if(!band || !canvasView) return;

  var tb = getCurrentTitleBlock();
  if(!tb || !tb.enabled) {
    // Restore the plain single-canvas layout; leave wrapper as showCanvasView set it.
    band.style.display = 'none';
    canvasView.style.height = '100%';
    canvasView.style.order = '';
    if(viewport) { viewport.style.display = ''; viewport.style.flexDirection = ''; }
    return;
  }

  var res = _getCanvasResolution();
  if(!res.w || !res.h) return;
  var bandH = _tbBandHeight(tb);
  var total = res.h + bandH;
  var ledFrac = (res.h / total) * 100;
  var bandFrac = (bandH / total) * 100;

  // Stack canvas + band in a flex column inside the transformed viewport.
  if(viewport) { viewport.style.display = 'flex'; viewport.style.flexDirection = 'column'; }
  canvasView.style.height = ledFrac + '%';
  canvasView.style.flexShrink = '0';
  canvasView.style.order = '0';
  band.style.display = 'block';
  band.style.width = '100%';
  band.style.height = bandFrac + '%';
  band.style.flexShrink = '0';
  band.style.order = (tb.position === 'header') ? '-1' : '1';

  // Match the wrapper aspect ratio to include the band so nothing is distorted.
  if(wrapper) {
    wrapper.style.aspectRatio = res.w + ' / ' + total;
    wrapper.style.paddingBottom = '0';
    wrapper.style.height = 'auto';
  }

  // Draw the band at full canvas-pixel resolution for crispness.
  band.width = res.w;
  band.height = bandH;
  var ctx = band.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, res.w, bandH);
  tbEnsureImagesLoaded(tb, function() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, res.w, bandH);
    drawTitleBlockBand(ctx, tb, 0, 0, res.w, bandH, res.w, res.h);
  });
}

// ==================== COMPOSITE BUILDER (EXPORT) ====================
// Offscreen canvas = canvasRes wide x (canvasRes height + band). The clean LED map
// is blitted from the export cache (no band, no green border); the band is drawn in
// the reserved strip above (header) or below (footer).
function buildTitleBlockCanvas() {
  var tb = getCurrentTitleBlock();
  var res = _getCanvasResolution();
  var bandH = _tbBandHeight(tb);
  var out = document.createElement('canvas');
  out.width = res.w;
  out.height = res.h + bandH;
  var ctx = out.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, out.width, out.height);

  var canvasY = (tb && tb.position === 'header') ? bandH : 0;
  var bandY = (tb && tb.position === 'header') ? 0 : res.h;

  if(typeof cachedCanvasImageDataForExport !== 'undefined' && cachedCanvasImageDataForExport &&
     cachedCanvasImageDataForExport.width === res.w && cachedCanvasImageDataForExport.height === res.h) {
    ctx.putImageData(cachedCanvasImageDataForExport, 0, canvasY);
  } else {
    var live = document.getElementById('canvasView');
    if(live) ctx.drawImage(live, 0, canvasY, res.w, res.h);
  }

  drawTitleBlockBand(ctx, tb, 0, bandY, res.w, bandH, res.w, res.h);
  return out;
}

// ==================== EXPORT ENTRY POINTS ====================

// Single export — triggered by the "Canvas + Title Block" format option.
function exportCanvasWithTitleBlock(filename) {
  var tb = getCurrentTitleBlock();
  if(!tb || !tb.enabled) {
    showAlert('Enable the Header/Footer band first (Header/Footer section).');
    return;
  }
  var live = document.getElementById('canvasView');
  if(!live || live.width === 0) {
    showAlert('Please generate a canvas view first by clicking "Calculate".');
    return;
  }
  tbEnsureImagesLoaded(tb, function() {
    var out = buildTitleBlockCanvas();
    _downloadCanvasBlob(out, (filename || 'LED_Wall_Canvas') + '_titleblock.png', 'image/png');
  });
}

// Export All — one composite PNG per canvas tab that has the band enabled.
function getTitleBlockBlobsForCanvases(callback) {
  try {
    if(typeof canvases === 'undefined' || !canvases) {
      var tb0 = getCurrentTitleBlock();
      if(!tb0 || !tb0.enabled) { callback([]); return; }
      tbEnsureImagesLoaded(tb0, function() {
        var single = buildTitleBlockCanvas();
        single.toBlob(function(b) {
          callback([{ canvasId: 'canvas_1', name: 'Canvas 1', blob: b, w: single.width, h: single.height }]);
        }, 'image/png');
      });
      return;
    }

    var ids = Object.keys(canvases).sort(function(a, b) {
      return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
    }).filter(function(id) {
      var d = canvases[id] && canvases[id].data;
      return d && d.titleBlock && d.titleBlock.enabled;
    });
    if(ids.length === 0) { callback([]); return; }

    var originalId = currentCanvasId;
    var results = [];
    function next(i) {
      if(i >= ids.length) {
        if(originalId && originalId !== currentCanvasId && typeof switchToCanvas === 'function') {
          switchToCanvas(originalId);
        }
        callback(results);
        return;
      }
      var id = ids[i];
      try {
        if(id !== currentCanvasId && typeof switchToCanvas === 'function') switchToCanvas(id);
        else if(typeof showCanvasView === 'function') showCanvasView();
      } catch(e) {}
      requestAnimationFrame(function() {
        var tb = getCurrentTitleBlock();
        tbEnsureImagesLoaded(tb, function() {
          var out = buildTitleBlockCanvas();
          var name = (canvases[id] && canvases[id].name) ? canvases[id].name : ('Canvas ' + (i + 1));
          out.toBlob(function(b) {
            results.push({ canvasId: id, name: name, blob: b, w: out.width, h: out.height });
            next(i + 1);
          }, 'image/png');
        });
      });
    }
    next(0);
  } catch(e) {
    console.error('getTitleBlockBlobsForCanvases error:', e);
    callback([]);
  }
}

// ==================== INLINE CONTROLS ====================

// Rebuilds the inline "Header/Footer" section from the active tab's band config.
// Called on tab switch (loadCanvasData) and on cell-type / logo changes.
function renderHeaderFooterControls() {
  var tb = getCurrentTitleBlock();
  var section = document.getElementById('headerFooterSection');
  if(!section) return;
  if(!tb) tb = tbDefaultState();

  var en = document.getElementById('hfEnableToggle');
  if(en) en.checked = !!tb.enabled;
  var pf = document.getElementById('hfPosFooterBtn');
  var ph = document.getElementById('hfPosHeaderBtn');
  if(pf) pf.classList.toggle('active', tb.position !== 'header');
  if(ph) ph.classList.toggle('active', tb.position === 'header');
  var hi = document.getElementById('hfHeightInput');
  if(hi) hi.value = _tbBandHeight(tb);

  var c = document.getElementById('hfCellsContainer');
  if(!c) return;
  var labels = ['Left', 'Center', 'Right'];
  var types = [['empty', 'Empty'], ['company', 'Company Logo'], ['show', 'Show / Event Logo'], ['title', 'Title Block']];
  var html = '';
  for(var i = 0; i < 3; i++) {
    var cell = tb.cells[i];
    html += '<div class="hf-cell-editor">';
    html += '<div class="hf-cell-head">Cell ' + (i + 1) + ' · ' + labels[i] + '</div>';
    html += '<select class="hf-cell-type" onchange="tbSetCellType(' + i + ', this.value)">';
    types.forEach(function(t) {
      html += '<option value="' + t[0] + '"' + (cell.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>';
    });
    html += '</select>';
    if(cell.type === 'company' || cell.type === 'show') {
      html += '<div class="hf-logo-row">';
      html += '<button type="button" class="tp-choose-file-btn" onclick="document.getElementById(\'hfLogoFile' + i + '\').click()">Choose File</button>';
      html += '<input type="file" id="hfLogoFile' + i + '" class="tp-file-input-hidden" accept="image/*" onchange="tbHandleLogoUpload(this, ' + i + ')">';
      if(cell.image) {
        html += '<img class="tb-logo-thumb" src="' + escapeHtml(cell.image) + '" alt="logo">';
        html += '<button type="button" class="tb-remove-logo-btn" onclick="tbRemoveLogo(' + i + ')">Remove</button>';
      }
      html += '</div>';
    } else if(cell.type === 'title') {
      html += '<input type="text" class="hf-title-input" placeholder="Title (e.g. VELD 2025)" value="' + escapeHtml(cell.title || '') + '" oninput="tbSetCellText(' + i + ', \'title\', this.value)">';
      html += '<input type="text" class="hf-title-input" placeholder="Subtitle (e.g. Bass Stage)" value="' + escapeHtml(cell.subtitle || '') + '" oninput="tbSetCellText(' + i + ', \'subtitle\', this.value)">';
    }
    html += '</div>';
  }
  c.innerHTML = html;
}

function _tbRerenderBand() {
  if(typeof showCanvasView === 'function') showCanvasView();
}

function tbToggleEnabled(checked) {
  var tb = getCurrentTitleBlock();
  if(!tb) return;
  tb.enabled = !!checked;
  _tbRerenderBand();
}

function tbSetPosition(pos) {
  var tb = getCurrentTitleBlock();
  if(!tb) return;
  tb.position = (pos === 'header') ? 'header' : 'footer';
  var pf = document.getElementById('hfPosFooterBtn');
  var ph = document.getElementById('hfPosHeaderBtn');
  if(pf) pf.classList.toggle('active', tb.position !== 'header');
  if(ph) ph.classList.toggle('active', tb.position === 'header');
  _tbRerenderBand();
}

function tbSetHeight(val) {
  var tb = getCurrentTitleBlock();
  if(!tb) return;
  var h = parseInt(val, 10);
  tb.height = (isNaN(h) || h < 40) ? 240 : h;
  _tbRerenderBand();
}

function tbSetCellType(i, type) {
  var tb = getCurrentTitleBlock();
  if(!tb || !tb.cells[i]) return;
  if(['empty', 'company', 'show', 'title'].indexOf(type) < 0) type = 'empty';
  tb.cells[i].type = type;
  renderHeaderFooterControls();
  tbEnsureImagesLoaded(tb, _tbRerenderBand);
}

function tbSetCellText(i, field, val) {
  var tb = getCurrentTitleBlock();
  if(!tb || !tb.cells[i]) return;
  tb.cells[i][field] = val;
  _tbRerenderBand();
}

function tbHandleLogoUpload(input, i) {
  var file = input.files && input.files[0];
  if(!file) return;
  if(file.size > TB_LOGO_MAX_BYTES) {
    showAlert('Logo file too large. Maximum size is 200 KB.');
    input.value = '';
    return;
  }
  var tb = getCurrentTitleBlock();
  if(!tb || !tb.cells[i]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    tb.cells[i].image = e.target.result;
    tb.cells[i].imageName = file.name;
    tb.cells[i]._img = null;
    renderHeaderFooterControls();
    tbEnsureImagesLoaded(tb, _tbRerenderBand);
  };
  reader.readAsDataURL(file);
}

function tbRemoveLogo(i) {
  var tb = getCurrentTitleBlock();
  if(!tb || !tb.cells[i]) return;
  tb.cells[i].image = null;
  tb.cells[i].imageName = '';
  tb.cells[i]._img = null;
  renderHeaderFooterControls();
  _tbRerenderBand();
}

// ==================== PERSISTENCE HELPERS ====================
// tbCloneState — JSON-safe copy for saving (drops the loaded Image objects).
function tbCloneState(tb) {
  if(!tb || typeof tb !== 'object') return tbDefaultState();
  return {
    enabled: !!tb.enabled,
    position: (tb.position === 'header') ? 'header' : 'footer',
    height: _tbBandHeight(tb),
    cells: (Array.isArray(tb.cells) ? tb.cells : []).slice(0, 3).map(function(c) {
      c = c || {};
      return {
        type: c.type,
        image: c.image || null,
        imageName: c.imageName || '',
        title: c.title || '',
        subtitle: c.subtitle || ''
      };
    })
  };
}

// tbSanitizeState — validates an untrusted saved object into a full band state.
function tbSanitizeState(obj) {
  var out = tbDefaultState();
  if(!obj || typeof obj !== 'object') return out;
  out.enabled = !!obj.enabled;
  out.position = (obj.position === 'header') ? 'header' : 'footer';
  var h = parseInt(obj.height, 10);
  out.height = isNaN(h) ? 240 : h;
  if(Array.isArray(obj.cells)) {
    for(var i = 0; i < 3; i++) {
      var src = obj.cells[i] || {};
      var t = src.type;
      if(['empty', 'company', 'show', 'title'].indexOf(t) < 0) t = 'empty';
      out.cells[i] = {
        type: t,
        image: (typeof src.image === 'string') ? src.image : null,
        imageName: (typeof src.imageName === 'string') ? src.imageName : '',
        title: (typeof src.title === 'string') ? src.title : '',
        subtitle: (typeof src.subtitle === 'string') ? src.subtitle : '',
        _img: null
      };
    }
  }
  return out;
}