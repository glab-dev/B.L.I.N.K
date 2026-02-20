// ==================== TEST PATTERN GENERATOR ====================
// Standalone tool for generating professional test pattern PNG images.
// Completely independent from the LED calculator modes.

// --- State ---
var tpImageName = 'Name your testpattern';
var tpDisplayW = 1920;
var tpDisplayH = 1080;
var tpDisplaysWide = 1;
var tpDisplaysHigh = 1;
var tpGridSizePct = 50;
var tpGridWidthPct = 50;
var tpGridColor = '#d23de6';
var tpTextColor = '#ffffff';
var tpCrossColor = '#00ff7b';
var tpBgColor = '#000000';
var tpBoundaryColor = '#249be5';
var tpCirclesOn = true;
var tpColorBarsOn = true;
var tpColorBarsMode = 'default';
var tpTextSizePct = 50;
var tpShowName = true;
var tpShowPixelSize = true;
var tpShowAspectRatio = true;
var tpShowSquareCount = true;
var tpLogoOn = false;
var tpLogoImage = null;
var tpLogoSizePct = 50;
var tpLogoMode = 'default';
var tpLogoStatic = false;
var tpColorBarsOpacity = 100;
var tpLogoOpacity = 100;
var tpSweepOn = false;
var tpSweepColor = '#ffffff';
var tpSweepColorV = '#ffffff';
var tpSweepDuration = 5;
var tpSweepWidthPct = 2;
var tpSweepFps = 60;
var _tpSweepProgress = 0;
var _tpSweepAnimId = null;
var _tpSweepStartTime = null;
var _tpIsRecording = false;
var _tpRafId = null;
var tpCircleSpinMode = 'static';
var tpCircleRevMode = 'none';
var tpCircleSpinSpeed = 50;
var _tpCircleAngle = 0;
var _tpAnimId = null;
var _tpAnimStartTime = null;
var tpBgImageOn = false;
var tpBgImage = null;
var tpCheckerOpacity = 100;
var tpBorderOpacity = 100;
var tpProcessorLinesOn = false;
var tpProcessorCanvasSize = '4K_UHD';
var tpProcessorCanvasW = 3840;
var tpProcessorCanvasH = 2160;
var tpProcessorLineColor = '#ff0000';
var tpCheckerOn = false;
var tpCheckerSizePct = 50;
var tpCheckerBorderOn = false;
var tpBorderSizePct = 50;
var tpBorderColor1 = '#ffffff';
var tpBorderColor2 = '#000000';
var tpCheckerColor1 = '#000000';
var tpCheckerColor2 = '#1a1a1a';
var _tpInitialized = false;
var _tpForceShare = false;
var _tpLiveOutWindow = null;
var _tpLiveOutWindows = [];
var _tpLiveOutMode = null;
var _tpLiveOutOffscreen = null;
var _tpUndoStack = [];
var _tpRedoStack = [];
var _tpMaxHistory = 30;

// --- Layer Order ---
var _tpDefaultLayerOrder = [
  'checker', 'bgImage', 'checkerBorder', 'grid', 'displayBoundaries', 'processorLines',
  'circles', 'crosshair', 'colorBars', 'logo', 'outerBorder', 'sweep'
];
var tpLayerOrder = _tpDefaultLayerOrder.slice();

var _tpLayerRegistry = {
  checker: { name: 'Checker', draw: function(ctx, w, h) {
    if(!tpCheckerOn) return;
    if(tpCheckerOpacity < 100) ctx.globalAlpha = tpCheckerOpacity / 100;
    var minSize = Math.max(8, Math.round(Math.min(w, h) / 40));
    var maxSize = Math.round(Math.min(w, h) / 2);
    var squareSize = Math.round(minSize + (tpCheckerSizePct / 100) * (maxSize - minSize));
    var cols = Math.ceil(w / squareSize);
    var rows = Math.ceil(h / squareSize);
    for(var r = 0; r < rows; r++) {
      for(var c = 0; c < cols; c++) {
        ctx.fillStyle = (c + r) % 2 === 0 ? tpCheckerColor1 : tpCheckerColor2;
        ctx.fillRect(c * squareSize, r * squareSize, squareSize, squareSize);
      }
    }
    ctx.globalAlpha = 1;
  }},
  bgImage: { name: 'BG Image', draw: function(ctx, w, h) {
    if(!tpBgImageOn || !tpBgImage) return;
    var imgW = tpBgImage.width, imgH = tpBgImage.height;
    var scale = Math.max(w / imgW, h / imgH);
    var dw = imgW * scale, dh = imgH * scale;
    var dx = (w - dw) / 2, dy = (h - dh) / 2;
    ctx.drawImage(tpBgImage, dx, dy, dw, dh);
  }},
  checkerBorder: { name: 'Checker Border', draw: function(ctx, w, h) {
    if(!tpCheckerBorderOn) return;
    if(tpBorderOpacity < 100) ctx.globalAlpha = tpBorderOpacity / 100;
    drawTPCheckerBorder(ctx, w, h);
    ctx.globalAlpha = 1;
  }},
  grid: { name: 'Grid', draw: function(ctx, w, h, gs) {
    if(tpGridSizePct > 0 && tpGridWidthPct > 0) drawTPGrid(ctx, w, h, gs);
  }},
  displayBoundaries: { name: 'Display Boundaries', draw: function(ctx, w, h) {
    if(tpDisplaysWide > 1 || tpDisplaysHigh > 1) drawTPDisplayBoundaries(ctx, w, h);
  }},
  processorLines: { name: 'Processor Lines', draw: function(ctx, w, h) {
    if(tpProcessorLinesOn) drawTPProcessorLines(ctx, w, h);
  }},
  circles: { name: 'Circles', draw: function(ctx, w, h) {
    if(tpCirclesOn) drawTPCircles(ctx, w, h);
  }},
  crosshair: { name: 'Crosshair', draw: function(ctx, w, h) {
    drawTPCrosshair(ctx, w, h);
  }},
  colorBars: { name: 'Color Bars', draw: function(ctx, w, h) {
    if(!tpColorBarsOn) return;
    if(tpColorBarsOpacity < 100) ctx.globalAlpha = tpColorBarsOpacity / 100;
    drawTPColorBars(ctx, w, h);
    ctx.globalAlpha = 1;
  }},
  logo: { name: 'Logo', draw: function(ctx, w, h) {
    if(!tpLogoOn || !tpLogoImage) return;
    if(tpLogoOpacity < 100) ctx.globalAlpha = tpLogoOpacity / 100;
    drawTPLogo(ctx, w, h);
    ctx.globalAlpha = 1;
  }},
  outerBorder: { name: 'Outer Border', draw: function(ctx, w, h) {
    ctx.strokeStyle = tpCrossColor;
    ctx.lineWidth = Math.max(2, Math.round(w / 500));
    ctx.strokeRect(0, 0, w, h);
  }},
  sweep: { name: 'Sweep', draw: function(ctx, w, h) {
    if(!tpSweepOn) return;
    drawTPSweep(ctx, w, h, _tpSweepProgress);
    drawTPSweepVertical(ctx, w, h, _tpSweepProgress);
  }}
};

// --- Undo / Redo ---

function _tpGetState() {
  return {
    tpImageName: tpImageName, tpDisplayW: tpDisplayW, tpDisplayH: tpDisplayH,
    tpDisplaysWide: tpDisplaysWide, tpDisplaysHigh: tpDisplaysHigh,
    tpGridSizePct: tpGridSizePct, tpGridWidthPct: tpGridWidthPct,
    tpGridColor: tpGridColor, tpTextColor: tpTextColor, tpCrossColor: tpCrossColor,
    tpBgColor: tpBgColor, tpBoundaryColor: tpBoundaryColor,
    tpCirclesOn: tpCirclesOn, tpColorBarsOn: tpColorBarsOn, tpColorBarsMode: tpColorBarsMode,
    tpTextSizePct: tpTextSizePct,
    tpShowName: tpShowName, tpShowPixelSize: tpShowPixelSize,
    tpShowAspectRatio: tpShowAspectRatio, tpShowSquareCount: tpShowSquareCount,
    tpLogoOn: tpLogoOn, tpLogoImage: tpLogoImage, tpLogoSizePct: tpLogoSizePct,
    tpLogoMode: tpLogoMode, tpLogoStatic: tpLogoStatic,
    tpColorBarsOpacity: tpColorBarsOpacity, tpLogoOpacity: tpLogoOpacity,
    tpSweepOn: tpSweepOn, tpSweepColor: tpSweepColor, tpSweepColorV: tpSweepColorV,
    tpSweepDuration: tpSweepDuration, tpSweepWidthPct: tpSweepWidthPct, tpSweepFps: tpSweepFps,
    tpCircleSpinMode: tpCircleSpinMode, tpCircleRevMode: tpCircleRevMode, tpCircleSpinSpeed: tpCircleSpinSpeed,
    tpCheckerOn: tpCheckerOn, tpCheckerSizePct: tpCheckerSizePct,
    tpCheckerBorderOn: tpCheckerBorderOn, tpBorderSizePct: tpBorderSizePct,
    tpBorderColor1: tpBorderColor1, tpBorderColor2: tpBorderColor2,
    tpCheckerColor1: tpCheckerColor1, tpCheckerColor2: tpCheckerColor2,
    tpCheckerOpacity: tpCheckerOpacity, tpBorderOpacity: tpBorderOpacity,
    tpBgImageOn: tpBgImageOn, tpBgImage: tpBgImage,
    tpProcessorLinesOn: tpProcessorLinesOn, tpProcessorCanvasSize: tpProcessorCanvasSize,
    tpProcessorCanvasW: tpProcessorCanvasW, tpProcessorCanvasH: tpProcessorCanvasH,
    tpProcessorLineColor: tpProcessorLineColor,
    tpLayerOrder: tpLayerOrder.slice()
  };
}

function _tpApplyState(s) {
  tpImageName = s.tpImageName; tpDisplayW = s.tpDisplayW; tpDisplayH = s.tpDisplayH;
  tpDisplaysWide = s.tpDisplaysWide; tpDisplaysHigh = s.tpDisplaysHigh;
  tpGridSizePct = s.tpGridSizePct; tpGridWidthPct = s.tpGridWidthPct;
  tpGridColor = s.tpGridColor; tpTextColor = s.tpTextColor; tpCrossColor = s.tpCrossColor;
  tpBgColor = s.tpBgColor; tpBoundaryColor = s.tpBoundaryColor;
  tpCirclesOn = s.tpCirclesOn; tpColorBarsOn = s.tpColorBarsOn; tpColorBarsMode = s.tpColorBarsMode;
  tpTextSizePct = s.tpTextSizePct;
  tpShowName = s.tpShowName; tpShowPixelSize = s.tpShowPixelSize;
  tpShowAspectRatio = s.tpShowAspectRatio; tpShowSquareCount = s.tpShowSquareCount;
  tpLogoOn = s.tpLogoOn; tpLogoImage = s.tpLogoImage; tpLogoSizePct = s.tpLogoSizePct;
  tpLogoMode = s.tpLogoMode; tpLogoStatic = s.tpLogoStatic;
  tpColorBarsOpacity = s.tpColorBarsOpacity; tpLogoOpacity = s.tpLogoOpacity;
  tpSweepOn = s.tpSweepOn; tpSweepColor = s.tpSweepColor; tpSweepColorV = s.tpSweepColorV;
  tpSweepDuration = s.tpSweepDuration; tpSweepWidthPct = s.tpSweepWidthPct; tpSweepFps = s.tpSweepFps;
  tpCircleSpinMode = s.tpCircleSpinMode; tpCircleRevMode = s.tpCircleRevMode; tpCircleSpinSpeed = s.tpCircleSpinSpeed;
  tpCheckerOn = s.tpCheckerOn; tpCheckerSizePct = s.tpCheckerSizePct;
  tpCheckerBorderOn = s.tpCheckerBorderOn; tpBorderSizePct = s.tpBorderSizePct;
  tpBorderColor1 = s.tpBorderColor1; tpBorderColor2 = s.tpBorderColor2;
  tpCheckerColor1 = s.tpCheckerColor1; tpCheckerColor2 = s.tpCheckerColor2;
  tpCheckerOpacity = s.tpCheckerOpacity; tpBorderOpacity = s.tpBorderOpacity;
  tpBgImageOn = s.tpBgImageOn; tpBgImage = s.tpBgImage;
  tpProcessorLinesOn = s.tpProcessorLinesOn; tpProcessorCanvasSize = s.tpProcessorCanvasSize;
  tpProcessorCanvasW = s.tpProcessorCanvasW; tpProcessorCanvasH = s.tpProcessorCanvasH;
  tpProcessorLineColor = s.tpProcessorLineColor;
  tpLayerOrder = s.tpLayerOrder ? s.tpLayerOrder.slice() : _tpDefaultLayerOrder.slice();
  _tpSyncDOM();
}

