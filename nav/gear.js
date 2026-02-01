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

  // Build processor groups (same logic as PDF export)
  const processorGroups = {};
  screenIds.forEach(sid => {
    const sc = screens[sid];
    if(!sc || !sc.data) return;
    const procType = sc.data.processor || 'Brompton_SX40';
    const cd = sc.calculatedData || {};
    const dl = cd.dataLines || 0;
    if(!processorGroups[procType]) {
      processorGroups[procType] = {
        screens: [], totalMainPorts: 0, totalPixels: 0,
        hasAnyRedundancy: false, hasAnyProcessorRedundancy: false, hasAnyIndirectMode: false,
        firstScreenId: sid, firstScreenName: sc.name
      };
    }
    processorGroups[procType].screens.push({ screenId: sid, mainPorts: dl, totalPixels: cd.totalPixels || 0 });
    processorGroups[procType].totalMainPorts += dl;
    processorGroups[procType].totalPixels += (cd.totalPixels || 0);
    if(sc.data.redundancy) processorGroups[procType].hasAnyRedundancy = true;
    if(sc.data.processorRedundancy) processorGroups[procType].hasAnyProcessorRedundancy = true;
    if(sc.data.mx40ConnectionMode === 'indirect') processorGroups[procType].hasAnyIndirectMode = true;
  });

  // Calculate processor and dist box counts per group
  Object.keys(processorGroups).forEach(procType => {
    const group = processorGroups[procType];
    const totalMainPorts = group.totalMainPorts;
    const hasRedundancy = group.hasAnyRedundancy;
    const hasProcessorRedundancy = group.hasAnyProcessorRedundancy;
    let processorCount = 0, distBoxCount = 0, distBoxName = '';

    if(procType === 'Brompton_SX40') {
      const mainXDs = totalMainPorts > 0 ? Math.ceil(totalMainPorts / 10) : 0;
      distBoxCount = hasRedundancy ? mainXDs * 2 : mainXDs;
      processorCount = distBoxCount > 0 ? Math.ceil(distBoxCount / 4) : 0;
      distBoxName = 'XD';
    } else if(procType === 'Brompton_S8') {
      const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
      processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 8) : 0;
    } else if(procType === 'Brompton_M2') {
      const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
      processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 4) : 0;
    } else if(procType === 'Brompton_S4') {
      const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
      processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 4) : 0;
    } else if(procType === 'NovaStar_MX40_Pro') {
      const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
      const processorsByPixels = group.totalPixels > 0 ? Math.ceil(group.totalPixels / 9000000) : 0;
      if(group.hasAnyIndirectMode) {
        distBoxCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 10) : 0;
        distBoxName = 'CVT-10 Pro';
        processorCount = Math.max(processorsByPixels, Math.ceil(distBoxCount / 4));
      } else {
        const processorsByPorts = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 20) : 0;
        processorCount = Math.max(processorsByPixels, processorsByPorts);
      }
    } else {
      const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
      processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 8) : group.screens.length;
    }
    if(hasProcessorRedundancy && processorCount > 0) processorCount *= 2;
    group.processorCount = processorCount;
    group.distBoxCount = distBoxCount;
    group.distBoxName = distBoxName;
  });

  // Helpers
  const sectionHdr = (title) => `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #444; margin-bottom: 4px;"><strong style="color: #10b981; font-size: 13px;">${title}</strong></div>`;
  const gearLine = (label, value) => {
    if(value === 0 || value === '' || value === null || value === undefined || value === '0') return '';
    return `<div style="margin-left: 12px;"><span style="color: #fff;">${label}</span> ${value}</div>`;
  };

  let html = '<div style="font-size: 14px;">';
  let isFirstScreen = true;

  screenIds.forEach(screenId => {
    const screen = screens[screenId];
    const data = screen.data;
    const calcData = screen.calculatedData || {};
    const W = data.panelsWide;
    const H = data.panelsHigh;

    if(W === 0 || H === 0) return;

    const panelType = data.panelType || document.getElementById('panelType').value;
    const allPanelsObj = {...panels, ...customPanels};
    const p = allPanelsObj[panelType];
    if(!p) return;

    const processorType = data.processor || 'Brompton_SX40';
    const processorGroup = processorGroups[processorType] || null;
    const isFirstScreenInGroup = processorGroup && processorGroup.firstScreenId === screenId;

    const hasCB5HalfRow = data.addCB5HalfRow && panelType === 'CB5_MKII';
    // Use calcData.activePanels directly (same as PDF export) — already accounts for deletions
    const activePanels = calcData.activePanels || calcData.panelCount || 0;
    const activeHalfPanels = hasCB5HalfRow ? W : 0;
    const activeFullPanels = activePanels - activeHalfPanels;

    // Rigging data
    const bumper1wCount = calcData.bumper1wCount || 0;
    const bumper2wCount = calcData.bumper2wCount || 0;
    const bumper4wCount = calcData.bumper4wCount || 0;
    const plates2way = calcData.plates2way || 0;
    const plates4way = calcData.plates4way || 0;
    const useBumpers = data.useBumpers !== false;

    // Power data
    const socaCount = calcData.socaCount || 0;
    const circuitsNeeded = calcData.circuitsNeeded || 0;
    const columnsPerCircuit = calcData.columnsPerCircuit || 1;

    // Data cable items
    const dataJumperLen = p.data_jumper_ft || '';
    const dataCrossJumperLen = p.data_cross_jumper_ft || '';
    const powerJumperLen = p.power_jumper_ft || '';
    const jumpersBuiltin = p.jumpers_builtin || false;
    const dataLinesCount = calcData.dataLines || 0;

    // Data cross jumper count (replay serpentine to count multi-column data lines)
    let dataCrossJumperCount = 0;
    if(W > 0 && H > 0) {
      const pr = processors[data.processor] || processors['Brompton_SX40'];
      const portCapacity = pr ? pr.base_pixels_1g : 525000;
      const frameRate = parseInt(data.frameRate) || 60;
      const bitDepth = parseInt(data.bitDepth) || 8;
      let adjustedCapacity = portCapacity;
      if(frameRate > 60) adjustedCapacity = Math.floor(portCapacity * (60 / frameRate));
      if(bitDepth > 8) adjustedCapacity = Math.floor(adjustedCapacity * (8 / bitDepth));
      const pixelsPerPanel = p.res_x * p.res_y;
      let capacityBasedPPD = Math.max(1, Math.floor(adjustedCapacity / pixelsPerPanel));
      capacityBasedPPD = Math.min(capacityBasedPPD, 500);
      const panelSpecificLimit = p.max_panels_per_data || null;
      const suggestedPPD = panelSpecificLimit ? Math.min(capacityBasedPPD, panelSpecificLimit) : capacityBasedPPD;
      const userMaxPPD = parseInt(data.maxPanelsPerData) || 0;
      const panelsPerDataLine = userMaxPPD > 0 ? userMaxPPD : suggestedPPD;

      const startDir = data.dataStartDir || 'top';
      const deletedPanels = data.deletedPanels;
      const customDataLines = data.customDataLineAssignments;
      const hasCustomDataLines = customDataLines && customDataLines.size > 0;

      if(startDir !== 'all_top' && startDir !== 'all_bottom') {
        const dataLineColumns = new Map();
        const usedCustomDataLines = new Set();
        if(hasCustomDataLines) {
          for(let c = 0; c < W; c++) {
            for(let r = 0; r < H; r++) {
              const pk = `${c},${r}`;
              const isDeleted = deletedPanels && deletedPanels.has && deletedPanels.has(pk);
              if(!isDeleted && customDataLines.has(pk)) usedCustomDataLines.add(customDataLines.get(pk) - 1);
            }
          }
        }
        let autoCounter = 0, panelsInCurrent = 0;
        while(usedCustomDataLines.has(autoCounter)) autoCounter++;
        let goingDown = (startDir === 'top');
        for(let c = 0; c < W; c++) {
          const rows = goingDown ? Array.from({length: H}, (_, i) => i) : Array.from({length: H}, (_, i) => H - 1 - i);
          for(const r of rows) {
            const pk = `${c},${r}`;
            if(deletedPanels && deletedPanels.has && deletedPanels.has(pk)) continue;
            let dl;
            if(hasCustomDataLines && customDataLines.has(pk)) {
              dl = customDataLines.get(pk) - 1;
            } else {
              while(usedCustomDataLines.has(autoCounter)) autoCounter++;
              dl = autoCounter;
              panelsInCurrent++;
              if(panelsInCurrent >= panelsPerDataLine) { autoCounter++; panelsInCurrent = 0; while(usedCustomDataLines.has(autoCounter)) autoCounter++; }
            }
            if(!dataLineColumns.has(dl)) dataLineColumns.set(dl, new Set());
            dataLineColumns.get(dl).add(c);
          }
          goingDown = !goingDown;
        }
        dataLineColumns.forEach((columns) => { if(columns.size > 1) dataCrossJumperCount += (columns.size - 1); });
      }
    }

    // Ground support
    const groundSupport = calcData.groundSupport || { totalRearTruss: 0, totalBaseTruss: 0, totalBridgeClamps: 0, totalRearBridgeClampAdapters: 0, totalSandbags: 0, totalSwivelCheeseboroughs: 0, totalPipes: 0, pipeInfo: [] };
    let pipeLengthStr = '';
    if(groundSupport.totalPipes > 0 && groundSupport.pipeInfo && groundSupport.pipeInfo.length > 0) {
      const uniqueLengths = [...new Set(groundSupport.pipeInfo.map(pi => pi.pipeLengthFt))];
      pipeLengthStr = ' (' + uniqueLengths.map(l => l + 'ft').join(', ') + ')';
    }

    // 4K canvas check for signal cables
    const canvasSize = data.canvasSize || '4K_UHD';
    const is4KCanvas = (canvasSize === '4K_UHD' || canvasSize === '4K_DCI');

    // --- BEGIN PER-SCREEN CONTAINER ---
    const gearScreenColor = safeColor(screen.color);
    html += `<div style="background: var(--comic-panel); border: 1px solid ${gearScreenColor}; border-radius: 2px; padding: 16px; padding-top: 28px; margin-bottom: 16px; margin-top: 12px; overflow: visible; position: relative; box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);">`;
    html += `<div style="position: absolute; top: -16px; left: 16px; background: #222; border: 1px solid ${gearScreenColor}; padding: 4px 10px; font-family: 'Bangers', cursive; font-size: 16px; letter-spacing: 1.5px; text-transform: uppercase; color: ${gearScreenColor}; transform: rotate(-2deg); text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;">${escapeHtml(screen.name)}</div>`;

    // === EQUIPMENT ===
    html += sectionHdr('Equipment');
    if(isFirstScreenInGroup && processorGroup && processorGroup.processorCount > 0) {
      html += gearLine('Processor:', `${processorGroup.processorCount}x ${escapeHtml(calcData.processorName || '')}`);
      if(processorGroup.distBoxCount > 0) {
        html += gearLine(`${escapeHtml(processorGroup.distBoxName)}:`, processorGroup.distBoxCount);
      }
    } else if(processorGroup && processorGroup.firstScreenName && processorGroup.firstScreenId !== screenId) {
      html += `<div style="margin-left: 12px; color: #fff;">Processor: See ${escapeHtml(processorGroup.firstScreenName)}</div>`;
    }
    html += `<div style="margin-left: 12px;"><span style="color: #fff;">Panels:</span> ${activeFullPanels} x ${escapeHtml(p.brand)} ${escapeHtml(p.name)}</div>`;
    if(activeHalfPanels > 0) {
      const halfPanel = allPanelsObj['CB5_MKII_HALF'];
      html += `<div style="margin-left: 12px;"><span style="color: #fff;">Half Panels:</span> ${activeHalfPanels} x ${escapeHtml(p.brand)} ${escapeHtml(halfPanel ? halfPanel.name : 'CB5 MKII Half Panel')}</div>`;
    }

    // === RIGGING HARDWARE ===
    const hasRigging = bumper1wCount > 0 || bumper2wCount > 0 || bumper4wCount > 0 || plates4way > 0 || plates2way > 0;
    if(hasRigging) {
      html += sectionHdr('Rigging Hardware');
      html += gearLine('1W Bumpers:', bumper1wCount);
      html += gearLine('2W Bumpers:', bumper2wCount);
      html += gearLine('4W Bumpers:', bumper4wCount);
      html += gearLine('4W Connecting Plates:', plates4way);
      html += gearLine('2W Connecting Plates:', plates2way);

      // Shackles and Cheeseye
      const needsSC = ['CB5_MKII', 'CB5_MKII_HALF', 'MC7H', 'INFILED_AMT8_3'].includes(panelType);
      const isHanging = (data.structureType || 'hanging') === 'hanging';
      if(needsSC && isHanging && useBumpers) {
        let shackleCount = 0, cheeseyeCount = 0;
        if(panelType === 'INFILED_AMT8_3') {
          shackleCount = bumper1wCount + (bumper2wCount * 2);
          cheeseyeCount = bumper1wCount + (bumper2wCount * 2);
        } else {
          shackleCount = bumper1wCount + bumper2wCount;
          cheeseyeCount = bumper1wCount + bumper2wCount;
        }
        html += gearLine('5/8" Shackles:', shackleCount);
        html += gearLine('Cheeseye:', cheeseyeCount);
      }
    }

    // === GROUND SUPPORT ===
    const hasGS = groundSupport.totalRearTruss > 0 || groundSupport.totalBaseTruss > 0 || groundSupport.totalBridgeClamps > 0 || groundSupport.totalSandbags > 0 || groundSupport.totalPipes > 0 || groundSupport.totalSwivelCheeseboroughs > 0 || groundSupport.totalRearBridgeClampAdapters > 0;
    if(hasGS) {
      html += sectionHdr('Ground Support');
      html += gearLine('Rear Truss:', groundSupport.totalRearTruss);
      html += gearLine('Base Truss:', groundSupport.totalBaseTruss);
      html += gearLine('Bridge Clamps:', groundSupport.totalBridgeClamps);
      html += gearLine('Rear Bridge Adapter:', groundSupport.totalRearBridgeClampAdapters);
      html += gearLine('Sandbags:', groundSupport.totalSandbags);
      html += gearLine('Swivel Cheeseborough:', groundSupport.totalSwivelCheeseboroughs);
      if(groundSupport.totalPipes > 0) html += gearLine('Pipe' + pipeLengthStr + ':', groundSupport.totalPipes);
    }

    // === FLOOR HARDWARE ===
    if(screen.calculatedData && screen.calculatedData.floorFrames) {
      const ff = screen.calculatedData.floorFrames;
      if(ff.frame_1x1 > 0 || ff.frame_2x1 > 0 || ff.frame_2x2 > 0 || ff.frame_3x2 > 0) {
        html += sectionHdr('Floor Hardware');
        if(ff.frame_3x2 > 0) html += gearLine('3×2 Frame:', ff.frame_3x2);
        if(ff.frame_2x2 > 0) html += gearLine('2×2 Frame:', ff.frame_2x2);
        if(ff.frame_2x1 > 0) html += gearLine('2×1 Frame:', ff.frame_2x1);
        if(ff.frame_1x1 > 0) html += gearLine('1×1 Frame:', ff.frame_1x1);
      }
    }

    // === DATA CABLES ===
    html += sectionHdr('Data Cables');
    // Jumpers and couplers
    if(!jumpersBuiltin && dataJumperLen) {
      html += gearLine(`Jumpers ${dataJumperLen}':`, activePanels);
    }
    if(dataCrossJumperLen && dataCrossJumperCount > 0) {
      html += gearLine(`Cross Jumpers ${dataCrossJumperLen}':`, dataCrossJumperCount);
    }
    if(jumpersBuiltin) {
      const totalCat5Couplers = dataCrossJumperCount + dataLinesCount;
      html += gearLine('Cat5 Couplers:', totalCat5Couplers);
    }
    // Computed data cable lengths from calculateCabling
    const cabling = calculateCabling(screenId);
    if(cabling) {
      const allDataCables = cabling.dataCables || [];
      const knockoutCables = cabling.knockoutBridgeCables || [];
      if(allDataCables.length > 0 || knockoutCables.length > 0) {
        // Merge all cables (primary + backup + knockout) into totals by length
        const allDataByLength = {};
        allDataCables.forEach(c => { allDataByLength[c.roundedFt] = (allDataByLength[c.roundedFt] || 0) + 1; });
        knockoutCables.forEach(c => { allDataByLength[c.roundedFt] = (allDataByLength[c.roundedFt] || 0) + 1; });
        for(const [len, count] of Object.entries(allDataByLength).sort((a,b) => a[0] - b[0])) {
          html += `<div style="margin-left: 12px; color: #fff;">${count}x ${len}' Cat6</div>`;
        }
        // Detail dropdown at end of section
        const primaryCables = allDataCables.filter(c => !c.backup);
        html += `<details style="margin-left: 12px; margin-top: 4px;"><summary style="cursor: pointer; color: #fff; font-size: 12px;">Detail</summary>`;
        primaryCables.forEach(c => {
          html += `<div style="margin-left: 12px; font-size: 12px; color: #fff;">Line ${c.lineIndex}: ${c.lengthFt}' → ${c.roundedFt}'</div>`;
        });
        knockoutCables.forEach((c, idx) => {
          html += `<div style="margin-left: 12px; font-size: 12px; color: #fff;">Knockout ${idx + 1} (P${c.fromPanel} → P${c.toPanel}): ${c.lengthFt}' → ${c.roundedFt}'</div>`;
        });
        html += `</details>`;
      }
    }

    // === POWER CABLES ===
    html += sectionHdr('Power Cables');
    if(!jumpersBuiltin && powerJumperLen) {
      html += gearLine(`Jumpers ${powerJumperLen}':`, activePanels);
    }
    html += gearLine('Soca Splays:', socaCount);
    // Computed SOCA cable lengths
    let hasSocaDetail = false;
    if(cabling && cabling.socaCables.length > 0) {
      hasSocaDetail = true;
      const socaByLength = {};
      cabling.socaCables.forEach(s => { socaByLength[s.roundedFt] = (socaByLength[s.roundedFt] || 0) + 1; });
      for(const [len, count] of Object.entries(socaByLength).sort((a,b) => a[0] - b[0])) {
        html += `<div style="margin-left: 12px; color: #fff;">${count}x ${len}' Soca</div>`;
      }
    }
    // True1 cables
    html += gearLine("25' True1:", socaCount);
    html += gearLine("10' True1:", socaCount);
    html += gearLine("5' True1:", socaCount * 2);
    if(columnsPerCircuit > 1) {
      html += gearLine('True1 Twofer:', circuitsNeeded * columnsPerCircuit);
    }
    // SOCA detail dropdown at end of section
    if(hasSocaDetail) {
      html += `<details style="margin-left: 12px; margin-top: 4px;"><summary style="cursor: pointer; color: #fff; font-size: 12px;">Detail</summary>`;
      cabling.socaCables.forEach(s => {
        html += `<div style="margin-left: 12px; font-size: 12px; color: #fff;">SOCA ${s.index}: ${s.lengthFt}' → ${s.roundedFt}'</div>`;
      });
      html += `</details>`;
    }

    // === PROCESSOR → DIST BOX ===
    if(cabling && cabling.distBoxCables.length > 0) {
      html += sectionHdr('Processor → Dist Box');
      const mainBoxCables = cabling.distBoxCables.filter(c => c.label === 'main');
      const boxCableType = mainBoxCables[0]?.type || 'cat6a';
      const boxCableRounded = mainBoxCables[0]?.roundedFt || 0;
      html += `<div style="margin-left: 12px; color: #fff;">${cabling.distBoxCables.length}x ${boxCableType === 'fiber' ? 'Fiber' : 'Cat6A'} ${boxCableRounded}'</div>`;
      if(boxCableType === 'fiber') {
        html += `<div style="margin-left: 12px; color: #e040fb; font-size: 12px;">(Fiber required: distance > 200')</div>`;
      }
    }

    // === SIGNAL CABLES (first screen only) ===
    if(isFirstScreen) {
      html += sectionHdr('Signal Cables');
      const procCount = processorGroup ? processorGroup.processorCount : 0;
      const sdiPerProcessor = procCount * 2;
      // Determine if canvas is HD (1920x1080) or higher
      const isHDCanvas = canvasSize === 'HD' || (canvasSize === 'custom' &&
        (parseInt(data.customCanvasWidth) || 1920) <= 1920 &&
        (parseInt(data.customCanvasHeight) || 1080) <= 1080);
      // Build SDI counts by length, then merge server cable into matching bucket
      const sdiType = isHDCanvas ? '3G SDI' : '12G SDI';
      const sdiCounts = {};
      if(isHDCanvas) {
        sdiCounts[100] = sdiPerProcessor;
        sdiCounts[50] = sdiPerProcessor;
        sdiCounts[25] = sdiPerProcessor;
        sdiCounts[10] = 6;
        sdiCounts[3] = 6;
      } else {
        sdiCounts[100] = sdiPerProcessor;
        sdiCounts[50] = sdiPerProcessor;
        sdiCounts[25] = sdiPerProcessor;
      }
      // Server → Processor cable (primary + backup = 2) merged into SDI counts
      let serverFiberLine = '';
      if(cabling && cabling.serverCable) {
        const serverLen = cabling.serverCable.lengthFt || 0;
        if(serverLen > 0) {
          if(serverLen > 300) {
            const fiberLen = Math.max(500, Math.ceil(serverLen / 100) * 100);
            serverFiberLine = `${fiberLen}' Fiber`;
          } else {
            const sdiLen = roundUpToStandard(serverLen);
            sdiCounts[sdiLen] = (sdiCounts[sdiLen] || 0) + 2;
          }
        }
      }
      // Render SDI lines sorted by length descending
      for(const len of Object.keys(sdiCounts).map(Number).sort((a,b) => b - a)) {
        if(sdiCounts[len] > 0) {
          html += gearLine(`${len}' ${sdiType}:`, sdiCounts[len]);
        }
      }
      // Fiber line if server cable was too long for SDI
      if(serverFiberLine) {
        html += gearLine(`${serverFiberLine}:`, 2);
      }
      html += gearLine("25' HDMI:", 6);
      html += gearLine("10' HDMI:", 6);
      html += gearLine("6' HDMI:", 6);
    }

    // === UTILITY (first screen only) ===
    if(isFirstScreen) {
      html += sectionHdr('Utility');
      html += gearLine("UG 10':", 8);
      html += gearLine("UG 25':", 6);
      html += gearLine("UG 50':", 6);
      html += gearLine('UG Twofers:', 8);
      html += gearLine('Power Bars:', 8);
    }

    // === SPARES ===
    html += sectionHdr('SPARES');
    html += gearLine('Spare Soca Splays:', '');
    html += gearLine('Spare Panel Count:', '');
    if(!jumpersBuiltin && dataJumperLen) html += gearLine(`Spare Data Jumpers ${dataJumperLen}':`, '');
    if(dataCrossJumperLen) html += gearLine(`Spare Data Cross Jumpers ${dataCrossJumperLen}':`, '');
    if(jumpersBuiltin) html += gearLine('Spare Cat5 Couplers:', '');
    if(!jumpersBuiltin && powerJumperLen) html += gearLine(`Spare Power Jumpers ${powerJumperLen}':`, '');

    html += `</div>`; // close per-screen container
    isFirstScreen = false;
  });

  html += '</div>';

  gearListContent.innerHTML = html;
  // Only show container if we're on the gear tab
  if(typeof currentMobileView !== 'undefined' && currentMobileView === 'gear') {
    gearListContainer.style.display = 'block';
  }
}
