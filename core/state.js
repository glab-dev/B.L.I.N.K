// ==================== STATE MANAGEMENT ====================
// Unit system, dimension modes, toggles, getters, and state helpers.
// Depends on globals: displayLengthUnit, displayWeightUnit, showArrowsEnabled,
// redundancyEnabled, use4WayBumpersEnabled, snapModeEnabled, cb5HalfRowEnabled,
// connectionMethod, xdPlacement, etc.

// Unit conversion constants
const FT_TO_M = 0.3048;
const M_TO_FT = 3.28084;
const LBS_TO_KG = 0.453592;
const KG_TO_LBS = 2.20462;

// Unit system toggle function (Imperial = ft/lbs, Metric = m/kg)
function setUnitSystem(system) {
  const previousLengthUnit = displayLengthUnit;
  if(system === 'imperial') {
    displayLengthUnit = 'ft';
    displayWeightUnit = 'lbs';
  } else {
    displayLengthUnit = 'm';
    displayWeightUnit = 'kg';
  }
  
  // Update button states
  document.getElementById('unitImperial').classList.toggle('active', system === 'imperial');
  document.getElementById('unitMetric').classList.toggle('active', system === 'metric');

  // Re-express the wall size in the new unit so it keeps describing the same physical wall.
  // Without this the number stays put and changes meaning - 5 metres becomes 5 feet - which is
  // how a unit tap used to shrink the grid and take the bumpers that no longer fit with it.
  if(displayLengthUnit !== previousLengthUnit) {
    ['wallWidth', 'wallHeight'].forEach(function(id) {
      const el = document.getElementById(id);
      if(!el || !el.value) return;
      const v = parseFloat(el.value);
      if(!(v > 0)) return;
      el.value = fromMeters(toMeters(v, previousLengthUnit), displayLengthUnit).toFixed(2);
    });
    updateWallSizeUnitLabels();
    updateDimensionHints();
  }

  // Recalculate to update all displays
  calculate();

  // Update structure view weights
  if(bumpers.length > 0) {
    updatePickupWeightSummary();
  }

  // Sync unit preference to ALL screens (units are app-global, not per-screen)
  if(typeof screens !== 'undefined') {
    Object.keys(screens).forEach(function(id) {
      if(screens[id].data) {
        screens[id].data.lengthUnit = displayLengthUnit;
        screens[id].data.weightUnit = displayWeightUnit;
      }
    });
  }
}

// Unit toggle functions (kept for compatibility)
function setLengthUnit(unit) {
  displayLengthUnit = unit;
  
  // Update button states if elements exist
  const unitImperial = document.getElementById('unitImperial');
  const unitMetric = document.getElementById('unitMetric');
  if(unitImperial && unitMetric) {
    unitImperial.classList.toggle('active', unit === 'ft');
    unitMetric.classList.toggle('active', unit === 'm');
  }
  
  // Recalculate to update all displays
  calculate();
}

function setWeightUnit(unit) {
  displayWeightUnit = unit;
  
  // Update button states if elements exist
  const unitImperial = document.getElementById('unitImperial');
  const unitMetric = document.getElementById('unitMetric');
  if(unitImperial && unitMetric) {
    unitImperial.classList.toggle('active', unit === 'lbs');
    unitMetric.classList.toggle('active', unit === 'kg');
  }
  
  // Recalculate to update all displays
  calculate();
  
  // Update structure view weights
  if(bumpers.length > 0) {
    updatePickupWeightSummary();
  }
}

// Helper functions for formatting values with current units
function formatLength(meters, decimals = 2) {
  if(displayLengthUnit === 'ft') {
    return (meters * M_TO_FT).toFixed(decimals) + ' ft';
  } else {
    return meters.toFixed(decimals) + ' m';
  }
}

function formatWeight(kg) {
  if(displayWeightUnit === 'lbs') {
    return Math.ceil(kg * KG_TO_LBS) + ' lbs';
  } else {
    return Math.ceil(kg) + ' kg';
  }
}

function formatWeightValue(kg) {
  // Returns just the number without unit label
  if(displayWeightUnit === 'lbs') {
    return Math.ceil(kg * KG_TO_LBS);
  } else {
    return Math.ceil(kg);
  }
}

function getWeightUnitLabel() {
  return displayWeightUnit;
}

function getLengthUnitLabel() {
  return displayLengthUnit;
}

// Kept only so project files keep round-tripping through builds that still read it. The
// Panels/Size/Pixels mode toggle is gone - all three field pairs are always visible, and the
// panel counts are always the source of truth.

// Rewrites the "(ft)" / "(m)" suffix on the wall size labels to match the current unit.
function updateWallSizeUnitLabels() {
  const label = '(' + displayLengthUnit + ')';
  ['wallWidthUnit', 'wallHeightUnit'].forEach(function(id) {
    const el = document.getElementById(id);
    if(el) el.textContent = label;
  });
}

// Aspect Ratio Lock
let currentAspectRatio = 'none';
let customARWidth = 16;
let customARHeight = 10;
// Which dimension field the user last typed in ('width'|'height'). Anchors the lock so
// that switching ratios keeps their entry and recalculates the auto-filled field.
let lastDimensionDriver = 'width';

// Resolve which field should drive the lock: the field the user last typed in, unless
// it is empty and the other one has a value. Returns null when nothing is entered.
// Always read off the panel counts - they are the source of truth the lock writes into,
// whichever row the user actually typed in.
function getAspectRatioDriver() {
  const ids = ['panelsWide', 'panelsHigh'];
  const anchor = lastDimensionDriver === 'height' ? 1 : 0;
  if((parseFloat(document.getElementById(ids[anchor]).value) || 0) > 0) return lastDimensionDriver;
  if((parseFloat(document.getElementById(ids[1 - anchor]).value) || 0) > 0) {
    return lastDimensionDriver === 'height' ? 'width' : 'height';
  }
  return null;
}

function setAspectRatio(ratio) {
  currentAspectRatio = ratio;

  // Update toggle button states
  document.getElementById('arNoneBtn').classList.toggle('active', ratio === 'none');
  document.getElementById('ar169Btn').classList.toggle('active', ratio === '16:9');
  document.getElementById('ar43Btn').classList.toggle('active', ratio === '4:3');
  document.getElementById('arCustomBtn').classList.toggle('active', ratio === 'custom');

  // Show/hide custom inputs
  document.getElementById('customAspectRatioInputs').style.display = ratio === 'custom' ? 'block' : 'none';

  // Show/hide hint
  document.getElementById('arHint').style.display = ratio === 'none' ? 'none' : 'inline';

  // Store custom values if switching to custom
  if(ratio === 'custom') {
    customARWidth = parseInt(document.getElementById('customARWidth').value) || 16;
    customARHeight = parseInt(document.getElementById('customARHeight').value) || 10;
  }

  // Re-apply the new ratio to whatever is already entered, anchored on the field the
  // user typed in. Nothing entered - leave everything alone.
  if(ratio !== 'none') {
    const driver = getAspectRatioDriver();
    if(driver) applyAspectRatioLock(driver);
  }
}

function getAspectRatioValue() {
  // Returns the aspect ratio as width/height
  switch(currentAspectRatio) {
    case '16:9': return 16 / 9;
    case '4:3': return 4 / 3;
    case 'custom':
      customARWidth = parseInt(document.getElementById('customARWidth').value) || 16;
      customARHeight = parseInt(document.getElementById('customARHeight').value) || 10;
      return customARWidth / customARHeight;
    default: return null; // 'none' - no aspect ratio lock
  }
}

