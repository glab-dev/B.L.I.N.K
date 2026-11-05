// ==================== FREE-DRAW POWER ====================
// Power for drawn (free) screens. The grid power helpers (assignCircuits, assignSocas,
// computeSocaSpans, computePhaseBalance) run on a cell grid: every snap cell is a grid
// slot and only a panel's top-left cell is live, so circuits and SOCAs are keyed by the
// panel keys ("gx,gy") the custom circuit/SOCA Maps already use. Circuits fill by panel
// count like grid screens; watts and amps come from each panel's own type.

let freePowerState = null;         // last calculateFreePower() result, read by the canvas

function freePanelWatts(p, powerType) {
  return powerType === 'max' ? (p.power_max_w || 0) : (p.power_avg_w || p.power_max_w * 0.5 || 0);
}

// The cell grid a free screen's power runs on: cols × rows snap cells, every cell that
// isn't a panel's top-left one "deleted", and each panel's watts by its key.
function freeCellGrid(data, allPanels, powerType) {
  const b = freeBounds(data.freePanels, allPanels, data.freeCell_mm);
  const cols = b ? b.maxX : 0, rows = b ? b.maxY : 0;
  const watts = new Map();
  data.freePanels.forEach(fp => watts.set(`${fp.gx},${fp.gy}`, freePanelWatts(allPanels[fp.type], powerType)));
  const deleted = new Set();
  for(let x = 0; x < cols; x++) for(let y = 0; y < rows; y++) if(!watts.has(`${x},${y}`)) deleted.add(`${x},${y}`);
  return {cols, rows, deleted, watts};
}

// Panels per circuit: counted like grid screens, sized off the hungriest panel on the
// wall so a full circuit can't go over the breaker whichever sizes it picks up. With
// nothing drawn yet it is sized off `emptyWallW`, the panel about to be drawn.
function freeSuggestedPanelsPerCircuit(watts, voltage, breaker, derate, emptyWallW) {
  const sizingW = watts.size ? Math.max(...watts.values()) : emptyWallW;
  return Math.max(1, Math.floor((voltage * breaker * derate) / Math.max(1, sizingW || 0)));
}

// resolveScreenPowerInputs() for a drawn screen, from its saved data: the cell grid, each
// panel's own watts (perPanelW is 1 so circuit "counts" summed from wattsByKey are watts).
function freeScreenPowerInputs(data) {
  const allPanels = getAllPanels();
  if(!data.freePanels.length || !data.freePanels.every(fp => allPanels[fp.type])) return null;
  const grid = freeCellGrid(data, allPanels, data.powerType || 'max');
  const voltage = parseInt(data.voltage) || 208;
  const breaker = parseInt(data.breaker) || 20;
  const derate = data.derate ? 0.8 : 1.0;
  const userMax = parseInt(data.maxPanelsPerCircuit);
  const toMap = v => v instanceof Map ? v : new Map(Array.isArray(v) ? v : (v && v.entries ? [...v.entries()] : []));
  return {
    pw: grid.cols, ph: grid.rows,
    panelsPerCircuit: userMax > 0 ? userMax : freeSuggestedPanelsPerCircuit(grid.watts, voltage, breaker, derate),
    deletedPanels: grid.deleted,
    customCircuit: toMap(data.customCircuitAssignments),
    customSoca: toMap(data.customSocaAssignments),
    perPanelW: 1, wattsByKey: grid.watts,
    totalW: [...grid.watts.values()].reduce((a, w) => a + w, 0),
    voltage,
    wiring: (typeof resolveDistroWiring === 'function') ? resolveDistroWiring(voltage) : null,
    phase: parseInt(data.phase) || 1,
    isFree: true
  };
}

