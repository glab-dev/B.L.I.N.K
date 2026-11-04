// ==================== FREE-DRAW POWER ====================
// Power for drawn (free) screens. The grid power helpers (assignCircuits, assignSocas,
// computeSocaSpans, computePhaseBalance) run on a cell grid: every snap cell is a grid
// slot and only a panel's top-left cell is live, so circuits and SOCAs are keyed by the
// panel keys ("gx,gy") the custom circuit/SOCA Maps already use. Circuits fill by panel
// count like grid screens; watts and amps come from each panel's own type.

let freeCircuitBrush = 0;          // circuit chip: 0 = Auto (clear hand-picked), else 1-based circuit
let freeCircuitAction = null;      // drag in progress: {keys: Set, x, y}
let freeCircuitHover = null;       // panel key under the mouse
let freePowerState = null;         // last calculateFreePower() result, read by the canvas
let freePowerView = null;          // last power render: {cellPx}
let freePowerListenersSetup = false;

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
// wall so a full circuit can't go over the breaker whichever sizes it picks up.
function freeSuggestedPanelsPerCircuit(watts, voltage, breaker, derate) {
  return Math.max(1, Math.floor((voltage * breaker * derate) / Math.max(1, ...watts.values())));
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
  const calculatedPanelsPerCircuit = freeSuggestedPanelsPerCircuit(watts, voltage, breaker, derate);
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
    aswiredCircuitCounts: circuitCounts, aswiredPanelToCircuit: panelToCircuit, aswiredPanelToSoca: panelToSoca,
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

// Circuit tool row on the Power layout: Auto, one chip per circuit in use, New.
function updateFreeCircuitRow() {
  const data = screens[currentScreenId] ? screens[currentScreenId].data : null;
  const on = isFreeScreen(data) && freeDrawMode && data.freePanels.length > 0;
  const row = document.getElementById('powerDrawRow');
  if(row) row.style.display = on ? '' : 'none';
  const canvas = document.getElementById('powerCanvas');
  if(canvas) canvas.classList.toggle('draw-mode-active', on);
  const chips = document.getElementById('freeCircuitChips');
  if(!on || !chips || !freePowerState) return;

  const counts = freePowerState.aswiredCircuitCounts;
  const used = [...counts.keys()].sort((a, b) => a - b);
  const next = used.length ? used[used.length - 1] + 1 : 0;
  if(freeCircuitBrush > 0 && !counts.has(freeCircuitBrush - 1) && freeCircuitBrush - 1 !== next) freeCircuitBrush = 0;

  const socaOf = new Map();
  freePowerState.aswiredPanelToCircuit.forEach((circuit, key) => { if(!socaOf.has(circuit)) socaOf.set(circuit, freePowerState.aswiredPanelToSoca.get(key)); });
  const cd = screens[currentScreenId].calculatedData;
  const labelMap = (cd && Array.isArray(cd.socaLabelMap)) ? new Map(cd.socaLabelMap) : null;
  const socaLabel = idx => formatSocaLabel(labelMap && labelMap.has(idx) ? labelMap.get(idx) : idx);

  chips.textContent = '';
  const addChip = (value, text, title, color) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'toggle-btn' + (color ? ' free-circuit-chip' : '');
    if(color) chip.style.setProperty('--chip-color', color);
    chip.setAttribute('role', 'radio');
    chip.setAttribute('aria-checked', value === freeCircuitBrush ? 'true' : 'false');
    chip.classList.toggle('active', value === freeCircuitBrush);
    chip.textContent = text;
    chip.title = title;
    chip.addEventListener('click', () => {
      freeCircuitBrush = value;
      updateFreeCircuitRow();
    });
    chips.appendChild(chip);
  };
  addChip(0, 'Auto', 'Click panels to give them back their automatic circuit', null);
  used.forEach(circuit => {
    const soca = socaOf.has(circuit) ? socaOf.get(circuit) : Math.floor(circuit / 6);
    const label = `${socaLabel(soca)}.${(circuit % 6) + 1}`;
    addChip(circuit + 1, label, `Circuit ${label} (${counts.get(circuit)} panel${counts.get(circuit) === 1 ? '' : 's'})`,
      applySocaShade(colorForIndex(circuit % 6).solid, soca));
  });
  addChip(next + 1, 'New', 'Start a new circuit', null);
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
    updateFreeCircuitRow();
    return;
  }

  const containerWidth = container.clientWidth - 32; // Account for padding
  const maxCanvasWidth = (typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode)
    ? Math.min(containerWidth, 4000)
    : Math.min(containerWidth, 800);
  const cellM = data.freeCell_mm / 1000;
  const pxPerM = Math.max(30, Math.min(80, Math.floor(maxCanvasWidth / (b.maxX * cellM))));
  const cellPx = pxPerM * cellM;
  canvas.width = Math.round(b.maxX * cellPx);
  canvas.height = Math.round(b.maxY * cellPx);
  freePowerView = {cellPx};
  const toPx = g => Math.round(g * cellPx);

  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const legColorOn = (typeof colorByLegEnabled !== 'undefined') && colorByLegEnabled;
  const cd = screens[currentScreenId].calculatedData;
  const circuitToPair = new Map();
  if(cd && cd.phaseBalance && cd.phaseBalance.perCircuit) cd.phaseBalance.perCircuit.forEach(e => circuitToPair.set(e.circuit, e.pair));
  const legPairColor = pair => {
    const base = { XY: '#ff5277', YZ: '#36c5f0', ZX: '#ffd23f', X: '#ff5277', Y: '#36c5f0', Z: '#ffd23f' }[pair] || '#cccccc';
    return greyscalePrintMode ? toGreyscale(base) : (ecoPrintMode ? toPastelColor(base) : base);
  };
  const labelMap = (cd && Array.isArray(cd.socaLabelMap)) ? new Map(cd.socaLabelMap) : null;
  const socaLabelIdx = idx => (labelMap && labelMap.has(idx)) ? labelMap.get(idx) : idx;

  // While painting, crossed panels preview the chip's colour
  const paintKeys = freeCircuitAction ? freeCircuitAction.keys : null;
  const brushColor = freeCircuitBrush > 0 ? colorForIndex((freeCircuitBrush - 1) % 6).solid : '#888888';

  // Cell-level circuit/SOCA maps so the SOCA overlay outlines each panel's real footprint
  const cellToCircuit = new Map(), cellToSoca = new Map();
  data.freePanels.forEach(fp => {
    const key = `${fp.gx},${fp.gy}`;
    const circuit = st.panelToCircuit.get(key);
    const soca = st.panelToSoca.get(key);
    const {cw, ch} = freeCells(allPanels[fp.type], data.freeCell_mm);
    const x = toPx(fp.gx), y = toPx(fp.gy);
    const w = toPx(fp.gx + cw) - x, h = toPx(fp.gy + ch) - y;
    for(let i = 0; i < cw; i++) for(let j = 0; j < ch; j++) {
      cellToCircuit.set(`${fp.gx + i},${fp.gy + j}`, circuit);
      cellToSoca.set(`${fp.gx + i},${fp.gy + j}`, soca);
    }

    const legPair = circuitToPair.get(circuit);
    ctx.fillStyle = (paintKeys && paintKeys.has(key)) ? brushColor
      : ((legColorOn && legPair) ? legPairColor(legPair) : applySocaShade(colorForIndex(circuit % 6).solid, soca));
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    if(customCircuitAssignments.has(key)) {
      ctx.fillStyle = '#FFD700'; // Gold indicator for a hand-picked circuit
      ctx.fillRect(x + w - 10, y + 2, 8, 8);
    }
    if(freeDrawMode && freeCircuitHover === key && !freeCircuitAction) {
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
      ctx.restore();
    }

    const label = (legColorOn && legPair) ? legPair : `${formatSocaLabel(socaLabelIdx(soca))}.${(circuit % 6) + 1}`;
    const pdf = typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode;
    let fs = pdf ? Math.max(10, Math.floor(w * 0.25)) : 11;
    ctx.font = `${fs}px Arial`;
    while(fs > 6 && ctx.measureText(label).width > w - 4) { fs--; ctx.font = `${fs}px Arial`; }
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w/2, y + h/2);
  });

  const rowGeo = {
    h: () => cellPx,
    y: r => toPx(r),
    rowAt: py => (py < 0 || py >= canvas.height) ? -1 : Math.floor(py / cellPx),
    rows: b.maxY,
    height: canvas.height
  };
  drawSocaOverlay(ctx, {
    panelToCircuit: cellToCircuit, panelToSoca: cellToSoca, deletedPanels: new Set(),
    panelWidth: cellPx, rowGeo,
    offsetX: 0, offsetY: 0,
    outlineLineWidth: 1.5,
    socaLabelIdx,
    drawOutlines: (typeof socaOutlinesEnabled !== 'undefined') ? socaOutlinesEnabled : true,
    drawLabels: (typeof socaDiagonalLabelEnabled !== 'undefined') ? socaDiagonalLabelEnabled : true
  });

  if(!(typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode)) renderSocaCircuitTable(st.socaBreakdown);
  updateFreeCircuitRow();
  setupFreePowerInteractivity();
}

