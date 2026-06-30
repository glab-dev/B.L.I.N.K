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

    // Clip every cell's content to its own box so nothing extrudes into a neighbour
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, by, cellW, bh);
    ctx.clip();
    if(cell.type === 'title') {
      _tbDrawTitleCell(ctx, cx, by, cellW, bh, cell, canvasResX, canvasResY);
    } else if(cell.type === 'company' || cell.type === 'show') {
      _tbDrawLogoCell(ctx, cx, by, cellW, bh, cell);
    }
    ctx.restore();
  }
}

function _tbDrawLogoCell(ctx, cx, cy, cw, ch, cell) {
  var img = cell._img;
  if(!img || !img.complete || !img.naturalWidth) return;
  var pad = Math.min(cw, ch) * 0.08;
  var availW = cw - pad * 2;
  var availH = ch - pad * 2;
  var scale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight);
  var dw = img.naturalWidth * scale;
  var dh = img.naturalHeight * scale;
  ctx.drawImage(img, cx + (cw - dw) / 2, cy + (ch - dh) / 2, dw, dh);
}

// Shrinks a font size until the text fits maxW (never below 6px).
function _tbFitFont(ctx, text, maxW, startSize, fam, weight) {
  var size = startSize;
  ctx.font = (weight || '') + size + "px " + fam;
  while(size > 6 && ctx.measureText(text).width > maxW) {
    size -= 1;
    ctx.font = (weight || '') + size + "px " + fam;
  }
  return size;
}

function _tbDrawTitleCell(ctx, cx, cy, cw, ch, cell, canvasResX, canvasResY) {
  var info = _tbGetAutoInfo(canvasResX, canvasResY);
  var infoLines = [];
  if(info.panelLine) infoLines.push(['Panel Type:', info.panelLine]);
  if(info.canvasLine) infoLines.push(['Canvas Size:', info.canvasLine]);
  var hasInfo = infoLines.length > 0;

  var title = (cell.title || '').trim();
  var subtitle = (cell.subtitle || '').trim();
  var hasTitle = !!title, hasSub = !!subtitle;

  var padX = cw * 0.045;
  var padY = ch * 0.10;
  var innerW = cw - padX * 2;
  var innerH = ch - padY * 2;

  // Two non-overlapping zones: left = user title/subtitle, right = auto info.
  var zoneGap = hasInfo && (hasTitle || hasSub) ? cw * 0.04 : 0;
  var leftW = (hasInfo && (hasTitle || hasSub)) ? innerW * 0.52 : innerW;
  var rightW = hasInfo ? (innerW - leftW - zoneGap) : 0;
  var leftX = cx + padX;
  var rightX = (hasTitle || hasSub) ? (leftX + leftW + zoneGap) : leftX;
  if(!hasTitle && !hasSub) rightW = innerW; // info-only cell uses full width

  var ROBOTO = "'Roboto Condensed', sans-serif";

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Title/subtitle use the same Roboto Condensed family as the info text beside them
  function drawTitleLine(text, x, yMid, size) {
    ctx.font = "700 " + size + "px " + ROBOTO;
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x, yMid);
  }

  // ---- LEFT: title + subtitle, fit to width then to total height ----
  if(hasTitle || hasSub) {
    var tSize = hasTitle ? Math.min(innerH * (hasSub ? 0.56 : 0.92), ch * 0.46) : 0;
    var sSize = hasSub ? Math.min(innerH * (hasTitle ? 0.34 : 0.62), ch * 0.30) : 0;
    if(hasTitle) tSize = _tbFitFont(ctx, title, leftW, tSize, ROBOTO, "700 ");
    if(hasSub) sSize = _tbFitFont(ctx, subtitle, leftW, sSize, ROBOTO, "700 ");
    var tLineH = tSize * 1.08;
    var sLineH = sSize * 1.18;
    var blockH = (hasTitle ? tLineH : 0) + (hasSub ? sLineH : 0);
    if(blockH > innerH && blockH > 0) {
      var k = innerH / blockH;
      tSize *= k; sSize *= k; tLineH *= k; sLineH *= k; blockH = innerH;
    }
    var yCursor = cy + (ch - blockH) / 2;
    if(hasTitle) { drawTitleLine(title, leftX, yCursor + tLineH / 2, tSize); yCursor += tLineH; }
    if(hasSub) { drawTitleLine(subtitle, leftX, yCursor + sLineH / 2, sSize); }
  }

  // ---- RIGHT: auto info (label + value pairs), fit to width and height ----
  if(hasInfo) {
    var nLines = infoLines.length * 2;
    var infoSize = Math.min(innerH / (nLines * 1.32), ch * 0.17);
    infoLines.forEach(function(pair) {
      infoSize = Math.min(infoSize, _tbFitFont(ctx, pair[0], rightW, infoSize, ROBOTO, ''));
      infoSize = Math.min(infoSize, _tbFitFont(ctx, pair[1], rightW, infoSize, ROBOTO, ''));
    });
    var infoLineH = infoSize * 1.32;
    var infoTotalH = nLines * infoLineH;
    var iy = cy + (ch - infoTotalH) / 2 + infoLineH / 2;
    ctx.font = infoSize + "px " + ROBOTO;
    infoLines.forEach(function(pair) {
      ctx.fillStyle = '#bbbbbb'; ctx.fillText(pair[0], rightX, iy); iy += infoLineH;
      ctx.fillStyle = '#ffffff'; ctx.fillText(pair[1], rightX, iy); iy += infoLineH;
    });
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

  _tbUpdateEnableBtn(tb.enabled);
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

function _tbUpdateEnableBtn(on) {
  var btn = document.getElementById('hfEnableToggle');
  if(!btn) return;
  btn.classList.toggle('active', !!on);
  btn.textContent = on ? 'Enabled' : 'Disabled';
}

function tbToggleEnabled() {
  var tb = getCurrentTitleBlock();
  if(!tb) return;
  tb.enabled = !tb.enabled;
  _tbUpdateEnableBtn(tb.enabled);
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