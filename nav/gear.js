// ==================== GEAR VIEW ====================
// Cabling calculation system, gear list, and gear view activation.
// Called by switchMobileView() in the navigation dispatcher.

function activateGearView() {
  // Show gear list tab
  const gearListContainer = document.getElementById('gearListContainer');
  if(gearListContainer) gearListContainer.style.display = 'block';
  // Save current screen data first
  if(typeof saveCurrentScreenData === 'function') {
    saveCurrentScreenData();
  }
  // Initialize gear view with screen toggles
  if(typeof initGearView === 'function') {
    initGearView();
  }
}

// ==================== CABLING CALCULATION SYSTEM ====================

function roundUpToStandard(lengthFt) {
  const standards = [25, 50, 75, 100, 150, 200, 250, 300];
  for(const s of standards) {
    if(lengthFt <= s) return s;
  }
  return Math.ceil(lengthFt / 50) * 50;
}

// Returns array mapping data line index to its entry panel {col, row}
function getDataLineEntryPoints(pw, ph, panelsPerDataLine, startDir, deletedPanelsSet, customDataLineAssignmentsMap) {
  const entryPoints = {};
  const usedCustomDataLines = new Set();

  for(let c = 0; c < pw; c++) {
    for(let r = 0; r < ph; r++) {
      const panelKey = `${c},${r}`;
      if(!deletedPanelsSet.has(panelKey) && customDataLineAssignmentsMap && customDataLineAssignmentsMap.has(panelKey)) {
        usedCustomDataLines.add(customDataLineAssignmentsMap.get(panelKey) - 1);
      }
    }
  }

  if(startDir === 'all_top') {
    let autoDataLineCounter = 0;
    for(let c = 0; c < pw; c++) {
      while(usedCustomDataLines.has(autoDataLineCounter)) autoDataLineCounter++;
      for(let r = 0; r < ph; r++) {
        const panelKey = `${c},${r}`;
        if(!deletedPanelsSet.has(panelKey)) {
          const dl = (customDataLineAssignmentsMap && customDataLineAssignmentsMap.has(panelKey))
            ? customDataLineAssignmentsMap.get(panelKey) - 1
            : autoDataLineCounter;
          if(!(dl in entryPoints)) entryPoints[dl] = {col: c, row: r};
          break;
        }
      }
      autoDataLineCounter++;
    }
  } else if(startDir === 'all_bottom') {
    let autoDataLineCounter = 0;
    for(let c = 0; c < pw; c++) {
      while(usedCustomDataLines.has(autoDataLineCounter)) autoDataLineCounter++;
      for(let r = ph - 1; r >= 0; r--) {
        const panelKey = `${c},${r}`;
        if(!deletedPanelsSet.has(panelKey)) {
          const dl = (customDataLineAssignmentsMap && customDataLineAssignmentsMap.has(panelKey))
            ? customDataLineAssignmentsMap.get(panelKey) - 1
            : autoDataLineCounter;
          if(!(dl in entryPoints)) entryPoints[dl] = {col: c, row: r};
          break;
        }
      }
      autoDataLineCounter++;
    }
  } else {
    // Serpentine: top or bottom
    const startFromTop = (startDir === 'top');
    let autoDataLineCounter = 0;
    let panelsInCurrentAutoDataLine = 0;

    while(usedCustomDataLines.has(autoDataLineCounter)) autoDataLineCounter++;

    let currentColumn = 0;
    let serpentineGoingDown = startFromTop;

    while(currentColumn < pw) {
      const rows = serpentineGoingDown
        ? Array.from({length: ph}, (_, i) => i)
        : Array.from({length: ph}, (_, i) => ph - 1 - i);

      for(const r of rows) {
        const panelKey = `${currentColumn},${r}`;
        if(deletedPanelsSet.has(panelKey)) continue;

        let dataLine;
        if(customDataLineAssignmentsMap && customDataLineAssignmentsMap.has(panelKey)) {
          dataLine = customDataLineAssignmentsMap.get(panelKey) - 1;
        } else {
          while(usedCustomDataLines.has(autoDataLineCounter)) autoDataLineCounter++;
          dataLine = autoDataLineCounter;
          panelsInCurrentAutoDataLine++;
          if(panelsInCurrentAutoDataLine >= panelsPerDataLine) {
            autoDataLineCounter++;
            panelsInCurrentAutoDataLine = 0;
            while(usedCustomDataLines.has(autoDataLineCounter)) autoDataLineCounter++;
          }
        }

        if(!(dataLine in entryPoints)) {
          entryPoints[dataLine] = {col: currentColumn, row: r};
        }
      }

      currentColumn++;
      serpentineGoingDown = !serpentineGoingDown;
    }
  }

  return entryPoints;
}

