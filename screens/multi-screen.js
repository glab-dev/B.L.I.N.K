// ==================== MULTI-SCREEN SYSTEM ====================
// Screen colors, color transforms, screen CRUD, data persistence.
// Depends on globals: screens, currentScreenId, screenIdCounter, isLoadingScreenData (defined inline).

// Screen colors (50% brightness)
// Screen 1 = gray, Screen 2 = red/gray, Screen 3 = green/gray, Screen 4 = blue/gray, Screen 5 = yellow/gray
// Screen 6 = cyan/gray, Screen 7 = magenta/gray, Screen 8 = orange/gray, Screen 9 = aqua/gray, Screen 10 = purple/gray
// Screen colors (primary color for each screen)
// Screen 1 uses standard layout colors (magenta/cyan), screens 2-10 alternate with gray
const screenColors = [
  '#800080', // Screen 1 - Magenta (50% brightness)
  '#804040', // Screen 2 - Red/Gray
  '#408040', // Screen 3 - Green/Gray
  '#404080', // Screen 4 - Blue/Gray
  '#808040', // Screen 5 - Yellow/Gray
  '#408080', // Screen 6 - Cyan/Gray
  '#804080', // Screen 7 - Magenta/Gray
  '#C06030', // Screen 8 - Orange/Gray (slightly brighter for visibility)
  '#40A0A0', // Screen 9 - Aqua/Gray (brighter cyan variant)
  '#604080'  // Screen 10 - Purple/Gray
];

// Secondary colors for alternating pattern (paired with screenColors)
const screenColors2 = [
  '#008080', // Screen 1 - Cyan (50% brightness)
  '#808080', // Screen 2 - Gray
  '#808080', // Screen 3 - Gray
  '#808080', // Screen 4 - Gray
  '#808080', // Screen 5 - Gray
  '#808080', // Screen 6 - Gray
  '#808080', // Screen 7 - Gray
  '#808080', // Screen 8 - Gray
  '#808080', // Screen 9 - Gray
  '#808080'  // Screen 10 - Gray
];

function getDefaultScreenData() {
  return {
    // Dimensions
    panelsWide: 0,
    panelsHigh: 0,
    wallWidth: '',
    wallHeight: '',
    units: 'ft',
    dimensionMode: 'panels',
    
    // Panel Type
    panelType: 'BP2_V2',
    addCB5HalfRow: false,
    connectionMethod: 'airframes', // 'airframes' or 'plates'
    
    // Optional display name (separate from tab name)
    screenDisplayName: '',
    
    // Power
    voltage: 208,
    breaker: 20,
    phase: '3',
    derate: false,
    powerType: 'max',
    maxPanelsPerCircuit: '',
    
    // Data
    processor: 'Brompton_SX40',
    frameRate: 60,
    bitDepth: 8,
    maxPanelsPerData: '',
    dataStartDir: 'top',
    showArrows: true,
    dataFlip: false,
    redundancy: true,
    processorRedundancy: false,
    
    // Structure
    structureType: 'hanging',
    useBumpers: true,
    use4WayBumpers: false,
    
    // Cabling
    wallToFloor: 5,
    distroToWall: 10,
    processorToWall: 15,
    serverToProcessor: 50,
    cablePick: 0,
    cableDropPosition: 'behind',
    distBoxOnWall: false,
    
    // Canvas
    canvasX: 0,
    canvasY: 0,
    canvasSize: '4K_UHD',
    customCanvasWidth: '',
    customCanvasHeight: '',
    snapMode: false,
    
    // Per-screen state (previously global)
    bumpers: [],
    nextBumperId: 1,
    deletedPanels: new Set(),
    selectedPanels: new Set(),
    customCircuitAssignments: new Map(),
    customDataLineAssignments: new Map(),
    undoHistory: [],
    redoHistory: []
  };
}

function initializeScreenSystem() {
  screens['screen_1'] = {
    id: 'screen_1',
    name: 'Screen 1',
    color: screenColors[0],
    color2: screenColors2[0],
    visible: true,
    data: getDefaultScreenData()
  };

  renderScreenTabs();
  updateCanvasScreenToggles();
  initializeCanvases();
}

