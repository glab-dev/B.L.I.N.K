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
  // Start on the screen the user was editing
  gearActiveScreenId = currentScreenId;
  // Load cabling inputs for this screen and initialize view
  loadGearCablingInputs(gearActiveScreenId);
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
  const powerInPos = data.powerInPosition ?? 'top';
  const distBoxOnWall = data.distBoxOnWall ?? false;
  const distBoxMainHorizPos = data.distBoxMainHorizPosition ?? data.distBoxHorizPosition ?? 'center';
  const distBoxBackupHorizPos = data.distBoxBackupHorizPosition ?? data.distBoxHorizPosition ?? 'center';
  const distBoxMainVert = data.distBoxMainVertPosition ?? 'top';
  const distBoxBackupVert = data.distBoxBackupVertPosition ?? 'top';

  // Deleted panels
  const deletedPanelsSet = data.deletedPanels || new Set();

  // Drop point position in feet from wall left edge
  let dropPointFt;
  if(dropPos === 'behind') dropPointFt = wallWidthFt / 2; // center
  else if(dropPos === 'sr') dropPointFt = 0;              // left edge (SR from front)
  else dropPointFt = wallWidthFt;                          // right edge (SL from front)

  // Vertical distance from drop point (wall top) through pick to floor
  // cablePick is extra cable added once (not doubled for up+down)
  const dropToFloorFt = wallHeightFt + wallToFloor + cablePick;

  // Floor run: distroToWall and processorToWall are measured from equipment to drop point
  // so they directly represent the floor cable run distance

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

    // Landing = center of covered columns (feet from wall left edge)
    const landingCenterFt = ((firstCol + lastCol + 1) / 2) * panelWidthFt;

    // Horizontal run along wall: landing → drop point
    const wallHorizFt = Math.abs(landingCenterFt - dropPointFt);

    // Bottom routing: cable goes down the wall first, then horizontal along bottom, then to floor
    // No cable pick needed since the cable doesn't go over the top
    const totalFt = (powerInPos === 'bottom')
      ? wallHeightFt + wallHorizFt + wallToFloor + distroToWall
      : wallHorizFt + dropToFloorFt + distroToWall;
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
    // Main distribution box horizontal position
    let mainDistBoxPositionFt;
    if(distBoxMainHorizPos === 'sr') {
      mainDistBoxPositionFt = 2 * panelWidthFt;
    } else if(distBoxMainHorizPos === 'sl') {
      mainDistBoxPositionFt = wallWidthFt - 2 * panelWidthFt;
    } else {
      mainDistBoxPositionFt = wallWidthFt / 2;
    }
    const mainDistBoxCol = Math.round(mainDistBoxPositionFt / panelWidthFt);

    // Main dist box row based on vertical position
    const mainDistBoxRow = (distBoxMainVert === 'bottom') ? effectivePh - 1 : 0;
    const mainDistBoxCenterVertFt = (mainDistBoxRow + 0.5) * panelHeightFt;

    // Primary data cables from main dist box to each data line entry
    for(let dl = 0; dl < dataLines; dl++) {
      const entry = entryPoints[dl];
      if(!entry) continue;

      const panelCenterFt = (entry.col + 0.5) * panelWidthFt;
      const panelCenterVertFt = (entry.row + 0.5) * panelHeightFt;

      const detourPanels = calculateKnockoutDetour(mainDistBoxCol, mainDistBoxRow, entry.col, entry.row, deletedPanelsSet, pw, effectivePh);
      const hDist = Math.abs(panelCenterFt - mainDistBoxPositionFt);
      const vDist = Math.abs(panelCenterVertFt - mainDistBoxCenterVertFt);
      const directManhattan = Math.abs(entry.col - mainDistBoxCol) + Math.abs(entry.row - mainDistBoxRow);
      const extraDetour = (detourPanels - directManhattan);
      const extraDetourFt = extraDetour > 0 ? extraDetour * ((panelWidthFt + panelHeightFt) / 2) : 0;

      const totalFt = hDist + vDist + extraDetourFt;
      dataCables.push({
        lineIndex: dl + 1,
        lengthFt: Math.round(totalFt * 10) / 10,
        roundedFt: roundUpToStandard(totalFt),
        type: 'cat6a'
      });
    }

    // Backup distribution box horizontal position (independent)
    let backupDistBoxPositionFt;
    if(distBoxBackupHorizPos === 'sr') {
      backupDistBoxPositionFt = 2 * panelWidthFt;
    } else if(distBoxBackupHorizPos === 'sl') {
      backupDistBoxPositionFt = wallWidthFt - 2 * panelWidthFt;
    } else {
      backupDistBoxPositionFt = wallWidthFt / 2;
    }
    const backupDistBoxCol = Math.round(backupDistBoxPositionFt / panelWidthFt);

    // Backup data cables — from backup dist box position (may differ both H and V)
    if(redundancy) {
      const backupDistBoxRow = (distBoxBackupVert === 'bottom') ? effectivePh - 1 : 0;
      const backupDistBoxCenterVertFt = (backupDistBoxRow + 0.5) * panelHeightFt;

      for(let dl = 0; dl < dataLines; dl++) {
        const entry = entryPoints[dl];
        if(!entry) continue;

        const panelCenterFt = (entry.col + 0.5) * panelWidthFt;
        const panelCenterVertFt = (entry.row + 0.5) * panelHeightFt;

        const detourPanels = calculateKnockoutDetour(backupDistBoxCol, backupDistBoxRow, entry.col, entry.row, deletedPanelsSet, pw, effectivePh);
        const hDist = Math.abs(panelCenterFt - backupDistBoxPositionFt);
        const vDist = Math.abs(panelCenterVertFt - backupDistBoxCenterVertFt);
        const directManhattan = Math.abs(entry.col - backupDistBoxCol) + Math.abs(entry.row - backupDistBoxRow);
        const extraDetour = (detourPanels - directManhattan);
        const extraDetourFt = extraDetour > 0 ? extraDetour * ((panelWidthFt + panelHeightFt) / 2) : 0;

        const totalFt = hDist + vDist + extraDetourFt;
        dataCables.push({
          lineIndex: dl + 1,
          lengthFt: Math.round(totalFt * 10) / 10,
          roundedFt: roundUpToStandard(totalFt),
          type: 'cat6a',
          backup: true
        });
      }
    }

    // Trunk cables — main and backup can have different lengths based on both H and V position
    const mainDistBoxHorizFt = Math.abs(mainDistBoxPositionFt - dropPointFt);
    const backupDistBoxHorizFt = Math.abs(backupDistBoxPositionFt - dropPointFt);

    // Main trunk: top route uses dropToFloorFt (includes pick), bottom route skips pick
    const mainTrunkFt = (distBoxMainVert === 'bottom')
      ? mainDistBoxHorizFt + wallToFloor + processorToWall
      : mainDistBoxHorizFt + dropToFloorFt + processorToWall;

    // Backup trunk
    const backupTrunkFt = (distBoxBackupVert === 'bottom')
      ? backupDistBoxHorizFt + wallToFloor + processorToWall
      : backupDistBoxHorizFt + dropToFloorFt + processorToWall;

    for(let b = 0; b < distributionBoxCount; b++) {
      const mainType = mainTrunkFt > 200 ? 'fiber' : 'cat6a';
      distBoxCables.push({
        boxIndex: b + 1,
        lengthFt: Math.round(mainTrunkFt * 10) / 10,
        roundedFt: roundUpToStandard(mainTrunkFt),
        type: mainType,
        label: 'main'
      });
      const backupType = backupTrunkFt > 200 ? 'fiber' : 'cat6a';
      distBoxCables.push({
        boxIndex: b + 1,
        lengthFt: Math.round(backupTrunkFt * 10) / 10,
        roundedFt: roundUpToStandard(backupTrunkFt),
        type: backupType,
        label: 'backup'
      });
    }
  } else {
    // No dist box on wall: data cables run from entry panel → wall edge → drop → floor → processor
    for(let dl = 0; dl < dataLines; dl++) {
      const entry = entryPoints[dl];
      if(!entry) continue;

      // Entry panel center position in feet
      const entryHFt = (entry.col + 0.5) * panelWidthFt;
      const entryVFt = (entry.row + 0.5) * panelHeightFt;
      const isBottomEntry = entry.row >= effectivePh / 2;

      // Horizontal run along wall edge: entry column → drop point
      const wallHorizFt = Math.abs(entryHFt - dropPointFt);

      let totalFt;
      if(isBottomEntry) {
        // Route: panel → wall bottom → along bottom → floor → processor
        const panelToBottomFt = wallHeightFt - entryVFt;
        totalFt = panelToBottomFt + wallHorizFt + wallToFloor + processorToWall;
      } else {
        // Route: panel → wall top → along top → drop → pick → floor → processor
        const panelToTopFt = entryVFt;
        totalFt = panelToTopFt + wallHorizFt + dropToFloorFt + processorToWall;
      }

      // Add knockout detour if applicable
      const dropCol = dropPos === 'sr' ? pw - 1 : (dropPos === 'sl' ? 0 : Math.floor(pw / 2));
      const entryRow = isBottomEntry ? effectivePh - 1 : 0;
      const directManhattan = Math.abs(entry.col - dropCol) + Math.abs(entry.row - entryRow);
      const detourPanels = calculateKnockoutDetour(dropCol, entryRow, entry.col, entry.row, deletedPanelsSet, pw, effectivePh);
      const extraDetour = detourPanels - directManhattan;
      const extraDetourFt = extraDetour > 0 ? extraDetour * ((panelWidthFt + panelHeightFt) / 2) : 0;
      totalFt += extraDetourFt;

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

  // ---- D. Exit points (last panel per data line — for backup/redundancy cables) ----
  const exitPoints = {};
  for (const [dlIndex, panelList] of Object.entries(dataLinePanelOrdering)) {
    if (panelList.length > 0) exitPoints[dlIndex] = panelList[panelList.length - 1];
  }

  // ---- E. Totals ----
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
    entryPoints,
    exitPoints,
    dataStartDir: data.dataStartDir || 'top',
    dataLines,
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
let gearActiveScreenId = null;

function saveGearCablingInputs(screenId) {
  if(!screens[screenId] || !screens[screenId].data) return;
  const data = screens[screenId].data;
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
}

function loadGearCablingInputs(screenId) {
  if(!screens[screenId] || !screens[screenId].data) return;
  const data = screens[screenId].data;
  const wallToFloorEl = document.getElementById('wallToFloor');
  const distroToWallEl = document.getElementById('distroToWall');
  const processorToWallEl = document.getElementById('processorToWall');
  const serverToProcessorEl = document.getElementById('serverToProcessor');
  const cablePickEl = document.getElementById('cablePick');

  if(wallToFloorEl) wallToFloorEl.value = (data.wallToFloor && data.wallToFloor !== 5) ? data.wallToFloor : '';
  if(distroToWallEl) distroToWallEl.value = (data.distroToWall && data.distroToWall !== 10) ? data.distroToWall : '';
  if(processorToWallEl) processorToWallEl.value = (data.processorToWall && data.processorToWall !== 15) ? data.processorToWall : '';
  const serverVal = data.serverToProcessor ?? data.fohToProcessor;
  if(serverToProcessorEl) serverToProcessorEl.value = (serverVal && serverVal !== 50) ? serverVal : '';
  if(cablePickEl) cablePickEl.value = (data.cablePick && data.cablePick !== 0) ? data.cablePick : '';

  // Update toggle button states
  const dropPos = data.cableDropPosition || 'behind';
  cableDropPosition = dropPos;
  document.getElementById('cableDropBehindBtn').classList.toggle('active', dropPos === 'behind');
  document.getElementById('cableDropSRBtn').classList.toggle('active', dropPos === 'sr');
  document.getElementById('cableDropSLBtn').classList.toggle('active', dropPos === 'sl');

  const powerPos = data.powerInPosition || 'top';
  powerInPosition = powerPos;
  document.getElementById('powerInTopBtn').classList.toggle('active', powerPos === 'top');
  document.getElementById('powerInBottomBtn').classList.toggle('active', powerPos === 'bottom');

  const distBox = data.distBoxOnWall || false;
  distBoxOnWallEnabled = distBox;
  document.getElementById('distBoxOnWallBtn').classList.toggle('active', distBox);

  distBoxMainHorizPosition = data.distBoxMainHorizPosition || data.distBoxHorizPosition || 'center';
  document.getElementById('distBoxMainHorizSRBtn')?.classList.toggle('active', distBoxMainHorizPosition === 'sr');
  document.getElementById('distBoxMainHorizCBtn')?.classList.toggle('active', distBoxMainHorizPosition === 'center');
  document.getElementById('distBoxMainHorizSLBtn')?.classList.toggle('active', distBoxMainHorizPosition === 'sl');

  distBoxBackupHorizPosition = data.distBoxBackupHorizPosition || data.distBoxHorizPosition || 'center';
  document.getElementById('distBoxBackupHorizSRBtn')?.classList.toggle('active', distBoxBackupHorizPosition === 'sr');
  document.getElementById('distBoxBackupHorizCBtn')?.classList.toggle('active', distBoxBackupHorizPosition === 'center');
  document.getElementById('distBoxBackupHorizSLBtn')?.classList.toggle('active', distBoxBackupHorizPosition === 'sl');

  distBoxMainVertPosition = data.distBoxMainVertPosition || 'top';
  document.getElementById('distBoxMainTopBtn')?.classList.toggle('active', distBoxMainVertPosition === 'top');
  document.getElementById('distBoxMainBottomBtn')?.classList.toggle('active', distBoxMainVertPosition === 'bottom');

  distBoxBackupVertPosition = data.distBoxBackupVertPosition || 'top';
  document.getElementById('distBoxBackupTopBtn')?.classList.toggle('active', distBoxBackupVertPosition === 'top');
  document.getElementById('distBoxBackupBottomBtn')?.classList.toggle('active', distBoxBackupVertPosition === 'bottom');

  const posControls = document.getElementById('distBoxPositionControls');
  if (posControls) posControls.style.display = distBox ? '' : 'none';
}

function initGearView() {
  const togglesContainer = document.getElementById('gearScreenToggles');
  if(!togglesContainer) return;

  // Default to currentScreenId if not set or invalid
  if(!gearActiveScreenId || !screens[gearActiveScreenId]) {
    gearActiveScreenId = currentScreenId;
  }

  const screenIds = Object.keys(screens).sort((a, b) => {
    const numA = parseInt(a.split('_')[1]);
    const numB = parseInt(b.split('_')[1]);
    return numA - numB;
  });

  // Build screen-tab style tabs (matching complex page screen tabs)
  let html = '';
  screenIds.forEach(screenId => {
    const screen = screens[screenId];
    const isActive = screenId === gearActiveScreenId;
    html += `<div class="screen-tab ${isActive ? 'active' : ''}" onclick="switchGearScreen('${screenId}')">` +
      `<span class="screen-tab-name">${escapeHtml(screen.name)}</span>` +
      `</div>`;
  });

  // Use a screen-tabs wrapper like the main screen tabs
  let tabsWrapper = togglesContainer.querySelector('.screen-tabs');
  if(!tabsWrapper) {
    tabsWrapper = document.createElement('div');
    tabsWrapper.className = 'screen-tabs';
    togglesContainer.appendChild(tabsWrapper);
  }
  tabsWrapper.innerHTML = html;

  generateGearList();
}

function switchGearScreen(screenId) {
  if(screenId === gearActiveScreenId) return;
  // Save cabling inputs from DOM to the old screen's data
  saveGearCablingInputs(gearActiveScreenId);
  // Switch to new screen
  gearActiveScreenId = screenId;
  // Load new screen's cabling inputs into DOM
  loadGearCablingInputs(screenId);
  // Re-render tabs and gear list
  initGearView();
}

function generateGearList() {
  const gearListContainer = document.getElementById('gearListContainer');
  const gearListContent = document.getElementById('gearListContent');

  if(!gearListContainer || !gearListContent) return;

  // Use active gear screen if on gear tab, otherwise show all
  const allScreenIds = Object.keys(screens).sort((a, b) => {
    const numA = parseInt(a.split('_')[1]);
    const numB = parseInt(b.split('_')[1]);
    return numA - numB;
  });
  const screenIds = (typeof currentAppMode !== 'undefined' && currentAppMode === 'gear' && gearActiveScreenId && screens[gearActiveScreenId])
    ? [gearActiveScreenId]
    : allScreenIds;

  // Build gear data from shared module
  const gearData = buildGearListData(screenIds);

  // Helpers
  const sectionHdr = (title) => `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #383838; margin-bottom: 4px;"><strong style="color: #10b981; font-size: 13px;">${title}</strong></div>`;
  const subTypeSpacer = '<div style="margin-top: 10px;"></div>';
  const gearLine = (label, value) => {
    if(value === 0 || value === '' || value === null || value === undefined || value === '0') return '';
    // If value is a number, format as "countx label" — otherwise keep as "label value" for pre-formatted strings
    if(typeof value === 'number') {
      const cleanLabel = label.replace(/:$/, '').trim(); // Remove trailing colon
      return `<div style="margin-left: 12px; color: #fff;">${value} x ${cleanLabel}</div>`;
    }
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
    const sp = sd.spares;

    // --- BEGIN PER-SCREEN CONTAINER ---
    const gearScreenColor = safeColor(sd.screenColor);
    html += `<div style="background: var(--comic-panel); border: 1px solid ${gearScreenColor}; border-radius: 2px; padding: 16px; padding-top: 28px; margin-bottom: 16px; margin-top: 12px; overflow: visible; position: relative; box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);">`;
    html += `<div style="position: absolute; top: -16px; left: 16px; background: #1a1a1a; border: 1px solid ${gearScreenColor}; padding: 4px 10px; font-family: 'Bangers', cursive; font-size: 16px; letter-spacing: 1.5px; text-transform: uppercase; color: ${gearScreenColor}; transform: rotate(-2deg); text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;">${escapeHtml(sd.screenName)}</div>`;

    // === EQUIPMENT ===
    html += sectionHdr('Equipment');
    if(eq.isFirstScreenInGroup && eq.processorCount > 0) {
      html += gearLine('Processor:', `${eq.processorCount} x ${escapeHtml(eq.processorName)}`);
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
    if(cat6Lengths.length > 0 && (dc.jumperCount > 0 || (dc.crossJumperLen && dc.crossJumperCount > 0))) {
      html += subTypeSpacer;
    }
    if(cat6Lengths.length > 0) {
      for(const [len, count] of cat6Lengths) {
        html += `<div style="margin-left: 12px; color: #fff;">${count} x ${len}' Cat6</div>`;
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
    if(pc.jumperCount > 0) html += subTypeSpacer;
    html += gearLine('Soca Splays:', pc.socaSplays);
    // Dynamic SOCA cable lengths
    const socaLengths = Object.entries(pc.socaByLength).sort((a,b) => a[0] - b[0]);
    for(const [len, count] of socaLengths) {
      html += `<div style="margin-left: 12px; color: #fff;">${count} x ${len}' Soca</div>`;
    }
    // True1 cables
    if(socaLengths.length > 0 || pc.socaSplays > 0) html += subTypeSpacer;
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
      html += `<div style="margin-left: 12px; color: #fff;">${p2d.count} x ${p2d.cableType} ${p2d.cableLength}'</div>`;
      if(p2d.cableType === 'Fiber') {
        html += `<div style="margin-left: 12px; color: #e040fb; font-size: 12px;">(Fiber required: distance > 200')</div>`;
      }
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

  // === SYSTEM-WIDE: SIGNAL CABLES & UTILITY (always visible) ===
  const sig = gearData.signalCables;
  const util = gearData.utility;
  html += `<div style="background: var(--comic-panel); border: 1px solid #10b981; border-radius: 2px; padding: 16px; padding-top: 28px; margin-bottom: 16px; margin-top: 12px; overflow: visible; position: relative; box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);">`;
  html += `<div style="position: absolute; top: -16px; left: 16px; background: #1a1a1a; border: 1px solid #10b981; padding: 4px 10px; font-family: 'Bangers', cursive; font-size: 16px; letter-spacing: 1.5px; text-transform: uppercase; color: #10b981; transform: rotate(-2deg); text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;">System</div>`;

  if(sig) {
    html += sectionHdr('Signal Cables');
    for(const len of Object.keys(sig.sdiByLength).map(Number).sort((a,b) => b - a)) {
      if(sig.sdiByLength[len] > 0) {
        html += gearLine(`${len}' ${sig.sdiType}:`, sig.sdiByLength[len]);
      }
    }
    if(sig.serverFiberLine) {
      html += gearLine(`${sig.serverFiberLine.label}:`, sig.serverFiberLine.count);
    }
    html += subTypeSpacer;
    html += gearLine("25' HDMI:", sig.hdmi[25]);
    html += gearLine("10' HDMI:", sig.hdmi[10]);
    html += gearLine("6' HDMI:", sig.hdmi[6]);
  }

  if(util) {
    html += sectionHdr('Utility');
    html += gearLine("UG 10':", util.ug10);
    html += gearLine("UG 25':", util.ug25);
    html += gearLine("UG 50':", util.ug50);
    html += gearLine('UG Twofers:', util.ugTwofers);
    html += gearLine('Power Bars:', util.powerBars);
  }

  html += `</div>`;

  html += '</div>';

  gearListContent.innerHTML = html;
  // Only show container if we're on the gear tab
  if(typeof currentMobileView !== 'undefined' && currentMobileView === 'gear') {
    gearListContainer.style.display = 'block';
  }

  // Render cable layout diagram for the active gear screen
  if(typeof renderCableDiagram === 'function') {
    const diagramScreenId = (typeof currentAppMode !== 'undefined' && currentAppMode === 'gear' && gearActiveScreenId && screens[gearActiveScreenId])
      ? gearActiveScreenId : currentScreenId;
    renderCableDiagram(diagramScreenId);
  }
}
