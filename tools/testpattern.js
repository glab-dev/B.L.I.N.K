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
var tpTextSizePct = 50;
var tpShowName = true;
var tpShowPixelSize = true;
var tpShowAspectRatio = true;
var tpShowSquareCount = true;
var tpLogoOn = false;
var tpLogoImage = null;
var tpLogoSizePct = 50;
var tpSweepOn = false;
var tpSweepColor = '#ffffff';
var tpSweepDuration = 3;
var tpSweepWidthPct = 8;
var tpSweepFps = 60;
var _tpSweepProgress = 0;
var _tpSweepAnimId = null;
var _tpSweepStartTime = null;
var _tpIsRecording = false;
var _tpRafId = null;
var _tpInitialized = false;

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
  scheduleTestPatternRedraw();
}

function exitTestPatternMode() {
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
  tpCirclesOn = true; tpColorBarsOn = true;
  tpTextSizePct = 50;
  tpShowName = true; tpShowPixelSize = true;
  tpShowAspectRatio = true; tpShowSquareCount = true;
  tpLogoOn = false; tpLogoImage = null; tpLogoSizePct = 50;
  tpSweepOn = false; tpSweepColor = '#ffffff';
  tpSweepDuration = 3; tpSweepWidthPct = 8;
  tpSweepFps = 60;

  // Stop sweep preview if running
  stopSweepPreview();

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
  document.getElementById('tpCircles').checked = true;
  document.getElementById('tpColorBars').checked = true;
  document.getElementById('tpShowName').checked = true;
  document.getElementById('tpShowPixelSize').checked = true;
  document.getElementById('tpShowAspectRatio').checked = true;
  document.getElementById('tpShowSquareCount').checked = true;
  document.getElementById('tpLogoToggle').checked = false;
  document.getElementById('tpLogoControls').style.display = 'none';
  document.getElementById('tpLogoSize').value = 50;
  document.getElementById('tpLogoSizeVal').textContent = '50%';
  document.getElementById('tpLogoSizeLabel').style.display = 'none';
  document.getElementById('tpLogoSize').style.display = 'none';
  document.getElementById('tpLogoFile').value = '';
  document.getElementById('tpSweep').checked = false;
  document.getElementById('tpSweepControls').style.display = 'none';
  document.getElementById('tpSweepDuration').value = 3;
  document.getElementById('tpSweepDurationVal').textContent = '3s';
  document.getElementById('tpSweepWidth').value = 8;
  document.getElementById('tpSweepWidthVal').textContent = '8%';
  document.getElementById('tpSweepColor').value = '#ffffff';
  document.getElementById('tpSweepFps').value = '60';
  document.getElementById('tpSaveBtn').textContent = 'Export PNG';

  updateTotalSize();
  scheduleTestPatternRedraw();
}

// --- Control Binding ---

