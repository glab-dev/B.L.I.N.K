// ==================== CONFIGURATION SAVE/LOAD ====================
// Save and load .blinkled files, MX40 mode toggle visibility.

// Save/Load configuration functions
async function saveConfiguration() {
  const configName = document.getElementById('configName').value.trim() || 'LED_Wall_Config';
  
  // Save current screen data first
  saveCurrentScreenData();
  
  // Prepare screens data for saving (convert Sets to Arrays)
  const screensData = {};
  Object.keys(screens).forEach(screenId => {
    const screen = screens[screenId];
    const data = screen.data;
    
    // Safely convert deletedPanels
    let deletedPanelsArray = [];
    if(data.deletedPanels instanceof Set) {
      deletedPanelsArray = Array.from(data.deletedPanels);
    } else if(Array.isArray(data.deletedPanels)) {
      deletedPanelsArray = data.deletedPanels;
    }
    
    // Safely convert customCircuitAssignments
    let circuitAssignmentsArray = [];
    if(data.customCircuitAssignments instanceof Map) {
      circuitAssignmentsArray = Array.from(data.customCircuitAssignments.entries());
    } else if(Array.isArray(data.customCircuitAssignments)) {
      circuitAssignmentsArray = data.customCircuitAssignments;
    }
    
    // Safely convert customDataLineAssignments
    let dataLineAssignmentsArray = [];
    if(data.customDataLineAssignments instanceof Map) {
      dataLineAssignmentsArray = Array.from(data.customDataLineAssignments.entries());
    } else if(Array.isArray(data.customDataLineAssignments)) {
      dataLineAssignmentsArray = data.customDataLineAssignments;
    }
    
    // Build data object explicitly without spread to avoid Set/Map issues
    screensData[screenId] = {
      name: screen.name,
      color: screen.color,
      color2: screen.color2,
      visible: screen.visible,
      data: {
        panelsWide: data.panelsWide,
        panelsHigh: data.panelsHigh,
        wallWidth: data.wallWidth,
        wallHeight: data.wallHeight,
        lengthUnit: data.lengthUnit,
        weightUnit: data.weightUnit,
        dimensionMode: data.dimensionMode,
        panelType: data.panelType,
        voltage: data.voltage,
        breaker: data.breaker,
        phase: data.phase,
        powerType: data.powerType,
        maxPanelsPerCircuit: data.maxPanelsPerCircuit,
        processor: data.processor,
        frameRate: data.frameRate,
        bitDepth: data.bitDepth,
        maxPanelsPerData: data.maxPanelsPerData,
        dataStartDir: data.dataStartDir,
        showArrows: data.showArrows,
        dataFlip: data.dataFlip,
        redundancy: data.redundancy,
        processorRedundancy: data.processorRedundancy,
        structureType: data.structureType,
        useBumpers: data.useBumpers,
        use4WayBumpers: data.use4WayBumpers,
        addCB5HalfRow: data.addCB5HalfRow,
        connectionMethod: data.connectionMethod,
        wallToFloor: data.wallToFloor,
        distroToWall: data.distroToWall,
        processorToWall: data.processorToWall,
        serverToProcessor: data.serverToProcessor,
        cablePick: data.cablePick,
        cableDropPosition: data.cableDropPosition,
        distBoxOnWall: data.distBoxOnWall,
        canvasX: data.canvasX,
        canvasY: data.canvasY,
        canvasSize: data.canvasSize,
        customCanvasWidth: data.customCanvasWidth,
        customCanvasHeight: data.customCanvasHeight,
        snapMode: data.snapMode,
        arrowKeyIncrement: data.arrowKeyIncrement,
        canvasExportFormat: data.canvasExportFormat,
        showTopBumper: data.showTopBumper,
        showBottomBumper: data.showBottomBumper,
        topBumper1wColumn: data.topBumper1wColumn,
        bottomBumper1wColumn: data.bottomBumper1wColumn,
        bumpers: Array.isArray(data.bumpers) ? data.bumpers : [],
        bumpersInitialized: data.bumpersInitialized || false,
        nextBumperId: data.nextBumperId || 1,
        deletedPanels: deletedPanelsArray,
        customCircuitAssignments: circuitAssignmentsArray,
        customDataLineAssignments: dataLineAssignmentsArray
      },
      calculatedData: screen.calculatedData || {}
    };
  });
  
  // Gather all configuration
  const config = {
    version: '2.0',
    timestamp: new Date().toISOString(),
    name: configName,
    currentScreenId: currentScreenId,
    screenIdCounter: screenIdCounter,
    screens: screensData,
    // Global settings
    displayLengthUnit: displayLengthUnit,
    displayWeightUnit: displayWeightUnit,
    // Per-project gear code overrides (if any)
    gearCodeOverrides: (typeof getGearCodeOverridesForSave === 'function') ? getGearCodeOverridesForSave() : undefined
  };
  
  // Add to recent projects
  addToRecentProjects(config);

  // Convert to JSON and save via file picker
  const json = JSON.stringify(config, null, 2);
  const fileName = `${configName.replace(/\s+/g, '_')}.blinkled`;

  const blob = new Blob([json], { type: 'application/json' });

  if(window.showSaveFilePicker) {
    // Desktop: native Save As dialog
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'LED Config Files',
          accept: { 'application/json': ['.blinkled', '.led', '.ledconfig'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      showAlert(`Configuration "${configName}" saved successfully!`);
    } catch(e) {
      if(e.name !== 'AbortError') {
        showAlert('Save failed: ' + e.message);
      }
    }
  } else if(navigator.canShare && navigator.canShare({ files: [new File([blob], fileName)] })) {
    // Mobile (iOS/Android): native share sheet with "Save to Files" option
    try {
      await navigator.share({
        files: [new File([blob], fileName, { type: 'application/json' })]
      });
      showAlert(`Configuration "${configName}" saved successfully!`);
    } catch(e) {
      if(e.name !== 'AbortError') {
        showAlert('Save failed: ' + e.message);
      }
    }
  } else {
    // Fallback: direct download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showAlert(`Configuration "${configName}" saved successfully!`);
  }
}

function loadConfiguration(event) {
  const file = event.target.files[0];
  if(!file) return;

  // File size check (max 10MB)
  if(file.size > 10 * 1024 * 1024) {
    showAlert('Configuration file is too large (max 10MB).');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const config = JSON.parse(e.target.result);
      applyConfiguration(config);
    } catch(err) {
      showAlert('Error loading configuration: ' + err.message);
      console.error('Load error:', err);
    }
    // Reset file input
    event.target.value = '';
  };
  reader.readAsText(file);
}