// Key of the panel under a point on the power canvas, or null
function freePowerPanelAt(clientX, clientY) {
  if(!freePowerView) return null;
  const data = screens[currentScreenId].data;
  const canvas = document.getElementById('powerCanvas');
  const rect = canvas.getBoundingClientRect();
  const gx = Math.floor((clientX - rect.left) * (canvas.width / rect.width) / freePowerView.cellPx);
  const gy = Math.floor((clientY - rect.top) * (canvas.height / rect.height) / freePowerView.cellPx);
  return freeOccupancy(data.freePanels, getAllPanels(), data.freeCell_mm).get(`${gx},${gy}`) || null;
}

function freeCircuitRedraw() {
  if(freeRafId) return;
  freeRafId = requestAnimationFrame(() => {
    freeRafId = 0;
    if(isFreeCurrentScreen()) generateLayout('power');
  });
}

function freeCircuitDown(clientX, clientY) {
  const key = freePowerPanelAt(clientX, clientY);
  freeCircuitAction = {keys: new Set(key ? [key] : []), x: clientX, y: clientY};
  freeCircuitRedraw();
}

function freeCircuitMove(clientX, clientY) {
  if(!freeCircuitAction) return;
  const key = freePowerPanelAt(clientX, clientY);
  if(key && !freeCircuitAction.keys.has(key)) {
    freeCircuitAction.keys.add(key);
    freeCircuitRedraw();
  }
}