// Circuits, SOCAs, per-panel watts and the 3-phase load for the current free screen,
// from the live power settings and custom circuit/SOCA Maps. Phase Balance and Share
// Distro follow the grid path in calculate(): the canvas and SOCA table show the circuits
// actually in use, while socaSpans and twofers stay as-wired (the cables' source of truth).
function calculateFreePower(data, allPanels) {
  const powerType = document.getElementById('powerType').value;
  const voltage = parseFloat(document.getElementById('voltage').value) || 220;
  const breaker = parseFloat(document.getElementById('breaker').value) || 20;
  const phase = parseInt(document.getElementById('phase').value) || 3;
  const derate = (document.getElementById('derate') && document.getElementById('derate').value === 'on') ? 0.8 : 1.0;

  const cellMm = data.freeCell_mm;
  const {cols, rows, deleted, watts} = freeCellGrid(data, allPanels, powerType);
  const pickedPanel = allPanels[document.getElementById('panelType').value];
  const calculatedPanelsPerCircuit = freeSuggestedPanelsPerCircuit(watts, voltage, breaker, derate, pickedPanel ? freePanelWatts(pickedPanel, powerType) : 0);
  const userMax = parseInt(document.getElementById('maxPanelsPerCircuit').value);
  const panelsPerCircuit = userMax > 0 ? userMax : calculatedPanelsPerCircuit;
  const maxInput = document.getElementById('maxPanelsPerCircuit');
  if(maxInput) maxInput.placeholder = calculatedPanelsPerCircuit.toString();

  const { panelToCircuit, circuitCounts } = assignCircuits(cols, rows, panelsPerCircuit, deleted, customCircuitAssignments);
  const panelToSoca = assignSocas(panelToCircuit, customSocaAssignments);
  const circuitWatts = circuitWattsOf(panelToCircuit, watts);

  // Circuits shown on the canvas and in the SOCA table: as-wired unless Phase Balance
  // (or the shared-distro group plan) re-circuits them
  let shownPanelToCircuit = panelToCircuit;
  let phaseBalance = null, sharedDistroTotal = null, socaLabelMap = null;
  if(phase === 3 && circuitWatts.size) {
    const wiring = (typeof resolveDistroWiring === 'function') ? resolveDistroWiring(voltage) : null;
    const pbMode = (typeof phaseBalanceMode !== 'undefined') ? phaseBalanceMode : 'aswired';
    const shared = !!data.sharedDistro;
    const groupPlan = (shared && typeof sharedDistroBalancedPlan === 'function') ? sharedDistroBalancedPlan() : null;
    const groupEntry = (groupPlan && groupPlan.useBalanced) ? groupPlan.byScreen.get(currentScreenId) : null;
    // computePhaseBalance multiplies each circuit's count by one panel's watts; circuit
    // watts with 1 W per "panel" give the real load of a mixed circuit
    if(groupEntry) {
      phaseBalance = computePhaseBalance(groupEntry.circuitWatts, 1, voltage, 'aswired', wiring);
      phaseBalance.balanceMode = true;
      phaseBalance.balanceApplied = true;
      phaseBalance.aswiredImbalancePct = groupPlan.aswiredImbalancePct;
      phaseBalance.groupBalanced = true;
      shownPanelToCircuit = groupEntry.panelToCircuit;
    } else if(pbMode === 'balanced') {
      const bal = resolveBalancedCircuits(cols, rows, panelsPerCircuit, deleted, wiring, customCircuitAssignments, customSocaAssignments, 1, voltage, watts);
      phaseBalance = bal.phaseBalance;
      phaseBalance.balanceMode = true;
      phaseBalance.balanceApplied = bal.useBalanced;
      phaseBalance.aswiredImbalancePct = bal.aswiredImbalancePct;
      if(bal.useBalanced) shownPanelToCircuit = bal.panelToCircuit;
    } else {
      phaseBalance = computePhaseBalance(circuitWatts, 1, voltage, pbMode, wiring);
    }
    if(shared) {
      sharedDistroTotal = freeSharedDistroTotal(groupPlan, {cols, rows, deleted, watts, panelsPerCircuit, voltage, wiring});
      if(typeof sharedDistroLabelPlan === 'function') {
        const plan = sharedDistroLabelPlan({
          screenId: currentScreenId,
          distinct: [...new Set([...panelToSoca.values()])].sort((a, b) => a - b),
          explicit: explicitSocaIndices(panelToCircuit, customSocaAssignments)
        });
        const m = plan.get(currentScreenId);
        if(m) socaLabelMap = [...m.entries()];
      }
    }
  }
  const shownPanelToSoca = (shownPanelToCircuit === panelToCircuit) ? panelToSoca : assignSocas(shownPanelToCircuit, customSocaAssignments);

  // SOCA spans over every cell a panel covers, so cable runs land on real panel edges
  const cellToCircuit = new Map(), cellToSoca = new Map();
  data.freePanels.forEach(fp => {
    const key = `${fp.gx},${fp.gy}`;
    const {cw, ch} = freeCells(allPanels[fp.type], cellMm);
    for(let i = 0; i < cw; i++) for(let j = 0; j < ch; j++) {
      cellToCircuit.set(`${fp.gx + i},${fp.gy + j}`, panelToCircuit.get(key));
      cellToSoca.set(`${fp.gx + i},${fp.gy + j}`, panelToSoca.get(key));
    }
  });
  const socaSpans = computeSocaSpans(cellToCircuit, cellToSoca);
  const lm = socaLabelMap ? new Map(socaLabelMap) : null;
  socaSpans.forEach(sp => { sp.labelIdx = (lm && lm.has(sp.socaIdx)) ? lm.get(sp.socaIdx) : sp.socaIdx; });

  freePowerState = {
    panelToCircuit: shownPanelToCircuit, panelToSoca: shownPanelToSoca,
    circuitWatts, watts,
    panelsPerCircuit,
    circuitsNeeded: circuitCounts.size,
    socaCount: new Set(panelToSoca.values()).size,
    socaSpans,
    true1Twofers: freeTrue1Twofers(data, allPanels, panelToCircuit),
    socaBreakdown: computeSocaBreakdown(null, shownPanelToCircuit, shownPanelToSoca, 1, voltage, watts),
    phaseBalance, sharedDistroTotal, socaLabelMap
  };
  return freePowerState;
}