function applyConfiguration(config) {
  // Verify version
  if(!config.version) {
    throw new Error('Invalid configuration file');
  }

  // Restore config name into input field
  if(typeof config.name === 'string') {
    document.getElementById('configName').value = config.name.substring(0, 100);
  }

  // Check if this is a v2.0 multi-screen config
  if(config.version === '2.0' && config.screens) {
    // Validate config.screens is a plain object
    if(typeof config.screens !== 'object' || config.screens === null || Array.isArray(config.screens)) {
      throw new Error('Invalid screens data in configuration file');
    }

    // Load multi-screen configuration

    // Clear existing screens UI
    const tabsContainer = document.getElementById('screenTabsContainer');
    if(tabsContainer) {
      tabsContainer.innerHTML = '';
    }

    // Reset screens object
    screens = {};

    // Filter screen IDs to prevent prototype pollution
    const safeScreenIds = Object.keys(config.screens).filter(id =>
      /^screen_\d+$/.test(id)
    );

    // Restore screens data
    safeScreenIds.forEach(screenId => {
      const savedScreen = config.screens[screenId];
      if(!savedScreen || typeof savedScreen !== 'object') return;

      // Validate screen name
      const screenName = (typeof savedScreen.name === 'string')
        ? savedScreen.name.substring(0, 50)
        : 'Screen';

      // Safely restore deletedPanels
      let deletedPanelsSet = new Set();
      if(savedScreen.data && Array.isArray(savedScreen.data.deletedPanels)) {
        deletedPanelsSet = new Set(savedScreen.data.deletedPanels);
      }

      // Safely restore customCircuitAssignments (validate [key, value] pairs)
      let circuitAssignmentsMap = new Map();
      if(savedScreen.data && Array.isArray(savedScreen.data.customCircuitAssignments)) {
        const validEntries = savedScreen.data.customCircuitAssignments.filter(e => Array.isArray(e) && e.length === 2);
        circuitAssignmentsMap = new Map(validEntries);
      }

      // Safely restore customDataLineAssignments (validate [key, value] pairs)
      let dataLineAssignmentsMap = new Map();
      if(savedScreen.data && Array.isArray(savedScreen.data.customDataLineAssignments)) {
        const validEntries = savedScreen.data.customDataLineAssignments.filter(e => Array.isArray(e) && e.length === 2);
        dataLineAssignmentsMap = new Map(validEntries);
      }

      // Get screen index for default colors
      const screenIndex = Object.keys(screens).length;
      const defaultColor = screenColors[screenIndex] || '#808080';
      const defaultColor2 = screenColors2[screenIndex] || '#606060';

      // Validate colors
      const screenColor = isValidHexColor(savedScreen.color) ? savedScreen.color : defaultColor;
      const screenColor2 = isValidHexColor(savedScreen.color2) ? savedScreen.color2 : defaultColor2;

      // Safely spread data, filtering dangerous keys
      const safeData = {};
      if(savedScreen.data && typeof savedScreen.data === 'object' && !Array.isArray(savedScreen.data)) {
        Object.keys(savedScreen.data).forEach(key => {
          if(isSafeKey(key)) {
            safeData[key] = savedScreen.data[key];
          }
        });
      }

      screens[screenId] = {
        name: screenName,
        color: screenColor,
        color2: screenColor2,
        visible: savedScreen.visible !== false,
        data: {
          ...safeData,
          deletedPanels: deletedPanelsSet,
          customCircuitAssignments: circuitAssignmentsMap,
          customDataLineAssignments: dataLineAssignmentsMap
        },
        calculatedData: {} // Regenerated by calculate()
      };
    });

    // Restore counters with validation
    screenIdCounter = (typeof config.screenIdCounter === 'number' && config.screenIdCounter > 0)
      ? config.screenIdCounter
      : Object.keys(screens).length;
    currentScreenId = (typeof config.currentScreenId === 'string' && /^screen_\d+$/.test(config.currentScreenId))
      ? config.currentScreenId
      : 'screen_1';

    // Restore global settings with validation
    displayLengthUnit = (config.displayLengthUnit === 'ft' || config.displayLengthUnit === 'm') ? config.displayLengthUnit : 'ft';
    displayWeightUnit = (config.displayWeightUnit === 'lbs' || config.displayWeightUnit === 'kg') ? config.displayWeightUnit : 'lbs';

    // Restore per-project gear code overrides
    if(typeof loadProjectGearCodeOverrides === 'function') {
      loadProjectGearCodeOverrides(config.gearCodeOverrides || {});
    }

    // Update unit buttons
    const isImperial = displayLengthUnit === 'ft';
    document.getElementById('unitImperial')?.classList.toggle('active', isImperial);
    document.getElementById('unitMetric')?.classList.toggle('active', !isImperial);

    // Rebuild screen tabs using the proper render function
    renderScreenTabs();

    // Load current screen data into form
    loadScreenData(currentScreenId);

    // Clear histories
    undoHistory = [];
    redoHistory = [];
    canvasMoveHistory = [];
    canvasMoveHistoryIndex = -1;
    selectedPanels.clear();

    // Recalculate current screen
    calculate();

    // Calculate ALL other screens so their calculatedData is populated
    // (fixes gear list showing empty data for non-active screens)
    const originalScreenId = currentScreenId;
    const allScreenIds = Object.keys(screens);
    for (const screenId of allScreenIds) {
      if (screenId === originalScreenId) continue;
      saveCurrentScreenData();
      currentScreenId = screenId;
      loadScreenData(screenId);
      calculate();
    }
    // Restore original screen
    saveCurrentScreenData();
    currentScreenId = originalScreenId;
    loadScreenData(originalScreenId);
    calculate();

    // Ensure visible screens toggles are updated after all screens are loaded
    setTimeout(function() {
      updateCanvasScreenToggles();
      // Refresh Combined view if it's currently visible
      if(typeof initCombinedView === 'function') {
        combinedSelectedScreens.clear(); // Reset selection for new project
        initCombinedView();
      }
      // Reset gear tab selection for new project
      if(typeof gearSelectedScreens !== 'undefined') {
        gearSelectedScreens.clear();
      }
      if(typeof initGearView === 'function') {
        initGearView();
      }
      // Refresh raster screen table if currently in raster mode
      if (currentAppMode === 'raster' && typeof renderRasterScreenTable === 'function') {
        renderRasterScreenTable();
      }
    }, 100);

    showAlert(`Configuration "${config.name}" loaded successfully! (${Object.keys(screens).length} screens)`);
  } else {
    // Legacy v1.0 single-screen config - load into current screen
    document.getElementById('panelType').value = config.panelType || 'BP2_V2';
    document.getElementById('processor').value = config.processor || 'Brompton_SX40';
    document.getElementById('powerType').value = config.powerType || 'max';
    document.getElementById('panelsWide').value = config.panelsWide || '';
    document.getElementById('panelsHigh').value = config.panelsHigh || '';
    document.getElementById('wallWidth').value = config.wallWidth || '';
    document.getElementById('wallHeight').value = config.wallHeight || '';

    // Restore unit settings
    displayLengthUnit = config.lengthUnit || config.units || 'ft';
    displayWeightUnit = config.weightUnit || 'lbs';
    const isImperialLegacy = displayLengthUnit === 'ft';
    document.getElementById('unitImperial')?.classList.toggle('active', isImperialLegacy);
    document.getElementById('unitMetric')?.classList.toggle('active', !isImperialLegacy);

    document.getElementById('voltage').value = config.voltage || '208';
    document.getElementById('breaker').value = config.breaker || '20';
    document.getElementById('phase').value = config.phase || '3';
    document.getElementById('maxPanelsPerCircuit').value = config.maxPanelsPerCircuit || '';
    document.getElementById('maxPanelsPerData').value = config.maxPanelsPerData || '';
    document.getElementById('dataStartDir').value = config.dataStartDir || 'top';
    showArrowsEnabled = config.showArrows !== undefined ? config.showArrows : true;
    dataFlipEnabled = config.dataFlip || false;
    document.getElementById('frameRate').value = config.frameRate || '60';
    document.getElementById('bitDepth').value = config.bitDepth || '8';
    redundancyEnabled = config.redundancy || false;
    cb5HalfRowEnabled = config.addCB5HalfRow || false;
    document.getElementById('canvasSize').value = config.canvasSize || '4K_UHD';
    document.getElementById('customCanvasWidth').value = config.customCanvasWidth || '';
    document.getElementById('customCanvasHeight').value = config.customCanvasHeight || '';
    document.getElementById('canvasX').value = config.canvasX || '0';
    document.getElementById('canvasY').value = config.canvasY || '0';
    snapModeEnabled = config.snapMode !== undefined ? config.snapMode : true;
    document.getElementById('arrowKeyIncrement').value = config.arrowKeyIncrement || '10';
    document.getElementById('canvasExportFormat').value = config.canvasExportFormat || 'png';

    // Restore deleted panels and custom assignments
    deletedPanels = new Set(config.deletedPanels || []);
    customCircuitAssignments = new Map(config.customCircuitAssignments || []);
    customDataLineAssignments = new Map(config.customDataLineAssignments || []);

    // Restore bumper state
    showTopBumper = config.showTopBumper || false;
    showBottomBumper = config.showBottomBumper || false;
    topBumper1wColumn = config.topBumper1wColumn !== undefined ? config.topBumper1wColumn : -1;
    bottomBumper1wColumn = config.bottomBumper1wColumn !== undefined ? config.bottomBumper1wColumn : -1;

    // Update bumper button states
    const topBtn = document.getElementById('topBumperBtn');
    const bottomBtn = document.getElementById('bottomBumperBtn');
    if(topBtn) topBtn.textContent = showTopBumper ? 'Top Bumper: ON' : 'Top Bumper: OFF';
    if(bottomBtn) bottomBtn.textContent = showBottomBumper ? 'Bottom Bumper: ON' : 'Bottom Bumper: OFF';

    // Trigger visibility updates
    const panelTypeSelect = document.getElementById('panelType');
    if(panelTypeSelect) {
      panelTypeSelect.dispatchEvent(new Event('change'));
    }

    const canvasSizeSelect = document.getElementById('canvasSize');
    if(canvasSizeSelect) {
      canvasSizeSelect.dispatchEvent(new Event('change'));
    }

    // Clear histories
    undoHistory = [];
    redoHistory = [];
    canvasMoveHistory = [];
    canvasMoveHistoryIndex = -1;
    selectedPanels.clear();

    // Recalculate everything
    syncFromPanels();
    updateSuggestedDataLimit();
    calculate();

    showAlert(`Configuration "${config.name}" loaded successfully! (Legacy format)`);
  }

  // Add to recent projects
  addToRecentProjects(config);
}