// Apply the aspect ratio lock. driver ('width'|'height') is the field the user is
// editing - the OTHER field is recalculated, never the one being typed in.
// The ratio is always applied in pixel space and lands on whole panel counts; the wall size
// and pixel fields are then re-derived from those counts, so the lock can never leave a
// fractional wall behind or disagree with the grid that gets built.
function applyAspectRatioLock(driver) {
  const aspectRatio = getAspectRatioValue();
  if(!aspectRatio) return; // No aspect ratio lock

  const allPanels = getAllPanels();
  const p = allPanels[document.getElementById('panelType').value];
  if(!p || !p.res_x || !p.res_y) return;

  const wideEl = document.getElementById('panelsWide');
  const highEl = document.getElementById('panelsHigh');

  if(driver === 'width') {
    // If width is empty, clear height too
    if(wideEl.value === '' || wideEl.value === null) {
      highEl.value = '';
      syncFromPanels();
      return;
    }
    const pw = parseInt(wideEl.value) || 0;
    if(pw <= 0) return;
    highEl.value = Math.max(1, Math.round((pw * p.res_x / aspectRatio) / p.res_y));
  } else {
    // If height is empty, clear width too
    if(highEl.value === '' || highEl.value === null) {
      wideEl.value = '';
      syncFromPanels();
      return;
    }
    const ph = parseInt(highEl.value) || 0;
    if(ph <= 0) return;
    wideEl.value = Math.max(1, Math.round((ph * p.res_y * aspectRatio) / p.res_x));
  }
  syncFromPanels();

  saveCurrentScreenData(); // Save to screen data before calculate
  calculate(); // Trigger calculation to populate wall on canvas
}

// Phase toggle
function setPhase(phase) {
  document.getElementById('phase').value = phase;
  document.getElementById('phase3Btn').classList.toggle('active', phase === 3);
  document.getElementById('phase1Btn').classList.toggle('active', phase === 1);
  calculate();
}

// Derate toggle (off by default; on = NEC 80% continuous-load derate)
function toggleDerate() {
  const sel = document.getElementById('derate');
  const on = sel.value !== 'on';
  sel.value = on ? 'on' : 'off';
  document.getElementById('derateBtn').classList.toggle('active', on);
  calculate();
}

// Power type toggle (Max/Avg)
function setPowerType(type) {
  document.getElementById('powerType').value = type;
  document.getElementById('powerMaxBtn').classList.toggle('active', type === 'max');
  document.getElementById('powerAvgBtn').classList.toggle('active', type === 'avg');
  calculate();
}

// MX40 Pro connection mode toggle (Direct/Indirect)
let mx40ConnectionMode = 'direct'; // Global state for MX40 mode

function setMX40Mode(mode) {
  mx40ConnectionMode = mode;
  document.getElementById('mx40DirectBtn').classList.toggle('active', mode === 'direct');
  document.getElementById('mx40IndirectBtn').classList.toggle('active', mode === 'indirect');
  calculate();
}

// Adjust number input with arrow buttons
function adjustNumberInput(inputId, delta) {
  const input = document.getElementById(inputId);
  if (input) {
    const currentValue = parseFloat(input.value) || 0;
    const step = parseFloat(input.step) || 1;
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    let newValue = currentValue + (delta * step);

    if (!isNaN(min) && newValue < min) newValue = min;
    if (!isNaN(max) && newValue > max) newValue = max;

    input.value = newValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    calculate();
    // Sync raster toolbar Fine(px) if in raster mode
    if(inputId === 'arrowKeyIncrement') {
      var tbFine = document.getElementById('rasterToolbarFine');
      if(tbFine) tbFine.value = newValue;
    }
  }
}

// Adjust canvas X/Y position with arrow buttons
function adjustCanvasPosition(inputId, delta) {
  const input = document.getElementById(inputId);
  if (!input) return;

  // Use Fine(px) value as the step
  const fineStep = parseInt(document.getElementById('arrowKeyIncrement').value) || 10;
  const currentValue = parseInt(input.value) || 0;
  const min = parseInt(input.min) || 0;
  let newValue = currentValue + (delta * fineStep);

  if (newValue < min) newValue = min;

  input.value = newValue;
  // Dispatch input event to trigger the handleCanvasPositionChange listener
  input.dispatchEvent(new Event('input', { bubbles: true }));
  // Sync raster toolbar X/Y if in raster mode
  if(typeof syncRasterToolbarPosition === 'function') syncRasterToolbarPosition();
}

// Show arrows toggle
let showArrowsEnabled = true;
function toggleShowArrows() {
  showArrowsEnabled = !showArrowsEnabled;
  document.getElementById('showArrowsBtn').classList.toggle('active', showArrowsEnabled);
  const flipBtn = document.getElementById('dataFlipBtn');
  if(flipBtn) flipBtn.style.display = showArrowsEnabled ? '' : 'none';
  if(!showArrowsEnabled && dataFlipEnabled) {
    dataFlipEnabled = false;
    if(flipBtn) flipBtn.classList.remove('active');
  }
  calculate();
}

// Data flip toggle
let dataFlipEnabled = false;
function toggleDataFlip() {
  dataFlipEnabled = !dataFlipEnabled;
  document.getElementById('dataFlipBtn').classList.toggle('active', dataFlipEnabled);
  if(screens[currentScreenId]) {
    screens[currentScreenId].data.dataFlip = dataFlipEnabled;
  }
  calculate();
}

// Data front/rear view toggle — VISUAL MIRROR ONLY (does not change data assignments)
let dataRearViewEnabled = false;
function setDataView(view) {
  dataRearViewEnabled = (view === 'rear');
  const fb = document.getElementById('dataFrontViewBtn');
  const rb = document.getElementById('dataRearViewBtn');
  if(fb) fb.classList.toggle('active', !dataRearViewEnabled);
  if(rb) rb.classList.toggle('active', dataRearViewEnabled);
  if(screens[currentScreenId]) {
    screens[currentScreenId].data.dataRearView = dataRearViewEnabled;
  }
  calculate();
}

// Data line start labels toggle — draws line/backup start numbers over the data layout
let dataLineLabelsEnabled = false;
function toggleDataLineLabels() {
  dataLineLabelsEnabled = !dataLineLabelsEnabled;
  const btn = document.getElementById('dataLineLabelsBtn');
  if(btn) { btn.classList.toggle('active', dataLineLabelsEnabled); btn.textContent = dataLineLabelsEnabled ? 'On' : 'Off'; }
  if(screens[currentScreenId]) {
    screens[currentScreenId].data.dataLineLabels = dataLineLabelsEnabled;
  }
  calculate();
}

// Redundancy toggle
let redundancyEnabled = true;
function toggleRedundancy() {
  redundancyEnabled = !redundancyEnabled;
  document.getElementById('redundancyBtn').classList.toggle('active', redundancyEnabled);
  if(screens[currentScreenId]) {
    screens[currentScreenId].data.redundancy = redundancyEnabled;
  }
  calculate();
}

// Processor Redundancy toggle
let processorRedundancyEnabled = false;
function toggleProcessorRedundancy() {
  processorRedundancyEnabled = !processorRedundancyEnabled;
  document.getElementById('processorRedundancyBtn').classList.toggle('active', processorRedundancyEnabled);
  if(screens[currentScreenId]) {
    screens[currentScreenId].data.processorRedundancy = processorRedundancyEnabled;
  }
  calculate();
}

// 4-way bumpers toggle
let use4WayBumpersEnabled = false;
function toggle4WayBumpers() {
  use4WayBumpersEnabled = !use4WayBumpersEnabled;
  document.getElementById('use4WayBumpersBtn').classList.toggle('active', use4WayBumpersEnabled);
  
  // Re-initialize bumpers
  initializeBumpers();
  if(isFreeCurrentScreen()) {
    delete screens[currentScreenId].data.freeBumpers;
    delete screens[currentScreenId].data.freeBumpersPosition;
  }
  calculate();
}

