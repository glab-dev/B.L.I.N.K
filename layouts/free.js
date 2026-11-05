// ==================== FREE-DRAW (HAND-PLACED) LAYOUT ====================
// A free-draw screen is a list of hand-placed panels on a snap grid, drawn on the
// Standard canvas in the Draw app mode (Tessera-style: pick a panel, click or drag it
// into place). Draw mode shows only free screens; Simple and Complex never show them.
// Stored on the screen as data.layoutMode = 'free', data.freeCell_mm (snap cell size)
// and data.freePanels = [{type, gx, gy}], where gx/gy is the panel's top-left cell.
// One screen mixes only panels of one family (same brand and pixel pitch), so the
// raster stays one clean pixel map. A panel's key is "gx,gy", the same "c,r" string
// format the custom circuit/SOCA/data Maps use.

let freeDrawMode = false;     // Draw app mode is active: screen tabs show free screens, canvas edits them
let freeBrushType = null;     // panel type a click or drag places
let freeTool = 'draw';        // 'draw': a drag on empty grid paints; 'select': it draws a selection box
let freeSelected = new Set(); // "gx,gy" keys of selected panels
let freeSelectedScreenId = null;
let freeView = null;          // last render: {gx0, gy0, cellPx}
let freeAction = null;        // pointer gesture in progress
let freeHover = null;         // cell under the mouse (ghost of the brush panel)
let freeRafId = 0;
let freeListenersSetup = false;

function isFreeScreen(data) {
  return !!(data && data.layoutMode === 'free' && Array.isArray(data.freePanels));
}

function isFreeCurrentScreen() {
  return !!(screens[currentScreenId] && isFreeScreen(screens[currentScreenId].data));
}

function freePanelFamily(p) {
  return p.brand + '|' + p.pixel_pitch_mm;
}

function freeGcd(a, b) {
  return b ? freeGcd(b, a % b) : a;
}

// Panel types that can share a screen with `typeId`, largest first, and the snap
// cell (mm) that every one of them fits on. A family whose sizes only meet on a tiny
// cell (custom panels) is cut back to the one type.
function freeFamily(typeId, allPanels) {
  const base = allPanels[typeId];
  if(!base || !(base.width_m > 0) || !(base.height_m > 0) || !(base.res_x > 0) || !(base.res_y > 0)) return {types: [], cellMm: 0};
  let types = Object.keys(allPanels).filter(t => {
    const p = allPanels[t];
    return p && p.width_m > 0 && p.height_m > 0 && p.res_x > 0 && p.res_y > 0 && freePanelFamily(p) === freePanelFamily(base);
  });
  const mm = v => Math.round(v * 1000);
  let cellMm = types.reduce((g, t) => freeGcd(freeGcd(g, mm(allPanels[t].width_m)), mm(allPanels[t].height_m)), 0);
  if(cellMm < 100) {
    types = [typeId];
    cellMm = freeGcd(mm(base.width_m), mm(base.height_m));
  }
  types.sort((a, b) => (allPanels[b].width_m * allPanels[b].height_m) - (allPanels[a].width_m * allPanels[a].height_m) || allPanels[b].width_m - allPanels[a].width_m);
  return {types, cellMm};
}

// Size of a panel type in snap cells
function freeCells(p, cellMm) {
  return {cw: Math.round(p.width_m * 1000 / cellMm), ch: Math.round(p.height_m * 1000 / cellMm)};
}

// Map "x,y" cell -> key of the panel covering it. `skip` keys are left out (panels being moved).
function freeOccupancy(list, allPanels, cellMm, skip) {
  const occ = new Map();
  list.forEach(fp => {
    const key = `${fp.gx},${fp.gy}`;
    if(skip && skip.has(key)) return;
    const {cw, ch} = freeCells(allPanels[fp.type], cellMm);
    for(let x = 0; x < cw; x++) for(let y = 0; y < ch; y++) occ.set(`${fp.gx + x},${fp.gy + y}`, key);
  });
  return occ;
}

function freeFits(occ, gx, gy, cw, ch) {
  for(let x = 0; x < cw; x++) for(let y = 0; y < ch; y++) if(occ.has(`${gx + x},${gy + y}`)) return false;
  return true;
}