// Show/hide connection mode toggle based on processor selection
function updateMX40ModeToggleVisibility() {
  const processorSelect = document.getElementById('processor');
  const mx40ModeToggleRow = document.getElementById('mx40ModeToggleRow');
  if(processorSelect && mx40ModeToggleRow) {
    const isMX40Pro = processorSelect.value === 'NovaStar_MX40_Pro';
    // Also show for custom processors that support both direct and indirect modes
    let isCustomDualMode = false;
    if(!isMX40Pro) {
      const allProcs = getAllProcessors();
      const proc = allProcs[processorSelect.value];
      if(proc && proc.supports_direct && proc.uses_distribution_box) {
        isCustomDualMode = true;
      }
    }
    mx40ModeToggleRow.style.display = (isMX40Pro || isCustomDualMode) ? 'block' : 'none';
  }
}

// ==================== RECENT PROJECTS ====================

const STORAGE_KEY_RECENT_PROJECTS = 'ledcalc_recent_projects';
const MAX_RECENT_PROJECTS = 5;

function generateLocalId() {
  return 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

function addToRecentProjects(config) {
  try {
    let recents = getRecentProjectsFromLocal();

    const entry = {
      name: config.name || 'Untitled',
      timestamp: new Date().toISOString(),
      screenCount: config.screens ? Object.keys(config.screens).length : 1,
      localId: generateLocalId(),
      configData: config
    };

    // Remove any existing entry with the same name (dedup)
    recents = recents.filter(r => r.name !== entry.name);

    // Prepend new entry
    recents.unshift(entry);

    // Trim to max
    if(recents.length > MAX_RECENT_PROJECTS) {
      recents = recents.slice(0, MAX_RECENT_PROJECTS);
    }

    localStorage.setItem(STORAGE_KEY_RECENT_PROJECTS, JSON.stringify(recents));

    // Also upsert to Supabase if signed in
    if(typeof isAuthenticated === 'function' && isAuthenticated() && typeof supabaseClient !== 'undefined' && supabaseClient) {
      upsertProjectToCloud(entry).catch(err => {
        console.error('Failed to save recent project to cloud:', err);
      });
    }
  } catch(e) {
    console.error('Failed to save recent project:', e);
  }
}

function getRecentProjectsFromLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECENT_PROJECTS);
    if(!raw) return [];
    const parsed = JSON.parse(raw);
    if(!Array.isArray(parsed)) return [];
    return parsed.filter(r => r && typeof r === 'object' && r.name && r.configData);
  } catch(e) {
    console.error('Failed to read recent projects:', e);
    return [];
  }
}

