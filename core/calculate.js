// ==================== CALCULATION ENGINE ====================
// syncFromPanels, syncFromSize, calculate(), resetCalculator,
// generateLayout dispatcher, and related helpers.

function syncFromPanels(){
  const allPanels = getAllPanels();
  const p=allPanels[document.getElementById('panelType').value];
  if(!p) return;
  const units = displayLengthUnit; // Use global unit setting
  const pwInput = document.getElementById('panelsWide').value;
  const phInput = document.getElementById('panelsHigh').value;
  const wallWidthEl = document.getElementById('wallWidth');
  const wallHeightEl = document.getElementById('wallHeight');
  
  // If either panel value is empty, clear the corresponding wall dimension
  if(!pwInput && wallWidthEl) {
    wallWidthEl.value = '';
  }
  if(!phInput && wallHeightEl) {
    wallHeightEl.value = '';
  }
  
  // Only sync if both panel values are actually entered
  if(!pwInput || !phInput) return;
  
  const pw=Math.max(1,parseInt(pwInput)||1);
  const ph=Math.max(1,parseInt(phInput)||1);
  if(!p.width_m || !p.height_m){ return; }
  const wM=pw*p.width_m, hM=ph*p.height_m;
  if(wallWidthEl) wallWidthEl.value = fromMeters(wM, units).toFixed(2);
  if(wallHeightEl) wallHeightEl.value = fromMeters(hM, units).toFixed(2);
}

function syncFromSize(){
  const allPanels = getAllPanels();
  const p=allPanels[document.getElementById('panelType').value];
  if(!p) return;
  const units = displayLengthUnit; // Use global unit setting
  const wallWidthEl = document.getElementById('wallWidth');
  const wallHeightEl = document.getElementById('wallHeight');
  const wInput = wallWidthEl ? wallWidthEl.value : '';
  const hInput = wallHeightEl ? wallHeightEl.value : '';
  const panelsWideEl = document.getElementById('panelsWide');
  const panelsHighEl = document.getElementById('panelsHigh');
  
  // If either wall dimension is empty, clear the corresponding panel count
  if(!wInput && panelsWideEl) {
    panelsWideEl.value = '';
  }
  if(!hInput && panelsHighEl) {
    panelsHighEl.value = '';
  }
  
  // Only sync if both wall dimensions are actually entered
  if(!wInput || !hInput) return;
  
  const w = parseFloat(wInput);
  const h = parseFloat(hInput);
  if(!p.width_m || !p.height_m || w <= 0 || h <= 0){ return; }
  const wM = toMeters(w, units);
  const hM = toMeters(h, units);
  const pw = Math.max(1, Math.round(wM / p.width_m));
  const ph = Math.max(1, Math.round(hM / p.height_m));
  if(panelsWideEl) panelsWideEl.value = pw;
  if(panelsHighEl) panelsHighEl.value = ph;
}

function getEffectivePanelCounts(){
  const allPanels = getAllPanels();
  const p=allPanels[document.getElementById('panelType').value];
  if(!p) return {pw:0, ph:0, entered:{wM:0,hM:0}, snapped:{wM:0,hM:0}};
  const units = displayLengthUnit; // Use global unit setting
  const wallWidthEl = document.getElementById('wallWidth');
  const wallHeightEl = document.getElementById('wallHeight');
  const w = wallWidthEl ? (parseFloat(wallWidthEl.value)||0) : 0;
  const h = wallHeightEl ? (parseFloat(wallHeightEl.value)||0) : 0;
  if(w>0 && h>0 && p.width_m && p.height_m){
    const wM=toMeters(w, units), hM=toMeters(h, units);
    const pw=Math.max(1, Math.round(wM / p.width_m));
    const ph=Math.max(1, Math.round(hM / p.height_m));
    return {pw, ph, entered:{w, h, units}, snapped:{wM:pw*p.width_m, hM:ph*p.height_m}};
  }else{
    const pw=Math.max(1,parseInt(document.getElementById('panelsWide').value)||1);
    const ph=Math.max(1,parseInt(document.getElementById('panelsHigh').value)||1);
    return {pw, ph, entered:null, snapped:{wM:p.width_m?pw*p.width_m:0, hM:p.height_m?ph*p.height_m:0}};
  }
}

function calculateActualDataLines(pw, ph, panelsPerDataLine, startDir, deletedPanelsParam, customAssignmentsParam) {
  // Use per-screen params if provided, otherwise fall back to globals
  const dp = deletedPanelsParam || deletedPanels;
  const cdla = customAssignmentsParam || customDataLineAssignments;

  // Collect all custom data line numbers in use first
  const usedCustomDataLines = new Set();
  for(let c=0; c<pw; c++){
    for(let r=0; r<ph; r++) {
      const panelKey = `${c},${r}`;
      if(!dp.has(panelKey) && cdla.has(panelKey)) {
        usedCustomDataLines.add(cdla.get(panelKey) - 1);
      }
    }
  }

  // Build panel assignments based on start direction
  let maxDataLine = -1;

  if(startDir === 'all_top') {
    // Each column is its own data line
    let autoDataLineCounter = 0;
    for(let c=0; c<pw; c++){
      while(usedCustomDataLines.has(autoDataLineCounter)) {
        autoDataLineCounter++;
      }

      for(let r=0; r<ph; r++) {
        const panelKey = `${c},${r}`;
        if(!dp.has(panelKey)) {
          const dataLine = cdla.has(panelKey)
            ? cdla.get(panelKey) - 1
            : autoDataLineCounter;
          if(dataLine > maxDataLine) maxDataLine = dataLine;
        }
      }
      autoDataLineCounter++;
    }
  } else if(startDir === 'all_bottom') {
    // Each column is its own data line
    let autoDataLineCounter = 0;
    for(let c=0; c<pw; c++){
      while(usedCustomDataLines.has(autoDataLineCounter)) {
        autoDataLineCounter++;
      }

      for(let r=ph-1; r>=0; r--) {
        const panelKey = `${c},${r}`;
        if(!dp.has(panelKey)) {
          const dataLine = cdla.has(panelKey)
            ? cdla.get(panelKey) - 1
            : autoDataLineCounter;
          if(dataLine > maxDataLine) maxDataLine = dataLine;
        }
      }
      autoDataLineCounter++;
    }
  } else {
    // Serpentine: top or bottom
    // Use per-panel counting to match generateLayout visualization
    const startFromTop = (startDir === 'top');
    let autoDataLineCounter = 0;
    let panelsInCurrentAutoDataLine = 0;

    // Skip initial custom data lines
    while(usedCustomDataLines.has(autoDataLineCounter)) {
      autoDataLineCounter++;
    }

    // Build serpentine path
    let currentColumn = 0;
    let serpentineGoingDown = startFromTop;

    while(currentColumn < pw) {
      // Process panels in this column in serpentine order
      const rows = serpentineGoingDown
        ? Array.from({length: ph}, (_, i) => i)
        : Array.from({length: ph}, (_, i) => ph - 1 - i);

      for(const r of rows) {
        const panelKey = `${currentColumn},${r}`;
        if(dp.has(panelKey)) continue;

        let dataLine;
        if(cdla.has(panelKey)) {
          dataLine = cdla.get(panelKey) - 1;
        } else {
          // Find next available data line number (skip over custom assignments)
          while(usedCustomDataLines.has(autoDataLineCounter)) {
            autoDataLineCounter++;
          }

          dataLine = autoDataLineCounter;
          panelsInCurrentAutoDataLine++;

          // Move to next data line when we reach the limit
          if(panelsInCurrentAutoDataLine >= panelsPerDataLine) {
            autoDataLineCounter++;
            panelsInCurrentAutoDataLine = 0;

            // Skip over any custom data lines
            while(usedCustomDataLines.has(autoDataLineCounter)) {
              autoDataLineCounter++;
            }
          }
        }

        if(dataLine > maxDataLine) maxDataLine = dataLine;
      }

      // Move to next column and toggle direction
      currentColumn++;
      serpentineGoingDown = !serpentineGoingDown;
    }
  }

  // Return total number of data lines
  return maxDataLine + 1;
}