// Bounds of the drawn panels in cells (max exclusive), or null when nothing is placed
function freeBounds(list, allPanels, cellMm) {
  if(list.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  list.forEach(fp => {
    const {cw, ch} = freeCells(allPanels[fp.type], cellMm);
    minX = Math.min(minX, fp.gx); minY = Math.min(minY, fp.gy);
    maxX = Math.max(maxX, fp.gx + cw); maxY = Math.max(maxY, fp.gy + ch);
  });
  return {minX, minY, maxX, maxY};
}

// Every drawn panel with its place on the wall, in metres and in pixels, measured from
// the top-left of the drawn area.
function freePlacedPanels(data, allPanels) {
  const cellMm = data.freeCell_mm;
  const b = freeBounds(data.freePanels, allPanels, cellMm);
  if(!b) return {panels: [], widthM: 0, heightM: 0, resX: 0, resY: 0};
  const cellM = cellMm / 1000;
  const ref = allPanels[data.freePanels[0].type];
  const cellPxX = ref.res_x * cellM / ref.width_m;
  const cellPxY = ref.res_y * cellM / ref.height_m;
  const panels = data.freePanels.map(fp => {
    const p = allPanels[fp.type];
    const x = fp.gx - b.minX, y = fp.gy - b.minY;
    return {
      key: `${fp.gx},${fp.gy}`, type: fp.type,
      x_m: x * cellM, y_m: y * cellM, w_m: p.width_m, h_m: p.height_m,
      x_px: Math.round(x * cellPxX), y_px: Math.round(y * cellPxY), w_px: p.res_x, h_px: p.res_y
    };
  });
  return {
    panels,
    widthM: (b.maxX - b.minX) * cellM, heightM: (b.maxY - b.minY) * cellM,
    resX: Math.round((b.maxX - b.minX) * cellPxX), resY: Math.round((b.maxY - b.minY) * cellPxY)
  };
}

// Panel count per panel type, e.g. {V4ST: 93, V4ST_V: 20}.
function freePanelCounts(list) {
  const counts = {};
  list.forEach(fp => { counts[fp.type] = (counts[fp.type] || 0) + 1; });
  return counts;
}

// A loaded layout is usable when every panel is a known type of one family, sits on
// whole cells and overlaps nothing.
function isValidFreeLayout(cellMm, list, allPanels) {
  if(!Number.isInteger(cellMm) || cellMm <= 0 || !Array.isArray(list)) return false;
  let family = null;
  const occ = new Map();
  return list.every(fp => {
    if(!fp || typeof fp !== 'object' || typeof fp.type !== 'string' || !Object.prototype.hasOwnProperty.call(allPanels, fp.type)) return false;
    if(!Number.isInteger(fp.gx) || !Number.isInteger(fp.gy)) return false;
    const p = allPanels[fp.type];
    if(!(p.width_m > 0) || !(p.height_m > 0) || !(p.res_x > 0) || !(p.res_y > 0)) return false;
    if(family === null) family = freePanelFamily(p);
    if(freePanelFamily(p) !== family) return false;
    const {cw, ch} = freeCells(p, cellMm);
    if(Math.abs(cw * cellMm - p.width_m * 1000) > 1 || Math.abs(ch * cellMm - p.height_m * 1000) > 1) return false;
    if(!freeFits(occ, fp.gx, fp.gy, cw, ch)) return false;
    for(let x = 0; x < cw; x++) for(let y = 0; y < ch; y++) occ.set(`${fp.gx + x},${fp.gy + y}`, true);
    return true;
  });
}

// The free layout fields of the current screen, for an undo/redo snapshot
function freeLayoutSnapshot() {
  const data = screens[currentScreenId] ? screens[currentScreenId].data : null;
  if(!isFreeScreen(data)) return null;
  return {freeCell_mm: data.freeCell_mm, freePanels: data.freePanels.map(fp => ({type: fp.type, gx: fp.gx, gy: fp.gy}))};
}

// Puts a snapshot back. True when the screen was or becomes a free screen, so the
// caller recalculates instead of only redrawing.
function restoreFreeLayout(snap) {
  const data = screens[currentScreenId] ? screens[currentScreenId].data : null;
  if(!data) return false;
  const wasFree = isFreeScreen(data);
  if(snap) {
    data.layoutMode = 'free';
    data.freeCell_mm = snap.freeCell_mm;
    data.freePanels = snap.freePanels.map(fp => ({type: fp.type, gx: fp.gx, gy: fp.gy}));
  } else {
    delete data.layoutMode;
    delete data.freePanels;
  }
  freeSelected.clear();
  return wasFree || !!snap;
}

// Turns a screen's data into an empty free screen, snapped to its panel's family.
function makeFreeScreenData(data) {
  const fam = freeFamily(data.panelType, getAllPanels());
  data.layoutMode = 'free';
  data.freeCell_mm = fam.cellMm;
  data.freePanels = [];
  // Grid knock-outs mean nothing here, and the shared assign prompts skip deleted keys
  data.deletedPanels = new Set();
}

// Draw row state for the current screen: panel chips, Delete button, and the Select
// Mode row (grid selection does not apply to a free screen).
function updateFreeDrawRow() {
  const data = screens[currentScreenId] ? screens[currentScreenId].data : null;
  const isFree = isFreeScreen(data);
  const on = isFree && freeDrawMode;
  const row = document.getElementById('standardDrawRow');
  if(row) row.style.display = on ? '' : 'none';
  const delBtn = document.getElementById('freeDrawDeleteBtn');
  if(delBtn) delBtn.disabled = freeSelected.size === 0;
  const selectRow = document.getElementById('standardSelectModeRow');
  if(selectRow) {
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    selectRow.style.display = (!isFree && isTouchDevice && canvasListenersSetup) ? 'flex' : 'none';
  }
  const canvas = document.getElementById('standardCanvas');
  if(canvas) {
    canvas.classList.toggle('draw-mode-active', on);
    canvas.classList.toggle('free-select-tool', on && freeTool === 'select');
  }
  const hint = document.getElementById('standardLayoutHint');
  if(hint) hint.textContent = standardLayoutHintText();
  // Touch Select Mode for the drawn Power and Data layouts; off whenever it is hidden so
  // a grid screen's canvases keep scrolling
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  [['powerCanvas', 'freePowerSelectModeRow'], ['dataCanvas', 'freeDataSelectModeRow']].forEach(([canvasId, rowId]) => {
    const modeRow = document.getElementById(rowId);
    if(modeRow) modeRow.style.display = (on && isTouch) ? '' : 'none';
    if(!(on && isTouch) && freeLayerSelectMode[canvasId]) setFreeSelectMode(canvasId, false);
  });
  if(!on) return;

  [['draw', 'freeToolDrawBtn'], ['select', 'freeToolSelectBtn']].forEach(([tool, id]) => {
    const btn = document.getElementById(id);
    if(!btn) return;
    btn.classList.toggle('active', freeTool === tool);
    btn.setAttribute('aria-checked', freeTool === tool ? 'true' : 'false');
  });

  const chips = document.getElementById('freeDrawChips');
  if(!chips) return;
  const allPanels = getAllPanels();
  const fam = freeFamily(freeBrushType, allPanels);
  const types = fam.types.filter(t => {
    const {cw, ch} = freeCells(allPanels[t], data.freeCell_mm);
    return Math.abs(cw * data.freeCell_mm - allPanels[t].width_m * 1000) <= 1 && Math.abs(ch * data.freeCell_mm - allPanels[t].height_m * 1000) <= 1;
  });
  chips.textContent = '';
  types.forEach(t => {
    const p = allPanels[t];
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'toggle-btn';
    chip.setAttribute('role', 'radio');
    chip.setAttribute('aria-checked', t === freeBrushType ? 'true' : 'false');
    chip.classList.toggle('active', t === freeBrushType);
    chip.textContent = `${Math.round(p.width_m * 1000)}×${Math.round(p.height_m * 1000)}`;
    chip.title = `${p.brand} ${p.name}`;
    chip.addEventListener('click', () => {
      freeBrushType = t;
      updateFreeDrawRow();
    });
    chips.appendChild(chip);
  });
}

// Standard layout tool: Draw paints panels where a drag starts on empty grid, Select
// draws a selection box there instead
function setFreeTool(tool) {
  freeTool = tool;
  freeHover = null;
  updateFreeDrawRow();
  freeRedraw();
}

// Specs, stored totals and the Standard, Power and Data layouts for the current screen
// when it is a free screen. Structure for free screens comes later, so it stays hidden.
function calculateFreeScreen() {
  const screen = screens[currentScreenId];
  const data = screen.data;
  const allPanels = getAllPanels();
  const pr = getAllProcessors()[document.getElementById('processor').value];

  if(freeSelectedScreenId !== currentScreenId) {
    freeSelected.clear();
    Object.values(freeLayerSel).forEach(s => s.clear());
    freeAction = null;
    freeSelectedScreenId = currentScreenId;
  }
  normalizeFreePanels(data, allPanels);

  // The panel dropdown picks the brush. Another family can only be picked while
  // nothing is drawn; otherwise it goes back to the family on the canvas.
  const typeSelect = document.getElementById('panelType');
  const pickedType = typeSelect.value;
  const picked = allPanels[pickedType];
  if(data.freePanels.length > 0) {
    const drawnFamily = freePanelFamily(allPanels[data.freePanels[0].type]);
    if(!picked || freePanelFamily(picked) !== drawnFamily) {
      const keepType = (freeBrushType && allPanels[freeBrushType] && freePanelFamily(allPanels[freeBrushType]) === drawnFamily) ? freeBrushType : data.freePanels[0].type;
      typeSelect.value = keepType;
      data.panelType = keepType;
      freeBrushType = keepType;
      if(picked) showAlert('This screen is drawn with ' + allPanels[keepType].brand + ' panels at ' + allPanels[keepType].pixel_pitch_mm + ' mm. Only panels from that family can be mixed on it.', 'Panel Type');
    } else if(!freeBrushType || !allPanels[freeBrushType] || freePanelFamily(allPanels[freeBrushType]) !== drawnFamily) {
      freeBrushType = pickedType;
    }
  } else if(picked) {
    const fam = freeFamily(pickedType, allPanels);
    if(fam.cellMm) data.freeCell_mm = fam.cellMm;
    if(!freeBrushType || !allPanels[freeBrushType] || freePanelFamily(allPanels[freeBrushType]) !== freePanelFamily(picked)) freeBrushType = pickedType;
  }

  const wall = freePlacedPanels(data, allPanels);
  const counts = freePanelCounts(data.freePanels);
  const types = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  const powerType = document.getElementById('powerType').value;
  const voltage = parseFloat(document.getElementById('voltage').value)||220;
  const phase = parseInt(document.getElementById('phase').value)||3;

  let totalPanels = 0, totalPixels = 0, panelWeightKg = 0, totalPowerW = 0;
  types.forEach(t => {
    const p = allPanels[t];
    const n = counts[t];
    totalPanels += n;
    totalPixels += n * p.res_x * p.res_y;
    panelWeightKg += n * getPanelWeight(t, shouldUseConnectingPlates(t));
    totalPowerW += n * (powerType==='max' ? p.power_max_w : (p.power_avg_w||p.power_max_w*0.5));
  });
  const totalAmps = totalPowerW / voltage;
  const ampsPerPhase = phase===3 ? (totalAmps / Math.sqrt(3)) : totalAmps;
  const power = calculateFreePower(data, allPanels);
  const dataInfo = calculateFreeData(data, allPanels);
  const redundancy = redundancyEnabled;
  const portsNeededFinal = dataInfo.dataLines * (redundancy ? 2 : 1);
  const topology = resolveProcessorTopology(document.getElementById('processor').value, mx40ConnectionMode);
  const boxCounts = computeProcessorAndBoxCounts({
    topology: topology,
    mainPorts: dataInfo.dataLines,
    totalPixels: totalPixels,
    hasRedundancy: redundancy,
    screenCount: 1
  });

  if(totalPanels === 0) {
    document.getElementById('results').innerHTML = '<div style="padding: 40px; text-align: center; color: #888;">' +
      '<h3 style="color: #10b981; margin-bottom: 10px;">Draw Your Wall</h3>' +
      '<p>Pick a panel size above the Standard layout, then click or drag on the grid to place it.</p>' +
      '</div>';
  } else {
    const lenUnit = getLengthUnitLabel();
    const wtUnit = getWeightUnitLabel();
    const len = m => (displayLengthUnit === 'ft' ? m * M_TO_FT : m).toFixed(2);
    const weightDisplay = displayWeightUnit === 'lbs' ? Math.ceil(panelWeightKg * KG_TO_LBS) : Math.ceil(panelWeightKg);
    const pitches = [...new Set(types.map(t => allPanels[t].pixel_pitch_mm))].join(' / ');

    let html = '';
    html += `<div style="position: absolute; top: -16px; left: 16px; background: #1a1a1a; border: 1px solid var(--primary); padding: 4px 10px; font-family: 'Bangers', cursive; font-size: 16px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--primary); transform: rotate(-2deg);">Specs</div>`;
    html += `<div class="specs-columns"><div class="specs-row specs-row-top"><div class="spec-group">`;
    html += `<div class="result-section-title">PANELS</div>`;
    types.forEach(t => {
      const p = allPanels[t];
      html += `<div class="result-row"><strong>${escapeHtml(p.brand)} ${escapeHtml(p.name)}:</strong> ${counts[t]}</div>`;
    });
    html += `<div class="result-row"><strong>Pixel pitch:</strong> ${pitches} mm</div>`;
    html += `</div><div class="spec-group">`;
    html += `<div class="result-section-title">WALL</div>`;
    html += `<div class="result-row"><strong>Dimensions:</strong> ${len(wall.widthM)} ${lenUnit} × ${len(wall.heightM)} ${lenUnit} (drawn)</div>`;
    html += `<div class="result-row"><strong>Total panel count:</strong> ${totalPanels}</div>`;
    html += `<div class="result-row"><strong>Resolution:</strong> ${wall.resX} × ${wall.resY}</div>`;
    html += `<div class="result-row"><strong>Total pixel count:</strong> (${totalPixels.toLocaleString()} px)</div>`;
    html += `<div class="result-row"><strong>Wall weight:</strong> ${weightDisplay} ${wtUnit}</div>`;
    html += `</div></div><div class="specs-row specs-row-bottom"><div class="spec-group">`;
    html += `<div class="result-section-title">POWER (${powerType.toUpperCase()})</div>`;
    html += `<div class="result-row"><strong>Total watts:</strong> ${totalPowerW.toLocaleString()} W</div>`;
    html += `<div class="result-row"><strong>Total amps:</strong> ${ampsPerPhase.toFixed(2)} A @ ${voltage} V</div>`;
    html += `<div class="result-row"><strong>Panels per circuit:</strong> ${power.panelsPerCircuit}</div>`;
    html += `<div class="result-row"><strong>Circuits:</strong> ${power.circuitsNeeded}</div>`;
    html += `<div class="result-row"><strong>SOCAs:</strong> ${power.socaCount}</div>`;
    if(power.phaseBalance) {
      const la = power.phaseBalance.legAmps;
      html += `<div class="result-row"><strong>Leg amps:</strong> X ${la.X.toFixed(1)} A · Y ${la.Y.toFixed(1)} A · Z ${la.Z.toFixed(1)} A</div>`;
    }
    if(power.sharedDistroTotal) {
      const sd = power.sharedDistroTotal;
      html += `<div class="result-row"><strong>Shared distro (${sd.screenCount} screens):</strong> ${sd.power.toLocaleString()} W · X ${sd.legAmps.X.toFixed(1)} A · Y ${sd.legAmps.Y.toFixed(1)} A · Z ${sd.legAmps.Z.toFixed(1)} A</div>`;
    }
    html += `</div><div class="spec-group">`;
    html += `<div class="result-section-title">DATA</div>`;
    html += `<div class="result-row"><strong>Processor:</strong> ${escapeHtml(pr ? pr.name : '')}<span id="resultsProcessorCount"></span></div>`;
    if(boxCounts.distBoxName) {
      html += `<div class="result-row"><strong>Distribution box:</strong> ${escapeHtml(boxCounts.distBoxName)}<span id="resultsDistBoxCount">${boxCounts.distBoxCount > 0 ? ` (${boxCounts.distBoxCount})` : ''}</span></div>`;
    }
    html += `<div class="result-row"><strong>Port Capacity:</strong> ${dataInfo.capacity.toLocaleString()} px</div>`;
    html += `<div class="result-row"><strong>Max panels per data line:</strong> ${dataInfo.suggested}</div>`;
    html += `<div class="result-row"><strong>Estimated 1G ports needed:</strong> ${portsNeededFinal}</div>`;
    html += `<div class="result-row"><strong>Estimated data lines:</strong> ${portsNeededFinal}</div>`;
    html += `<div class="result-row"><strong>Frame Rate:</strong> ${dataInfo.frameRate} Hz</div>`;
    html += `<div class="result-row"><strong>Bit Depth:</strong> ${dataInfo.bitDepth}-bit</div>`;
    html += `<div class="result-row"><strong>Redundancy:</strong> ${redundancy ? 'Yes' : 'No'}</div>`;
    html += `</div></div></div>`;
    document.getElementById('results').innerHTML = html;
  }

  screen.calculatedData = {
    processorName: pr ? pr.name : '',
    processorCount: 1,
    distributionBoxCount: boxCounts.distBoxCount,
    distributionBoxName: boxCounts.distBoxName,
    panelCount: totalPanels,
    activePanels: totalPanels,
    panelWeightOnlyKg: panelWeightKg,
    bumperWeightKg: 0,
    totalPixels: totalPixels,
    dataLines: dataInfo.dataLines,
    dataLinesFinal: portsNeededFinal,
    portsNeeded: dataInfo.dataLines,
    portsNeededFinal: portsNeededFinal,
    panelsPerDataLine: dataInfo.panelsPerDataLine,
    circuitsNeeded: power.circuitsNeeded,
    socaCount: power.socaCount,
    socaSpans: power.socaSpans,
    socaBreakdown: power.socaBreakdown,
    phaseBalance: power.phaseBalance,
    sharedDistroTotal: power.sharedDistroTotal,
    socaLabelMap: power.socaLabelMap,
    true1Twofers: power.true1Twofers
  };

  // Processor and box counts as the gear list has them, the same as calculate()
  const gearGroup = Object.values(buildGearListData([currentScreenId]).processorGroups)[0];
  if(gearGroup) {
    screen.calculatedData.processorCount = gearGroup.processorCount;
    screen.calculatedData.distributionBoxCount = gearGroup.distBoxCount;
    const procCountEl = document.getElementById('resultsProcessorCount');
    if(procCountEl) procCountEl.textContent = gearGroup.processorCount > 1 ? ` (${gearGroup.processorCount})` : '';
    const boxCountEl = document.getElementById('resultsDistBoxCount');
    if(boxCountEl) boxCountEl.textContent = gearGroup.distBoxCount > 0 ? ` (${gearGroup.distBoxCount})` : '';
  }

  const structureEl = document.getElementById('structureContainer');
  if(structureEl) structureEl.style.display = 'none';

  updateFreeDrawRow();
  generateLayout('standard');
  if(totalPanels > 0) {
    generateLayout('power');
    renderPhaseBalanceLegend();
    generateLayout('data');
  } else {
    document.getElementById('powerContainer').style.display = 'none';
    document.getElementById('dataContainer').style.display = 'none';
    renderDataLineMap();
  }
  showCanvasView();
  generateGearList();
}

// Two-tone fill like the grid's checkerboard: each panel takes the first colour
// unless a panel it touches already has it.
function freeColorIndexes(list, allPanels, cellMm) {
  const order = list.map((fp, i) => i).sort((a, b) => list[a].gy - list[b].gy || list[a].gx - list[b].gx);
  const colorAt = new Map();
  const idx = new Array(list.length);
  order.forEach(i => {
    const fp = list[i];
    const {cw, ch} = freeCells(allPanels[fp.type], cellMm);
    let usesFirst = false;
    for(let x = -1; x <= cw && !usesFirst; x++) {
      for(let y = -1; y <= ch && !usesFirst; y++) {
        const edge = x === -1 || x === cw || y === -1 || y === ch;
        const corner = (x === -1 || x === cw) && (y === -1 || y === ch);
        if(edge && !corner && colorAt.get(`${fp.gx + x},${fp.gy + y}`) === 0) usesFirst = true;
      }
    }
    idx[i] = usesFirst ? 1 : 0;
    for(let x = 0; x < cw; x++) for(let y = 0; y < ch; y++) colorAt.set(`${fp.gx + x},${fp.gy + y}`, idx[i]);
  });
  return idx;
}

// Top-left cells a click or drag from `start` to `end` fills with brush panels
function freePaintTiles(start, end, cw, ch) {
  const dx = end.gx - start.gx, dy = end.gy - start.gy;
  const nx = Math.floor(Math.abs(dx) / cw) + 1;
  const ny = Math.floor(Math.abs(dy) / ch) + 1;
  const tiles = [];
  for(let i = 0; i < nx; i++) {
    for(let j = 0; j < ny; j++) {
      tiles.push({gx: start.gx + (dx < 0 ? -i : i) * cw, gy: start.gy + (dy < 0 ? -j : j) * ch});
    }
  }
  return tiles;
}

// Standard layout for a free screen. In Draw mode it shows a faint snap grid with a
// margin around the drawn panels, the selection and a ghost of what a click or drag
// will do. With Draw off the canvas crops to the panels.
function renderFreeStandardLayout() {
  const data = screens[currentScreenId].data;
  const allPanels = getAllPanels();
  const cellMm = data.freeCell_mm;
  const list = data.freePanels;
  const canvas = document.getElementById('standardCanvas');
  const container = document.getElementById('standardContainer');
  const ctx = canvas.getContext('2d');

  const isSimpleMode = typeof currentAppMode !== 'undefined' && currentAppMode === 'simple';
  if(!isSimpleMode) {
    container.style.display = 'block';
  }
  const containerWidth = container.clientWidth - 32; // Account for padding
  const maxCanvasWidth = (typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode)
    ? Math.min(containerWidth, 4000)
    : Math.min(containerWidth, 800);

  const b = freeBounds(list, allPanels, cellMm);
  const showGrid = freeDrawMode || !b;
  let gx0, gy0, cols, rows;
  if(!b) {
    gx0 = 0; gy0 = 0; cols = 16; rows = 8;
  } else if(showGrid) {
    gx0 = b.minX - 2; gy0 = b.minY - 2;
    cols = Math.max(16, b.maxX - b.minX + 4); rows = Math.max(8, b.maxY - b.minY + 4);
  } else {
    gx0 = b.minX; gy0 = b.minY; cols = b.maxX - b.minX; rows = b.maxY - b.minY;
  }
  const cellM = cellMm / 1000;
  // Same 30–80 px range as grid screens, applied per metre
  const pxPerM = Math.max(30, Math.min(80, Math.floor(maxCanvasWidth / (cols * cellM))));
  const cellPx = pxPerM * cellM;
  canvas.width = Math.round(cols * cellPx);
  canvas.height = Math.round(rows * cellPx);
  freeView = {gx0, gy0, cellPx};

  // The grid click/drag handlers stay attached to this canvas; a zero-size grid
  // makes their hit-tests find nothing
  currentCanvas = canvas;
  currentPw = 0;
  currentPh = 0;

  const toX = gx => Math.round((gx - gx0) * cellPx);
  const toY = gy => Math.round((gy - gy0) * cellPx);

  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if(showGrid && cellPx >= 8) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let c = 0; c <= cols; c++) { const x = toX(gx0 + c) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for(let r = 0; r <= rows; r++) { const y = toY(gy0 + r) + 0.5; ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();
  }

  const colors = freeColorIndexes(list, allPanels, cellMm);
  const smallest = list.length ? Math.min(...list.map(fp => Math.min(allPanels[fp.type].width_m, allPanels[fp.type].height_m))) : cellM;
  const fontSize = Math.max(10, Math.floor(smallest * pxPerM * 0.22));
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  list.forEach((fp, i) => {
    const p = allPanels[fp.type];
    const {cw, ch} = freeCells(p, cellMm);
    const x = toX(fp.gx), y = toY(fp.gy);
    const w = toX(fp.gx + cw) - x, h = toY(fp.gy + ch) - y;
    ctx.fillStyle = getStandardColorForPanel(colors[i], 0);
    ctx.fillRect(x, y, w, h);
    if(freeDrawMode && freeSelected.has(`${fp.gx},${fp.gy}`)) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 4;
      ctx.strokeRect(x+2, y+2, w-4, h-4);
    }
    if(customCircuitAssignments.has(`${fp.gx},${fp.gy}`)) {
      ctx.fillStyle = '#FFD700'; // Gold indicator for a hand-picked circuit
      ctx.fillRect(x+w-10, y+2, 8, 8);
    }
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    // Shrink the name to fit narrow panels; leave it off when it would be unreadable
    const textW = ctx.measureText(p.name).width;
    const fitSize = textW > w - 6 ? Math.floor(fontSize * (w - 6) / textW) : fontSize;
    if(fitSize >= 7) {
      ctx.font = `${fitSize}px Arial`;
      ctx.fillStyle = '#000000';
      ctx.fillText(p.name, x+w/2, y+h/2);
      ctx.font = `${fontSize}px Arial`;
    }
  });

  if(freeDrawMode) drawFreeGhost(ctx, data, allPanels, toX, toY);
  setupFreeCanvasInteractivity();
}