// Get ALL panels per data line in serpentine order (for inter-panel cable calculations)
function getDataLinePanelOrdering(pw, ph, panelsPerDataLine, startDir, deletedPanelsSet, customDataLineAssignmentsMap) {
  const dataLinePanels = {}; // { dataLineIndex: [{col, row}, ...] in order }
  const usedCustomDataLines = new Set();

  for(let c = 0; c < pw; c++) {
    for(let r = 0; r < ph; r++) {
      const panelKey = `${c},${r}`;
      if(!deletedPanelsSet.has(panelKey) && customDataLineAssignmentsMap && customDataLineAssignmentsMap.has(panelKey)) {
        usedCustomDataLines.add(customDataLineAssignmentsMap.get(panelKey) - 1);
      }
    }
  }

  if(startDir === 'all_top') {
    let autoDataLineCounter = 0;
    for(let c = 0; c < pw; c++) {
      while(usedCustomDataLines.has(autoDataLineCounter)) autoDataLineCounter++;
      for(let r = 0; r < ph; r++) {
        const panelKey = `${c},${r}`;
        if(deletedPanelsSet.has(panelKey)) continue;
        const dl = (customDataLineAssignmentsMap && customDataLineAssignmentsMap.has(panelKey))
          ? customDataLineAssignmentsMap.get(panelKey) - 1
          : autoDataLineCounter;
        if(!dataLinePanels[dl]) dataLinePanels[dl] = [];
        dataLinePanels[dl].push({col: c, row: r});
      }
      autoDataLineCounter++;
    }
  } else if(startDir === 'all_bottom') {
    let autoDataLineCounter = 0;
    for(let c = 0; c < pw; c++) {
      while(usedCustomDataLines.has(autoDataLineCounter)) autoDataLineCounter++;
      for(let r = ph - 1; r >= 0; r--) {
        const panelKey = `${c},${r}`;
        if(deletedPanelsSet.has(panelKey)) continue;
        const dl = (customDataLineAssignmentsMap && customDataLineAssignmentsMap.has(panelKey))
          ? customDataLineAssignmentsMap.get(panelKey) - 1
          : autoDataLineCounter;
        if(!dataLinePanels[dl]) dataLinePanels[dl] = [];
        dataLinePanels[dl].push({col: c, row: r});
      }
      autoDataLineCounter++;
    }
  } else {
    // Serpentine: top or bottom
    const startFromTop = (startDir === 'top');
    let autoDataLineCounter = 0;
    let panelsInCurrentAutoDataLine = 0;

    while(usedCustomDataLines.has(autoDataLineCounter)) autoDataLineCounter++;

    let currentColumn = 0;
    let serpentineGoingDown = startFromTop;

    while(currentColumn < pw) {
      const rows = serpentineGoingDown
        ? Array.from({length: ph}, (_, i) => i)
        : Array.from({length: ph}, (_, i) => ph - 1 - i);

      for(const r of rows) {
        const panelKey = `${currentColumn},${r}`;
        if(deletedPanelsSet.has(panelKey)) continue;

        let dataLine;
        if(customDataLineAssignmentsMap && customDataLineAssignmentsMap.has(panelKey)) {
          dataLine = customDataLineAssignmentsMap.get(panelKey) - 1;
        } else {
          while(usedCustomDataLines.has(autoDataLineCounter)) autoDataLineCounter++;
          dataLine = autoDataLineCounter;
          panelsInCurrentAutoDataLine++;
          if(panelsInCurrentAutoDataLine >= panelsPerDataLine) {
            autoDataLineCounter++;
            panelsInCurrentAutoDataLine = 0;
            while(usedCustomDataLines.has(autoDataLineCounter)) autoDataLineCounter++;
          }
        }

        if(!dataLinePanels[dataLine]) dataLinePanels[dataLine] = [];
        dataLinePanels[dataLine].push({col: currentColumn, row: r});
      }

      currentColumn++;
      serpentineGoingDown = !serpentineGoingDown;
    }
  }

  return dataLinePanels;
}