async function getRecentProjects() {
  // If signed in, fetch from Supabase
  if(typeof isAuthenticated === 'function' && isAuthenticated() && typeof supabaseClient !== 'undefined' && supabaseClient && typeof currentUser !== 'undefined' && currentUser) {
    try {
      const { data, error } = await supabaseClient
        .from('user_projects')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })
        .limit(MAX_RECENT_PROJECTS);

      if(error) {
        console.error('Fetch recent projects error:', error);
        return getRecentProjectsFromLocal();
      }

      if(data && data.length > 0) {
        return data.map(row => ({
          name: row.name,
          timestamp: row.updated_at,
          screenCount: row.config_data && row.config_data.screens ? Object.keys(row.config_data.screens).length : 1,
          localId: row.local_id,
          configData: row.config_data
        }));
      }
    } catch(e) {
      console.error('Failed to fetch recent projects from cloud:', e);
    }
  }

  // Fallback to localStorage
  return getRecentProjectsFromLocal();
}

async function upsertProjectToCloud(entry) {
  if(!supabaseClient || !currentUser) return;

  const { error } = await supabaseClient
    .from('user_projects')
    .upsert({
      user_id: currentUser.id,
      name: entry.name,
      config_data: entry.configData,
      version: entry.configData.version || '2.0',
      updated_at: new Date().toISOString(),
      is_deleted: false,
      local_id: entry.localId
    }, {
      onConflict: 'user_id,name'
    });

  if(error) {
    console.error('Upsert project error:', error);
  }
}