// Combined load of every Share Distro screen when the open screen is a drawn one — the
// same totals calculate() builds for a grid screen. Each screen's circuits come from the
// group plan when it is balanced, else as wired; its watts from its own panels.
function freeSharedDistroTotal(groupPlan, cur) {
  const pairW = { XY: 0, YZ: 0, ZX: 0 };
  const singleW = { X: 0, Y: 0, Z: 0 };
  const addCircuit = c => { if(pairW[c.pair] !== undefined) pairW[c.pair] += c.amps; else if(singleW[c.pair] !== undefined) singleW[c.pair] += c.amps; };
  let comboWatts = 0, comboScreens = 0;
  Object.keys(screens).forEach(sid => {
    const sd = screens[sid] && screens[sid].data;
    if(!sd || !sd.sharedDistro) return;
    const e = (groupPlan && groupPlan.useBalanced) ? groupPlan.byScreen.get(sid) : null;
    if(sid === currentScreenId) {
      // Live values: the custom Maps are the globals, the panels the drawn list
      const pc = e ? computePhaseBalance(e.circuitWatts, 1, cur.voltage, 'aswired', cur.wiring).perCircuit
        : screenCircuitContributions(cur.cols, cur.rows, cur.panelsPerCircuit, cur.deleted, customCircuitAssignments, customSocaAssignments, 1, cur.voltage, cur.wiring, cur.watts).perCircuit;
      pc.forEach(addCircuit);
      comboWatts += [...cur.watts.values()].reduce((a, w) => a + w, 0);
      comboScreens++;
      return;
    }
    const inp = resolveScreenPowerInputs(sd);
    if(!inp || inp.phase !== 3) return;
    const half = inp.isFree ? { top: 0, bottom: 0 } : getCB5HalfRows(sd, sd.panelType || 'CB5_MKII');
    const pc = e ? computePhaseBalance(e.circuitWatts || e.circuitCounts, e.circuitWatts ? 1 : inp.perPanelW, inp.voltage, 'aswired', inp.wiring).perCircuit
      : screenCircuitContributions(inp.pw, inp.ph, inp.panelsPerCircuit, shiftCB5RowKeys(inp.deletedPanels, -half.top),
          shiftCB5RowKeys(inp.customCircuit, -half.top), shiftCB5RowKeys(inp.customSoca, -half.top), inp.perPanelW, inp.voltage, inp.wiring, inp.wattsByKey).perCircuit;
    pc.forEach(addCircuit);
    if(inp.isFree) {
      comboWatts += inp.totalW;
    } else {
      // Grid screens count their CB5 half-panel rows too, as calculate() does
      const live = countCB5LivePanels(inp.pw, inp.ph, half, inp.deletedPanels);
      let screenW = live.full * inp.perPanelW;
      const halfP = live.half > 0 ? getAllPanels()['CB5_MKII_HALF'] : null;
      if(halfP) screenW += live.half * ((sd.powerType || 'max') === 'max' ? (halfP.power_max_w || 0) : (halfP.power_avg_w || halfP.power_max_w * 0.5 || 0));
      comboWatts += screenW;
    }
    comboScreens++;
  });
  const phasor = legAmpsFromPairWatts(pairW, 1);
  const la = { X: phasor.X + singleW.X, Y: phasor.Y + singleW.Y, Z: phasor.Z + singleW.Z };
  const arr = [la.X, la.Y, la.Z];
  const peak = Math.max(...arr), min = Math.min(...arr);
  return { screenCount: comboScreens, power: comboWatts, legAmps: la, peakLeg: peak, imbalancePct: peak > 0 ? ((peak - min) / peak) * 100 : 0, sharedDistro: true };
}