// Calculate Manhattan detour around knockout areas
function calculateKnockoutDetour(startCol, startRow, endCol, endRow, deletedPanelsSet, pw, ph) {
  // If no knockouts between start and end, Manhattan distance is fine
  // Check if direct Manhattan path (horizontal then vertical) crosses any deleted panel
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);

  let pathBlocked = false;
  // Check horizontal segment (at startRow)
  for(let c = minCol; c <= maxCol; c++) {
    if(deletedPanelsSet.has(`${c},${startRow}`)) { pathBlocked = true; break; }
  }
  if(!pathBlocked) {
    // Check vertical segment (at endCol)
    for(let r = minRow; r <= maxRow; r++) {
      if(deletedPanelsSet.has(`${endCol},${r}`)) { pathBlocked = true; break; }
    }
  }

  if(!pathBlocked) {
    // Direct Manhattan is clear
    return Math.abs(endCol - startCol) + Math.abs(endRow - startRow);
  }

  // BFS to find shortest Manhattan path avoiding knockouts
  const visited = new Set();
  const queue = [{col: startCol, row: startRow, dist: 0}];
  visited.add(`${startCol},${startRow}`);

  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // up, down, right, left

  while(queue.length > 0) {
    const {col, row, dist} = queue.shift();

    if(col === endCol && row === endRow) {
      return dist;
    }

    for(const [dc, dr] of directions) {
      const nc = col + dc;
      const nr = row + dr;
      const key = `${nc},${nr}`;

      if(nc < 0 || nc >= pw || nr < 0 || nr >= ph) continue;
      if(visited.has(key)) continue;
      if(deletedPanelsSet.has(key) && !(nc === endCol && nr === endRow)) continue;

      visited.add(key);
      queue.push({col: nc, row: nr, dist: dist + 1});
    }
  }

  // If no path found (completely blocked), fall back to Manhattan distance
  return Math.abs(endCol - startCol) + Math.abs(endRow - startRow);
}