async function showRecentProjects() {
  closeMobileMenu();

  const listEl = document.getElementById('recentProjectsList');
  if(!listEl) return;

  // Show loading state
  listEl.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">Loading...</p>';
  document.getElementById('recentProjectsModal').classList.add('active');

  const recents = await getRecentProjects();

  if(recents.length === 0) {
    listEl.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No recent projects found.</p>';
    return;
  }

  let html = '';
  recents.forEach(function(project, index) {
    const date = new Date(project.timestamp);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    const screenLabel = project.screenCount === 1 ? '1 screen' : project.screenCount + ' screens';

    html += '<button class="recent-project-item" onclick="loadFromRecent(' + index + ')">'
      + '<div class="recent-project-name">' + escapeHtml(project.name) + '</div>'
      + '<div class="recent-project-meta">' + escapeHtml(dateStr) + ' &middot; ' + escapeHtml(screenLabel) + '</div>'
      + '</button>';
  });
  listEl.innerHTML = html;
}

function closeRecentProjectsModal() {
  document.getElementById('recentProjectsModal').classList.remove('active');
  reopenMenuIfNeeded();
}

// Cache the last fetched recents so loadFromRecent can use them synchronously
let _cachedRecents = null;

async function loadFromRecent(index) {
  // Fetch recents again (or use cached from showRecentProjects)
  const recents = await getRecentProjects();
  if(index < 0 || index >= recents.length) return;

  const config = recents[index].configData;
  if(!config) {
    showAlert('Recent project data is corrupted.');
    return;
  }

  closeRecentProjectsModal();

  try {
    applyConfiguration(config);
  } catch(err) {
    showAlert('Error loading recent project: ' + err.message);
    console.error('Load recent error:', err);
  }
}

async function syncRecentProjects() {
  if(typeof isAuthenticated !== 'function' || !isAuthenticated() || !supabaseClient || !currentUser) return;

  // Push localStorage recents to Supabase that aren't already there
  const localRecents = getRecentProjectsFromLocal();
  if(localRecents.length === 0) return;

  for(const entry of localRecents) {
    try {
      await upsertProjectToCloud(entry);
    } catch(e) {
      console.error('Failed to sync recent project:', e);
    }
  }

  console.log('Synced ' + localRecents.length + ' recent projects to cloud');
}