function _tpSyncDOM() {
  document.getElementById('tpImageName').value = tpImageName === 'Name your testpattern' ? '' : tpImageName;
  document.getElementById('tpDisplayW').value = tpDisplayW;
  document.getElementById('tpDisplayH').value = tpDisplayH;
  document.getElementById('tpDisplaysWide').value = tpDisplaysWide;
  document.getElementById('tpDisplaysHigh').value = tpDisplaysHigh;
  document.getElementById('tpGridSize').value = tpGridSizePct;
  document.getElementById('tpGridSizeVal').textContent = tpGridSizePct + '%';
  document.getElementById('tpGridWidth').value = tpGridWidthPct;
  document.getElementById('tpGridWidthVal').textContent = tpGridWidthPct + '%';
  document.getElementById('tpTextSize').value = tpTextSizePct;
  document.getElementById('tpTextSizeVal').textContent = tpTextSizePct + '%';
  document.getElementById('tpGridColor').value = tpGridColor;
  document.getElementById('tpTextColor').value = tpTextColor;
  document.getElementById('tpCrossColor').value = tpCrossColor;
  document.getElementById('tpBoundaryColor').value = tpBoundaryColor;
  document.getElementById('tpBgColor').value = tpBgColor;
  document.getElementById('tpCheckerColor1').value = tpCheckerColor1;
  document.getElementById('tpCheckerColor2').value = tpCheckerColor2;
  document.getElementById('tpChecker').checked = tpCheckerOn;
  document.getElementById('tpCheckerSize').value = tpCheckerSizePct;
  document.getElementById('tpCheckerSizeVal').textContent = tpCheckerSizePct + '%';
  document.getElementById('tpCheckerBorder').checked = tpCheckerBorderOn;
  document.getElementById('tpBorderSize').value = tpBorderSizePct;
  document.getElementById('tpBorderSizeVal').textContent = tpBorderSizePct + '%';
  document.getElementById('tpBorderColor1').value = tpBorderColor1;
  document.getElementById('tpBorderColor2').value = tpBorderColor2;
  document.getElementById('tpCircles').checked = tpCirclesOn;
  document.getElementById('tpColorBars').checked = tpColorBarsOn;
  document.getElementById('tpColorBarsMode').value = tpColorBarsMode;
  document.getElementById('tpColorBarsOpacity').value = tpColorBarsOpacity;
  document.getElementById('tpColorBarsOpacityVal').textContent = tpColorBarsOpacity + '%';
  document.getElementById('tpCircleSpinMode').value = tpCircleSpinMode;
  document.getElementById('tpCircleRevMode').value = tpCircleRevMode;
  document.getElementById('tpCircleSpinSpeed').value = tpCircleSpinSpeed;
  document.getElementById('tpCircleSpinSpeedVal').textContent = tpCircleSpinSpeed + '%';
  document.getElementById('tpShowName').checked = tpShowName;
  document.getElementById('tpShowPixelSize').checked = tpShowPixelSize;
  document.getElementById('tpShowAspectRatio').checked = tpShowAspectRatio;
  document.getElementById('tpShowSquareCount').checked = tpShowSquareCount;
  document.getElementById('tpLogoToggle').checked = tpLogoOn;
  document.getElementById('tpLogoMode').value = tpLogoMode;
  document.getElementById('tpLogoStatic').checked = tpLogoStatic;
  document.getElementById('tpLogoSize').value = tpLogoSizePct;
  document.getElementById('tpLogoSizeVal').textContent = tpLogoSizePct + '%';
  document.getElementById('tpLogoOpacity').value = tpLogoOpacity;
  document.getElementById('tpLogoOpacityVal').textContent = tpLogoOpacity + '%';
  document.getElementById('tpSweep').checked = tpSweepOn;
  document.getElementById('tpSweepDuration').value = tpSweepDuration;
  document.getElementById('tpSweepDurationVal').textContent = tpSweepDuration + 's';
  document.getElementById('tpSweepWidth').value = tpSweepWidthPct;
  var swv = tpSweepWidthPct;
  document.getElementById('tpSweepWidthVal').textContent = (swv % 1 === 0 ? swv.toFixed(0) : swv.toFixed(1)) + '%';
  document.getElementById('tpSweepColor').value = tpSweepColor;
  document.getElementById('tpSweepColorV').value = tpSweepColorV;
  document.getElementById('tpSweepFps').value = String(tpSweepFps);
  document.getElementById('tpCheckerOpacity').value = tpCheckerOpacity;
  document.getElementById('tpCheckerOpacityVal').textContent = tpCheckerOpacity + '%';
  document.getElementById('tpBorderOpacity').value = tpBorderOpacity;
  document.getElementById('tpBorderOpacityVal').textContent = tpBorderOpacity + '%';
  document.getElementById('tpBgImageToggle').checked = tpBgImageOn;
  document.getElementById('tpProcessorLinesToggle').checked = tpProcessorLinesOn;
  document.getElementById('tpProcessorCanvasSize').value = tpProcessorCanvasSize;
  document.getElementById('tpProcessorCustomW').value = tpProcessorCanvasW;
  document.getElementById('tpProcessorCustomH').value = tpProcessorCanvasH;
  document.getElementById('tpProcessorLineColor').value = tpProcessorLineColor;
  document.getElementById('tpProcessorCustomSize').style.display =
    tpProcessorCanvasSize === 'custom' ? '' : 'none';

  updateTotalSize();
  _tpRestartAnimationIfNeeded();
  scheduleTestPatternRedraw();
  _tpUpdateUndoRedoBtns();
}

function tpSaveState() {
  _tpUndoStack.push(_tpGetState());
  if(_tpUndoStack.length > _tpMaxHistory) _tpUndoStack.shift();
  _tpRedoStack = [];
  _tpUpdateUndoRedoBtns();
}

function tpUndo() {
  if(_tpUndoStack.length === 0) return;
  _tpRedoStack.push(_tpGetState());
  var state = _tpUndoStack.pop();
  _tpApplyState(state);
}

function tpRedo() {
  if(_tpRedoStack.length === 0) return;
  _tpUndoStack.push(_tpGetState());
  var state = _tpRedoStack.pop();
  _tpApplyState(state);
}

function _tpUpdateUndoRedoBtns() {
  var undoBtn = document.getElementById('tpUndoBtn');
  var redoBtn = document.getElementById('tpRedoBtn');
  if(undoBtn) undoBtn.disabled = _tpUndoStack.length === 0;
  if(redoBtn) redoBtn.disabled = _tpRedoStack.length === 0;
}

// --- Image Serialization ---

function _tpImageToDataURL(img) {
  if(!img) return null;
  var c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  try {
    return c.toDataURL('image/png');
  } catch(e) {
    return null;
  }
}

function _tpGetSerializableState() {
  var s = _tpGetState();
  s.tpLogoImage = _tpImageToDataURL(s.tpLogoImage);
  s.tpBgImage = _tpImageToDataURL(s.tpBgImage);
  return s;
}

function _tpLoadSerializedState(data, callback) {
  var pending = 0;

  function checkDone() {
    pending--;
    if(pending <= 0) {
      _tpApplyState(data);
      if(callback) callback();
    }
  }

  if(data.tpLogoImage && typeof data.tpLogoImage === 'string') {
    pending++;
    var logoImg = new Image();
    logoImg.onload = function() { data.tpLogoImage = logoImg; checkDone(); };
    logoImg.onerror = function() { data.tpLogoImage = null; checkDone(); };
    logoImg.src = data.tpLogoImage;
  }

  if(data.tpBgImage && typeof data.tpBgImage === 'string') {
    pending++;
    var bgImg = new Image();
    bgImg.onload = function() { data.tpBgImage = bgImg; checkDone(); };
    bgImg.onerror = function() { data.tpBgImage = null; checkDone(); };
    bgImg.src = data.tpBgImage;
  }

  if(pending === 0) {
    _tpApplyState(data);
    if(callback) callback();
  }
}

// --- File Save / Load ---