// Put the crossed panels on the chosen circuit (or back on Auto) as one undo step
function freeCircuitUp() {
  const action = freeCircuitAction;
  freeCircuitAction = null;
  if(!action) return;
  const keys = [...action.keys].filter(k => freeCircuitBrush > 0
    ? customCircuitAssignments.get(k) !== freeCircuitBrush
    : customCircuitAssignments.has(k));
  if(keys.length === 0) { freeCircuitRedraw(); return; }
  saveState();
  keys.forEach(k => {
    if(freeCircuitBrush > 0) customCircuitAssignments.set(k, freeCircuitBrush);
    else customCircuitAssignments.delete(k);
  });
  vibrate(10);
  calculate();
}

// Circuit-tool listeners on the power canvas, attached once. They only act on a free
// screen in Draw mode.
function setupFreePowerInteractivity() {
  if(freePowerListenersSetup) return;
  freePowerListenersSetup = true;
  const canvas = document.getElementById('powerCanvas');
  const active = () => freeDrawMode && isFreeCurrentScreen() && freePowerView;

  canvas.addEventListener('mousedown', function(e) {
    if(e.button !== 0 || !active()) return;
    if(Date.now() - lastTouchInteraction < 700) return;
    e.preventDefault();
    freeCircuitDown(e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', function(e) {
    if(freeCircuitAction) { freeCircuitMove(e.clientX, e.clientY); return; }
    if(!active() || e.target !== canvas) return;
    const key = freePowerPanelAt(e.clientX, e.clientY);
    if(key === freeCircuitHover) return;
    freeCircuitHover = key;
    freeCircuitRedraw();
  });
  document.addEventListener('mouseup', function() {
    if(freeCircuitAction) freeCircuitUp();
  });
  canvas.addEventListener('mouseleave', function() {
    if(!freeCircuitHover) return;
    freeCircuitHover = null;
    freeCircuitRedraw();
  });

  canvas.addEventListener('touchstart', function(e) {
    if(!active()) return;
    lastTouchInteraction = Date.now();
    if(e.touches.length !== 1) { freeCircuitAction = null; freeCircuitRedraw(); return; }
    e.preventDefault();
    freeCircuitDown(e.touches[0].clientX, e.touches[0].clientY);
  }, {passive: false});
  canvas.addEventListener('touchmove', function(e) {
    if(!freeCircuitAction) return;
    if(e.touches.length !== 1) { freeCircuitAction = null; freeCircuitRedraw(); return; }
    e.preventDefault();
    freeCircuitMove(e.touches[0].clientX, e.touches[0].clientY);
  }, {passive: false});
  canvas.addEventListener('touchend', function() {
    lastTouchInteraction = Date.now();
    if(freeCircuitAction) freeCircuitUp();
  });
}