// Main cabling calculation for a screen
function calculateCabling(screenId) {
  const screen = screens[screenId];
  if(!screen || !screen.calculatedData) return null;

  const data = screen.data;
  const calc = screen.calculatedData;
  const allPanels = {...panels, ...customPanels};
  const panelType = data.panelType;
  const p = allPanels[panelType];
  if(!p) return null;

  const pw = data.panelsWide;
  const ph = data.panelsHigh;
  if(pw === 0 || ph === 0) return null;

  const M_TO_FT = 3.28084;

  // Panel dimensions in feet
  const panelWidthFt = p.width_m * M_TO_FT;
  const panelHeightFt = p.height_m * M_TO_FT;

  // Wall dimensions in feet
  let wallHeightFt = ph * panelHeightFt;
  let wallWidthFt = pw * panelWidthFt;

  // Account for CB5 half panel row
  const hasCB5HalfRow = data.addCB5HalfRow && panelType === 'CB5_MKII';
  if(hasCB5HalfRow) {
    const halfP = allPanels['CB5_MKII_HALF'];
    if(halfP) {
      wallHeightFt += halfP.height_m * M_TO_FT;
    }
  }

  // Cabling inputs - use nullish coalescing so 0 values are respected
  const wallToFloor = data.wallToFloor ?? 5;
  const distroToWall = data.distroToWall ?? 10;
  const processorToWall = data.processorToWall ?? 15;
  const serverToProcessor = data.serverToProcessor ?? 50;
  const cablePick = data.cablePick ?? 0;
  const dropPos = data.cableDropPosition ?? 'behind';
  const distBoxOnWall = data.distBoxOnWall ?? false;

  // Deleted panels
  const deletedPanelsSet = data.deletedPanels || new Set();

  // Cable drop horizontal extra: SR/SL adds half wall width to all cable lengths
  let dropHorizontalExtra;
  if(dropPos === 'behind') {
    dropHorizontalExtra = 0;
  } else {
    // SR or SL: add distance from center of wall to the edge
    dropHorizontalExtra = wallWidthFt / 2;
  }

  // ---- A. SOCA (Power) Cable Calculation ----
  const socaCables = [];
  const circuitsNeeded = calc.circuitsNeeded || 0;
  const socaCount = calc.socaCount || 0;
  const columnsPerCircuit = calc.columnsPerCircuit || 1;

  for(let s = 0; s < socaCount; s++) {
    // Each SOCA covers up to 6 circuits
    const firstCircuit = s * 6;
    const lastCircuit = Math.min(firstCircuit + 5, circuitsNeeded - 1);

    // First and last columns this SOCA covers
    const firstCol = firstCircuit * columnsPerCircuit;
    const lastCol = Math.min((lastCircuit + 1) * columnsPerCircuit - 1, pw - 1);

    // Vertical: cable runs from bottom of wall down to floor, then to distro
    const verticalFt = wallHeightFt;

    const totalFt = verticalFt + dropHorizontalExtra + wallToFloor + distroToWall + cablePick;
    socaCables.push({
      index: s + 1,
      lengthFt: Math.round(totalFt * 10) / 10,
      roundedFt: roundUpToStandard(totalFt)
    });
  }

  // ---- B. Data Cable Calculation ----
  const dataCables = [];
  const distBoxCables = [];
  const dataLines = calc.dataLines || 0;
  const panelsPerDataLine = calc.panelsPerDataLine || 16;
  const redundancy = data.redundancy;
  const distributionBoxCount = calc.distributionBoxCount || 0;
  const distributionBoxName = calc.distributionBoxName || '';
  const hasDistBox = distributionBoxCount > 0;

  // Effective ph for layout (includes CB5 half row)
  const effectivePh = hasCB5HalfRow ? ph + 1 : ph;

  // Get entry points for each data line
  const entryPoints = getDataLineEntryPoints(
    pw, effectivePh, panelsPerDataLine,
    data.dataStartDir || 'top',
    deletedPanelsSet,
    data.customDataLineAssignments
  );

  if(distBoxOnWall && hasDistBox) {
    // Distribution box on wall: center top of wall
    const distBoxCol = Math.floor(pw / 2);
    const distBoxRow = 0; // top row
    const distBoxPositionFt = wallWidthFt / 2; // center horizontal

    // Data cables from dist box to each data line entry
    for(let dl = 0; dl < dataLines; dl++) {
      const entry = entryPoints[dl];
      if(!entry) continue;

      // Panel center position
      const panelCenterFt = (entry.col + 0.5) * panelWidthFt;
      const panelCenterVertFt = (entry.row + 0.5) * panelHeightFt;
      const distBoxCenterVertFt = 0.5 * panelHeightFt; // center of top row

      // Manhattan distance in panel units, accounting for knockouts
      const detourPanels = calculateKnockoutDetour(distBoxCol, distBoxRow, entry.col, entry.row, deletedPanelsSet, pw, effectivePh);
      const detourFt = detourPanels * Math.max(panelWidthFt, panelHeightFt); // approximate: use larger dimension

      // More precise: convert horizontal and vertical separately
      const hDist = Math.abs(panelCenterFt - distBoxPositionFt);
      const vDist = Math.abs(panelCenterVertFt - distBoxCenterVertFt);

      // Check if knockouts add extra distance
      const directManhattan = Math.abs(entry.col - distBoxCol) + Math.abs(entry.row - distBoxRow);
      const extraDetour = (detourPanels - directManhattan);
      const extraDetourFt = extraDetour > 0 ? extraDetour * ((panelWidthFt + panelHeightFt) / 2) : 0;

      const totalFt = hDist + vDist + extraDetourFt + cablePick;

      dataCables.push({
        lineIndex: dl + 1,
        lengthFt: Math.round(totalFt * 10) / 10,
        roundedFt: roundUpToStandard(totalFt),
        type: 'cat6a'
      });
    }

    // If redundancy, double the data cables (backup follows same paths)
    if(redundancy) {
      const backupCables = dataCables.map(c => ({...c, lineIndex: c.lineIndex, backup: true}));
      dataCables.push(...backupCables);
    }

    // Processor-to-distribution-box cables
    // Cable route: processor → floor → up wall to dist box at center top
    const procToDistBoxFt = processorToWall + wallToFloor + wallHeightFt + cablePick;
    const cableType = procToDistBoxFt > 200 ? 'fiber' : 'cat6a';

    for(let b = 0; b < distributionBoxCount; b++) {
      // 2 cables per dist box (main + backup)
      distBoxCables.push({
        boxIndex: b + 1,
        lengthFt: Math.round(procToDistBoxFt * 10) / 10,
        roundedFt: roundUpToStandard(procToDistBoxFt),
        type: cableType,
        label: 'main'
      });
      distBoxCables.push({
        boxIndex: b + 1,
        lengthFt: Math.round(procToDistBoxFt * 10) / 10,
        roundedFt: roundUpToStandard(procToDistBoxFt),
        type: cableType,
        label: 'backup'
      });
    }
  } else {
    // No dist box on wall: data cables run from processor back to each entry point
    for(let dl = 0; dl < dataLines; dl++) {
      const entry = entryPoints[dl];
      if(!entry) continue;

      // Vertical: full wall height (cable runs top to bottom or bottom to top)
      const verticalFt = wallHeightFt;

      // Check for knockout detours from entry panel routing
      const dropCol = dropPos === 'sr' ? pw - 1 : (dropPos === 'sl' ? 0 : Math.floor(pw / 2));
      const entryRow = (data.dataStartDir === 'bottom' || data.dataStartDir === 'all_bottom') ? effectivePh - 1 : 0;
      const directManhattan = Math.abs(entry.col - dropCol) + Math.abs(entry.row - entryRow);
      const detourPanels = calculateKnockoutDetour(dropCol, entryRow, entry.col, entry.row, deletedPanelsSet, pw, effectivePh);
      const extraDetour = detourPanels - directManhattan;
      const extraDetourFt = extraDetour > 0 ? extraDetour * ((panelWidthFt + panelHeightFt) / 2) : 0;

      const totalFt = verticalFt + dropHorizontalExtra + wallToFloor + processorToWall + cablePick + extraDetourFt;

      dataCables.push({
        lineIndex: dl + 1,
        lengthFt: Math.round(totalFt * 10) / 10,
        roundedFt: roundUpToStandard(totalFt),
        type: 'cat6a'
      });
    }

    // If redundancy, double the data cables (backup follows same paths)
    if(redundancy) {
      const backupCables = dataCables.map(c => ({...c, lineIndex: c.lineIndex, backup: true}));
      dataCables.push(...backupCables);
    }
  }

  // ---- C. Knockout Bridge Cables ----
  // When knockouts create gaps between consecutive panels in a data line,
  // a longer cable is needed to bridge the gap (data cross jumper)
  const knockoutBridgeCables = [];

  const dataLinePanelOrdering = getDataLinePanelOrdering(
    pw, effectivePh, panelsPerDataLine,
    data.dataStartDir || 'top',
    deletedPanelsSet,
    data.customDataLineAssignments
  );

  for(const [dlIndex, panels] of Object.entries(dataLinePanelOrdering)) {
    if(panels.length < 2) continue;

    for(let i = 1; i < panels.length; i++) {
      const prev = panels[i - 1];
      const curr = panels[i];

      // Check if panels are physically adjacent (same column vertically adjacent, or column transition at boundary)
      const colDiff = Math.abs(curr.col - prev.col);
      const rowDiff = Math.abs(curr.row - prev.row);
      const isAdjacent = (colDiff === 0 && rowDiff === 1) ||
                         (colDiff === 1 && rowDiff === 0);

      if(!isAdjacent) {
        // Non-adjacent panels — need a bridge cable
        // Calculate physical distance between panel centers
        const hDist = Math.abs((curr.col + 0.5) * panelWidthFt - (prev.col + 0.5) * panelWidthFt);
        const vDist = Math.abs((curr.row + 0.5) * panelHeightFt - (prev.row + 0.5) * panelHeightFt);
        const bridgeFt = hDist + vDist + cablePick;

        knockoutBridgeCables.push({
          dataLine: parseInt(dlIndex) + 1,
          fromPanel: `${prev.col + 1},${prev.row + 1}`,
          toPanel: `${curr.col + 1},${curr.row + 1}`,
          lengthFt: Math.round(bridgeFt * 10) / 10,
          roundedFt: roundUpToStandard(bridgeFt)
        });
      }
    }
  }

  // ---- D. Totals ----
  const fiberCount = distBoxCables.filter(c => c.type === 'fiber').length;
  const cat6aDistBoxCount = distBoxCables.filter(c => c.type === 'cat6a').length;

  const result = {
    socaCables,
    dataCables,
    distBoxCables,
    knockoutBridgeCables,
    serverCable: {lengthFt: serverToProcessor},
    wallHeightFt: Math.round(wallHeightFt * 10) / 10,
    wallWidthFt: Math.round(wallWidthFt * 10) / 10,
    inputs: {wallToFloor, distroToWall, processorToWall, cablePick},
    totals: {
      socaCount: socaCables.length,
      dataCount: dataCables.length,
      knockoutBridgeCount: knockoutBridgeCables.length,
      distBoxCableCount: distBoxCables.length,
      fiberCount,
      cat6aCount: dataCables.length + cat6aDistBoxCount
    }
  };

  // Store in calculatedData
  screen.calculatedData.cabling = result;
  return result;
}