// Dashed outline of what the pointer will place or where a moved selection will land;
// red where it would overlap a panel.
function drawFreeGhost(ctx, data, allPanels, toX, toY) {
  const cellMm = data.freeCell_mm;
  if(freeAction && freeAction.kind === 'box') {
    if(!freeAction.moved) return;
    // Selection box, styled like the grid's drag box, snapped to cells
    const x0 = Math.min(freeAction.start.gx, freeAction.cur.gx), x1 = Math.max(freeAction.start.gx, freeAction.cur.gx) + 1;
    const y0 = Math.min(freeAction.start.gy, freeAction.cur.gy), y1 = Math.max(freeAction.start.gy, freeAction.cur.gy) + 1;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 255, 0, 0.12)';
    ctx.fillRect(toX(x0), toY(y0), toX(x1) - toX(x0), toY(y1) - toY(y0));
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(toX(x0), toY(y0), toX(x1) - toX(x0), toY(y1) - toY(y0));
    ctx.restore();
    return;
  }
  const boxes = [];
  if(freeAction && freeAction.kind === 'move' && freeAction.moved) {
    const ox = freeAction.cur.gx - freeAction.start.gx, oy = freeAction.cur.gy - freeAction.start.gy;
    const ok = freeMoveFits(data, allPanels, ox, oy);
    data.freePanels.forEach(fp => {
      if(!freeSelected.has(`${fp.gx},${fp.gy}`)) return;
      const {cw, ch} = freeCells(allPanels[fp.type], cellMm);
      boxes.push({gx: fp.gx + ox, gy: fp.gy + oy, cw, ch, ok});
    });
  } else if(freeTool === 'draw' && freeBrushType && allPanels[freeBrushType]) {
    const {cw, ch} = freeCells(allPanels[freeBrushType], cellMm);
    let tiles = null;
    if(freeAction && freeAction.kind === 'paint') tiles = freePaintTiles(freeAction.start, freeAction.cur, cw, ch);
    else if(!freeAction && freeHover && !freeHover.hit) tiles = [freeHover];
    if(tiles) {
      const occ = freeOccupancy(data.freePanels, allPanels, cellMm);
      tiles.forEach(t => boxes.push({gx: t.gx, gy: t.gy, cw, ch, ok: freeFits(occ, t.gx, t.gy, cw, ch)}));
    }
  }
  if(boxes.length === 0) return;
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 2;
  boxes.forEach(bx => {
    const x = toX(bx.gx), y = toY(bx.gy);
    const w = toX(bx.gx + bx.cw) - x, h = toY(bx.gy + bx.ch) - y;
    ctx.fillStyle = bx.ok ? 'rgba(255,255,255,0.12)' : 'rgba(239,68,68,0.25)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = bx.ok ? 'rgba(255,255,255,0.5)' : 'rgba(239,68,68,0.9)';
    ctx.strokeRect(x+1, y+1, w-2, h-2);
  });
  ctx.restore();
}