// Bumpers on/off toggle
function toggleUseBumpers() {
  useBumpers = !useBumpers;
  document.getElementById('useBumpersBtn').classList.toggle('active', useBumpers);
  
  // Show/hide bumper controls
  const bumperControls = document.getElementById('bumperControls');
  const fourWayOption = document.getElementById('fourWayBumperOption');
  const weightDisplay = document.getElementById('weightDisplay');
  
  if(useBumpers) {
    if(bumperControls) bumperControls.style.display = '';
    
    // Restore showTopBumper/showBottomBumper based on structure type
    const structureType = document.getElementById('structureType').value;
    if(structureType === 'hanging') {
      showTopBumper = true;
      showBottomBumper = false;
    } else {
      showTopBumper = false;
      showBottomBumper = true;
    }
    
    // Show 4-way option if CB5 panel on a hung wall (ground stacks never take 4Ws)
    const panelType = document.getElementById('panelType').value;
    const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';
    if(fourWayOption && isCB5 && structureType === 'hanging') {
      fourWayOption.style.display = 'block';
    }

    // Restore the bumper configuration saved when bumpers were toggled off; only fall back to
    // auto-distribution if there is nothing saved for this screen.
    const savedBumpers = screens[currentScreenId] && screens[currentScreenId].data
      ? screens[currentScreenId].data.savedBumpers : null;
    if(savedBumpers && savedBumpers.length > 0) {
      bumpers = JSON.parse(JSON.stringify(savedBumpers));
      if(typeof screens[currentScreenId].data.savedNextBumperId === 'number') {
        nextBumperId = screens[currentScreenId].data.savedNextBumperId;
      }
      screens[currentScreenId].data.bumpersInitialized = true;
    } else {
      initializeBumpers();
    }
  } else {
    if(bumperControls) bumperControls.style.display = 'none';
    if(fourWayOption) fourWayOption.style.display = 'none';
    if(weightDisplay) weightDisplay.style.display = 'none';
    // Preserve the current bumper configuration so toggling back on restores it
    if(screens[currentScreenId] && screens[currentScreenId].data) {
      screens[currentScreenId].data.savedBumpers = JSON.parse(JSON.stringify(bumpers));
      screens[currentScreenId].data.savedNextBumperId = nextBumperId;
    }
    bumpers = [];
    showTopBumper = false;
    showBottomBumper = false;
  }
  
  // Redraw structure view and recalculate
  generateStructureLayout();
  calculate();
}

// Set bumpers state based on panel type
function updateBumpersForPanelType(panelType) {
  const allPanels = getAllPanels();
  const panel = allPanels[panelType];
  
  // Check if panel has uses_bumpers property set to false
  const panelUsesBumpers = panel && panel.uses_bumpers !== false;
  
  // Update state and UI
  useBumpers = panelUsesBumpers;
  document.getElementById('useBumpersBtn').classList.toggle('active', useBumpers);
  
  // Show/hide bumper controls
  const bumperControls = document.getElementById('bumperControls');
  const fourWayOption = document.getElementById('fourWayBumperOption');
  const weightDisplay = document.getElementById('weightDisplay');
  
  if(useBumpers) {
    if(bumperControls) bumperControls.style.display = '';
  } else {
    if(bumperControls) bumperControls.style.display = 'none';
    if(fourWayOption) fourWayOption.style.display = 'none';
    if(weightDisplay) weightDisplay.style.display = 'none';
    // Clear bumpers
    bumpers = [];
    showTopBumper = false;
    showBottomBumper = false;
  }
}

// Snap mode toggle
let snapModeEnabled = true;
function toggleSnapMode() {
  snapModeEnabled = !snapModeEnabled;
  document.getElementById('snapModeBtn').classList.toggle('active', snapModeEnabled);
  var rasterSnap = document.getElementById('rasterToolbarSnap');
  if(rasterSnap) rasterSnap.classList.toggle('active', snapModeEnabled);
}

// CB5 Half row toggle
let cb5HalfRowEnabled = false;
// Where the half rows go ('below' | 'above' | 'both') and how many on each side.
// Mirrors the current screen's data.cb5HalfRowPosition / cb5HalfRowsAbove / cb5HalfRowsBelow.
let cb5HalfRowPosition = 'below';
let cb5HalfRowsAbove = 1;
let cb5HalfRowsBelow = 1;
// The row layout the current screen's panel keys ("c,r") are written in (cb5RowLayout).
let cb5RowKeyLayout = {top: 0, full: 1, hasHalf: false};
// Row geometry of the last-drawn standard/power/data canvas (cb5RowGeometry), for hit-testing.
let currentRowGeo = null;
// Column geometry of the same canvas (gridColGeometry): half columns are narrower.
let currentColGeo = null;
// Column geometry of the last-drawn structure canvas, for dragging bumpers.
let structureColGeo = null;
function toggleCB5HalfRow() {
  cb5HalfRowEnabled = !cb5HalfRowEnabled;
  document.getElementById('addCB5HalfRowBtn').classList.toggle('active', cb5HalfRowEnabled);

  // Update screen data so canvas view reflects the change
  if(typeof screens !== 'undefined' && screens[currentScreenId]) {
    screens[currentScreenId].data.addCB5HalfRow = cb5HalfRowEnabled;
  }
  updateCB5HalfRowControls();
  refreshCB5HalfRows();
}

// Position picker: half rows 'above', 'below' or 'both' sides of the full rows.
function setCB5HalfRowPosition(position) {
  cb5HalfRowPosition = position;
  if(typeof screens !== 'undefined' && screens[currentScreenId]) {
    screens[currentScreenId].data.cb5HalfRowPosition = position;
  }
  updateCB5HalfRowControls();
  refreshCB5HalfRows();
}

// Row count for one side ('above' | 'below'); at least 1, no upper limit.
function setCB5HalfRowCount(side, value) {
  const count = Math.max(1, parseInt(value) || 1);
  if(side === 'above') cb5HalfRowsAbove = count;
  else cb5HalfRowsBelow = count;
  if(typeof screens !== 'undefined' && screens[currentScreenId]) {
    screens[currentScreenId].data[side === 'above' ? 'cb5HalfRowsAbove' : 'cb5HalfRowsBelow'] = count;
  }
  refreshCB5HalfRows();
}

// Re-key the panels for any change in top half rows, then recalculate everything the
// half rows feed into.
function refreshCB5HalfRows() {
  syncCB5RowKeys();
  updateSuggestedDataLimit(); // Update max/data placeholder when half panels toggled
  calculate();
  updateWeightDisplay(); // Update bumper pickup weights for half panel rows
}

// The add buttons for the current panel type, each named for what it adds: CB5 MKII gets
// "+ CB5 1/2 Row"; a panel with half-width and quarter partners (V4ST) gets one button per
// partner, "+ V4ST-H", "+ V4ST-V" and "+ V4ST-Q"
function updateGridAddButtons() {
  const typeEl = document.getElementById('panelType');
  if(!typeEl) return;
  const type = typeEl.value, all = getAllPanels();
  const rowType = halfPanelTypeOf(type), colType = halfColPanelTypeOf(type), qType = quarterPanelTypeOf(type);
  const rowBtn = document.getElementById('addCB5HalfRowBtn');
  if(rowBtn && rowType) rowBtn.textContent = colType ? '+ ' + all[rowType].name : '+ ' + all[type].name.split(' ')[0] + ' 1/2 Row';
  const colBtn = document.getElementById('addHalfColBtn');
  if(colBtn) {
    colBtn.style.display = colType ? '' : 'none';
    if(colType) colBtn.textContent = '+ ' + all[colType].name;
  }
  const qBtn = document.getElementById('addQuarterBtn');
  if(qBtn) {
    qBtn.style.display = qType ? '' : 'none';
    if(qType) qBtn.textContent = '+ ' + all[qType].name;
  }
  const colOptions = document.getElementById('halfColOptions');
  if(colOptions && !colType) colOptions.style.display = 'none';
  if(colType) updateHalfColControls();
}

