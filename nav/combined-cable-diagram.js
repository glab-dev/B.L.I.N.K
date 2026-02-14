// ==================== COMBINED CABLE LAYOUT DIAGRAM ====================
// Unified cable diagram for combined multi-screen view.
// Shows multiple LED walls sharing processors, distribution boxes, and power.
// Renders into #combinedCableDiagramCanvas inside the combined tab.

// ---- Combined Cabling Configuration (global, shared across all combined screens) ----
let combinedCablingConfig = {
  processor: 'Brompton_SX40',
  frameRate: 60,
  bitDepth: 8,
  redundancy: false,
  mx40ConnectionMode: 'direct',
  voltage: 208,
  breaker: 20,
  wallToFloor: 5,
  distroToWall: 10,
  processorToWall: 15,
  serverToProcessor: 50,
  cablePick: 0,
  cableDropPosition: 'behind',
  powerInPosition: 'top',
  distBoxOnWall: false,
  distBoxMainHorizPosition: 'center',
  distBoxMainVertPosition: 'top',
  distBoxBackupHorizPosition: 'center',
  distBoxBackupVertPosition: 'top'
};

// ---- localStorage Persistence ----

function saveCombinedCablingConfig() {
  try {
    localStorage.setItem('ledcalc_combined_cabling_config', JSON.stringify(combinedCablingConfig));
  } catch (e) { /* ignore quota errors */ }
}

function loadCombinedCablingConfig() {
  try {
    const saved = localStorage.getItem('ledcalc_combined_cabling_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.keys(parsed).forEach(key => {
          if (isSafeKey(key) && combinedCablingConfig.hasOwnProperty(key)) {
            combinedCablingConfig[key] = parsed[key];
          }
        });
      }
    }
  } catch (e) { /* ignore parse errors */ }
}

// Load on script parse
loadCombinedCablingConfig();

// ---- Processor Dist Box Support Check ----
function processorSupportsDistBox(processorId, mx40Mode) {
  if (processorId === 'Brompton_SX40') return true;
  if (processorId === 'NovaStar_MX40_Pro' && mx40Mode !== 'direct') return true;
  // Custom processors
  var allProcs = typeof processors !== 'undefined' ? processors : {};
  var pr = allProcs[processorId];
  if (pr && pr.custom && pr.uses_distribution_box) {
    if (pr.supports_direct && mx40Mode === 'direct') return false;
    return true;
  }
  return false;
}

function updateCombinedDistBoxAvailability() {
  // Derive processor from selected screens, or fall back to current screen
  var found = false;
  var selectedIds = (typeof combinedSelectedScreens !== 'undefined' && combinedSelectedScreens.size > 0)
    ? Array.from(combinedSelectedScreens) : [];
  for (var i = 0; i < selectedIds.length; i++) {
    var scr = screens[selectedIds[i]];
    if (scr && scr.data && scr.data.processor) {
      combinedCablingConfig.processor = scr.data.processor;
      combinedCablingConfig.mx40ConnectionMode = scr.data.mx40ConnectionMode || 'direct';
      found = true;
      break;
    }
  }
  if (!found && typeof currentScreenId !== 'undefined' && typeof screens !== 'undefined') {
    var cur = screens[currentScreenId];
    if (cur && cur.data && cur.data.processor) {
      combinedCablingConfig.processor = cur.data.processor;
      combinedCablingConfig.mx40ConnectionMode = cur.data.mx40ConnectionMode || 'direct';
    }
  }
  var supportsDistBox = processorSupportsDistBox(
    combinedCablingConfig.processor,
    combinedCablingConfig.mx40ConnectionMode
  );
  var label = document.getElementById('combinedDistBoxOnWallLabel');
  if (label) {
    label.style.opacity = supportsDistBox ? '1' : '0.3';
    label.style.pointerEvents = supportsDistBox ? '' : 'none';
  }
  if (!supportsDistBox) {
    combinedCablingConfig.distBoxOnWall = false;
    updateCombinedDistBoxCheckUI(false);
  }
}

// ---- Input Handlers ----

function updateCombinedCablingFromInputs() {
  const get = (id) => document.getElementById(id);

  const procEl = get('combinedCablingProcessor');
  if (procEl) combinedCablingConfig.processor = procEl.value;

  const frEl = get('combinedCablingFrameRate');
  if (frEl) combinedCablingConfig.frameRate = parseFloat(frEl.value) || 60;

  const bdEl = get('combinedCablingBitDepth');
  if (bdEl) combinedCablingConfig.bitDepth = parseInt(bdEl.value) || 8;

  const vEl = get('combinedCablingVoltage');
  if (vEl) combinedCablingConfig.voltage = parseFloat(vEl.value) || 208;

  const brEl = get('combinedCablingBreaker');
  if (brEl) combinedCablingConfig.breaker = parseFloat(brEl.value) || 20;

  const w2f = get('combinedCablingWallToFloor');
  if (w2f) combinedCablingConfig.wallToFloor = parseFloat(w2f.value) || 0;

  const cp = get('combinedCablingCablePick');
  if (cp) combinedCablingConfig.cablePick = parseFloat(cp.value) || 0;

  const d2w = get('combinedCablingDistroToWall');
  if (d2w) combinedCablingConfig.distroToWall = parseFloat(d2w.value) || 0;

  const p2w = get('combinedCablingProcessorToWall');
  if (p2w) combinedCablingConfig.processorToWall = parseFloat(p2w.value) || 0;

  const s2p = get('combinedCablingServerToProc');
  if (s2p) combinedCablingConfig.serverToProcessor = parseFloat(s2p.value) || 0;

  saveCombinedCablingConfig();

  // Re-render if screens are selected
  if (typeof combinedSelectedScreens !== 'undefined' && combinedSelectedScreens.size > 0) {
    const dims = typeof combinedScreenDimensions !== 'undefined' ? combinedScreenDimensions : [];
    renderCombinedCableDiagram(Array.from(combinedSelectedScreens), dims);
  }
}

function setCombinedCableDropPosition(pos) {
  combinedCablingConfig.cableDropPosition = pos;
  ['behind', 'sr', 'sl'].forEach(p => {
    const btn = document.getElementById('combinedCableDrop' + p.charAt(0).toUpperCase() + p.slice(1) + 'Btn');
    if (btn) btn.classList.toggle('active', p === pos);
  });
  saveCombinedCablingConfig();
  if (typeof combinedSelectedScreens !== 'undefined' && combinedSelectedScreens.size > 0) {
    renderCombinedCableDiagram(Array.from(combinedSelectedScreens), typeof combinedScreenDimensions !== 'undefined' ? combinedScreenDimensions : []);
  }
}

function setCombinedPowerInPosition(pos) {
  combinedCablingConfig.powerInPosition = pos;
  const topBtn = document.getElementById('combinedPowerInTopBtn');
  const botBtn = document.getElementById('combinedPowerInBottomBtn');
  if (topBtn) topBtn.classList.toggle('active', pos === 'top');
  if (botBtn) botBtn.classList.toggle('active', pos === 'bottom');
  saveCombinedCablingConfig();
  if (typeof combinedSelectedScreens !== 'undefined' && combinedSelectedScreens.size > 0) {
    renderCombinedCableDiagram(Array.from(combinedSelectedScreens), typeof combinedScreenDimensions !== 'undefined' ? combinedScreenDimensions : []);
  }
}

function updateCombinedDistBoxCheckUI(enabled) {
  const check = document.getElementById('combinedDistBoxOnWallCheck');
  if (check) {
    check.textContent = enabled ? '✓' : '';
    check.style.background = enabled ? 'var(--primary)' : 'transparent';
    check.style.borderColor = enabled ? 'var(--primary)' : '#555';
  }
  const controls = document.getElementById('combinedDistBoxPositionControls');
  if (controls) controls.style.display = enabled ? 'block' : 'none';
}