function freeMoveFits(data, allPanels, ox, oy) {
  const occ = freeOccupancy(data.freePanels, allPanels, data.freeCell_mm, freeSelected);
  return data.freePanels.every(fp => {
    if(!freeSelected.has(`${fp.gx},${fp.gy}`)) return true;
    const {cw, ch} = freeCells(allPanels[fp.type], data.freeCell_mm);
    return freeFits(occ, fp.gx + ox, fp.gy + oy, cw, ch);
  });
}

// Moves the custom circuit/SOCA/data assignments with their panels. `newKey` returns a
// panel's new key, or null when the panel is gone.
function rekeyFreeAssignments(newKey) {
  const rekey = m => new Map([...m].map(([k, v]) => [newKey(k), v]).filter(([k]) => k !== null));
  customCircuitAssignments = rekey(customCircuitAssignments);
  customSocaAssignments = rekey(customSocaAssignments);
  customDataLineAssignments = rekey(customDataLineAssignments);
  customDataDestinations = rekey(customDataDestinations);
}

// Shift the drawn panels so the top-left one sits at cell 0,0, keeping the selection
// and the custom assignments on their panels.
function normalizeFreePanels(data, allPanels) {
  const b = freeBounds(data.freePanels, allPanels, data.freeCell_mm);
  if(!b || (b.minX === 0 && b.minY === 0)) return;
  data.freePanels = data.freePanels.map(fp => ({type: fp.type, gx: fp.gx - b.minX, gy: fp.gy - b.minY}));
  const shift = k => {
    const [x, y] = k.split(',').map(Number);
    return `${x - b.minX},${y - b.minY}`;
  };
  freeSelected = new Set([...freeSelected].map(shift));
  rekeyFreeAssignments(shift);
}