// True1 twofers: a circuit feeding n columns needs n - 1. On a drawn wall a column is a
// run of panels whose widths overlap, so two 500 wide panels under one 1000 wide panel
// share its column, while two 1000 wide panels side by side are two columns.
function freeTrue1Twofers(data, allPanels, panelToCircuit) {
  const spansByCircuit = new Map();
  data.freePanels.forEach(fp => {
    const circuit = panelToCircuit.get(`${fp.gx},${fp.gy}`);
    if(circuit === undefined) return;
    if(!spansByCircuit.has(circuit)) spansByCircuit.set(circuit, []);
    spansByCircuit.get(circuit).push([fp.gx, fp.gx + freeCells(allPanels[fp.type], data.freeCell_mm).cw]);
  });
  let twofers = 0;
  spansByCircuit.forEach(spans => {
    spans.sort((a, b) => a[0] - b[0]);
    let columns = 0, end = -Infinity;
    spans.forEach(([x0, x1]) => {
      if(x0 >= end) columns++;
      end = Math.max(end, x1);
    });
    twofers += columns - 1;
  });
  return twofers;
}

// Draws a drawn screen's power: every panel at its true size from (ox, oy) at cellPx a snap
// cell, coloured by circuit (or by leg) and labelled SOCA.circuit, with the SOCA outlines
// and labels the grid canvas draws. Shared by the Draw tab and the Combined view.
// o: {panelToCircuit, panelToSoca, socaLabelIdx, customCircuit, circuitToPair, legColorOn,
//     ox, oy, cellPx, sel, labelSize(w), holeBlocked}
function drawFreePowerPanels(ctx, data, allPanels, o) {
  const toX = g => o.ox + Math.round(g * o.cellPx);
  const toY = g => o.oy + Math.round(g * o.cellPx);
  const legPairColor = pair => {
    const base = { XY: '#ff5277', YZ: '#36c5f0', ZX: '#ffd23f', X: '#ff5277', Y: '#36c5f0', Z: '#ffd23f' }[pair] || '#cccccc';
    return greyscalePrintMode ? toGreyscale(base) : (ecoPrintMode ? toPastelColor(base) : base);
  };

  // Cell-level circuit/SOCA maps so the SOCA overlay outlines each panel's real footprint
  const cellToCircuit = new Map(), cellToSoca = new Map();
  data.freePanels.forEach(fp => {
    const key = `${fp.gx},${fp.gy}`;
    const circuit = o.panelToCircuit.get(key);
    if(circuit === undefined) return;
    const soca = o.panelToSoca.get(key);
    const {cw, ch} = freeCells(allPanels[fp.type], data.freeCell_mm);
    const x = toX(fp.gx), y = toY(fp.gy);
    const w = toX(fp.gx + cw) - x, h = toY(fp.gy + ch) - y;
    for(let i = 0; i < cw; i++) for(let j = 0; j < ch; j++) {
      cellToCircuit.set(`${fp.gx + i},${fp.gy + j}`, circuit);
      cellToSoca.set(`${fp.gx + i},${fp.gy + j}`, soca);
    }

    const legPair = o.circuitToPair ? o.circuitToPair.get(circuit) : null;
    ctx.fillStyle = (o.legColorOn && legPair) ? legPairColor(legPair) : applySocaShade(colorForIndex(circuit % 6).solid, soca);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    if(o.customCircuit.has(key)) {
      ctx.fillStyle = '#FFD700'; // Gold indicator for a hand-picked circuit
      ctx.fillRect(x + w - 10, y + 2, 8, 8);
    }
    if(o.sel && o.sel.has(key)) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    }

    const label = (o.legColorOn && legPair) ? legPair : `${formatSocaLabel(o.socaLabelIdx(soca))}.${(circuit % 6) + 1}`;
    let fs = o.labelSize(w);
    ctx.font = `${fs}px Arial`;
    while(fs > 6 && ctx.measureText(label).width > w - 4) { fs--; ctx.font = `${fs}px Arial`; }
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w/2, y + h/2);
  });

  const b = freeBounds(data.freePanels, allPanels, data.freeCell_mm);
  drawSocaOverlay(ctx, {
    panelToCircuit: cellToCircuit, panelToSoca: cellToSoca, deletedPanels: new Set(),
    panelWidth: o.cellPx,
    rowGeo: {
      h: () => o.cellPx,
      y: r => Math.round(r * o.cellPx),
      rowAt: py => (py < 0 || py >= b.maxY * o.cellPx) ? -1 : Math.floor(py / o.cellPx),
      rows: b.maxY,
      height: Math.round(b.maxY * o.cellPx)
    },
    offsetX: o.ox, offsetY: o.oy,
    outlineLineWidth: 1.5,
    socaLabelIdx: o.socaLabelIdx,
    holeBlocked: o.holeBlocked,
    drawOutlines: (typeof socaOutlinesEnabled !== 'undefined') ? socaOutlinesEnabled : true,
    drawLabels: (typeof socaDiagonalLabelEnabled !== 'undefined') ? socaDiagonalLabelEnabled : true
  });
}