function initTestPatternControls() {
  if(_tpInitialized) return;
  _tpInitialized = true;

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
  var saveBtn = document.getElementById('tpSaveBtn');

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

  circlesToggle.addEventListener('change', function() {
    tpCirclesOn = this.checked;
    scheduleTestPatternRedraw();
  });

  colorBarsToggle.addEventListener('change', function() {
    tpColorBarsOn = this.checked;
    scheduleTestPatternRedraw();
  });

  logoToggle.addEventListener('change', function() {
    tpLogoOn = this.checked;
    var logoControls = document.getElementById('tpLogoControls');
    if(logoControls) logoControls.style.display = this.checked ? 'flex' : 'none';
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

  saveBtn.addEventListener('click', function() {
    exportTestPattern();
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
    var controls = document.getElementById('tpSweepControls');
    if(controls) controls.style.display = this.checked ? 'flex' : 'none';
    saveBtn.textContent = tpSweepOn ? 'Export MP4' : 'Export PNG';
    if(tpSweepOn) {
      startSweepPreview();
    } else {
      stopSweepPreview();
      scheduleTestPatternRedraw();
    }
  });

  sweepDuration.addEventListener('input', function() {
    tpSweepDuration = parseInt(this.value) || 3;
    document.getElementById('tpSweepDurationVal').textContent = this.value + 's';
  });

  sweepWidth.addEventListener('input', function() {
    tpSweepWidthPct = parseInt(this.value) || 15;
    document.getElementById('tpSweepWidthVal').textContent = this.value + '%';
  });

  sweepColor.addEventListener('input', function() {
    tpSweepColor = this.value;
  });

  document.getElementById('tpSweepFps').addEventListener('change', function() {
    tpSweepFps = parseFloat(this.value) || 60;
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
      var logoSizeLabel = document.getElementById('tpLogoSizeLabel');
      var logoSizeRange = document.getElementById('tpLogoSize');
      if(logoSizeLabel) logoSizeLabel.style.display = '';
      if(logoSizeRange) logoSizeRange.style.display = '';
      scheduleTestPatternRedraw();
    };
    img.onerror = function() {
      showAlert('Failed to load logo image.');
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

function renderTestPattern(forExport) {
  var canvas = document.getElementById('tpCanvas');
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

  // 1. Background fill
  ctx.fillStyle = tpBgColor;
  ctx.fillRect(0, 0, totalW, totalH);

  // 2. Grid (skip if size or width slider at 0)
  var gridSpacing = calcGridSpacing(totalW, totalH);
  if(tpGridSizePct > 0 && tpGridWidthPct > 0) {
    drawTPGrid(ctx, totalW, totalH, gridSpacing);
  }

  // 3. Display boundaries
  if(tpDisplaysWide > 1 || tpDisplaysHigh > 1) {
    drawTPDisplayBoundaries(ctx, totalW, totalH);
  }

  // 4. Circles
  if(tpCirclesOn) {
    drawTPCircles(ctx, totalW, totalH);
  }

  // 5. Coordinate labels (skip if no grid)
  if(tpGridSizePct > 0) {
    drawTPCoordinateLabels(ctx, totalW, totalH, gridSpacing);
  }

  // 6. Crosshair
  drawTPCrosshair(ctx, totalW, totalH);

  // 7. SMPTE Color bars (on top of grid + crosshair)
  if(tpColorBarsOn) {
    drawTPColorBars(ctx, totalW, totalH);
  }

  // 8. Center text
  drawTPCenterText(ctx, totalW, totalH, gridSpacing);

  // 9. Logo
  if(tpLogoOn && tpLogoImage) {
    drawTPLogo(ctx, totalW, totalH);
  }

  // 10. Outer border — tied to cross color
  ctx.strokeStyle = tpCrossColor;
  ctx.lineWidth = Math.max(2, Math.round(totalW / 500));
  ctx.strokeRect(0, 0, totalW, totalH);

  // 11. Sweep band (animated layer)
  if(tpSweepOn) {
    drawTPSweep(ctx, totalW, totalH, _tpSweepProgress);
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

function drawTPCircles(ctx, w, h) {
  ctx.strokeStyle = tpTextColor;
  ctx.lineWidth = Math.max(1, Math.round(w / 600));
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

function drawTPColorBars(ctx, w, h) {
  var barsTop = h * 0.54;
  var totalBarsW = w * 0.5;
  var barsX = (w - totalBarsW) / 2;
  var barW = totalBarsW / 7;

  // Row 1: Main 75% SMPTE color bars (tallest)
  var row1H = h * 0.12;
  var row1Colors = ['#BFBFBF', '#BFBF00', '#00BFBF', '#00BF00', '#BF00BF', '#BF0000', '#0000BF'];
  for(var i = 0; i < row1Colors.length; i++) {
    ctx.fillStyle = row1Colors[i];
    ctx.fillRect(Math.floor(barsX + i * barW), Math.floor(barsTop), Math.ceil(barW), Math.ceil(row1H));
  }

  // Row 2: Reverse castellations (thin)
  var row2Y = barsTop + row1H;
  var row2H = h * 0.015;
  var row2Colors = ['#0000BF', '#131313', '#BF00BF', '#131313', '#00BFBF', '#131313', '#BFBFBF'];
  for(var i = 0; i < row2Colors.length; i++) {
    ctx.fillStyle = row2Colors[i];
    ctx.fillRect(Math.floor(barsX + i * barW), Math.floor(row2Y), Math.ceil(barW), Math.ceil(row2H));
  }

  // Row 3: PLUGE pattern (bottom)
  var row3Y = row2Y + row2H;
  var row3H = h * 0.035;

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

function drawTPLogo(ctx, w, h) {
  if(!tpLogoImage) return;

  var minDim = Math.min(w, h);
  var scale = 0.05 + (tpLogoSizePct / 100) * 0.45; // 5% to 50% of smaller dimension
  var logoH = minDim * scale;
  var logoW = logoH * (tpLogoImage.width / tpLogoImage.height);

  // Bottom-right corner with padding
  var pad = Math.round(Math.min(w, h) * 0.03);
  var lx = w - logoW - pad;
  var ly = h - logoH - pad;

  ctx.drawImage(tpLogoImage, lx, ly, logoW, logoH);
}

// --- PNG Export ---

function exportTestPattern() {
  // Redirect to video export when sweep is enabled
  if(tpSweepOn) {
    exportTestPatternVideo();
    return;
  }

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
  var angle = Math.atan2(h, w);

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
  grad.addColorStop(tailStop, 'rgba(' + r + ',' + g + ',' + b + ',1)');
  grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',1)');

  ctx.fillStyle = grad;
  ctx.fillRect(gradStart, -diag, totalSpan, diag * 2);
  ctx.restore();
}

// --- Sweep Preview Animation ---

function startSweepPreview() {
  stopSweepPreview();
  _tpSweepStartTime = performance.now();

  function animate(now) {
    var elapsed = (now - _tpSweepStartTime) / 1000;
    _tpSweepProgress = (elapsed % tpSweepDuration) / tpSweepDuration;
    renderTestPattern(false);
    _tpSweepAnimId = requestAnimationFrame(animate);
  }

  _tpSweepAnimId = requestAnimationFrame(animate);
}

function stopSweepPreview() {
  if(_tpSweepAnimId) {
    cancelAnimationFrame(_tpSweepAnimId);
    _tpSweepAnimId = null;
  }
  _tpSweepStartTime = null;
  _tpSweepProgress = 0;
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
  var totalFrames = Math.round(fps * tpSweepDuration);

  stopSweepPreview();
  canvas.width = totalW;
  canvas.height = totalH;

  _tpIsRecording = true;
  var saveBtn = document.getElementById('tpSaveBtn');
  var originalText = saveBtn.textContent;
  saveBtn.textContent = 'Encoding...';
  saveBtn.disabled = true;

  try {
    // Pre-render static background (everything except sweep)
    var savedSweepOn = tpSweepOn;
    tpSweepOn = false;
    renderTestPattern(true);
    tpSweepOn = savedSweepOn;
    var ctx = canvas.getContext('2d');
    var bgImageData = ctx.getImageData(0, 0, totalW, totalH);

    // Create muxer (H.264 in MP4 container)
    var muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: totalW,
        height: totalH
      },
      fastStart: 'in-memory'
    });

    // Create encoder (H.264 High profile, 8-bit 4:2:0)
    var encodeError = null;
    var encoder = new VideoEncoder({
      output: function(chunk, meta) {
        muxer.addVideoChunk(chunk, meta);
      },
      error: function(e) {
        encodeError = e;
      }
    });

    encoder.configure({
      codec: 'avc1.640028',
      width: totalW,
      height: totalH,
      bitrate: 25000000,
      framerate: fps
    });

    var frameDurationUs = Math.round((1 / fps) * 1000000);
    var keyFrameInterval = Math.max(1, Math.round(fps * 2));

    for(var i = 0; i < totalFrames; i++) {
      if(encodeError) throw encodeError;

      var t = i / totalFrames;
      ctx.putImageData(bgImageData, 0, 0);
      drawTPSweep(ctx, totalW, totalH, t);

      var vf = new VideoFrame(canvas, {
        timestamp: i * frameDurationUs,
        duration: frameDurationUs
      });
      encoder.encode(vf, { keyFrame: i % keyFrameInterval === 0 });
      vf.close();

      // Update progress and yield to UI
      if(i % 5 === 0) {
        saveBtn.textContent = 'Encoding ' + Math.round((i / totalFrames) * 100) + '%';
        await new Promise(function(r) { setTimeout(r, 0); });
      }
    }

    await encoder.flush();
    encoder.close();
    muxer.finalize();

    var blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
    var safeName = tpImageName.replace(/[<>:"/\\|?*]/g, '_').trim() || 'testpattern';
    var filename = safeName + '_sweep_' + totalW + 'x' + totalH + '.mp4';
    downloadVideoBlob(blob, filename, 'video/mp4');

  } catch(err) {
    showAlert('Video export failed: ' + err.message);
    console.error('Export error:', err);
  }

  _tpIsRecording = false;
  saveBtn.textContent = originalText;
  saveBtn.disabled = false;
  renderTestPattern(false);
  startSweepPreview();
}

function downloadVideoBlob(blob, filename, mimeType) {
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