// Show the half row toggle, position picker and counts as the live state has them.
function updateCB5HalfRowControls() {
  const btn = document.getElementById('addCB5HalfRowBtn');
  if(btn) btn.classList.toggle('active', cb5HalfRowEnabled);
  const options = document.getElementById('cb5HalfRowOptions');
  if(options) options.style.display = cb5HalfRowEnabled ? '' : 'none';
  ['above', 'below', 'both'].forEach(pos => {
    const b = document.getElementById('cb5HalfRow' + pos.charAt(0).toUpperCase() + pos.slice(1) + 'Btn');
    if(b) b.classList.toggle('active', cb5HalfRowPosition === pos);
  });
  const aboveField = document.getElementById('cb5HalfRowsAboveField');
  if(aboveField) aboveField.style.display = cb5HalfRowPosition === 'below' ? 'none' : '';
  const belowField = document.getElementById('cb5HalfRowsBelowField');
  if(belowField) belowField.style.display = cb5HalfRowPosition === 'above' ? 'none' : '';
  const aboveInput = document.getElementById('cb5HalfRowsAbove');
  if(aboveInput && document.activeElement !== aboveInput) aboveInput.value = cb5HalfRowsAbove;
  const belowInput = document.getElementById('cb5HalfRowsBelow');
  if(belowInput && document.activeElement !== belowInput) belowInput.value = cb5HalfRowsBelow;
  updateGridAddButtons();
}

// ---- Half columns (V4ST-V) and quarter corners (V4ST-Q) ----
// The column twin of the half rows: half-width panels in columns left and/or right of the
// full columns. Where a half column crosses a half row sits a quarter panel, there only
// while the quarter corners are on; otherwise that corner stays empty (kept as a
// knocked-out panel). Mirrors the current screen's data.addHalfCols / halfColPosition /
// halfColsLeft / halfColsRight / quarterCorners.
let halfColEnabled = false;
let halfColPosition = 'right';
let halfColsLeft = 1;
let halfColsRight = 1;
let quarterCornersEnabled = false;
// The column layout the current screen's panel keys ("c,r") are written in (gridColLayout).
let halfColKeyLayout = {left: 0, full: 1, hasHalf: false};

function toggleHalfCols() {
  halfColEnabled = !halfColEnabled;
  if(typeof screens !== 'undefined' && screens[currentScreenId]) screens[currentScreenId].data.addHalfCols = halfColEnabled;
  updateHalfColControls();
  refreshHalfCols();
}

// Half columns change how many columns there are, so the bumpers are laid out afresh, as
// a change of Panels Wide does
function refreshHalfCols() {
  initializeBumpers();
  refreshCB5HalfRows();
}

function setHalfColPosition(position) {
  halfColPosition = position;
  if(typeof screens !== 'undefined' && screens[currentScreenId]) screens[currentScreenId].data.halfColPosition = position;
  updateHalfColControls();
  refreshHalfCols();
}

// Column count for one side ('left' | 'right'); at least 1
function setHalfColCount(side, value) {
  const count = Math.max(1, parseInt(value) || 1);
  if(side === 'left') halfColsLeft = count;
  else halfColsRight = count;
  if(typeof screens !== 'undefined' && screens[currentScreenId]) {
    screens[currentScreenId].data[side === 'left' ? 'halfColsLeft' : 'halfColsRight'] = count;
  }
  refreshHalfCols();
}

function toggleQuarterCorners() {
  quarterCornersEnabled = !quarterCornersEnabled;
  if(typeof screens !== 'undefined' && screens[currentScreenId]) screens[currentScreenId].data.quarterCorners = quarterCornersEnabled;
  // Corners come back as live panels; knocked out again when turned off (syncQuarterCorners)
  if(quarterCornersEnabled) gridCornerKeys().forEach(k => deletedPanels.delete(k));
  updateHalfColControls();
  refreshCB5HalfRows();
}

// The half column buttons, position picker and counts as the live state has them. The
// quarter button only works where a half column meets a half row.
function updateHalfColControls() {
  const btn = document.getElementById('addHalfColBtn');
  if(btn) btn.classList.toggle('active', halfColEnabled);
  const options = document.getElementById('halfColOptions');
  if(options) options.style.display = halfColEnabled ? '' : 'none';
  ['left', 'right', 'both'].forEach(pos => {
    const b = document.getElementById('halfCol' + pos.charAt(0).toUpperCase() + pos.slice(1) + 'Btn');
    if(b) b.classList.toggle('active', halfColPosition === pos);
  });
  const leftField = document.getElementById('halfColsLeftField');
  if(leftField) leftField.style.display = halfColPosition === 'right' ? 'none' : '';
  const rightField = document.getElementById('halfColsRightField');
  if(rightField) rightField.style.display = halfColPosition === 'left' ? 'none' : '';
  const leftInput = document.getElementById('halfColsLeft');
  if(leftInput && document.activeElement !== leftInput) leftInput.value = halfColsLeft;
  const rightInput = document.getElementById('halfColsRight');
  if(rightInput && document.activeElement !== rightInput) rightInput.value = halfColsRight;
  const qBtn = document.getElementById('addQuarterBtn');
  if(qBtn) {
    qBtn.classList.toggle('active', quarterCornersEnabled);
    qBtn.disabled = !(halfColEnabled && cb5HalfRowEnabled);
  }
}

function loadHalfColState(data, panelType) {
  halfColEnabled = !!(data && data.addHalfCols);
  const pos = data && data.halfColPosition;
  halfColPosition = (pos === 'left' || pos === 'both') ? pos : 'right';
  halfColsLeft = Math.max(1, parseInt(data && data.halfColsLeft) || 1);
  halfColsRight = Math.max(1, parseInt(data && data.halfColsRight) || 1);
  quarterCornersEnabled = !!(data && data.quarterCorners);
  halfColKeyLayout = gridColLayout(getHalfCols(data, panelType), Math.max(1, parseInt(data && data.panelsWide) || 1));
  updateHalfColControls();
}

// Load the half row state from a screen's data into the live globals and controls.
// The screen's panel keys are written in its own row layout, so re-base on that.
function loadCB5HalfRowState(data, panelType) {
  cb5HalfRowEnabled = !!(data && data.addCB5HalfRow);
  const pos = data && data.cb5HalfRowPosition;
  cb5HalfRowPosition = (pos === 'above' || pos === 'both') ? pos : 'below';
  cb5HalfRowsAbove = Math.max(1, parseInt(data && data.cb5HalfRowsAbove) || 1);
  cb5HalfRowsBelow = Math.max(1, parseInt(data && data.cb5HalfRowsBelow) || 1);
  cb5RowKeyLayout = cb5RowLayout(getCB5HalfRows(data, panelType), Math.max(1, parseInt(data && data.panelsHigh) || 1));
  updateCB5HalfRowControls();
}

// CB5 half-panel rows for one screen: how many sit above (top) and below (bottom)
// the full rows. Grid rows run top to bottom — top half rows, full rows, bottom half
// rows — so a full panel's row index is offset by `top`. Projects saved before the
// position/count options existed only have addCB5HalfRow, which reads as one row below.
// The half-height panel a panel type can add rows of above / below its full rows (CB5 MKII:
// CB5 MKII Half, V4ST: V4ST-H), from its spec's half_panel, or null. The "CB5" in the half-row
// names below is historical: they work for any panel that has one.
function halfPanelTypeOf(panelType) {
  const all = (typeof getAllPanels === 'function') ? getAllPanels() : panels;
  const p = all[panelType];
  return (p && p.half_panel && all[p.half_panel]) ? p.half_panel : null;
}