// Circuits and SOCAs of any drawn screen from its saved data, as the Combined view shows
// them: the shared-distro group plan when it balances, else the screen's own Phase
// Balance, else as wired — the same order the grid Combined canvas uses.
function freeScreenCircuits(screenId, data, groupPlan) {
  const inp = freeScreenPowerInputs(data);
  if(!inp) return null;
  const entry = (groupPlan && groupPlan.useBalanced && data.sharedDistro) ? groupPlan.byScreen.get(screenId) : null;
  const bal = (!entry && data.phaseBalance && inp.phase === 3)
    ? resolveBalancedCircuits(inp.pw, inp.ph, inp.panelsPerCircuit, inp.deletedPanels, inp.wiring, inp.customCircuit, inp.customSoca, 1, inp.voltage, inp.wattsByKey)
    : null;
  const panelToCircuit = entry ? entry.panelToCircuit
    : ((bal && bal.useBalanced) ? bal.panelToCircuit
      : assignCircuits(inp.pw, inp.ph, inp.panelsPerCircuit, inp.deletedPanels, inp.customCircuit).panelToCircuit);
  return {panelToCircuit, panelToSoca: assignSocas(panelToCircuit, inp.customSoca), customCircuit: inp.customCircuit};
}

// Power layout for a free screen: every panel at its true size, coloured by circuit and
// labelled SOCA.circuit, with the SOCA outlines and labels the grid canvas draws.
function renderFreePowerLayout() {
  const data = screens[currentScreenId].data;
  const allPanels = getAllPanels();
  const canvas = document.getElementById('powerCanvas');
  const container = document.getElementById('powerContainer');
  const ctx = canvas.getContext('2d');
  const isSimpleMode = typeof currentAppMode !== 'undefined' && currentAppMode === 'simple';
  if(!isSimpleMode) {
    container.style.display = 'block';
  }
  const st = freePowerState;
  const b = freeBounds(data.freePanels, allPanels, data.freeCell_mm);
  if(!st || !b) {
    canvas.width = 0;
    canvas.height = 0;
    return;
  }

  const containerWidth = container.clientWidth - 32; // Account for padding
  const pdf = typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode;
  const maxCanvasWidth = pdf ? Math.min(containerWidth, 4000) : Math.min(containerWidth, 800);
  const cellM = data.freeCell_mm / 1000;
  const pxPerM = Math.max(30, Math.min(80, Math.floor(maxCanvasWidth / (b.maxX * cellM))));
  const cellPx = pxPerM * cellM;
  canvas.width = Math.round(b.maxX * cellPx);
  canvas.height = Math.round(b.maxY * cellPx);
  freeLayerView.powerCanvas = {cellPx, cols: b.maxX, mirror: false};

  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cd = screens[currentScreenId].calculatedData;
  const circuitToPair = new Map();
  if(cd && cd.phaseBalance && cd.phaseBalance.perCircuit) cd.phaseBalance.perCircuit.forEach(e => circuitToPair.set(e.circuit, e.pair));
  const labelMap = (cd && Array.isArray(cd.socaLabelMap)) ? new Map(cd.socaLabelMap) : null;
  drawFreePowerPanels(ctx, data, allPanels, {
    panelToCircuit: st.panelToCircuit, panelToSoca: st.panelToSoca,
    socaLabelIdx: idx => (labelMap && labelMap.has(idx)) ? labelMap.get(idx) : idx,
    customCircuit: customCircuitAssignments,
    circuitToPair, legColorOn: (typeof colorByLegEnabled !== 'undefined') && colorByLegEnabled,
    ox: 0, oy: 0, cellPx, sel: pdf ? null : freeLayerSel.powerCanvas,
    labelSize: w => pdf ? Math.max(10, Math.floor(w * 0.25)) : 11
  });

  drawFreeLayerBox(ctx, 'powerCanvas');
  setupFreeLayerInteractivity();
  if(!pdf) renderSocaCircuitTable(st.socaBreakdown);
}