// ==================== GEAR VIEW FUNCTIONS ====================
let gearSelectedScreens = new Set();

function initGearView() {
  const togglesContainer = document.getElementById('gearScreenToggles');
  if(!togglesContainer) return;

  togglesContainer.innerHTML = '';

  // Auto-select all screens if none selected yet
  if(gearSelectedScreens.size === 0) {
    Object.keys(screens).forEach(id => gearSelectedScreens.add(id));
  }

  // Remove any screens that no longer exist
  gearSelectedScreens.forEach(id => {
    if(!screens[id]) gearSelectedScreens.delete(id);
  });

  Object.keys(screens).forEach(screenId => {
    const screen = screens[screenId];
    const btn = document.createElement('button');
    btn.className = 'slider-toggle-btn';
    btn.dataset.screenId = screenId;
    btn.style.cssText = 'padding: 4px 12px; min-height: 26px; font-size: 10px; border: 2px solid #000; border-radius: 0; box-shadow: 1px 1px 0px 0px rgba(0,0,0,1); white-space: nowrap; width: fit-content; flex-grow: 0; flex-shrink: 0;';

    if(gearSelectedScreens.has(screenId)) {
      btn.classList.add('active');
      btn.style.background = screen.color || '#10b981';
      btn.style.color = '#fff';
      btn.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
    } else {
      btn.style.background = '#333';
      btn.style.color = '#9ca3af';
      btn.style.textShadow = 'none';
    }

    btn.textContent = screen.name;
    btn.onclick = function() {
      toggleGearScreen(screenId);
    };

    togglesContainer.appendChild(btn);
  });

  generateGearList();
}