// The half-width (V4ST: V4ST-V) and quarter (V4ST: V4ST-Q) panels a panel type can add, or null
function halfColPanelTypeOf(panelType) {
  const all = (typeof getAllPanels === 'function') ? getAllPanels() : panels;
  const p = all[panelType];
  return (p && p.half_col_panel && all[p.half_col_panel]) ? p.half_col_panel : null;
}

function quarterPanelTypeOf(panelType) {
  const all = (typeof getAllPanels === 'function') ? getAllPanels() : panels;
  const p = all[panelType];
  return (p && p.quarter_panel && all[p.quarter_panel]) ? p.quarter_panel : null;
}

// Half columns for one screen: how many sit left and right of the full columns. Grid
// columns run left to right — left half columns, full columns, right half columns — so a
// full panel's column index is offset by `left`, as the half rows offset rows by `top`.
function getHalfCols(data, panelType) {
  if(!data || !data.addHalfCols || !halfColPanelTypeOf(panelType)) return {left: 0, right: 0};
  const pos = (data.halfColPosition === 'left' || data.halfColPosition === 'both') ? data.halfColPosition : 'right';
  const count = v => Math.max(1, parseInt(v) || 1);
  return {
    left: pos === 'right' ? 0 : count(data.halfColsLeft),
    right: pos === 'left' ? 0 : count(data.halfColsRight)
  };
}

function getCurrentHalfCols() {
  return getHalfCols({
    addHalfCols: halfColEnabled,
    halfColPosition: halfColPosition,
    halfColsLeft: halfColsLeft,
    halfColsRight: halfColsRight
  }, document.getElementById('panelType').value);
}

// Column positions for a grid of `fullCols` full-width columns with half.left / half.right
// half-width columns beside it, the twin of cb5RowGeometry. With no half columns, x(c) is
// c * fullW, exactly the uniform grid every renderer drew before.
function gridColGeometry(fullCols, half, fullW, halfW) {
  const left = half.left, right = half.right;
  const cols = left + fullCols + right;
  const isHalf = c => c < left || c >= left + fullCols;
  const x = c => {
    if(c <= left) return c * halfW;
    if(c <= left + fullCols) return left * halfW + (c - left) * fullW;
    return left * halfW + fullCols * fullW + (c - left - fullCols) * halfW;
  };
  const w = c => isHalf(c) ? halfW : fullW;
  const colAt = px => {
    if(px < 0) return -1;
    for(let c = 0; c < cols; c++) if(px < x(c + 1)) return c;
    return -1;
  };
  return {left, right, fullCols, cols, fullW, halfW, isHalf, x, w, colAt, width: x(cols)};
}

// The panel type at grid cell (c, r): the main panel, its half-height panel in a half row,
// its half-width panel in a half column, its quarter panel where the two cross
function gridPanelTypeAt(panelType, c, r, halfRows, fullRows, halfCols, fullCols) {
  const inHalfRow = r < halfRows.top || r >= halfRows.top + fullRows;
  const inHalfCol = c < halfCols.left || c >= halfCols.left + fullCols;
  if(inHalfRow && inHalfCol) return quarterPanelTypeOf(panelType);
  if(inHalfCol) return halfColPanelTypeOf(panelType);
  if(inHalfRow) return halfPanelTypeOf(panelType);
  return panelType;
}

// A half-row panel's height and a half-column panel's width as a fraction of the main
// panel's width, the unit the layouts draw cells in: CB5 MKII Half is 1 (the square it has
// always been drawn as), V4ST-H's height and V4ST-V's width are 0.5
function halfRowHeightRatio(panelType) {
  const all = (typeof getAllPanels === 'function') ? getAllPanels() : panels;
  const p = all[panelType], h = all[halfPanelTypeOf(panelType)];
  return (p && h) ? h.height_m / p.width_m : 1;
}

function halfColWidthRatio(panelType) {
  const all = (typeof getAllPanels === 'function') ? getAllPanels() : panels;
  const p = all[panelType], v = all[halfColPanelTypeOf(panelType)];
  return (p && v) ? v.width_m / p.width_m : 1;
}

// Panel weights by column for the current screen: a full column's main and half-row
// panels, a half column's half-width (V4ST-V) and quarter (V4ST-Q) panels. `full(c)` /
// `half(c)` give the kg of a panel in column c on a full / half row.
function currentColumnPanelWeights(panelType, useConnectingPlates) {
  const hc = getCurrentHalfCols();
  const {pw} = getEffectivePanelCounts();
  const inHalfCol = c => c < hc.left || c >= hc.left + pw;
  const mainKg = getPanelWeight(panelType, useConnectingPlates);
  const hType = halfPanelTypeOf(panelType), vType = halfColPanelTypeOf(panelType), qType = quarterPanelTypeOf(panelType);
  const hKg = hType ? getPanelWeight(hType, useConnectingPlates) : 0;
  const vKg = vType ? getPanelWeight(vType, useConnectingPlates) : mainKg;
  const qKg = qType ? getPanelWeight(qType, useConnectingPlates) : hKg;
  return {
    hasHalfCols: hc.left + hc.right > 0,
    full: c => inHalfCol(c) ? vKg : mainKg,
    half: c => inHalfCol(c) ? qKg : hKg
  };
}

// The current screen's corner cells, where a half column crosses a half row
function gridCornerKeys() {
  const hr = getCurrentCB5HalfRows(), hc = getCurrentHalfCols();
  const {pw, ph} = getEffectivePanelCounts();
  const keys = [];
  const rows = [], cols = [];
  for(let r = 0; r < hr.top; r++) rows.push(r);
  for(let r = hr.top + ph; r < hr.top + ph + hr.bottom; r++) rows.push(r);
  for(let c = 0; c < hc.left; c++) cols.push(c);
  for(let c = hc.left + pw; c < hc.left + pw + hc.right; c++) cols.push(c);
  cols.forEach(c => rows.forEach(r => keys.push(`${c},${r}`)));
  return keys;
}

// With the quarter corners off, the corners are knocked out so nothing counts or draws them
function syncQuarterCorners() {
  if(quarterCornersEnabled) return;
  const before = deletedPanels.size;
  gridCornerKeys().forEach(k => deletedPanels.add(k));
  if(deletedPanels.size !== before && typeof screens !== 'undefined' && screens[currentScreenId]) {
    screens[currentScreenId].data.deletedPanels = new Set(deletedPanels);
  }
}

// Live panels of each kind as [type, count] pairs: the main panel, then its half-row,
// half-column and quarter partners. `live` is a countCB5LivePanels result.
function gridLiveParts(panelType, live) {
  return [[panelType, live.full], [halfPanelTypeOf(panelType), live.half],
    [halfColPanelTypeOf(panelType), live.vert || 0], [quarterPanelTypeOf(panelType), live.quarter || 0]]
    .filter(([t, n]) => t && n > 0);
}

// The half-column and quarter panels of a countCB5LivePanels result, as {panel, count}, for
// the mixed-pixel averages that so far only knew the main and half-row panels
function gridExtraParts(panelType, live) {
  const all = getAllPanels();
  return [[halfColPanelTypeOf(panelType), live.vert || 0], [quarterPanelTypeOf(panelType), live.quarter || 0]]
    .filter(([t, n]) => t && n > 0).map(([t, n]) => ({panel: all[t], count: n}));
}

// Spec-text suffix for a wall's half columns, the twin of cb5HalfRowLabel
function halfColLabel(half) {
  const l = half.left, r = half.right;
  if(!l && !r) return '';
  if(!l) return r === 1 ? ' + half column' : ` + ${r} half columns`;
  if(!r) return l === 1 ? ' + half column left' : ` + ${l} half columns left`;
  return ` + ${l + r} half columns (${l} left, ${r} right)`;
}