// Lightweight calculation that populates screen.calculatedData from screen.data
// without DOM access. Used on project load to ensure all screens (not just the
// current one) have calculatedData populated for cable diagrams and gear lists.
function recalculateScreenData(screenId) {
  const screen = screens[screenId];
  if (!screen || !screen.data) return;

  const data = screen.data;
  const allPanels = typeof getAllPanels === 'function' ? getAllPanels() : (typeof panels !== 'undefined' ? panels : {});
  const allProcessors = typeof getAllProcessors === 'function' ? getAllProcessors() : (typeof processors !== 'undefined' ? processors : {});

  const panelType = data.panelType || 'BP2_V2';
  const p = allPanels[panelType];
  if (!p || !p.width_m || !p.res_x) return;

  const pw = data.panelsWide || 0;
  const ph = data.panelsHigh || 0;
  if (pw === 0 || ph === 0) return;

  const processorId = data.processor || 'Brompton_SX40';
  const pr = allProcessors[processorId];
  if (!pr) return;

  const dp = data.deletedPanels || new Set();
  const cdla = data.customDataLineAssignments || new Map();

  // Count active panels (prune out-of-bounds deleted panels)
  let activePanelCount = 0;
  for (var c = 0; c < pw; c++) {
    for (var r = 0; r < ph; r++) {
      if (!dp.has(c + ',' + r)) activePanelCount++;
    }
  }

  const hasCB5HalfRow = data.addCB5HalfRow && panelType === 'CB5_MKII';
  const effectivePh = hasCB5HalfRow ? ph + 1 : ph;

  // Total panels and pixels
  var totalPanels, totalPixels;
  if (hasCB5HalfRow) {
    var halfPanel = allPanels['CB5_MKII_HALF'];
    var halfPanelCount = pw;
    totalPanels = activePanelCount + halfPanelCount;
    totalPixels = (activePanelCount * p.res_x * p.res_y) + (halfPanelCount * (halfPanel ? halfPanel.res_x * halfPanel.res_y : 0));
  } else {
    totalPanels = activePanelCount;
    totalPixels = activePanelCount * p.res_x * p.res_y;
  }

  // Power circuits
  var powerType = data.powerType || 'max';
  var voltage = data.voltage || 208;
  var breaker = data.breaker || 20;
  var perPanelW = powerType === 'avg' ? (p.power_avg_w || p.power_max_w * 0.5) : p.power_max_w;
  var circuitCapacityW = voltage * breaker;
  var calculatedPanelsPerCircuit = Math.max(1, Math.floor(circuitCapacityW / perPanelW));
  var userMaxCircuit = parseInt(data.maxPanelsPerCircuit) || 0;
  var panelsPerCircuit = userMaxCircuit > 0 ? userMaxCircuit : calculatedPanelsPerCircuit;
  var columnsPerCircuit = Math.max(1, Math.floor(panelsPerCircuit / ph));
  var circuitsNeeded = Math.ceil(pw / columnsPerCircuit);
  var socaCount = Math.ceil(circuitsNeeded / 6);

  // Data lines
  var pixelsPerPanel = p.res_x * p.res_y;
  var frameRate = data.frameRate || 60;
  var bitDepth = data.bitDepth || 8;
  var adjustedCapacity = typeof calculateAdjustedPixelCapacity === 'function'
    ? calculateAdjustedPixelCapacity(pr, frameRate, bitDepth)
    : pr.total_pixels || 650000;

  var capacityBasedPPD;
  if (hasCB5HalfRow) {
    var halfP2 = allPanels['CB5_MKII_HALF'];
    var halfPx = halfP2 ? halfP2.res_x * halfP2.res_y : 0;
    var totalMixed = activePanelCount + pw;
    var totalMixedPx = (activePanelCount * pixelsPerPanel) + (pw * halfPx);
    var avgPxPerPanel = totalMixed > 0 ? totalMixedPx / totalMixed : pixelsPerPanel;
    capacityBasedPPD = Math.max(1, Math.floor(adjustedCapacity / avgPxPerPanel));
  } else {
    capacityBasedPPD = Math.max(1, Math.floor(adjustedCapacity / pixelsPerPanel));
  }
  capacityBasedPPD = Math.min(capacityBasedPPD, 500);

  var userMaxData = parseInt(data.maxPanelsPerData) || 0;
  var panelsPerDataLine = userMaxData > 0 ? userMaxData : capacityBasedPPD;
  var dataStartDir = data.dataStartDir || 'top';
  var dataLines = calculateActualDataLines(pw, effectivePh, panelsPerDataLine, dataStartDir, dp, cdla);
  var redundancy = data.redundancy !== false;
  var portsNeeded = dataLines;
  var redundancyMultiplier = redundancy ? 2 : 1;
  var portsNeededFinal = portsNeeded * redundancyMultiplier;

  // Processor and distribution box counts
  var processorCount = 1;
  var distributionBoxCount = 0;
  var distributionBoxName = '';
  var mx40ConnectionMode = data.mx40ConnectionMode || 'direct';

  if (processorId === 'Brompton_SX40') {
    var baseDistCount = Math.ceil(portsNeeded / 10);
    distributionBoxCount = redundancy ? baseDistCount * 2 : baseDistCount;
    distributionBoxName = 'Brompton XD';
    processorCount = Math.ceil(totalPixels / pr.total_pixels);
  } else if (processorId === 'NovaStar_MX40_Pro') {
    if (mx40ConnectionMode === 'direct') {
      var procByPorts = Math.ceil(portsNeededFinal / 20);
      var procByPixels = Math.ceil(totalPixels / 9000000);
      processorCount = Math.max(procByPorts, procByPixels);
    } else {
      var portsPerCVT = 10;
      distributionBoxCount = Math.ceil(portsNeededFinal / portsPerCVT);
      distributionBoxName = 'NovaStar CVT-10 Pro';
      var procByPx = Math.ceil(totalPixels / 9000000);
      var procByCVTs = Math.ceil(distributionBoxCount / 4);
      processorCount = Math.max(procByPx, procByCVTs);
    }
  } else {
    processorCount = Math.max(1, Math.ceil(totalPixels / (pr.total_pixels || 9000000)));
  }

  // Panel weight
  var panelWeightOnly = totalPanels * (p.weight_kg || 0);
  if (hasCB5HalfRow) {
    var halfP3 = allPanels['CB5_MKII_HALF'];
    panelWeightOnly = (activePanelCount * (p.weight_kg || 0)) + (pw * (halfP3 ? halfP3.weight_kg || 0 : 0));
  }

  screen.calculatedData = {
    processorName: pr.name,
    processorCount: processorCount,
    distributionBoxCount: distributionBoxCount,
    distributionBoxName: distributionBoxName,
    mx40ProcessorCount: processorCount,
    panelCount: totalPanels,
    activePanels: totalPanels,
    panelWeightOnlyKg: panelWeightOnly,
    bumperWeightKg: 0,
    bumper1wCount: 0,
    bumper2wCount: 0,
    bumper4wCount: 0,
    dataLines: dataLines,
    portsNeeded: portsNeeded,
    portsNeededFinal: portsNeededFinal,
    panelsPerDataLine: panelsPerDataLine,
    totalPixels: totalPixels,
    circuitsNeeded: circuitsNeeded,
    socaCount: socaCount,
    columnsPerCircuit: columnsPerCircuit
  };
}


function resetCalculator() {
  // Clear the current screen's stored data so it doesn't get restored
  if(typeof screens !== 'undefined' && typeof currentScreenId !== 'undefined' && screens[currentScreenId]) {
    // Reset the screen data to defaults
    screens[currentScreenId].data = {
      panelsWide: '',
      panelsHigh: '',
      wallWidth: '',
      wallHeight: '',
      units: 'ft',
      dimensionMode: 'panels',
      panelType: document.getElementById('panelType').value, // Keep the newly selected panel type
      voltage: 208,
      breaker: 20,
      phase: '3',
      derate: false,
      powerType: 'max',
      maxPanelsPerCircuit: '',
      processor: 'Brompton_SX40',
      frameRate: 60,
      bitDepth: 8,
      maxPanelsPerData: '',
      dataStartDir: 'top',
      showArrows: true,
      dataFlip: false,
      redundancy: true,
      processorRedundancy: false,
      structureType: 'hanging',
      useBumpers: true,
      use4WayBumpers: false,
      deletedPanels: new Set(),
      bumpers: [],
      canvasX: 0,
      canvasY: 0,
      addCB5HalfRow: false,
      wallToFloor: 5,
      distroToWall: 10,
      processorToWall: 15,
      serverToProcessor: 50,
      cablePick: 0,
      cableDropPosition: 'behind',
      powerInPosition: 'top',
      distBoxOnWall: false,
      distBoxMainHorizPosition: 'center',
      distBoxBackupHorizPosition: 'center',
      distBoxMainVertPosition: 'top',
      distBoxBackupVertPosition: 'top'
    };
  }

  // Reset input fields to default values
  document.getElementById('panelsWide').value = '';
  document.getElementById('panelsHigh').value = '';
  document.getElementById('wallWidth').value = '';
  document.getElementById('wallHeight').value = '';
  
  // Reset units to defaults (Imperial)
  displayLengthUnit = 'ft';
  displayWeightUnit = 'lbs';
  document.getElementById('unitImperial')?.classList.add('active');
  document.getElementById('unitMetric')?.classList.remove('active');
  
  // Reset toggle states
  cb5HalfRowEnabled = false;
  document.getElementById('addCB5HalfRowBtn')?.classList.remove('active');
  
  use4WayBumpersEnabled = false;
  document.getElementById('use4WayBumpersBtn')?.classList.remove('active');
  
  redundancyEnabled = true;
  document.getElementById('redundancyBtn')?.classList.add('active');
  
  showArrowsEnabled = true;
  document.getElementById('showArrowsBtn')?.classList.add('active');

  dataFlipEnabled = false;
  const dataFlipBtnReset = document.getElementById('dataFlipBtn');
  if(dataFlipBtnReset) { dataFlipBtnReset.classList.remove('active'); dataFlipBtnReset.style.display = ''; }

  snapModeEnabled = true;
  document.getElementById('snapModeBtn')?.classList.add('active');
  
  // Reset connection method to air frames (default)
  connectionMethod = 'airframe';
  document.getElementById('connectionAirframeBtn')?.classList.add('active');
  document.getElementById('connectionPlatesBtn')?.classList.remove('active');
  
  // Reset dimension mode
  currentDimensionMode = 'panels';
  document.getElementById('dimModePanelsBtn')?.classList.add('active');
  document.getElementById('dimModeSizeBtn')?.classList.remove('active');
  
  // Reset bumper distribution to auto
  const bumperDist = document.getElementById('bumperDistribution');
  if(bumperDist) bumperDist.value = 'auto';
  
  // Reset structure type to hanging
  const structureType = document.getElementById('structureType');
  if(structureType) structureType.value = 'hanging';
  
  // Reset max panels per data line
  document.getElementById('maxPanelsPerData').value = '';
  
  // Reset max panels per circuit
  document.getElementById('maxPanelsPerCircuit').value = '';
  
  // Reset cabling fields
  distBoxOnWallEnabled = false;
  document.getElementById('distBoxOnWallBtn')?.classList.remove('active');
  cableDropPosition = 'behind';
  document.getElementById('cableDropBehindBtn')?.classList.add('active');
  document.getElementById('cableDropSRBtn')?.classList.remove('active');
  document.getElementById('cableDropSLBtn')?.classList.remove('active');
  const wallToFloorEl = document.getElementById('wallToFloor');
  if(wallToFloorEl) wallToFloorEl.value = '';
  const distroToWallEl = document.getElementById('distroToWall');
  if(distroToWallEl) distroToWallEl.value = '';
  const processorToWallEl = document.getElementById('processorToWall');
  if(processorToWallEl) processorToWallEl.value = '';
  const serverToProcessorEl = document.getElementById('serverToProcessor');
  if(serverToProcessorEl) serverToProcessorEl.value = '';
  const cablePickEl = document.getElementById('cablePick');
  if(cablePickEl) cablePickEl.value = '';

  // Clear deleted panels
  deletedPanels.clear();
  
  // Clear selected panels (standard layout view)
  selectedPanels.clear();
  
  // Clear custom circuit assignments
  customCircuitAssignments.clear();
  
  // Clear custom data line assignments
  customDataLineAssignments.clear();
  
  // Reset bumpers
  bumpers = [];
  nextBumperId = 1;
  selectedBumper = null;
  hoveredBumper = null;
  
  // Reset global bumper visibility flags
  showTopBumper = true;
  showBottomBumper = false;
  
  // Reset manual bumper mode
  manualBumperMode = false;
  selectedBumpers.clear();
  structureIsDragging = false;
  structureDraggingBumper = null;
  
  // Reset structure view undo/redo
  structureHistory = [];
  structureHistoryIndex = -1;
  
  // Update manual mode UI
  const toggleBtn = document.getElementById('manualBumperToggle');
  const hintSpan = document.getElementById('structureModeHint');
  const selectionInfo = document.getElementById('structureSelectionInfo');
  const undoRedoDiv = document.getElementById('structureUndoRedo');
  if(toggleBtn) {
    toggleBtn.classList.remove('active');
    toggleBtn.textContent = 'Manually Distribute Bumpers';
  }
  if(hintSpan) hintSpan.textContent = 'Auto-distribution active';
  if(selectionInfo) selectionInfo.classList.remove('visible');
  if(undoRedoDiv) undoRedoDiv.style.display = 'none';
  
  // Reset canvas event listener flag so it can be re-attached
  const structCanvas = document.getElementById('structureCanvas');
  if(structCanvas) structCanvas._structureListenersAttached = false;
  
  // Reset legacy bumper variables
  topBumper1wColumn = -1;
  bottomBumper1wColumn = -1;
  manualTopBumpers = [];
  manualBottomBumpers = [];
  
  // Clear undo/redo stacks
  undoStack = [];
  redoStack = [];
  canvasUndoStack = [];
  canvasRedoStack = [];
  undoHistory = [];
  redoHistory = [];
  
  // Reset canvas view state
  canvasOffsetX = 0;
  canvasOffsetY = 0;
  canvasZoomLevel = 1.0;
  canvasPanX = 0;
  canvasPanY = 0;
  
  // Reset context menu state
  contextMenuVisible = false;
  hideContextMenu();
  
  // Reset results display
  document.getElementById('results').innerText = '';
  
  // Hide all layout containers (except canvasContainer if we're on canvas page)
  const layoutContainers = ['standardContainer', 'structureContainer', 'powerContainer', 'dataContainer', 'gearListContainer'];
  if(typeof currentMobileView === 'undefined' || (currentMobileView !== 'canvas' && currentMobileView !== 'raster')) {
    layoutContainers.push('canvasContainer');
  }
  layoutContainers.forEach(containerId => {
    const container = document.getElementById(containerId);
    if(container) {
      container.style.display = 'none';
    }
  });

  // Clear all canvas drawings
  const canvases = ['standardCanvas', 'structureCanvas', 'powerCanvas', 'dataCanvas', 'canvasViewCanvas'];
  canvases.forEach(canvasId => {
    const canvas = document.getElementById(canvasId);
    if(canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Also reset canvas dimensions
      canvas.width = 0;
      canvas.height = 0;
    }
  });
  
  // Hide pickup weight summary
  const pickupSummary = document.getElementById('pickupWeightSummary');
  if(pickupSummary) pickupSummary.style.display = 'none';

  // Update 4-way bumper visibility
  const fourWayOption = document.getElementById('fourWayBumperOption');
  const panelType = document.getElementById('panelType').value;
  const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';
  if(fourWayOption) {
    fourWayOption.style.display = isCB5 ? 'block' : 'none';
  }
  
  // Update connecting plates visibility
  updateConnectingPlatesVisibility(panelType);
  
  // Force immediate DOM update by reading a layout property
  document.body.offsetHeight;
  
  // Hide all layout containers AND clear their visibility with repaint (except canvasContainer if we're on canvas page)
  const layoutContainersToHide = ['standardContainer', 'structureContainer', 'powerContainer', 'dataContainer', 'gearListContainer'];
  if(typeof currentMobileView === 'undefined' || (currentMobileView !== 'canvas' && currentMobileView !== 'raster')) {
    layoutContainersToHide.push('canvasContainer');
  }
  layoutContainersToHide.forEach(containerId => {
    const container = document.getElementById(containerId);
    if(container) {
      container.style.display = 'none';
      // Force repaint by toggling a class
      container.classList.add('reset-hidden');
      void container.offsetWidth; // Force reflow
    }
  });
  
  // Clear all canvases
  const canvasesToClear = ['standardCanvas', 'structureCanvas', 'powerCanvas', 'dataCanvas', 'canvasViewCanvas'];
  canvasesToClear.forEach(canvasId => {
    const canvas = document.getElementById(canvasId);
    if(canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
    }
  });
  
  // Show ready message - use setTimeout to ensure it runs after all other event handlers
  setTimeout(() => {
    document.getElementById('results').innerHTML = '<div style="padding: 40px; text-align: center; color: #888;">' +
      '<h3 style="color: #10b981; margin-bottom: 10px;">Ready to Configure</h3>' +
      '<p>Enter panel dimensions above to begin calculating your LED wall.</p>' +
      '</div>';
  }, 50);
}