function toggleCombinedDistBoxOnWall() {
  // Block toggling ON if processor doesn't support dist boxes
  if (!combinedCablingConfig.distBoxOnWall &&
      !processorSupportsDistBox(combinedCablingConfig.processor, combinedCablingConfig.mx40ConnectionMode)) {
    return;
  }
  combinedCablingConfig.distBoxOnWall = !combinedCablingConfig.distBoxOnWall;
  updateCombinedDistBoxCheckUI(combinedCablingConfig.distBoxOnWall);
  saveCombinedCablingConfig();
  if (typeof combinedSelectedScreens !== 'undefined' && combinedSelectedScreens.size > 0) {
    renderCombinedCableDiagram(Array.from(combinedSelectedScreens), typeof combinedScreenDimensions !== 'undefined' ? combinedScreenDimensions : []);
  }
}

function setCombinedDistBoxMainHorizPosition(pos) {
  combinedCablingConfig.distBoxMainHorizPosition = pos;
  ['sr', 'center', 'sl'].forEach(p => {
    const id = 'combinedDistBoxMainHoriz' + (p === 'sr' ? 'SR' : p === 'center' ? 'C' : 'SL') + 'Btn';
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', p === pos);
  });
  saveCombinedCablingConfig();
  if (typeof combinedSelectedScreens !== 'undefined' && combinedSelectedScreens.size > 0) {
    renderCombinedCableDiagram(Array.from(combinedSelectedScreens), typeof combinedScreenDimensions !== 'undefined' ? combinedScreenDimensions : []);
  }
}

function setCombinedDistBoxMainVertPosition(pos) {
  combinedCablingConfig.distBoxMainVertPosition = pos;
  const topBtn = document.getElementById('combinedDistBoxMainTopBtn');
  const botBtn = document.getElementById('combinedDistBoxMainBottomBtn');
  if (topBtn) topBtn.classList.toggle('active', pos === 'top');
  if (botBtn) botBtn.classList.toggle('active', pos === 'bottom');
  saveCombinedCablingConfig();
  if (typeof combinedSelectedScreens !== 'undefined' && combinedSelectedScreens.size > 0) {
    renderCombinedCableDiagram(Array.from(combinedSelectedScreens), typeof combinedScreenDimensions !== 'undefined' ? combinedScreenDimensions : []);
  }
}

function setCombinedDistBoxBackupHorizPosition(pos) {
  combinedCablingConfig.distBoxBackupHorizPosition = pos;
  ['sr', 'center', 'sl'].forEach(p => {
    const id = 'combinedDistBoxBackupHoriz' + (p === 'sr' ? 'SR' : p === 'center' ? 'C' : 'SL') + 'Btn';
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', p === pos);
  });
  saveCombinedCablingConfig();
  if (typeof combinedSelectedScreens !== 'undefined' && combinedSelectedScreens.size > 0) {
    renderCombinedCableDiagram(Array.from(combinedSelectedScreens), typeof combinedScreenDimensions !== 'undefined' ? combinedScreenDimensions : []);
  }
}

function setCombinedDistBoxBackupVertPosition(pos) {
  combinedCablingConfig.distBoxBackupVertPosition = pos;
  const topBtn = document.getElementById('combinedDistBoxBackupTopBtn');
  const botBtn = document.getElementById('combinedDistBoxBackupBottomBtn');
  if (topBtn) topBtn.classList.toggle('active', pos === 'top');
  if (botBtn) botBtn.classList.toggle('active', pos === 'bottom');
  saveCombinedCablingConfig();
  if (typeof combinedSelectedScreens !== 'undefined' && combinedSelectedScreens.size > 0) {
    renderCombinedCableDiagram(Array.from(combinedSelectedScreens), typeof combinedScreenDimensions !== 'undefined' ? combinedScreenDimensions : []);
  }
}

function toggleCombinedRedundancy() {
  combinedCablingConfig.redundancy = !combinedCablingConfig.redundancy;
  const btn = document.getElementById('combinedRedundancyBtn');
  if (btn) btn.classList.toggle('active', combinedCablingConfig.redundancy);
  saveCombinedCablingConfig();
  if (typeof combinedSelectedScreens !== 'undefined' && combinedSelectedScreens.size > 0) {
    renderCombinedCableDiagram(Array.from(combinedSelectedScreens), typeof combinedScreenDimensions !== 'undefined' ? combinedScreenDimensions : []);
  }
}

// Restore input UI from config (called when combined view activates)
function restoreCombinedCablingInputs() {
  const cfg = combinedCablingConfig;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

  set('combinedCablingProcessor', cfg.processor);
  set('combinedCablingFrameRate', cfg.frameRate);
  set('combinedCablingBitDepth', cfg.bitDepth);
  set('combinedCablingVoltage', cfg.voltage);
  set('combinedCablingBreaker', cfg.breaker);
  set('combinedCablingWallToFloor', cfg.wallToFloor);
  set('combinedCablingCablePick', cfg.cablePick);
  set('combinedCablingDistroToWall', cfg.distroToWall);
  set('combinedCablingProcessorToWall', cfg.processorToWall);
  set('combinedCablingServerToProc', cfg.serverToProcessor);

  // Toggle buttons
  setCombinedCableDropPosition(cfg.cableDropPosition);
  setCombinedPowerInPosition(cfg.powerInPosition);

  updateCombinedDistBoxCheckUI(cfg.distBoxOnWall);

  // Always sync dist box position buttons with config (even when dist box is off)
  // so UI matches config when user toggles dist box on
  setCombinedDistBoxMainHorizPosition(cfg.distBoxMainHorizPosition);
  setCombinedDistBoxMainVertPosition(cfg.distBoxMainVertPosition);
  setCombinedDistBoxBackupHorizPosition(cfg.distBoxBackupHorizPosition);
  setCombinedDistBoxBackupVertPosition(cfg.distBoxBackupVertPosition);

  const redundancyBtn = document.getElementById('combinedRedundancyBtn');
  if (redundancyBtn) redundancyBtn.classList.toggle('active', cfg.redundancy);

  // Re-apply processor-based dist box availability after restoring UI
  updateCombinedDistBoxAvailability();
}

// ---- Color Constants ----
const CC_POWER_COLOR = '#FF6B35';
const CC_DATA_COLOR = '#00CED1';
const CC_BACKUP_COLOR = '#FF69B4';
const CC_DISTBOX_COLOR = '#FFD700';
const CC_TRUNK_COLOR = '#FFD700';
const CC_TRUNK_BACKUP_COLOR = '#FFFFFF';
const CC_PICK_COLOR = '#7CFC00';
const CC_SERVER_COLOR = '#AB47BC';
const CC_PROC_COLOR = '#4ECDC4';
const CC_BG_COLOR = '#1a1a1a';
const CC_FLOOR_COLOR = '#555555';
const CC_PANEL_COLOR = '#555555';
const CC_DELETED_COLOR = '#333333';

// ---- BFS Grid Pathfinding (knockout avoidance) ----

function findNearestNonDeleted(col, row, pw, ph, deletedPanels) {
  if (!deletedPanels.has(col + ',' + row)) return { col: col, row: row };
  var visited = new Set();
  var queue = [{ col: col, row: row }];
  visited.add(col + ',' + row);
  var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  while (queue.length > 0) {
    var cur = queue.shift();
    for (var d = 0; d < dirs.length; d++) {
      var nc = cur.col + dirs[d][0];
      var nr = cur.row + dirs[d][1];
      if (nc < 0 || nc >= pw || nr < 0 || nr >= ph) continue;
      var key = nc + ',' + nr;
      if (visited.has(key)) continue;
      visited.add(key);
      if (!deletedPanels.has(key)) return { col: nc, row: nr };
      queue.push({ col: nc, row: nr });
    }
  }
  return { col: col, row: row };
}

