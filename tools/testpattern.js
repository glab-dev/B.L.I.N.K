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
var tpSweepStyle = 'default';
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

// Solid color layer
var tpSolidOn = false;
var tpSolidColor = '#808080';
// SMPTE full-screen bars layer
var tpSmpteOn = false;
// Gradient layer
var tpGradientOn = false;
var tpGradientColor1 = '#000000';
var tpGradientColor2 = '#ffffff';
var tpGradientDir = 'horizontal'; // 'horizontal' | 'vertical' | 'diagonal'
// Strobe layer (animated overlay)
var tpStrobeOn = false;
var tpStrobeColor1 = '#ffffff';
var tpStrobeColor2 = '#000000';
var tpStrobeSpeed = 50;      // 1-100 -> flash frequency
var tpStrobeIntensity = 50;  // 1-100 -> overlay opacity of the flash
var _tpStrobePhase = 0;      // runtime: 0 or 1 (which color is showing)
// Diagonal whole-pattern scroll (wrapper, not a layer)
var tpScrollOn = false;
var tpScrollSpeed = 50;       // 1-100
var _tpScrollOffsetX = 0;     // runtime px offset
var _tpScrollOffsetY = 0;
var _tpScrollBuffer = null;   // offscreen canvas, lazily created
// DVD-style bouncing logo (animated) — shares the Logo Options image + size
var tpBounceOn = false;
var _tpBounceDefaultImg = null; // lazily-loaded icons/icon-512.png (fallback when no logo uploaded)
var tpBounceSpeed = 50;
var _tpBounceX = 0;           // runtime top-left position
var _tpBounceY = 0;
var _tpBounceVX = 1;          // runtime velocity sign
var _tpBounceVY = 1;
var _tpBounceInit = false;    // seeded position for current total size
// Green cross outline (crosshair + outer border) toggle
var tpCrossOn = true;
// Quick Patterns: currently-active exclusive base preset (or null)
var _tpActiveBasePreset = null;

// --- Imported Raster ---
// null = classic uniform-grid mode (tpDisplayW/H repeated tpDisplaysWide/High).
// When set, the pattern is composed onto a real project raster instead: screens
// at their own pixel sizes and canvas offsets, clipped to their true LED shape.
var tpRaster = null;
var tpRasterMode = 'whole';        // 'whole' | 'perScreen'
var _tpScreenNameOverride = null;  // per-screen name drawTPCenterText prefers while set

// The dimensions the pattern is composed at — the imported raster when one is
// loaded, otherwise the uniform display grid.
function _tpTotalSize() {
  if(tpRaster) return { w: tpRaster.width, h: tpRaster.height };
  return { w: tpDisplayW * tpDisplaysWide, h: tpDisplayH * tpDisplaysHigh };
}