function calculate(){
  console.log('=== calculate() called ===');
  console.log('Current screen:', currentScreenId);
  
  showSpecWarningIfNeeded();
  
  // Check if this is an empty/new screen (no dimensions entered)
  const panelsWideInput = document.getElementById('panelsWide');
  const panelsHighInput = document.getElementById('panelsHigh');
  const wallWidthInput = document.getElementById('wallWidth');
  const wallHeightInput = document.getElementById('wallHeight');
  
  const panelsWideVal = panelsWideInput ? panelsWideInput.value.trim() : '';
  const panelsHighVal = panelsHighInput ? panelsHighInput.value.trim() : '';
  const wallWidthVal = wallWidthInput ? wallWidthInput.value.trim() : '';
  const wallHeightVal = wallHeightInput ? wallHeightInput.value.trim() : '';
  
  // If all dimension fields are empty, show a helpful message
  if(!panelsWideVal && !panelsHighVal && !wallWidthVal && !wallHeightVal) {
    document.getElementById('results').innerHTML = '<div style="padding: 40px; text-align: center; color: #888;">' +
      '<h3 style="color: #10b981; margin-bottom: 10px;">Ready to Configure</h3>' +
      '<p>Enter panel dimensions above to begin calculating your LED wall.</p>' +
      '</div>';
    
    // Hide all layout containers (except canvasContainer if we're on canvas page, and gearListContainer if we're on gear tab)
    const layoutContainers = ['standardContainer', 'structureContainer', 'powerContainer', 'dataContainer'];
    if(typeof currentMobileView === 'undefined' || currentMobileView !== 'gear') {
      layoutContainers.push('gearListContainer');
    }
    if(typeof currentMobileView === 'undefined' || (currentMobileView !== 'canvas' && currentMobileView !== 'raster')) {
      layoutContainers.push('canvasContainer');
    }
    layoutContainers.forEach(containerId => {
      const container = document.getElementById(containerId);
      if(container) {
        container.style.display = 'none';
      }
    });

    // Clear all canvases for empty screen
    const canvases = ['standardCanvas', 'structureCanvas', 'powerCanvas', 'dataCanvas', 'canvasViewCanvas'];
    canvases.forEach(canvasId => {
      const canvas = document.getElementById(canvasId);
      if(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
    return;
  }
  
  const allPanels = getAllPanels();
  const allProcessors = getAllProcessors();
  const panelType = document.getElementById('panelType').value;
  const p=allPanels[panelType];
  const pr=allProcessors[document.getElementById('processor').value];
  if(!p.width_m || !p.height_m || !p.res_x || !p.res_y || !p.power_max_w){
    document.getElementById('results').innerText = "Please confirm specs for this model (dimensions, resolution, power, etc.) before running calculations.";
    return;
  }
  
  // Check if CB5 half panel row is enabled
  // Using cb5HalfRowEnabled toggle state
  const hasCB5HalfRow = cb5HalfRowEnabled && panelType === 'CB5_MKII';
  
  const powerType = document.getElementById('powerType').value;
  const voltage = parseFloat(document.getElementById('voltage').value)||220;
  const breaker = parseFloat(document.getElementById('breaker').value)||20;
  const phase = parseInt(document.getElementById('phase').value)||3;
  // Derate removed - default to no derating
  const derate = 1.0; // Derating disabled
  const {pw, ph, entered, snapped} = getEffectivePanelCounts();
  const units = displayLengthUnit; // Use global unit setting

  const wallWM = snapped.wM, wallHM = snapped.hM;
  const wallWF = wallWM? (wallWM/0.3048) : 0;
  const wallHF = wallHM? (wallHM/0.3048) : 0;

  const totalPanelsGrid = pw*ph;
  // Prune out-of-bounds deletedPanels (stale entries from previous grid sizes)
  const prunedDeleted = new Set();
  deletedPanels.forEach(key => {
    const parts = key.split(',');
    const c = parseInt(parts[0]), r = parseInt(parts[1]);
    if(c >= 0 && c < pw && r >= 0 && r < ph) prunedDeleted.add(key);
  });
  if(prunedDeleted.size !== deletedPanels.size) {
    deletedPanels = prunedDeleted;
    if(screens[currentScreenId]) {
      screens[currentScreenId].data.deletedPanels = new Set(deletedPanels);
    }
  }
  const activePanelsCount = totalPanelsGrid - deletedPanels.size;
  
  // Calculate mixed panel counts if CB5 half row is enabled
  let totalPanels, totalPixels, totalWeight, totalPowerW, resX, resY, adjustedWallHM, adjustedWallHF;
  
  if(hasCB5HalfRow) {
    // Get half panel specs
    const halfPanel = panels['CB5_MKII_HALF'];

    // Main panels are all full CB5 panels (pw * ph)
    const mainPanelCount = activePanelsCount; // All full panels
    const halfPanelCount = pw; // Additional half panel row at bottom

    // Calculate totals combining both panel types
    totalPanels = mainPanelCount + halfPanelCount;
    totalPixels = (mainPanelCount * (p.res_x * p.res_y)) + (halfPanelCount * (halfPanel.res_x * halfPanel.res_y));
    
    // Calculate panel weight and add bumper weight
    // Get correct panel weights based on connection method
    const useConnectingPlates = shouldUseConnectingPlates(panelType);
    const mainPanelWeightKg = getPanelWeight('CB5_MKII', useConnectingPlates);
    const halfPanelWeightKg = getPanelWeight('CB5_MKII_HALF', useConnectingPlates);
    
    const panelWeight = (mainPanelCount * mainPanelWeightKg) + (halfPanelCount * halfPanelWeightKg);
    const bumperWeight = calculateTotalBumperWeight(pw, ph);
    
    // Calculate connecting plates weight if applicable
    let plateWeight = 0;
    
    if (useConnectingPlates) {
      const plates = calculateConnectingPlates(pw, ph, PLATE_WEIGHTS.plate2wayKg, PLATE_WEIGHTS.plate4wayKg);
      plateWeight = plates.totalPlateWeight;
      updatePlatesDisplay(true, pw, ph, PLATE_WEIGHTS.plate2wayKg, PLATE_WEIGHTS.plate4wayKg);
    } else {
      updatePlatesDisplay(false, 0, 0, 0, 0);
    }

    totalWeight = panelWeight + bumperWeight + plateWeight;

    const perPanelW = powerType==='max' ? p.power_max_w : (p.power_avg_w||p.power_max_w*0.5);
    const perHalfPanelW = powerType==='max' ? halfPanel.power_max_w : (halfPanel.power_avg_w||halfPanel.power_max_w*0.5);
    totalPowerW = (mainPanelCount * perPanelW) + (halfPanelCount * perHalfPanelW);
    
    // Resolution includes both types
    resX = pw * p.res_x; // Width stays same
    resY = (ph * p.res_y) + halfPanel.res_y; // All full rows + half row

    // Adjust wall height to include half panel row
    adjustedWallHM = wallHM + halfPanel.height_m;
    adjustedWallHF = adjustedWallHM / 0.3048;
  } else {
    // Standard calculation (no half panels)
    totalPanels = activePanelsCount;
    resX = pw*p.res_x;
    resY = ph*p.res_y;
    totalPixels = activePanelsCount * (p.res_x*p.res_y);
    
    // Calculate panel weight and add bumper weight
    const useConnectingPlates = shouldUseConnectingPlates(panelType);
    const panelWeightKg = getPanelWeight(panelType, useConnectingPlates);
    
    const panelWeight = totalPanels * panelWeightKg;
    const bumperWeight = calculateTotalBumperWeight(pw, ph);
    
    // Calculate connecting plates weight if applicable
    let plateWeight = 0;
    
    if (useConnectingPlates) {
      const plates = calculateConnectingPlates(pw, ph, PLATE_WEIGHTS.plate2wayKg, PLATE_WEIGHTS.plate4wayKg);
      plateWeight = plates.totalPlateWeight;
      updatePlatesDisplay(true, pw, ph, PLATE_WEIGHTS.plate2wayKg, PLATE_WEIGHTS.plate4wayKg);
    } else {
      updatePlatesDisplay(false, 0, 0, 0, 0);
    }

    totalWeight = panelWeight + bumperWeight + plateWeight;

    const perPanelW = powerType==='max' ? p.power_max_w : (p.power_avg_w||p.power_max_w*0.5);
    totalPowerW = totalPanels * perPanelW;
    adjustedWallHM = wallHM;
    adjustedWallHF = wallHF;
  }
  
  const totalWeightLbs = totalWeight * 2.20462;

  const circuitCapacityW = voltage*breaker*derate;
  const perPanelW = powerType==='max' ? p.power_max_w : (p.power_avg_w||p.power_max_w*0.5);
  
  // Always calculate based on power settings
  const calculatedPanelsPerCircuit = Math.max(1, Math.floor(circuitCapacityW / perPanelW));
  
  // Get user override or use calculated value
  const userMaxPanelsPerCircuit = parseInt(document.getElementById('maxPanelsPerCircuit').value);
  const panelsPerCircuit = userMaxPanelsPerCircuit > 0 ? userMaxPanelsPerCircuit : calculatedPanelsPerCircuit;
  
  // Update placeholder to show calculated value
  const maxPanelsPerCircuitInput = document.getElementById('maxPanelsPerCircuit');
  if(maxPanelsPerCircuitInput) {
    maxPanelsPerCircuitInput.placeholder = calculatedPanelsPerCircuit.toString();
  }
  
  const columnsPerCircuit = Math.max(1, Math.floor(panelsPerCircuit / ph));
  const circuitsByColumns = Math.ceil(pw / columnsPerCircuit);

  const ampsSingle = totalPowerW / voltage;
  // For 3-phase: Total Watts / Voltage = Total Amps, then Total Amps / 3 = Amps per phase
  const totalAmps = totalPowerW / voltage;
  const ampsPerPhase = phase===3 ? (totalAmps / 3) : ampsSingle;

  const pixelsPerPanel = p.res_x*p.res_y;
  const frameRate = parseInt(document.getElementById('frameRate').value) || 60;
  const bitDepth = parseInt(document.getElementById('bitDepth').value) || 8;
  // Using redundancyEnabled toggle state
  const redundancy = redundancyEnabled;
  const adjustedCapacity = calculateAdjustedPixelCapacity(pr, frameRate, bitDepth);
  
  // Calculate suggested panels per data line accounting for mixed panel types
  let capacityBasedPanelsPerData;
  if(hasCB5HalfRow) {
    // With half panels, we need to calculate based on average pixels per panel
    const halfPanel = panels['CB5_MKII_HALF'];
    const halfPanelPixels = halfPanel.res_x * halfPanel.res_y;
    const mainPanelCount = activePanelsCount; // All full panels
    const halfPanelCount = pw; // Additional half panel row
    const totalMixedPanels = mainPanelCount + halfPanelCount;
    const totalMixedPixels = (mainPanelCount * pixelsPerPanel) + (halfPanelCount * halfPanelPixels);
    const avgPixelsPerPanel = totalMixedPixels / totalMixedPanels;
    capacityBasedPanelsPerData = Math.max(1, Math.floor(adjustedCapacity / avgPixelsPerPanel));
  } else {
    capacityBasedPanelsPerData = Math.max(1, Math.floor(adjustedCapacity / pixelsPerPanel));
  }

  // Cap at 500 panels per port (Brompton Tessera hardware limit)
  const MAX_PANELS_PER_PORT = 500;
  capacityBasedPanelsPerData = Math.min(capacityBasedPanelsPerData, MAX_PANELS_PER_PORT);

  // Max panels per data = port capacity based (varies with frame rate + bit depth)
  const suggestedPanelsPerData = capacityBasedPanelsPerData;
  
  const userMax = parseInt(document.getElementById('maxPanelsPerData').value);
  const panelsPerDataLine = userMax>0 ? userMax : suggestedPanelsPerData;
  
  // Get data start direction
  const startDirEl = document.getElementById('dataStartDir');
  const startDir = startDirEl ? startDirEl.value : 'top';
  
  // Calculate actual data lines used (including custom assignments)
  // Use adjusted ph if CB5 half row is enabled
  const adjustedPh = hasCB5HalfRow ? ph + 1 : ph;
  const actualDataLines = calculateActualDataLines(pw, adjustedPh, panelsPerDataLine, startDir);
  const dataLines = actualDataLines;
  const portsNeeded = dataLines; // Each data line needs one port
  
  const redundancyMultiplier = redundancy ? 2 : 1;
  const portsNeededFinal = portsNeeded * redundancyMultiplier;
  const dataLinesFinal = dataLines * redundancyMultiplier;

  const ar = (wallWM&&wallHM) ? approxAspectRatio(wallWM, wallHM) : {label:"N/A", value:0};

  // Calculate weight breakdown
  const bumperWeight = calculateTotalBumperWeight(pw, ph);

  // Calculate actual panel weight (not derived from totalWeight which includes plates)
  const useConnectingPlatesForWeight = shouldUseConnectingPlates(panelType);
  let panelWeightOnly = 0;
  if(hasCB5HalfRow) {
    const mainPanelWeightKg = getPanelWeight('CB5_MKII', useConnectingPlatesForWeight);
    const halfPanelWeightKg = getPanelWeight('CB5_MKII_HALF', useConnectingPlatesForWeight);
    const mainPanelCount = activePanelsCount;
    const halfPanelCount = pw;
    panelWeightOnly = (mainPanelCount * mainPanelWeightKg) + (halfPanelCount * halfPanelWeightKg);
  } else {
    const panelWeightKg = getPanelWeight(panelType, useConnectingPlatesForWeight);
    panelWeightOnly = totalPanels * panelWeightKg;
  }
  
  // AUTOMATIC DISTRIBUTION CALCULATION
  const processorId = document.getElementById('processor').value;
  let distributionBoxName = '';
  let distributionCount = 0;
  let mx40ProcessorCount = 0;

  if(processorId === 'Brompton_SX40' && portsNeeded > 0) {
    // SX40 uses XD boxes: 10 ports per XD
    // Calculate XDs needed for main lines, then double if redundancy (separate XDs for backup)
    const baseDistributionCount = Math.ceil(portsNeeded / 10);
    distributionCount = redundancy ? baseDistributionCount * 2 : baseDistributionCount;
    distributionBoxName = 'Brompton XD';
  } else if(processorId === 'NovaStar_MX40_Pro' && portsNeeded > 0) {
    // MX40 Pro logic:
    // Direct mode: 20 ports per processor
    // Indirect mode: 10 ports per CVT box, 4 CVTs per processor max

    if(mx40ConnectionMode === 'direct') {
      // Direct mode: no CVT boxes, processor count based on ports AND pixels
      const portsPerProcessor = 20;
      const processorsByPorts = Math.ceil(portsNeededFinal / portsPerProcessor);
      const processorsByPixels = Math.ceil(totalPixels / 9000000);
      mx40ProcessorCount = Math.max(processorsByPorts, processorsByPixels);
    } else {
      // Indirect mode: CVT boxes needed
      const portsPerCVT = 10;
      distributionCount = Math.ceil(portsNeededFinal / portsPerCVT);
      distributionBoxName = 'NovaStar CVT-10 Pro';
      // Processor count: max of pixels needed OR CVT boxes needed (4 CVTs per processor)
      const processorsByPixels = Math.ceil(totalPixels / 9000000);
      const processorsByCVTs = Math.ceil(distributionCount / 4);
      mx40ProcessorCount = Math.max(processorsByPixels, processorsByCVTs);
    }
  } else if(pr.custom && pr.supports_direct && pr.uses_distribution_box && portsNeeded > 0) {
    // Custom processor supporting both direct and indirect modes
    if(mx40ConnectionMode === 'direct') {
      // Direct mode: no distribution boxes, use output_ports per processor
      const portsPerProcessor = pr.output_ports || 4;
      const processorsByPorts = Math.ceil(portsNeededFinal / portsPerProcessor);
      const processorsByPixels = Math.ceil(totalPixels / pr.total_pixels);
      mx40ProcessorCount = Math.max(processorsByPorts, processorsByPixels);
    } else {
      // Indirect mode: use distribution boxes
      const portsPerBox = pr.distribution_box_ports || 10;
      distributionCount = Math.ceil(portsNeededFinal / portsPerBox);
      distributionBoxName = pr.distribution_box_name;
    }
  } else if(pr.uses_distribution_box && pr.distribution_box_name && portsNeeded > 0) {
    // Custom processor with distribution box only (no direct mode)
    const portsPerBox = pr.distribution_box_ports || 10;
    distributionCount = Math.ceil(portsNeededFinal / portsPerBox);
    distributionBoxName = pr.distribution_box_name;
  }

  // Build HTML output matching the example format
  let html = '';

  // Add Specs header at the top of results (positioned to sit on the top border)
  html += `<div style="position: absolute; top: -16px; left: 16px; background: #1a1a1a; border: 1px solid var(--primary); padding: 4px 10px; font-family: 'Bangers', cursive; font-size: 16px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--primary); transform: rotate(-2deg);">Specs</div>`;

  // Get unit labels for display
  const lenUnit = getLengthUnitLabel();
  const wtUnit = getWeightUnitLabel();

  // Convert values based on selected units
  const panelWidthDisplay = displayLengthUnit === 'ft' ? (p.width_m * M_TO_FT).toFixed(3) : p.width_m.toFixed(3);
  const panelHeightDisplay = displayLengthUnit === 'ft' ? (p.height_m * M_TO_FT).toFixed(3) : p.height_m.toFixed(3);
  const wallWidthDisplay = displayLengthUnit === 'ft' ? wallWF.toFixed(2) : wallWM.toFixed(2);
  const wallHeightDisplay = displayLengthUnit === 'ft' ? adjustedWallHF.toFixed(2) : adjustedWallHM.toFixed(2);
  const perPanelWeightKg = getPanelWeight(panelType, useConnectingPlatesForWeight);
  const panelWeightDisplay = displayWeightUnit === 'lbs' ? Math.ceil(perPanelWeightKg * KG_TO_LBS) : Math.ceil(perPanelWeightKg);
  const totalWeightDisplay = displayWeightUnit === 'lbs' ? Math.ceil(totalWeightLbs) : Math.ceil(totalWeight);
  const panelOnlyWeightDisplay = displayWeightUnit === 'lbs' ? Math.ceil(panelWeightOnly * KG_TO_LBS) : Math.ceil(panelWeightOnly);
  const bumperWeightDisplay = displayWeightUnit === 'lbs' ? Math.ceil(bumperWeight * KG_TO_LBS) : Math.ceil(bumperWeight);

  // Check if we're in simple mode
  const isSimpleMode = typeof currentAppMode !== 'undefined' && currentAppMode === 'simple';

  if(isSimpleMode) {
    // SIMPLE MODE - Condensed specs
    // Panel specs
    html += `<div class="result-section-title">PANEL</div>`;
    html += `<div class="result-row"><strong>Panel:</strong> ${escapeHtml(p.brand)} ${escapeHtml(p.name)}</div>`;
    html += `<div class="result-row"><strong>Pixel pitch:</strong> ${p.pixel_pitch_mm} mm</div>`;
    html += `<div class="result-row"><strong>Panel size:</strong> ${panelWidthDisplay} ${lenUnit} × ${panelHeightDisplay} ${lenUnit}</div>`;
    html += `<div class="result-row"><strong>Panel res:</strong> ${p.res_x} × ${p.res_y}</div>`;
    if(p.weight_kg) html += `<div class="result-row"><strong>Weight per panel:</strong> ${panelWeightDisplay} ${wtUnit}</div>`;

    // Wall specs
    html += `<br>`;
    html += `<div class="result-section-title">WALL</div>`;
    html += `<div class="result-row"><strong>Dimensions:</strong> ${wallWidthDisplay} ${lenUnit} × ${wallHeightDisplay} ${lenUnit} (${pw} × ${ph} panels)</div>`;
    html += `<div class="result-row"><strong>Panel count:</strong> ${totalPanels}</div>`;
    html += `<div class="result-row"><strong>Aspect ratio:</strong> ${ar.label}</div>`;
    html += `<div class="result-row"><strong>Wall weight:</strong> ${panelOnlyWeightDisplay} ${wtUnit}</div>`;
    html += `<div class="result-row"><strong>Pixel count:</strong> ${totalPixels.toLocaleString()} px</div>`;
    html += `<div class="result-row"><strong>Resolution:</strong> ${resX} × ${resY}</div>`;

    // Power specs
    html += `<br>`;
    html += `<div class="result-section-title">POWER (${powerType.toUpperCase()})</div>`;
    html += `<div class="result-row"><strong>Total watts:</strong> ${totalPowerW.toLocaleString()} W</div>`;
    html += `<div class="result-row"><strong>Total amps:</strong> ${ampsSingle.toFixed(2)} A @ ${voltage} V</div>`;
    if(phase === 3) html += `<div class="result-row"><strong>Amps per phase:</strong> ${ampsPerPhase.toFixed(2)} A</div>`;
    html += `<div class="result-row"><strong>Max panels per circuit:</strong> ${calculatedPanelsPerCircuit}</div>`;

    // Data specs
    html += `<br>`;
    html += `<div class="result-section-title">DATA</div>`;
    html += `<div class="result-row"><strong>Port capacity:</strong> ${adjustedCapacity.toLocaleString()} px</div>`;
    html += `<div class="result-row"><strong>Max panels per data line:</strong> ${suggestedPanelsPerData}</div>`;
  } else {
    // COMPLEX MODE - Full specs (original)
    // PANEL Section
    html += `<div class="result-row"><strong>Panel:</strong> ${escapeHtml(p.brand)} ${escapeHtml(p.name)}</div>`;
    html += `<div class="result-row"><strong>Pixel pitch:</strong> ${p.pixel_pitch_mm} mm</div>`;
    html += `<div class="result-row"><strong>Panel size:</strong> ${panelWidthDisplay} ${lenUnit} × ${panelHeightDisplay} ${lenUnit}</div>`;
    html += `<div class="result-row"><strong>Panel res:</strong> ${p.res_x} × ${p.res_y}</div>`;
    if(p.brightness_nits) html += `<div class="result-row"><strong>Brightness:</strong> ${p.brightness_nits} nits</div>`;
    if(p.weight_kg) html += `<div class="result-row"><strong>Weight per panel:</strong> ${panelWeightDisplay} ${wtUnit}</div>`;
    html += `<div class="result-row"><strong>Panel power (Max/Avg):</strong> ${p.power_max_w} W / ${p.power_avg_w} W</div>`;
    if(p.max_hanging !== null && p.max_hanging !== undefined) html += `<div class="result-row"><strong>Max hanging:</strong> ${p.max_hanging} Panels</div>`;
    if(p.max_stacking !== null && p.max_stacking !== undefined) html += `<div class="result-row"><strong>Max Stacking:</strong> ${p.max_stacking} Panels</div>`;
    if(p.bumper_1w_lbs !== null && p.bumper_1w_lbs !== undefined) {
      const b1w = displayWeightUnit === 'lbs' ? Math.ceil(p.bumper_1w_lbs) : Math.ceil(p.bumper_1w_lbs * LBS_TO_KG);
      const b2w = displayWeightUnit === 'lbs' ? Math.ceil(p.bumper_2w_lbs) : Math.ceil(p.bumper_2w_lbs * LBS_TO_KG);
      html += `<div class="result-row"><strong>Bumper Weights:</strong> 1W= ${b1w} ${wtUnit}, 2W= ${b2w} ${wtUnit}</div>`;
    }

    // WALL Section
    html += `<br><br>`;
    html += `<div class="result-section-title">WALL</div>`;
    html += `<div class="result-row"><strong>Dimensions:</strong> ${wallWidthDisplay} ${lenUnit} × ${wallHeightDisplay} ${lenUnit} (${pw} × ${ph} panels${hasCB5HalfRow ? ' + half row' : ''})</div>`;
    html += `<div class="result-row"><strong>Total panel count:</strong> ${totalPanels}</div>`;
    html += `<div class="result-row"><strong>Resolution:</strong> ${resX} × ${resY}</div>`;
    html += `<div class="result-row"><strong>Total pixel count:</strong> (${totalPixels.toLocaleString()} px)</div>`;
    html += `<div class="result-row"><strong>Aspect ratio:</strong> ${ar.label}</div>`;
    // Weight display with breakdown - Structure includes all structural components
    const currentStructureType = document.getElementById('structureType')?.value || 'hanging';

    // Calculate all structure weight components
    let structureWeightKg = 0;

    if(currentStructureType === 'floor' && p.is_floor_panel && p.floor_frames) {
      // Floor mode: Structure = Floor Frames
      const floorFramesArray = calculateFloorFrames(pw, ph, deletedPanels);
      const frameCounts = getFloorFrameCounts(floorFramesArray);
      if(frameCounts.frame_1x1 > 0) structureWeightKg += frameCounts.frame_1x1 * p.floor_frames.frame_1x1.weight_lbs / KG_TO_LBS;
      if(frameCounts.frame_2x1 > 0) structureWeightKg += frameCounts.frame_2x1 * p.floor_frames.frame_2x1.weight_lbs / KG_TO_LBS;
      if(frameCounts.frame_2x2 > 0) structureWeightKg += frameCounts.frame_2x2 * p.floor_frames.frame_2x2.weight_lbs / KG_TO_LBS;
      if(frameCounts.frame_3x2 > 0) structureWeightKg += frameCounts.frame_3x2 * p.floor_frames.frame_3x2.weight_lbs / KG_TO_LBS;
    } else {
      // Hanging or Ground Stack mode: Structure = Bumpers + Connecting Plates + Ground Support Hardware

      // Add bumper weight
      structureWeightKg += bumperWeight;

      // Add connecting plates weight if applicable
      const useConnectingPlatesForDisplay = shouldUseConnectingPlates(panelType);
      if(useConnectingPlatesForDisplay) {
        // Account for half panel row if CB5 with half row enabled
        const effectivePhForPlates = hasCB5HalfRow ? ph + 1 : ph;
        const plates = calculateConnectingPlates(pw, effectivePhForPlates, PLATE_WEIGHTS.plate2wayKg, PLATE_WEIGHTS.plate4wayKg);
        structureWeightKg += plates.totalPlateWeight;
      }

      // Add ground support hardware weight for ground stack mode
      if(currentStructureType === 'ground') {
        const groundHardware = calculateGroundSupportHardware(pw, ph);
        if(groundHardware && groundHardware.totalWeightKg) {
          structureWeightKg += groundHardware.totalWeightKg;
        }
      }
    }

    const adjustedTotalWeightKg = panelWeightOnly + structureWeightKg;
    const adjustedTotalWeightDisplay = displayWeightUnit === 'lbs' ? Math.ceil(adjustedTotalWeightKg * KG_TO_LBS) : Math.ceil(adjustedTotalWeightKg);
    const structureWeightDisplay = displayWeightUnit === 'lbs' ? Math.ceil(structureWeightKg * KG_TO_LBS) : Math.ceil(structureWeightKg);

    html += `<div class="result-row"><strong>Total weight:</strong> ${adjustedTotalWeightDisplay} ${wtUnit}</div>`;
    // Show weight breakdown if there's any structure weight
    const isFloorPanel = p.is_floor_panel === true;
    if(structureWeightKg > 0 || (currentStructureType === 'floor' && isFloorPanel)) {
      html += `<div class="result-row result-indent"><strong>Panels:</strong> ${panelOnlyWeightDisplay} ${wtUnit}</div>`;
      html += `<div class="result-row result-indent"><strong>Structure:</strong> ${structureWeightDisplay} ${wtUnit}</div>`;
    }

    // POWER Section
    html += `<br>`;
    html += `<div class="result-section-title">POWER (${powerType.toUpperCase()})</div>`;
    html += `<div class="result-row"><strong>Total wall power:</strong> ${totalPowerW.toLocaleString()} W</div>`;
    html += `<div class="result-row"><strong>Total amps:</strong> ${ampsSingle.toFixed(2)} A @ ${voltage} V</div>`;
    if(phase === 3) html += `<div class="result-row"><strong>Total amps per phase:</strong> ${ampsPerPhase.toFixed(2)} A @ ${voltage} V</div>`;
    html += `<div class="result-row"><strong>Max panels per circuit:</strong> ${calculatedPanelsPerCircuit}</div>`;
    html += `<div class="result-row"><strong>Estimated circuits:</strong> ${circuitsByColumns}</div>`;

    // DATA Section
    html += `<br>`;
    html += `<div class="result-section-title">DATA</div>`;
    let processorDisplayName = escapeHtml(pr.name);
    if(pr.in_development) {
      processorDisplayName = processorDisplayName.replace('(in development)', '<span style="color: #d47a7a;">(in development)</span>');
    }
    html += `<div class="result-row"><strong>Processor:</strong> ${processorDisplayName}</div>`;
    if(distributionBoxName) {
      html += `<div class="result-row"><strong>Distribution box:</strong> ${escapeHtml(distributionBoxName)}${distributionCount > 0 ? ` (${distributionCount})` : ''}</div>`;
    }
    html += `<div class="result-row"><strong>Port Capacity:</strong> ${adjustedCapacity.toLocaleString()} px</div>`;
    html += `<div class="result-row"><strong>Max panels per data line:</strong> ${suggestedPanelsPerData}</div>`;
    html += `<div class="result-row"><strong>Estimated 1G ports needed:</strong> ${portsNeededFinal}</div>`;
    html += `<div class="result-row"><strong>Estimated data lines:</strong> ${dataLinesFinal}</div>`;
    html += `<div class="result-row"><strong>Frame Rate:</strong> ${frameRate} Hz</div>`;
    html += `<div class="result-row"><strong>Bit Depth:</strong> ${bitDepth}-bit</div>`;
    html += `<div class="result-row"><strong>Redundancy:</strong> ${redundancy ? 'Yes' : 'No'}</div>`;
  }

  document.getElementById('results').innerHTML = html;
  
  // Store calculated values for gear list to use
  if(screens[currentScreenId]) {
    screens[currentScreenId].calculatedData = {
      // Equipment
      processorName: pr.name,
      processorCount: 1,
      distributionBoxCount: distributionCount,
      distributionBoxName: distributionBoxName,
      mx40ProcessorCount: mx40ProcessorCount, // MX40-specific processor count (accounts for ports + pixels)
      panelCount: totalPanels,
      activePanels: totalPanels, // Same as totalPanels (deletedPanels already accounted for)

      // Weight (panel-only and bumper weight)
      panelWeightOnlyKg: panelWeightOnly,
      bumperWeightKg: bumperWeight,
      // Note: platesWeightKg is updated by updatePlatesDisplay()
      // Note: groundSupportWeightKg is updated by generateStructureLayout()

      // Rigging
      bumper1wCount: bumpers.filter(b => b.type === '1w').length,
      bumper2wCount: bumpers.filter(b => b.type === '2w').length,
      bumper4wCount: bumpers.filter(b => b.type === '4w').length,

      // Data
      dataLines: dataLines,
      portsNeeded: portsNeeded,
      portsNeededFinal: portsNeededFinal,
      panelsPerDataLine: panelsPerDataLine,
      totalPixels: totalPixels,

      // Power
      circuitsNeeded: circuitsByColumns,
      socaCount: Math.ceil(circuitsByColumns / 6),
      columnsPerCircuit: columnsPerCircuit
    };
  }
  
  generateLayout('standard');
  generateStructureLayout();
  generateLayout('power');
  generateLayout('data');
  showCanvasView();
  generateGearList();

  // If combined view is active, update it too
  if(currentAppMode === 'combined' && combinedSelectedScreens.size > 0) {
    renderCombinedView();
  }
}


// Make colors more vibrant for PDF export by increasing saturation and darkening slightly
function getVibrantColorForPDF(hexColor) {
  // Special case for white - use dark gray instead
  if(hexColor === '#FFFFFF') {
    return '#4A4A4A'; // Dark gray for white
  }
  
  // Special case for yellow - make it more saturated/darker
  if(hexColor === '#FFFF00') {
    return '#DAA520'; // Goldenrod instead of pure yellow
  }
  
  // For other colors, desaturate and lighten for ink-saving
  const r = parseInt(hexColor.slice(1,3), 16);
  const g = parseInt(hexColor.slice(3,5), 16);
  const b = parseInt(hexColor.slice(5,7), 16);
  
  // Convert to HSL for easier saturation adjustment
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;
  
  let h, s;
  if(max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch(max) {
      case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
      case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
      case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
    }
  }
  
  // Desaturate by 50% and lighten slightly for ink-saving when printing
  s = s * 0.5;
  const newL = Math.min(0.85, l * 1.15); // Lighten slightly, max lightness of 0.85
  
  // Convert back to RGB
  function hue2rgb(p, q, t) {
    if(t < 0) t += 1;
    if(t > 1) t -= 1;
    if(t < 1/6) return p + (q - p) * 6 * t;
    if(t < 1/2) return q;
    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }
  
  let rNew, gNew, bNew;
  if(s === 0) {
    rNew = gNew = bNew = newL;
  } else {
    const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
    const p = 2 * newL - q;
    rNew = hue2rgb(p, q, h + 1/3);
    gNew = hue2rgb(p, q, h);
    bNew = hue2rgb(p, q, h - 1/3);
  }
  
  const rFinal = Math.round(rNew * 255);
  const gFinal = Math.round(gNew * 255);
  const bFinal = Math.round(bNew * 255);
  
  return `#${rFinal.toString(16).padStart(2,'0')}${gFinal.toString(16).padStart(2,'0')}${bFinal.toString(16).padStart(2,'0')}`;
}

// Get canvas as data URL for PDF
function getCanvasDataURLForPDF(canvas) {
  return canvas.toDataURL('image/jpeg', 0.85);
}

function getCanvasDescription() {
  const allPanels = getAllPanels();
  const p = allPanels[document.getElementById('panelType').value];
  const {pw, ph} = getEffectivePanelCounts();
  
  // Check if CB5 half panel row is enabled
  // Using cb5HalfRowEnabled toggle state
  const hasCB5HalfRow = cb5HalfRowEnabled && document.getElementById('panelType').value === 'CB5_MKII';
  
  // Calculate wall resolution accounting for CB5 half panels
  let wallResX, wallResY;
  if(hasCB5HalfRow) {
    const halfPanel = panels['CB5_MKII_HALF'];
    wallResX = pw * p.res_x;
    wallResY = (ph * p.res_y) + halfPanel.res_y; // All full rows + half row
  } else {
    wallResX = pw * p.res_x;
    wallResY = ph * p.res_y;
  }
  
  const canvasSize = document.getElementById('canvasSize').value;
  let canvasResX, canvasResY;
  
  if(canvasSize === 'custom') {
    canvasResX = parseInt(document.getElementById('customCanvasWidth').value) || 1920;
    canvasResY = parseInt(document.getElementById('customCanvasHeight').value) || 1080;
  } else if(canvasSize === '4K_UHD') {
    canvasResX = 3840;
    canvasResY = 2160;
  } else if(canvasSize === '4K_DCI') {
    canvasResX = 4096;
    canvasResY = 2160;
  } else if(canvasSize === 'HD') {
    canvasResX = 1920;
    canvasResY = 1080;
  } else {
    // Fallback
    canvasResX = 1920;
    canvasResY = 1080;
  }
  
  const canvasX = parseInt(document.getElementById('canvasX').value) || 0;
  const canvasY = parseInt(document.getElementById('canvasY').value) || 0;
  
  // Calculate coverage percentage
  const canvasArea = canvasResX * canvasResY;
  const wallArea = wallResX * wallResY;
  const coverage = ((canvasArea / wallArea) * 100).toFixed(1);
  
  // Get screen name from the current screen object
  const screen = screens[currentScreenId];
  const screenName = screen ? screen.name : '';
  const namePrefix = screenName ? `${screenName} - ` : '';
  
  const panelDescription = hasCB5HalfRow ? `${pw} × ${ph} + half row panels` : `${pw} × ${ph} panels`;
  
  return `${namePrefix}Wall Resolution: ${wallResX} × ${wallResY} px (${panelDescription})\nCanvas Resolution: ${canvasResX} × ${canvasResY} px\nPosition: X=${canvasX}px, Y=${canvasY}px\nCoverage: ${coverage}%`;
}

// Create outline-only version of standard layout for PDF
function createOutlineOnlyStandardCanvas() {
  const sourceCanvas = document.getElementById('standardCanvas');
  if(!sourceCanvas || sourceCanvas.width === 0) return null;
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sourceCanvas.width;
  tempCanvas.height = sourceCanvas.height;
  const ctx = tempCanvas.getContext('2d');
  
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  
  const {pw, ph} = getEffectivePanelCounts();
  const size = panelSize;
  
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for(let c=0; c<pw; c++){
    for(let r=0; r<ph; r++){
      const panelKey = `${c},${r}`;
      const x = c * size;
      const y = r * size;
      
      if(deletedPanels.has(panelKey)) {
        ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = (ecoPrintMode || greyscalePrintMode) ? '#cccccc' : '#333333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x, y, size, size);
        ctx.setLineDash([]);
        continue;
      }

      // White fill
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, size, size);
      
      // Color outline - make more vibrant for PDF
      const baseColor = getStandardColorForPanel(c, r);
      const outlineColor = getVibrantColorForPDF(baseColor);
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, size, size);
      
      // Panel number
      ctx.fillStyle = '#000000';
      ctx.fillText(`${c+1}.${r+1}`, x+size/2, y+size/2);
    }
  }
  
  return tempCanvas;
}

// Create outline-only version of power layout for PDF
function createOutlineOnlyPowerCanvas() {
  const sourceCanvas = document.getElementById('powerCanvas');
  if(!sourceCanvas || sourceCanvas.width === 0) return null;
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sourceCanvas.width;
  tempCanvas.height = sourceCanvas.height;
  const ctx = tempCanvas.getContext('2d');
  
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  const {pw, ph} = getEffectivePanelCountsForLayout();
  const size = panelSize; // Use global panelSize for consistent sizing
  const socaLabelHeight = Math.max(60, size * 1.2);
  
  // Calculate panelsPerCircuit the same way as in calculate() function
  const allPanels = getAllPanels();
  const p = allPanels[document.getElementById('panelType').value];
  if(!p) return;
  const powerType = document.getElementById('powerType').value;
  const voltage = parseInt(document.getElementById('voltage').value) || 208;
  const breaker = parseInt(document.getElementById('breaker').value) || 20;
  // Derate removed - default to no derating
  const derate = 1.0; // Derating disabled
  const activePanelsCount = (pw * ph) - deletedPanels.size;
  const perPanelW = powerType === 'max' ? p.power_max_w : (p.power_avg_w || p.power_max_w * 0.5);
  const circuitCapacityW = voltage * breaker * derate;
  const calculatedPanelsPerCircuit = Math.max(1, Math.floor(circuitCapacityW / perPanelW));
  const userMaxPanelsPerCircuit = parseInt(document.getElementById('maxPanelsPerCircuit').value);
  const panelsPerCircuit = userMaxPanelsPerCircuit > 0 ? userMaxPanelsPerCircuit : calculatedPanelsPerCircuit;
  
  // Copy SOCA labels from original canvas
  const sourceCtx = sourceCanvas.getContext('2d');
  const labelData = sourceCtx.getImageData(0, 0, sourceCanvas.width, socaLabelHeight);
  ctx.putImageData(labelData, 0, 0);
  
  // STEP 1: Build list of all panels in order (column by column, top to bottom) - SAME AS ORIGINAL
  const orderedPanels = [];
  for(let c=0; c<pw; c++){
    for(let r=0; r<ph; r++){
      const panelKey = `${c},${r}`;
      if(!deletedPanels.has(panelKey)) {
        orderedPanels.push({
          key: panelKey,
          col: c,
          row: r,
          isCustom: customCircuitAssignments.has(panelKey),
          customCircuit: customCircuitAssignments.has(panelKey) ? customCircuitAssignments.get(panelKey) - 1 : null
        });
      }
    }
  }
  
  // STEP 2: Collect all custom circuit numbers that are in use - SAME AS ORIGINAL
  const usedCustomCircuits = new Set();
  orderedPanels.forEach(p => {
    if(p.isCustom) {
      usedCustomCircuits.add(p.customCircuit);
    }
  });
  
  // STEP 3: Assign circuit numbers - SAME AS ORIGINAL
  const panelToCircuit = new Map();
  let autoCircuitCounter = 0;
  let panelsInCurrentAutoCircuit = 0;
  
  orderedPanels.forEach(panel => {
    if(panel.isCustom) {
      // Keep custom assignment
      panelToCircuit.set(panel.key, panel.customCircuit);
    } else {
      // Find next available circuit number (skip over custom assignments)
      while(usedCustomCircuits.has(autoCircuitCounter)) {
        autoCircuitCounter++;
      }
      
      // Auto-assign to current circuit
      panelToCircuit.set(panel.key, autoCircuitCounter);
      panelsInCurrentAutoCircuit++;
      
      // Move to next circuit when we reach the limit
      if(panelsInCurrentAutoCircuit >= panelsPerCircuit) {
        autoCircuitCounter++;
        panelsInCurrentAutoCircuit = 0;
        
        // Skip over any custom circuits
        while(usedCustomCircuits.has(autoCircuitCounter)) {
          autoCircuitCounter++;
        }
      }
    }
  });
  
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw all panels
  for(let c=0; c<pw; c++){
    for(let r=0; r<ph; r++){
      const panelKey = `${c},${r}`;
      const x = c * size;
      const y = r * size + socaLabelHeight;
      
      if(deletedPanels.has(panelKey)) {
        ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = (ecoPrintMode || greyscalePrintMode) ? '#cccccc' : '#333333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x, y, size, size);
        ctx.setLineDash([]);
        continue;
      }

      const circuitNum = panelToCircuit.get(panelKey);
      if(circuitNum === undefined) continue;
      
      const socaGroup = Math.floor(circuitNum / 6);
      const colorIndex = circuitNum % 6;
      const colors = colorForIndex(colorIndex);
      const lightenPercent = socaGroup * 0.15;
      const baseColor = lightenColor(colors.solid, lightenPercent);
      
      // Make color more vibrant for PDF
      const outlineColor = getVibrantColorForPDF(baseColor);
      
      // White fill
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, size, size);
      
      // Color outline - use thicker line for better visibility
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, size, size);
      
      // Panel number
      ctx.fillStyle = '#000000';
      ctx.fillText(`${c+1}.${r+1}`, x+size/2, y+size/2);
    }
  }
  
  return tempCanvas;
}