function findCableGridPath(startCol, startRow, endCol, endRow, pw, ph, deletedPanels) {
  if (startCol === endCol && startRow === endRow) return [{ col: startCol, row: startRow }];
  if (!deletedPanels || deletedPanels.size === 0) return null;

  var visited = new Set();
  var parent = {};
  var queue = [{ col: startCol, row: startRow }];
  var startKey = startCol + ',' + startRow;
  visited.add(startKey);
  parent[startKey] = null;
  var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  var found = false;
  var endKey = endCol + ',' + endRow;

  while (queue.length > 0) {
    var cur = queue.shift();
    if (cur.col === endCol && cur.row === endRow) { found = true; break; }
    for (var d = 0; d < dirs.length; d++) {
      var nc = cur.col + dirs[d][0];
      var nr = cur.row + dirs[d][1];
      if (nc < 0 || nc >= pw || nr < 0 || nr >= ph) continue;
      var key = nc + ',' + nr;
      if (visited.has(key)) continue;
      if (deletedPanels.has(key) && key !== endKey) continue;
      visited.add(key);
      parent[key] = cur.col + ',' + cur.row;
      queue.push({ col: nc, row: nr });
    }
  }

  if (!found) return null;

  var fullPath = [];
  var k = endKey;
  while (k !== null) {
    var parts = k.split(',');
    fullPath.unshift({ col: parseInt(parts[0]), row: parseInt(parts[1]) });
    k = parent[k];
  }

  if (fullPath.length <= 2) return fullPath;

  var simplified = [fullPath[0]];
  for (var i = 1; i < fullPath.length - 1; i++) {
    var prev = fullPath[i - 1];
    var curr = fullPath[i];
    var next = fullPath[i + 1];
    if ((curr.col - prev.col) !== (next.col - curr.col) || (curr.row - prev.row) !== (next.row - curr.row)) {
      simplified.push(curr);
    }
  }
  simplified.push(fullPath[fullPath.length - 1]);
  return simplified;
}

// ---- Combined Cabling Calculation ----

function calculateCombinedCabling(selectedScreenIds, config) {
  const allPanels = typeof getAllPanels === 'function' ? getAllPanels() : (typeof panels !== 'undefined' ? panels : {});
  const allProcessors = typeof processors !== 'undefined' ? processors : {};
  const pr = allProcessors[config.processor];
  if (!pr) return null;

  const M_TO_FT = 3.28084;
  const screenResults = [];
  let totalPixels = 0;
  let totalDataLines = 0;

  for (const screenId of selectedScreenIds) {
    const screen = screens[screenId];
    if (!screen || !screen.data) continue;

    const data = screen.data;
    const panelType = data.panelType;
    const p = allPanels[panelType];
    if (!p) continue;

    const pw = data.panelsWide || 0;
    const ph = data.panelsHigh || 0;
    if (pw === 0 || ph === 0) continue;

    const panelWidthFt = p.width_m * M_TO_FT;
    const panelHeightFt = p.height_m * M_TO_FT;
    let wallHeightFt = ph * panelHeightFt;
    let wallWidthFt = pw * panelWidthFt;

    const hasCB5HalfRow = data.addCB5HalfRow && panelType === 'CB5_MKII';
    if (hasCB5HalfRow) {
      const halfP = allPanels['CB5_MKII_HALF'];
      if (halfP) wallHeightFt += halfP.height_m * M_TO_FT;
    }

    const effectivePh = hasCB5HalfRow ? ph + 1 : ph;
    const pixelsPerPanel = p.res_x * p.res_y;
    const deletedPanelsSet = data.deletedPanels || new Set();

    // Count active panels
    let activePanelCount = 0;
    for (let c = 0; c < pw; c++) {
      for (let r = 0; r < ph; r++) {
        if (!deletedPanelsSet.has(c + ',' + r)) activePanelCount++;
      }
    }
    if (hasCB5HalfRow) activePanelCount += pw;

    const screenPixels = activePanelCount * pixelsPerPanel;
    totalPixels += screenPixels;

    // Data lines for this screen
    const adjustedCapacity = calculateAdjustedPixelCapacity(pr, config.frameRate, config.bitDepth);
    const capacityBasedPPD = Math.min(Math.max(1, Math.floor(adjustedCapacity / pixelsPerPanel)), 500);
    const panelsPerDataLine = capacityBasedPPD;
    const dataLines = typeof calculateActualDataLines === 'function'
      ? calculateActualDataLines(pw, effectivePh, panelsPerDataLine, data.dataStartDir || 'top', deletedPanelsSet, data.customDataLineAssignments)
      : Math.ceil((pw * effectivePh) / panelsPerDataLine);

    totalDataLines += dataLines;

    // Entry/exit points
    const entryPoints = typeof getDataLineEntryPoints === 'function'
      ? getDataLineEntryPoints(pw, effectivePh, panelsPerDataLine, data.dataStartDir || 'top', deletedPanelsSet, data.customDataLineAssignments)
      : {};

    // Exit points (last panel per data line — for backup/redundancy cables)
    let exitPoints = {};
    if (typeof getDataLinePanelOrdering === 'function') {
      const ordering = getDataLinePanelOrdering(pw, effectivePh, panelsPerDataLine, data.dataStartDir || 'top', deletedPanelsSet, data.customDataLineAssignments);
      for (const dlIndex of Object.keys(ordering)) {
        const panelList = ordering[dlIndex];
        if (panelList.length > 0) exitPoints[dlIndex] = panelList[panelList.length - 1];
      }
    }

    // Power circuits for this screen
    const perPanelW = config.powerType === 'avg' ? (p.power_avg_w || p.power_max_w * 0.5) : p.power_max_w;
    const circuitCapacityW = config.voltage * config.breaker;
    const panelsPerCircuit = Math.max(1, Math.floor(circuitCapacityW / perPanelW));
    const columnsPerCircuit = Math.max(1, Math.floor(panelsPerCircuit / ph));
    const circuitsNeeded = Math.ceil(pw / columnsPerCircuit);
    const socaCount = Math.ceil(circuitsNeeded / 6);

    screenResults.push({
      screenId,
      screenName: screen.name || screenId,
      screenColor: screen.color || '#888',
      panelType, pw, ph, effectivePh, hasCB5HalfRow,
      panelWidthFt, panelHeightFt,
      wallWidthFt: Math.round(wallWidthFt * 10) / 10,
      wallHeightFt: Math.round(wallHeightFt * 10) / 10,
      activePanelCount, screenPixels,
      dataLines, entryPoints, exitPoints, panelsPerDataLine,
      circuitsNeeded, socaCount, columnsPerCircuit,
      deletedPanelsSet
    });
  }

  if (screenResults.length === 0) return null;

  // Aggregated processor/distribution calculation
  const redundancyMultiplier = config.redundancy ? 2 : 1;
  const portsNeeded = totalDataLines;
  const portsNeededFinal = portsNeeded * redundancyMultiplier;

  let processorCount = 1;
  let distributionBoxCount = 0;
  let distributionBoxName = '';

  if (config.processor === 'Brompton_SX40' && portsNeeded > 0) {
    const baseDistCount = Math.ceil(portsNeeded / 10);
    distributionBoxCount = config.redundancy ? baseDistCount * 2 : baseDistCount;
    distributionBoxName = 'Brompton XD';
    processorCount = Math.ceil(totalPixels / pr.total_pixels);
  } else if (config.processor === 'NovaStar_MX40_Pro' && portsNeeded > 0) {
    if (config.mx40ConnectionMode === 'direct') {
      const procByPorts = Math.ceil(portsNeededFinal / 20);
      const procByPixels = Math.ceil(totalPixels / 9000000);
      processorCount = Math.max(procByPorts, procByPixels);
    } else {
      const portsPerCVT = 10;
      distributionBoxCount = Math.ceil(portsNeededFinal / portsPerCVT);
      distributionBoxName = 'NovaStar CVT-10 Pro';
      const procByPixels = Math.ceil(totalPixels / 9000000);
      const procByCVTs = Math.ceil(distributionBoxCount / 4);
      processorCount = Math.max(procByPixels, procByCVTs);
    }
  } else {
    processorCount = Math.max(1, Math.ceil(totalPixels / (pr.total_pixels || 9000000)));
  }

  return {
    screens: screenResults,
    shared: {
      processorCount, distributionBoxCount, distributionBoxName,
      totalDataLines, totalPixels, portsNeeded, portsNeededFinal
    },
    config
  };
}

// ---- Main Renderer ----