// Store an edited panel list and recalculate totals, gear and canvas. The Power and Data
// selections are dropped: their panels may have moved or gone.
function commitFreePanels(list) {
  const data = screens[currentScreenId].data;
  Object.values(freeLayerSel).forEach(s => s.clear());
  data.freePanels = list;
  normalizeFreePanels(data, getAllPanels());
  calculate();
}

function deleteFreeSelected() {
  if(freeSelected.size === 0) return;
  const data = screens[currentScreenId].data;
  saveState();
  const list = data.freePanels.filter(fp => !freeSelected.has(`${fp.gx},${fp.gy}`));
  const gone = new Set(freeSelected);
  rekeyFreeAssignments(k => gone.has(k) ? null : k);
  freeSelected.clear();
  commitFreePanels(list);
  vibrate(10);
}

function freeCellAt(clientX, clientY) {
  const canvas = document.getElementById('standardCanvas');
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  return {gx: freeView.gx0 + Math.floor(x / freeView.cellPx), gy: freeView.gy0 + Math.floor(y / freeView.cellPx)};
}

function freeRedraw() {
  if(freeRafId) return;
  freeRafId = requestAnimationFrame(() => {
    freeRafId = 0;
    if(isFreeCurrentScreen()) generateLayout('standard');
  });
}

