// ==================== COMBINED CABLE LAYOUT DIAGRAM ====================
// Unified cable diagram for combined multi-screen view.
// Shows multiple LED walls sharing processors, distribution boxes, and power.
// Renders into #combinedCableDiagramCanvas inside the combined tab.

// ---- Combined Cabling Configuration (DERIVED, not user-editable) ----
// The combined view is read-only: every cabling value comes from the screens themselves,
// edited in each screen's own Cable tab. This object is rebuilt from the selection on each
// render purely so the existing consumers (calculateCombinedCabling, the combined gear
// list) keep a single place to read the few genuinely rig-wide values from.
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
  xdPlacement: 'proc',
  xdToProcessor: 25,
  distBoxMainHorizPosition: 'center',
  distBoxMainVertPosition: 'top',
  distBoxBackupHorizPosition: 'center',
  distBoxBackupVertPosition: 'top'
};

// Per-screen cabling values, with the same defaults the Cable tab uses.
function screenCablingValues(screenId) {
  const d = (screens[screenId] && screens[screenId].data) ? screens[screenId].data : {};
  return {
    wallToFloor: d.wallToFloor ?? 5,
    distroToWall: d.distroToWall ?? 10,
    processorToWall: d.processorToWall ?? 15,
    serverToProcessor: d.serverToProcessor ?? 50,
    cablePick: d.cablePick ?? 0,
    cableDropPosition: d.cableDropPosition ?? 'behind',
    powerInPosition: d.powerInPosition ?? 'top',
    xdPlacement: (typeof resolveXdPlacement === 'function') ? resolveXdPlacement(d) : 'proc',
    xdToProcessor: d.xdToProcessor ?? 25,
    xdToWall: d.xdToWall ?? 40,
    redundancy: !!d.redundancy,
    voltage: d.voltage ?? 208,
    breaker: d.breaker ?? 20,
    processor: d.processor || 'Brompton_SX40',
    mx40ConnectionMode: d.mx40ConnectionMode || 'direct'
  };
}

// Rebuild the derived config from the current selection. Rig-wide values (server run,
// distro distance) take the largest across the selection so nothing is under-reported.
function deriveCombinedCablingConfig(selectedScreenIds) {
  const ids = (selectedScreenIds || []).filter(id => screens[id] && screens[id].data);
  if (!ids.length) return combinedCablingConfig;
  const first = screenCablingValues(ids[0]);
  const cfg = combinedCablingConfig;
  cfg.processor = first.processor;
  cfg.mx40ConnectionMode = first.mx40ConnectionMode;
  cfg.voltage = first.voltage;
  cfg.breaker = first.breaker;
  cfg.frameRate = (screens[ids[0]].data.frameRate) || 60;
  cfg.bitDepth = (screens[ids[0]].data.bitDepth) || 8;
  cfg.redundancy = ids.some(id => screenCablingValues(id).redundancy);
  cfg.wallToFloor = Math.max.apply(null, ids.map(id => screenCablingValues(id).wallToFloor));
  cfg.distroToWall = Math.max.apply(null, ids.map(id => screenCablingValues(id).distroToWall));
  cfg.processorToWall = Math.max.apply(null, ids.map(id => screenCablingValues(id).processorToWall));
  cfg.serverToProcessor = Math.max.apply(null, ids.map(id => screenCablingValues(id).serverToProcessor));
  cfg.cablePick = Math.max.apply(null, ids.map(id => screenCablingValues(id).cablePick));
  cfg.xdToProcessor = Math.max.apply(null, ids.map(id => screenCablingValues(id).xdToProcessor));
  // Placement is rig-wide only in the sense that the floor lane needs to know whether ANY
  // screen puts its box out on the floor; per-screen placement still drives each run.
  const placements = ids.map(id => screenCablingValues(id).xdPlacement);
  cfg.xdPlacement = placements.includes('remote') ? 'remote'
    : (placements.includes('wall') ? 'wall' : 'proc');
  cfg.distBoxOnWall = cfg.xdPlacement === 'wall';
  cfg.cableDropPosition = first.cableDropPosition;
  cfg.powerInPosition = first.powerInPosition;
  return cfg;
}

// ---- Processor Dist Box Support Check ----
function processorSupportsDistBox(processorId, mx40Mode) {
  // resolveProcessorTopology() reads getAllProcessors(), so custom processors are
  // matched here too — the previous lookup only saw the built-in table.
  return resolveProcessorTopology(processorId, mx40Mode).usesDistBox;
}