function renderScreenTabs() {
  const container = document.getElementById('screenTabsContainer');
  if(!container) return;
  
  // Sort screen IDs numerically (screen_1, screen_2, ..., screen_10, screen_11)
  const screenIds = Object.keys(screens).sort((a, b) => {
    const numA = parseInt(a.split('_')[1]);
    const numB = parseInt(b.split('_')[1]);
    return numA - numB;
  });

  let html = '';
  screenIds.forEach(screenId => {
    const screen = screens[screenId];
    const isActive = screenId === currentScreenId;
    html += `
      <div class="screen-tab ${isActive ? 'active' : ''}"
           onclick="switchToScreen('${escapeJsString(screenId)}')">
        <span class="screen-tab-name">${escapeHtml(screen.name)}</span>
        <button class="screen-tab-edit" onclick="event.stopPropagation(); openScreenRenameModal('${escapeJsString(screenId)}')" title="Edit screen">✎</button>
        ${screenIds.length > 1 ? `<button class="screen-tab-close" onclick="event.stopPropagation(); deleteScreen('${escapeJsString(screenId)}')" title="Delete screen">×</button>` : ''}
      </div>
    `;
  });

  // Render tabs into the screen-tabs wrapper, keep the static + button outside
  let tabsWrapper = container.querySelector('.screen-tabs');
  if(!tabsWrapper) {
    tabsWrapper = document.createElement('div');
    tabsWrapper.className = 'screen-tabs';
    container.insertBefore(tabsWrapper, container.firstChild);
  }
  tabsWrapper.innerHTML = html;
}

function switchToScreen(screenId) {
  console.log('=== SWITCHING TO SCREEN ===');
  console.log('Target screen ID:', screenId);
  console.log('Current screen ID before switch:', currentScreenId);
  
  if(!screens[screenId]) {
    console.error('Screen not found:', screenId);
    return;
  }
  
  // Save current screen data
  console.log('Saving current screen data...');
  saveCurrentScreenData();
  
  // Switch to new screen
  currentScreenId = screenId;
  console.log('Current screen ID after switch:', currentScreenId);
  
  // Reset canvas viewport pan and zoom for fresh view of new screen
  canvasZoomLevel = 1.0;
  canvasPanX = 0;
  canvasPanY = 0;
  updateCanvasViewport();
  
  // Load new screen data
  console.log('Loading new screen data...');
  loadScreenData(screenId);
  
  // Update UI
  console.log('Rendering screen tabs...');
  renderScreenTabs();
  
  // Recalculate for new screen
  console.log('Calling calculate()...');
  calculate();
  console.log('=== SCREEN SWITCH COMPLETE ===');
}

