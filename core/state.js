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

// Dimension mode toggle
let currentDimensionMode = 'panels';
function setDimensionMode(mode) {
  currentDimensionMode = mode;
  document.getElementById('dimModePanelsBtn').classList.toggle('active', mode === 'panels');
  document.getElementById('dimModeSizeBtn').classList.toggle('active', mode === 'size');
  document.getElementById('dimModePixelsBtn').classList.toggle('active', mode === 'pixels');

  document.getElementById('panelCountInputs').style.display = mode === 'panels' ? 'block' : 'none';
  document.getElementById('wallSizeInputs').style.display = mode === 'size' ? 'block' : 'none';
  document.getElementById('pixelInputs').style.display = mode === 'pixels' ? 'block' : 'none';

  if(mode === 'panels') {
    syncFromPanels();
  } else if(mode === 'pixels') {
    syncPixelsFromPanels();
  } else {
    // The wall fields can arrive empty (pixels mode, or a config saved before they were
    // kept in sync). Fill them from the panel counts first - syncFromSize treats an empty
    // wall dimension as "cleared" and would blank the panel counts along with it.
    const wallWidthEl = document.getElementById('wallWidth');
    const wallHeightEl = document.getElementById('wallHeight');
    if(!wallWidthEl.value || !wallHeightEl.value) {
      syncFromPanels();
    }
    syncFromSize();
  }
  calculate();
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
function getAspectRatioDriver() {
  const ids = currentDimensionMode === 'panels' ? ['panelsWide', 'panelsHigh']
            : currentDimensionMode === 'pixels' ? ['pixelsWide', 'pixelsHigh']
            : ['wallWidth', 'wallHeight'];
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
function applyAspectRatioLock(driver) {
  const aspectRatio = getAspectRatioValue();
  if(!aspectRatio) return; // No aspect ratio lock

  // Pixels mode already has a correct bidirectional implementation
  if(currentDimensionMode === 'pixels') {
    applyPixelInput(driver);
    return;
  }

  const allPanels = getAllPanels();
  const p = allPanels[document.getElementById('panelType').value];
  if(!p || !p.res_x || !p.res_y) return;

  if(currentDimensionMode === 'panels') {
    // Panels mode: apply the ratio in pixel space, then round to whole panels
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
  } else {
    // Size mode: apply the ratio directly to the wall dimensions
    const wEl = document.getElementById('wallWidth');
    const hEl = document.getElementById('wallHeight');

    if(driver === 'width') {
      // If width is empty, clear height too
      if(wEl.value === '' || wEl.value === null) {
        hEl.value = '';
        syncFromSize();
        return;
      }
      const wallWidth = parseFloat(wEl.value) || 0;
      if(wallWidth <= 0) return;
      hEl.value = (wallWidth / aspectRatio).toFixed(2);
    } else {
      // If height is empty, clear width too
      if(hEl.value === '' || hEl.value === null) {
        wEl.value = '';
        syncFromSize();
        return;
      }
      const wallHeight = parseFloat(hEl.value) || 0;
      if(wallHeight <= 0) return;
      wEl.value = (wallHeight * aspectRatio).toFixed(2);
    }
    syncFromSize();
  }

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
    
    // Show 4-way option if CB5 panel
    const panelType = document.getElementById('panelType').value;
    const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';
    if(fourWayOption && isCB5) {
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
function toggleCB5HalfRow() {
  cb5HalfRowEnabled = !cb5HalfRowEnabled;
  document.getElementById('addCB5HalfRowBtn').classList.toggle('active', cb5HalfRowEnabled);

  // Update screen data so canvas view reflects the change
  if(typeof screens !== 'undefined' && screens[currentScreenId]) {
    screens[currentScreenId].data.addCB5HalfRow = cb5HalfRowEnabled;
  }

  updateSuggestedDataLimit(); // Update max/data placeholder when half panels toggled
  calculate();
  updateWeightDisplay(); // Update bumper pickup weights for half panel row
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