// ---- Color Constants (let for eco/greyscale reassignment) ----
let CC_POWER_COLOR = '#FF6B35';
let CC_DATA_COLOR = '#00CED1';
let CC_BACKUP_COLOR = '#FF69B4';
let CC_DISTBOX_COLOR = '#FFD700';
let CC_TRUNK_COLOR = '#FFD700';
let CC_TRUNK_BACKUP_COLOR = '#FFFFFF';
let CC_PICK_COLOR = '#7CFC00';
let CC_SERVER_COLOR = '#AB47BC';
let CC_PROC_COLOR = '#4ECDC4';
let CC_BG_COLOR = '#1a1a1a';
let CC_FLOOR_COLOR = '#555555';
let CC_PANEL_COLOR = '#555555';
let CC_DELETED_COLOR = '#333333';
let CC_PANEL_FILL = '#2a2a2a';

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
  const allProcessors = typeof getAllProcessors === 'function' ? getAllProcessors() : (typeof processors !== 'undefined' ? processors : {});
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

    // Data lines for this screen — resolved from THIS screen's own processor, frame rate,
    // bit depth and Max Panels Per Data override, via the same shared helper the combined
    // data canvas and the Complex canvas use (core/calculate.js). Deriving it from the
    // combined-level config instead is what let the cable runs disagree with the data
    // lines actually drawn on the canvas.
    const panelsPerDataLine = resolvePanelsPerDataLine({
      panel: p,
      halfPanel: allPanels['CB5_MKII_HALF'],
      processor: allProcessors[data.processor],
      frameRate: parseInt(data.frameRate) || 60,
      bitDepth: parseInt(data.bitDepth) || 8,
      hasCB5HalfRow,
      pw, ph,
      deletedCount: deletedPanelsSet.size,
      userMax: parseInt(data.maxPanelsPerData)
    });
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

    // Power circuits for this screen. Voltage/breaker stay the combined view's own (one
    // distro feeds every wall), but Max/Avg and the Max Panels Per Circuit override are
    // per-screen — the override is the user's quick way to re-circuit a wall without
    // assigning every panel by hand, so it has to apply here too. Mirrors the combined
    // canvas (nav/combined.js) so the cable runs match the circuits it draws.
    const powerType = data.powerType || 'max';
    const perPanelW = powerType === 'avg' ? (p.power_avg_w || p.power_max_w * 0.5) : p.power_max_w;
    const derate = data.derate ? 0.8 : 1.0;
    const circuitCapacityW = config.voltage * config.breaker * derate;
    const calculatedPanelsPerCircuit = Math.max(1, Math.floor(circuitCapacityW / perPanelW));
    const userMaxPanelsPerCircuit = parseInt(data.maxPanelsPerCircuit);
    const panelsPerCircuit = userMaxPanelsPerCircuit > 0 ? userMaxPanelsPerCircuit : calculatedPanelsPerCircuit;
    const columnsPerCircuit = Math.max(1, Math.floor(panelsPerCircuit / ph));
    const circuitsNeeded = Math.ceil(pw / columnsPerCircuit);
    const socaCount = Math.ceil(circuitsNeeded / 6);

    // SOCA column spans from the screen's as-assigned per-panel grouping, so a manual
    // Assign SOCA # routes here the same way it does on the power canvas. Circuiting still
    // uses this view's own combined config (voltage/breaker/powerType), not per-screen power.
    let socaSpans = null;
    if (typeof assignCircuits === 'function' && typeof assignSocas === 'function' && typeof computeSocaSpans === 'function') {
      const toMap = v => v instanceof Map ? v : new Map(Array.isArray(v) ? v : []);
      const { panelToCircuit } = assignCircuits(pw, ph, panelsPerCircuit, deletedPanelsSet, toMap(data.customCircuitAssignments));
      const panelToSoca = assignSocas(panelToCircuit, toMap(data.customSocaAssignments));
      socaSpans = computeSocaSpans(panelToCircuit, panelToSoca);
      const labelMap = (typeof sharedDistroSocaLabelMap === 'function') ? sharedDistroSocaLabelMap(screenId) : null;
      socaSpans.forEach(sp => { sp.labelIdx = (labelMap && labelMap.has(sp.socaIdx)) ? labelMap.get(sp.socaIdx) : sp.socaIdx; });
    }

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
      circuitsNeeded, socaCount, columnsPerCircuit, socaSpans,
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

  // Box name/count from the processor spec (specs/processor-topology.js).
  const topology = resolveProcessorTopology(config.processor, config.mx40ConnectionMode);
  const boxCounts = computeProcessorAndBoxCounts({
    topology: topology,
    mainPorts: portsNeeded,
    totalPixels: totalPixels,
    hasRedundancy: !!config.redundancy,
    screenCount: 1
  });
  distributionBoxCount = boxCounts.distBoxCount;
  distributionBoxName = boxCounts.distBoxName;

  // Processor count here mirrors the per-screen path in core/calculate.js and stays
  // pixel-driven; only the distribution-box resolution above was unified.
  if (config.processor === 'Brompton_SX40' && portsNeeded > 0) {
    processorCount = Math.ceil(totalPixels / pr.total_pixels);
  } else if (config.processor === 'NovaStar_MX40_Pro' && portsNeeded > 0) {
    if (config.mx40ConnectionMode === 'direct') {
      processorCount = Math.max(Math.ceil(portsNeededFinal / 20), Math.ceil(totalPixels / 9000000));
    } else {
      processorCount = Math.max(Math.ceil(totalPixels / 9000000), Math.ceil(distributionBoxCount / 4));
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
  // Eco/greyscale print mode support — reassign module-level colors
  var isPrintMode = ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode;
  function ccPrintColor(hex) {
    if (greyscalePrintMode && typeof toGreyscale === 'function') return toGreyscale(hex);
    if (ecoPrintMode && typeof toPastelColor === 'function') return toPastelColor(hex);
    return hex;
  }
  CC_POWER_COLOR = ccPrintColor('#FF6B35');
  CC_DATA_COLOR = ccPrintColor('#00CED1');
  CC_BACKUP_COLOR = ccPrintColor('#FF69B4');
  CC_DISTBOX_COLOR = ccPrintColor('#FFD700');
  CC_TRUNK_COLOR = ccPrintColor('#FFD700');
  CC_TRUNK_BACKUP_COLOR = isPrintMode ? '#333333' : '#FFFFFF';
  CC_PICK_COLOR = ccPrintColor('#7CFC00');
  CC_SERVER_COLOR = ccPrintColor('#AB47BC');
  CC_PROC_COLOR = ccPrintColor('#4ECDC4');
  CC_BG_COLOR = isPrintMode ? '#ffffff' : '#1a1a1a';
  CC_FLOOR_COLOR = isPrintMode ? '#cccccc' : '#555555';
  CC_PANEL_COLOR = isPrintMode ? '#000000' : '#555555';
  CC_DELETED_COLOR = isPrintMode ? '#dddddd' : '#333333';
  CC_PANEL_FILL = isPrintMode ? '#f5f5f5' : '#2a2a2a';
  var ccFgColor = isPrintMode ? '#000000' : '#ffffff';
  var ccDimColor = isPrintMode ? '#000000' : '#999999';
  var ccLegendTextColor = isPrintMode ? '#000000' : '#cccccc';
  var ccSummaryColor = isPrintMode ? '#000000' : '#888888';

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

  const cfg = deriveCombinedCablingConfig(selectedScreenIds);
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
  // Placement is per screen now; these are only used for the rig-wide dimension labels.
  const xdScreenDistances = selectedScreenIds.map(function(id) {
    const scr = screens[id];
    return (scr && scr.data && scr.data.xdToWall != null) ? scr.data.xdToWall : 40;
  });
  const minXdToWall = xdScreenDistances.length ? Math.min.apply(null, xdScreenDistances) : 40;
  const dropPos = cfg.cableDropPosition;

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
  var isPdf = (typeof pdfWhiteBgMode !== 'undefined' && pdfWhiteBgMode);
  var rightMarginExtra = (dropPos === 'sl') ? 15 : 0;
  var MARGIN = { top: isSmall ? 30 : 50, bottom: isSmall ? 25 : 40, left: isSmall ? 14 : 20, right: (isSmall ? 25 : 30) + rightMarginExtra };
  var BOX_W = isPdf ? (isSmall ? 52 : 64) : (isSmall ? 38 : 48);
  var BOX_H = isPdf ? (isSmall ? 28 : 34) : (isSmall ? 18 : 24);

  // ---- Scene layout in feet (matching per-screen cable diagram pattern) ----
  var wallWidthFt = bbW / ftToPx;
  var wallHeightFt = bbH / ftToPx;

  // Every physical unit the selection's data lines land on. Numbering is already pooled
  // globally by buildDataPortPlan, so two screens on the same processor share one box here.
  var dataUnits = (typeof projectDataUnits === 'function') ? projectDataUnits() : { procs: [], boxes: [], byScreen: new Map() };
  var selectedIdSet = new Set(selectedScreenIds);
  var reachedProcIds = new Set();
  var reachedBoxIds = new Set();
  var remoteBoxIds = new Set();
  selectedScreenIds.forEach(function(id) {
    var reach = dataUnits.byScreen.get(id);
    if (!reach) return;
    var place = screenCablingValues(id).xdPlacement;
    reach.procUnitIds.forEach(function(u) { reachedProcIds.add(u); });
    reach.boxUnitIds.forEach(function(u) {
      reachedBoxIds.add(u);
      // Only a REMOTE box gets its own box on the floor; 'proc' keeps it at the
      // processor and 'wall' draws it on the screen itself.
      if (place === 'remote') remoteBoxIds.add(u);
    });
  });
  var floorProcs = dataUnits.procs.filter(function(u) { return reachedProcIds.has(u.unitId); });
  var floorBoxes = dataUnits.boxes.filter(function(u) { return remoteBoxIds.has(u.unitId); });
  if (!floorProcs.length) floorProcs = [{ unitId: '__proc__', label: 'PROC' }];
  var distroCount = 1; // Phase 1: one distro for the whole rig, as today
  var floorBoxCount = distroCount + floorProcs.length + floorBoxes.length;

  // Floor equipment sits in a FIXED lane left of the wall, in the order distro(s),
  // processor(s), then the XD boxes nearest the wall. The distances are schematic:
  // changing one only updates its dimension label, it never moves a box. The lane is
  // sized in feet so it scales with the scene, and grows with the number of units so
  // more boxes get more room rather than being squeezed together.

  var totalVertFt = wallHeightFt + cfg.wallToFloor + 3;

  // Right padding in feet — extra room for an SL drop/pick on any screen
  var anySlPick = selectedScreenIds.some(function(id) {
    var c = screenCablingValues(id);
    return c.cableDropPosition === 'sl';
  });
  var rightPadFt = 4;
  if (anySlPick) rightPadFt += (cfg.cablePick > 0 ? 3 : 1);

  // Floor equipment needs a real gap between boxes to stay readable. Spacing is generous
  // when there are few units and tightens gracefully as the count grows, but never below
  // a readable gap. The lane is sized in pixels, independent of scale.
  var drawableW = canvasW - MARGIN.left - MARGIN.right;
  // Two rows once the lane gets busy: XD boxes on a shelf, distro + processors on the
  // floor. The lane then only has to be as wide as the BIGGER row, which keeps a large
  // rig on screen instead of scrolling sideways.
  var floorRowCount = 1 + floorProcs.length;          // distro + processors
  var shelfRowCount = floorBoxes.length;              // XD boxes
  // The proc→XD trunks live in the gap between the shelf and the floor row, so the gap
  // has to be tall enough to hold one line per box on the busiest processor.
  var trunksPerProc = {};
  floorBoxes.forEach(function(u) { trunksPerProc[u.procUnitId] = (trunksPerProc[u.procUnitId] || 0) + 1; });
  var maxTrunksPerProc = 0;
  Object.keys(trunksPerProc).forEach(function(k) { if (trunksPerProc[k] > maxTrunksPerProc) maxTrunksPerProc = trunksPerProc[k]; });
  var TRUNK_STEP = isSmall ? 4 : 5;
  var SHELF_GAP = (isSmall ? 8 : 12) + maxTrunksPerProc * TRUNK_STEP;
  var useShelf = shelfRowCount > 0 && (floorRowCount + shelfRowCount) > 6;
  var laneUnits = useShelf ? (Math.max(shelfRowCount, floorRowCount + 0.5) + 1)
                           : (floorBoxCount + 1);

  var idealSlot = BOX_W + (isSmall ? 22 : 52);
  var minSlot = BOX_W + (isSmall ? 8 : 12);
  var laneBudget = Math.max(drawableW * 0.40, minSlot * 3);
  var equipSlotPx = Math.min(idealSlot, Math.max(minSlot, laneBudget / laneUnits));
  var equipLaneW = equipSlotPx * laneUnits;

  // The screens must keep at least this share of the width, so a rig with a lot of floor
  // units widens the canvas (the wrapper scrolls) rather than squashing the walls.
  var WALL_SHARE = 0.55;
  var neededDrawableW = (BOX_W + equipLaneW) / (1 - WALL_SHARE);
  if (drawableW < neededDrawableW) {
    drawableW = neededDrawableW;
    canvasW = drawableW + MARGIN.left + MARGIN.right;
  }

  // The wall takes whatever the lane leaves
  var scale = Math.min((drawableW - BOX_W - equipLaneW) / (wallWidthFt + rightPadFt), 80);
  var wallWidthPx = wallWidthFt * scale;

  // Pick vertical space (only for "behind" position)
  var PICK_GAP = isSmall ? 30 : 45;
  var PICK_RADIUS = 12;
  // Any screen with a behind-pick needs headroom above the wall
  var anyBehindPick = selectedScreenIds.some(function(id) {
    var c = screenCablingValues(id);
    return c.cablePick > 0 && c.cableDropPosition === 'behind';
  });
  var pickVertSpace = anyBehindPick ? PICK_GAP + PICK_RADIUS * 2 + 10 : 0;

  // Below-floor band: every screen's converging runs get their own row, then the
  // dimension lines sit under them. Sized from the screen count so a big rig gets a
  // taller drawing rather than a pile of overlapping cables on one line.
  var FLOOR_ROW_STEP = isSmall ? 11 : 16;
  var FLOOR_BAND_TOP = 10;
  var floorBandPx = FLOOR_BAND_TOP + selectedScreenIds.length * FLOOR_ROW_STEP;
  var dimRowsPx = ((floorBoxes.length ? 3 : 2) * 15) + 12;
  var belowFloorPx = floorBandPx + dimRowsPx;
  var dpr = window.devicePixelRatio || 1;
  var legendExtra = isSmall ? 20 : 0;
  // A stretched wall-to-floor gap (shelf headroom) adds height the feet-based figure
  // does not know about
  var shelfExtraPx = useShelf ? Math.max(0, (2 * BOX_H + SHELF_GAP + 24) - cfg.wallToFloor * scale) : 0;
  var canvasH = MARGIN.top + totalVertFt * scale + pickVertSpace + belowFloorPx + MARGIN.bottom + legendExtra + shelfExtraPx;

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

  // ---- Wall positioning: the wall sits to the right of the equipment lane ----
  var sceneWidthPx = BOX_W + equipLaneW + wallWidthPx + rightPadFt * scale;
  var sceneOffsetX = MARGIN.left + Math.max(0, (drawableW - sceneWidthPx) / 2);
  var wallLeftX = sceneOffsetX + BOX_W + equipLaneW;
  var wallRightX = wallLeftX + wallWidthFt * scale;
  var wallTopY = MARGIN.top + pickVertSpace;
  var wallBottomY = wallTopY + wallHeightFt * scale;
  // The shelf lives between the wall and the floor, so guarantee it room. These
  // positions are schematic anyway — the wall-to-floor figure is a label, not a
  // measured span — so stretching the gap costs nothing but readability gained.
  var minFloorGapPx = useShelf ? (2 * BOX_H + SHELF_GAP + 24) : 0;
  var floorY = wallBottomY + Math.max(cfg.wallToFloor * scale, minFloorGapPx);

  // Convert panelSize-pixel coords to canvas coords
  var pxToCanvas = scale / ftToPx;
  var toX = function(px) { return wallLeftX + (px - bbL) * pxToCanvas; };
  var toY = function(py) { return wallTopY + (py - bbT) * pxToCanvas; };

  // ---- Per-screen geometry: each screen drops its own cables ----
  // Cables come down the back or the side of the screen they serve and only converge on
  // the floor, so every screen gets its own drop point and pick from its OWN Cable tab
  // settings — exactly what that screen shows in its own cable diagram.
  var SIDE_DROP_PAD = 20;
  screenPos.forEach(function(sp, i) {
    sp.cab = screenCablingValues(sp.screenId);
    sp.left = toX(sp.x);
    sp.right = toX(sp.x + sp.width);
    sp.top = toY(sp.y);
    sp.bottom = toY(sp.y + sp.height);
    sp.order = i;

    if (sp.cab.cableDropPosition === 'sr') sp.dropX = sp.left - SIDE_DROP_PAD;
    else if (sp.cab.cableDropPosition === 'sl') sp.dropX = sp.right + SIDE_DROP_PAD;
    else sp.dropX = (sp.left + sp.right) / 2;

    if (sp.cab.cablePick > 0) {
      if (sp.cab.cableDropPosition === 'behind') {
        sp.pickCX = sp.dropX;
        sp.pickCY = sp.top - PICK_GAP - PICK_RADIUS;
      } else if (sp.cab.cableDropPosition === 'sr') {
        sp.pickCX = sp.left - PICK_GAP - PICK_RADIUS;
        sp.pickCY = sp.top + PICK_RADIUS;
      } else {
        sp.pickCX = sp.right + PICK_GAP + PICK_RADIUS;
        sp.pickCY = sp.top + PICK_RADIUS;
      }
    }
  });

  // Fallback drop for the few rig-wide bits (pick dimension, legend anchoring)
  var dropX = screenPos[0].dropX;

  // ---- Draw Floor Line ----
  ctx.strokeStyle = CC_FLOOR_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(MARGIN.left, floorY);
  ctx.lineTo(canvasW - MARGIN.right, floorY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = ccDimColor;
  ctx.font = (isPdf ? 15 : 9) + 'px Arial';
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
          ctx.fillStyle = CC_PANEL_FILL;
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
        ctx.fillStyle = CC_PANEL_FILL;
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
    ctx.fillStyle = isPrintMode ? ccFgColor : screenColor;
    ctx.font = 'bold ' + (isPdf ? (isSmall ? '15' : '17') : (isSmall ? '9' : '11')) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(sp.screen.name || sp.screenId, screenLeft + screenW / 2, screenTop - 14);
  });

  // ---- Equipment on Floor (ONE set for unified wall) ----
  // Equipment positions use feet-based scale (matching per-screen diagram)
  // FIXED lane, left to right: distro, proc, XD. The XD (when remote) sits closest to
  // the wall; without it the processor does. Distances only change their labels.
  // equipSlotPx / equipLaneW were sized with the canvas up top so the boxes always get a
  // readable gap; the lane is simply laid out here.
  var equipY = floorY - BOX_H; // boxes sit ON TOP of floor line
  var dataEndY = equipY + BOX_H;

  // The lane is TWO rows: XD boxes on a shelf, distro + processors on the floor below.
  // Stacking keeps a big rig from running off the side, and vertical room is the cheap
  // dimension here. The shelf is offset by half a slot so a cable rising to a shelf box
  // always passes between two floor boxes rather than through one.
  var shelfY = useShelf ? (equipY - BOX_H - SHELF_GAP) : equipY;
  var unitX = {};
  var unitY = {};   // the Y a cable terminating on this unit should rise/drop to
  var laneSlots = [];

  var shelfCursorX = wallLeftX - equipSlotPx;
  floorBoxes.slice().reverse().forEach(function(u) {
    unitX[u.unitId] = shelfCursorX;
    unitY[u.unitId] = useShelf ? (shelfY + BOX_H) : (equipY + BOX_H);
    // With more than one processor a bare "XD A" is ambiguous — box indices restart per
    // processor, so the label carries the processor too, stacked onto its own line.
    laneSlots.push({ x: shelfCursorX, y: useShelf ? shelfY : equipY,
                     label: (floorProcs.length > 1 && u.labelLines) ? u.labelLines : u.label,
                     color: CC_DISTBOX_COLOR, kind: 'box', unit: u });
    shelfCursorX -= equipSlotPx;
  });

  var floorCursorX = wallLeftX - equipSlotPx * (useShelf ? 1.5 : 1);
  if (!useShelf) floorCursorX = shelfCursorX;
  floorProcs.slice().reverse().forEach(function(u) {
    unitX[u.unitId] = floorCursorX;
    unitY[u.unitId] = equipY + BOX_H;
    laneSlots.push({ x: floorCursorX, y: equipY, label: u.label, color: CC_PROC_COLOR, kind: 'proc', unit: u });
    floorCursorX -= equipSlotPx;
  });
  var distroCanvasX = floorCursorX;
  laneSlots.push({ x: distroCanvasX, y: equipY, label: isSmall ? 'DIST' : 'DISTRO',
                   color: CC_POWER_COLOR, kind: 'distro' });

  // Representative processor X, used by the server cable and any single-unit fallback
  var procCanvasX = floorProcs.length ? unitX[floorProcs[0].unitId] : (wallLeftX - equipSlotPx);
  var distroEquipY = equipY;
  var dataEndYFor = function(x) {
    // Match a terminating X back to its unit so the run stops at the right row
    var hit = null;
    Object.keys(unitX).forEach(function(k) { if (Math.abs(unitX[k] - x) < 0.5) hit = k; });
    return hit && unitY[hit] !== undefined ? unitY[hit] : (equipY + BOX_H);
  };

  // Where one screen's data run terminates: its remote XD box if it has one on the
  // floor, otherwise the processor that feeds it.
  function screenDataTargets(screenId) {
    var reach = dataUnits.byScreen.get(screenId);
    var place = screenCablingValues(screenId).xdPlacement;
    var out = [];
    if (reach && place === 'remote') {
      reach.boxUnitIds.forEach(function(u) { if (unitX[u] !== undefined) out.push(unitX[u]); });
    }
    if (!out.length && reach) {
      reach.procUnitIds.forEach(function(u) { if (unitX[u] !== undefined) out.push(unitX[u]); });
    }
    if (!out.length) out.push(procCanvasX);
    out.sort(function(a, b) { return a - b; });
    return out;
  }

  // Server: far-left, vertically centered between wall top and floor
  var serverCanvasX = MARGIN.left;
  var serverBoxCenterY = (wallTopY + floorY) / 2;
  var serverBoxY = serverBoxCenterY - BOX_H / 2;

  // Use abbreviated labels on mobile
  var distLabel = isSmall ? 'DIST' : 'DISTRO';
  var procLabel = 'PROC';
  var srvLabel = isSmall ? 'SRV' : 'SERVER';

  // Remote XD trunks: each floor XD box is fed by the processor that owns it. Length is
  // a label, not a measured span. The backup box sits beside the main one, so redundancy
  // only adds a second run.
  // Runs from one processor to several boxes would sit on top of each other, so each
  // trunk is lifted onto its own line above the boxes and drops into its target.
  var trunkSeq = {};
  floorBoxes.forEach(function(u) {
    var boxX = unitX[u.unitId];
    var srcX = (unitX[u.procUnitId] !== undefined) ? unitX[u.procUnitId] : procCanvasX;
    if (boxX === undefined) return;
    var seq = (trunkSeq[u.procUnitId] = (trunkSeq[u.procUnitId] || 0) + 1);
    // On a shelf the run rises out of the processor, crosses just under the shelf and
    // drops into the box; on a single row it arcs over the boxes as before.
    var boxBottomY = unitY[u.unitId] !== undefined ? unitY[u.unitId] : (equipY + BOX_H);
    var trunkMidY = useShelf
      ? (shelfY + BOX_H + 4 + seq * TRUNK_STEP)
      : (equipY - 6 - seq * (isSmall ? 5 : 7));
    var drawTrunkRun = function(nudge) {
      ctx.beginPath();
      ctx.moveTo(srcX, equipY);
      ctx.lineTo(srcX, trunkMidY + nudge);
      ctx.lineTo(boxX, trunkMidY + nudge);
      ctx.lineTo(boxX, useShelf ? boxBottomY : equipY);
      ctx.stroke();
    };
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = CC_TRUNK_COLOR;
    drawTrunkRun(redundancy ? -2 : 0);
    if (redundancy) {
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = CC_TRUNK_BACKUP_COLOR;
      drawTrunkRun(2);
      ctx.setLineDash([]);
    }

    // Every trunk off a processor is the same length, so label the first one only —
    // repeating it under each box just produced a pile of overlapping numbers.
    if (seq > 1) return;
    var trunkLabelText = cfg.xdToProcessor + "'";
    var trunkLabelX = boxX;
    var trunkLabelY = trunkMidY - (redundancy ? 2 : 0);
    var trunkFontSize = isPdf ? 18 : (isSmall ? 8 : 10);
    ctx.font = 'bold ' + trunkFontSize + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var trunkTw = ctx.measureText(trunkLabelText).width + 6;
    var trunkTh = trunkFontSize + 6;
    ctx.fillStyle = CC_BG_COLOR;
    ctx.fillRect(trunkLabelX - trunkTw / 2, trunkLabelY - trunkTh / 2, trunkTw, trunkTh);
    ctx.fillStyle = isPrintMode ? ccFgColor : CC_TRUNK_COLOR;
    ctx.fillText(trunkLabelText, trunkLabelX, trunkLabelY);
    ctx.textBaseline = 'alphabetic';
  });

  // Every unit in the lane, plus the server
  if (typeof drawCableEquipmentBox === 'function') {
    laneSlots.forEach(function(slot) {
      drawCableEquipmentBox(ctx, slot.x - BOX_W / 2, slot.y, BOX_W, BOX_H, slot.label, slot.color);
    });
    drawCableEquipmentBox(ctx, serverCanvasX, serverBoxY, BOX_W, BOX_H, srvLabel, CC_SERVER_COLOR);
  }

  // Server-to-processor cable. It runs OVER the floor lane on its own line rather than
  // straight through the distro box, then drops into the processor's top edge — the same
  // treatment the proc→XD trunks get, one line clear of the topmost trunk.
  if (cfg.serverToProcessor > 0) {
    // With a shelf the trunks already fill the shelf-to-floor gap, so the server run goes
    // over the top of the shelf; on a single row it clears the topmost trunk instead.
    var serverRunY;
    if (useShelf) {
      serverRunY = shelfY - (isSmall ? 5 : 7);
    } else {
      var maxTrunkSeq = 0;
      Object.keys(trunkSeq).forEach(function(k) { if (trunkSeq[k] > maxTrunkSeq) maxTrunkSeq = trunkSeq[k]; });
      serverRunY = equipY - 6 - (maxTrunkSeq + 1) * (isSmall ? 5 : 7) - (isSmall ? 3 : 5);
    }
    // Never ride up into the screens
    serverRunY = Math.max(serverRunY, wallBottomY + 4);

    ctx.strokeStyle = CC_SERVER_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(serverCanvasX + BOX_W / 2, serverBoxY + BOX_H);
    ctx.lineTo(serverCanvasX + BOX_W / 2, serverRunY);
    ctx.lineTo(procCanvasX, serverRunY);
    ctx.lineTo(procCanvasX, equipY);
    ctx.stroke();

    // Server distance label on the vertical segment
    var srvLabelText = cfg.serverToProcessor + "'";
    var srvLabelX = serverCanvasX + BOX_W / 2 + 4;
    var srvLabelMidY = (serverBoxY + BOX_H + serverRunY) / 2;
    ctx.font = 'bold ' + (isPdf ? (isSmall ? 13 : 16) : (isSmall ? 7 : 10)) + 'px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var srvTw = ctx.measureText(srvLabelText).width + 6;
    ctx.fillStyle = CC_BG_COLOR;
    ctx.fillRect(srvLabelX, srvLabelMidY - 7, srvTw, 14);
    ctx.fillStyle = isPrintMode ? ccFgColor : CC_SERVER_COLOR;
    ctx.fillText(srvLabelText, srvLabelX + 2, srvLabelMidY);
    ctx.textBaseline = 'alphabetic';
  }

  // Cable picks are per screen — set on each screenPos above, drawn after the cables.

  // ---- Cable Offset Constants (matching per-screen diagram separation) ----
  var POWER_DROP_OFFSET = -3;      // power cables offset left of drop X
  var DATA_OFFSET = 6;             // primary data offset right of drop X
  var BACKUP_OFFSET = 16;          // backup data offset further right
  var DATA_WALL_OFFSET = 10;       // data runs 10px outside wall edge for visual separation
  // Every screen's converging runs get their OWN row in the band below the floor, so a
  // seven-screen rig reads as seven separate runs instead of one thick smear. Within a
  // row, power / data / backup are nudged apart.
  function screenFloorRow(order) { return floorY + FLOOR_BAND_TOP + order * FLOOR_ROW_STEP; }
  var ROW_POWER = 0;
  var ROW_DATA = FLOOR_ROW_STEP * 0.32;
  var ROW_BACKUP = FLOOR_ROW_STEP * 0.64;

  // ---- Unified Power (SOCA) Cable Routing ----
  // All circuits from all screens route to ONE drop → floor → distro
  screenPos.forEach(function(sp) {
    var calc = sp.calc;
    if (!calc) return;

    var screenLeft = toX(sp.x);
    var screenTop = toY(sp.y);
    var screenBottom = toY(sp.y + sp.height);
    var pxW = panelSize * pxToCanvas;

    // One cable per SOCA. Spans come from the screen's as-assigned grouping when available
    // (calc.socaSpans), falling back to the geometric soca s = circuits s*6..s*6+5.
    var socaRuns = (Array.isArray(calc.socaSpans) && calc.socaSpans.length)
      ? calc.socaSpans.map(function(span) {
          return {
            firstCol: Math.max(0, Math.min(span.firstCol, calc.pw - 1)),
            lastCol: Math.max(0, Math.min(span.lastCol, calc.pw - 1))
          };
        })
      : Array.from({ length: calc.socaCount }, function(_unused, si) {
          var firstCircuit = si * 6;
          var lastCircuit = Math.min(firstCircuit + 5, calc.circuitsNeeded - 1);
          return {
            firstCol: firstCircuit * calc.columnsPerCircuit,
            lastCol: Math.min((lastCircuit + 1) * calc.columnsPerCircuit - 1, calc.pw - 1)
          };
        });

    for (var si = 0; si < socaRuns.length; si++) {
      var firstCol = socaRuns[si].firstCol;
      var lastCol = socaRuns[si].lastCol;
      var landingCenterX = screenLeft + ((firstCol + lastCol + 1) / 2) * pxW;

      // Snap the feed point off any deleted panel it lands on, staying within
      // this SOCA's own column span (mirrors the data-cable edge-row search)
      var dp = calc.deletedPanelsSet || new Set();
      var edgeRow = (sp.cab.powerInPosition === 'bottom') ? (calc.effectivePh - 1) : 0;
      var colUnder = Math.min(lastCol, Math.floor((firstCol + lastCol + 1) / 2));
      if (colUnder < firstCol) colUnder = firstCol;
      if (dp.size > 0 && dp.has(colUnder + ',' + edgeRow)) {
        var foundInSpan = false;
        for (var pdist = 1; pdist <= lastCol - firstCol; pdist++) {
          if (colUnder - pdist >= firstCol && !dp.has((colUnder - pdist) + ',' + edgeRow)) {
            landingCenterX = screenLeft + (colUnder - pdist + 0.5) * pxW; foundInSpan = true; break;
          }
          if (colUnder + pdist <= lastCol && !dp.has((colUnder + pdist) + ',' + edgeRow)) {
            landingCenterX = screenLeft + (colUnder + pdist + 0.5) * pxW; foundInSpan = true; break;
          }
        }
        if (!foundInSpan && typeof findNearestNonDeleted === 'function') {
          var nn = findNearestNonDeleted(colUnder, edgeRow, calc.pw, calc.effectivePh, dp);
          landingCenterX = screenLeft + (nn.col + 0.5) * pxW;
        }
      }

      // Each screen's SOCAs come down THAT screen's own drop, then run along the floor
      // to the distro. A small per-screen lane offset keeps converging runs readable.
      var spDropX = sp.dropX;
      var spPowerFloorY = screenFloorRow(sp.order) + ROW_POWER;
      ctx.strokeStyle = CC_POWER_COLOR;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();

      var powerEdgeY = (sp.cab.powerInPosition === 'bottom') ? screenBottom + 14 : screenTop - 14;
      var powerStartY = (sp.cab.powerInPosition === 'bottom') ? screenBottom : screenTop;
      ctx.moveTo(landingCenterX + POWER_DROP_OFFSET, powerStartY);
      ctx.lineTo(landingCenterX + POWER_DROP_OFFSET, powerEdgeY);
      ctx.lineTo(spDropX + POWER_DROP_OFFSET, powerEdgeY);
      if (sp.cab.cablePick > 0 && sp.pickCX !== undefined) {
        ctx.lineTo(sp.pickCX + POWER_DROP_OFFSET, sp.pickCY);
        ctx.lineTo(sp.pickCX + POWER_DROP_OFFSET, spPowerFloorY);
      } else {
        ctx.lineTo(spDropX + POWER_DROP_OFFSET, spPowerFloorY);
      }
      ctx.lineTo(distroCanvasX, spPowerFloorY);
      ctx.lineTo(distroCanvasX, distroEquipY + BOX_H);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  });

  // ---- Per-screen Data Cable Routing ----
  // Each screen's data lines come down THAT screen's own drop and then run along the floor
  // to the specific processor or XD box those lines are assigned to. buildDataPortPlan()
  // already resolved that mapping globally, so two screens sharing a unit converge on one
  // box here rather than each getting their own.
  var hasDistBox = calcData.shared.distributionBoxCount > 0;

  // Canvas-space bounding box, still needed for the wall-edge lanes and dimension lines
  var bbCanvasL = toX(bbL);
  var bbCanvasR = toX(bbR);
  var bbCanvasT = toY(bbT);
  var bbCanvasB = toY(bbB);
  var bbCanvasW = bbCanvasR - bbCanvasL;

  // Where one data line terminates on the floor. Backups land on their own loop-back
  // box on a paired_boxes processor, so they get their own target.
  function lineTargetX(screenId, lineNum, place, useBackup) {
    try {
      var plan = cachedDataPortPlan();
      var lineMap = plan.perScreen.get(screenId);
      var dest = lineMap && lineMap.get(lineNum);
      if (!dest) return procCanvasX;
      var group = plan.groups.get(dest.groupKey);
      var box = useBackup && dest.backup ? dest.backup.box : dest.box;
      if (place === 'remote' && group && group.usesDistBox && box !== null && box !== undefined) {
        var boxUnitId = dest.groupKey + '|' + dest.proc + '|' + box;
        if (unitX[boxUnitId] !== undefined) return unitX[boxUnitId];
      }
      var procUnitId = dest.groupKey + '|' + dest.proc + '|-';
      if (unitX[procUnitId] !== undefined) return unitX[procUnitId];
    } catch (err) { /* fall through */ }
    return procCanvasX;
  }

  screenPos.forEach(function(sp) {
    var calc = sp.calc;
    if (!calc) return;

    var place = sp.cab.xdPlacement;
    var panelType = sp.data.panelType || 'CB5_MKII';
    var heightRatio = typeof getPanelHeightRatio === 'function' ? getPanelHeightRatio(panelType) : 1;
    var pxW = panelSize * pxToCanvas;
    var pxH = panelSize * heightRatio * pxToCanvas;
    var dp = calc.deletedPanelsSet || new Set();

    var dataFlip = sp.data.dataFlip || false;
    var entryPts = dataFlip ? (calc.exitPoints || {}) : (calc.entryPoints || {});
    var exitPts  = dataFlip ? (calc.entryPoints || {}) : (calc.exitPoints || {});

    // Per-screen floor lane so converging runs stay individually readable
    var spRow = screenFloorRow(sp.order);
    var spDataFloorY = spRow + ROW_DATA;
    var spBackupFloorY = spRow + ROW_BACKUP;

    // Collect this screen's points, tagged with where each line terminates
    var mains = [], backups = [];
    for (var dl = 0; dl < calc.dataLines; dl++) {
      var e = entryPts[dl];
      if (e) mains.push({ col: e.col, row: e.row, targetX: lineTargetX(sp.screenId, dl + 1, place, false),
                          cx: sp.left + (e.col + 0.5) * pxW, cy: sp.top + (e.row + 0.5) * pxH });
      var x = exitPts[dl];
      if (x) backups.push({ col: x.col, row: x.row, targetX: lineTargetX(sp.screenId, dl + 1, place, true),
                            cx: sp.left + (x.col + 0.5) * pxW, cy: sp.top + (x.row + 0.5) * pxH });
    }
    if (!mains.length) return;

    // ---- ON WALL: the box sits on this screen; fan across the panels, trunk down ----
    if (place === 'wall' && hasDistBox) {
      var dbHoriz = sp.data.distBoxMainHorizPosition || sp.data.distBoxHorizPosition || 'center';
      var dbVert = sp.data.distBoxMainVertPosition || 'top';
      // Panel-quantised, matching the per-screen diagram and the gear-list length math
      var dbX = (dbHoriz === 'sr') ? sp.left + 2 * pxW
              : (dbHoriz === 'sl') ? sp.right - 2 * pxW
              : (sp.left + sp.right) / 2;
      dbX = Math.max(sp.left + 20, Math.min(sp.right - 20, dbX));
      var dbY = (dbVert === 'bottom') ? sp.bottom - 18 - 6 : sp.top + 6;
      var fanY = dbY + 9;

      mains.forEach(function(ep) {
        ctx.strokeStyle = CC_DATA_COLOR;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(ep.cx < dbX ? dbX - 20 : dbX + 20, fanY - (redundancy ? 3 : 0));
        ctx.lineTo(ep.cx - 2, fanY - (redundancy ? 3 : 0));
        ctx.lineTo(ep.cx - 2, ep.cy);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });
      if (redundancy) {
        backups.forEach(function(ep) {
          ctx.strokeStyle = CC_BACKUP_COLOR;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.moveTo(ep.cx < dbX ? dbX - 20 : dbX + 20, fanY + 3);
          ctx.lineTo(ep.cx + 2, fanY + 3);
          ctx.lineTo(ep.cx + 2, ep.cy);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        });
      }

      // Trunk: box → screen top edge → own drop → pick → floor → its processor
      var wallTrunkTargetX = mains[0].targetX;
      var trunkEdgeY = sp.top - 4;
      ctx.strokeStyle = CC_TRUNK_COLOR;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(dbX + DATA_OFFSET, dbVert === 'bottom' ? dbY + 18 : dbY);
      ctx.lineTo(dbX + DATA_OFFSET, trunkEdgeY);
      ctx.lineTo(sp.dropX + DATA_OFFSET, trunkEdgeY);
      if (sp.cab.cablePick > 0 && sp.pickCX !== undefined) {
        ctx.lineTo(sp.pickCX + DATA_OFFSET, sp.pickCY);
        ctx.lineTo(sp.pickCX + DATA_OFFSET, spDataFloorY);
      } else {
        ctx.lineTo(sp.dropX + DATA_OFFSET, spDataFloorY);
      }
      ctx.lineTo(wallTrunkTargetX, spDataFloorY);
      ctx.lineTo(wallTrunkTargetX, dataEndYFor(wallTrunkTargetX));
      ctx.stroke();

      if (typeof drawCableEquipmentBox === 'function') {
        drawCableEquipmentBox(ctx, dbX - 20, dbY, 40, 18, 'XD', CC_DISTBOX_COLOR);
      }
      return;
    }

    // ---- AT PROC / REMOTE: fan to this screen's own drop, then run to each target ----
    // Fan segments: entry panel → this screen's own top/bottom edge → its own drop
    function drawFan(points, color, width, alpha, offsetX) {
      points.forEach(function(ep) {
        var isBottom = ep.row >= calc.effectivePh / 2;
        var wallEdgeY = isBottom ? sp.bottom + DATA_WALL_OFFSET : sp.top - DATA_WALL_OFFSET;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.globalAlpha = alpha;
        ctx.beginPath();

        var targetRow = isBottom ? calc.effectivePh - 1 : 0;
        var targetCol = ep.col;
        if (dp.size > 0 && dp.has(targetCol + ',' + targetRow)) {
          var found = false;
          for (var d = 1; d < calc.pw; d++) {
            if (targetCol - d >= 0 && !dp.has((targetCol - d) + ',' + targetRow)) { targetCol -= d; found = true; break; }
            if (targetCol + d < calc.pw && !dp.has((targetCol + d) + ',' + targetRow)) { targetCol += d; found = true; break; }
          }
          if (!found && typeof findNearestNonDeleted === 'function') {
            var nn = findNearestNonDeleted(targetCol, targetRow, calc.pw, calc.effectivePh, dp);
            targetCol = nn.col; targetRow = nn.row;
          }
        }
        if (dp.size > 0 && typeof findCableGridPath === 'function') {
          var path = findCableGridPath(ep.col, ep.row, targetCol, targetRow, calc.pw, calc.effectivePh, dp);
          if (path && path.length) {
            ctx.moveTo(ep.cx + offsetX * 0.2, ep.cy);
            path.forEach(function(node) {
              ctx.lineTo(sp.left + (node.col + 0.5) * pxW + offsetX * 0.2, sp.top + (node.row + 0.5) * pxH);
            });
            ctx.lineTo(sp.left + (targetCol + 0.5) * pxW + offsetX * 0.2, wallEdgeY);
          } else {
            ctx.moveTo(ep.cx + offsetX * 0.2, ep.cy);
            ctx.lineTo(ep.cx + offsetX * 0.2, wallEdgeY);
          }
        } else {
          ctx.moveTo(ep.cx + offsetX * 0.2, ep.cy);
          ctx.lineTo(ep.cx + offsetX * 0.2, wallEdgeY);
        }
        ctx.lineTo(sp.dropX + offsetX, wallEdgeY);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });
    }

    // Bundle: this screen's drop → pick → floor → each distinct target unit
    function drawBundles(points, color, width, offsetX, floorTargetY, extraX) {
      var byTarget = {};
      points.forEach(function(ep) { (byTarget[ep.targetX] = byTarget[ep.targetX] || []).push(ep); });
      Object.keys(byTarget).forEach(function(key, i) {
        var tx = parseFloat(key) + extraX;
        var hasTop = byTarget[key].some(function(ep) { return ep.row < calc.effectivePh / 2; });
        var startY = hasTop ? sp.top - DATA_WALL_OFFSET : sp.bottom + DATA_WALL_OFFSET;
        var fy = floorTargetY + i * 3;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(sp.dropX + offsetX, startY);
        if (sp.cab.cablePick > 0 && sp.pickCX !== undefined) {
          ctx.lineTo(sp.pickCX + offsetX, sp.pickCY);
          ctx.lineTo(sp.pickCX + offsetX, fy);
        } else {
          ctx.lineTo(sp.dropX + offsetX, fy);
        }
        ctx.lineTo(tx, fy);
        ctx.lineTo(tx, dataEndYFor(parseFloat(key)));
        ctx.stroke();
      });
    }

    drawBundles(mains, CC_DATA_COLOR, 2.5, DATA_OFFSET, spDataFloorY, 0);
    drawFan(mains, CC_DATA_COLOR, 1.5, 0.6, DATA_OFFSET);
    if (redundancy && backups.length) {
      drawBundles(backups, CC_BACKUP_COLOR, 2, BACKUP_OFFSET, spBackupFloorY, 8);
      drawFan(backups, CC_BACKUP_COLOR, 1.2, 0.45, BACKUP_OFFSET);
    }
  });

  // ---- Draw each screen's cable pick ON TOP of its cables ----
  screenPos.forEach(function(sp) {
    if (!(sp.cab.cablePick > 0) || sp.pickCX === undefined) return;

    // Fill background to erase cable lines inside the circle
    ctx.fillStyle = CC_BG_COLOR;
    ctx.beginPath();
    ctx.arc(sp.pickCX, sp.pickCY, PICK_RADIUS + 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = CC_PICK_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sp.pickCX, sp.pickCY, PICK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = isPrintMode ? ccFgColor : CC_PICK_COLOR;
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PICK', sp.pickCX, sp.pickCY);
    ctx.textBaseline = 'alphabetic';

    if (typeof drawCableDimensionLine === 'function') {
      var pos = sp.cab.cableDropPosition;
      if (pos === 'behind') {
        var pickDimX = sp.pickCX - (isSmall ? 15 : 25);
        drawCableDimensionLine(ctx, pickDimX, sp.pickCY - PICK_RADIUS, pickDimX, sp.top,
          sp.cab.cablePick + "'", ccDimColor, CC_BG_COLOR);
      } else if (pos === 'sr') {
        var pickDimY = sp.pickCY - PICK_RADIUS - 14;
        drawCableDimensionLine(ctx, sp.pickCX - PICK_RADIUS, pickDimY, sp.left, pickDimY,
          sp.cab.cablePick + "'", ccDimColor, CC_BG_COLOR);
      } else {
        var pickDimY2 = sp.pickCY - PICK_RADIUS - 14;
        drawCableDimensionLine(ctx, sp.right, pickDimY2, sp.pickCX + PICK_RADIUS, pickDimY2,
          sp.cab.cablePick + "'", ccDimColor, CC_BG_COLOR);
      }
    }
  });

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
    ctx.font = 'bold ' + (isPdf ? (isSmall ? '15' : '17') : (isSmall ? '9' : '11')) + 'px Arial';
    ctx.textAlign = 'center';
    var labelW = ctx.measureText(labelText).width + 6;
    var labelH = isSmall ? 15 : 17;
    var labelX = screenLeft + screenW / 2;
    var labelY = screenTop - 14;
    ctx.fillStyle = CC_BG_COLOR;
    ctx.fillRect(labelX - labelW / 2, labelY - labelH, labelW, labelH + 2);
    ctx.fillStyle = isPrintMode ? ccFgColor : screenColor;
    ctx.fillText(labelText, labelX, labelY);
  });

  // ---- Dimension Lines ----
  if (typeof drawCableDimensionLine === 'function') {
    // Combined wall width — above bounding box (tighter on mobile to avoid label overlap)
    var totalWidthFt = bbW / ftToPx;
    var dimAboveWall = isSmall ? 16 : 32;
    drawCableDimensionLine(ctx, bbCanvasL, bbCanvasT - dimAboveWall, bbCanvasR, bbCanvasT - dimAboveWall,
      Math.round(totalWidthFt * 10) / 10 + '\'', ccDimColor, CC_BG_COLOR);

    // Combined wall height — SL: left side to avoid drop/pick overlap; otherwise right side
    var totalHeightFt = bbH / ftToPx;
    if (dropPos === 'sl') {
      var dimOffL1 = isSmall ? 8 : 15;
      drawCableDimensionLine(ctx, bbCanvasL - dimOffL1, bbCanvasT, bbCanvasL - dimOffL1, bbCanvasB,
        Math.round(totalHeightFt * 10) / 10 + '\'', ccDimColor, CC_BG_COLOR);
    } else {
      var dimOffR1 = isSmall ? 8 : 15;
      drawCableDimensionLine(ctx, bbCanvasR + dimOffR1, bbCanvasT, bbCanvasR + dimOffR1, bbCanvasB,
        Math.round(totalHeightFt * 10) / 10 + '\'', ccDimColor, CC_BG_COLOR);
    }

    // Wall-to-floor — SL: left side; otherwise right side
    if (cfg.wallToFloor > 0) {
      if (dropPos === 'sl') {
        var dimOffL2 = isSmall ? 18 : 35;
        drawCableDimensionLine(ctx, bbCanvasL - dimOffL2, bbCanvasB, bbCanvasL - dimOffL2, floorY,
          cfg.wallToFloor + '\'', ccDimColor, CC_BG_COLOR);
      } else {
        var dimOffR2 = isSmall ? 18 : 35;
        drawCableDimensionLine(ctx, bbCanvasR + dimOffR2, bbCanvasB, bbCanvasR + dimOffR2, floorY,
          cfg.wallToFloor + '\'', ccDimColor, CC_BG_COLOR);
      }
    }

    // Distances to the drop — below floor, nested so the box nearest the wall reads
    // first. The lane is fixed, so these only ever change their label, never their
    // extent. Proc-to-XD is labelled on the run itself rather than measured here.
    // Measured from the nearest screen edge, since each screen now has its own drop.
    var dimAnchorX = bbCanvasL;
    // Sit under the per-screen floor rows rather than on top of them
    var dimRowY = floorY + floorBandPx + 10;
    if (floorBoxes.length) {
      drawCableDimensionLine(ctx, unitX[floorBoxes[0].unitId], dimRowY, dimAnchorX, dimRowY,
        minXdToWall + "'", ccDimColor, CC_BG_COLOR);
      dimRowY += 15;
    }
    drawCableDimensionLine(ctx, procCanvasX, dimRowY, dimAnchorX, dimRowY,
      cfg.processorToWall + "'", ccDimColor, CC_BG_COLOR);
    dimRowY += 15;
    drawCableDimensionLine(ctx, distroCanvasX, dimRowY, dimAnchorX, dimRowY,
      cfg.distroToWall + "'", ccDimColor, CC_BG_COLOR);
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
  if (floorBoxes.length) {
    legendItems.push({ color: CC_DISTBOX_COLOR, label: 'Dist Box' });
    legendItems.push({ color: CC_TRUNK_COLOR, label: redundancy ? 'Main Trunk' : 'Trunk' });
    if (redundancy) legendItems.push({ color: CC_TRUNK_BACKUP_COLOR, label: 'Backup Trunk' });
  }
  if (cfg.cablePick > 0) legendItems.push({ color: CC_PICK_COLOR, label: 'Pick' });

  var legendFontSize = isPdf ? (isSmall ? 14 : 16) : (isSmall ? 8 : 9);
  var legendSpacing = isPdf ? (isSmall ? 26 : 38) : (isSmall ? 18 : 28);
  var legendSq = isPdf ? 14 : 8;
  var legendTx = isPdf ? 18 : 12;
  ctx.font = legendFontSize + 'px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  var legendX = MARGIN.left + 4;
  var legendY = isPdf ? canvasH - 24 : canvasH - 22;
  var legendMaxX = canvasW - MARGIN.right;

  for (var li = 0; li < legendItems.length; li++) {
    var item = legendItems[li];
    var itemW = ctx.measureText(item.label).width + legendTx + legendSpacing;
    // Wrap to next row if this item would overflow
    if (legendX + itemW > legendMaxX && legendX > MARGIN.left + 10) {
      legendX = MARGIN.left + 4;
      legendY += isPdf ? 18 : 14;
    }
    ctx.fillStyle = item.color;
    ctx.fillRect(legendX, legendY - legendSq / 2, legendSq, legendSq);
    ctx.fillStyle = ccLegendTextColor;
    ctx.fillText(item.label, legendX + legendTx, legendY);
    legendX += ctx.measureText(item.label).width + legendSpacing;
  }

  // ---- Summary Text ----
  ctx.fillStyle = ccSummaryColor;
  ctx.font = (isPdf ? (isSmall ? 14 : 16) : (isSmall ? 8 : 9)) + 'px Arial';
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