// `additive`: Shift/Ctrl/⌘ held — a click toggles a panel, a drag on empty space draws a
// selection box. `touch`: a tap adds a panel to the selection and a tap on a selected
// panel opens the options menu, like Select Mode on the grid.
function freePointerDown(clientX, clientY, additive, touch) {
  const data = screens[currentScreenId].data;
  const allPanels = getAllPanels();
  const cell = freeCellAt(clientX, clientY);
  const hit = freeOccupancy(data.freePanels, allPanels, data.freeCell_mm).get(`${cell.gx},${cell.gy}`);
  if(hit) {
    if(additive) {
      if(freeSelected.has(hit)) freeSelected.delete(hit); else freeSelected.add(hit);
      freeAction = {kind: 'select', start: cell, cur: cell, moved: false, x: clientX, y: clientY};
    } else {
      const wasSelected = freeSelected.has(hit);
      if(!wasSelected) {
        if(!touch) freeSelected.clear();
        freeSelected.add(hit);
      }
      freeAction = {kind: 'move', start: cell, cur: cell, moved: false, x: clientX, y: clientY, hit, touch, menuOnTap: touch && wasSelected};
    }
  } else if(additive || freeTool === 'select') {
    // Select tool: a plain drag on empty grid starts a fresh selection box
    if(!additive) freeSelected.clear();
    freeAction = {kind: 'box', start: cell, cur: cell, moved: false, x: clientX, y: clientY};
  } else {
    freeSelected.clear();
    freeAction = {kind: 'paint', start: cell, cur: cell, moved: false, x: clientX, y: clientY};
  }
  freeHover = null;
  updateFreeDrawRow();
  freeRedraw();
}