function toggleGearScreen(screenId) {
  if(gearSelectedScreens.has(screenId)) {
    gearSelectedScreens.delete(screenId);
  } else {
    gearSelectedScreens.add(screenId);
  }
  initGearView();
}

function generateGearList() {
  const gearListContainer = document.getElementById('gearListContainer');
  const gearListContent = document.getElementById('gearListContent');

  if(!gearListContainer || !gearListContent) return;

  // Use selected screens if on gear tab, otherwise show all
  const allScreenIds = Object.keys(screens).sort((a, b) => {
    const numA = parseInt(a.split('_')[1]);
    const numB = parseInt(b.split('_')[1]);
    return numA - numB;
  });
  const screenIds = (typeof currentAppMode !== 'undefined' && currentAppMode === 'gear' && gearSelectedScreens.size > 0)
    ? allScreenIds.filter(id => gearSelectedScreens.has(id))
    : allScreenIds;

  // Build gear data from shared module
  const gearData = buildGearListData(screenIds);

  // Helpers
  const sectionHdr = (title) => `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #444; margin-bottom: 4px;"><strong style="color: #10b981; font-size: 13px;">${title}</strong></div>`;
  const gearLine = (label, value) => {
    if(value === 0 || value === '' || value === null || value === undefined || value === '0') return '';
    return `<div style="margin-left: 12px;"><span style="color: #fff;">${label}</span> ${value}</div>`;
  };

  let html = '<div style="font-size: 14px;">';

  gearData.screens.forEach(sd => {
    const eq = sd.equipment;
    const rig = sd.rigging;
    const gs = sd.groundSupport;
    const fh = sd.floorHardware;
    const dc = sd.dataCables;
    const pc = sd.powerCables;
    const p2d = sd.processorToDistBox;
    const sig = sd.signalCables;
    const util = sd.utility;
    const sp = sd.spares;

    // --- BEGIN PER-SCREEN CONTAINER ---
    const gearScreenColor = safeColor(sd.screenColor);
    html += `<div style="background: var(--comic-panel); border: 1px solid ${gearScreenColor}; border-radius: 2px; padding: 16px; padding-top: 28px; margin-bottom: 16px; margin-top: 12px; overflow: visible; position: relative; box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);">`;
    html += `<div style="position: absolute; top: -16px; left: 16px; background: #222; border: 1px solid ${gearScreenColor}; padding: 4px 10px; font-family: 'Bangers', cursive; font-size: 16px; letter-spacing: 1.5px; text-transform: uppercase; color: ${gearScreenColor}; transform: rotate(-2deg); text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;">${escapeHtml(sd.screenName)}</div>`;

    // === EQUIPMENT ===
    html += sectionHdr('Equipment');
    if(eq.isFirstScreenInGroup && eq.processorCount > 0) {
      html += gearLine('Processor:', `${eq.processorCount}x ${escapeHtml(eq.processorName)}`);
      if(eq.distBoxCount > 0) {
        html += gearLine(`${escapeHtml(eq.distBoxName)}:`, eq.distBoxCount);
      }
    } else if(eq.referencesScreenName) {
      html += `<div style="margin-left: 12px; color: #fff;">Processor: See ${escapeHtml(eq.referencesScreenName)}</div>`;
    }
    html += `<div style="margin-left: 12px;"><span style="color: #fff;">Panels:</span> ${eq.activeFullPanels} x ${escapeHtml(eq.panelBrand)} ${escapeHtml(eq.panelName)}</div>`;
    if(eq.activeHalfPanels > 0) {
      html += `<div style="margin-left: 12px;"><span style="color: #fff;">Half Panels:</span> ${eq.activeHalfPanels} x ${escapeHtml(eq.panelBrand)} ${escapeHtml(eq.halfPanelName)}</div>`;
    }

    // === RIGGING HARDWARE ===
    if(rig.hasRigging) {
      html += sectionHdr('Rigging Hardware');
      html += gearLine('1W Bumpers:', rig.bumper1w);
      html += gearLine('2W Bumpers:', rig.bumper2w);
      html += gearLine('4W Bumpers:', rig.bumper4w);
      html += gearLine('4W Connecting Plates:', rig.plates4way);
      html += gearLine('2W Connecting Plates:', rig.plates2way);
      html += gearLine('5/8" Shackles:', rig.shackles);
      html += gearLine('Cheeseye:', rig.cheeseye);
    }

    // === GROUND SUPPORT ===
    if(gs.hasGS) {
      html += sectionHdr('Ground Support');
      html += gearLine('Rear Truss:', gs.rearTruss);
      html += gearLine('Base Truss:', gs.baseTruss);
      html += gearLine('Bridge Clamps:', gs.bridgeClamps);
      html += gearLine('Rear Bridge Adapter:', gs.rearBridgeAdapters);
      html += gearLine('Sandbags:', gs.sandbags);
      html += gearLine('Swivel Cheeseborough:', gs.swivelCheeseboroughs);
      if(gs.pipes > 0) html += gearLine('Pipe' + gs.pipeLengthStr + ':', gs.pipes);
    }

    // === FLOOR HARDWARE ===
    if(fh.hasFloorFrames) {
      html += sectionHdr('Floor Hardware');
      if(fh.frame3x2 > 0) html += gearLine('3×2 Frame:', fh.frame3x2);
      if(fh.frame2x2 > 0) html += gearLine('2×2 Frame:', fh.frame2x2);
      if(fh.frame2x1 > 0) html += gearLine('2×1 Frame:', fh.frame2x1);
      if(fh.frame1x1 > 0) html += gearLine('1×1 Frame:', fh.frame1x1);
    }

    // === DATA CABLES ===
    html += sectionHdr('Data Cables');
    if(dc.jumperCount > 0) {
      html += gearLine(`Jumpers ${dc.dataJumperLen}':`, dc.jumperCount);
    }
    if(dc.crossJumperLen && dc.crossJumperCount > 0) {
      html += gearLine(`Cross Jumpers ${dc.crossJumperLen}':`, dc.crossJumperCount);
    }
    if(dc.jumpersBuiltin && dc.cat5CouplerCount > 0) {
      html += gearLine('Cat5 Couplers:', dc.cat5CouplerCount);
    }
    // Dynamic Cat6 cable lengths
    const cat6Lengths = Object.entries(dc.cat6ByLength).sort((a,b) => a[0] - b[0]);
    if(cat6Lengths.length > 0) {
      for(const [len, count] of cat6Lengths) {
        html += `<div style="margin-left: 12px; color: #fff;">${count}x ${len}' Cat6</div>`;
      }
      // Detail dropdown
      if(dc.cableDetail.length > 0 || dc.knockoutDetail.length > 0) {
        html += `<details style="margin-left: 12px; margin-top: 4px;"><summary style="cursor: pointer; color: #fff; font-size: 12px;">Detail</summary>`;
        dc.cableDetail.forEach(c => {
          html += `<div style="margin-left: 12px; font-size: 12px; color: #fff;">Line ${c.lineIndex}: ${c.lengthFt}' → ${c.roundedFt}'</div>`;
        });
        dc.knockoutDetail.forEach(c => {
          html += `<div style="margin-left: 12px; font-size: 12px; color: #fff;">Knockout ${c.index + 1} (P${c.fromPanel} → P${c.toPanel}): ${c.lengthFt}' → ${c.roundedFt}'</div>`;
        });
        html += `</details>`;
      }
    }

    // === POWER CABLES ===
    html += sectionHdr('Power Cables');
    if(pc.jumperCount > 0) {
      html += gearLine(`Jumpers ${pc.powerJumperLen}':`, pc.jumperCount);
    }
    html += gearLine('Soca Splays:', pc.socaSplays);
    // Dynamic SOCA cable lengths
    const socaLengths = Object.entries(pc.socaByLength).sort((a,b) => a[0] - b[0]);
    for(const [len, count] of socaLengths) {
      html += `<div style="margin-left: 12px; color: #fff;">${count}x ${len}' Soca</div>`;
    }
    // True1 cables
    html += gearLine("25' True1:", pc.true1_25);
    html += gearLine("10' True1:", pc.true1_10);
    html += gearLine("5' True1:", pc.true1_5);
    html += gearLine('True1 Twofer:', pc.true1Twofer);
    // SOCA detail dropdown
    if(pc.socaDetail.length > 0) {
      html += `<details style="margin-left: 12px; margin-top: 4px;"><summary style="cursor: pointer; color: #fff; font-size: 12px;">Detail</summary>`;
      pc.socaDetail.forEach(s => {
        html += `<div style="margin-left: 12px; font-size: 12px; color: #fff;">SOCA ${s.index}: ${s.lengthFt}' → ${s.roundedFt}'</div>`;
      });
      html += `</details>`;
    }

    // === PROCESSOR → DIST BOX ===
    if(p2d.count > 0) {
      html += sectionHdr('Processor → Dist Box');
      html += `<div style="margin-left: 12px; color: #fff;">${p2d.count}x ${p2d.cableType} ${p2d.cableLength}'</div>`;
      if(p2d.cableType === 'Fiber') {
        html += `<div style="margin-left: 12px; color: #e040fb; font-size: 12px;">(Fiber required: distance > 200')</div>`;
      }
    }

    // === SIGNAL CABLES (first screen only) ===
    if(sig) {
      html += sectionHdr('Signal Cables');
      // SDI lines sorted by length descending
      for(const len of Object.keys(sig.sdiByLength).map(Number).sort((a,b) => b - a)) {
        if(sig.sdiByLength[len] > 0) {
          html += gearLine(`${len}' ${sig.sdiType}:`, sig.sdiByLength[len]);
        }
      }
      // Fiber line if server cable was too long for SDI
      if(sig.serverFiberLine) {
        html += gearLine(`${sig.serverFiberLine.label}:`, sig.serverFiberLine.count);
      }
      html += gearLine("25' HDMI:", sig.hdmi[25]);
      html += gearLine("10' HDMI:", sig.hdmi[10]);
      html += gearLine("6' HDMI:", sig.hdmi[6]);
    }

    // === UTILITY (first screen only) ===
    if(util) {
      html += sectionHdr('Utility');
      html += gearLine("UG 10':", util.ug10);
      html += gearLine("UG 25':", util.ug25);
      html += gearLine("UG 50':", util.ug50);
      html += gearLine('UG Twofers:', util.ugTwofers);
      html += gearLine('Power Bars:', util.powerBars);
    }

    // === SPARES ===
    html += sectionHdr('SPARES');
    html += gearLine('Spare Soca Splays:', '');
    html += gearLine('Spare Panel Count:', '');
    if(sp.dataJumpers) html += gearLine(`Spare Data Jumpers ${sp.dataJumperLen}':`, '');
    if(sp.crossJumpers) html += gearLine(`Spare Data Cross Jumpers ${sp.crossJumperLen}':`, '');
    if(sp.cat5Couplers) html += gearLine('Spare Cat5 Couplers:', '');
    if(sp.powerJumpers) html += gearLine(`Spare Power Jumpers ${sp.powerJumperLen}':`, '');

    html += `</div>`; // close per-screen container
  });

  html += '</div>';

  gearListContent.innerHTML = html;
  // Only show container if we're on the gear tab
  if(typeof currentMobileView !== 'undefined' && currentMobileView === 'gear') {
    gearListContainer.style.display = 'block';
  }
}
