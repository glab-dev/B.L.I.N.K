// ==================== STATE MANAGEMENT ====================
// Unit system, dimension modes, toggles, getters, and state helpers.
// Depends on globals: displayLengthUnit, displayWeightUnit, showArrowsEnabled,
// redundancyEnabled, use4WayBumpersEnabled, snapModeEnabled, cb5HalfRowEnabled,
// connectionMethod, distBoxOnWallEnabled, etc.

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

  document.getElementById('panelCountInputs').style.display = mode === 'panels' ? 'block' : 'none';
  document.getElementById('wallSizeInputs').style.display = mode === 'size' ? 'block' : 'none';

  if(mode === 'panels') {
    syncFromPanels();
  } else {
    syncFromSize();
  }
  calculate();
}

// Aspect Ratio Lock
let currentAspectRatio = 'none';
let customARWidth = 16;
let customARHeight = 10;

function setAspectRatio(ratio) {
  const previousRatio = currentAspectRatio;
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

  // Clear dimension inputs when switching between different aspect ratios (not from 'none')
  if(previousRatio !== 'none' && previousRatio !== ratio) {
    document.getElementById('panelsWide').value = '';
    document.getElementById('panelsHigh').value = '';
    document.getElementById('wallWidth').value = '';
    document.getElementById('wallHeight').value = '';
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

// Apply aspect ratio lock when width changes - calculates height
function applyAspectRatioFromWidth() {
  const aspectRatio = getAspectRatioValue();
  if(!aspectRatio) return; // No aspect ratio lock

  const allPanels = getAllPanels();
  const p = allPanels[document.getElementById('panelType').value];
  if(!p || !p.res_x || !p.res_y) return;

  if(currentDimensionMode === 'panels') {
    // Panels mode: calculate panels high based on panels wide and pixel aspect ratio
    const pwInput = document.getElementById('panelsWide').value;

    // If width is empty, clear height too
    if(pwInput === '' || pwInput === null) {
      document.getElementById('panelsHigh').value = '';
      syncFromPanels();
      return;
    }

    const pw = parseInt(pwInput) || 0;
    if(pw <= 0) return;

    // Total pixels wide
    const totalPixelsWide = pw * p.res_x;
    // Calculate pixels high for target aspect ratio
    const targetPixelsHigh = totalPixelsWide / aspectRatio;
    // Round to nearest panel count
    const ph = Math.max(1, Math.round(targetPixelsHigh / p.res_y));

    document.getElementById('panelsHigh').value = ph;
    syncFromPanels();
    saveCurrentScreenData(); // Save to screen data before calculate
    calculate(); // Trigger calculation to populate wall on canvas
  } else {
    // Size mode: calculate wall height based on wall width
    const wallWidthInput = document.getElementById('wallWidth').value;

    // If width is empty, clear height too
    if(wallWidthInput === '' || wallWidthInput === null) {
      document.getElementById('wallHeight').value = '';
      syncFromSize();
      return;
    }

    const wallWidth = parseFloat(wallWidthInput) || 0;
    if(wallWidth <= 0) return;

    const wallHeight = wallWidth / aspectRatio;
    document.getElementById('wallHeight').value = wallHeight.toFixed(2);
    syncFromSize();
    saveCurrentScreenData(); // Save to screen data before calculate
    calculate(); // Trigger calculation to populate wall on canvas
  }
}

// Phase toggle
function setPhase(phase) {
  document.getElementById('phase').value = phase;
  document.getElementById('phase3Btn').classList.toggle('active', phase === 3);
  document.getElementById('phase1Btn').classList.toggle('active', phase === 1);
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
    
    // Re-initialize bumpers when turned on
    initializeBumpers();
  } else {
    if(bumperControls) bumperControls.style.display = 'none';
    if(fourWayOption) fourWayOption.style.display = 'none';
    if(weightDisplay) weightDisplay.style.display = 'none';
    // Clear bumpers when turned off
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
  if(screens[currentScreenId]) {
    screens[currentScreenId].data.cableDropPosition = position;
  }
  generateGearList();
}

// Dist box on wall toggle
let distBoxOnWallEnabled = false;
function toggleDistBoxOnWall() {
  distBoxOnWallEnabled = !distBoxOnWallEnabled;
  document.getElementById('distBoxOnWallBtn').classList.toggle('active', distBoxOnWallEnabled);
  if(screens[currentScreenId]) {
    screens[currentScreenId].data.distBoxOnWall = distBoxOnWallEnabled;
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