function freePointerMove(clientX, clientY) {
  if(!freeAction) return;
  if(!freeAction.moved && Math.abs(clientX - freeAction.x) <= 4 && Math.abs(clientY - freeAction.y) <= 4) return;
  freeAction.moved = true;
  const cell = freeCellAt(clientX, clientY);
  if(cell.gx === freeAction.cur.gx && cell.gy === freeAction.cur.gy) return;
  freeAction.cur = cell;
  freeRedraw();
}

function freePointerUp() {
  const action = freeAction;
  freeAction = null;
  if(!action) return;
  const data = screens[currentScreenId].data;
  const allPanels = getAllPanels();
  const cellMm = data.freeCell_mm;

  if(action.kind === 'paint' && freeBrushType && allPanels[freeBrushType]) {
    const {cw, ch} = freeCells(allPanels[freeBrushType], cellMm);
    const occ = freeOccupancy(data.freePanels, allPanels, cellMm);
    const added = [];
    freePaintTiles(action.start, action.cur, cw, ch).forEach(t => {
      if(!freeFits(occ, t.gx, t.gy, cw, ch)) return;
      for(let x = 0; x < cw; x++) for(let y = 0; y < ch; y++) occ.set(`${t.gx + x},${t.gy + y}`, true);
      added.push({type: freeBrushType, gx: t.gx, gy: t.gy});
    });
    if(added.length) {
      saveState();
      commitFreePanels(data.freePanels.concat(added));
      vibrate(10);
      return;
    }
  } else if(action.kind === 'move') {
    const ox = action.cur.gx - action.start.gx, oy = action.cur.gy - action.start.gy;
    if(action.moved && (ox || oy) && freeMoveFits(data, allPanels, ox, oy)) {
      saveState();
      const list = data.freePanels.map(fp => freeSelected.has(`${fp.gx},${fp.gy}`) ? {type: fp.type, gx: fp.gx + ox, gy: fp.gy + oy} : fp);
      const moved = new Set(freeSelected);
      const shift = k => {
        if(!moved.has(k)) return k;
        const [x, y] = k.split(',').map(Number);
        return `${x + ox},${y + oy}`;
      };
      freeSelected = new Set([...freeSelected].map(shift));
      rekeyFreeAssignments(shift);
      commitFreePanels(list);
      return;
    }
    if(!action.moved && action.menuOnTap) {
      freeRedraw();
      showFreeContextMenu(action.x, action.y, 'standard', freeSelected);
      return;
    }
    if(!action.moved && !action.touch) {
      freeSelected.clear();
      freeSelected.add(action.hit);
    }
  } else if(action.kind === 'box' && action.moved) {
    // Every panel the box touches joins the selection
    const x0 = Math.min(action.start.gx, action.cur.gx), x1 = Math.max(action.start.gx, action.cur.gx);
    const y0 = Math.min(action.start.gy, action.cur.gy), y1 = Math.max(action.start.gy, action.cur.gy);
    data.freePanels.forEach(fp => {
      const {cw, ch} = freeCells(allPanels[fp.type], cellMm);
      if(fp.gx <= x1 && fp.gx + cw - 1 >= x0 && fp.gy <= y1 && fp.gy + ch - 1 >= y0) freeSelected.add(`${fp.gx},${fp.gy}`);
    });
  }
  updateFreeDrawRow();
  freeRedraw();
}