function getCB5HalfRows(data, panelType) {
  if(!data || !data.addCB5HalfRow || !halfPanelTypeOf(panelType)) return {top: 0, bottom: 0};
  const pos = (data.cb5HalfRowPosition === 'above' || data.cb5HalfRowPosition === 'both') ? data.cb5HalfRowPosition : 'below';
  const count = v => Math.max(1, parseInt(v) || 1);
  return {
    top: pos === 'below' ? 0 : count(data.cb5HalfRowsAbove),
    bottom: pos === 'above' ? 0 : count(data.cb5HalfRowsBelow)
  };
}

// The current screen's half rows, from the live toggle state.
function getCurrentCB5HalfRows() {
  return getCB5HalfRows({
    addCB5HalfRow: cb5HalfRowEnabled,
    cb5HalfRowPosition: cb5HalfRowPosition,
    cb5HalfRowsAbove: cb5HalfRowsAbove,
    cb5HalfRowsBelow: cb5HalfRowsBelow
  }, document.getElementById('panelType').value);
}

// Spec-text suffix for a wall's half rows: '' when off, ' + half row' for the classic
// single row below.
function cb5HalfRowLabel(half) {
  const t = half.top, b = half.bottom;
  if(!t && !b) return '';
  if(!t) return b === 1 ? ' + half row' : ` + ${b} half rows`;
  if(!b) return t === 1 ? ' + half row above' : ` + ${t} half rows above`;
  return ` + ${t + b} half rows (${t} above, ${b} below)`;
}

// Row positions for a grid of `fullRows` full-height rows with half.top / half.bottom
// half-height rows above and below it. fullH / halfH are the row heights in whatever
// unit the caller draws in (canvas px, pixels, metres).
function cb5RowGeometry(fullRows, half, fullH, halfH) {
  const top = half.top, bottom = half.bottom;
  const rows = top + fullRows + bottom;
  const isHalf = r => r < top || r >= top + fullRows;
  const y = r => {
    if(r <= top) return r * halfH;
    if(r <= top + fullRows) return top * halfH + (r - top) * fullH;
    return top * halfH + fullRows * fullH + (r - top - fullRows) * halfH;
  };
  const h = r => isHalf(r) ? halfH : fullH;
  // Row under a y position (same unit), or -1 outside the grid.
  const rowAt = py => {
    if(py < 0) return -1;
    for(let r = 0; r < rows; r++) if(py < y(r + 1)) return r;
    return -1;
  };
  return {top, bottom, fullRows, rows, fullH, halfH, isHalf, y, h, rowAt, height: y(rows)};
}

// Live (non-deleted) panels in a grid of `fullRows` full rows with half.top / half.bottom
// CB5 half rows around it, split into full and half panels. `deleted` holds "c,r" keys
// (a Set, or an array after a JSON round-trip). `cols` limits the count to those columns.
function countCB5LivePanels(pw, fullRows, half, deleted, cols, halfCols) {
  const del = deleted instanceof Set ? deleted : new Set(Array.isArray(deleted) ? deleted : []);
  const hc = halfCols || {left: 0, right: 0};
  const columns = cols || Array.from({length: hc.left + pw + hc.right}, (_, c) => c);
  const rows = half.top + fullRows + half.bottom;
  // `vert`: half-column panels in full rows (V4ST-V); `quarter`: where they cross a half row
  let full = 0, halfCount = 0, vert = 0, quarter = 0;
  for(let r = 0; r < rows; r++) {
    const isHalf = r < half.top || r >= half.top + fullRows;
    columns.forEach(c => {
      if(del.has(`${c},${r}`)) return;
      // Only a caller that passes the half columns has any: without them every column counts
      // as a full one, as callers that pick their own `cols` always have
      const inHalfCol = !!halfCols && (c < hc.left || c >= hc.left + pw);
      if(isHalf && inHalfCol) quarter++;
      else if(inHalfCol) vert++;
      else if(isHalf) halfCount++;
      else full++;
    });
  }
  return {full, half: halfCount, vert, quarter};
}

// cb5RowGeometry for the current screen's wall: the full rows from the dimension inputs
// plus its half rows above/below.
function getCurrentRowGeometry(fullH, halfH) {
  return cb5RowGeometry(getEffectivePanelCounts().ph, getCurrentCB5HalfRows(), fullH, halfH);
}

// Move every row-keyed panel entry ("c,r") down by `delta` rows (up when negative),
// dropping any pushed above the grid. Works on a Set or a Map of keys.
function shiftCB5RowKeys(coll, delta) {
  const moveKey = k => {
    const [c, r] = String(k).split(',').map(Number);
    return (r + delta >= 0) ? `${c},${r + delta}` : null;
  };
  if(coll instanceof Map) {
    const out = new Map();
    coll.forEach((v, k) => { const nk = moveKey(k); if(nk !== null) out.set(nk, v); });
    return out;
  }
  const out = new Set();
  (coll || []).forEach(k => { const nk = moveKey(k); if(nk !== null) out.add(nk); });
  return out;
}

// shiftCB5RowKeys for columns: move every "c,r" key right by `delta` columns (left when
// negative), dropping any pushed off the left edge
function shiftGridColKeys(coll, delta) {
  if(!delta) return coll;
  const moveKey = k => {
    const [c, r] = String(k).split(',').map(Number);
    return (c + delta >= 0) ? `${c + delta},${r}` : null;
  };
  if(coll instanceof Map) {
    const out = new Map();
    coll.forEach((v, k) => { const nk = moveKey(k); if(nk !== null) out.set(nk, v); });
    return out;
  }
  const out = new Set();
  (coll || []).forEach(k => { const nk = moveKey(k); if(nk !== null) out.add(nk); });
  return out;
}

const CB5_ROW_KEYED_FIELDS = ['deletedPanels', 'selectedPanels', 'customCircuitAssignments',
  'customSocaAssignments', 'customDataLineAssignments', 'customDataDestinations'];

// A screen's row layout as its panel keys see it: the half rows above the full rows, the
// number of full rows, and whether there are any half rows at all.
function cb5RowLayout(half, fullRows) {
  return {top: half.top, full: fullRows, hasHalf: half.top + half.bottom > 0};
}

// Re-key row-keyed panel entries ("c,r") from one row layout to another: rows above the
// full rows keep their distance from the first full row, full rows keep their index within
// the full rows (dropped if the wall got shorter), and rows below follow the last full row.
// Walls without half rows on either side are left exactly as they are.
function rebaseCB5RowKeys(coll, from, to) {
  if(!from.hasHalf && !to.hasHalf) return coll;
  const moveRow = r => {
    if(r < from.top) return r - from.top + to.top;
    if(r < from.top + from.full) return (r - from.top < to.full) ? to.top + (r - from.top) : -1;
    return to.top + to.full + (r - from.top - from.full);
  };
  const moveKey = k => {
    const [c, r] = String(k).split(',').map(Number);
    const nr = moveRow(r);
    return nr >= 0 ? `${c},${nr}` : null;
  };
  if(coll instanceof Map) {
    const out = new Map();
    coll.forEach((v, k) => { const nk = moveKey(k); if(nk !== null) out.set(nk, v); });
    return out;
  }
  const out = new Set();
  (coll || []).forEach(k => { const nk = moveKey(k); if(nk !== null) out.add(nk); });
  return out;
}

// Re-key a screen data object's row-keyed fields.
function rebaseCB5StateKeys(state, from, to) {
  if(!state) return;
  CB5_ROW_KEYED_FIELDS.forEach(f => { if(state[f]) state[f] = rebaseCB5RowKeys(state[f], from, to); });
}