async function tpSavePatternFile() {
  var state = _tpGetSerializableState();
  var config = {
    version: '1.0',
    type: 'testpattern',
    timestamp: new Date().toISOString(),
    name: tpImageName,
    state: state
  };

  var json = JSON.stringify(config, null, 2);
  var safeName = tpImageName.replace(/[<>:"/\\|?*]/g, '_').trim() || 'testpattern';
  var fileName = safeName + '.blinktp';
  var blob = new Blob([json], { type: 'application/json' });

  if(window.showSaveFilePicker) {
    try {
      var handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'BLINK Test Pattern', accept: { 'application/json': ['.blinktp'] } }]
      });
      var writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
    } catch(e) {
      if(e.name !== 'AbortError') showAlert('Save failed: ' + e.message);
    }
  } else if(navigator.canShare && navigator.canShare({ files: [new File([blob], fileName)] })) {
    try {
      await navigator.share({ files: [new File([blob], fileName, { type: 'application/json' })] });
    } catch(e) {
      if(e.name !== 'AbortError') showAlert('Save failed: ' + e.message);
    }
  } else {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(function() {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

function tpLoadPatternFile(event) {
  var file = event.target.files[0];
  if(!file) return;

  if(file.size > 20 * 1024 * 1024) {
    showAlert('Pattern file is too large (max 20MB).');
    event.target.value = '';
    return;
  }

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var config = JSON.parse(e.target.result);

      if(!config || config.type !== 'testpattern' || !config.state) {
        showAlert('Invalid test pattern file.');
        return;
      }

      tpSaveState();
      _tpLoadSerializedState(config.state);
    } catch(err) {
      showAlert('Error loading pattern: ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// --- Live Out ---

var _tpLiveOutWindowHTML =
  '<!DOCTYPE html><html><head><title>TITLE_PLACEHOLDER</title>' +
  '<style>' +
  '*{margin:0;padding:0;box-sizing:border-box}' +
  'html,body{width:100%;height:100%;background:#000;overflow:hidden;cursor:none}' +
  'body.show-cursor{cursor:default}' +
  'canvas{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);max-width:100vw;max-height:100vh}' +
  '</style></head>' +
  '<body class="show-cursor"><canvas id="liveCanvas"></canvas></body></html>';

function _tpSetupLiveOutWindow(w) {
  // Cursor auto-hide (2s inactivity)
  var cursorTimer = null;
  w.document.addEventListener('mousemove', function() {
    w.document.body.classList.add('show-cursor');
    if(cursorTimer) clearTimeout(cursorTimer);
    cursorTimer = setTimeout(function() {
      if(!w.closed) w.document.body.classList.remove('show-cursor');
    }, 2000);
  });

  // Fullscreen toggle: F key or double-click
  w.document.addEventListener('keydown', function(e) {
    if(e.key === 'f' || e.key === 'F') {
      if(w.document.fullscreenElement) {
        w.document.exitFullscreen();
      } else {
        w.document.documentElement.requestFullscreen().catch(function() {});
      }
    }
  });

  w.document.addEventListener('dblclick', function() {
    if(w.document.fullscreenElement) {
      w.document.exitFullscreen();
    } else {
      w.document.documentElement.requestFullscreen().catch(function() {});
    }
  });
}

function _tpCopyToLiveOut() {
  if(_tpLiveOutMode === 'full') {
    if(!_tpLiveOutWindow || _tpLiveOutWindow.closed) {
      if(_tpLiveOutWindow) _tpCleanupLiveOut();
      return;
    }
    var dst;
    try { dst = _tpLiveOutWindow.document.getElementById('liveCanvas'); } catch(e) { return; }
    if(!dst) return;
    renderTestPattern(true, dst);
  } else if(_tpLiveOutMode === 'split') {
    if(_tpLiveOutWindows.length === 0) return;
    // Render full pattern once to offscreen canvas
    if(!_tpLiveOutOffscreen) _tpLiveOutOffscreen = document.createElement('canvas');
    renderTestPattern(true, _tpLiveOutOffscreen);
    // Crop each display's region to its window
    for(var i = _tpLiveOutWindows.length - 1; i >= 0; i--) {
      var entry = _tpLiveOutWindows[i];
      if(entry.win.closed) { _tpLiveOutWindows.splice(i, 1); continue; }
      var eDst;
      try { eDst = entry.win.document.getElementById('liveCanvas'); } catch(e) { continue; }
      if(!eDst) continue;
      // Resize if display dimensions changed
      if(eDst.width !== tpDisplayW || eDst.height !== tpDisplayH) {
        eDst.width = tpDisplayW;
        eDst.height = tpDisplayH;
      }
      var dstCtx = eDst.getContext('2d');
      var srcX = entry.col * tpDisplayW;
      var srcY = entry.row * tpDisplayH;
      dstCtx.drawImage(_tpLiveOutOffscreen,
        srcX, srcY, tpDisplayW, tpDisplayH,
        0, 0, tpDisplayW, tpDisplayH);
    }
    if(_tpLiveOutWindows.length === 0) _tpCleanupLiveOut();
  }
}

function _tpCleanupLiveOut() {
  // Close single window
  if(_tpLiveOutWindow && !_tpLiveOutWindow.closed) {
    _tpLiveOutWindow.close();
  }
  _tpLiveOutWindow = null;
  // Close all split windows
  for(var i = 0; i < _tpLiveOutWindows.length; i++) {
    if(_tpLiveOutWindows[i].win && !_tpLiveOutWindows[i].win.closed) {
      _tpLiveOutWindows[i].win.close();
    }
  }
  _tpLiveOutWindows = [];
  _tpLiveOutMode = null;
  _tpLiveOutOffscreen = null;
  var btn = document.getElementById('tpLiveOutBtn');
  if(btn) btn.classList.remove('tp-liveout-active');
  var popup = document.getElementById('tpLiveOutPopup');
  if(popup) popup.classList.remove('open');
}

function _tpOpenFullOutput() {
  var w = window.open('', 'blink_live_out', 'width=960,height=540');
  if(!w) {
    showAlert('Your browser blocked the popup.\n\nChrome: Click the blocked popup icon in the address bar, or go to Settings \u2192 Privacy \u2192 Site Settings \u2192 Pop-ups \u2192 Allow this site.\n\nSafari: Preferences \u2192 Websites \u2192 Pop-up Windows \u2192 Allow.\n\nThis is a one-time setting.', 'Popup Blocked');
    return;
  }

  _tpLiveOutWindow = w;
  _tpLiveOutMode = 'full';

  w.document.open();
  w.document.write(_tpLiveOutWindowHTML.replace('TITLE_PLACEHOLDER', 'B.L.I.N.K. \u2014 Live Output'));
  w.document.close();

  var totalW = tpDisplayW * tpDisplaysWide;
  var totalH = tpDisplayH * tpDisplaysHigh;
  var liveCanvas = w.document.getElementById('liveCanvas');
  if(liveCanvas) {
    liveCanvas.width = totalW;
    liveCanvas.height = totalH;
  }

  _tpSetupLiveOutWindow(w);

  w.addEventListener('beforeunload', function() {
    _tpLiveOutWindow = null;
    _tpLiveOutMode = null;
    var btn = document.getElementById('tpLiveOutBtn');
    if(btn) btn.classList.remove('tp-liveout-active');
  });

  var btn = document.getElementById('tpLiveOutBtn');
  if(btn) btn.classList.add('tp-liveout-active');

  _tpCopyToLiveOut();
  if(!_tpAnimId) scheduleTestPatternRedraw();
}

function _tpOpenSplitOutputs() {
  _tpLiveOutWindows = [];
  _tpLiveOutMode = 'split';
  _tpLiveOutOffscreen = document.createElement('canvas');
  var blocked = false;

  for(var row = 0; row < tpDisplaysHigh; row++) {
    for(var col = 0; col < tpDisplaysWide; col++) {
      var name = 'blink_out_' + col + '_' + row;
      var title = 'B.L.I.N.K. \u2014 Output ' + (col + 1) + ',' + (row + 1);
      var w = window.open('', name, 'width=960,height=540');
      if(!w) { blocked = true; continue; }

      w.document.open();
      w.document.write(_tpLiveOutWindowHTML.replace('TITLE_PLACEHOLDER', title));
      w.document.close();

      var liveCanvas = w.document.getElementById('liveCanvas');
      if(liveCanvas) {
        liveCanvas.width = tpDisplayW;
        liveCanvas.height = tpDisplayH;
      }

      _tpSetupLiveOutWindow(w);
      _tpLiveOutWindows.push({ win: w, col: col, row: row });
    }
  }

  if(blocked) {
    showAlert('Your browser blocked some output windows.\n\nChrome: Click the blocked popup icon in the address bar, or go to Settings \u2192 Privacy \u2192 Site Settings \u2192 Pop-ups \u2192 Allow this site.\n\nSafari: Preferences \u2192 Websites \u2192 Pop-up Windows \u2192 Allow.\n\nThis is a one-time setting. After allowing, click Live Out again.', 'Popups Blocked');
  }

  if(_tpLiveOutWindows.length === 0) {
    _tpCleanupLiveOut();
    return;
  }

  var btn = document.getElementById('tpLiveOutBtn');
  if(btn) btn.classList.add('tp-liveout-active');

  _tpCopyToLiveOut();
  if(!_tpAnimId) scheduleTestPatternRedraw();
}

function toggleLiveOut() {
  // If any live out is active, close everything
  if(_tpLiveOutMode) {
    _tpCleanupLiveOut();
    return;
  }

  // Single display: open full output directly
  if(tpDisplaysWide * tpDisplaysHigh <= 1) {
    _tpOpenFullOutput();
    return;
  }

  // Multiple displays: show popup menu
  var popup = document.getElementById('tpLiveOutPopup');
  if(popup) {
    // Update split label with current grid size
    var splitBtn = document.getElementById('tpLiveOutSplit');
    if(splitBtn) splitBtn.textContent = 'Split Outputs (' + tpDisplaysWide + '\u00d7' + tpDisplaysHigh + ')';
    popup.classList.toggle('open');
  }
}

// --- Entry / Exit ---

function enterTestPatternMode() {
  history.pushState({ view: 'app', mode: 'testpattern' }, '', '');
  hideWelcomePage();

  // Test pattern is standalone — hide header, nav, main container
  var header = document.querySelector('.mobile-header');
  var bottomNav = document.querySelector('.bottom-nav');
  var mainContainer = document.querySelector('.main-container');
  var desktopHeader = document.querySelector('.page-header');
  if(header) header.style.display = 'none';
  if(bottomNav) bottomNav.style.display = 'none';
  if(mainContainer) mainContainer.style.display = 'none';
  if(desktopHeader) desktopHeader.style.display = 'none';

  var tpPage = document.getElementById('testPatternPage');
  if(tpPage) tpPage.style.display = 'flex';
  document.body.style.overflow = '';

  initTestPatternControls();
  updateTotalSize();
  _tpRestartAnimationIfNeeded();
  scheduleTestPatternRedraw();
}

function exitTestPatternMode() {
  _tpCleanupLiveOut();
  _tpStopAnimation();
  var tpPage = document.getElementById('testPatternPage');
  if(tpPage) tpPage.style.display = 'none';
  showWelcomePage();
}

// --- Reset ---

function resetTestPattern() {
  tpImageName = 'Name your testpattern';
  tpDisplayW = 1920; tpDisplayH = 1080;
  tpDisplaysWide = 1; tpDisplaysHigh = 1;
  tpGridSizePct = 50; tpGridWidthPct = 50;
  tpGridColor = '#d23de6'; tpTextColor = '#ffffff';
  tpCrossColor = '#00ff7b'; tpBgColor = '#000000';
  tpBoundaryColor = '#249be5';
  tpCirclesOn = true; tpColorBarsOn = true; tpColorBarsMode = 'default'; tpCircleSpinMode = 'static'; tpCircleRevMode = 'none'; tpCircleSpinSpeed = 50;
  tpTextSizePct = 50;
  tpShowName = true; tpShowPixelSize = true;
  tpShowAspectRatio = true; tpShowSquareCount = true;
  tpCheckerOn = false; tpCheckerSizePct = 50; tpCheckerBorderOn = false; tpBorderSizePct = 50;
  tpBorderColor1 = '#ffffff'; tpBorderColor2 = '#000000';
  tpCheckerColor1 = '#000000'; tpCheckerColor2 = '#1a1a1a';
  tpLogoOn = false; tpLogoImage = null; tpLogoSizePct = 50; tpLogoMode = 'default'; tpLogoStatic = false;
  tpColorBarsOpacity = 100; tpLogoOpacity = 100;
  tpCheckerOpacity = 100; tpBorderOpacity = 100;
  tpBgImageOn = false; tpBgImage = null;
  tpProcessorLinesOn = false; tpProcessorCanvasSize = '4K_UHD';
  tpProcessorCanvasW = 3840; tpProcessorCanvasH = 2160; tpProcessorLineColor = '#ff0000';
  tpLayerOrder = _tpDefaultLayerOrder.slice();
  tpSweepOn = false; tpSweepColor = '#ffffff'; tpSweepColorV = '#ffffff';
  tpSweepDuration = 5; tpSweepWidthPct = 2;
  tpSweepFps = 60;

  // Stop animations if running
  _tpStopAnimation();
  _tpCircleAngle = 0;

  // Sync DOM inputs
  document.getElementById('tpImageName').value = '';
  document.getElementById('tpDisplayW').value = 1920;
  document.getElementById('tpDisplayH').value = 1080;
  document.getElementById('tpDisplaysWide').value = 1;
  document.getElementById('tpDisplaysHigh').value = 1;
  document.getElementById('tpGridSize').value = 50;
  document.getElementById('tpGridSizeVal').textContent = '50%';
  document.getElementById('tpGridWidth').value = 50;
  document.getElementById('tpGridWidthVal').textContent = '50%';
  document.getElementById('tpTextSize').value = 50;
  document.getElementById('tpTextSizeVal').textContent = '50%';
  document.getElementById('tpGridColor').value = '#d23de6';
  document.getElementById('tpTextColor').value = '#ffffff';
  document.getElementById('tpCrossColor').value = '#00ff7b';
  document.getElementById('tpBoundaryColor').value = '#249be5';
  document.getElementById('tpBgColor').value = '#000000';
  document.getElementById('tpCheckerColor1').value = '#000000';
  document.getElementById('tpCheckerColor2').value = '#1a1a1a';
  document.getElementById('tpChecker').checked = false;
  document.getElementById('tpCheckerSize').value = 50;
  document.getElementById('tpCheckerSizeVal').textContent = '50%';
  document.getElementById('tpCheckerBorder').checked = false;
  document.getElementById('tpBorderSize').value = 50;
  document.getElementById('tpBorderSizeVal').textContent = '50%';
  document.getElementById('tpBorderColor1').value = '#ffffff';
  document.getElementById('tpBorderColor2').value = '#000000';
  document.getElementById('tpCircles').checked = true;
  document.getElementById('tpColorBars').checked = true;
  document.getElementById('tpColorBarsMode').value = 'default';
  document.getElementById('tpColorBarsOpacity').value = 100;
  document.getElementById('tpColorBarsOpacityVal').textContent = '100%';
  document.getElementById('tpCircleSpinMode').value = 'static';
  document.getElementById('tpCircleRevMode').value = 'none';
  document.getElementById('tpCircleSpinSpeed').value = 50;
  document.getElementById('tpCircleSpinSpeedVal').textContent = '50%';
  document.getElementById('tpShowName').checked = true;
  document.getElementById('tpShowPixelSize').checked = true;
  document.getElementById('tpShowAspectRatio').checked = true;
  document.getElementById('tpShowSquareCount').checked = true;
  document.getElementById('tpLogoToggle').checked = false;
  document.getElementById('tpLogoMode').value = 'default';
  document.getElementById('tpLogoStatic').checked = false;
  document.getElementById('tpLogoSize').value = 50;
  document.getElementById('tpLogoSizeVal').textContent = '50%';
  document.getElementById('tpLogoOpacity').value = 100;
  document.getElementById('tpLogoOpacityVal').textContent = '100%';
  document.getElementById('tpLogoFile').value = '';
  document.getElementById('tpSweep').checked = false;
  document.getElementById('tpSweepDuration').value = 5;
  document.getElementById('tpSweepDurationVal').textContent = '5s';
  document.getElementById('tpSweepWidth').value = 2;
  document.getElementById('tpSweepWidthVal').textContent = '2%';
  document.getElementById('tpSweepColor').value = '#ffffff';
  document.getElementById('tpSweepColorV').value = '#ffffff';
  document.getElementById('tpSweepFps').value = '60';
  document.getElementById('tpCheckerOpacity').value = 100;
  document.getElementById('tpCheckerOpacityVal').textContent = '100%';
  document.getElementById('tpBorderOpacity').value = 100;
  document.getElementById('tpBorderOpacityVal').textContent = '100%';
  document.getElementById('tpBgImageToggle').checked = false;
  document.getElementById('tpBgImageFile').value = '';
  document.getElementById('tpProcessorLinesToggle').checked = false;
  document.getElementById('tpProcessorCanvasSize').value = '4K_UHD';
  document.getElementById('tpProcessorCustomW').value = 3840;
  document.getElementById('tpProcessorCustomH').value = 2160;
  document.getElementById('tpProcessorLineColor').value = '#ff0000';
  document.getElementById('tpProcessorCustomSize').style.display = 'none';

  updateTotalSize();
  scheduleTestPatternRedraw();
  _tpUpdateUndoRedoBtns();
}

// --- Layer Panel ---

function _tpBuildLayerList() {
  var list = document.getElementById('tpLayersList');
  if(!list) return;
  list.innerHTML = '';
  // Render in reverse (top layer shown first, like Photoshop)
  for(var i = tpLayerOrder.length - 1; i >= 0; i--) {
    var id = tpLayerOrder[i];
    var layer = _tpLayerRegistry[id];
    if(!layer) continue;
    var item = document.createElement('div');
    item.className = 'tp-layer-item';
    item.setAttribute('data-layer', id);
    item.innerHTML = '<span class="material-symbols-outlined tp-layer-drag">drag_indicator</span>' +
      '<span class="tp-layer-name">' + layer.name + '</span>';
    list.appendChild(item);
  }
}

function _tpInitLayersPanel() {
  var layersBtn = document.getElementById('tpLayersBtn');
  var layersPanel = document.getElementById('tpLayersPanel');
  var hamburgerMenu = document.getElementById('tpHamburgerMenu');
  if(!layersBtn || !layersPanel) return;

  layersBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    _tpBuildLayerList();
    layersPanel.classList.toggle('open');
    if(hamburgerMenu) hamburgerMenu.classList.remove('open');
  });

  document.addEventListener('click', function(e) {
    if(!layersPanel.contains(e.target) && e.target !== layersBtn && !layersBtn.contains(e.target)) {
      layersPanel.classList.remove('open');
    }
  });

  // Drag-and-drop reorder
  var _dragItem = null;
  var _dragList = document.getElementById('tpLayersList');

  _dragList.addEventListener('pointerdown', function(e) {
    var item = e.target.closest('.tp-layer-item');
    if(!item) return;
    e.preventDefault();
    _dragItem = item;
    _dragItem.classList.add('dragging');
    item.setPointerCapture(e.pointerId);
  });

  _dragList.addEventListener('pointermove', function(e) {
    if(!_dragItem) return;
    var items = _dragList.querySelectorAll('.tp-layer-item:not(.dragging)');
    items.forEach(function(el) { el.classList.remove('drag-over'); });
    var target = document.elementFromPoint(e.clientX, e.clientY);
    var targetItem = target ? target.closest('.tp-layer-item:not(.dragging)') : null;
    if(targetItem) targetItem.classList.add('drag-over');
  });

  _dragList.addEventListener('pointerup', function(e) {
    if(!_dragItem) return;
    var items = _dragList.querySelectorAll('.tp-layer-item');
    items.forEach(function(el) { el.classList.remove('drag-over', 'dragging'); });

    var target = document.elementFromPoint(e.clientX, e.clientY);
    var targetItem = target ? target.closest('.tp-layer-item:not(.dragging)') : null;
    if(targetItem && targetItem !== _dragItem) {
      tpSaveState();
      _dragList.insertBefore(_dragItem, targetItem);
      // Rebuild tpLayerOrder from DOM (reversed — list shows top-first)
      var newOrder = [];
      var listItems = _dragList.querySelectorAll('.tp-layer-item');
      for(var i = listItems.length - 1; i >= 0; i--) {
        newOrder.push(listItems[i].getAttribute('data-layer'));
      }
      tpLayerOrder = newOrder;
      scheduleTestPatternRedraw();
    }
    _dragItem = null;
  });
}

// --- Control Binding ---

function initTestPatternControls() {
  if(_tpInitialized) return;
  _tpInitialized = true;

  // Toolbar save/load buttons — same as hamburger menu file save/load
  var liveOutBtn = document.getElementById('tpLiveOutBtn');
  var liveOutPopup = document.getElementById('tpLiveOutPopup');

  liveOutBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleLiveOut();
  });

  document.getElementById('tpLiveOutFull').addEventListener('click', function() {
    liveOutPopup.classList.remove('open');
    _tpOpenFullOutput();
  });

  document.getElementById('tpLiveOutSplit').addEventListener('click', function() {
    liveOutPopup.classList.remove('open');
    _tpOpenSplitOutputs();
  });

  document.addEventListener('click', function(e) {
    if(liveOutPopup && !liveOutPopup.contains(e.target) && e.target !== liveOutBtn && !liveOutBtn.contains(e.target)) {
      liveOutPopup.classList.remove('open');
    }
  });

  document.getElementById('tpQuickSaveBtn').addEventListener('click', function() {
    tpSavePatternFile();
  });

  document.getElementById('tpQuickLoadBtn').addEventListener('click', function() {
    document.getElementById('tpLoadPatternInput').click();
  });

  var nameInput = document.getElementById('tpImageName');
  var dispW = document.getElementById('tpDisplayW');
  var dispH = document.getElementById('tpDisplayH');
  var dispsWide = document.getElementById('tpDisplaysWide');
  var dispsHigh = document.getElementById('tpDisplaysHigh');
  var gridSize = document.getElementById('tpGridSize');
  var gridWidth = document.getElementById('tpGridWidth');
  var gridColor = document.getElementById('tpGridColor');
  var textColor = document.getElementById('tpTextColor');
  var crossColor = document.getElementById('tpCrossColor');
  var circlesToggle = document.getElementById('tpCircles');
  var colorBarsToggle = document.getElementById('tpColorBars');
  var textSize = document.getElementById('tpTextSize');
  var logoToggle = document.getElementById('tpLogoToggle');
  var logoInput = document.getElementById('tpLogoFile');
  var logoSize = document.getElementById('tpLogoSize');
  nameInput.addEventListener('input', function() {
    tpImageName = this.value || 'Name your testpattern';
    scheduleTestPatternRedraw();
  });

  dispW.addEventListener('input', function() {
    tpDisplayW = Math.max(1, parseInt(this.value) || 1920);
    updateTotalSize();
    scheduleDimensionRedraw();
  });

  dispH.addEventListener('input', function() {
    tpDisplayH = Math.max(1, parseInt(this.value) || 1080);
    updateTotalSize();
    scheduleDimensionRedraw();
  });

  dispsWide.addEventListener('change', function() {
    tpDisplaysWide = parseInt(this.value) || 1;
    updateTotalSize();
    scheduleTestPatternRedraw();
  });

  dispsHigh.addEventListener('change', function() {
    tpDisplaysHigh = parseInt(this.value) || 1;
    updateTotalSize();
    scheduleTestPatternRedraw();
  });

  gridSize.addEventListener('input', function() {
    tpGridSizePct = parseInt(this.value);
    document.getElementById('tpGridSizeVal').textContent = this.value + '%';
    scheduleTestPatternRedraw();
  });

  gridWidth.addEventListener('input', function() {
    tpGridWidthPct = parseInt(this.value);
    document.getElementById('tpGridWidthVal').textContent = this.value + '%';
    scheduleTestPatternRedraw();
  });

  gridColor.addEventListener('input', function() {
    tpGridColor = this.value;
    scheduleTestPatternRedraw();
  });

  textColor.addEventListener('input', function() {
    tpTextColor = this.value;
    scheduleTestPatternRedraw();
  });

  crossColor.addEventListener('input', function() {
    tpCrossColor = this.value;
    scheduleTestPatternRedraw();
  });

  var boundaryColor = document.getElementById('tpBoundaryColor');
  boundaryColor.addEventListener('input', function() {
    tpBoundaryColor = this.value;
    scheduleTestPatternRedraw();
  });

  var bgColor = document.getElementById('tpBgColor');
  bgColor.addEventListener('input', function() {
    tpBgColor = this.value;
    scheduleTestPatternRedraw();
  });

  var checkerColor1 = document.getElementById('tpCheckerColor1');
  checkerColor1.addEventListener('input', function() {
    tpCheckerColor1 = this.value;
    scheduleTestPatternRedraw();
  });

  var checkerColor2 = document.getElementById('tpCheckerColor2');
  checkerColor2.addEventListener('input', function() {
    tpCheckerColor2 = this.value;
    scheduleTestPatternRedraw();
  });

  var checkerToggle = document.getElementById('tpChecker');
  checkerToggle.addEventListener('change', function() {
    tpCheckerOn = this.checked;
    scheduleTestPatternRedraw();
  });

  var checkerBorderToggle = document.getElementById('tpCheckerBorder');
  checkerBorderToggle.addEventListener('change', function() {
    tpCheckerBorderOn = this.checked;
    scheduleTestPatternRedraw();
  });

  var borderColor1 = document.getElementById('tpBorderColor1');
  borderColor1.addEventListener('input', function() {
    tpBorderColor1 = this.value;
    scheduleTestPatternRedraw();
  });

  var borderColor2El = document.getElementById('tpBorderColor2');
  borderColor2El.addEventListener('input', function() {
    tpBorderColor2 = this.value;
    scheduleTestPatternRedraw();
  });

  var borderSize = document.getElementById('tpBorderSize');
  borderSize.addEventListener('input', function() {
    tpBorderSizePct = parseInt(this.value);
    document.getElementById('tpBorderSizeVal').textContent = this.value + '%';
    scheduleTestPatternRedraw();
  });

  var checkerSize = document.getElementById('tpCheckerSize');
  checkerSize.addEventListener('input', function() {
    tpCheckerSizePct = parseInt(this.value);
    document.getElementById('tpCheckerSizeVal').textContent = this.value + '%';
    scheduleTestPatternRedraw();
  });

  var checkerOpacity = document.getElementById('tpCheckerOpacity');
  checkerOpacity.addEventListener('input', function() {
    tpCheckerOpacity = parseInt(this.value);
    document.getElementById('tpCheckerOpacityVal').textContent = this.value + '%';
    scheduleTestPatternRedraw();
  });

  var borderOpacity = document.getElementById('tpBorderOpacity');
  borderOpacity.addEventListener('input', function() {
    tpBorderOpacity = parseInt(this.value);
    document.getElementById('tpBorderOpacityVal').textContent = this.value + '%';
    scheduleTestPatternRedraw();
  });

  document.getElementById('tpBgImageToggle').addEventListener('change', function() {
    tpBgImageOn = this.checked;
    scheduleTestPatternRedraw();
  });

  document.getElementById('tpBgImageFile').addEventListener('change', function(e) {
    handleBgImageImport(e);
  });

  // Processor lines
  document.getElementById('tpProcessorLinesToggle').addEventListener('change', function() {
    tpProcessorLinesOn = this.checked;
    scheduleTestPatternRedraw();
  });

  document.getElementById('tpProcessorCanvasSize').addEventListener('change', function() {
    tpProcessorCanvasSize = this.value;
    document.getElementById('tpProcessorCustomSize').style.display =
      this.value === 'custom' ? '' : 'none';
    scheduleTestPatternRedraw();
  });

  document.getElementById('tpProcessorLineColor').addEventListener('input', function() {
    tpProcessorLineColor = this.value;
    scheduleTestPatternRedraw();
  });

  document.getElementById('tpProcessorCustomW').addEventListener('input', function() {
    tpProcessorCanvasW = parseInt(this.value) || 3840;
    scheduleTestPatternRedraw();
  });

  document.getElementById('tpProcessorCustomH').addEventListener('input', function() {
    tpProcessorCanvasH = parseInt(this.value) || 2160;
    scheduleTestPatternRedraw();
  });

  circlesToggle.addEventListener('change', function() {
    tpCirclesOn = this.checked;
    if(!this.checked) {
      if(tpColorBarsMode !== 'default') {
        tpColorBarsMode = 'default';
        document.getElementById('tpColorBarsMode').value = 'default';
      }
      if(tpLogoMode !== 'default') {
        tpLogoMode = 'default';
        document.getElementById('tpLogoMode').value = 'default';
      }
      if(tpCircleSpinMode !== 'static' || tpCircleRevMode !== 'none') {
        tpCircleSpinMode = 'static';
        tpCircleRevMode = 'none';
        document.getElementById('tpCircleSpinMode').value = 'static';
        document.getElementById('tpCircleRevMode').value = 'none';
      }
      _tpUpdateExportBtn();
      _tpRestartAnimationIfNeeded();
    }
    scheduleTestPatternRedraw();
  });

  colorBarsToggle.addEventListener('change', function() {
    tpColorBarsOn = this.checked;
    scheduleTestPatternRedraw();
  });

  var colorBarsMode = document.getElementById('tpColorBarsMode');
  colorBarsMode.addEventListener('change', function() {
    if(!tpCirclesOn && this.value !== 'default') {
      this.value = 'default';
      return;
    }
    tpColorBarsMode = this.value;
    _tpUpdateExportBtn();
    _tpRestartAnimationIfNeeded();
    scheduleTestPatternRedraw();
  });

  var colorBarsOpacity = document.getElementById('tpColorBarsOpacity');
  colorBarsOpacity.addEventListener('input', function() {
    tpColorBarsOpacity = parseInt(this.value);
    document.getElementById('tpColorBarsOpacityVal').textContent = this.value + '%';
    scheduleTestPatternRedraw();
  });

  var circleSpinMode = document.getElementById('tpCircleSpinMode');
  circleSpinMode.addEventListener('change', function() {
    if(!tpCirclesOn && this.value !== 'static') {
      this.value = 'static';
      return;
    }
    tpCircleSpinMode = this.value;
    _tpUpdateExportBtn();
    _tpRestartAnimationIfNeeded();
  });

  var circleRevMode = document.getElementById('tpCircleRevMode');
  circleRevMode.addEventListener('change', function() {
    if(!tpCirclesOn && this.value !== 'none') {
      this.value = 'none';
      return;
    }
    tpCircleRevMode = this.value;
    _tpUpdateExportBtn();
    _tpRestartAnimationIfNeeded();
  });

  var circleSpinSpeed = document.getElementById('tpCircleSpinSpeed');
  circleSpinSpeed.addEventListener('input', function() {
    tpCircleSpinSpeed = parseInt(this.value);
    document.getElementById('tpCircleSpinSpeedVal').textContent = this.value + '%';
  });

  logoToggle.addEventListener('change', function() {
    tpLogoOn = this.checked;
    scheduleTestPatternRedraw();
  });

  document.getElementById('tpShowName').addEventListener('change', function() {
    tpShowName = this.checked;
    scheduleTestPatternRedraw();
  });
  document.getElementById('tpShowPixelSize').addEventListener('change', function() {
    tpShowPixelSize = this.checked;
    scheduleTestPatternRedraw();
  });
  document.getElementById('tpShowAspectRatio').addEventListener('change', function() {
    tpShowAspectRatio = this.checked;
    scheduleTestPatternRedraw();
  });
  document.getElementById('tpShowSquareCount').addEventListener('change', function() {
    tpShowSquareCount = this.checked;
    scheduleTestPatternRedraw();
  });

  textSize.addEventListener('input', function() {
    tpTextSizePct = parseInt(this.value);
    document.getElementById('tpTextSizeVal').textContent = this.value + '%';
    scheduleTestPatternRedraw();
  });

  logoInput.addEventListener('change', function(e) {
    handleLogoImport(e);
  });

  logoSize.addEventListener('input', function() {
    tpLogoSizePct = parseInt(this.value);
    document.getElementById('tpLogoSizeVal').textContent = this.value + '%';
    scheduleTestPatternRedraw();
  });

  var logoOpacity = document.getElementById('tpLogoOpacity');
  logoOpacity.addEventListener('input', function() {
    tpLogoOpacity = parseInt(this.value);
    document.getElementById('tpLogoOpacityVal').textContent = this.value + '%';
    scheduleTestPatternRedraw();
  });

  var logoMode = document.getElementById('tpLogoMode');
  logoMode.addEventListener('change', function() {
    if(!tpCirclesOn && this.value !== 'default') {
      this.value = 'default';
      return;
    }
    tpLogoMode = this.value;
    scheduleTestPatternRedraw();
  });

  var logoStaticToggle = document.getElementById('tpLogoStatic');
  logoStaticToggle.addEventListener('change', function() {
    tpLogoStatic = this.checked;
    scheduleTestPatternRedraw();
  });

  // Hamburger menu
  var hamburgerBtn = document.getElementById('tpHamburgerBtn');
  var hamburgerMenu = document.getElementById('tpHamburgerMenu');

  hamburgerBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    hamburgerMenu.classList.toggle('open');
    // Close layers panel when opening hamburger
    var lp = document.getElementById('tpLayersPanel');
    if(lp) lp.classList.remove('open');
  });

  document.addEventListener('click', function(e) {
    if(!hamburgerMenu.contains(e.target) && e.target !== hamburgerBtn) {
      hamburgerMenu.classList.remove('open');
    }
  });

  // Layers panel
  _tpInitLayersPanel();

  document.getElementById('tpExportPng').addEventListener('click', function() {
    hamburgerMenu.classList.remove('open');
    exportTestPatternPng();
  });

  document.getElementById('tpExportMp4').addEventListener('click', function() {
    hamburgerMenu.classList.remove('open');
    exportTestPatternVideo();
  });

  document.getElementById('tpSavePatternFile').addEventListener('click', function() {
    hamburgerMenu.classList.remove('open');
    tpSavePatternFile();
  });

  document.getElementById('tpLoadPatternFile').addEventListener('click', function() {
    hamburgerMenu.classList.remove('open');
    document.getElementById('tpLoadPatternInput').click();
  });

  document.getElementById('tpLoadPatternInput').addEventListener('change', function(e) {
    tpLoadPatternFile(e);
  });

  document.getElementById('tpResetBtn').addEventListener('click', function() {
    hamburgerMenu.classList.remove('open');
    tpSaveState();
    resetTestPattern();
  });

  // Toolbar buttons: undo, reset, redo, quick share
  document.getElementById('tpUndoBtn').addEventListener('click', function() {
    tpUndo();
  });
  document.getElementById('tpRedoBtn').addEventListener('click', function() {
    tpRedo();
  });
  document.getElementById('tpToolbarResetBtn').addEventListener('click', function() {
    tpSaveState();
    resetTestPattern();
  });

  // Quick share button + popup
  var shareBtn = document.getElementById('tpQuickShareBtn');
  var sharePopup = document.getElementById('tpSharePopup');

  shareBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if(_tpNeedsVideoExport()) {
      sharePopup.classList.toggle('open');
    } else {
      tpQuickSharePng();
    }
  });

  document.addEventListener('click', function(e) {
    if(!sharePopup.contains(e.target) && e.target !== shareBtn) {
      sharePopup.classList.remove('open');
    }
  });

  document.getElementById('tpSharePng').addEventListener('click', function() {
    sharePopup.classList.remove('open');
    tpQuickSharePng();
  });

  document.getElementById('tpShareMp4').addEventListener('click', function() {
    sharePopup.classList.remove('open');
    _tpForceShare = true;
    exportTestPatternVideo();
  });

  // Total size inputs — back-calculate display size
  var totalWInput = document.getElementById('tpTotalW');
  var totalHInput = document.getElementById('tpTotalH');

  totalWInput.addEventListener('input', function() {
    var val = Math.max(1, parseInt(this.value) || 1);
    tpDisplayW = Math.round(val / tpDisplaysWide);
    dispW.value = tpDisplayW;
    scheduleDimensionRedraw();
  });

  totalHInput.addEventListener('input', function() {
    var val = Math.max(1, parseInt(this.value) || 1);
    tpDisplayH = Math.round(val / tpDisplaysHigh);
    dispH.value = tpDisplayH;
    scheduleDimensionRedraw();
  });

  // Sweep controls
  var sweepToggle = document.getElementById('tpSweep');
  var sweepDuration = document.getElementById('tpSweepDuration');
  var sweepWidth = document.getElementById('tpSweepWidth');
  var sweepColor = document.getElementById('tpSweepColor');

  sweepToggle.addEventListener('change', function() {
    tpSweepOn = this.checked;
    _tpUpdateExportBtn();
    if(tpSweepOn) {
      startSweepPreview();
    } else {
      stopSweepPreview();
      scheduleTestPatternRedraw();
    }
  });

  sweepDuration.addEventListener('input', function() {
    tpSweepDuration = parseInt(this.value) || 5;
    document.getElementById('tpSweepDurationVal').textContent = this.value + 's';
  });

  sweepWidth.addEventListener('input', function() {
    tpSweepWidthPct = parseFloat(this.value) || 2;
    var v = parseFloat(this.value);
    document.getElementById('tpSweepWidthVal').textContent = (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + '%';
  });

  sweepColor.addEventListener('input', function() {
    tpSweepColor = this.value;
  });

  var sweepColorV = document.getElementById('tpSweepColorV');
  sweepColorV.addEventListener('input', function() {
    tpSweepColorV = this.value;
  });

  document.getElementById('tpSweepFps').addEventListener('change', function() {
    tpSweepFps = parseFloat(this.value) || 60;
  });

  // --- Save undo state before user interactions ---
  // Text/number inputs: save on focus (once when user clicks in)
  var _tpTextInputIds = ['tpImageName', 'tpDisplayW', 'tpDisplayH', 'tpTotalW', 'tpTotalH',
    'tpProcessorCustomW', 'tpProcessorCustomH'];
  _tpTextInputIds.forEach(function(id) {
    var el = document.getElementById(id);
    if(el) el.addEventListener('focus', function() { tpSaveState(); });
  });

  // Range sliders: save on pointerdown (once when user starts dragging)
  var _tpSliderIds = ['tpGridSize', 'tpGridWidth', 'tpTextSize', 'tpColorBarsOpacity',
    'tpLogoSize', 'tpLogoOpacity', 'tpSweepDuration', 'tpSweepWidth',
    'tpCheckerSize', 'tpBorderSize', 'tpCircleSpinSpeed',
    'tpCheckerOpacity', 'tpBorderOpacity'];
  _tpSliderIds.forEach(function(id) {
    var el = document.getElementById(id);
    if(el) el.addEventListener('pointerdown', function() { tpSaveState(); });
  });

  // Color pickers: save when opened
  var _tpColorIds = ['tpGridColor', 'tpTextColor', 'tpCrossColor', 'tpBoundaryColor',
    'tpBgColor', 'tpSweepColor', 'tpSweepColorV', 'tpCheckerColor1', 'tpCheckerColor2',
    'tpBorderColor1', 'tpBorderColor2', 'tpProcessorLineColor'];
  _tpColorIds.forEach(function(id) {
    var el = document.getElementById(id);
    if(el) el.addEventListener('click', function() { tpSaveState(); });
  });

  // Checkboxes & selects: save on change (fires once per interaction)
  var _tpToggleIds = ['tpCircles', 'tpColorBars', 'tpChecker', 'tpCheckerBorder',
    'tpShowName', 'tpShowPixelSize', 'tpShowAspectRatio', 'tpShowSquareCount',
    'tpLogoToggle', 'tpLogoStatic', 'tpSweep', 'tpBgImageToggle', 'tpProcessorLinesToggle'];
  _tpToggleIds.forEach(function(id) {
    var el = document.getElementById(id);
    if(el) el.addEventListener('change', function() { tpSaveState(); }, true);
  });

  var _tpSelectIds = ['tpColorBarsMode', 'tpCircleSpinMode', 'tpCircleRevMode',
    'tpLogoMode', 'tpDisplaysWide', 'tpDisplaysHigh', 'tpSweepFps', 'tpProcessorCanvasSize'];
  _tpSelectIds.forEach(function(id) {
    var el = document.getElementById(id);
    if(el) el.addEventListener('focus', function() { tpSaveState(); });
  });
}