// --- Layer Order ---
var _tpDefaultLayerOrder = [
  'solid', 'gradient', 'smpte', 'checker', 'bgImage', 'checkerBorder', 'grid', 'displayBoundaries',
  'processorLines', 'circles', 'crosshair', 'colorBars', 'logo',
  'outerBorder', 'strobe', 'sweep'
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
    if(tpRaster) {
      // Per-screen mode already frames every screen via the outer border layer
      if(tpRasterMode !== 'perScreen') drawTPRasterBoundaries(ctx);
      return;
    }
    if(tpDisplaysWide > 1 || tpDisplaysHigh > 1) drawTPDisplayBoundaries(ctx, w, h);
  }},
  processorLines: { name: 'Processor Lines', draw: function(ctx, w, h) {
    // Processor boundaries snap to the uniform display grid, which an imported
    // raster replaces — the control is disabled while a raster is loaded.
    if(tpRaster) return;
    if(tpProcessorLinesOn) drawTPProcessorLines(ctx, w, h);
  }},
  circles: { name: 'Circles', draw: function(ctx, w, h) {
    if(tpCirclesOn) drawTPCircles(ctx, w, h);
  }},
  crosshair: { name: 'Crosshair', draw: function(ctx, w, h) {
    if(!tpCrossOn) return;
    drawTPCrosshair(ctx, w, h);
  }},
  colorBars: { name: 'Color Bars', draw: function(ctx, w, h) {
    if(!tpColorBarsOn) return;
    if(tpColorBarsOpacity < 100) ctx.globalAlpha = tpColorBarsOpacity / 100;
    drawTPColorBars(ctx, w, h);
    ctx.globalAlpha = 1;
  }},
  logo: { name: 'Logo', draw: function(ctx, w, h) {
    if(!tpLogoOn) return;
    var img = tpLogoImage || _tpBounceDefaultImg;
    if(!img || !img.width) return;
    if(tpLogoOpacity < 100) ctx.globalAlpha = tpLogoOpacity / 100;
    if(tpBounceOn) drawTPBounceLogo(ctx, w, h);
    else drawTPLogo(ctx, w, h);
    ctx.globalAlpha = 1;
  }},
  outerBorder: { name: 'Outer Border', draw: function(ctx, w, h) {
    if(!tpCrossOn) return;
    ctx.strokeStyle = tpCrossColor;
    ctx.lineWidth = Math.max(2, Math.round(w / 500));
    ctx.strokeRect(0, 0, w, h);
  }},
  sweep: { name: 'Sweep', draw: function(ctx, w, h) {
    if(!tpSweepOn) return;
    drawTPSweepFrame(ctx, w, h, _tpSweepProgress);
  }},
  solid: { name: 'Solid', draw: function(ctx, w, h) {
    if(!tpSolidOn) return;
    ctx.fillStyle = tpSolidColor;
    ctx.fillRect(0, 0, w, h);
  }},
  gradient: { name: 'Gradient', draw: function(ctx, w, h) {
    if(!tpGradientOn) return;
    var x1 = w, y1 = 0;
    if(tpGradientDir === 'vertical') { x1 = 0; y1 = h; }
    else if(tpGradientDir === 'diagonal') { x1 = w; y1 = h; }
    var g = ctx.createLinearGradient(0, 0, x1, y1);
    g.addColorStop(0, tpGradientColor1);
    g.addColorStop(1, tpGradientColor2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }},
  smpte: { name: 'SMPTE', draw: function(ctx, w, h) {
    if(!tpSmpteOn) return;
    drawTPSmpteFullscreen(ctx, w, h);
  }},
  strobe: { name: 'Strobe', draw: function(ctx, w, h) {
    if(!tpStrobeOn) return;
    ctx.globalAlpha = Math.max(0.02, tpStrobeIntensity / 100);
    ctx.fillStyle = _tpStrobePhase === 1 ? tpStrobeColor1 : tpStrobeColor2;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
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
    tpSweepOn: tpSweepOn, tpSweepStyle: tpSweepStyle, tpSweepColor: tpSweepColor, tpSweepColorV: tpSweepColorV,
    tpSweepDuration: tpSweepDuration, tpSweepWidthPct: tpSweepWidthPct, tpSweepFps: tpSweepFps,
    tpCircleSpinMode: tpCircleSpinMode, tpCircleRevMode: tpCircleRevMode, tpCircleSpinSpeed: tpCircleSpinSpeed,
    tpCheckerOn: tpCheckerOn, tpCheckerSizePct: tpCheckerSizePct,
    tpCheckerBorderOn: tpCheckerBorderOn, tpBorderSizePct: tpBorderSizePct,
    tpBorderColor1: tpBorderColor1, tpBorderColor2: tpBorderColor2,
    tpCheckerColor1: tpCheckerColor1, tpCheckerColor2: tpCheckerColor2,
    tpCheckerOpacity: tpCheckerOpacity, tpBorderOpacity: tpBorderOpacity,
    tpBgImageOn: tpBgImageOn, tpBgImage: tpBgImage,
    tpProcessorLinesOn: tpProcessorLinesOn,
    tpProcessorLineColor: tpProcessorLineColor,
    tpSolidOn: tpSolidOn, tpSolidColor: tpSolidColor,
    tpSmpteOn: tpSmpteOn, tpCrossOn: tpCrossOn, _tpActiveBasePreset: _tpActiveBasePreset,
    tpGradientOn: tpGradientOn, tpGradientColor1: tpGradientColor1, tpGradientColor2: tpGradientColor2, tpGradientDir: tpGradientDir,
    tpStrobeOn: tpStrobeOn, tpStrobeColor1: tpStrobeColor1, tpStrobeColor2: tpStrobeColor2, tpStrobeSpeed: tpStrobeSpeed, tpStrobeIntensity: tpStrobeIntensity,
    tpScrollOn: tpScrollOn, tpScrollSpeed: tpScrollSpeed,
    tpBounceOn: tpBounceOn, tpBounceSpeed: tpBounceSpeed,
    tpRaster: tpRaster ? JSON.parse(JSON.stringify(tpRaster)) : null,
    tpRasterMode: tpRasterMode,
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
  tpSweepOn = s.tpSweepOn; tpSweepStyle = s.tpSweepStyle || 'default';
  tpSweepColor = s.tpSweepColor; tpSweepColorV = s.tpSweepColorV;
  tpSweepDuration = s.tpSweepDuration; tpSweepWidthPct = s.tpSweepWidthPct; tpSweepFps = s.tpSweepFps;
  tpCircleSpinMode = s.tpCircleSpinMode; tpCircleRevMode = s.tpCircleRevMode; tpCircleSpinSpeed = s.tpCircleSpinSpeed;
  tpCheckerOn = s.tpCheckerOn; tpCheckerSizePct = s.tpCheckerSizePct;
  tpCheckerBorderOn = s.tpCheckerBorderOn; tpBorderSizePct = s.tpBorderSizePct;
  tpBorderColor1 = s.tpBorderColor1; tpBorderColor2 = s.tpBorderColor2;
  tpCheckerColor1 = s.tpCheckerColor1; tpCheckerColor2 = s.tpCheckerColor2;
  tpCheckerOpacity = s.tpCheckerOpacity; tpBorderOpacity = s.tpBorderOpacity;
  tpBgImageOn = s.tpBgImageOn; tpBgImage = s.tpBgImage;
  tpProcessorLinesOn = s.tpProcessorLinesOn;
  tpProcessorLineColor = s.tpProcessorLineColor;
  tpSolidOn = s.tpSolidOn; tpSolidColor = s.tpSolidColor;
  tpSmpteOn = !!s.tpSmpteOn; tpCrossOn = (s.tpCrossOn !== false); _tpActiveBasePreset = s._tpActiveBasePreset || null;
  tpGradientOn = s.tpGradientOn; tpGradientColor1 = s.tpGradientColor1; tpGradientColor2 = s.tpGradientColor2; tpGradientDir = s.tpGradientDir;
  tpStrobeOn = s.tpStrobeOn; tpStrobeColor1 = s.tpStrobeColor1; tpStrobeColor2 = s.tpStrobeColor2; tpStrobeSpeed = s.tpStrobeSpeed; tpStrobeIntensity = s.tpStrobeIntensity;
  tpScrollOn = s.tpScrollOn; tpScrollSpeed = s.tpScrollSpeed;
  tpBounceOn = s.tpBounceOn; tpBounceSpeed = s.tpBounceSpeed;
  tpRaster = s.tpRaster || null;
  tpRasterMode = (s.tpRasterMode === 'perScreen') ? 'perScreen' : 'whole';
  _tpScrollOffsetX = 0; _tpScrollOffsetY = 0; _tpBounceInit = false;
  tpLayerOrder = (s.tpLayerOrder ? s.tpLayerOrder.slice() : _tpDefaultLayerOrder.slice())
    .filter(function(k) { return _tpLayerRegistry[k]; });
  _tpSyncDOM();
}

function _tpSyncDOM() {
  document.getElementById('tpImageName').value = tpImageName === 'Name your testpattern' ? '' : tpImageName;
  document.getElementById('tpDisplayW').value = tpDisplayW;
  document.getElementById('tpDisplayH').value = tpDisplayH;
  syncTpDisplaySizeButtons();
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
  _tpSyncSweepStyleButtons();
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
  document.getElementById('tpProcessorLineColor').value = tpProcessorLineColor;
  document.getElementById('tpSolidToggle').checked = tpSolidOn;
  document.getElementById('tpSolidColor').value = tpSolidColor;
  document.getElementById('tpCrossToggle').checked = tpCrossOn;
  document.getElementById('tpGradientToggle').checked = tpGradientOn;
  document.getElementById('tpGradientColor1').value = tpGradientColor1;
  document.getElementById('tpGradientColor2').value = tpGradientColor2;
  document.getElementById('tpGradientDir').value = tpGradientDir;
  document.getElementById('tpStrobeToggle').checked = tpStrobeOn;
  document.getElementById('tpStrobeColor1').value = tpStrobeColor1;
  document.getElementById('tpStrobeColor2').value = tpStrobeColor2;
  document.getElementById('tpStrobeSpeed').value = tpStrobeSpeed;
  document.getElementById('tpStrobeSpeedVal').textContent = tpStrobeSpeed + '%';
  document.getElementById('tpStrobeIntensity').value = tpStrobeIntensity;
  document.getElementById('tpStrobeIntensityVal').textContent = tpStrobeIntensity + '%';
  document.getElementById('tpScrollToggle').checked = tpScrollOn;
  document.getElementById('tpScrollSpeed').value = tpScrollSpeed;
  document.getElementById('tpScrollSpeedVal').textContent = tpScrollSpeed + '%';
  document.getElementById('tpBounceToggle').checked = tpBounceOn;
  document.getElementById('tpBounceSpeed').value = tpBounceSpeed;
  document.getElementById('tpBounceSpeedVal').textContent = tpBounceSpeed + '%';
  _tpSyncPresetButtons();
  _tpSyncRasterUI();

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

  await saveBlobToDevice(blob, fileName, {
    mimeType: 'application/json',
    description: 'BLINK Test Pattern',
    accept: { 'application/json': ['.blinktp'] }
  });
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

// --- Raster Import ---

var _tpRecentCache = [];

// Canvas resolution for a canvasSize preset — the same mapping showCanvasView()
// uses, so an imported raster matches what the canvas view draws.
function _tpCanvasDims(d) {
  var size = d && d.canvasSize;
  if(size === '4K_DCI') return { w: 4096, h: 2160 };
  if(size === 'HD') return { w: 1920, h: 1080 };
  if(size === 'custom') {
    return {
      w: parseInt(d.customCanvasWidth) || 1920,
      h: parseInt(d.customCanvasHeight) || 1080
    };
  }
  return { w: 3840, h: 2160 };
}

// Normalises any project-shaped source into the raster the pattern composes
// onto. Geometry only — nothing here mutates live project state.
//   screensObj  screens map (live screens{} or a parsed config's .screens)
//   order       preferred screen id order, or null for object order
//   canvasDims  { canvasSize, customCanvasWidth, customCanvasHeight }
//   extraPanels custom panel specs embedded in the source (read, never installed)
function _tpBuildRaster(screensObj, order, canvasDims, extraPanels, name, source) {
  if(!screensObj || typeof screensObj !== 'object' || Array.isArray(screensObj)) return null;
  var allPanels = Object.assign({}, getAllPanels(), extraPanels || {});

  // Preferred order first, then anything the order list missed
  var ids = (order || []).filter(function(id) { return screensObj[id]; });
  Object.keys(screensObj).forEach(function(id) {
    if(ids.indexOf(id) === -1) ids.push(id);
  });

  var out = [];
  ids.forEach(function(id) {
    if(!/^screen_\d+$/.test(id)) return;   // same allowlist applyConfiguration() uses
    var screen = screensObj[id];
    if(!screen || screen.visible === false) return;
    var data = screen.data || screen;
    var panel = allPanels[data.panelType || 'CB5_MKII'];
    if(!panel) return;

    // The exact lit shape — deleted panels leave real holes
    var rects = buildScreenSliceRects(data, panel);
    if(rects.length === 0) return;

    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    rects.forEach(function(r) {
      if(r.x < minX) minX = r.x;
      if(r.y < minY) minY = r.y;
      if(r.x + r.w > maxX) maxX = r.x + r.w;
      if(r.y + r.h > maxY) maxY = r.y + r.h;
    });

    out.push({
      name: String(screen.name || 'Screen').slice(0, 50),
      x: minX, y: minY, w: maxX - minX, h: maxY - minY,
      rects: rects
    });
  });

  if(out.length === 0) return null;

  // Start from the source's canvas size, then grow to cover every slice so a
  // screen positioned past the canvas edge is never silently cut off — the
  // same rule buildResolumeXml() applies.
  var dims = _tpCanvasDims(canvasDims);
  var width = dims.w, height = dims.h;
  out.forEach(function(scr) {
    scr.rects.forEach(function(r) {
      if(r.x + r.w > width) width = r.x + r.w;
      if(r.y + r.h > height) height = r.y + r.h;
    });
  });

  return {
    name: String(name || 'Raster').slice(0, 100),
    source: source,
    width: Math.round(width),
    height: Math.round(height),
    screens: out
  };
}

// Pulls the raster out of a parsed .blinkled or .blinkrast config. The two
// formats share the screens shape and differ only in where canvas size lives.
function _tpRasterFromConfig(config, source, fallbackName) {
  if(!config || typeof config !== 'object' || Array.isArray(config)) return null;

  var canvasDims = config.canvasSettings || null;               // .blinkrast
  if(!canvasDims && config.canvases) {                          // .blinkled
    var canvasId = config.currentCanvasId;
    if(!canvasId || !config.canvases[canvasId]) canvasId = Object.keys(config.canvases)[0];
    if(canvasId && config.canvases[canvasId]) canvasDims = config.canvases[canvasId].data;
  }

  return _tpBuildRaster(config.screens, config.screenOrder || null, canvasDims,
    config.customPanels, config.name || fallbackName, source);
}

// Commits a freshly built raster and refreshes the whole tool.
function _tpApplyRaster(raster) {
  if(!raster) {
    showAlert('No screens with panels were found in that project.', 'Nothing to Import');
    return;
  }
  tpSaveState();
  tpRaster = raster;
  // Canvas dimensions changed — reseed the size-dependent animations
  _tpScrollOffsetX = 0;
  _tpScrollOffsetY = 0;
  _tpBounceInit = false;
  if(!tpImageName || tpImageName === 'Name your testpattern') {
    tpImageName = raster.name;
  }
  _tpSyncDOM();
}

function tpImportRasterFromCurrentProject() {
  closeTpRasterImportModal();
  if(typeof screens === 'undefined' || Object.keys(screens).length === 0) {
    showAlert('No project is open. Load a project first, or import from a saved file.', 'Nothing to Import');
    return;
  }
  // Standard flush prologue — pushes the open screen's inputs into screens{}
  try {
    if(typeof saveCurrentScreenData === 'function') saveCurrentScreenData();
  } catch(e) { /* app DOM not initialised — the stored screen data is still valid */ }

  var canvasDims = null;
  if(typeof canvases !== 'undefined' && typeof currentCanvasId !== 'undefined'
     && canvases[currentCanvasId]) {
    canvasDims = canvases[currentCanvasId].data;
  }
  var order = (typeof getScreenIdsInOrder === 'function') ? getScreenIdsInOrder() : null;
  var nameEl = document.getElementById('configName');
  var name = (nameEl && nameEl.value.trim()) || 'Current Project';

  _tpApplyRaster(_tpBuildRaster(screens, order, canvasDims,
    (typeof customPanels !== 'undefined' ? customPanels : null), name, 'current'));
}

// Both project-file menu items share one input; the caller sets which
// extensions the picker offers.
function tpPickRasterFile(accept) {
  closeTpRasterImportModal();
  var input = document.getElementById('tpRasterFileInput');
  if(!input) return;
  input.accept = accept;
  input.click();
}

function tpImportRasterFile(event) {
  var file = event.target.files[0];
  if(!file) return;

  if(file.size > 10 * 1024 * 1024) {
    showAlert('Project file is too large (max 10MB).');
    event.target.value = '';
    return;
  }

  var baseName = file.name.replace(/\.(blinkled|blinkrast|led|ledconfig)$/i, '');
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var raster = _tpRasterFromConfig(JSON.parse(e.target.result), 'file', baseName);
      if(!raster) {
        showAlert('That file does not contain a usable screen layout.', 'Invalid File');
      } else {
        _tpApplyRaster(raster);
      }
    } catch(err) {
      showAlert('Error reading project: ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// Recents picker. Deliberately does not reuse showRecentProjects() — its rows
// call loadFromRecentByName(), which runs the destructive applyConfiguration().
async function tpImportRasterFromRecents() {
  var list = document.getElementById('tpRasterRecentList');
  var sources = document.getElementById('tpRasterSourceList');
  var title = document.getElementById('tpRasterImportTitle');
  if(!list) return;

  // Swap the modal body from the source list to the project list
  if(sources) sources.style.display = 'none';
  list.style.display = '';
  if(title) title.textContent = 'Recent Projects';

  list.innerHTML = '<p class="tp-raster-empty">Loading...</p>';

  var projects = [];
  try {
    if(typeof getRecentProjects === 'function') projects = await getRecentProjects();
  } catch(e) { projects = []; }
  _tpRecentCache = projects || [];

  if(_tpRecentCache.length === 0) {
    list.innerHTML = '<p class="tp-raster-empty">No recent projects found.</p>';
    return;
  }

  var html = '';
  _tpRecentCache.forEach(function(project, i) {
    var date = project.timestamp ? new Date(project.timestamp) : null;
    var dateStr = date ? (date.toLocaleDateString() + ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : '';
    var count = project.screenCount || 0;
    var screenLabel = count === 1 ? '1 screen' : count + ' screens';
    html += '<button class="recent-project-item" data-tp-recent-index="' + i + '">'
      + '<div class="recent-project-name">' + escapeHtml(project.name || 'Untitled') + '</div>'
      + '<div class="recent-project-meta">' + escapeHtml(dateStr) + ' &middot; ' + escapeHtml(screenLabel) + '</div>'
      + '</button>';
  });
  list.innerHTML = html;

  list.querySelectorAll('[data-tp-recent-index]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      _tpLoadRasterFromRecent(parseInt(this.dataset.tpRecentIndex, 10));
    });
  });
}

function _tpLoadRasterFromRecent(index) {
  var project = _tpRecentCache[index];
  closeTpRasterImportModal();
  if(!project || !project.configData) {
    showAlert('That project has no saved layout data.', 'Nothing to Import');
    return;
  }
  var raster = _tpRasterFromConfig(project.configData, 'recent', project.name);
  if(!raster) {
    showAlert('That project has no screens with panels.', 'Nothing to Import');
    return;
  }
  _tpApplyRaster(raster);
}

// One modal with two views: the four import sources, then the recents list.
// A modal rather than a dropdown because .tp-controls-col is overflow:hidden on
// desktop, which would clip an absolutely-positioned popup inside the column.
function openTpRasterImportModal() {
  var modal = document.getElementById('tpRasterImportModal');
  if(!modal) return;
  var sources = document.getElementById('tpRasterSourceList');
  var list = document.getElementById('tpRasterRecentList');
  var title = document.getElementById('tpRasterImportTitle');
  if(sources) sources.style.display = '';
  if(list) { list.style.display = 'none'; list.innerHTML = ''; }
  if(title) title.textContent = 'Import Raster';
  modal.classList.add('active');
  // .tp-page is position:fixed with its own scroll context, so hiding body
  // overflow alone would leave it scrolling behind the modal
  var page = document.getElementById('testPatternPage');
  if(page) page.style.overflowY = 'hidden';
}

function closeTpRasterImportModal() {
  var modal = document.getElementById('tpRasterImportModal');
  if(modal) modal.classList.remove('active');
  var page = document.getElementById('testPatternPage');
  if(page) page.style.overflowY = '';
  _tpRecentCache = [];
}

function tpClearRaster() {
  if(!tpRaster) return;
  tpSaveState();
  tpRaster = null;
  _tpScrollOffsetX = 0;
  _tpScrollOffsetY = 0;
  _tpBounceInit = false;
  _tpSyncDOM();
}

function setTpRasterMode(mode) {
  if(mode !== 'whole' && mode !== 'perScreen') return;
  if(tpRasterMode === mode) return;
  tpSaveState();
  tpRasterMode = mode;
  _tpSyncRasterUI();
  scheduleTestPatternRedraw();
}

// Status line, mode buttons, and the controls an imported raster supersedes.
function _tpSyncRasterUI() {
  var loaded = !!tpRaster;

  var status = document.getElementById('tpRasterStatus');
  if(status) {
    if(loaded) {
      var count = tpRaster.screens.length;
      status.textContent = tpRaster.name + ' \u2014 ' + tpRaster.width + '\u00d7' + tpRaster.height
        + ' \u00b7 ' + count + (count === 1 ? ' screen' : ' screens');
      status.style.display = '';
    } else {
      status.textContent = '';
      status.style.display = 'none';
    }
  }

  var clearBtn = document.getElementById('tpRasterClearBtn');
  if(clearBtn) clearBtn.style.display = loaded ? '' : 'none';

  var modeGroup = document.getElementById('tpRasterModeGroup');
  if(modeGroup) {
    modeGroup.style.display = loaded ? '' : 'none';
    modeGroup.querySelectorAll('[data-raster-mode]').forEach(function(b) {
      b.classList.toggle('active', b.dataset.rasterMode === tpRasterMode);
    });
  }

  // Per-screen export only means anything with a raster loaded
  var perScreenPng = document.getElementById('tpExportPngPerScreen');
  if(perScreenPng) perScreenPng.style.display = loaded ? '' : 'none';

  // The uniform display grid and processor lines are superseded by the raster.
  // Disable the controls for keyboard users and dim their containers.
  ['tpDisplayW', 'tpDisplayH', 'tpDisplaysWide', 'tpDisplaysHigh',
   'tpTotalW', 'tpTotalH', 'tpProcessorLinesToggle'].forEach(function(id) {
    var el = document.getElementById(id);
    if(!el) return;
    el.disabled = loaded;
    // The stepper arrows are separate buttons that call adjustNumberInput()
    var wrap = el.closest ? el.closest('.number-input-with-arrows') : null;
    if(wrap) {
      wrap.classList.toggle('tp-disabled', loaded);
      wrap.querySelectorAll('button').forEach(function(b) { b.disabled = loaded; });
    } else {
      el.classList.toggle('tp-disabled', loaded);
    }
  });

  var presets = document.querySelector('.tp-size-presets');
  if(presets) {
    presets.classList.toggle('tp-disabled', loaded);
    presets.querySelectorAll('button').forEach(function(b) { b.disabled = loaded; });
  }
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
    // Crop each output's region to its window
    for(var i = _tpLiveOutWindows.length - 1; i >= 0; i--) {
      var entry = _tpLiveOutWindows[i];
      if(entry.win.closed) { _tpLiveOutWindows.splice(i, 1); continue; }
      var eDst;
      try { eDst = entry.win.document.getElementById('liveCanvas'); } catch(e) { continue; }
      if(!eDst) continue;
      // Resize if the region's dimensions changed
      if(eDst.width !== entry.sw || eDst.height !== entry.sh) {
        eDst.width = entry.sw;
        eDst.height = entry.sh;
      }
      var dstCtx = eDst.getContext('2d');
      dstCtx.drawImage(_tpLiveOutOffscreen,
        entry.sx, entry.sy, entry.sw, entry.sh,
        0, 0, entry.sw, entry.sh);
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

  var totalW = _tpTotalSize().w;
  var totalH = _tpTotalSize().h;
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

// One output region per screen when a raster is loaded, otherwise one per cell
// of the uniform display grid.
function _tpLiveOutRegions() {
  var regions = [];
  if(tpRaster) {
    tpRaster.screens.forEach(function(scr, i) {
      regions.push({
        title: scr.name, name: 'blink_out_screen_' + i,
        sx: scr.x, sy: scr.y, sw: scr.w, sh: scr.h
      });
    });
    return regions;
  }
  for(var row = 0; row < tpDisplaysHigh; row++) {
    for(var col = 0; col < tpDisplaysWide; col++) {
      regions.push({
        title: 'Output ' + (col + 1) + ',' + (row + 1),
        name: 'blink_out_' + col + '_' + row,
        sx: col * tpDisplayW, sy: row * tpDisplayH,
        sw: tpDisplayW, sh: tpDisplayH
      });
    }
  }
  return regions;
}

function _tpOpenSplitOutputs() {
  _tpLiveOutWindows = [];
  _tpLiveOutMode = 'split';
  _tpLiveOutOffscreen = document.createElement('canvas');
  var blocked = false;

  _tpLiveOutRegions().forEach(function(region) {
    var w = window.open('', region.name, 'width=960,height=540');
    if(!w) { blocked = true; return; }

    w.document.open();
    w.document.write(_tpLiveOutWindowHTML.replace('TITLE_PLACEHOLDER',
      'B.L.I.N.K. \u2014 ' + region.title));
    w.document.close();

    var liveCanvas = w.document.getElementById('liveCanvas');
    if(liveCanvas) {
      liveCanvas.width = region.sw;
      liveCanvas.height = region.sh;
    }

    _tpSetupLiveOutWindow(w);
    _tpLiveOutWindows.push({
      win: w, sx: region.sx, sy: region.sy, sw: region.sw, sh: region.sh
    });
  });

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

  // Single output: open full output directly
  var regions = _tpLiveOutRegions();
  if(regions.length <= 1) {
    _tpOpenFullOutput();
    return;
  }

  // Multiple outputs: show popup menu
  var popup = document.getElementById('tpLiveOutPopup');
  if(popup) {
    // Update split label with the current output count
    var splitBtn = document.getElementById('tpLiveOutSplit');
    if(splitBtn) {
      splitBtn.textContent = tpRaster
        ? 'Split Outputs (' + regions.length + ' screens)'
        : 'Split Outputs (' + tpDisplaysWide + '\u00d7' + tpDisplaysHigh + ')';
    }
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
  _tpSyncRasterUI();
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
  tpProcessorLinesOn = false; tpProcessorLineColor = '#ff0000';
  tpLayerOrder = _tpDefaultLayerOrder.slice();
  tpRaster = null; tpRasterMode = 'whole';
  tpSweepOn = false; tpSweepStyle = 'default'; tpSweepColor = '#ffffff'; tpSweepColorV = '#ffffff';
  tpSweepDuration = 5; tpSweepWidthPct = 2;
  tpSweepFps = 60;
  tpSolidOn = false; tpSolidColor = '#808080';
  tpGradientOn = false; tpGradientColor1 = '#000000'; tpGradientColor2 = '#ffffff'; tpGradientDir = 'horizontal';
  tpStrobeOn = false; tpStrobeColor1 = '#ffffff'; tpStrobeColor2 = '#000000'; tpStrobeSpeed = 50; tpStrobeIntensity = 50;
  tpScrollOn = false; tpScrollSpeed = 50;
  tpBounceOn = false; tpBounceSpeed = 50;
  tpSmpteOn = false; tpCrossOn = true; _tpActiveBasePreset = null;

  // Stop animations if running
  _tpStopAnimation();
  _tpCircleAngle = 0;
  _tpStrobePhase = 0;
  _tpScrollOffsetX = 0; _tpScrollOffsetY = 0; _tpScrollBuffer = null;
  _tpBounceInit = false; _tpBounceVX = 1; _tpBounceVY = 1;

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
  _tpSyncSweepStyleButtons();
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
  document.getElementById('tpProcessorLineColor').value = '#ff0000';
  document.getElementById('tpSolidToggle').checked = false;
  document.getElementById('tpSolidColor').value = '#808080';
  document.getElementById('tpGradientToggle').checked = false;
  document.getElementById('tpGradientColor1').value = '#000000';
  document.getElementById('tpGradientColor2').value = '#ffffff';
  document.getElementById('tpGradientDir').value = 'horizontal';
  document.getElementById('tpStrobeToggle').checked = false;
  document.getElementById('tpStrobeColor1').value = '#ffffff';
  document.getElementById('tpStrobeColor2').value = '#000000';
  document.getElementById('tpStrobeSpeed').value = 50;
  document.getElementById('tpStrobeSpeedVal').textContent = '50%';
  document.getElementById('tpStrobeIntensity').value = 50;
  document.getElementById('tpStrobeIntensityVal').textContent = '50%';
  document.getElementById('tpScrollToggle').checked = false;
  document.getElementById('tpScrollSpeed').value = 50;
  document.getElementById('tpScrollSpeedVal').textContent = '50%';
  document.getElementById('tpBounceToggle').checked = false;
  document.getElementById('tpBounceSpeed').value = 50;
  document.getElementById('tpBounceSpeedVal').textContent = '50%';
  document.getElementById('tpCrossToggle').checked = true;
  _tpSyncPresetButtons();
  syncTpDisplaySizeButtons();
  _tpSyncRasterUI();

  updateTotalSize();
  scheduleTestPatternRedraw();
  _tpUpdateUndoRedoBtns();
}

// --- Quick Patterns ---
// The 5 base presets (smpte/grid/checker/gradient/solid) are mutually exclusive;
// tapping the active one again reverts to the default test-pattern look. Strobe is
// an independent overlay toggle. Wrapped in tpSaveState() so a single Undo restores.
function _tpApplyDefaultContent() {
  tpColorBarsOn = true;
  tpColorBarsMode = 'default';
  tpCirclesOn = true;
  tpGridSizePct = 50;
  tpCheckerOn = false;
  tpSolidOn = false;
  tpGradientOn = false;
  tpSmpteOn = false;
}

function applyTpPreset(name) {
  tpSaveState();
  if(name === 'strobe') {
    // Independent overlay toggle — leaves the base pattern underneath as-is
    tpStrobeOn = !tpStrobeOn;
    if(tpStrobeOn) _tpStrobePhase = 1;
  } else {
    var turningOff = (_tpActiveBasePreset === name);
    // Clear all base content layers first
    tpColorBarsOn = false;
    tpCirclesOn = false;
    tpGridSizePct = 0;
    tpCheckerOn = false;
    tpSolidOn = false;
    tpGradientOn = false;
    tpSmpteOn = false;
    if(turningOff) {
      _tpActiveBasePreset = null;
      _tpApplyDefaultContent();
    } else {
      _tpActiveBasePreset = name;
      switch(name) {
        case 'smpte': tpSmpteOn = true; break;
        case 'grid': tpGridSizePct = 50; break;
        case 'checker': tpCheckerOn = true; break;
        case 'gradient': tpGradientOn = true; break;
        case 'solid': tpSolidOn = true; break;
      }
    }
  }
  _tpSyncDOM();
  _tpRestartAnimationIfNeeded();
  _tpUpdateUndoRedoBtns();
}

// Highlight the active preset buttons (.active) from current state.
function _tpSyncPresetButtons() {
  var btns = document.querySelectorAll('.tp-preset-group .toggle-btn');
  for(var i = 0; i < btns.length; i++) {
    var p = btns[i].getAttribute('data-preset');
    var active = (p === 'strobe') ? tpStrobeOn : (_tpActiveBasePreset === p);
    btns[i].classList.toggle('active', active);
  }
}

// Sweep style: default (tilted H + V bands) or one of the single-band styles.
function setTpSweepStyle(name) {
  tpSaveState();
  tpSweepStyle = name;
  _tpSyncSweepStyleButtons();
  _tpUpdateUndoRedoBtns();
  if(!_tpAnimId) scheduleTestPatternRedraw();
}

// Highlight the active sweep style button (.active) from current state.
function _tpSyncSweepStyleButtons() {
  var btns = document.querySelectorAll('.tp-sweep-style-group .toggle-btn');
  for(var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', btns[i].getAttribute('data-sweep-style') === tpSweepStyle);
  }
}

// Drop the active-base-preset highlight when the user changes a base layer manually.
function _tpClearBasePreset() {
  if(_tpActiveBasePreset !== null) {
    _tpActiveBasePreset = null;
    _tpSyncPresetButtons();
  }
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
    try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
    _dragItem = null;
  });

  _dragList.addEventListener('pointercancel', function(e) {
    if(!_dragItem) return;
    _dragItem.classList.remove('dragging');
    var items = _dragList.querySelectorAll('.tp-layer-item');
    items.forEach(function(el) { el.classList.remove('drag-over'); });
    try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
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
    syncTpDisplaySizeButtons();
    scheduleDimensionRedraw();
  });

  dispH.addEventListener('input', function() {
    tpDisplayH = Math.max(1, parseInt(this.value) || 1080);
    updateTotalSize();
    syncTpDisplaySizeButtons();
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
    _tpClearBasePreset();
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
    _tpClearBasePreset();
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

  document.getElementById('tpProcessorLineColor').addEventListener('input', function() {
    tpProcessorLineColor = this.value;
    scheduleTestPatternRedraw();
  });

  circlesToggle.addEventListener('change', function() {
    tpCirclesOn = this.checked;
    _tpClearBasePreset();
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
    _tpClearBasePreset();
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
    if(this.checked) {
      _tpEnsureBounceDefault(function() { _tpRestartAnimationIfNeeded(); });
    } else {
      _tpRestartAnimationIfNeeded();
    }
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

  // Gradient
  document.getElementById('tpGradientToggle').addEventListener('change', function() {
    tpGradientOn = this.checked;
    _tpClearBasePreset();
    scheduleTestPatternRedraw();
  });
  document.getElementById('tpGradientColor1').addEventListener('input', function() {
    tpGradientColor1 = this.value;
    scheduleTestPatternRedraw();
  });
  document.getElementById('tpGradientColor2').addEventListener('input', function() {
    tpGradientColor2 = this.value;
    scheduleTestPatternRedraw();
  });
  document.getElementById('tpGradientDir').addEventListener('change', function() {
    tpGradientDir = this.value;
    scheduleTestPatternRedraw();
  });

  // Solid color
  document.getElementById('tpSolidToggle').addEventListener('change', function() {
    tpSolidOn = this.checked;
    _tpClearBasePreset();
    scheduleTestPatternRedraw();
  });
  document.getElementById('tpSolidColor').addEventListener('input', function() {
    tpSolidColor = this.value;
    scheduleTestPatternRedraw();
  });

  // Strobe (animated overlay)
  document.getElementById('tpStrobeToggle').addEventListener('change', function() {
    tpStrobeOn = this.checked;
    if(this.checked) _tpStrobePhase = 1;
    _tpSyncPresetButtons();
    _tpRestartAnimationIfNeeded();
  });
  document.getElementById('tpStrobeColor1').addEventListener('input', function() {
    tpStrobeColor1 = this.value;
    scheduleTestPatternRedraw();
  });
  document.getElementById('tpStrobeColor2').addEventListener('input', function() {
    tpStrobeColor2 = this.value;
    scheduleTestPatternRedraw();
  });
  document.getElementById('tpStrobeSpeed').addEventListener('input', function() {
    tpStrobeSpeed = parseInt(this.value);
    document.getElementById('tpStrobeSpeedVal').textContent = this.value + '%';
  });
  document.getElementById('tpStrobeIntensity').addEventListener('input', function() {
    tpStrobeIntensity = parseInt(this.value);
    document.getElementById('tpStrobeIntensityVal').textContent = this.value + '%';
  });

  // Diagonal scroll (animated)
  document.getElementById('tpScrollToggle').addEventListener('change', function() {
    tpScrollOn = this.checked;
    _tpScrollOffsetX = 0;
    _tpScrollOffsetY = 0;
    if(!this.checked) _tpScrollBuffer = null;
    _tpRestartAnimationIfNeeded();
  });
  document.getElementById('tpScrollSpeed').addEventListener('input', function() {
    tpScrollSpeed = parseInt(this.value);
    document.getElementById('tpScrollSpeedVal').textContent = this.value + '%';
  });

  // Bounce (animated) — bounces the Logo Options image (or default icon)
  document.getElementById('tpBounceToggle').addEventListener('change', function() {
    tpBounceOn = this.checked;
    if(this.checked) {
      _tpBounceInit = false;
      _tpEnsureBounceDefault(function() { _tpRestartAnimationIfNeeded(); });
    } else {
      _tpRestartAnimationIfNeeded();
    }
  });
  document.getElementById('tpBounceSpeed').addEventListener('input', function() {
    tpBounceSpeed = parseInt(this.value);
    document.getElementById('tpBounceSpeedVal').textContent = this.value + '%';
  });

  // Green cross outline (crosshair + outer border)
  document.getElementById('tpCrossToggle').addEventListener('change', function() {
    tpCrossOn = this.checked;
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

  document.getElementById('tpExportPngPerScreen').addEventListener('click', function() {
    hamburgerMenu.classList.remove('open');
    exportRasterScreensPng();
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

  document.getElementById('tpRasterFileInput').addEventListener('change', function(e) {
    tpImportRasterFile(e);
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
    syncTpDisplaySizeButtons();
    scheduleDimensionRedraw();
  });

  totalHInput.addEventListener('input', function() {
    var val = Math.max(1, parseInt(this.value) || 1);
    tpDisplayH = Math.round(val / tpDisplaysHigh);
    dispH.value = tpDisplayH;
    syncTpDisplaySizeButtons();
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
  var _tpTextInputIds = ['tpImageName', 'tpDisplayW', 'tpDisplayH', 'tpTotalW', 'tpTotalH'];
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
    'tpLogoMode', 'tpDisplaysWide', 'tpDisplaysHigh', 'tpSweepFps'];
  _tpSelectIds.forEach(function(id) {
    var el = document.getElementById(id);
    if(el) el.addEventListener('focus', function() { tpSaveState(); });
  });
}

function updateTotalSize() {
  var totalW = _tpTotalSize().w;
  var totalH = _tpTotalSize().h;
  var totalWEl = document.getElementById('tpTotalW');
  var totalHEl = document.getElementById('tpTotalH');
  if(totalWEl) totalWEl.value = totalW;
  if(totalHEl) totalHEl.value = totalH;
}

// Display-size preset buttons (UHD/DCI/HD set the display size; Custom clears it)
function setTpDisplaySizePreset(preset) {
  var wEl = document.getElementById('tpDisplayW');
  var hEl = document.getElementById('tpDisplayH');
  if(!wEl || !hEl) return;
  if(preset === 'custom') {
    wEl.value = '';
    hEl.value = '';
    syncTpDisplaySizeButtons();
    return;
  }
  if(preset === '4K_UHD') { tpDisplayW = 3840; tpDisplayH = 2160; }
  else if(preset === '4K_DCI') { tpDisplayW = 4096; tpDisplayH = 2160; }
  else if(preset === 'HD') { tpDisplayW = 1920; tpDisplayH = 1080; }
  wEl.value = tpDisplayW;
  hEl.value = tpDisplayH;
  updateTotalSize();
  syncTpDisplaySizeButtons();
  scheduleDimensionRedraw();
}

function syncTpDisplaySizeButtons() {
  var group = document.querySelector('.tp-size-presets');
  if(!group) return;
  var wEl = document.getElementById('tpDisplayW');
  var match = 'custom';
  if(wEl && wEl.value === '') {
    match = 'custom';
  } else if(tpDisplayW === 3840 && tpDisplayH === 2160) {
    match = '4K_UHD';
  } else if(tpDisplayW === 4096 && tpDisplayH === 2160) {
    match = '4K_DCI';
  } else if(tpDisplayW === 1920 && tpDisplayH === 1080) {
    match = 'HD';
  }
  group.querySelectorAll('[data-size]').forEach(function(b) {
    b.classList.toggle('active', b.dataset.size === match);
  });
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
      _tpBounceInit = false; // re-seed the bounce with the new logo's aspect ratio
      scheduleTestPatternRedraw();
    };
    img.onerror = function() {
      showAlert('Failed to load logo image.');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// --- DVD Bounce Logo --- (shares the Logo Options image + size)

function _tpBounceImg() {
  return tpLogoImage || _tpBounceDefaultImg;
}

function _tpBounceDims(img, totalW, totalH) {
  var minDim = Math.min(totalW, totalH);
  var logoH = minDim * (0.05 + (tpLogoSizePct / 100) * 0.30);
  var logoW = logoH * (img.width / img.height);
  return { w: logoW, h: logoH };
}

function drawTPBounceLogo(ctx, w, h) {
  var img = _tpBounceImg();
  if(!img || !img.width) return;
  var d = _tpBounceDims(img, w, h);
  ctx.drawImage(img, _tpBounceX, _tpBounceY, d.w, d.h);
}

// Lazy-load the bundled BLINK icon as the default bounce logo (same-origin).
function _tpEnsureBounceDefault(cb) {
  if(_tpBounceDefaultImg || tpLogoImage) { if(cb) cb(); return; }
  var img = new Image();
  img.onload = function() { _tpBounceDefaultImg = img; if(cb) cb(); };
  img.onerror = function() { if(cb) cb(); };
  img.src = 'icons/icon-512.png';
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

  var totalW = _tpTotalSize().w;
  var totalH = _tpTotalSize().h;

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

  if(!tpScrollOn) {
    _tpComposeFrame(ctx, totalW, totalH);
    return;
  }

  // Diagonal scroll: compose once to a full-res offscreen buffer, then tile-blit it
  // across a 2x2 neighborhood at the animated offset so the wrap seam is always covered.
  if(!_tpScrollBuffer) _tpScrollBuffer = document.createElement('canvas');
  if(_tpScrollBuffer.width !== totalW || _tpScrollBuffer.height !== totalH) {
    _tpScrollBuffer.width = totalW;
    _tpScrollBuffer.height = totalH;
  }
  var bctx = _tpScrollBuffer.getContext('2d');
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  _tpComposeFrame(bctx, totalW, totalH);

  var ox = ((_tpScrollOffsetX % totalW) + totalW) % totalW;
  var oy = ((_tpScrollOffsetY % totalH) + totalH) % totalH;
  for(var dx = -1; dx <= 0; dx++) {
    for(var dy = -1; dy <= 0; dy++) {
      ctx.drawImage(_tpScrollBuffer, ox + dx * totalW, oy + dy * totalH);
    }
  }
}

// Composite the full pattern (background + all layers + fixed top layers) into ctx
// at full pattern dimensions. Caller applies any preview scaling to ctx beforehand.
function _tpComposeFrame(ctx, totalW, totalH) {
  if(tpRaster) {
    _tpComposeRasterFrame(ctx, totalW, totalH);
    return;
  }
  _tpDrawLayerStack(ctx, totalW, totalH);
}

// One complete pattern at the given size: background, the reorderable layers,
// then the fixed top layers. Drawn once for the whole canvas in classic mode,
// or once per screen in per-screen raster mode.
function _tpDrawLayerStack(ctx, w, h) {
  // 1. Background (fixed — always first)
  drawTPBackground(ctx, w, h);

  // 2. Reorderable layers
  var gridSpacing = calcGridSpacing(w, h);
  for(var i = 0; i < tpLayerOrder.length; i++) {
    var layer = _tpLayerRegistry[tpLayerOrder[i]];
    if(layer) layer.draw(ctx, w, h, gridSpacing);
  }

  // 3. Fixed top layers (always last)
  if(tpGridSizePct > 0) {
    drawTPCoordinateLabels(ctx, w, h, gridSpacing);
  }
  drawTPCenterText(ctx, w, h, gridSpacing);
}

// Every screen's slice rectangles, flattened — the exact lit LED area.
function _tpRasterAllRects() {
  var all = [];
  if(!tpRaster) return all;
  for(var i = 0; i < tpRaster.screens.length; i++) {
    all = all.concat(tpRaster.screens[i].rects);
  }
  return all;
}

// Clip ctx to a list of rectangles in the current coordinate space. An empty
// list is left alone so a malformed raster can never blank the whole frame.
function _tpClipToRects(ctx, rects) {
  if(!rects || rects.length === 0) return;
  ctx.beginPath();
  for(var i = 0; i < rects.length; i++) {
    ctx.rect(rects[i].x, rects[i].y, rects[i].w, rects[i].h);
  }
  ctx.clip();
}

// Compose onto an imported raster. Both modes paint the background across the
// whole canvas first, so the gaps between screens and any deleted-panel holes
// stay background colour, then clip the pattern to the real LED shape.
function _tpComposeRasterFrame(ctx, totalW, totalH) {
  drawTPBackground(ctx, totalW, totalH);

  if(tpRasterMode === 'perScreen') {
    // Each screen gets its own self-contained pattern, named after the screen
    for(var i = 0; i < tpRaster.screens.length; i++) {
      var scr = tpRaster.screens[i];
      ctx.save();
      _tpClipToRects(ctx, scr.rects);   // clip in canvas space, before translating
      ctx.translate(scr.x, scr.y);
      _tpScreenNameOverride = scr.name;
      _tpDrawLayerStack(ctx, scr.w, scr.h);
      _tpScreenNameOverride = null;
      ctx.restore();
    }
    return;
  }

  // Whole canvas: one continuous pattern, each screen a window onto it
  ctx.save();
  _tpClipToRects(ctx, _tpRasterAllRects());
  _tpDrawLayerStack(ctx, totalW, totalH);
  ctx.restore();
}

// Outline every screen's real LED shape in the boundary colour — the raster
// stand-in for the uniform display grid.
function drawTPRasterBoundaries(ctx) {
  ctx.strokeStyle = tpBoundaryColor;
  ctx.lineWidth = Math.max(2, Math.round(tpRaster.width / 400));
  ctx.setLineDash([]);
  var rects = _tpRasterAllRects();
  for(var i = 0; i < rects.length; i++) {
    ctx.strokeRect(rects[i].x, rects[i].y, rects[i].w, rects[i].h);
  }
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
  // Each processor drives one display, so processor boundaries fall on display edges
  var cw = tpDisplayW;
  var ch = tpDisplayH;

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

  // 4 small circles in corners — edge touches screen edge
  var smallRadius = Math.min(w, h) * 0.15;
  var inset = smallRadius;
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
  if(tpShowName) lines.push({ text: _tpScreenNameOverride || tpImageName, font: 'bold ' + nameFontSize + 'px "Roboto Condensed", sans-serif', size: nameFontSize, isName: true });
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

// Full-screen SMPTE test pattern: 7 color bars, castellation strip, then a
// grayscale staircase (left) + rainbow gradient (right) along the bottom.
function drawTPSmpteFullscreen(ctx, w, h) {
  var barW = w / 7;

  // Top: main color bars (~65% height)
  var row1H = h * 0.65;
  var row1Colors = ['#BFBFBF', '#BFBF00', '#00BFBF', '#00BF00', '#BF00BF', '#BF0000', '#0000BF'];
  for(var i = 0; i < 7; i++) {
    ctx.fillStyle = row1Colors[i];
    ctx.fillRect(Math.floor(i * barW), 0, Math.ceil(barW), Math.ceil(row1H));
  }

  // Castellation strip (~12%)
  var row2Y = row1H;
  var row2H = h * 0.12;
  var row2Colors = ['#0000BF', '#131313', '#BF00BF', '#131313', '#00BFBF', '#131313', '#BFBFBF'];
  for(var i = 0; i < 7; i++) {
    ctx.fillStyle = row2Colors[i];
    ctx.fillRect(Math.floor(i * barW), Math.floor(row2Y), Math.ceil(barW), Math.ceil(row2H));
  }

  // Bottom (~23%): grayscale staircase (left) + rainbow gradient (right)
  var row3Y = row2Y + row2H;
  var row3H = h - row3Y;
  var leftW = w * 0.55;
  var steps = 8;
  var stepW = leftW / steps;
  for(var i = 0; i < steps; i++) {
    var v = Math.round((i / (steps - 1)) * 255);
    ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
    ctx.fillRect(Math.floor(i * stepW), Math.floor(row3Y), Math.ceil(stepW), Math.ceil(row3H));
  }
  var rainbow = ctx.createLinearGradient(leftW, 0, w, 0);
  var stops = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#8b00ff'];
  for(var i = 0; i < stops.length; i++) {
    rainbow.addColorStop(i / (stops.length - 1), stops[i]);
  }
  ctx.fillStyle = rainbow;
  ctx.fillRect(Math.floor(leftW), Math.floor(row3Y), Math.ceil(w - leftW), Math.ceil(row3H));
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
    var inset = smallRadius;
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

    if(tpColorBarsMode === 'corners-center') {
      // Default bar in center + color bars in corner circles
      var barsTop = h * 0.54;
      var totalBarsW = w * 0.5;
      var barsX = (w - totalBarsW) / 2;
      var totalBarsH = h * 0.17;
      drawTPColorBarsAt(ctx, barsX, barsTop, totalBarsW, totalBarsH);
      for(var i = 0; i < corners.length; i++) {
        drawTPColorBarsInCircle(ctx, corners[i][0], corners[i][1], smallRadius, cornerAngle);
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
  var logoImg = tpLogoImage || _tpBounceDefaultImg;
  if(!logoImg) return;
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
  var logoW = logoH * (logoImg.width / logoImg.height);
  // If wider than diameter, fit by width instead
  if(logoW > d * scale) {
    logoW = d * scale;
    logoH = logoW * (logoImg.height / logoImg.width);
  }
  var lx = cx - logoW / 2;
  var ly = cy - logoH / 2;
  ctx.drawImage(logoImg, lx, ly, logoW, logoH);
  ctx.restore();
}

function drawTPLogo(ctx, w, h) {
  var logoImg = tpLogoImage || _tpBounceDefaultImg;
  if(!logoImg) return;

  if(tpLogoMode === 'default') {
    var minDim = Math.min(w, h);
    var scale = 0.05 + (tpLogoSizePct / 100) * 0.45; // 5% to 50% of smaller dimension
    var logoH = minDim * scale;
    var logoW = logoH * (logoImg.width / logoImg.height);

    // Bottom-right corner with padding
    var pad = Math.round(Math.min(w, h) * 0.03);
    var lx = w - logoW - pad;
    var ly = h - logoH - pad;

    ctx.drawImage(logoImg, lx, ly, logoW, logoH);
  } else {
    // Circle positions must match drawTPCircles exactly
    var centerX = w / 2;
    var centerY = h / 2;
    var bigRadius = h / 2;
    var smallRadius = Math.min(w, h) * 0.15;
    var inset = smallRadius;
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
  return tpCircleSpinMode !== 'static' || tpCircleRevMode !== 'none'
      || tpStrobeOn || tpScrollOn || (tpBounceOn && tpLogoOn);
}

// Strobe phase (0/1) at elapsed time t — shared by the live loop and MP4 export.
// Fixed 50% duty; intensity drives the overlay opacity in the strobe layer instead.
function _tpStrobePhaseAt(t) {
  var hz = 1 + (tpStrobeSpeed / 100) * 19; // 1..20 Hz
  var period = 1 / hz;
  var phasePos = (t % period) / period; // 0..1
  return phasePos < 0.5 ? 1 : 0;
}

function _tpScrollPxPerSec() {
  var totalW = _tpTotalSize().w;
  var totalH = _tpTotalSize().h;
  return (tpScrollSpeed / 100) * Math.min(totalW, totalH) * 0.5;
}

// Advance the bouncing logo by dt seconds, reflecting off the four edges.
function _tpStepBounce(dt) {
  var totalW = _tpTotalSize().w;
  var totalH = _tpTotalSize().h;
  var img = _tpBounceImg();
  if(!img || !img.width) return;
  var d = _tpBounceDims(img, totalW, totalH);
  if(!_tpBounceInit) {
    _tpBounceX = (totalW - d.w) / 2;
    _tpBounceY = (totalH - d.h) / 2;
    if(_tpBounceVX === 0) _tpBounceVX = 1;
    if(_tpBounceVY === 0) _tpBounceVY = 1;
    _tpBounceInit = true;
  }
  var spd = (tpBounceSpeed / 100) * Math.min(totalW, totalH) * 0.4; // px/sec
  _tpBounceX += dt * spd * _tpBounceVX;
  _tpBounceY += dt * spd * _tpBounceVY;
  if(_tpBounceX <= 0) { _tpBounceX = 0; _tpBounceVX = 1; }
  else if(_tpBounceX + d.w >= totalW) { _tpBounceX = totalW - d.w; _tpBounceVX = -1; }
  if(_tpBounceY <= 0) { _tpBounceY = 0; _tpBounceVY = 1; }
  else if(_tpBounceY + d.h >= totalH) { _tpBounceY = totalH - d.h; _tpBounceVY = -1; }
}

// Advance strobe/scroll/bounce deterministically for an MP4 export frame.
function _tpAdvanceExportExtras(frameTime, fps) {
  if(tpStrobeOn) _tpStrobePhase = _tpStrobePhaseAt(frameTime);
  if(tpScrollOn) {
    var sp = _tpScrollPxPerSec();
    _tpScrollOffsetX = frameTime * sp;
    _tpScrollOffsetY = frameTime * sp;
  }
  if(tpBounceOn) _tpStepBounce(1 / fps);
}

function _tpNeedsVideoExport() {
  return tpSweepOn || _tpNeedsAnimation();
}

function _tpUpdateExportBtn() {
  // No-op: hamburger menu always shows both Export PNG and Export MP4
}

// --- Native Share ---

// Quick Share is explicitly a share action, so it still reaches for the share
// sheet first; when that is unavailable it falls back to the shared save ladder.
function _tpNativeShare(blob, filename, mimeType) {
  var file = new File([blob], filename, { type: mimeType });
  if(navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file] }).catch(function() {
      // Share failed (e.g., user gesture expired after async rendering) — save instead
      saveBlobToDevice(blob, filename, { mimeType: mimeType });
    });
    return;
  }
  saveBlobToDevice(blob, filename, { mimeType: mimeType });
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

    saveBlobToDevice(blob, filename, { mimeType: 'image/png', description: 'PNG Image' });
  }, 'image/png');

  // Restore preview resolution
  renderTestPattern(false);
}

// --- Per-Screen PNG Export ---

// Filename-safe screen names with the pixel size appended. Colliding names get
// their screen number added, the convention export-all.js already uses.
function _tpScreenFileNames() {
  var used = {};
  return tpRaster.screens.map(function(scr, i) {
    var base = scr.name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'Screen';
    var key = base.toLowerCase();
    if(used[key]) base = base + ' ' + (i + 1);
    used[key] = true;
    return base + '_' + scr.w + 'x' + scr.h + '.png';
  });
}

// One PNG per screen at its native resolution, zipped. Composes the raster once
// at full resolution into an offscreen canvas and crops each screen out of it —
// the same crop the split Live Out windows use, so the two always agree.
async function exportRasterScreensPng() {
  if(!tpRaster) { showAlert('Import a raster first.'); return; }
  if(typeof JSZip === 'undefined') {
    showAlert('ZIP library not loaded. Check your connection and reload.');
    return;
  }

  if(tpRaster.width * tpRaster.height > 67108864) {
    showAlert('Warning: Very large raster (' + tpRaster.width + 'x' + tpRaster.height
      + '). Export may be slow or fail on some devices.');
  }

  // targetCanvas keeps #tpCanvas at its preview size, so no restore is needed
  var offscreen = document.createElement('canvas');
  renderTestPattern(true, offscreen);

  var names = _tpScreenFileNames();
  var blobs = await Promise.all(tpRaster.screens.map(function(scr) {
    var c = document.createElement('canvas');
    c.width = scr.w;
    c.height = scr.h;
    c.getContext('2d').drawImage(offscreen, scr.x, scr.y, scr.w, scr.h, 0, 0, scr.w, scr.h);
    return new Promise(function(resolve) { c.toBlob(resolve, 'image/png'); });
  }));

  var zip = new JSZip();
  var added = 0;
  blobs.forEach(function(blob, i) {
    if(blob) { zip.file(names[i], blob); added++; }
  });
  if(added === 0) { showAlert('Failed to create images. Please try again.'); return; }

  var safeName = tpImageName.replace(/[<>:"/\\|?*]/g, '_').trim() || 'testpattern';
  var zipBlob = await zip.generateAsync({ type: 'blob' });
  await saveBlobToDevice(zipBlob, safeName + '_screens.zip', {
    mimeType: 'application/zip',
    description: 'ZIP Archive',
    accept: { 'application/zip': ['.zip'] }
  });
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

// Single entry point for the sweep overlay — used by the layer registry and both export paths.
function drawTPSweepFrame(ctx, w, h, t) {
  if(tpSweepStyle === 'default') {
    drawTPSweep(ctx, w, h, t);
    drawTPSweepVertical(ctx, w, h, t);
  } else {
    drawTPSweepStyled(ctx, w, h, t);
  }
}

// Non-default sweep styles: single band, colour blends from tpSweepColor (leading edge)
// through tpSweepColorV (tail) and fades to transparent.
function drawTPSweepStyled(ctx, w, h, t) {
  var head = _tpParseSweepRGB(tpSweepColor);
  var tail = _tpParseSweepRGB(tpSweepColorV);

  if(tpSweepStyle === 'horizontal' || tpSweepStyle === 'vertical') {
    var vertical = (tpSweepStyle === 'vertical');
    var dim = vertical ? h : w;
    var bandWidth = dim * (tpSweepWidthPct / 100);
    var tailLength = bandWidth * 2;
    var totalSpan = bandWidth + tailLength;

    var totalTravel = dim + 2 * totalSpan;
    var sweepFront = -totalSpan + t * totalTravel;
    var gradStart = sweepFront - totalSpan;

    var grad = vertical
      ? ctx.createLinearGradient(0, gradStart, 0, sweepFront)
      : ctx.createLinearGradient(gradStart, 0, sweepFront, 0);
    var tailStop = tailLength / totalSpan;
    grad.addColorStop(0, 'rgba(' + tail.r + ',' + tail.g + ',' + tail.b + ',0)');
    grad.addColorStop(tailStop, 'rgba(' + tail.r + ',' + tail.g + ',' + tail.b + ',0.6)');
    grad.addColorStop(1, 'rgba(' + head.r + ',' + head.g + ',' + head.b + ',0.6)');

    ctx.save();
    ctx.fillStyle = grad;
    if(vertical) ctx.fillRect(0, gradStart, w, totalSpan);
    else ctx.fillRect(gradStart, 0, totalSpan, h);
    ctx.restore();
    return;
  }

  var cx = w / 2;
  var cy = h / 2;
  var maxR = Math.sqrt(cx * cx + cy * cy);

  if(tpSweepStyle === 'radar') {
    var bandArc = 2 * Math.PI * (tpSweepWidthPct / 100);
    var tailArc = bandArc * 2;
    var totalArc = bandArc + tailArc;
    var headAngle = -Math.PI / 2 + t * 2 * Math.PI;
    var slices = 96;
    // Overlap by ~1px at the outer rim: enough to hide seams between wedges,
    // small enough that the double-blended sliver is invisible.
    var overlap = 1 / maxR;

    ctx.save();
    for(var i = 0; i < slices; i++) {
      // frac: 1 at the leading edge, 0 at the end of the tail
      var frac = 1 - (i / slices);
      var a0 = headAngle - totalArc * ((i + 1) / slices);
      var a1 = headAngle - totalArc * (i / slices) + overlap;
      // Full opacity across the band, ramping to transparent along the tail
      var bandFrac = bandArc / totalArc;
      var alpha = frac >= (1 - bandFrac) ? 0.6 : 0.6 * (frac / (1 - bandFrac));
      var r = Math.round(tail.r + (head.r - tail.r) * frac);
      var g = Math.round(tail.g + (head.g - tail.g) * frac);
      var b = Math.round(tail.b + (head.b - tail.b) * frac);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if(tpSweepStyle === 'circle') {
    var cBand = maxR * (tpSweepWidthPct / 100);
    var cTail = cBand * 2;
    var cSpan = cBand + cTail;
    var front = -cSpan + t * (maxR + 2 * cSpan);
    if(front <= 0) return;

    var innerStop = Math.max(0, Math.min(1, (front - cSpan) / front));
    var bandStop = Math.max(0, Math.min(1, (front - cBand) / front));

    var cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, front);
    cGrad.addColorStop(innerStop, 'rgba(' + tail.r + ',' + tail.g + ',' + tail.b + ',0)');
    cGrad.addColorStop(bandStop, 'rgba(' + tail.r + ',' + tail.g + ',' + tail.b + ',0.6)');
    cGrad.addColorStop(1, 'rgba(' + head.r + ',' + head.g + ',' + head.b + ',0.6)');

    // Clip to the ring's outer radius — a radial gradient extends its last stop
    // past that radius and would otherwise flood the whole canvas.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, front, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = cGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

function _tpParseSweepRGB(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
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

    if(tpCircleSpinMode !== 'static' || tpCircleRevMode !== 'none') {
      // Accumulate angle positively; direction applied per-circle at draw time
      _tpCircleAngle += dt * (2 * Math.PI / 5) * (tpCircleSpinSpeed / 100);
    }

    if(tpStrobeOn) {
      _tpStrobePhase = _tpStrobePhaseAt(elapsed);
    }

    if(tpScrollOn) {
      var scrollSp = _tpScrollPxPerSec();
      _tpScrollOffsetX += dt * scrollSp;
      _tpScrollOffsetY += dt * scrollSp;
    }

    if(tpBounceOn) {
      _tpStepBounce(dt);
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

  var totalW = _tpTotalSize().w;
  var totalH = _tpTotalSize().h;
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
  var savedStrobePhase = _tpStrobePhase;
  var savedScrollX = _tpScrollOffsetX, savedScrollY = _tpScrollOffsetY;
  var savedBounceX = _tpBounceX, savedBounceY = _tpBounceY;
  var savedBounceVX = _tpBounceVX, savedBounceVY = _tpBounceVY, savedBounceInit = _tpBounceInit;
  // Start animated extras from a clean state for a reproducible export loop
  _tpScrollOffsetX = 0; _tpScrollOffsetY = 0; _tpBounceInit = false;

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
        _tpAdvanceExportExtras(frameTime, fps);
        renderTestPattern(true);
      } else {
        // Static bg + sweep overlay only
        ctx.putImageData(bgImageData, 0, 0);
        drawTPSweepFrame(ctx, totalW, totalH, t);
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
  _tpStrobePhase = savedStrobePhase;
  _tpScrollOffsetX = savedScrollX; _tpScrollOffsetY = savedScrollY;
  _tpBounceX = savedBounceX; _tpBounceY = savedBounceY;
  _tpBounceVX = savedBounceVX; _tpBounceVY = savedBounceVY; _tpBounceInit = savedBounceInit;
  _tpIsRecording = false;
  mp4Label.textContent = 'Export MP4';
  mp4Btn.disabled = false;
  renderTestPattern(false);
  _tpRestartAnimationIfNeeded();
}

// Returns test pattern PNG as a Blob (for Export All), or calls callback(null) if not initialized.
function getTestPatternPngBlob(callback) {
  if(typeof _tpInitialized === 'undefined' || !_tpInitialized) { callback(null); return; }
  var canvas = document.getElementById('tpCanvas');
  if(!canvas || canvas.width === 0) { callback(null); return; }
  renderTestPattern(true);
  canvas.toBlob(function(blob) { callback(blob); }, 'image/png');
}

// Returns test pattern MP4 as a Blob (for Export All), or calls callback(null) if not available.
// Same encoding logic as exportTestPatternVideo() but returns blob instead of downloading.
async function getTestPatternMp4Blob(callback) {
  if(typeof _tpInitialized === 'undefined' || !_tpInitialized) { callback(null); return; }
  if(typeof VideoEncoder === 'undefined' || typeof Mp4Muxer === 'undefined') { callback(null); return; }
  if(_tpIsRecording) { callback(null); return; }

  var canvas = document.getElementById('tpCanvas');
  if(!canvas || canvas.width === 0) { callback(null); return; }

  var totalW = _tpTotalSize().w;
  var totalH = _tpTotalSize().h;
  var fps = tpSweepFps;
  var duration = tpSweepDuration;
  var totalFrames = Math.round(fps * duration);
  var hasSpinning = _tpNeedsAnimation();

  _tpStopAnimation();
  canvas.width = totalW;
  canvas.height = totalH;
  _tpIsRecording = true;

  var savedSweepProgress = _tpSweepProgress;
  var savedCircleAngle = _tpCircleAngle;
  var savedStrobePhase = _tpStrobePhase;
  var savedScrollX = _tpScrollOffsetX, savedScrollY = _tpScrollOffsetY;
  var savedBounceX = _tpBounceX, savedBounceY = _tpBounceY;
  var savedBounceVX = _tpBounceVX, savedBounceVY = _tpBounceVY, savedBounceInit = _tpBounceInit;
  _tpScrollOffsetX = 0; _tpScrollOffsetY = 0; _tpBounceInit = false;

  try {
    var ctx = canvas.getContext('2d');
    var bgImageData = null;

    if(!hasSpinning) {
      var savedSweepOn = tpSweepOn;
      tpSweepOn = false;
      renderTestPattern(true);
      tpSweepOn = savedSweepOn;
      bgImageData = ctx.getImageData(0, 0, totalW, totalH);
    }

    var pixels = totalW * totalH;
    var scaledBitrate = Math.min(80000000, Math.max(40000000, Math.round(pixels / (1920 * 1080) * 40000000)));
    var encoderConfig = null;
    var muxerCodec = 'avc';

    var h264Levels = [
      { codec: 'avc1.640028', maxPixels: 2097152 },
      { codec: 'avc1.640032', maxPixels: 8912896 },
      { codec: 'avc1.640034', maxPixels: 8912896 },
      { codec: 'avc1.64003C', maxPixels: 35651584 }
    ];
    var candidates = h264Levels.filter(function(l) { return l.maxPixels >= pixels; });
    if(candidates.length === 0) candidates = [h264Levels[h264Levels.length - 1]];

    for(var ci = 0; ci < candidates.length && !encoderConfig; ci++) {
      var accels = ['prefer-hardware', 'prefer-software'];
      for(var ai = 0; ai < accels.length && !encoderConfig; ai++) {
        var testConfig = { codec: candidates[ci].codec, width: totalW, height: totalH, bitrate: scaledBitrate, framerate: fps, hardwareAcceleration: accels[ai] };
        try { var support = await VideoEncoder.isConfigSupported(testConfig); if(support.supported) encoderConfig = support.config || testConfig; } catch(e) {}
      }
    }

    if(!encoderConfig) {
      var hevcCodecs = ['hvc1.1.6.L150.B0', 'hvc1.1.6.L153.B0', 'hvc1.1.6.L180.B0'];
      for(var hi = 0; hi < hevcCodecs.length && !encoderConfig; hi++) {
        var accels2 = ['prefer-hardware', 'prefer-software'];
        for(var ai2 = 0; ai2 < accels2.length && !encoderConfig; ai2++) {
          var hevcConfig = { codec: hevcCodecs[hi], width: totalW, height: totalH, bitrate: scaledBitrate, framerate: fps, hardwareAcceleration: accels2[ai2] };
          try { var hevcSupport = await VideoEncoder.isConfigSupported(hevcConfig); if(hevcSupport.supported) { encoderConfig = hevcSupport.config || hevcConfig; muxerCodec = 'hevc'; } } catch(e) {}
        }
      }
    }

    if(!encoderConfig) {
      var vp9Codecs = ['vp09.00.50.08', 'vp09.00.40.08', 'vp09.00.31.08'];
      for(var vi = 0; vi < vp9Codecs.length && !encoderConfig; vi++) {
        var accels3 = ['prefer-hardware', 'prefer-software'];
        for(var ai3 = 0; ai3 < accels3.length && !encoderConfig; ai3++) {
          var vp9Config = { codec: vp9Codecs[vi], width: totalW, height: totalH, bitrate: scaledBitrate, framerate: fps, hardwareAcceleration: accels3[ai3] };
          try { var vp9Support = await VideoEncoder.isConfigSupported(vp9Config); if(vp9Support.supported) { encoderConfig = vp9Support.config || vp9Config; muxerCodec = 'vp9'; } } catch(e) {}
        }
      }
    }

    if(!encoderConfig) throw new Error('Browser does not support encoding at ' + totalW + 'x' + totalH);

    var muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: muxerCodec, width: totalW, height: totalH },
      fastStart: 'in-memory'
    });

    var encodeError = null;
    var encoder = new VideoEncoder({
      output: function(chunk, meta) { muxer.addVideoChunk(chunk, meta); },
      error: function(e) { encodeError = e; }
    });
    encoderConfig.latencyMode = 'quality';
    encoder.configure(encoderConfig);

    var frameDurationUs = Math.round((1 / fps) * 1000000);
    var keyFrameInterval = Math.max(1, Math.round(fps));

    for(var i = 0; i < totalFrames; i++) {
      if(encodeError) throw encodeError;
      var t = i / totalFrames;
      var frameTime = i / fps;
      if(hasSpinning) {
        _tpCircleAngle = frameTime * (2 * Math.PI / 5) * (tpCircleSpinSpeed / 100);
        if(tpSweepOn) _tpSweepProgress = t;
        _tpAdvanceExportExtras(frameTime, fps);
        renderTestPattern(true);
      } else {
        ctx.putImageData(bgImageData, 0, 0);
        drawTPSweepFrame(ctx, totalW, totalH, t);
      }
      var vf = new VideoFrame(canvas, { timestamp: i * frameDurationUs, duration: frameDurationUs });
      encoder.encode(vf, { keyFrame: i % keyFrameInterval === 0 });
      vf.close();
      while(encoder.encodeQueueSize > 5) await new Promise(function(r) { setTimeout(r, 1); });
      if(i % 5 === 0) await new Promise(function(r) { setTimeout(r, 0); });
    }

    await encoder.flush();
    encoder.close();
    muxer.finalize();

    callback(new Blob([muxer.target.buffer], { type: 'video/mp4' }));

  } catch(err) {
    console.error('getTestPatternMp4Blob error:', err);
    callback(null);
  }

  _tpSweepProgress = savedSweepProgress;
  _tpCircleAngle = savedCircleAngle;
  _tpStrobePhase = savedStrobePhase;
  _tpScrollOffsetX = savedScrollX; _tpScrollOffsetY = savedScrollY;
  _tpBounceX = savedBounceX; _tpBounceY = savedBounceY;
  _tpBounceVX = savedBounceVX; _tpBounceVY = savedBounceVY; _tpBounceInit = savedBounceInit;
  _tpIsRecording = false;
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

  saveBlobToDevice(blob, filename, { mimeType: mimeType, description: 'Video' });
}
