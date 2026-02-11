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

function toggleCombinedDistBoxOnWall() {
  combinedCablingConfig.distBoxOnWall = !combinedCablingConfig.distBoxOnWall;
  const btn = document.getElementById('combinedDistBoxOnWallBtn');
  if (btn) btn.classList.toggle('active', combinedCablingConfig.distBoxOnWall);
  const controls = document.getElementById('combinedDistBoxPositionControls');
  if (controls) controls.style.display = combinedCablingConfig.distBoxOnWall ? 'block' : 'none';
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

  const distBoxBtn = document.getElementById('combinedDistBoxOnWallBtn');
  if (distBoxBtn) distBoxBtn.classList.toggle('active', cfg.distBoxOnWall);
  const distBoxControls = document.getElementById('combinedDistBoxPositionControls');
  if (distBoxControls) distBoxControls.style.display = cfg.distBoxOnWall ? 'block' : 'none';

  if (cfg.distBoxOnWall) {
    setCombinedDistBoxMainHorizPosition(cfg.distBoxMainHorizPosition);
    setCombinedDistBoxMainVertPosition(cfg.distBoxMainVertPosition);
    setCombinedDistBoxBackupHorizPosition(cfg.distBoxBackupHorizPosition);
    setCombinedDistBoxBackupVertPosition(cfg.distBoxBackupVertPosition);
  }

  const redundancyBtn = document.getElementById('combinedRedundancyBtn');
  if (redundancyBtn) redundancyBtn.classList.toggle('active', cfg.redundancy);
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
      dataLines, entryPoints, panelsPerDataLine,
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

  const cfg = combinedCablingConfig;
  const calcData = calculateCombinedCabling(selectedScreenIds, cfg);
  if (!calcData || calcData.screens.length === 0) return;

  const allPanels = typeof getAllPanels === 'function' ? getAllPanels() : {};
  const M_TO_FT = 3.28084;
  const redundancy = cfg.redundancy;
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

  // ---- Scene layout in panelSize pixel units ----
  var wallToFloorPx = cfg.wallToFloor * ftToPx;
  var distroDistPx = cfg.distroToWall * ftToPx;
  var procDistPx = cfg.processorToWall * ftToPx;
  var serverDistPx = cfg.serverToProcessor * ftToPx;
  var pickSpace = cfg.cablePick > 0 ? 30 : 0;

  // Left space for equipment (extends left from drop point)
  var leftEquipSpace = Math.max(distroDistPx, procDistPx + serverDistPx) + 60;

  // Total scene dimensions
  var totalSceneW = leftEquipSpace + bbW + 40;
  var equipAreaH = 50;
  var totalSceneH = pickSpace + bbH + wallToFloorPx + equipAreaH;

  // ---- Canvas Sizing ----
  var MARGIN = { top: 50, bottom: 40, left: 20, right: 30 };
  var BOX_W = 48, BOX_H = 24;
  var containerWidth = container.clientWidth || 400;
  var canvasW = containerWidth;
  var dpr = window.devicePixelRatio || 1;

  var drawableW = canvasW - MARGIN.left - MARGIN.right;
  var sf = Math.min(drawableW / totalSceneW, 1.5); // scale factor
  var canvasH = MARGIN.top + totalSceneH * sf + MARGIN.bottom;

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

  // ---- Coordinate transforms ----
  // Wall area origin: bounding box left edge at (leftEquipSpace, pickSpace) in scene coords
  var wallOriginX = MARGIN.left + leftEquipSpace * sf;
  var wallOriginY = MARGIN.top + pickSpace * sf;

  // Convert screen position (in panelSize units) to canvas coords
  var toX = function(px) { return wallOriginX + (px - bbL) * sf; };
  var toY = function(py) { return wallOriginY + (py - bbT) * sf; };

  // Floor Y
  var floorY = toY(bbB) + wallToFloorPx * sf;

  // ---- Unified drop point (ONE for the whole bounding box) ----
  var dropX;
  if (dropPos === 'behind') dropX = toX(bbL + bbW / 2);
  else if (dropPos === 'sr') dropX = toX(bbL);
  else dropX = toX(bbR);

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
    var screenW = sp.width * sf;
    var screenH = sp.height * sf;

    var panelType = sp.data.panelType || 'CB5_MKII';
    var heightRatio = typeof getPanelHeightRatio === 'function' ? getPanelHeightRatio(panelType) : 1;
    var hasCB5HalfRow = sp.data.addCB5HalfRow && panelType === 'CB5_MKII';
    var originalPh = hasCB5HalfRow ? sp.ph - 1 : sp.ph;

    var pxW = panelSize * sf;
    var pxH = panelSize * heightRatio * sf;
    var halfPxH = hasCB5HalfRow ? panelSize * sf : 0;

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

    // Screen label
    ctx.fillStyle = screenColor;
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(sp.screen.name || sp.screenId, screenLeft + screenW / 2, screenTop - 8);

    // Dimensions
    ctx.fillStyle = '#999';
    ctx.font = '9px Arial';
    ctx.fillText(sp.calc.wallWidthFt + '\' x ' + sp.calc.wallHeightFt + '\'', screenLeft + screenW / 2, screenTop - 20);
  });

  // ---- Equipment on Floor (ONE set for unified wall) ----
  var distroCanvasX = dropX - distroDistPx * sf;
  var equipY = floorY + 8;

  if (typeof drawCableEquipmentBox === 'function') {
    drawCableEquipmentBox(ctx, distroCanvasX - BOX_W / 2, equipY, BOX_W, BOX_H, 'DISTRO', CC_DISTBOX_COLOR);
  }

  var procCanvasX = dropX - procDistPx * sf;
  if (typeof drawCableEquipmentBox === 'function') {
    drawCableEquipmentBox(ctx, procCanvasX - BOX_W / 2, equipY, BOX_W, BOX_H, 'PROC', CC_PROC_COLOR);
  }

  var serverCanvasX = procCanvasX - serverDistPx * sf;
  if (typeof drawCableEquipmentBox === 'function') {
    drawCableEquipmentBox(ctx, serverCanvasX - BOX_W / 2, equipY, BOX_W, BOX_H, 'SERVER', CC_SERVER_COLOR);
  }

  // Server-to-processor cable
  ctx.strokeStyle = CC_SERVER_COLOR;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(serverCanvasX + BOX_W / 2, equipY + BOX_H / 2);
  ctx.lineTo(procCanvasX - BOX_W / 2, equipY + BOX_H / 2);
  ctx.stroke();

  // ---- Cable Pick (ONE for unified wall) ----
  if (cfg.cablePick > 0) {
    var pickCX = dropX;
    var pickCY = toY(bbT) - 20;

    ctx.strokeStyle = CC_PICK_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pickCX, pickCY, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = CC_PICK_COLOR;
    ctx.font = 'bold 7px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PICK', pickCX, pickCY);
    ctx.textBaseline = 'alphabetic';
  }

  // ---- Unified Power (SOCA) Cable Routing ----
  // All circuits from all screens route to ONE drop → floor → distro
  var SOCA_FLOOR_Y = floorY - 4;

  screenPos.forEach(function(sp) {
    var calc = sp.calc;
    if (!calc) return;

    var screenLeft = toX(sp.x);
    var screenTop = toY(sp.y);
    var screenBottom = toY(sp.y + sp.height);
    var pxW = panelSize * sf;

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
        ctx.moveTo(landingCenterX, screenBottom);
        ctx.lineTo(dropX, screenBottom);
        ctx.lineTo(dropX, SOCA_FLOOR_Y);
        ctx.lineTo(distroCanvasX, SOCA_FLOOR_Y);
      } else {
        ctx.moveTo(landingCenterX, screenTop);
        ctx.lineTo(dropX, screenTop);
        ctx.lineTo(dropX, SOCA_FLOOR_Y);
        ctx.lineTo(distroCanvasX, SOCA_FLOOR_Y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  });

  // ---- Unified Data Cable Routing ----
  // Collect ALL entry points from ALL screens into one list
  var DATA_FLOOR_Y = floorY - 10;
  var BACKUP_FLOOR_Y = floorY - 16;
  var hasDistBox = calcData.shared.distributionBoxCount > 0;

  var allEntryPoints = [];
  screenPos.forEach(function(sp) {
    var calc = sp.calc;
    if (!calc) return;

    var screenLeft = toX(sp.x);
    var screenTop = toY(sp.y);
    var panelType = sp.data.panelType || 'CB5_MKII';
    var heightRatio = typeof getPanelHeightRatio === 'function' ? getPanelHeightRatio(panelType) : 1;
    var pxW = panelSize * sf;
    var pxH = panelSize * heightRatio * sf;

    var dataFlip = sp.data.dataFlip || false;
    var entryPoints = dataFlip ? {} : calc.entryPoints;

    for (var dl = 0; dl < calc.dataLines; dl++) {
      var entry = entryPoints[dl];
      if (!entry) continue;
      allEntryPoints.push({
        cx: screenLeft + (entry.col + 0.5) * pxW,
        cy: screenTop + (entry.row + 0.5) * pxH,
        col: entry.col,
        row: entry.row,
        screenLeft: screenLeft,
        screenTop: screenTop,
        pxW: pxW,
        pxH: pxH,
        pw: sp.pw,
        ph: calc.effectivePh,
        deletedPanels: calc.deletedPanelsSet || new Set()
      });
    }
  });

  // Bounding box canvas coords (for dist box positioning)
  var bbCanvasL = toX(bbL);
  var bbCanvasR = toX(bbR);
  var bbCanvasT = toY(bbT);
  var bbCanvasB = toY(bbB);
  var bbCanvasW = bbCanvasR - bbCanvasL;

  if (distBoxOnWall && hasDistBox) {
    // ---- Dist box on wall — positioned relative to unified bounding box ----
    var mainFracX;
    if (cfg.distBoxMainHorizPosition === 'sr') mainFracX = 0.15;
    else if (cfg.distBoxMainHorizPosition === 'sl') mainFracX = 0.85;
    else mainFracX = 0.5;

    var mainDistBoxX = bbCanvasL + bbCanvasW * mainFracX;
    var mainDistBoxY = cfg.distBoxMainVertPosition === 'bottom' ? bbCanvasB - BOX_H - 4 : bbCanvasT + 4;

    if (typeof drawCableEquipmentBox === 'function') {
      drawCableEquipmentBox(ctx, mainDistBoxX - 20, mainDistBoxY, 40, 18, 'XD', CC_DISTBOX_COLOR);
    }

    // Fan-out from dist box to ALL entry panels across all screens
    allEntryPoints.forEach(function(ep) {
      ctx.strokeStyle = CC_DATA_COLOR;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      if (ep.deletedPanels.size > 0) {
        var dbCol = Math.floor((mainDistBoxX - ep.screenLeft) / ep.pxW);
        var dbRow = Math.floor((mainDistBoxY + 9 - ep.screenTop) / ep.pxH);
        dbCol = Math.max(0, Math.min(dbCol, ep.pw - 1));
        dbRow = Math.max(0, Math.min(dbRow, ep.ph - 1));
        if (ep.deletedPanels.has(dbCol + ',' + dbRow)) {
          var nearest = findNearestNonDeleted(dbCol, dbRow, ep.pw, ep.ph, ep.deletedPanels);
          dbCol = nearest.col; dbRow = nearest.row;
        }
        var path = findCableGridPath(dbCol, dbRow, ep.col, ep.row, ep.pw, ep.ph, ep.deletedPanels);
        if (path && path.length > 0) {
          ctx.moveTo(mainDistBoxX, mainDistBoxY + 9);
          ctx.lineTo(ep.screenLeft + (path[0].col + 0.5) * ep.pxW, ep.screenTop + (path[0].row + 0.5) * ep.pxH);
          for (var pi = 1; pi < path.length; pi++) {
            ctx.lineTo(ep.screenLeft + (path[pi].col + 0.5) * ep.pxW, ep.screenTop + (path[pi].row + 0.5) * ep.pxH);
          }
        } else {
          ctx.moveTo(mainDistBoxX, mainDistBoxY + 9);
          ctx.lineTo(ep.cx, ep.cy);
        }
      } else {
        ctx.moveTo(mainDistBoxX, mainDistBoxY + 9);
        ctx.lineTo(ep.cx, ep.cy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });

    // ONE trunk cable from dist box → drop → floor → processor
    ctx.strokeStyle = CC_TRUNK_COLOR;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(mainDistBoxX, mainDistBoxY + 18);
    ctx.lineTo(dropX, mainDistBoxY + 18);
    ctx.lineTo(dropX, DATA_FLOOR_Y);
    ctx.lineTo(procCanvasX, DATA_FLOOR_Y);
    ctx.stroke();

    // Backup dist box + trunk if redundancy
    if (redundancy) {
      var backupFracX;
      if (cfg.distBoxBackupHorizPosition === 'sr') backupFracX = 0.15;
      else if (cfg.distBoxBackupHorizPosition === 'sl') backupFracX = 0.85;
      else backupFracX = 0.5;

      var backupDistBoxX = bbCanvasL + bbCanvasW * backupFracX;
      var backupDistBoxY = cfg.distBoxBackupVertPosition === 'bottom' ? bbCanvasB - BOX_H - 4 : bbCanvasT + 4;

      if (typeof drawCableEquipmentBox === 'function') {
        drawCableEquipmentBox(ctx, backupDistBoxX - 20, backupDistBoxY, 40, 18, 'XD-B', CC_TRUNK_BACKUP_COLOR);
      }

      allEntryPoints.forEach(function(ep) {
        ctx.strokeStyle = CC_BACKUP_COLOR;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        if (ep.deletedPanels.size > 0) {
          var bCol = Math.floor((backupDistBoxX - ep.screenLeft) / ep.pxW);
          var bRow = Math.floor((backupDistBoxY + 9 - ep.screenTop) / ep.pxH);
          bCol = Math.max(0, Math.min(bCol, ep.pw - 1));
          bRow = Math.max(0, Math.min(bRow, ep.ph - 1));
          if (ep.deletedPanels.has(bCol + ',' + bRow)) {
            var nearest = findNearestNonDeleted(bCol, bRow, ep.pw, ep.ph, ep.deletedPanels);
            bCol = nearest.col; bRow = nearest.row;
          }
          var path = findCableGridPath(bCol, bRow, ep.col, ep.row, ep.pw, ep.ph, ep.deletedPanels);
          if (path && path.length > 0) {
            ctx.moveTo(backupDistBoxX, backupDistBoxY + 9);
            ctx.lineTo(ep.screenLeft + (path[0].col + 0.5) * ep.pxW, ep.screenTop + (path[0].row + 0.5) * ep.pxH);
            for (var pi = 1; pi < path.length; pi++) {
              ctx.lineTo(ep.screenLeft + (path[pi].col + 0.5) * ep.pxW, ep.screenTop + (path[pi].row + 0.5) * ep.pxH);
            }
          } else {
            ctx.moveTo(backupDistBoxX, backupDistBoxY + 9);
            ctx.lineTo(ep.cx, ep.cy);
          }
        } else {
          ctx.moveTo(backupDistBoxX, backupDistBoxY + 9);
          ctx.lineTo(ep.cx, ep.cy);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });

      ctx.strokeStyle = CC_TRUNK_BACKUP_COLOR;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(backupDistBoxX, backupDistBoxY + 18);
      ctx.lineTo(dropX + 3, backupDistBoxY + 18);
      ctx.lineTo(dropX + 3, BACKUP_FLOOR_Y);
      ctx.lineTo(procCanvasX, BACKUP_FLOOR_Y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  } else {
    // ---- No dist box: ALL data cables → ONE drop → ONE bundle → processor ----
    allEntryPoints.forEach(function(ep) {
      ctx.strokeStyle = CC_DATA_COLOR;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      if (ep.deletedPanels.size > 0) {
        var targetCol = Math.floor((dropX - ep.screenLeft) / ep.pxW);
        targetCol = Math.max(0, Math.min(targetCol, ep.pw - 1));
        var targetRow = ep.row;
        // Find nearest non-deleted cell in the same row (search toward drop)
        if (ep.deletedPanels.has(targetCol + ',' + targetRow)) {
          var foundInRow = false;
          for (var dist = 1; dist < ep.pw; dist++) {
            if (targetCol - dist >= 0 && !ep.deletedPanels.has((targetCol - dist) + ',' + targetRow)) {
              targetCol = targetCol - dist; foundInRow = true; break;
            }
            if (targetCol + dist < ep.pw && !ep.deletedPanels.has((targetCol + dist) + ',' + targetRow)) {
              targetCol = targetCol + dist; foundInRow = true; break;
            }
          }
          if (!foundInRow) {
            var nearest = findNearestNonDeleted(targetCol, targetRow, ep.pw, ep.ph, ep.deletedPanels);
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
          var lastCY = ep.screenTop + (lastCell.row + 0.5) * ep.pxH;
          ctx.lineTo(dropX, lastCY);
          ctx.lineTo(dropX, DATA_FLOOR_Y);
        } else {
          ctx.moveTo(ep.cx, ep.cy);
          ctx.lineTo(dropX, ep.cy);
          ctx.lineTo(dropX, DATA_FLOOR_Y);
        }
      } else {
        ctx.moveTo(ep.cx, ep.cy);
        ctx.lineTo(dropX, ep.cy);
        ctx.lineTo(dropX, DATA_FLOOR_Y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });

    // ONE bundle cable on floor
    if (allEntryPoints.length > 0) {
      ctx.strokeStyle = CC_DATA_COLOR;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(dropX, DATA_FLOOR_Y);
      ctx.lineTo(procCanvasX, DATA_FLOOR_Y);
      ctx.stroke();
    }

    // Backup cables (redundancy)
    if (redundancy && allEntryPoints.length > 0) {
      allEntryPoints.forEach(function(ep) {
        ctx.strokeStyle = CC_BACKUP_COLOR;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        if (ep.deletedPanels.size > 0) {
          var targetCol = Math.floor((dropX + 3 - ep.screenLeft) / ep.pxW);
          targetCol = Math.max(0, Math.min(targetCol, ep.pw - 1));
          var targetRow = ep.row;
          // Find nearest non-deleted cell in the same row (search toward drop)
          if (ep.deletedPanels.has(targetCol + ',' + targetRow)) {
            var foundInRow = false;
            for (var dist = 1; dist < ep.pw; dist++) {
              if (targetCol - dist >= 0 && !ep.deletedPanels.has((targetCol - dist) + ',' + targetRow)) {
                targetCol = targetCol - dist; foundInRow = true; break;
              }
              if (targetCol + dist < ep.pw && !ep.deletedPanels.has((targetCol + dist) + ',' + targetRow)) {
                targetCol = targetCol + dist; foundInRow = true; break;
              }
            }
            if (!foundInRow) {
              var nearest = findNearestNonDeleted(targetCol, targetRow, ep.pw, ep.ph, ep.deletedPanels);
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
            var lastCY = ep.screenTop + (lastCell.row + 0.5) * ep.pxH;
            ctx.lineTo(dropX + 3, lastCY);
            ctx.lineTo(dropX + 3, BACKUP_FLOOR_Y);
          } else {
            ctx.moveTo(ep.cx, ep.cy);
            ctx.lineTo(dropX + 3, ep.cy);
            ctx.lineTo(dropX + 3, BACKUP_FLOOR_Y);
          }
        } else {
          ctx.moveTo(ep.cx, ep.cy);
          ctx.lineTo(dropX + 3, ep.cy);
          ctx.lineTo(dropX + 3, BACKUP_FLOOR_Y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });

      ctx.strokeStyle = CC_BACKUP_COLOR;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(dropX + 3, BACKUP_FLOOR_Y);
      ctx.lineTo(procCanvasX, BACKUP_FLOOR_Y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ---- Dimension Lines ----
  if (typeof drawCableDimensionLine === 'function') {
    // Combined wall width — above bounding box
    var totalWidthFt = bbW / ftToPx;
    drawCableDimensionLine(ctx, bbCanvasL, bbCanvasT - 32, bbCanvasR, bbCanvasT - 32,
      Math.round(totalWidthFt * 10) / 10 + '\'', '#ccc', CC_BG_COLOR);

    // Combined wall height — right side of bounding box
    var totalHeightFt = bbH / ftToPx;
    drawCableDimensionLine(ctx, bbCanvasR + 15, bbCanvasT, bbCanvasR + 15, bbCanvasB,
      Math.round(totalHeightFt * 10) / 10 + '\'', '#ccc', CC_BG_COLOR);

    // Wall-to-floor (further right to avoid overlap)
    drawCableDimensionLine(ctx, bbCanvasR + 35, bbCanvasB, bbCanvasR + 35, floorY,
      cfg.wallToFloor + '\'', '#ccc', CC_BG_COLOR);
  }

  // ---- Legend ----
  var legendY = canvasH - 22;
  var legendItems = [
    { color: CC_POWER_COLOR, label: 'Power (SOCA)' },
    { color: CC_DATA_COLOR, label: 'Data' },
    { color: CC_PROC_COLOR, label: 'Processor' },
    { color: CC_DISTBOX_COLOR, label: 'Distro' },
    { color: CC_SERVER_COLOR, label: 'Server' }
  ];
  if (redundancy) legendItems.push({ color: CC_BACKUP_COLOR, label: 'Backup' });
  if (cfg.cablePick > 0) legendItems.push({ color: CC_PICK_COLOR, label: 'Cable Pick' });

  var legendX = MARGIN.left + 10;
  ctx.font = '9px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for (var li = 0; li < legendItems.length; li++) {
    var item = legendItems[li];
    ctx.fillStyle = item.color;
    ctx.fillRect(legendX, legendY - 4, 10, 8);
    ctx.fillStyle = '#ccc';
    ctx.fillText(item.label, legendX + 14, legendY);
    legendX += ctx.measureText(item.label).width + 28;
  }

  // ---- Summary Text ----
  ctx.fillStyle = '#888';
  ctx.font = '9px Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  var shared = calcData.shared;
  var summaryParts = [
    shared.processorCount + 'x ' + cfg.processor.replace(/_/g, ' '),
    shared.totalDataLines + ' data lines'
  ];
  if (shared.distributionBoxCount > 0) {
    summaryParts.push(shared.distributionBoxCount + 'x ' + shared.distributionBoxName);
  }
  ctx.fillText(summaryParts.join('  |  '), canvasW - MARGIN.right - 4, canvasH - 8);

  ctx.restore();
}