// Create outline-only version of data layout for PDF
function createOutlineOnlyDataCanvas() {
  const sourceCanvas = document.getElementById('dataCanvas');
  if(!sourceCanvas || sourceCanvas.width === 0) return null;
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sourceCanvas.width;
  tempCanvas.height = sourceCanvas.height;
  const ctx = tempCanvas.getContext('2d');
  
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  const {pw, ph} = getEffectivePanelCounts();
  const size = panelSize; // Use global panelSize for consistent sizing
  
  // Calculate panelsPerDataLine the same way as in calculate() function
  const allPanels = getAllPanels();
  const allProcessors = getAllProcessors();
  const p = allPanels[document.getElementById('panelType').value];
  const pr = allProcessors[document.getElementById('processor').value];
  if(!p || !pr) return;
  const pixelsPerPanel = p.res_x * p.res_y;
  const frameRate = parseInt(document.getElementById('frameRate').value) || 60;
  const bitDepth = parseInt(document.getElementById('bitDepth').value) || 8;
  const adjustedCapacity = calculateAdjustedPixelCapacity(pr, frameRate, bitDepth);
  let suggestedPanelsPerData = Math.max(1, Math.floor(adjustedCapacity / pixelsPerPanel));
  const MAX_PANELS_PER_PORT = 500;
  suggestedPanelsPerData = Math.min(suggestedPanelsPerData, MAX_PANELS_PER_PORT);
  const userMax = parseInt(document.getElementById('maxPanelsPerData').value);
  const panelsPerDataLine = userMax > 0 ? userMax : suggestedPanelsPerData;
  
  const startDir = document.getElementById('dataStartDir').value;
  
  // Build data path based on start direction (SAME AS ORIGINAL)
  const serp = [];
  
  if(startDir === 'all_top') {
    // All columns start at top (going down)
    for(let c=0; c<pw; c++){
      for(let r=0; r<ph; r++) {
        const panelKey = `${c},${r}`;
        if(!deletedPanels.has(panelKey)) {
          serp.push({c, r});
        }
      }
    }
  } else if(startDir === 'all_bottom') {
    // All columns start at bottom (going up)
    for(let c=0; c<pw; c++){
      for(let r=ph-1; r>=0; r--) {
        const panelKey = `${c},${r}`;
        if(!deletedPanels.has(panelKey)) {
          serp.push({c, r});
        }
      }
    }
  } else {
    // Serpentine pattern (for 'top' and 'bottom')
    const startFromTop = (startDir==='top' || startDir==='top_left');
    for(let c=0; c<pw; c++){
      const dirDown = (c%2===0) ? startFromTop : !startFromTop;
      if(dirDown){ 
        for(let r=0; r<ph; r++) {
          const panelKey = `${c},${r}`;
          if(!deletedPanels.has(panelKey)) {
            serp.push({c, r});
          }
        }
      } else { 
        for(let r=ph-1; r>=0; r--) {
          const panelKey = `${c},${r}`;
          if(!deletedPanels.has(panelKey)) {
            serp.push({c, r});
          }
        }
      }
    }
  }
  
  // Group into data lines with support for custom assignments (SAME AS ORIGINAL)
  const orderedDataPanels = [];
  serp.forEach(panel => {
    const panelKey = `${panel.c},${panel.r}`;
    orderedDataPanels.push({
      c: panel.c,
      r: panel.r,
      key: panelKey,
      isCustom: customDataLineAssignments.has(panelKey),
      customDataLine: customDataLineAssignments.has(panelKey) ? customDataLineAssignments.get(panelKey) - 1 : null
    });
  });
  
  // Collect all custom data line numbers in use
  const usedCustomDataLines = new Set();
  orderedDataPanels.forEach(p => {
    if(p.isCustom) {
      usedCustomDataLines.add(p.customDataLine);
    }
  });
  
  // Assign data line numbers
  const panelToDataLine = new Map();
  let autoDataLineCounter = 0;
  let panelsInCurrentAutoDataLine = 0;
  
  orderedDataPanels.forEach(panel => {
    if(panel.isCustom) {
      // Keep custom assignment
      panelToDataLine.set(panel.key, panel.customDataLine);
    } else {
      // Find next available data line number (skip over custom assignments)
      while(usedCustomDataLines.has(autoDataLineCounter)) {
        autoDataLineCounter++;
      }
      
      // Auto-assign to current data line
      panelToDataLine.set(panel.key, autoDataLineCounter);
      panelsInCurrentAutoDataLine++;
      
      // Move to next data line when we reach the limit
      if(panelsInCurrentAutoDataLine >= panelsPerDataLine) {
        autoDataLineCounter++;
        panelsInCurrentAutoDataLine = 0;
        
        // Skip over any custom data lines
        while(usedCustomDataLines.has(autoDataLineCounter)) {
          autoDataLineCounter++;
        }
      }
    }
  });
  
  // Build groups based on data line assignments
  const dataLineGroups = new Map();
  orderedDataPanels.forEach(panel => {
    const dataLine = panelToDataLine.get(panel.key);
    if(!dataLineGroups.has(dataLine)) {
      dataLineGroups.set(dataLine, []);
    }
    dataLineGroups.get(dataLine).push({c: panel.c, r: panel.r});
  });
  
  // Convert to array sorted by data line number
  const groups = [];
  const sortedDataLines = Array.from(dataLineGroups.keys()).sort((a, b) => a - b);
  sortedDataLines.forEach(dataLine => {
    groups.push(dataLineGroups.get(dataLine));
  });
  
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw deleted panels first
  for(let c=0; c<pw; c++){
    for(let r=0; r<ph; r++){
      const panelKey = `${c},${r}`;
      const x = c * size;
      const y = r * size;
      
      if(deletedPanels.has(panelKey)) {
        ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = (ecoPrintMode || greyscalePrintMode) ? '#cccccc' : '#333333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x, y, size, size);
        ctx.setLineDash([]);
      }
    }
  }


  // Draw active panels with data grouping
  for(let gi=0; gi<groups.length; gi++){
    const colors = colorForIndex(gi);
    const vibrantColor = getVibrantColorForPDF(colors.solid);
    
    for(let idx=0; idx<groups[gi].length; idx++){
      const pnt = groups[gi][idx];
      const x = pnt.c * size;
      const y = pnt.r * size;
      
      // White fill
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, size, size);
      
      // Color outline - use thicker line for better visibility
      ctx.strokeStyle = vibrantColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, size, size);
      
      // Panel number
      ctx.fillStyle = '#000000';
      ctx.fillText(`${pnt.c+1}.${pnt.r+1}`, x+size/2, y+size/2);
    }
  }
  
  return tempCanvas;
}