function renderCombinedCableDiagram(selectedScreenIds, screenDimensions) {
  const canvas = document.getElementById('combinedCableDiagramCanvas');
  const container = document.getElementById('combinedCableDiagramCanvasWrapper');
  if (!canvas || !container) return;

  // Empty state — matches other combined canvases (100x100, no CSS stretch)
  if (!selectedScreenIds || selectedScreenIds.length === 0 || !screenDimensions || screenDimensions.length === 0) {
    container.classList.remove('has-diagram');
    canvas.width = 100;
    canvas.height = 100;
    canvas.style.width = '';
    canvas.style.height = '';
    var c = canvas.getContext('2d');
    c.fillStyle = CC_BG_COLOR;
    c.fillRect(0, 0, 100, 100);
    c.fillStyle = '#888';
    c.font = '10px Arial';
    c.textAlign = 'center';
    c.fillText('No screens', 50, 45);
    c.fillText('selected', 50, 58);
    return;
  }

  container.classList.add('has-diagram');
  updateCombinedDistBoxAvailability();

  const cfg = combinedCablingConfig;
  const calcData = calculateCombinedCabling(selectedScreenIds, cfg);
  if (!calcData || calcData.screens.length === 0) return;

  const allPanels = typeof getAllPanels === 'function' ? getAllPanels() : {};
  const M_TO_FT = 3.28084;
  // Derive redundancy from any selected screen's setting (no separate combined toggle)
  var redundancy = cfg.redundancy;
  if (!redundancy) {
    for (var si = 0; si < selectedScreenIds.length; si++) {
      var scr = screens[selectedScreenIds[si]];
      if (scr && scr.data && scr.data.redundancy) { redundancy = true; break; }
    }
  }
  const distBoxOnWall = cfg.distBoxOnWall;
  const dropPos = cfg.cableDropPosition;
  const powerInPos = cfg.powerInPosition;

  // ---- Recover panelSize and compute feet-to-pixel conversion ----
  const firstDim = screenDimensions[0];
  const panelSize = firstDim.width / firstDim.pw;
  const firstPanel = allPanels[firstDim.data.panelType || 'CB5_MKII'];
  const panelWidthFt = firstPanel ? firstPanel.width_m * M_TO_FT : 1.64;
  const ftToPx = panelSize / panelWidthFt; // pixels per foot (in panelSize units)

  // ---- Build screen positions matching standard layout ----
  const screenPos = [];
  screenDimensions.forEach(function(dim) {
    var customPos = (typeof combinedScreenPositions !== 'undefined' ? combinedScreenPositions[dim.screenId] : null) || { x: 0, y: 0 };
    var calcScreen = calcData.screens.find(function(s) { return s.screenId === dim.screenId; });
    if (!calcScreen) return;

    screenPos.push({
      x: dim.x + customPos.x,
      y: customPos.y,
      width: dim.width,
      height: dim.height,
      pw: dim.pw,
      ph: dim.ph,
      data: dim.data,
      screen: dim.screen,
      screenId: dim.screenId,
      calc: calcScreen
    });
  });

  if (screenPos.length === 0) return;

  // ---- Bounding box of ALL screens (the "unified wall") ----
  var bbL = Infinity, bbR = -Infinity, bbT = Infinity, bbB = -Infinity;
  screenPos.forEach(function(sp) {
    bbL = Math.min(bbL, sp.x);
    bbR = Math.max(bbR, sp.x + sp.width);
    bbT = Math.min(bbT, sp.y);
    bbB = Math.max(bbB, sp.y + sp.height);
  });
  var bbW = bbR - bbL;
  var bbH = bbB - bbT;

  // ---- Canvas Sizing ----
  var containerWidth = container.clientWidth || 400;
  var canvasW = containerWidth;
  var isSmall = canvasW < 500;
  var rightMarginExtra = (dropPos === 'sl') ? 15 : 0;
  var MARGIN = { top: isSmall ? 30 : 50, bottom: isSmall ? 25 : 40, left: isSmall ? 14 : 20, right: (isSmall ? 25 : 30) + rightMarginExtra };
  var BOX_W = isSmall ? 38 : 48, BOX_H = isSmall ? 18 : 24;

  // ---- Scene layout in feet (matching per-screen cable diagram pattern) ----
  var wallWidthFt = bbW / ftToPx;
  var wallHeightFt = bbH / ftToPx;

  // Scene bounds in feet — equipment extends left of drop point
  // Server is pinned to far-left (MARGIN.left) and NOT included in scale calculation
  // (matching per-screen cable-diagram.js pattern)
  var maxLeftFt = Math.max(cfg.distroToWall, cfg.processorToWall) + 4;
  var totalVertFt = wallHeightFt + cfg.wallToFloor + 3;

  // Right padding in feet — extra room for SL drop/pick
  var rightPadFt = 4;
  if (dropPos === 'sl') rightPadFt += (cfg.cablePick > 0 ? 3 : 1);
  var sceneWidthFt = maxLeftFt + wallWidthFt + rightPadFt;

  // Scale to fit scene in drawable width, capped at 80 px/ft
  var drawableW = canvasW - MARGIN.left - MARGIN.right;
  var scale = Math.min(drawableW / sceneWidthFt, 80);

  // Pick vertical space (only for "behind" position)
  var PICK_GAP = isSmall ? 30 : 45;
  var PICK_RADIUS = 12;
  var pickBehind = dropPos === 'behind';
  var pickVertSpace = (cfg.cablePick > 0 && pickBehind) ? PICK_GAP + PICK_RADIUS * 2 + 10 : 0;

  // Canvas height — reduced below-floor since equipment is above floor
  var belowFloorPx = isSmall ? 55 : 65;
  var dpr = window.devicePixelRatio || 1;
  var legendExtra = isSmall ? 20 : 0;
  var canvasH = MARGIN.top + totalVertFt * scale + pickVertSpace + belowFloorPx + MARGIN.bottom + legendExtra;

  canvas.width = canvasW * dpr;
  canvas.height = canvasH * dpr;
  canvas.style.width = canvasW + 'px';
  canvas.style.height = canvasH + 'px';

  var ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = CC_BG_COLOR;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // ---- Wall positioning (centered in scene) ----
  var sceneWidthPx = sceneWidthFt * scale;
  var sceneOffsetX = MARGIN.left + (drawableW - sceneWidthPx) / 2;
  var wallLeftX = sceneOffsetX + maxLeftFt * scale;
  var wallRightX = wallLeftX + wallWidthFt * scale;
  var wallTopY = MARGIN.top + pickVertSpace;
  var wallBottomY = wallTopY + wallHeightFt * scale;
  var floorY = wallBottomY + cfg.wallToFloor * scale;

  // Convert panelSize-pixel coords to canvas coords
  var pxToCanvas = scale / ftToPx;
  var toX = function(px) { return wallLeftX + (px - bbL) * pxToCanvas; };
  var toY = function(py) { return wallTopY + (py - bbT) * pxToCanvas; };

  // ---- Unified drop point (ONE for the whole bounding box) ----
  var dropX;
  var SIDE_DROP_PAD = 20;
  if (dropPos === 'behind') dropX = toX(bbL + bbW / 2);
  else if (dropPos === 'sr') dropX = toX(bbL) - SIDE_DROP_PAD;
  else dropX = toX(bbR) + SIDE_DROP_PAD;

  // ---- Draw Floor Line ----
  ctx.strokeStyle = CC_FLOOR_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(MARGIN.left, floorY);
  ctx.lineTo(canvasW - MARGIN.right, floorY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#666';
  ctx.font = '9px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('FLOOR', MARGIN.left + 4, floorY + 12);

  // ---- Draw Panel Grids (matching standard layout positions) ----
  screenPos.forEach(function(sp) {
    var screenLeft = toX(sp.x);
    var screenTop = toY(sp.y);
    var screenW = sp.width * pxToCanvas;
    var screenH = sp.height * pxToCanvas;

    var panelType = sp.data.panelType || 'CB5_MKII';
    var heightRatio = typeof getPanelHeightRatio === 'function' ? getPanelHeightRatio(panelType) : 1;
    var hasCB5HalfRow = sp.data.addCB5HalfRow && panelType === 'CB5_MKII';
    var originalPh = hasCB5HalfRow ? sp.ph - 1 : sp.ph;

    var pxW = panelSize * pxToCanvas;
    var pxH = panelSize * heightRatio * pxToCanvas;
    var halfPxH = hasCB5HalfRow ? panelSize * pxToCanvas : 0;

    var deletedPanels = sp.calc.deletedPanelsSet || new Set();

    // Draw full panels
    for (var c = 0; c < sp.pw; c++) {
      for (var r = 0; r < originalPh; r++) {
        var x = screenLeft + c * pxW;
        var y = screenTop + r * pxH;
        var key = c + ',' + r;
        var isDeleted = deletedPanels.has(key);

        if (isDeleted) {
          ctx.strokeStyle = CC_DELETED_COLOR;
          ctx.lineWidth = 0.5;
          ctx.setLineDash([2, 2]);
          ctx.strokeRect(x, y, pxW, pxH);
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = '#2a2a2a';
          ctx.fillRect(x, y, pxW, pxH);
          ctx.strokeStyle = CC_PANEL_COLOR;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, pxW, pxH);
        }
      }
    }

    // CB5 half row
    if (hasCB5HalfRow && halfPxH > 0) {
      for (var c2 = 0; c2 < sp.pw; c2++) {
        var hx = screenLeft + c2 * pxW;
        var hy = screenTop + originalPh * pxH;
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(hx, hy, pxW, halfPxH);
        ctx.strokeStyle = CC_PANEL_COLOR;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(hx, hy, pxW, halfPxH);
      }
    }

    // Screen border
    var screenColor = sp.screen.color || '#888';
    ctx.strokeStyle = screenColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(screenLeft, screenTop, screenW, screenH);

    // Screen label (name only, no per-screen dimensions)
    ctx.fillStyle = screenColor;
    ctx.font = 'bold ' + (isSmall ? '9' : '11') + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(sp.screen.name || sp.screenId, screenLeft + screenW / 2, screenTop - 14);
  });

  // ---- Equipment on Floor (ONE set for unified wall) ----
  // Equipment positions use feet-based scale (matching per-screen diagram)
  var distroCanvasX = dropX - cfg.distroToWall * scale;
  var procCanvasX = dropX - cfg.processorToWall * scale;
  var equipY = floorY - BOX_H; // boxes sit ON TOP of floor line

  // Offset distro box if it overlaps with processor box
  var distroEquipY = equipY;
  var boxOverlap = Math.abs((distroCanvasX - BOX_W / 2) - (procCanvasX - BOX_W / 2)) < BOX_W;
  if (boxOverlap) {
    distroEquipY = equipY - BOX_H - 4; // stack distro above proc
  }

  // Server: far-left, vertically centered between wall top and floor
  var serverCanvasX = MARGIN.left;
  var serverBoxCenterY = (wallTopY + floorY) / 2;
  var serverBoxY = serverBoxCenterY - BOX_H / 2;

  // Use abbreviated labels on mobile
  var distLabel = isSmall ? 'DIST' : 'DISTRO';
  var procLabel = 'PROC';
  var srvLabel = isSmall ? 'SRV' : 'SERVER';

  if (typeof drawCableEquipmentBox === 'function') {
    drawCableEquipmentBox(ctx, distroCanvasX - BOX_W / 2, distroEquipY, BOX_W, BOX_H, distLabel, CC_POWER_COLOR);
    drawCableEquipmentBox(ctx, procCanvasX - BOX_W / 2, equipY, BOX_W, BOX_H, procLabel, CC_PROC_COLOR);
    drawCableEquipmentBox(ctx, serverCanvasX, serverBoxY, BOX_W, BOX_H, srvLabel, CC_SERVER_COLOR);
  }

  // Server-to-processor cable (matching per-screen: right edge → down → horizontal to proc)
  if (cfg.serverToProcessor > 0) {
    ctx.strokeStyle = CC_SERVER_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(serverCanvasX + BOX_W, serverBoxCenterY);
    ctx.lineTo(serverCanvasX + BOX_W, equipY + BOX_H / 2);
    ctx.lineTo(procCanvasX - BOX_W / 2, equipY + BOX_H / 2);
    ctx.stroke();

    // Server distance label on vertical segment
    var srvLabelText = cfg.serverToProcessor + "'";
    var srvLabelX = serverCanvasX + BOX_W + 4;
    var srvLabelMidY = (serverBoxCenterY + equipY + BOX_H / 2) / 2;
    ctx.font = 'bold ' + (isSmall ? 7 : 10) + 'px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var srvTw = ctx.measureText(srvLabelText).width + 6;
    ctx.fillStyle = CC_BG_COLOR;
    ctx.fillRect(srvLabelX, srvLabelMidY - 7, srvTw, 14);
    ctx.fillStyle = CC_SERVER_COLOR;
    ctx.fillText(srvLabelText, srvLabelX + 2, srvLabelMidY);
    ctx.textBaseline = 'alphabetic';
  }

  // ---- Cable Pick (ONE for unified wall) ----
  var pickCX, pickCY;
  if (dropPos === 'behind') {
    // Above wall center
    pickCX = dropX;
    pickCY = toY(bbT) - PICK_GAP - PICK_RADIUS;
  } else if (dropPos === 'sr') {
    // To the left of wall at wall-top height
    pickCX = toX(bbL) - PICK_GAP - PICK_RADIUS;
    pickCY = toY(bbT) + PICK_RADIUS;
  } else {
    // To the right of wall at wall-top height
    pickCX = toX(bbR) + PICK_GAP + PICK_RADIUS;
    pickCY = toY(bbT) + PICK_RADIUS;
  }

  // ---- Cable Offset Constants (matching per-screen diagram separation) ----
  var POWER_DROP_OFFSET = -3;      // power cables offset left of drop X
  var DATA_OFFSET = 6;             // primary data offset right of drop X
  var BACKUP_OFFSET = 16;          // backup data offset further right
  var DATA_WALL_OFFSET = 10;       // data runs 10px outside wall edge for visual separation
  var POWER_FLOOR_Y = floorY - 5;  // power above floor
  var DATA_FLOOR_Y = floorY + 5;   // data below floor
  var BACKUP_FLOOR_Y = floorY + 12; // backup further below

  // ---- Unified Power (SOCA) Cable Routing ----
  // All circuits from all screens route to ONE drop → floor → distro
  screenPos.forEach(function(sp) {
    var calc = sp.calc;
    if (!calc) return;

    var screenLeft = toX(sp.x);
    var screenTop = toY(sp.y);
    var screenBottom = toY(sp.y + sp.height);
    var pxW = panelSize * pxToCanvas;

    for (var si = 0; si < calc.socaCount; si++) {
      var firstCircuit = si * 6;
      var lastCircuit = Math.min(firstCircuit + 5, calc.circuitsNeeded - 1);
      var firstCol = firstCircuit * calc.columnsPerCircuit;
      var lastCol = Math.min((lastCircuit + 1) * calc.columnsPerCircuit - 1, calc.pw - 1);
      var landingCenterX = screenLeft + ((firstCol + lastCol + 1) / 2) * pxW;

      ctx.strokeStyle = CC_POWER_COLOR;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();

      if (powerInPos === 'bottom') {
        var powerWallBottomY = screenBottom + 14;
        ctx.moveTo(landingCenterX + POWER_DROP_OFFSET, screenBottom);
        ctx.lineTo(landingCenterX + POWER_DROP_OFFSET, powerWallBottomY);
        ctx.lineTo(dropX + POWER_DROP_OFFSET, powerWallBottomY);
        if (cfg.cablePick > 0) {
          if (dropPos === 'behind') {
            ctx.lineTo(pickCX + POWER_DROP_OFFSET, pickCY);
            ctx.lineTo(pickCX + POWER_DROP_OFFSET, POWER_FLOOR_Y);
          } else {
            ctx.lineTo(pickCX + POWER_DROP_OFFSET, pickCY);
            ctx.lineTo(pickCX + POWER_DROP_OFFSET, POWER_FLOOR_Y);
          }
        } else {
          ctx.lineTo(dropX + POWER_DROP_OFFSET, POWER_FLOOR_Y);
        }
        ctx.lineTo(distroCanvasX, POWER_FLOOR_Y);
        ctx.lineTo(distroCanvasX, distroEquipY + BOX_H);
      } else {
        var powerWallTopY = screenTop - 14;
        ctx.moveTo(landingCenterX + POWER_DROP_OFFSET, screenTop);
        ctx.lineTo(landingCenterX + POWER_DROP_OFFSET, powerWallTopY);
        ctx.lineTo(dropX + POWER_DROP_OFFSET, powerWallTopY);
        if (cfg.cablePick > 0) {
          if (dropPos === 'behind') {
            ctx.lineTo(pickCX + POWER_DROP_OFFSET, pickCY);
            ctx.lineTo(pickCX + POWER_DROP_OFFSET, POWER_FLOOR_Y);
          } else {
            ctx.lineTo(pickCX + POWER_DROP_OFFSET, pickCY);
            ctx.lineTo(pickCX + POWER_DROP_OFFSET, POWER_FLOOR_Y);
          }
        } else {
          ctx.lineTo(dropX + POWER_DROP_OFFSET, POWER_FLOOR_Y);
        }
        ctx.lineTo(distroCanvasX, POWER_FLOOR_Y);
        ctx.lineTo(distroCanvasX, distroEquipY + BOX_H);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  });

  // ---- Unified Data Cable Routing ----
  // Collect ALL entry and exit points from ALL screens
  var hasDistBox = calcData.shared.distributionBoxCount > 0;

  var allEntryPoints = [];
  var allExitPoints = [];
  screenPos.forEach(function(sp) {
    var calc = sp.calc;
    if (!calc) return;

    var screenLeft = toX(sp.x);
    var screenTop = toY(sp.y);
    var screenBottom = toY(sp.y + sp.height);
    var panelType = sp.data.panelType || 'CB5_MKII';
    var heightRatio = typeof getPanelHeightRatio === 'function' ? getPanelHeightRatio(panelType) : 1;
    var pxW = panelSize * pxToCanvas;
    var pxH = panelSize * heightRatio * pxToCanvas;

    var dataFlip = sp.data.dataFlip || false;
    var entryPoints = dataFlip ? (calc.exitPoints || {}) : (calc.entryPoints || {});
    var exitPts = dataFlip ? (calc.entryPoints || {}) : (calc.exitPoints || {});

    for (var dl = 0; dl < calc.dataLines; dl++) {
      var pointData = {
        screenLeft: screenLeft,
        screenTop: screenTop,
        screenBottom: screenBottom,
        pxW: pxW,
        pxH: pxH,
        pw: sp.pw,
        ph: calc.effectivePh,
        deletedPanels: calc.deletedPanelsSet || new Set()
      };

      var entry = entryPoints[dl];
      if (entry) {
        allEntryPoints.push(Object.assign({
          cx: screenLeft + (entry.col + 0.5) * pxW,
          cy: screenTop + (entry.row + 0.5) * pxH,
          col: entry.col,
          row: entry.row
        }, pointData));
      }

      var exit = exitPts[dl];
      if (exit) {
        allExitPoints.push(Object.assign({
          cx: screenLeft + (exit.col + 0.5) * pxW,
          cy: screenTop + (exit.row + 0.5) * pxH,
          col: exit.col,
          row: exit.row
        }, pointData));
      }
    }
  });

  // Bounding box canvas coords (for dist box positioning)
  var bbCanvasL = toX(bbL);
  var bbCanvasR = toX(bbR);
  var bbCanvasT = toY(bbT);
  var bbCanvasB = toY(bbB);
  var bbCanvasW = bbCanvasR - bbCanvasL;

  // Wall edge Y constants (for trunk routing along wall edges)
  var DATA_WALL_TOP_Y = bbCanvasT - 4;
  var DATA_WALL_BOTTOM_Y = bbCanvasB + 4;

  if (distBoxOnWall && hasDistBox) {
    // ---- Dist box on wall — positioned relative to unified bounding box ----
    var mainFracX;
    if (cfg.distBoxMainHorizPosition === 'sr') mainFracX = 0.15;
    else if (cfg.distBoxMainHorizPosition === 'sl') mainFracX = 0.85;
    else mainFracX = 0.5;

    var mainDistBoxX = bbCanvasL + bbCanvasW * mainFracX;
    var mainDistBoxY = cfg.distBoxMainVertPosition === 'bottom' ? bbCanvasB - BOX_H - 4 : bbCanvasT + 4;
    var mainDistBoxIsTop = cfg.distBoxMainVertPosition !== 'bottom';
    var mainDistBoxLeftX = mainDistBoxX - 20;
    var mainDistBoxRightX = mainDistBoxX + 20;

    // Backup dist box position
    var backupFracX;
    if (cfg.distBoxBackupHorizPosition === 'sr') backupFracX = 0.15;
    else if (cfg.distBoxBackupHorizPosition === 'sl') backupFracX = 0.85;
    else backupFracX = 0.5;
    var backupDistBoxX = bbCanvasL + bbCanvasW * backupFracX;
    var backupDistBoxY = cfg.distBoxBackupVertPosition === 'bottom' ? bbCanvasB - BOX_H - 4 : bbCanvasT + 4;
    var backupDistBoxIsTop = cfg.distBoxBackupVertPosition !== 'bottom';
    var backupDistBoxLeftX = backupDistBoxX - 20;
    var backupDistBoxRightX = backupDistBoxX + 20;

    // Detect same position — draw single box or two separate boxes
    var sameDistBoxPos = (cfg.distBoxMainHorizPosition === cfg.distBoxBackupHorizPosition &&
                          cfg.distBoxMainVertPosition === cfg.distBoxBackupVertPosition);
    var twoDistBoxes = redundancy && !sameDistBoxPos;

    // Fan Y offsets (±3px when sharing same box position)
    var fanPrimaryY = twoDistBoxes ? mainDistBoxY + 9 : mainDistBoxY + 9 - 3;
    var fanBackupY = twoDistBoxes ? backupDistBoxY + 9 : mainDistBoxY + 9 + 3;

    // Draw dist box(es)
    if (typeof drawCableEquipmentBox === 'function') {
      if (twoDistBoxes) {
        drawCableEquipmentBox(ctx, mainDistBoxLeftX, mainDistBoxY, 40, 18, 'MAIN', CC_DISTBOX_COLOR);
        drawCableEquipmentBox(ctx, backupDistBoxLeftX, backupDistBoxY, 40, 18, 'BACKUP', CC_TRUNK_BACKUP_COLOR);
      } else {
        drawCableEquipmentBox(ctx, mainDistBoxLeftX, mainDistBoxY, 40, 18, 'XD', CC_DISTBOX_COLOR);
      }
    }

    // Primary fan: dist box edge → horizontal at fanPrimaryY → vertical into panel
    allEntryPoints.forEach(function(ep) {
      var fanStartX = ep.cx < mainDistBoxX ? mainDistBoxLeftX : mainDistBoxRightX;
      ctx.strokeStyle = CC_DATA_COLOR;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(fanStartX, fanPrimaryY);
      ctx.lineTo(ep.cx - 2, fanPrimaryY);
      ctx.lineTo(ep.cx - 2, ep.cy);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });

    // Primary trunk: dist box → wall edge → horizontal along wall edge → drop → pick → floor → proc → box
    ctx.strokeStyle = CC_TRUNK_COLOR;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (mainDistBoxIsTop) {
      ctx.moveTo(mainDistBoxX + DATA_OFFSET, mainDistBoxY);
    } else {
      ctx.moveTo(mainDistBoxX + DATA_OFFSET, mainDistBoxY + 18);
    }
    ctx.lineTo(mainDistBoxX + DATA_OFFSET, DATA_WALL_TOP_Y);
    ctx.lineTo(dropX + DATA_OFFSET, DATA_WALL_TOP_Y);
    if (cfg.cablePick > 0) {
      if (dropPos === 'behind') {
        ctx.lineTo(pickCX + DATA_OFFSET, pickCY);
        ctx.lineTo(pickCX + DATA_OFFSET, DATA_FLOOR_Y);
      } else {
        ctx.lineTo(pickCX + DATA_OFFSET, pickCY);
        ctx.lineTo(pickCX + DATA_OFFSET, DATA_FLOOR_Y);
      }
    } else {
      ctx.lineTo(dropX + DATA_OFFSET, DATA_FLOOR_Y);
    }
    ctx.lineTo(procCanvasX, DATA_FLOOR_Y);
    ctx.lineTo(procCanvasX, equipY + BOX_H);
    ctx.stroke();

    // Backup dist box + trunk if redundancy
    if (redundancy) {
      // Backup fan: dist box edge → horizontal at fanBackupY → vertical into panel
      allExitPoints.forEach(function(ep) {
        var bFanStartX = ep.cx < backupDistBoxX ? backupDistBoxLeftX : backupDistBoxRightX;
        ctx.strokeStyle = CC_BACKUP_COLOR;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(bFanStartX, fanBackupY);
        ctx.lineTo(ep.cx + 2, fanBackupY);
        ctx.lineTo(ep.cx + 2, ep.cy);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });

      // Backup trunk: dist box → wall edge → horizontal → drop → pick → floor → proc → box
      ctx.strokeStyle = CC_TRUNK_BACKUP_COLOR;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      if (backupDistBoxIsTop) {
        ctx.moveTo(backupDistBoxX + BACKUP_OFFSET, backupDistBoxY);
      } else {
        ctx.moveTo(backupDistBoxX + BACKUP_OFFSET, backupDistBoxY + 18);
      }
      ctx.lineTo(backupDistBoxX + BACKUP_OFFSET, DATA_WALL_TOP_Y);
      ctx.lineTo(dropX + BACKUP_OFFSET, DATA_WALL_TOP_Y);
      if (cfg.cablePick > 0) {
        if (dropPos === 'behind') {
          ctx.lineTo(pickCX + BACKUP_OFFSET, pickCY);
          ctx.lineTo(pickCX + BACKUP_OFFSET, BACKUP_FLOOR_Y);
        } else {
          ctx.lineTo(pickCX + BACKUP_OFFSET, pickCY);
          ctx.lineTo(pickCX + BACKUP_OFFSET, BACKUP_FLOOR_Y);
        }
      } else {
        ctx.lineTo(dropX + BACKUP_OFFSET, BACKUP_FLOOR_Y);
      }
      ctx.lineTo(procCanvasX + 8, BACKUP_FLOOR_Y);
      ctx.lineTo(procCanvasX + 8, equipY + BOX_H);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  } else {
    // ---- No dist box: fan segments → wall edge → drop, then bundle → processor ----

    // Helper: draw fan segments from entry/exit points to wall edge → drop
    function drawFanSegments(points, color, lineWidth, alpha, dropOffsetX, wallOffset) {
      points.forEach(function(ep) {
        var isBottom = ep.row >= ep.ph / 2;
        // wallEdgeY is OUTSIDE the wall: top entries go above screenTop, bottom below screenBottom
        var wallEdgeY = isBottom
          ? (ep.screenTop + ep.ph * ep.pxH + wallOffset)
          : (ep.screenTop - wallOffset);

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = alpha;
        ctx.beginPath();

        if (ep.deletedPanels.size > 0) {
          var targetRow = isBottom ? ep.ph - 1 : 0;
          var targetCol = ep.col;
          if (ep.deletedPanels.has(targetCol + ',' + targetRow)) {
            var foundInEdgeRow = false;
            for (var dist = 1; dist < ep.pw; dist++) {
              if (targetCol - dist >= 0 && !ep.deletedPanels.has((targetCol - dist) + ',' + targetRow)) {
                targetCol = targetCol - dist; foundInEdgeRow = true; break;
              }
              if (targetCol + dist < ep.pw && !ep.deletedPanels.has((targetCol + dist) + ',' + targetRow)) {
                targetCol = targetCol + dist; foundInEdgeRow = true; break;
              }
            }
            if (!foundInEdgeRow) {
              var nearest = findNearestNonDeleted(ep.col, targetRow, ep.pw, ep.ph, ep.deletedPanels);
              targetCol = nearest.col; targetRow = nearest.row;
            }
          }
          var path = findCableGridPath(ep.col, ep.row, targetCol, targetRow, ep.pw, ep.ph, ep.deletedPanels);
          if (path && path.length > 0) {
            ctx.moveTo(ep.screenLeft + (path[0].col + 0.5) * ep.pxW, ep.screenTop + (path[0].row + 0.5) * ep.pxH);
            for (var pi = 1; pi < path.length; pi++) {
              ctx.lineTo(ep.screenLeft + (path[pi].col + 0.5) * ep.pxW, ep.screenTop + (path[pi].row + 0.5) * ep.pxH);
            }
            var lastCell = path[path.length - 1];
            var lastCX = ep.screenLeft + (lastCell.col + 0.5) * ep.pxW;
            ctx.lineTo(lastCX, wallEdgeY);
            ctx.lineTo(dropX + dropOffsetX, wallEdgeY);
          } else {
            ctx.moveTo(ep.cx, ep.cy);
            ctx.lineTo(ep.cx, wallEdgeY);
            ctx.lineTo(dropX + dropOffsetX, wallEdgeY);
          }
        } else {
          ctx.moveTo(ep.cx, ep.cy);
          ctx.lineTo(ep.cx, wallEdgeY);
          ctx.lineTo(dropX + dropOffsetX, wallEdgeY);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });
    }

    // Determine which edges have entries/exits
    var hasTopEntry = false, hasBottomEntry = false;
    var hasTopExit = false, hasBottomExit = false;
    allEntryPoints.forEach(function(ep) {
      if (ep.row >= ep.ph / 2) hasBottomEntry = true;
      else hasTopEntry = true;
    });
    if (redundancy) {
      allExitPoints.forEach(function(ep) {
        if (ep.row >= ep.ph / 2) hasBottomExit = true;
        else hasTopExit = true;
      });
    }

    // --- Helper: draw bundle cable from wall edge → pick (if any) → floor → equipment ---
    function drawBundleWithPick(startX, startY, offsetX, floorTargetY, equipX, lineWidth) {
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      if (cfg.cablePick > 0) {
        if (dropPos === 'behind') {
          ctx.lineTo(pickCX + offsetX, pickCY);
          ctx.lineTo(pickCX + offsetX, floorTargetY);
        } else {
          ctx.lineTo(pickCX + offsetX, pickCY);
          ctx.lineTo(pickCX + offsetX, floorTargetY);
        }
      } else {
        ctx.lineTo(startX, floorTargetY);
      }
      ctx.lineTo(equipX, floorTargetY);
      ctx.lineTo(equipX, equipY + BOX_H); // connect into equipment box
      ctx.stroke();
    }

    // --- Primary bundle cable (cyan): drop → pick → floor → processor ---
    if (allEntryPoints.length > 0) {
      ctx.strokeStyle = CC_DATA_COLOR;
      if (hasTopEntry) {
        drawBundleWithPick(dropX + DATA_OFFSET, bbCanvasT - DATA_WALL_OFFSET, DATA_OFFSET, DATA_FLOOR_Y, procCanvasX, 2.5);
      }
      if (hasBottomEntry) {
        var dataVertX = cfg.cablePick > 0 ? pickCX + DATA_OFFSET : dropX + DATA_OFFSET;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(dropX + DATA_OFFSET, bbCanvasB + DATA_WALL_OFFSET);
        ctx.lineTo(dataVertX, bbCanvasB + DATA_WALL_OFFSET);
        if (!hasTopEntry) {
          ctx.lineTo(dataVertX, DATA_FLOOR_Y);
          ctx.lineTo(procCanvasX, DATA_FLOOR_Y);
          ctx.lineTo(procCanvasX, equipY + BOX_H);
        }
        ctx.stroke();
      }
    }

    // --- Backup bundle cable (pink): drop → pick → floor → processor ---
    if (redundancy && allExitPoints.length > 0) {
      ctx.strokeStyle = CC_BACKUP_COLOR;
      if (hasTopExit) {
        drawBundleWithPick(dropX + BACKUP_OFFSET, bbCanvasT - DATA_WALL_OFFSET, BACKUP_OFFSET, BACKUP_FLOOR_Y, procCanvasX + 8, 2);
      }
      if (hasBottomExit) {
        var backupVertX = cfg.cablePick > 0 ? pickCX + BACKUP_OFFSET : dropX + BACKUP_OFFSET;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dropX + BACKUP_OFFSET, bbCanvasB + DATA_WALL_OFFSET);
        ctx.lineTo(backupVertX, bbCanvasB + DATA_WALL_OFFSET);
        if (!hasTopExit) {
          ctx.lineTo(backupVertX, BACKUP_FLOOR_Y);
          ctx.lineTo(procCanvasX + 8, BACKUP_FLOOR_Y);
          ctx.lineTo(procCanvasX + 8, equipY + BOX_H);
        }
        ctx.stroke();
      }
    }

    // --- Primary fan segments (cyan): entry panel → screen edge → drop ---
    drawFanSegments(allEntryPoints, CC_DATA_COLOR, 1.5, 0.6, DATA_OFFSET, DATA_WALL_OFFSET);

    // --- Backup fan segments (pink): exit panel → screen edge → drop ---
    if (redundancy) {
      drawFanSegments(allExitPoints, CC_BACKUP_COLOR, 1, 0.4, BACKUP_OFFSET, DATA_WALL_OFFSET);
    }
  }

  // ---- Draw cable pick ON TOP of cables ----
  if (cfg.cablePick > 0) {
    // Fill background to erase cable lines inside the circle
    ctx.fillStyle = CC_BG_COLOR;
    ctx.beginPath();
    ctx.arc(pickCX, pickCY, PICK_RADIUS + 1, 0, Math.PI * 2);
    ctx.fill();

    // Draw circle outline
    ctx.strokeStyle = CC_PICK_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pickCX, pickCY, PICK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = CC_PICK_COLOR;
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PICK', pickCX, pickCY);
    ctx.textBaseline = 'alphabetic';

    // Cable pick dimension
    if (typeof drawCableDimensionLine === 'function') {
      if (dropPos === 'behind') {
        var pickDimX = pickCX - (isSmall ? 15 : 25);
        drawCableDimensionLine(ctx, pickDimX, pickCY - PICK_RADIUS, pickDimX, toY(bbT),
          cfg.cablePick + "'", '#ccc', CC_BG_COLOR);
      } else if (dropPos === 'sr') {
        var pickDimY = pickCY - PICK_RADIUS - 14;
        drawCableDimensionLine(ctx, pickCX - PICK_RADIUS, pickDimY, toX(bbL), pickDimY,
          cfg.cablePick + "'", '#ccc', CC_BG_COLOR);
      } else {
        var pickDimY = pickCY - PICK_RADIUS - 14;
        drawCableDimensionLine(ctx, toX(bbR), pickDimY, pickCX + PICK_RADIUS, pickDimY,
          cfg.cablePick + "'", '#ccc', CC_BG_COLOR);
      }
    }
  }

  // ---- Redraw screen labels + borders on top of cables ----
  screenPos.forEach(function(sp) {
    var screenLeft = toX(sp.x);
    var screenTop = toY(sp.y);
    var screenW = sp.width * pxToCanvas;
    var screenH = sp.height * pxToCanvas;
    var screenColor = sp.screen.color || '#888';

    // Screen border
    ctx.strokeStyle = screenColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(screenLeft, screenTop, screenW, screenH);

    // Screen label with background for readability
    var labelText = sp.screen.name || sp.screenId;
    ctx.font = 'bold ' + (isSmall ? '9' : '11') + 'px Arial';
    ctx.textAlign = 'center';
    var labelW = ctx.measureText(labelText).width + 6;
    var labelH = isSmall ? 13 : 15;
    var labelX = screenLeft + screenW / 2;
    var labelY = screenTop - 14;
    ctx.fillStyle = CC_BG_COLOR;
    ctx.fillRect(labelX - labelW / 2, labelY - labelH, labelW, labelH + 2);
    ctx.fillStyle = screenColor;
    ctx.fillText(labelText, labelX, labelY);
  });

  // ---- Dimension Lines ----
  if (typeof drawCableDimensionLine === 'function') {
    // Combined wall width — above bounding box (tighter on mobile to avoid label overlap)
    var totalWidthFt = bbW / ftToPx;
    var dimAboveWall = isSmall ? 16 : 32;
    drawCableDimensionLine(ctx, bbCanvasL, bbCanvasT - dimAboveWall, bbCanvasR, bbCanvasT - dimAboveWall,
      Math.round(totalWidthFt * 10) / 10 + '\'', '#ccc', CC_BG_COLOR);

    // Combined wall height — SL: left side to avoid drop/pick overlap; otherwise right side
    var totalHeightFt = bbH / ftToPx;
    if (dropPos === 'sl') {
      var dimOffL1 = isSmall ? 8 : 15;
      drawCableDimensionLine(ctx, bbCanvasL - dimOffL1, bbCanvasT, bbCanvasL - dimOffL1, bbCanvasB,
        Math.round(totalHeightFt * 10) / 10 + '\'', '#ccc', CC_BG_COLOR);
    } else {
      var dimOffR1 = isSmall ? 8 : 15;
      drawCableDimensionLine(ctx, bbCanvasR + dimOffR1, bbCanvasT, bbCanvasR + dimOffR1, bbCanvasB,
        Math.round(totalHeightFt * 10) / 10 + '\'', '#ccc', CC_BG_COLOR);
    }

    // Wall-to-floor — SL: left side; otherwise right side
    if (cfg.wallToFloor > 0) {
      if (dropPos === 'sl') {
        var dimOffL2 = isSmall ? 18 : 35;
        drawCableDimensionLine(ctx, bbCanvasL - dimOffL2, bbCanvasB, bbCanvasL - dimOffL2, floorY,
          cfg.wallToFloor + '\'', '#ccc', CC_BG_COLOR);
      } else {
        var dimOffR2 = isSmall ? 18 : 35;
        drawCableDimensionLine(ctx, bbCanvasR + dimOffR2, bbCanvasB, bbCanvasR + dimOffR2, floorY,
          cfg.wallToFloor + '\'', '#ccc', CC_BG_COLOR);
      }
    }

    // Distro-to-wall distance — below floor (matching per-screen spacing)
    var distDimY = floorY + 18;
    drawCableDimensionLine(ctx, distroCanvasX, distDimY, dropX, distDimY,
      cfg.distroToWall + "'", '#ccc', CC_BG_COLOR);

    // Processor-to-wall distance — below floor (further down to avoid overlap)
    var procDimY = floorY + 33;
    drawCableDimensionLine(ctx, procCanvasX, procDimY, dropX, procDimY,
      cfg.processorToWall + "'", '#ccc', CC_BG_COLOR);
  }

  // ---- Legend (wraps to multiple rows on small screens) ----
  var legendItems = [
    { color: CC_POWER_COLOR, label: 'Power' },
    { color: CC_DATA_COLOR, label: 'Data' },
    { color: CC_PROC_COLOR, label: 'Proc' },
    { color: CC_POWER_COLOR, label: 'Distro' },
    { color: CC_SERVER_COLOR, label: 'Server' }
  ];
  if (redundancy) legendItems.push({ color: CC_BACKUP_COLOR, label: 'Backup' });
  if (cfg.cablePick > 0) legendItems.push({ color: CC_PICK_COLOR, label: 'Pick' });

  var legendFontSize = isSmall ? 8 : 9;
  var legendSpacing = isSmall ? 18 : 28;
  ctx.font = legendFontSize + 'px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  var legendX = MARGIN.left + 4;
  var legendY = canvasH - 22;
  var legendMaxX = canvasW - MARGIN.right;

  for (var li = 0; li < legendItems.length; li++) {
    var item = legendItems[li];
    var itemW = ctx.measureText(item.label).width + 14 + legendSpacing;
    // Wrap to next row if this item would overflow
    if (legendX + itemW > legendMaxX && legendX > MARGIN.left + 10) {
      legendX = MARGIN.left + 4;
      legendY += 14;
    }
    ctx.fillStyle = item.color;
    ctx.fillRect(legendX, legendY - 4, 8, 8);
    ctx.fillStyle = '#ccc';
    ctx.fillText(item.label, legendX + 12, legendY);
    legendX += ctx.measureText(item.label).width + legendSpacing;
  }

  // ---- Summary Text ----
  ctx.fillStyle = '#888';
  ctx.font = (isSmall ? 8 : 9) + 'px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  var shared = calcData.shared;
  var summaryParts = [
    shared.processorCount + 'x ' + cfg.processor.replace(/_/g, ' '),
    shared.totalDataLines + ' data lines'
  ];
  if (shared.distributionBoxCount > 0) {
    summaryParts.push(shared.distributionBoxCount + 'x ' + shared.distributionBoxName);
  }
  ctx.fillText(summaryParts.join('  |  '), MARGIN.left + 4, canvasH - 4);

  ctx.restore();
}