function saveCurrentScreenData() {
  const screen = screens[currentScreenId];
  if(!screen) return;
  
  const data = screen.data;
  
  // Dimensions
  data.panelsWide = parseInt(document.getElementById('panelsWide').value) || 0;
  data.panelsHigh = parseInt(document.getElementById('panelsHigh').value) || 0;
  data.wallWidth = document.getElementById('wallWidth').value;
  data.wallHeight = document.getElementById('wallHeight').value;
  data.lengthUnit = displayLengthUnit;
  data.weightUnit = displayWeightUnit;
  data.dimensionMode = document.querySelector('input[name="dimensionMode"]:checked')?.value || 'panels';
  
  // Panel Type
  data.panelType = document.getElementById('panelType').value;
  
  // Power
  data.voltage = parseInt(document.getElementById('voltage').value) || 208;
  data.breaker = parseInt(document.getElementById('breaker').value) || 20;
  data.phase = document.getElementById('phase').value;
  data.powerType = document.getElementById('powerType').value;
  data.maxPanelsPerCircuit = document.getElementById('maxPanelsPerCircuit').value;
  
  // Data
  data.processor = document.getElementById('processor').value;
  data.frameRate = parseInt(document.getElementById('frameRate').value) || 60;
  data.bitDepth = parseInt(document.getElementById('bitDepth').value) || 8;
  data.maxPanelsPerData = document.getElementById('maxPanelsPerData').value;
  data.dataStartDir = document.getElementById('dataStartDir').value;
  data.showArrows = showArrowsEnabled;
  data.dataFlip = dataFlipEnabled;
  data.redundancy = redundancyEnabled;
  data.processorRedundancy = processorRedundancyEnabled;
  data.mx40ConnectionMode = mx40ConnectionMode;

  // Structure
  data.structureType = document.getElementById('structureType').value;
  data.useBumpers = useBumpers; // Save bumper toggle state
  data.use4WayBumpers = use4WayBumpersEnabled; // Save 4-way bumpers state
  
  // CB5-specific options - use the global toggle state
  data.addCB5HalfRow = cb5HalfRowEnabled;
  
  const connectionMethod = document.querySelector('input[name="connectionMethod"]:checked');
  if(connectionMethod) data.connectionMethod = connectionMethod.value;
  
  // Cabling - use value if present, otherwise fall back to placeholder default
  const wallToFloorEl = document.getElementById('wallToFloor');
  const distroToWallEl = document.getElementById('distroToWall');
  const processorToWallEl = document.getElementById('processorToWall');
  const serverToProcessorEl = document.getElementById('serverToProcessor');
  const cablePickEl = document.getElementById('cablePick');

  if(wallToFloorEl) data.wallToFloor = wallToFloorEl.value !== '' ? parseFloat(wallToFloorEl.value) : parseFloat(wallToFloorEl.placeholder);
  if(distroToWallEl) data.distroToWall = distroToWallEl.value !== '' ? parseFloat(distroToWallEl.value) : parseFloat(distroToWallEl.placeholder);
  if(processorToWallEl) data.processorToWall = processorToWallEl.value !== '' ? parseFloat(processorToWallEl.value) : parseFloat(processorToWallEl.placeholder);
  if(serverToProcessorEl) data.serverToProcessor = serverToProcessorEl.value !== '' ? parseFloat(serverToProcessorEl.value) : parseFloat(serverToProcessorEl.placeholder);
  if(cablePickEl) data.cablePick = cablePickEl.value !== '' ? parseFloat(cablePickEl.value) : 0;
  data.cableDropPosition = cableDropPosition;
  data.distBoxOnWall = distBoxOnWallEnabled;
  
  // Canvas
  console.log(`Saving screen data for ${currentScreenId}: canvasOffsetX=${canvasOffsetX}, canvasOffsetY=${canvasOffsetY}`);
  data.canvasX = canvasOffsetX;
  data.canvasY = canvasOffsetY;
  console.log(`After save: data.canvasX=${data.canvasX}, data.canvasY=${data.canvasY}`);
  data.canvasSize = document.getElementById('canvasSize').value;
  data.customCanvasWidth = document.getElementById('customCanvasWidth').value;
  data.customCanvasHeight = document.getElementById('customCanvasHeight').value;
  const snapMode = document.getElementById('snapMode');
  if(snapMode) data.snapMode = snapMode.checked;
  
  // Per-screen state - save current global state to screen data
  data.bumpers = JSON.parse(JSON.stringify(bumpers)); // Deep copy array
  data.nextBumperId = nextBumperId;
  data.bumpersInitialized = true; // Mark that bumpers have been saved (even if empty from deletions)
  data.deletedPanels = new Set(deletedPanels); // Copy Set
  data.selectedPanels = new Set(selectedPanels); // Copy Set
  data.customCircuitAssignments = new Map(customCircuitAssignments); // Copy Map
  data.customDataLineAssignments = new Map(customDataLineAssignments); // Copy Map
  
  // Deep copy undo/redo history
  data.undoHistory = undoHistory.map(state => ({
    deletedPanels: new Set(state.deletedPanels),
    selectedPanels: new Set(state.selectedPanels),
    customCircuitAssignments: new Map(state.customCircuitAssignments),
    customDataLineAssignments: new Map(state.customDataLineAssignments)
  }));
  data.redoHistory = redoHistory.map(state => ({
    deletedPanels: new Set(state.deletedPanels),
    selectedPanels: new Set(state.selectedPanels),
    customCircuitAssignments: new Map(state.customCircuitAssignments),
    customDataLineAssignments: new Map(state.customDataLineAssignments)
  }));
}