function getStandardColorForPanel(c, r){
  // Get the current screen's colors (same as canvas view)
  const currentScreen = screens[currentScreenId];
  let primaryColor = currentScreen ? currentScreen.color : '#808080';
  let secondaryColor = currentScreen ? (currentScreen.color2 || darkenColor(primaryColor, 30)) : '#606060';

  // Convert to pastel colors for eco-friendly printing
  if (ecoPrintMode) {
    primaryColor = toPastelColor(primaryColor);
    secondaryColor = toPastelColor(secondaryColor);
  }

  // Convert to greyscale for greyscale printing
  if (greyscalePrintMode) {
    primaryColor = toGreyscale(primaryColor);
    secondaryColor = toGreyscale(secondaryColor);
  }

  // Alternate colors in a checkerboard pattern (same logic as canvas view)
  const isEvenPanel = (c + r) % 2 === 0;
  return isEvenPanel ? primaryColor : secondaryColor;
}

function getEffectivePanelCountsForLayout(){ 
  const {pw, ph} = getEffectivePanelCounts(); 
  
  // Check if CB5 half panel row is enabled
  // Using cb5HalfRowEnabled toggle state
  const hasCB5HalfRow = cb5HalfRowEnabled && document.getElementById('panelType').value === 'CB5_MKII';
  
  // Add an extra row if CB5 half panels are enabled
  const adjustedPh = hasCB5HalfRow ? ph + 1 : ph;
  
  return {pw, ph: adjustedPh}; 
}