// Changing the top half rows moves every full panel down or up the grid, and changing
// the full rows moves the half rows below them, so the current screen's deletions,
// selection and custom assignments move with their panels.
// Call after anything that can change the current screen's row layout: the half row
// toggle, position or counts, the panel type, or the panels high.
function syncCB5RowKeys() {
  const from = cb5RowKeyLayout;
  const to = cb5RowLayout(getCurrentCB5HalfRows(), getEffectivePanelCounts().ph);
  cb5RowKeyLayout = to;
  if(from.top === to.top && from.full === to.full) return;
  if(!from.hasHalf && !to.hasHalf) return;
  deletedPanels = rebaseCB5RowKeys(deletedPanels, from, to);
  selectedPanels = rebaseCB5RowKeys(selectedPanels, from, to);
  customCircuitAssignments = rebaseCB5RowKeys(customCircuitAssignments, from, to);
  customSocaAssignments = rebaseCB5RowKeys(customSocaAssignments, from, to);
  customDataLineAssignments = rebaseCB5RowKeys(customDataLineAssignments, from, to);
  customDataDestinations = rebaseCB5RowKeys(customDataDestinations, from, to);
  if(typeof screens !== 'undefined' && screens[currentScreenId]) {
    const data = screens[currentScreenId].data;
    data.deletedPanels = new Set(deletedPanels);
    data.selectedPanels = new Set(selectedPanels);
    data.customCircuitAssignments = new Map(customCircuitAssignments);
    data.customSocaAssignments = new Map(customSocaAssignments);
    data.customDataLineAssignments = new Map(customDataLineAssignments);
    data.customDataDestinations = new Map(customDataDestinations);
  }
}

// A screen's column layout as its panel keys see it, the twin of cb5RowLayout
function gridColLayout(half, fullCols) {
  return {left: half.left, full: fullCols, hasHalf: half.left + half.right > 0};
}

// Re-key column-keyed panel entries ("c,r") from one column layout to another, as
// rebaseCB5RowKeys does for rows
function rebaseGridColKeys(coll, from, to) {
  if(!from.hasHalf && !to.hasHalf) return coll;
  const moveCol = c => {
    if(c < from.left) return c - from.left + to.left;
    if(c < from.left + from.full) return (c - from.left < to.full) ? to.left + (c - from.left) : -1;
    return to.left + to.full + (c - from.left - from.full);
  };
  const moveKey = k => {
    const [c, r] = String(k).split(',').map(Number);
    const nc = moveCol(c);
    return nc >= 0 ? `${nc},${r}` : null;
  };
  if(coll instanceof Map) {
    const out = new Map();
    coll.forEach((v, k) => { const nk = moveKey(k); if(nk !== null) out.set(nk, v); });
    return out;
  }
  const out = new Set();
  (coll || []).forEach(k => { const nk = moveKey(k); if(nk !== null) out.add(nk); });
  return out;
}

// syncCB5RowKeys for columns: adding left half columns moves every panel right, and
// changing the full columns moves the right half columns
function syncHalfColKeys() {
  const from = halfColKeyLayout;
  const to = gridColLayout(getCurrentHalfCols(), getEffectivePanelCounts().pw);
  halfColKeyLayout = to;
  if(from.left === to.left && from.full === to.full) return;
  if(!from.hasHalf && !to.hasHalf) return;
  deletedPanels = rebaseGridColKeys(deletedPanels, from, to);
  selectedPanels = rebaseGridColKeys(selectedPanels, from, to);
  customCircuitAssignments = rebaseGridColKeys(customCircuitAssignments, from, to);
  customSocaAssignments = rebaseGridColKeys(customSocaAssignments, from, to);
  customDataLineAssignments = rebaseGridColKeys(customDataLineAssignments, from, to);
  customDataDestinations = rebaseGridColKeys(customDataDestinations, from, to);
  if(typeof screens !== 'undefined' && screens[currentScreenId]) {
    const data = screens[currentScreenId].data;
    data.deletedPanels = new Set(deletedPanels);
    data.selectedPanels = new Set(selectedPanels);
    data.customCircuitAssignments = new Map(customCircuitAssignments);
    data.customSocaAssignments = new Map(customSocaAssignments);
    data.customDataLineAssignments = new Map(customDataLineAssignments);
    data.customDataDestinations = new Map(customDataDestinations);
  }
}

// Connection method toggle
let connectionMethod = 'airframe';
function setConnectionMethod(method) {
  connectionMethod = method;
  document.getElementById('connectionAirframeBtn').classList.toggle('active', method === 'airframe');
  document.getElementById('connectionPlatesBtn').classList.toggle('active', method === 'plates');
  calculate();
}

// Cable drop position
let cableDropPosition = 'behind';
function setCableDropPosition(position) {
  cableDropPosition = position;
  document.getElementById('cableDropBehindBtn').classList.toggle('active', position === 'behind');
  document.getElementById('cableDropSRBtn').classList.toggle('active', position === 'sr');
  document.getElementById('cableDropSLBtn').classList.toggle('active', position === 'sl');
  // Save to gear-active screen when in gear view, otherwise current screen
  const targetId = (typeof currentAppMode !== 'undefined' && currentAppMode === 'gear' && gearActiveScreenId && screens[gearActiveScreenId])
    ? gearActiveScreenId : currentScreenId;
  if(screens[targetId]) {
    screens[targetId].data.cableDropPosition = position;
  }
  generateGearList();
}

// Power in position (top or bottom of wall)
let powerInPosition = 'top';
function setPowerInPosition(position) {
  powerInPosition = position;
  document.getElementById('powerInTopBtn').classList.toggle('active', position === 'top');
  document.getElementById('powerInBottomBtn').classList.toggle('active', position === 'bottom');
  // Save to gear-active screen when in gear view, otherwise current screen
  const targetId = (typeof currentAppMode !== 'undefined' && currentAppMode === 'gear' && gearActiveScreenId && screens[gearActiveScreenId])
    ? gearActiveScreenId : currentScreenId;
  if(screens[targetId]) {
    screens[targetId].data.powerInPosition = position;
  }
  generateGearList();
}

// Dist box (XD) placement — 'proc' = at the processor, 'wall' = on the LED wall,
// 'remote' = off to the side on the floor. Projects saved before this toggle existed
// stored a boolean distBoxOnWall, so resolve reads through it.
function resolveXdPlacement(data) {
  const mode = data && data.xdPlacement;
  if(mode === 'proc' || mode === 'wall' || mode === 'remote') return mode;
  return (data && data.distBoxOnWall) ? 'wall' : 'proc';
}

// Does this screen's processor actually use a distribution box? The condition used to be
// expressed three different ways across the app (box count, dist-box cable count, topology
// flag). The topology is the authoritative one: a processor with no box can never produce
// one however many data lines it has, whereas the counts also read false before any lines
// exist. Every "is there a dist box" test should go through here.
function screenUsesDistBox(screenId) {
  const scr = screens[screenId];
  if(!scr || !scr.data) return false;
  if(typeof resolveProcessorTopology !== 'function') return false;
  return resolveProcessorTopology(scr.data.processor, scr.data.mx40ConnectionMode || 'direct').usesDistBox;
}

// The screen the Cabling panel is currently editing
function xdPlacementTargetScreenId() {
  return (typeof currentAppMode !== 'undefined' && currentAppMode === 'gear' && gearActiveScreenId && screens[gearActiveScreenId])
    ? gearActiveScreenId : currentScreenId;
}

// Grey out the Dist Box row when the processor has no box, and snap it back to At Proc.
function updateXdPlacementAvailability() {
  const targetId = xdPlacementTargetScreenId();
  const supported = screenUsesDistBox(targetId);
  const row = document.getElementById('xdPlacementRow');
  if(row) {
    row.style.opacity = supported ? '1' : '0.3';
    row.style.pointerEvents = supported ? '' : 'none';
  }
  if(!supported) {
    xdPlacement = 'proc';
    if(screens[targetId]) screens[targetId].data.xdPlacement = 'proc';
    updateXdPlacementUI('proc');
  }
}

