// ==================== CONFIGURATION SAVE/LOAD ====================
// Save and load .led/.ledconfig files, MX40 mode toggle visibility.

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
    displayWeightUnit: displayWeightUnit
  };
  
  // Convert to JSON and save via file picker
  const json = JSON.stringify(config, null, 2);
  const fileName = `${configName.replace(/\s+/g, '_')}.led`;

  const blob = new Blob([json], { type: 'application/json' });

  if(window.showSaveFilePicker) {
    // Desktop: native Save As dialog
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'LED Config Files',
          accept: { 'application/json': ['.led', '.ledconfig'] }
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

      // Verify version
      if(!config.version) {
        throw new Error('Invalid configuration file');
      }

      // Restore config name into input field
      if(config.name) {
        document.getElementById('configName').value = config.name;
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

          // Safely restore customCircuitAssignments
          let circuitAssignmentsMap = new Map();
          if(savedScreen.data && Array.isArray(savedScreen.data.customCircuitAssignments)) {
            circuitAssignmentsMap = new Map(savedScreen.data.customCircuitAssignments);
          }

          // Safely restore customDataLineAssignments
          let dataLineAssignmentsMap = new Map();
          if(savedScreen.data && Array.isArray(savedScreen.data.customDataLineAssignments)) {
            dataLineAssignmentsMap = new Map(savedScreen.data.customDataLineAssignments);
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
            const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
            Object.keys(savedScreen.data).forEach(key => {
              if(!dangerousKeys.includes(key)) {
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
            calculatedData: savedScreen.calculatedData || {}
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
        
        // Recalculate
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
      
      // Reset file input
      event.target.value = '';
    } catch(err) {
      showAlert('Error loading configuration: ' + err.message);
      console.error('Load error:', err);
    }
  };
  reader.readAsText(file);
}

// Show/hide MX40 mode toggle based on processor selection
function updateMX40ModeToggleVisibility() {
  const processorSelect = document.getElementById('processor');
  const mx40ModeToggleRow = document.getElementById('mx40ModeToggleRow');
  if(processorSelect && mx40ModeToggleRow) {
    const isMX40Pro = processorSelect.value === 'NovaStar_MX40_Pro';
    mx40ModeToggleRow.style.display = isMX40Pro ? 'block' : 'none';
  }
}