function generateLayout(mode){
  lastLayoutMode = mode;
  const allPanels = getAllPanels();
  const allProcessors = getAllProcessors();
  const p=allPanels[document.getElementById('panelType').value];
  if(!p || !p.width_m || !p.height_m){ return; }
  const proc=allProcessors[document.getElementById('processor').value];
  const voltage=parseFloat(document.getElementById('voltage').value)||220;
  const breaker=parseFloat(document.getElementById('breaker').value)||20;
  const powerType=document.getElementById('powerType').value;
  const perPanelW = powerType==='max' ? (p.power_max_w||0) : (p.power_avg_w||0);
  // Derate removed - default to no derating
  const derate = 1.0; // Derating disabled
  const circuitW=voltage*breaker*derate;
  const calculatedPanelsPerCircuit=Math.max(1, Math.floor(circuitW/Math.max(1,perPanelW)||1));
  
  // Get user override or use calculated value
  const userMaxPanelsPerCircuit = parseInt(document.getElementById('maxPanelsPerCircuit').value);
  const panelsPerCircuit = userMaxPanelsPerCircuit > 0 ? userMaxPanelsPerCircuit : calculatedPanelsPerCircuit;
  
  const pixelsPerPanel=(p.res_x&&p.res_y)?p.res_x*p.res_y: (176*176);
  const frameRate = parseInt(document.getElementById('frameRate').value) || 60;
  const bitDepth = parseInt(document.getElementById('bitDepth').value) || 8;
  const adjustedCapacity = calculateAdjustedPixelCapacity(proc, frameRate, bitDepth);
  
  // Calculate suggested panels per data line accounting for CB5 half panels
  let capacityBasedPanelsPerData;
  // Using cb5HalfRowEnabled toggle state
  const hasCB5HalfRow = cb5HalfRowEnabled && document.getElementById('panelType').value === 'CB5_MKII';
  
  if(hasCB5HalfRow) {
    // With half panels, calculate based on average pixels per panel
    const {pw, ph} = getEffectivePanelCounts();
    const totalPanelsGrid = pw * ph;
    const activePanelsCount = totalPanelsGrid - deletedPanels.size;
    const halfPanel = panels['CB5_MKII_HALF'];
    const halfPanelPixels = halfPanel.res_x * halfPanel.res_y;
    const mainPanelCount = activePanelsCount; // All full panels
    const halfPanelCount = pw; // Additional half panel row
    const totalMixedPanels = mainPanelCount + halfPanelCount;
    const totalPixels = (mainPanelCount * pixelsPerPanel) + (halfPanelCount * halfPanelPixels);
    const avgPixelsPerPanel = totalPixels / totalMixedPanels;
    capacityBasedPanelsPerData = Math.max(1, Math.floor(adjustedCapacity / avgPixelsPerPanel));
  } else {
    capacityBasedPanelsPerData = Math.max(1, Math.floor(adjustedCapacity / pixelsPerPanel));
  }

  // Cap at 500 panels per port (Brompton Tessera hardware limit)
  const MAX_PANELS_PER_PORT = 500;
  capacityBasedPanelsPerData = Math.min(capacityBasedPanelsPerData, MAX_PANELS_PER_PORT);

  // Max panels per data = port capacity based (varies with frame rate + bit depth)
  const suggestedPanelsPerData = capacityBasedPanelsPerData;
  
  const userMax = parseInt(document.getElementById('maxPanelsPerData').value);
  const panelsPerDataLine = (mode==='data') ? (userMax>0?userMax:suggestedPanelsPerData) : null;
  const startDirEl = document.getElementById('dataStartDir');
  const startDir = startDirEl ? startDirEl.value : 'top';
  // Using showArrowsEnabled toggle state
  const showArrows = showArrowsEnabled;

  const {pw, ph} = getEffectivePanelCountsForLayout();

  let canvasId, containerId;
  if(mode === 'standard'){
    canvasId = 'standardCanvas';
    containerId = 'standardContainer';
    
    // Setup interactivity after first render
    setTimeout(() => setupStandardCanvasInteractivity(), 10);
  } else if(mode === 'power'){
    canvasId = 'powerCanvas';
    containerId = 'powerContainer';
  } else {
    canvasId = 'dataCanvas';
    containerId = 'dataContainer';
  }

  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');

  // Calculate dynamic panel size based on container width
  const container = document.getElementById(containerId);
  // Only show layout containers in complex mode (not simple mode)
  const isSimpleMode = typeof currentAppMode !== 'undefined' && currentAppMode === 'simple';
  if(!isSimpleMode) {
    container.style.display = 'block';
  }
  const containerWidth = container.clientWidth - 32; // Account for padding
  const maxCanvasWidth = Math.min(containerWidth, 800); // Cap at 800px max
  const minSize = 30; // Minimum panel size
  const maxSize = 80; // Maximum panel size
  const calculatedSize = Math.floor(maxCanvasWidth / pw);
  const size = Math.max(minSize, Math.min(maxSize, calculatedSize));

  // Get panel type and calculate height ratio for CB5_MKII full panels
  const panelType = document.getElementById('panelType').value;
  const heightRatio = getPanelHeightRatio(panelType);
  const panelWidth = size;
  const panelHeight = size * heightRatio;

  // hasCB5HalfRow is already declared earlier in this function
  // Calculate dimensions accounting for half panel row
  const originalPh = hasCB5HalfRow ? ph - 1 : ph; // ph includes the half row, originalPh is just full panels
  const halfPanelHeight = size; // Half panels are square

  // Canvas height: full panel rows + half panel row if enabled
  const canvasHeightCalc = hasCB5HalfRow ? (originalPh * panelHeight + halfPanelHeight) : (ph * panelHeight);
  canvas.width = pw * panelWidth;
  canvas.height = canvasHeightCalc;

  // Update global panelSize for all modes
  panelSize = size;
  currentPanelWidth = panelWidth;
  currentPanelHeight = panelHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const fontSize = Math.max(10, Math.floor(size * 0.22));
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if(mode==='standard'){
    renderStandardLayout({pw, ph, panelWidth, panelHeight, hasCB5HalfRow, originalPh, halfPanelHeight, canvas, ctx, fontSize});
    return;
  }

  if(mode==='power'){
    renderPowerLayout({pw, ph, panelWidth, panelHeight, hasCB5HalfRow, originalPh, halfPanelHeight, canvas, ctx, panelsPerCircuit});
    return;
  }

  if(mode==='data'){
    renderDataLayout({pw, ph, panelWidth, panelHeight, hasCB5HalfRow, originalPh, halfPanelHeight, canvas, ctx, panelsPerDataLine, startDir, showArrows});
    return;
  }
}