function loadScreenData(screenId) {
  const screen = screens[screenId];
  if(!screen) return;
  
  // Set flag to prevent resetCalculator from running during load
  isLoadingScreenData = true;
  
  const data = screen.data;
  
  console.log(`Loading screen data for ${screenId}, canvasX: ${data.canvasX}, canvasY: ${data.canvasY}`);
  
  // Dimensions
  document.getElementById('panelsWide').value = data.panelsWide || '';
  document.getElementById('panelsHigh').value = data.panelsHigh || '';
  document.getElementById('wallWidth').value = data.wallWidth || '';
  document.getElementById('wallHeight').value = data.wallHeight || '';
  
  // Restore unit settings if saved with screen
  if(data.lengthUnit) {
    displayLengthUnit = data.lengthUnit;
  }
  if(data.weightUnit) {
    displayWeightUnit = data.weightUnit;
  }
  // Update unit buttons
  const isImperialScreen = displayLengthUnit === 'ft';
  document.getElementById('unitImperial')?.classList.toggle('active', isImperialScreen);
  document.getElementById('unitMetric')?.classList.toggle('active', !isImperialScreen);
  
  // Set dimension mode
  const modeRadio = document.querySelector(`input[name="dimensionMode"][value="${data.dimensionMode}"]`);
  if(modeRadio) modeRadio.checked = true;
  
  // Show/hide appropriate inputs
  document.getElementById('panelCountInputs').style.display = data.dimensionMode === 'panels' ? 'block' : 'none';
  document.getElementById('wallSizeInputs').style.display = data.dimensionMode === 'size' ? 'block' : 'none';
  
  // Panel Type
  document.getElementById('panelType').value = data.panelType || 'BP2_V2';
  
  // Power
  document.getElementById('voltage').value = data.voltage || 208;
  document.getElementById('breaker').value = data.breaker || 20;
  document.getElementById('phase').value = data.phase || '3';
  document.getElementById('powerType').value = data.powerType || 'max';
  document.getElementById('maxPanelsPerCircuit').value = data.maxPanelsPerCircuit || '';
  
  // Data
  document.getElementById('processor').value = data.processor || 'Brompton_SX40';
  document.getElementById('frameRate').value = data.frameRate || 60;
  document.getElementById('bitDepth').value = data.bitDepth || 8;
  document.getElementById('maxPanelsPerData').value = data.maxPanelsPerData || '';
  document.getElementById('dataStartDir').value = data.dataStartDir || 'top';
  showArrowsEnabled = data.showArrows !== false;
  dataFlipEnabled = data.dataFlip || false;
  redundancyEnabled = data.redundancy !== false; // Default to true if undefined
  processorRedundancyEnabled = data.processorRedundancy || false;
  
  // Update redundancy button visual state
  const redundancyBtn = document.getElementById('redundancyBtn');
  if(redundancyBtn) {
    redundancyBtn.classList.toggle('active', redundancyEnabled);
  }
  
  // Update processor redundancy button visual state
  const processorRedundancyBtn = document.getElementById('processorRedundancyBtn');
  if(processorRedundancyBtn) {
    processorRedundancyBtn.classList.toggle('active', processorRedundancyEnabled);
  }

  // Restore MX40 connection mode toggle state
  mx40ConnectionMode = data.mx40ConnectionMode || 'direct';
  const mx40DirectBtn = document.getElementById('mx40DirectBtn');
  const mx40IndirectBtn = document.getElementById('mx40IndirectBtn');
  if(mx40DirectBtn && mx40IndirectBtn) {
    mx40DirectBtn.classList.toggle('active', mx40ConnectionMode === 'direct');
    mx40IndirectBtn.classList.toggle('active', mx40ConnectionMode === 'indirect');
  }

  // Update show arrows button visual state
  const showArrowsBtn = document.getElementById('showArrowsBtn');
  if(showArrowsBtn) {
    showArrowsBtn.classList.toggle('active', showArrowsEnabled);
  }
  const dataFlipBtn = document.getElementById('dataFlipBtn');
  if(dataFlipBtn) {
    dataFlipBtn.classList.toggle('active', dataFlipEnabled);
    dataFlipBtn.style.display = showArrowsEnabled ? '' : 'none';
  }

  // Structure
  document.getElementById('structureType').value = data.structureType || 'hanging';
  
  // Restore bumpers toggle state
  // Check if useBumpers is explicitly set in data, otherwise check panel default
  if(data.useBumpers !== undefined) {
    useBumpers = data.useBumpers;
  } else {
    // Check if panel type has bumpers disabled by default
    const allPanels = getAllPanels();
    const panel = allPanels[data.panelType];
    useBumpers = !(panel && panel.uses_bumpers === false);
  }
  document.getElementById('useBumpersBtn').classList.toggle('active', useBumpers);
  
  // Show/hide bumper controls based on state
  const bumperControls = document.getElementById('bumperControls');
  const fourWayOption = document.getElementById('fourWayBumperOption');
  if(bumperControls) bumperControls.style.display = useBumpers ? '' : 'none';
  if(!useBumpers && fourWayOption) fourWayOption.style.display = 'none';
  
  // Restore 4-way bumpers state
  use4WayBumpersEnabled = data.use4WayBumpers || false;
  const use4WayBtn = document.getElementById('use4WayBumpersBtn');
  if(use4WayBtn) use4WayBtn.classList.toggle('active', use4WayBumpersEnabled);
  
  // Cabling
  const wallToFloorEl = document.getElementById('wallToFloor');
  const distroToWallEl = document.getElementById('distroToWall');
  const processorToWallEl = document.getElementById('processorToWall');
  const serverToProcessorEl = document.getElementById('serverToProcessor');
  const cablePickEl = document.getElementById('cablePick');

  // Set value only if non-default, otherwise leave empty to show placeholder
  if(wallToFloorEl) wallToFloorEl.value = (data.wallToFloor && data.wallToFloor !== 5) ? data.wallToFloor : '';
  if(distroToWallEl) distroToWallEl.value = (data.distroToWall && data.distroToWall !== 10) ? data.distroToWall : '';
  if(processorToWallEl) processorToWallEl.value = (data.processorToWall && data.processorToWall !== 15) ? data.processorToWall : '';
  const serverVal = data.serverToProcessor ?? data.fohToProcessor;
  if(serverToProcessorEl) serverToProcessorEl.value = (serverVal && serverVal !== 50) ? serverVal : '';
  if(cablePickEl) cablePickEl.value = (data.cablePick && data.cablePick !== 0) ? data.cablePick : '';

  // Restore cable drop toggle buttons
  cableDropPosition = data.cableDropPosition || 'behind';
  document.getElementById('cableDropBehindBtn')?.classList.toggle('active', cableDropPosition === 'behind');
  document.getElementById('cableDropSRBtn')?.classList.toggle('active', cableDropPosition === 'sr');
  document.getElementById('cableDropSLBtn')?.classList.toggle('active', cableDropPosition === 'sl');

  distBoxOnWallEnabled = data.distBoxOnWall || false;
  document.getElementById('distBoxOnWallBtn')?.classList.toggle('active', distBoxOnWallEnabled);
  
  // Canvas - FORCE to proper values
  const loadedX = (typeof data.canvasX === 'number') ? data.canvasX : 0;
  const loadedY = (typeof data.canvasY === 'number') ? data.canvasY : 0;
  
  // Set global variables
  canvasOffsetX = loadedX;
  canvasOffsetY = loadedY;
  
  // Update input fields
  document.getElementById('canvasX').value = loadedX;
  document.getElementById('canvasY').value = loadedY;
  
  // ALSO update the screen data to ensure it's correct
  data.canvasX = loadedX;
  data.canvasY = loadedY;
  
  console.log(`After loading: global canvasOffsetX=${canvasOffsetX}, canvasOffsetY=${canvasOffsetY}`);
  console.log(`After loading: data.canvasX=${data.canvasX}, data.canvasY=${data.canvasY}`);
  
  document.getElementById('canvasSize').value = data.canvasSize || '4K_UHD';
  document.getElementById('customCanvasWidth').value = data.customCanvasWidth || '';
  document.getElementById('customCanvasHeight').value = data.customCanvasHeight || '';
  const snapMode = document.getElementById('snapMode');
  if(snapMode) snapMode.checked = data.snapMode || false;
  
  // Trigger panel type change to update 4-way bumper visibility
  const panelType = data.panelType || 'CB5_MKII';
  const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';
  if(fourWayOption) {
    fourWayOption.style.display = isCB5 && useBumpers ? 'block' : 'none';
  }
  
  // Update placeholders to show panel-specific defaults
  // Circuit limit is calculated dynamically based on power settings
  // Data limit uses panel-specific maximum
  const allPanels = getAllPanels();
  const p = allPanels[panelType];
  if(p) {
    // Update max panels per data placeholder (panel-specific)
    const dataInput = document.getElementById('maxPanelsPerData');
    if(dataInput && p.max_panels_per_data) {
      dataInput.placeholder = p.max_panels_per_data.toString();
    }
  }
  // Update circuit limit after a short delay to ensure power settings are loaded
  setTimeout(() => {
    updateSuggestedCircuitLimit();
  }, 0);
  
  // Per-screen state - restore from screen data to global variables
  bumpers = data.bumpers ? JSON.parse(JSON.stringify(data.bumpers)) : [];
  nextBumperId = data.nextBumperId || 1;
  deletedPanels = data.deletedPanels ? new Set(data.deletedPanels) : new Set();
  selectedPanels = data.selectedPanels ? new Set(data.selectedPanels) : new Set();
  customCircuitAssignments = data.customCircuitAssignments ? new Map(data.customCircuitAssignments) : new Map();
  customDataLineAssignments = data.customDataLineAssignments ? new Map(data.customDataLineAssignments) : new Map();
  
  // Restore undo/redo history
  undoHistory = data.undoHistory ? data.undoHistory.map(state => ({
    deletedPanels: new Set(state.deletedPanels),
    selectedPanels: new Set(state.selectedPanels),
    customCircuitAssignments: new Map(state.customCircuitAssignments),
    customDataLineAssignments: new Map(state.customDataLineAssignments)
  })) : [];
  redoHistory = data.redoHistory ? data.redoHistory.map(state => ({
    deletedPanels: new Set(state.deletedPanels),
    selectedPanels: new Set(state.selectedPanels),
    customCircuitAssignments: new Map(state.customCircuitAssignments),
    customDataLineAssignments: new Map(state.customDataLineAssignments)
  })) : [];
  
  // Update undo/redo button states
  updateUndoRedoButtons();
  
  // Clear all canvases when switching screens
  const canvases = ['standardCanvas', 'structureCanvas', 'powerCanvas', 'dataCanvas', 'canvasViewCanvas'];
  canvases.forEach(canvasId => {
    const canvas = document.getElementById(canvasId);
    if(canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
  
  // Clear results display
  const resultsEl = document.getElementById('results');
  if(resultsEl) resultsEl.innerText = '';
  
  // Update CB5 half panel toggle visibility (panelType and isCB5 already declared above)
  const cb5HalfPanelToggle = document.getElementById('cb5HalfPanelToggle');
  if(cb5HalfPanelToggle) {
    cb5HalfPanelToggle.style.display = (panelType === 'CB5_MKII') ? 'block' : 'none';
  }
  
  // Update connecting plates visibility
  updateConnectingPlatesVisibility(panelType);
  
  // Restore addCB5HalfRow checkbox state if saved
  const addCB5HalfRow = document.getElementById('addCB5HalfRow');
  if(addCB5HalfRow) {
    addCB5HalfRow.checked = data.addCB5HalfRow || false;
  }
  
  // Restore connection method if saved
  if(data.connectionMethod) {
    const connectionRadio = document.querySelector(`input[name="connectionMethod"][value="${data.connectionMethod}"]`);
    if(connectionRadio) connectionRadio.checked = true;
  }
  
  // Reset bumper globals based on structure type - this ensures structure view shows correct bumpers
  const structureType = data.structureType || 'hanging';
  if(structureType === 'hanging') {
    showTopBumper = true;
    showBottomBumper = false;
  } else { // ground
    showTopBumper = false;
    showBottomBumper = true;
  }
  
  // Only initialize bumpers if they haven't been customized/saved yet for this screen
  // If bumpersInitialized is true, the bumpers array (even if empty) reflects user's choices
  if(!data.bumpersInitialized && (showTopBumper || showBottomBumper) && data.panelsWide > 0) {
    initializeBumpers();
  }
  
  // Clear flag after all data is loaded
  isLoadingScreenData = false;
}

// Generate a distinct color for screens beyond the predefined 10
function generateCustomScreenColor(screenNumber) {
  // Use HSL color space for better color distribution
  // Start after the 10 predefined colors, cycle through hues
  const baseHue = ((screenNumber - 11) * 137) % 360; // Golden angle for good distribution
  const saturation = 40; // 40% saturation for muted colors
  const lightness = 50;  // 50% lightness
  
  return `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
}

function addNewScreen() {
  console.log('=== ADDING NEW SCREEN ===');
  
  // Save current screen data first (including any name changes)
  console.log('Saving current screen before adding new screen...');
  saveCurrentScreenData();
  
  screenIdCounter++;
  const newScreenId = `screen_${screenIdCounter}`;
  const screenNumber = Object.keys(screens).length + 1;
  
  // Use predefined colors for first 10 screens, generate custom colors for the rest
  let color, color2;
  if(screenNumber <= screenColors.length) {
    color = screenColors[screenNumber - 1];
    color2 = screenColors2[screenNumber - 1];
  } else {
    color = generateCustomScreenColor(screenNumber);
    color2 = darkenColor(color, 30);
  }
  
  console.log('New screen ID:', newScreenId);
  console.log('Screen number:', screenNumber);
  console.log('Screen color:', color);
  
  screens[newScreenId] = {
    id: newScreenId,
    name: `Screen ${screenNumber}`,
    color: color,
    color2: color2,
    visible: true,
    data: getDefaultScreenData()
  };

  console.log('New screen created:', screens[newScreenId]);
  console.log('All screens:', Object.keys(screens));

  // Add new screen to all canvases' visibility tracking
  // Visible only in current canvas, hidden in others
  Object.keys(canvases).forEach(canvasId => {
    if(!canvases[canvasId].data.screenVisibility) {
      canvases[canvasId].data.screenVisibility = {};
    }
    canvases[canvasId].data.screenVisibility[newScreenId] = (canvasId === currentCanvasId);
  });

  renderScreenTabs();
  updateCanvasScreenToggles();

  // Switch to the new screen
  console.log('Switching to new screen...');
  switchToScreen(newScreenId);

  // If we're on the canvas page, make sure canvas stays visible
  if(currentMobileView === 'canvas') {
    const canvasContainer = document.getElementById('canvasContainer');
    const canvasTabsEl = document.getElementById('canvasTabsContainer');
    if(canvasTabsEl) canvasTabsEl.style.display = 'flex';
    if(canvasContainer) canvasContainer.style.display = 'block';
    if(typeof showCanvasView === 'function') {
      showCanvasView();
    }
  }
}

function deleteScreen(screenId) {
  if(Object.keys(screens).length === 1) {
    showAlert('Cannot delete the last screen');
    return;
  }

  delete screens[screenId];

  // Remove screen from all canvases' visibility tracking
  Object.keys(canvases).forEach(canvasId => {
    if(canvases[canvasId].data.screenVisibility) {
      delete canvases[canvasId].data.screenVisibility[screenId];
    }
  });

  // Clear canvas selection if the deleted screen was selected
  if(selectedCanvasScreenId === screenId) {
    selectedCanvasScreenId = null;
  }

  if(currentScreenId === screenId) {
    currentScreenId = Object.keys(screens)[0];
    loadScreenData(currentScreenId);
  }

  renderScreenTabs();
  updateCanvasScreenToggles();
  calculate();

  // Explicitly redraw canvas to remove deleted screen
  showCanvasView();
}

let screenToRename = null;

function openScreenRenameModal(screenId) {
  screenToRename = screenId;
  const screen = screens[screenId];
  document.getElementById('screenRenameInput').value = screen.name;
  
  // Set primary color picker value
  const colorInput = document.getElementById('screenColorInput');
  const colorPreview = document.getElementById('screenColorPreview');
  colorInput.value = screen.color;
  colorPreview.textContent = screen.color;
  colorPreview.style.background = screen.color;
  
  // Set secondary color picker value
  const color2Input = document.getElementById('screenColor2Input');
  const color2Preview = document.getElementById('screenColor2Preview');
  const color2Value = screen.color2 || darkenColor(screen.color, 30);
  color2Input.value = color2Value;
  color2Preview.textContent = color2Value;
  color2Preview.style.background = color2Value;
  
  // Update preview when primary color changes
  colorInput.oninput = function() {
    colorPreview.textContent = this.value;
    colorPreview.style.background = this.value;
  };
  
  // Update preview when secondary color changes
  color2Input.oninput = function() {
    color2Preview.textContent = this.value;
    color2Preview.style.background = this.value;
  };
  
  document.getElementById('screenRenameModal').classList.add('active');
}

function closeScreenRenameModal() {
  document.getElementById('screenRenameModal').classList.remove('active');
  screenToRename = null;
}

function saveScreenRename() {
  const newName = document.getElementById('screenRenameInput').value.trim().substring(0, 50);
  if(!newName) {
    showAlert('Please enter a screen name');
    return;
  }

  if(screenToRename && screens[screenToRename]) {
    screens[screenToRename].name = newName;
    screens[screenToRename].color = document.getElementById('screenColorInput').value;
    screens[screenToRename].color2 = document.getElementById('screenColor2Input').value;
    renderScreenTabs();
    updateCanvasScreenToggles();
    // Update all views to show the new name/color
    generateLayout('standard');
    generateStructureLayout();
    generateLayout('power');
    generateLayout('data');
    showCanvasView();
  }
  
  closeScreenRenameModal();
}

function duplicateScreen() {
  if(!screenToRename || !screens[screenToRename]) {
    showAlert('No screen selected to duplicate');
    return;
  }

  const sourceScreen = screens[screenToRename];

  // Generate new screen ID
  screenIdCounter++;
  const newScreenId = `screen_${screenIdCounter}`;
  const screenNumber = Object.keys(screens).length + 1;

  // Deep clone the screen data
  const newScreen = {
    id: newScreenId,
    name: sourceScreen.name + ' (Copy)',
    color: sourceScreen.color,
    color2: sourceScreen.color2,
    visible: true,
    data: JSON.parse(JSON.stringify(sourceScreen.data))
  };

  screens[newScreenId] = newScreen;

  // Add new screen to all canvases' visibility tracking
  Object.keys(canvases).forEach(canvasId => {
    if(!canvases[canvasId].data.screenVisibility) {
      canvases[canvasId].data.screenVisibility = {};
    }
    canvases[canvasId].data.screenVisibility[newScreenId] = (canvasId === currentCanvasId);
  });

  renderScreenTabs();
  updateCanvasScreenToggles();

  closeScreenRenameModal();

  // Switch to the new screen
  switchToScreen(newScreenId);
}


function resetCurrentScreenOnPanelChange() {
  const screen = screens[currentScreenId];
  if(!screen) return;
  
  // Only reset dimensions and canvas position, keep other settings
  screen.data.panelsWide = 0;
  screen.data.panelsHigh = 0;
  screen.data.wallWidth = '';
  screen.data.wallHeight = '';
  screen.data.canvasX = 0;
  screen.data.canvasY = 0;
  
  document.getElementById('panelsWide').value = '';
  document.getElementById('panelsHigh').value = '';
  document.getElementById('wallWidth').value = '';
  document.getElementById('wallHeight').value = '';
  canvasOffsetX = 0;
  canvasOffsetY = 0;
}