function updateTotalSize() {
  var totalW = tpDisplayW * tpDisplaysWide;
  var totalH = tpDisplayH * tpDisplaysHigh;
  var totalWEl = document.getElementById('tpTotalW');
  var totalHEl = document.getElementById('tpTotalH');
  if(totalWEl) totalWEl.value = totalW;
  if(totalHEl) totalHEl.value = totalH;
}

// --- Logo Import ---

function handleLogoImport(event) {
  var file = event.target.files[0];
  if(!file) return;

  if(!file.type.startsWith('image/')) {
    showAlert('Please select an image file (PNG, JPG, etc.).');
    event.target.value = '';
    return;
  }

  if(file.size > 10 * 1024 * 1024) {
    showAlert('Logo file is too large (max 10MB).');
    event.target.value = '';
    return;
  }

  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      tpLogoImage = img;
      scheduleTestPatternRedraw();
    };
    img.onerror = function() {
      showAlert('Failed to load logo image.');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function handleBgImageImport(event) {
  var file = event.target.files[0];
  if(!file) return;

  if(!file.type.startsWith('image/')) {
    showAlert('Please select an image file (PNG, JPG, etc.).');
    event.target.value = '';
    return;
  }

  if(file.size > 20 * 1024 * 1024) {
    showAlert('Background image is too large (max 20MB).');
    event.target.value = '';
    return;
  }

  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      tpBgImage = img;
      tpBgImageOn = true;
      document.getElementById('tpBgImageToggle').checked = true;
      scheduleTestPatternRedraw();
    };
    img.onerror = function() {
      showAlert('Failed to load background image.');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// --- Redraw Scheduling ---

function scheduleTestPatternRedraw() {
  if(_tpRafId) cancelAnimationFrame(_tpRafId);
  _tpRafId = requestAnimationFrame(function() {
    _tpRafId = null;
    renderTestPattern();
    _tpCopyToLiveOut();
  });
}

var _tpDimensionTimer = null;
function scheduleDimensionRedraw() {
  if(_tpDimensionTimer) clearTimeout(_tpDimensionTimer);
  _tpDimensionTimer = setTimeout(function() {
    _tpDimensionTimer = null;
    scheduleTestPatternRedraw();
  }, 400);
}

// --- Master Render ---

function renderTestPattern(forExport, targetCanvas) {
  var canvas = targetCanvas || document.getElementById('tpCanvas');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');

  var totalW = tpDisplayW * tpDisplaysWide;
  var totalH = tpDisplayH * tpDisplaysHigh;

  // For preview: cap resolution so grid lines don't alias away when downscaled
  // For export: use full resolution
  if(forExport) {
    canvas.width = totalW;
    canvas.height = totalH;
  } else {
    var maxPreviewW = 1920;
    var previewScale = Math.min(1, maxPreviewW / totalW);
    canvas.width = Math.round(totalW * previewScale);
    canvas.height = Math.round(totalH * previewScale);
    ctx.scale(previewScale, previewScale);
  }

  // 1. Background (fixed — always first)
  drawTPBackground(ctx, totalW, totalH);

  // 2. Reorderable layers
  var gridSpacing = calcGridSpacing(totalW, totalH);
  for(var i = 0; i < tpLayerOrder.length; i++) {
    var layer = _tpLayerRegistry[tpLayerOrder[i]];
    if(layer) layer.draw(ctx, totalW, totalH, gridSpacing);
  }

  // 3. Fixed top layers (always last)
  if(tpGridSizePct > 0) {
    drawTPCoordinateLabels(ctx, totalW, totalH, gridSpacing);
  }
  drawTPCenterText(ctx, totalW, totalH, gridSpacing);
}

// --- Background Drawing ---

function drawTPBackground(ctx, w, h) {
  ctx.fillStyle = tpBgColor;
  ctx.fillRect(0, 0, w, h);
}

function drawTPCheckerBorder(ctx, w, h) {
  // Rectangular checkers (2:1), size controlled by slider
  var minH = Math.max(6, Math.round(Math.min(w, h) / 60));
  var maxH = Math.round(Math.min(w, h) / 10);
  var cellH = Math.round(minH + (tpBorderSizePct / 100) * (maxH - minH));
  var cellW = cellH * 2;

  // Top edge — horizontal rectangles
  for (var x = 0; x < w; x += cellW) {
    ctx.fillStyle = (Math.floor(x / cellW)) % 2 === 0 ? tpBorderColor1 : tpBorderColor2;
    ctx.fillRect(x, 0, Math.min(cellW, w - x), cellH);
  }
  // Bottom edge — horizontal rectangles
  for (var x = 0; x < w; x += cellW) {
    ctx.fillStyle = (Math.floor(x / cellW) + 1) % 2 === 0 ? tpBorderColor1 : tpBorderColor2;
    ctx.fillRect(x, h - cellH, Math.min(cellW, w - x), cellH);
  }
  // Left edge — vertical rectangles (rotated 90°: cellH wide × cellW tall)
  var innerTop = cellH;
  var innerBottom = h - cellH;
  for (var y = innerTop; y < innerBottom; y += cellW) {
    var idx = Math.floor((y - innerTop) / cellW);
    ctx.fillStyle = (idx + 1) % 2 === 0 ? tpBorderColor1 : tpBorderColor2;
    ctx.fillRect(0, y, cellH, Math.min(cellW, innerBottom - y));
  }
  // Right edge — vertical rectangles (rotated 90°: cellH wide × cellW tall)
  for (var y = innerTop; y < innerBottom; y += cellW) {
    var idx = Math.floor((y - innerTop) / cellW);
    ctx.fillStyle = (idx) % 2 === 0 ? tpBorderColor1 : tpBorderColor2;
    ctx.fillRect(w - cellH, y, cellH, Math.min(cellW, innerBottom - y));
  }
}

// --- Grid Calculation ---

function calcGridSpacing(w, h) {
  // Map 0-100% to grid divisions: more % = finer grid
  var divisions = 4 + (tpGridSizePct / 100) * 46; // 4 to 50 divisions
  var spacingX = Math.max(20, Math.round(w / divisions));
  var spacingY = spacingX; // Square grid cells
  return { x: spacingX, y: spacingY };
}

function calcLineWidth(w) {
  var t = tpGridWidthPct / 100;
  var base = 1 + Math.pow(t, 1.5) * 7; // 1 to 8 px at 1920, power curve for visible upper range
  var scale = Math.max(1, w / 1920);
  return Math.round(base * scale);
}

// --- Drawing Sub-functions ---

function drawTPGrid(ctx, w, h, spacing) {
  var lw = calcLineWidth(w);
  ctx.strokeStyle = tpGridColor;
  ctx.lineWidth = lw;
  ctx.globalAlpha = 1.0;

  // Half-pixel offset for odd line widths keeps lines crisp
  var offset = (lw % 2 === 1) ? 0.5 : 0;

  // Vertical lines
  for(var x = spacing.x; x < w; x += spacing.x) {
    var px = Math.round(x) + offset;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
  }

  // Horizontal lines
  for(var y = spacing.y; y < h; y += spacing.y) {
    var py = Math.round(y) + offset;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();
  }
}

function drawTPDisplayBoundaries(ctx, w, h) {
  ctx.strokeStyle = tpBoundaryColor;
  ctx.lineWidth = Math.max(2, Math.round(w / 400));
  ctx.setLineDash([]);

  // Vertical display boundaries
  for(var i = 1; i < tpDisplaysWide; i++) {
    var x = i * tpDisplayW;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Horizontal display boundaries
  for(var j = 1; j < tpDisplaysHigh; j++) {
    var y = j * tpDisplayH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawTPProcessorLines(ctx, w, h) {
  // Resolve canvas dimensions from preset
  var cw = tpProcessorCanvasW;
  var ch = tpProcessorCanvasH;
  if(tpProcessorCanvasSize === '4K_UHD') { cw = 3840; ch = 2160; }
  else if(tpProcessorCanvasSize === '4K_DCI') { cw = 4096; ch = 2160; }
  else if(tpProcessorCanvasSize === 'HD') { cw = 1920; ch = 1080; }

  // No lines needed if wall fits within one canvas
  if(cw >= w && ch >= h) return;

  // Line styling — solid, bright
  // Compensate for preview scaling so line is always at least 2 visible pixels
  var scale = ctx.canvas.width / w;
  ctx.strokeStyle = tpProcessorLineColor;
  ctx.lineWidth = Math.max(2, Math.ceil(2 / scale));
  ctx.setLineDash([]);

  // Vertical processor boundaries
  if(cw < w) {
    if(tpDisplaysWide > 1) {
      // Multiple displays: snap to display boundaries
      var displaysPerCanvasW = Math.max(1, Math.floor(cw / tpDisplayW));
      for(var i = displaysPerCanvasW; i < tpDisplaysWide; i += displaysPerCanvasW) {
        var x = i * tpDisplayW;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    } else {
      // Single display: draw at raw canvas pixel intervals
      for(var x = cw; x < w; x += cw) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }
  }

  // Horizontal processor boundaries
  if(ch < h) {
    if(tpDisplaysHigh > 1) {
      var displaysPerCanvasH = Math.max(1, Math.floor(ch / tpDisplayH));
      for(var j = displaysPerCanvasH; j < tpDisplaysHigh; j += displaysPerCanvasH) {
        var y = j * tpDisplayH;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else {
      for(var y = ch; y < h; y += ch) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }
  }

  ctx.setLineDash([]);
}

function drawTPCircles(ctx, w, h) {
  ctx.strokeStyle = tpTextColor;
  ctx.lineWidth = Math.max(2, Math.round(w / 480));
  ctx.globalAlpha = 0.5;

  // 1 big circle centered, inscribed to touch top and bottom edges
  var centerX = w / 2;
  var centerY = h / 2;
  var bigRadius = h / 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, bigRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 4 small circles in corners — inset so mostly visible, slightly clipped by edges
  var smallRadius = Math.min(w, h) * 0.15;
  var inset = smallRadius * 0.95;
  var corners = [
    [inset, inset],              // top-left
    [w - inset, inset],          // top-right
    [inset, h - inset],          // bottom-left
    [w - inset, h - inset]       // bottom-right
  ];

  for(var i = 0; i < corners.length; i++) {
    ctx.beginPath();
    ctx.arc(corners[i][0], corners[i][1], smallRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1.0;
}

function drawTPCoordinateLabels(ctx, w, h, spacing) {
  var fontSize = Math.max(12, Math.round(spacing.x / 3));
  ctx.font = 'bold ' + fontSize + 'px "Roboto Condensed", sans-serif';
  ctx.fillStyle = tpTextColor;
  ctx.globalAlpha = 0.8;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  var centerX = w / 2;
  var centerY = h / 2;
  var cols = Math.floor(w / spacing.x);
  var rows = Math.floor(h / spacing.y);

  // Numbers along top and bottom — centered between grid lines
  for(var col = 0; col < cols; col++) {
    var labelX = col * spacing.x + spacing.x / 2;
    // Number from center: negative left, positive right, skip 0
    var colFromCenter = col - Math.floor(cols / 2);
    if(cols % 2 === 0 && colFromCenter >= 0) colFromCenter++;
    if(colFromCenter === 0) continue;

    ctx.textBaseline = 'top';
    ctx.fillText(colFromCenter, labelX, 4);
    ctx.textBaseline = 'bottom';
    ctx.fillText(colFromCenter, labelX, h - 4);
  }

  // Letters along left and right — centered between grid lines
  ctx.textBaseline = 'middle';
  for(var row = 0; row < rows; row++) {
    var labelY = row * spacing.y + spacing.y / 2;
    var rowFromCenter = row - Math.floor(rows / 2);
    if(rows % 2 === 0 && rowFromCenter >= 0) rowFromCenter++;
    if(rowFromCenter === 0) continue;

    var letterLabel;
    if(rowFromCenter < 0) {
      var idx = Math.abs(rowFromCenter) - 1;
      letterLabel = idx < 26 ? String.fromCharCode(65 + idx) : (idx + 1).toString();
    } else {
      var idx = rowFromCenter - 1;
      letterLabel = idx < 26 ? String.fromCharCode(97 + idx) : (idx + 1).toString();
    }

    ctx.textAlign = 'left';
    ctx.fillText(letterLabel, 8, labelY);
    ctx.textAlign = 'right';
    ctx.fillText(letterLabel, w - 8, labelY);
  }

  ctx.globalAlpha = 1.0;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawTPCrosshair(ctx, w, h) {
  var cx = w / 2;
  var cy = h / 2;

  ctx.strokeStyle = tpCrossColor;
  ctx.lineWidth = Math.max(2, Math.round(w / 500));
  ctx.globalAlpha = 1.0;

  // Vertical center line
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, h);
  ctx.stroke();

  // Horizontal center line
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(w, cy);
  ctx.stroke();
}

function drawTPCenterText(ctx, w, h, spacing) {
  var totalW = w;
  var totalH = h;
  var cx = w / 2;

  // Font sizes scaled to canvas, adjustable via text size slider (0.3x to 2x)
  var textScale = 0.3 + (tpTextSizePct / 100) * 1.7;
  var nameFontSize = Math.max(12, Math.round((w / 40) * textScale));
  var infoFontSize = Math.max(10, Math.round((w / 70) * textScale));
  var lineHeight = infoFontSize * 1.5;

  // Compute text lines
  var aspectObj = approxAspectRatio(totalW, totalH);
  var aspectValue = aspectObj.value.toFixed(2);
  var gridColCount = Math.floor(w / spacing.x);
  var gridRowCount = Math.floor(h / spacing.y);

  var lines = [];
  if(tpShowName) lines.push({ text: tpImageName, font: 'bold ' + nameFontSize + 'px "Roboto Condensed", sans-serif', size: nameFontSize, isName: true });
  if(tpShowPixelSize) lines.push({ text: totalW + 'px x ' + totalH + 'px', font: infoFontSize + 'px "Roboto Condensed", sans-serif', size: infoFontSize });
  if(tpShowAspectRatio) lines.push({ text: aspectValue + ':1', font: infoFontSize + 'px "Roboto Condensed", sans-serif', size: infoFontSize });
  if(tpShowSquareCount) lines.push({ text: gridColCount + ' x ' + gridRowCount + ' full squares', font: infoFontSize + 'px "Roboto Condensed", sans-serif', size: infoFontSize });

  if(lines.length === 0) return;

  // Calculate bounding box
  var totalTextHeight = 0;
  var maxTextWidth = 0;
  for(var i = 0; i < lines.length; i++) {
    ctx.font = lines[i].font;
    var tw = ctx.measureText(lines[i].text).width;
    if(tw > maxTextWidth) maxTextWidth = tw;
    totalTextHeight += lines[i].size;
    if(i > 0) totalTextHeight += lineHeight - infoFontSize;
    if(i === 0 && lines[i].isName && lines.length > 1) totalTextHeight += lineHeight * 0.2;
  }

  // Position — bottom edge sits just above center line, clamped to stay on screen
  var padX = Math.round(w / 40);
  var padY = Math.round(h / 60);
  var gap = Math.round(h / 80);
  var bgH = totalTextHeight + padY * 2;
  var bgY = Math.max(10, (h / 2) - gap - bgH);
  var bgX = cx - maxTextWidth / 2 - padX;
  var bgW = maxTextWidth + padX * 2;

  // Draw text lines with drop shadow
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  var shadowOff = Math.max(2, Math.round(w / 600));

  // Shadow pass
  var startY = bgY + padY + lines[0].size / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  for(var i = 0; i < lines.length; i++) {
    ctx.font = lines[i].font;
    ctx.fillText(lines[i].text, cx + shadowOff, startY + shadowOff);
    if(lines[i].isName && i < lines.length - 1) {
      startY += lineHeight * 1.2;
    } else {
      startY += lineHeight;
    }
  }

  // Text pass
  startY = bgY + padY + lines[0].size / 2;
  ctx.fillStyle = tpTextColor;
  for(var i = 0; i < lines.length; i++) {
    ctx.font = lines[i].font;
    ctx.fillText(lines[i].text, cx, startY);
    if(lines[i].isName && i < lines.length - 1) {
      startY += lineHeight * 1.2;
    } else {
      startY += lineHeight;
    }
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Draw SMPTE color bars into a given rectangle
function drawTPColorBarsAt(ctx, barsX, barsTop, totalBarsW, totalBarsH) {
  var barW = totalBarsW / 7;

  // Row 1: Main 75% SMPTE color bars (tallest — 70% of total height)
  var row1H = totalBarsH * 0.70;
  var row1Colors = ['#BFBFBF', '#BFBF00', '#00BFBF', '#00BF00', '#BF00BF', '#BF0000', '#0000BF'];
  for(var i = 0; i < row1Colors.length; i++) {
    ctx.fillStyle = row1Colors[i];
    ctx.fillRect(Math.floor(barsX + i * barW), Math.floor(barsTop), Math.ceil(barW), Math.ceil(row1H));
  }

  // Row 2: Reverse castellations (thin — 9% of total height)
  var row2Y = barsTop + row1H;
  var row2H = totalBarsH * 0.09;
  var row2Colors = ['#0000BF', '#131313', '#BF00BF', '#131313', '#00BFBF', '#131313', '#BFBFBF'];
  for(var i = 0; i < row2Colors.length; i++) {
    ctx.fillStyle = row2Colors[i];
    ctx.fillRect(Math.floor(barsX + i * barW), Math.floor(row2Y), Math.ceil(barW), Math.ceil(row2H));
  }

  // Row 3: PLUGE pattern (bottom — 21% of total height)
  var row3Y = row2Y + row2H;
  var row3H = totalBarsH * 0.21;

  // Left 4/7: -I, White, +Q
  var leftW = barW * 4;
  var subW = leftW / 3;
  ctx.fillStyle = '#00214C';
  ctx.fillRect(Math.floor(barsX), Math.floor(row3Y), Math.ceil(subW), Math.ceil(row3H));
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(Math.floor(barsX + subW), Math.floor(row3Y), Math.ceil(subW), Math.ceil(row3H));
  ctx.fillStyle = '#320064';
  ctx.fillRect(Math.floor(barsX + subW * 2), Math.floor(row3Y), Math.ceil(subW), Math.ceil(row3H));

  // Right 3/7: PLUGE (super black, black, light black, black)
  var rightX = barsX + leftW;
  var rightW = totalBarsW - leftW;
  var plugeW = rightW / 4;
  ctx.fillStyle = '#000000';
  ctx.fillRect(Math.floor(rightX), Math.floor(row3Y), Math.ceil(plugeW), Math.ceil(row3H));
  ctx.fillStyle = '#0D0D0D';
  ctx.fillRect(Math.floor(rightX + plugeW), Math.floor(row3Y), Math.ceil(plugeW), Math.ceil(row3H));
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(Math.floor(rightX + plugeW * 2), Math.floor(row3Y), Math.ceil(plugeW), Math.ceil(row3H));
  ctx.fillStyle = '#0D0D0D';
  ctx.fillRect(Math.floor(rightX + plugeW * 3), Math.floor(row3Y), Math.ceil(plugeW), Math.ceil(row3H));
}

// Draw SMPTE color bars clipped inside a circle
function drawTPColorBarsInCircle(ctx, cx, cy, radius, angle) {
  ctx.save();
  if(angle) {
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
  }
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  var d = radius * 2;
  var left = cx - radius;
  var top = cy - radius;
  var barW = d / 7;

  // Rows fill 100% of diameter — circle clip handles the curved edges
  // Row 1: B&W checker strip (8%)
  var r1H = d * 0.08;
  var checkW = d / 14;
  for(var i = 0; i < 14; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#000000';
    ctx.fillRect(Math.floor(left + i * checkW), Math.floor(top), Math.ceil(checkW), Math.ceil(r1H));
  }

  // Row 2: Main SMPTE color bars (35%)
  var r2Y = top + r1H;
  var r2H = d * 0.35;
  var barColors = ['#BFBFBF', '#BFBF00', '#00BFBF', '#00BF00', '#BF00BF', '#BF0000', '#0000BF'];
  for(var i = 0; i < barColors.length; i++) {
    ctx.fillStyle = barColors[i];
    ctx.fillRect(Math.floor(left + i * barW), Math.floor(r2Y), Math.ceil(barW), Math.ceil(r2H));
  }

  // Row 3: Reverse castellations (5%)
  var r3Y = r2Y + r2H;
  var r3H = d * 0.05;
  var castColors = ['#0000BF', '#131313', '#BF00BF', '#131313', '#00BFBF', '#131313', '#BFBFBF'];
  for(var i = 0; i < castColors.length; i++) {
    ctx.fillStyle = castColors[i];
    ctx.fillRect(Math.floor(left + i * barW), Math.floor(r3Y), Math.ceil(barW), Math.ceil(r3H));
  }

  // Row 4: Horizontal grayscale gradient black→white (10%)
  var r4Y = r3Y + r3H;
  var r4H = d * 0.10;
  var grad1 = ctx.createLinearGradient(left, 0, left + d, 0);
  grad1.addColorStop(0, '#000000');
  grad1.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = grad1;
  ctx.fillRect(Math.floor(left), Math.floor(r4Y), Math.ceil(d), Math.ceil(r4H));

  // Row 5: Single-color orange gradient dark→bright (8%)
  var r5Y = r4Y + r4H;
  var r5H = d * 0.08;
  var grad2 = ctx.createLinearGradient(left, 0, left + d, 0);
  grad2.addColorStop(0, '#1A0A00');
  grad2.addColorStop(0.5, '#FF8000');
  grad2.addColorStop(1, '#FFD699');
  ctx.fillStyle = grad2;
  ctx.fillRect(Math.floor(left), Math.floor(r5Y), Math.ceil(d), Math.ceil(r5H));

  // Row 6: White-Black-White blocks (12%)
  var r6Y = r5Y + r5H;
  var r6H = d * 0.12;
  var sideW = d * 0.2;
  var centerW = d - sideW * 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(Math.floor(left), Math.floor(r6Y), Math.ceil(sideW), Math.ceil(r6H));
  ctx.fillStyle = '#000000';
  ctx.fillRect(Math.floor(left + sideW), Math.floor(r6Y), Math.ceil(centerW), Math.ceil(r6H));
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(Math.floor(left + sideW + centerW), Math.floor(r6Y), Math.ceil(sideW), Math.ceil(r6H));

  // Row 7: Fine gray scale steps white→black (12%)
  var r7Y = r6Y + r6H;
  var r7H = d * 0.12;
  var numSteps = 20;
  var stepW = d / numSteps;
  for(var i = 0; i < numSteps; i++) {
    var val = Math.round(255 - (i / (numSteps - 1)) * 255);
    ctx.fillStyle = 'rgb(' + val + ',' + val + ',' + val + ')';
    ctx.fillRect(Math.floor(left + i * stepW), Math.floor(r7Y), Math.ceil(stepW), Math.ceil(r7H));
  }

  // Row 8: Gray scale stepped blocks (10%)
  var r8Y = r7Y + r7H;
  var r8H = d * 0.10;
  var grayColors = ['#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080', '#999999', '#B3B3B3'];
  for(var i = 0; i < grayColors.length; i++) {
    ctx.fillStyle = grayColors[i];
    ctx.fillRect(Math.floor(left + i * barW), Math.floor(r8Y), Math.ceil(barW), Math.ceil(r8H));
  }

  ctx.restore();
}

function drawTPColorBars(ctx, w, h) {
  if(tpColorBarsMode === 'default') {
    // Original centered positioning
    var barsTop = h * 0.54;
    var totalBarsW = w * 0.5;
    var barsX = (w - totalBarsW) / 2;
    var totalBarsH = h * 0.17;
    drawTPColorBarsAt(ctx, barsX, barsTop, totalBarsW, totalBarsH);
  } else {
    // Circle positions must match drawTPCircles exactly
    var centerX = w / 2;
    var centerY = h / 2;
    var bigRadius = h / 2;
    var smallRadius = Math.min(w, h) * 0.15;
    var inset = smallRadius * 0.95;
    var corners = [
      [inset, inset],
      [w - inset, inset],
      [inset, h - inset],
      [w - inset, h - inset]
    ];

    // Determine per-circle direction: reverse overrides forward
    var centerDir = 0;
    if(tpCircleSpinMode === 'center' || tpCircleSpinMode === 'all') centerDir = 1;
    if(tpCircleRevMode === 'center' || tpCircleRevMode === 'all') centerDir = -1;
    var cornerDir = 0;
    if(tpCircleSpinMode === 'corners' || tpCircleSpinMode === 'all') cornerDir = 1;
    if(tpCircleRevMode === 'corners' || tpCircleRevMode === 'all') cornerDir = -1;

    var centerAngle = centerDir * _tpCircleAngle;
    var cornerAngle = cornerDir * _tpCircleAngle;

    if(tpColorBarsMode === 'corners-spin') {
      // Default bar + spinning corners
      var barsTop = h * 0.54;
      var totalBarsW = w * 0.5;
      var barsX = (w - totalBarsW) / 2;
      var totalBarsH = h * 0.17;
      drawTPColorBarsAt(ctx, barsX, barsTop, totalBarsW, totalBarsH);
      for(var i = 0; i < corners.length; i++) {
        drawTPColorBarsInCircle(ctx, corners[i][0], corners[i][1], smallRadius, _tpCircleAngle);
      }
    } else {
      if(tpColorBarsMode === 'center' || tpColorBarsMode === 'all') {
        drawTPColorBarsInCircle(ctx, centerX, centerY, bigRadius, centerAngle);
      }
      if(tpColorBarsMode === 'corners' || tpColorBarsMode === 'all') {
        for(var i = 0; i < corners.length; i++) {
          drawTPColorBarsInCircle(ctx, corners[i][0], corners[i][1], smallRadius, cornerAngle);
        }
      }
    }
  }
}

function drawTPLogoInCircle(ctx, cx, cy, radius, angle) {
  if(!tpLogoImage) return;
  ctx.save();
  if(angle) {
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
  }
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  var d = radius * 2;
  var scale = 0.1 + (tpLogoSizePct / 100) * 0.8; // 10% to 90% of diameter
  var logoH = d * scale;
  var logoW = logoH * (tpLogoImage.width / tpLogoImage.height);
  // If wider than diameter, fit by width instead
  if(logoW > d * scale) {
    logoW = d * scale;
    logoH = logoW * (tpLogoImage.height / tpLogoImage.width);
  }
  var lx = cx - logoW / 2;
  var ly = cy - logoH / 2;
  ctx.drawImage(tpLogoImage, lx, ly, logoW, logoH);
  ctx.restore();
}

function drawTPLogo(ctx, w, h) {
  if(!tpLogoImage) return;

  if(tpLogoMode === 'default') {
    var minDim = Math.min(w, h);
    var scale = 0.05 + (tpLogoSizePct / 100) * 0.45; // 5% to 50% of smaller dimension
    var logoH = minDim * scale;
    var logoW = logoH * (tpLogoImage.width / tpLogoImage.height);

    // Bottom-right corner with padding
    var pad = Math.round(Math.min(w, h) * 0.03);
    var lx = w - logoW - pad;
    var ly = h - logoH - pad;

    ctx.drawImage(tpLogoImage, lx, ly, logoW, logoH);
  } else {
    // Circle positions must match drawTPCircles exactly
    var centerX = w / 2;
    var centerY = h / 2;
    var bigRadius = h / 2;
    var smallRadius = Math.min(w, h) * 0.15;
    var inset = smallRadius * 0.95;
    var corners = [
      [inset, inset],
      [w - inset, inset],
      [inset, h - inset],
      [w - inset, h - inset]
    ];

    // Determine per-circle spin angle (same logic as color bars)
    var centerDir = 0;
    if(tpCircleSpinMode === 'center' || tpCircleSpinMode === 'all') centerDir = 1;
    if(tpCircleRevMode === 'center' || tpCircleRevMode === 'all') centerDir = -1;
    var cornerDir = 0;
    if(tpCircleSpinMode === 'corners' || tpCircleSpinMode === 'all') cornerDir = 1;
    if(tpCircleRevMode === 'corners' || tpCircleRevMode === 'all') cornerDir = -1;

    var centerAngle = tpLogoStatic ? 0 : centerDir * _tpCircleAngle;
    var cornerAngle = tpLogoStatic ? 0 : cornerDir * _tpCircleAngle;

    if(tpLogoMode === 'center' || tpLogoMode === 'all') {
      drawTPLogoInCircle(ctx, centerX, centerY, bigRadius, centerAngle);
    }
    if(tpLogoMode === 'corners' || tpLogoMode === 'all') {
      for(var i = 0; i < corners.length; i++) {
        drawTPLogoInCircle(ctx, corners[i][0], corners[i][1], smallRadius, cornerAngle);
      }
    }
  }
}

// --- Export Button State ---

function _tpNeedsAnimation() {
  return tpCircleSpinMode !== 'static' || tpCircleRevMode !== 'none' || tpColorBarsMode === 'corners-spin';
}

function _tpNeedsVideoExport() {
  return tpSweepOn || _tpNeedsAnimation();
}

function _tpUpdateExportBtn() {
  // No-op: hamburger menu always shows both Export PNG and Export MP4
}

// --- Native Share ---

function _tpNativeShare(blob, filename, mimeType) {
  var file = new File([blob], filename, { type: mimeType });
  if(navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file] }).catch(function() {});
    return;
  }
  // Fallback: download
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(function() { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
}

function tpQuickSharePng() {
  renderTestPattern(true);
  var canvas = document.getElementById('tpCanvas');
  if(!canvas || canvas.width === 0) { showAlert('No test pattern to export.'); return; }
  var totalW = canvas.width, totalH = canvas.height;
  var safeName = tpImageName.replace(/[<>:"/\\|?*]/g, '_').trim() || 'testpattern';
  var filename = safeName + '_' + totalW + 'x' + totalH + '.png';
  canvas.toBlob(function(blob) {
    if(!blob) { showAlert('Failed to create image.'); return; }
    _tpNativeShare(blob, filename, 'image/png');
  }, 'image/png');
  renderTestPattern(false);
}

// --- PNG Export ---

function exportTestPatternPng() {
  // Render at full resolution for export
  renderTestPattern(true);

  var canvas = document.getElementById('tpCanvas');
  if(!canvas || canvas.width === 0) {
    showAlert('No test pattern to export.');
    return;
  }

  var totalW = canvas.width;
  var totalH = canvas.height;

  // Large canvas warning
  if(totalW * totalH > 67108864) {
    showAlert('Warning: Very large image (' + totalW + 'x' + totalH + '). Export may be slow or fail on some devices.');
  }

  var safeName = tpImageName.replace(/[<>:"/\\|?*]/g, '_').trim() || 'testpattern';
  var filename = safeName + '_' + totalW + 'x' + totalH + '.png';

  canvas.toBlob(function(blob) {
    if(!blob) {
      showAlert('Failed to create image. Please try again.');
      return;
    }

    // Mobile: use share API
    var isMobileDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
                         (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    if(isMobileDevice && navigator.canShare) {
      var file = new File([blob], filename, { type: 'image/png' });
      if(navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file] }).catch(function() {});
        return;
      }
    }

    // Desktop: download link
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

  // Restore preview resolution
  renderTestPattern(false);
}

// --- Sweep Drawing ---

function drawTPSweep(ctx, w, h, t) {
  var diag = Math.sqrt(w * w + h * h);
  var bandWidth = diag * (tpSweepWidthPct / 100);
  var tailLength = bandWidth * 2;
  var totalSpan = bandWidth + tailLength;
  var angle = 7 * Math.PI / 180;

  // Total travel: band+tail starts fully off-screen, exits fully off-screen
  var totalTravel = diag + 2 * totalSpan;
  // sweepFront = leading edge position (sharp edge)
  var sweepFront = -totalSpan + t * totalTravel;

  // Parse sweep color to rgba for gradient
  var r = parseInt(tpSweepColor.slice(1, 3), 16);
  var g = parseInt(tpSweepColor.slice(3, 5), 16);
  var b = parseInt(tpSweepColor.slice(5, 7), 16);

  ctx.save();
  ctx.rotate(angle);

  // Gradient: transparent tail → solid band → sharp leading edge
  var gradStart = sweepFront - totalSpan; // tail end (transparent)
  var gradEnd = sweepFront;               // leading edge (sharp cutoff)
  var grad = ctx.createLinearGradient(gradStart, 0, gradEnd, 0);
  grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0)');
  // Tail fades in over tailLength portion
  var tailStop = tailLength / totalSpan;
  grad.addColorStop(tailStop, 'rgba(' + r + ',' + g + ',' + b + ',0.6)');
  grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0.6)');

  ctx.fillStyle = grad;
  ctx.fillRect(gradStart, -diag, totalSpan, diag * 2);
  ctx.restore();
}

function drawTPSweepVertical(ctx, w, h, t) {
  var bandWidth = h * (tpSweepWidthPct / 100);
  var tailLength = bandWidth * 2;
  var totalSpan = bandWidth + tailLength;

  var totalTravel = h + 2 * totalSpan;
  var sweepFront = -totalSpan + t * totalTravel;

  var r = parseInt(tpSweepColorV.slice(1, 3), 16);
  var g = parseInt(tpSweepColorV.slice(3, 5), 16);
  var b = parseInt(tpSweepColorV.slice(5, 7), 16);

  ctx.save();
  var gradStart = sweepFront - totalSpan;
  var gradEnd = sweepFront;
  var grad = ctx.createLinearGradient(0, gradStart, 0, gradEnd);
  grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0)');
  var tailStop = tailLength / totalSpan;
  grad.addColorStop(tailStop, 'rgba(' + r + ',' + g + ',' + b + ',0.6)');
  grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0.6)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, gradStart, w, totalSpan);
  ctx.restore();
}

// --- Unified Animation Loop (sweep + circle spin) ---

function _tpStartAnimation() {
  if(_tpAnimId) return; // already running
  _tpAnimStartTime = performance.now();
  var lastFrameTime = _tpAnimStartTime;

  function animate(now) {
    var elapsed = (now - _tpAnimStartTime) / 1000;
    var dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    if(tpSweepOn) {
      _tpSweepProgress = (elapsed % tpSweepDuration) / tpSweepDuration;
    }

    if(_tpNeedsAnimation()) {
      // Accumulate angle positively; direction applied per-circle at draw time
      _tpCircleAngle += dt * (2 * Math.PI / 5) * (tpCircleSpinSpeed / 100);
    }

    renderTestPattern(false);
    _tpCopyToLiveOut();
    _tpAnimId = requestAnimationFrame(animate);
  }

  _tpAnimId = requestAnimationFrame(animate);
}

function _tpStopAnimation() {
  if(_tpAnimId) {
    cancelAnimationFrame(_tpAnimId);
    _tpAnimId = null;
  }
  _tpAnimStartTime = null;
  _tpSweepProgress = 0;
}

function _tpRestartAnimationIfNeeded() {
  var needsAnimation = tpSweepOn || _tpNeedsAnimation();
  if(needsAnimation) {
    _tpStopAnimation();
    _tpStartAnimation();
  } else {
    _tpStopAnimation();
    scheduleTestPatternRedraw();
  }
}

function startSweepPreview() {
  _tpRestartAnimationIfNeeded();
}

function stopSweepPreview() {
  _tpSweepProgress = 0;
  _tpRestartAnimationIfNeeded();
}

// --- Video Export (VideoEncoder + mp4-muxer) ---

async function exportTestPatternVideo() {
  if(_tpIsRecording) return;

  if(typeof VideoEncoder === 'undefined') {
    showAlert('Video export requires Chrome 94+, Edge 94+, or a modern browser with WebCodecs support.');
    return;
  }
  if(typeof Mp4Muxer === 'undefined') {
    showAlert('Video muxer library failed to load. Please check your internet connection and reload.');
    return;
  }

  var canvas = document.getElementById('tpCanvas');
  if(!canvas) return;

  var totalW = tpDisplayW * tpDisplaysWide;
  var totalH = tpDisplayH * tpDisplaysHigh;
  var fps = tpSweepFps;
  var duration = tpSweepDuration;
  var totalFrames = Math.round(fps * duration);
  var hasSpinning = _tpNeedsAnimation();

  _tpStopAnimation();
  canvas.width = totalW;
  canvas.height = totalH;

  _tpIsRecording = true;
  var mp4Btn = document.getElementById('tpExportMp4');
  mp4Btn.disabled = true;
  var mp4Label = mp4Btn.querySelector('.tp-menu-label');
  mp4Label.textContent = 'Encoding...';

  // Save current animation state
  var savedSweepProgress = _tpSweepProgress;
  var savedCircleAngle = _tpCircleAngle;

  try {
    var ctx = canvas.getContext('2d');
    var bgImageData = null;

    // Optimize: if no spinning, pre-render static background
    if(!hasSpinning) {
      var savedSweepOn = tpSweepOn;
      tpSweepOn = false;
      renderTestPattern(true);
      tpSweepOn = savedSweepOn;
      bgImageData = ctx.getImageData(0, 0, totalW, totalH);
    }

    // Probe browser for supported codec + hw/sw acceleration
    var pixels = totalW * totalH;
    var scaledBitrate = Math.min(80000000, Math.max(40000000, Math.round(pixels / (1920 * 1080) * 40000000)));
    var encoderConfig = null;
    var muxerCodec = 'avc';

    // Try H.264 levels first (most compatible MP4 playback)
    var h264Levels = [
      { codec: 'avc1.640028', maxPixels: 2097152 },   // Level 4.0
      { codec: 'avc1.640032', maxPixels: 8912896 },   // Level 5.0
      { codec: 'avc1.640034', maxPixels: 8912896 },   // Level 5.2
      { codec: 'avc1.64003C', maxPixels: 35651584 }   // Level 6.0
    ];
    var candidates = h264Levels.filter(function(l) { return l.maxPixels >= pixels; });
    if (candidates.length === 0) candidates = [h264Levels[h264Levels.length - 1]];

    for (var ci = 0; ci < candidates.length && !encoderConfig; ci++) {
      var accels = ['prefer-hardware', 'prefer-software'];
      for (var ai = 0; ai < accels.length && !encoderConfig; ai++) {
        var testConfig = {
          codec: candidates[ci].codec,
          width: totalW,
          height: totalH,
          bitrate: scaledBitrate,
          framerate: fps,
          hardwareAcceleration: accels[ai]
        };
        try {
          var support = await VideoEncoder.isConfigSupported(testConfig);
          if (support.supported) {
            encoderConfig = support.config || testConfig;
          }
        } catch(e) { /* not supported, try next */ }
      }
    }

    // Fall back to HEVC then VP9 if H.264 can't handle this resolution
    if (!encoderConfig) {
      // HEVC: QuickTime-compatible, handles high resolutions
      var hevcCodecs = ['hvc1.1.6.L150.B0', 'hvc1.1.6.L153.B0', 'hvc1.1.6.L180.B0'];
      for (var hi = 0; hi < hevcCodecs.length && !encoderConfig; hi++) {
        var accels2 = ['prefer-hardware', 'prefer-software'];
        for (var ai2 = 0; ai2 < accels2.length && !encoderConfig; ai2++) {
          var hevcConfig = {
            codec: hevcCodecs[hi],
            width: totalW,
            height: totalH,
            bitrate: scaledBitrate,
            framerate: fps,
            hardwareAcceleration: accels2[ai2]
          };
          try {
            var hevcSupport = await VideoEncoder.isConfigSupported(hevcConfig);
            if (hevcSupport.supported) {
              encoderConfig = hevcSupport.config || hevcConfig;
              muxerCodec = 'hevc';
            }
          } catch(e) { /* not supported, try next */ }
        }
      }
    }

    // Last resort: VP9 (note: won't play in QuickTime)
    if (!encoderConfig) {
      var vp9Codecs = ['vp09.00.50.08', 'vp09.00.40.08', 'vp09.00.31.08'];
      for (var vi = 0; vi < vp9Codecs.length && !encoderConfig; vi++) {
        var accels3 = ['prefer-hardware', 'prefer-software'];
        for (var ai3 = 0; ai3 < accels3.length && !encoderConfig; ai3++) {
          var vp9Config = {
            codec: vp9Codecs[vi],
            width: totalW,
            height: totalH,
            bitrate: scaledBitrate,
            framerate: fps,
            hardwareAcceleration: accels3[ai3]
          };
          try {
            var vp9Support = await VideoEncoder.isConfigSupported(vp9Config);
            if (vp9Support.supported) {
              encoderConfig = vp9Support.config || vp9Config;
              muxerCodec = 'vp9';
            }
          } catch(e) { /* not supported, try next */ }
        }
      }
    }

    if (!encoderConfig) {
      throw new Error('Your browser does not support encoding at ' + totalW + 'x' + totalH + '. Try a smaller resolution.');
    }

    // Create muxer with the supported codec
    var muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: {
        codec: muxerCodec,
        width: totalW,
        height: totalH
      },
      fastStart: 'in-memory'
    });

    // Create and configure encoder
    var encodeError = null;
    var encoder = new VideoEncoder({
      output: function(chunk, meta) {
        muxer.addVideoChunk(chunk, meta);
      },
      error: function(e) {
        encodeError = e;
      }
    });

    encoderConfig.latencyMode = 'quality';
    encoder.configure(encoderConfig);

    var frameDurationUs = Math.round((1 / fps) * 1000000);
    var keyFrameInterval = Math.max(1, Math.round(fps));

    for(var i = 0; i < totalFrames; i++) {
      if(encodeError) throw encodeError;

      var t = i / totalFrames;
      var frameTime = (i / fps);

      if(hasSpinning) {
        // Full render per frame — circle angle changes each frame
        _tpCircleAngle = frameTime * (2 * Math.PI / 5) * (tpCircleSpinSpeed / 100);
        if(tpSweepOn) {
          _tpSweepProgress = t;
        }
        renderTestPattern(true);
      } else {
        // Static bg + sweep overlay only
        ctx.putImageData(bgImageData, 0, 0);
        drawTPSweep(ctx, totalW, totalH, t);
        drawTPSweepVertical(ctx, totalW, totalH, t);
      }

      var vf = new VideoFrame(canvas, {
        timestamp: i * frameDurationUs,
        duration: frameDurationUs
      });
      encoder.encode(vf, { keyFrame: i % keyFrameInterval === 0 });
      vf.close();

      // Backpressure: wait if encoder queue is too deep
      while(encoder.encodeQueueSize > 5) {
        await new Promise(function(r) { setTimeout(r, 1); });
      }

      // Update progress and yield to UI
      if(i % 5 === 0) {
        mp4Label.textContent = 'Encoding ' + Math.round((i / totalFrames) * 100) + '%';
        await new Promise(function(r) { setTimeout(r, 0); });
      }
    }

    await encoder.flush();
    encoder.close();
    muxer.finalize();

    var blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
    var safeName = tpImageName.replace(/[<>:"/\\|?*]/g, '_').trim() || 'testpattern';
    var filename = safeName + '_' + totalW + 'x' + totalH + '.mp4';
    downloadVideoBlob(blob, filename, 'video/mp4');

  } catch(err) {
    showAlert('Video export failed: ' + err.message);
    console.error('Export error:', err);
  }

  // Restore state
  _tpSweepProgress = savedSweepProgress;
  _tpCircleAngle = savedCircleAngle;
  _tpIsRecording = false;
  mp4Label.textContent = 'Export MP4';
  mp4Btn.disabled = false;
  renderTestPattern(false);
  _tpRestartAnimationIfNeeded();
}

function downloadVideoBlob(blob, filename, mimeType) {
  // Quick share: always use native share sheet
  if(_tpForceShare) {
    _tpForceShare = false;
    _tpNativeShare(blob, filename, mimeType);
    return;
  }

  // Mobile: use share API
  var isMobileDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
                       (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  if(isMobileDevice && navigator.canShare) {
    var file = new File([blob], filename, { type: mimeType });
    if(navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file] }).catch(function() {});
      return;
    }
  }

  // Desktop: download link
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
}