let xdPlacement = 'proc';
function setXdPlacement(mode) {
  // Block wall/remote on a processor that has no dist box
  if(mode !== 'proc' && !screenUsesDistBox(xdPlacementTargetScreenId())) return;
  xdPlacement = mode;
  updateXdPlacementUI(mode);
  // Save to gear-active screen when in gear view, otherwise current screen
  const targetId = (typeof currentAppMode !== 'undefined' && currentAppMode === 'gear' && gearActiveScreenId && screens[gearActiveScreenId])
    ? gearActiveScreenId : currentScreenId;
  if(screens[targetId]) {
    screens[targetId].data.xdPlacement = mode;
  }
  generateGearList();
}

// Cable diagram front/rear view toggle — VISUAL MIRROR ONLY (does not change cable routing/data)
let cableRearViewEnabled = false;
function setCableView(view) {
  cableRearViewEnabled = (view === 'rear');
  const fb = document.getElementById('cableFrontViewBtn');
  const rb = document.getElementById('cableRearViewBtn');
  if(fb) fb.classList.toggle('active', !cableRearViewEnabled);
  if(rb) rb.classList.toggle('active', cableRearViewEnabled);
  // Save to gear-active screen when in gear view, otherwise current screen
  const targetId = (typeof currentAppMode !== 'undefined' && currentAppMode === 'gear' && gearActiveScreenId && screens[gearActiveScreenId])
    ? gearActiveScreenId : currentScreenId;
  if(screens[targetId]) {
    screens[targetId].data.cableRearView = cableRearViewEnabled;
  }
  generateGearList();
}

// Update XD placement toggle state and reveal the sub-controls for the active mode
function updateXdPlacementUI(mode) {
  document.getElementById('xdPlacementProcBtn')?.classList.toggle('active', mode === 'proc');
  document.getElementById('xdPlacementWallBtn')?.classList.toggle('active', mode === 'wall');
  document.getElementById('xdPlacementRemoteBtn')?.classList.toggle('active', mode === 'remote');
  const posControls = document.getElementById('distBoxPositionControls');
  if (posControls) posControls.style.display = (mode === 'wall') ? '' : 'none';
  const remoteControls = document.getElementById('xdRemoteControls');
  if (remoteControls) remoteControls.style.display = (mode === 'remote') ? '' : 'none';
}

// Main dist box horizontal position (SR / Center / SL)
let distBoxMainHorizPosition = 'center';
function setDistBoxMainHorizPosition(position) {
  distBoxMainHorizPosition = position;
  document.getElementById('distBoxMainHorizSRBtn').classList.toggle('active', position === 'sr');
  document.getElementById('distBoxMainHorizCBtn').classList.toggle('active', position === 'center');
  document.getElementById('distBoxMainHorizSLBtn').classList.toggle('active', position === 'sl');
  const targetId = (typeof currentAppMode !== 'undefined' && currentAppMode === 'gear' && gearActiveScreenId && screens[gearActiveScreenId])
    ? gearActiveScreenId : currentScreenId;
  if(screens[targetId]) {
    screens[targetId].data.distBoxMainHorizPosition = position;
  }
  generateGearList();
}

// Backup dist box horizontal position (SR / Center / SL)
let distBoxBackupHorizPosition = 'center';
function setDistBoxBackupHorizPosition(position) {
  distBoxBackupHorizPosition = position;
  document.getElementById('distBoxBackupHorizSRBtn').classList.toggle('active', position === 'sr');
  document.getElementById('distBoxBackupHorizCBtn').classList.toggle('active', position === 'center');
  document.getElementById('distBoxBackupHorizSLBtn').classList.toggle('active', position === 'sl');
  const targetId = (typeof currentAppMode !== 'undefined' && currentAppMode === 'gear' && gearActiveScreenId && screens[gearActiveScreenId])
    ? gearActiveScreenId : currentScreenId;
  if(screens[targetId]) {
    screens[targetId].data.distBoxBackupHorizPosition = position;
  }
  generateGearList();
}

// Main dist box vertical position (Top / Bottom)
let distBoxMainVertPosition = 'top';
function setDistBoxMainVertPosition(position) {
  distBoxMainVertPosition = position;
  document.getElementById('distBoxMainTopBtn').classList.toggle('active', position === 'top');
  document.getElementById('distBoxMainBottomBtn').classList.toggle('active', position === 'bottom');
  const targetId = (typeof currentAppMode !== 'undefined' && currentAppMode === 'gear' && gearActiveScreenId && screens[gearActiveScreenId])
    ? gearActiveScreenId : currentScreenId;
  if(screens[targetId]) {
    screens[targetId].data.distBoxMainVertPosition = position;
  }
  generateGearList();
}

// Backup dist box vertical position (Top / Bottom)
let distBoxBackupVertPosition = 'top';
function setDistBoxBackupVertPosition(position) {
  distBoxBackupVertPosition = position;
  document.getElementById('distBoxBackupTopBtn').classList.toggle('active', position === 'top');
  document.getElementById('distBoxBackupBottomBtn').classList.toggle('active', position === 'bottom');
  const targetId = (typeof currentAppMode !== 'undefined' && currentAppMode === 'gear' && gearActiveScreenId && screens[gearActiveScreenId])
    ? gearActiveScreenId : currentScreenId;
  if(screens[targetId]) {
    screens[targetId].data.distBoxBackupVertPosition = position;
  }
  generateGearList();
}

// Compatibility getters - these mimic the old checkbox behavior
function isShowArrowsChecked() { return showArrowsEnabled; }
function isRedundancyChecked() { return redundancyEnabled; }
function isUse4WayBumpersChecked() { return use4WayBumpersEnabled; }
function isSnapModeChecked() { return snapModeEnabled; }
function isCB5HalfRowChecked() { return cb5HalfRowEnabled; }
function isConnectionPlates() { return connectionMethod === 'plates'; }

function calculateAdjustedPixelCapacity(processor, frameRate, bitDepth){
  // Check if processor has bit-depth specific capacity values (e.g., MX40 Pro)
  let baseCapacity;
  if(processor.pixels_1g_by_bitdepth && processor.pixels_1g_by_bitdepth[bitDepth]) {
    // Use exact capacity for this bit depth (already accounts for bit depth)
    baseCapacity = processor.pixels_1g_by_bitdepth[bitDepth];
    const baseFR = processor.base_framerate || 60;
    const frameRateScale = baseFR / frameRate;
    return Math.floor(baseCapacity * frameRateScale);
  }

  // Standard calculation for other processors
  baseCapacity = processor.base_pixels_1g || 525000;
  const baseFR = processor.base_framerate || 60;
  const frameRateScale = baseFR / frameRate;
  let bitDepthScale = 1.0;
  if(bitDepth === 10) bitDepthScale = 8 / 10;
  else if(bitDepth === 12) bitDepthScale = 8 / 12;
  const adjustedCapacity = baseCapacity * frameRateScale * bitDepthScale;
  return Math.floor(adjustedCapacity);
}


function showSpecWarningIfNeeded(){
  const allPanels = getAllPanels();
  const p = allPanels[document.getElementById('panelType').value];
  const warn = document.getElementById('specWarning');
  if(!p) { warn.textContent = ''; return; }
  const missingCritical = !p.width_m || !p.height_m || !p.res_x || !p.res_y || !p.power_max_w;
  warn.textContent = missingCritical ? "⚠️ Selected model has unconfirmed specs (TBD). Calculations and layouts are limited until datasheet values are confirmed." : "";
}