// Options for the selected panels, the drawn-screen counterpart of the Combined view's
// right-click menu: Assign Circuit # / Assign SOCA # / Assign Data Port run the same
// prompts as on a grid screen. `kind` is the layout it opened from, like Combined: the
// Power layout offers power options, the Data layout data options, and the Standard
// layout both plus Delete. `sel` is that layout's selection.
function showFreeContextMenu(x, y, kind, sel) {
  if(sel.size === 0) return;
  const existingMenu = document.getElementById('panelContextMenu');
  if(existingMenu) existingMenu.remove();

  const menu = document.createElement('div');
  menu.id = 'panelContextMenu';
  menu.style.position = 'fixed';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.style.background = '#242424';
  menu.style.border = '1px solid #555';
  menu.style.borderRadius = '4px';
  menu.style.padding = '4px 0';
  menu.style.zIndex = '10000';
  menu.style.minWidth = '200px';
  menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';

  const keys = [...sel];
  const n = keys.length;
  const showPower = kind !== 'data';
  const showData = kind !== 'power';
  // An option picked on the Power or Data layout uses up that layout's selection
  const usedUp = () => { if(kind !== 'standard') sel.clear(); };
  const addOption = (text, onPick) => {
    const option = document.createElement('div');
    option.textContent = text;
    option.style.padding = '8px 12px';
    option.style.cursor = 'pointer';
    option.style.color = '#e0e0e0';
    option.style.fontSize = '13px';
    option.style.borderBottom = '1px solid #383838';
    option.addEventListener('mouseover', function() { option.style.background = '#0a66c2'; });
    option.addEventListener('mouseout', function() { option.style.background = 'transparent'; });
    option.addEventListener('click', function() {
      menu.remove();
      onPick();
    });
    menu.appendChild(option);
  };

  // The grid prompts assign whatever is in selectedPanels
  if(showPower) {
    addOption(`Assign Circuit # to ${n} panel(s)`, () => {
      usedUp();
      selectedPanels = new Set(keys);
      showCircuitNumberPrompt();
    });
    // Same rule as the grid menu: a SOCA block spans 2+ columns and 2+ rows
    const cols = new Set(keys.map(k => k.split(',')[0]));
    const rows = new Set(keys.map(k => k.split(',')[1]));
    if(cols.size > 1 && rows.size > 1) {
      addOption(`Assign SOCA # to ${n} panel(s)`, () => {
        usedUp();
        selectedPanels = new Set(keys);
        showAssignSocaPrompt();
      });
    }
  }
  if(showData) {
    addOption(`Assign Data Port to ${n} panel(s)`, () => {
      usedUp();
      selectedPanels = new Set(keys);
      showDataLineNumberPrompt();
    });
    // Right-clicking the panel a line starts on offers the whole line, as in Combined
    const startedLine = n === 1 ? dataLineStartingAt(currentScreenId, keys[0]) : null;
    if(startedLine) {
      addOption(`Change data line ${startedLine.label} (whole line)…`, () => {
        usedUp();
        selectedPanels = new Set(startedLine.panels);
        showDataLineNumberPrompt(startedLine.current);
      });
    }
  }
  // Reset follows the layout too: power on Power, data on Data, both on Standard
  const resetMaps = [];
  if(showPower) resetMaps.push(customCircuitAssignments, customSocaAssignments);
  if(showData) resetMaps.push(customDataLineAssignments, customDataDestinations);
  if(keys.some(k => resetMaps.some(m => m.has(k)))) {
    addOption(`Reset ${n} panel(s) to auto ${kind === 'standard' ? 'power and data' : kind}`, () => {
      usedUp();
      saveState();
      keys.forEach(k => resetMaps.forEach(m => m.delete(k)));
      calculate();
    });
  }
  if(kind === 'standard') addOption(`Delete ${n} panel(s)`, () => deleteFreeSelected());
  menu.lastChild.style.borderBottom = 'none';
  document.body.appendChild(menu);

  // Close menu when clicking elsewhere
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if(!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 10);
}

// Draw-mode listeners on the Standard canvas, attached once. They only act on a free
// screen with Draw on; the grid handlers return early on free screens.
function setupFreeCanvasInteractivity() {
  if(freeListenersSetup) return;
  freeListenersSetup = true;
  const canvas = document.getElementById('standardCanvas');
  const active = () => freeDrawMode && isFreeCurrentScreen() && freeView;

  canvas.addEventListener('mousedown', function(e) {
    if(e.button !== 0 || !active()) return;
    // Ignore the mousedown a touch device synthesizes after a tap
    if(Date.now() - lastTouchInteraction < 700) return;
    e.preventDefault();
    freePointerDown(e.clientX, e.clientY, e.ctrlKey || e.metaKey || e.shiftKey);
  });
  document.addEventListener('mousemove', function(e) {
    if(freeAction) { freePointerMove(e.clientX, e.clientY); return; }
    if(!active() || e.target !== canvas) return;
    const cell = freeCellAt(e.clientX, e.clientY);
    const data = screens[currentScreenId].data;
    const hit = freeOccupancy(data.freePanels, getAllPanels(), data.freeCell_mm).has(`${cell.gx},${cell.gy}`);
    if(freeHover && freeHover.gx === cell.gx && freeHover.gy === cell.gy) return;
    freeHover = {gx: cell.gx, gy: cell.gy, hit};
    freeRedraw();
  });
  document.addEventListener('mouseup', function() {
    if(freeAction) freePointerUp();
  });
  canvas.addEventListener('mouseleave', function() {
    if(!freeHover) return;
    freeHover = null;
    freeRedraw();
  });
  // Right-click a panel: select it if it isn't already, then show the options menu
  canvas.addEventListener('contextmenu', function(e) {
    if(!active()) return;
    e.preventDefault();
    const cell = freeCellAt(e.clientX, e.clientY);
    const data = screens[currentScreenId].data;
    const hit = freeOccupancy(data.freePanels, getAllPanels(), data.freeCell_mm).get(`${cell.gx},${cell.gy}`);
    if(!hit) return;
    if(!freeSelected.has(hit)) {
      freeSelected.clear();
      freeSelected.add(hit);
      updateFreeDrawRow();
      generateLayout('standard');
    }
    showFreeContextMenu(e.clientX, e.clientY, 'standard', freeSelected);
  });

  canvas.addEventListener('touchstart', function(e) {
    if(!active()) return;
    lastTouchInteraction = Date.now();
    if(e.touches.length !== 1) { freeAction = null; freeRedraw(); return; }
    e.preventDefault();
    freePointerDown(e.touches[0].clientX, e.touches[0].clientY, false, true);
  }, {passive: false});
  canvas.addEventListener('touchmove', function(e) {
    if(!freeAction) return;
    if(e.touches.length !== 1) { freeAction = null; freeRedraw(); return; }
    e.preventDefault();
    freePointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }, {passive: false});
  canvas.addEventListener('touchend', function() {
    lastTouchInteraction = Date.now();
    if(freeAction) freePointerUp();
  });

  document.addEventListener('keydown', function(e) {
    if(!active()) return;
    const el = document.activeElement;
    if(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
    if((e.key === 'Delete' || e.key === 'Backspace') && freeSelected.size > 0) {
      e.preventDefault();
      deleteFreeSelected();
    } else if(e.key === 'Escape') {
      if(freeSelected.size > 0) {
        freeSelected.clear();
        updateFreeDrawRow();
        freeRedraw();
      }
      Object.keys(freeLayerSel).forEach(canvasId => {
        if(freeLayerSel[canvasId].size === 0) return;
        freeLayerSel[canvasId].clear();
        generateLayout(FREE_LAYER_KIND[canvasId]);
      });
    }
  });
}
