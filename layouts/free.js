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
let freeView = null;          // last render: {gx0, gy0, cellPx, cols, rows}
let freeAction = null;        // pointer gesture in progress
let freeEdgeScroll = null;    // {dx, dy, x, y, timer} while a drag holds the pointer at an edge
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

// The gaps in a drawn screen's area as the cable diagrams outline knocked-out panels:
// [{gx, gy, cw, ch}] in cells, a whole main panel wherever one fits on the main panel's
// lattice, single cells elsewhere
function freeHoleRects(data, allPanels) {
  const b = freeBounds(data.freePanels, allPanels, data.freeCell_mm);
  if(!b) return [];
  const occ = freeOccupancy(data.freePanels, allPanels, data.freeCell_mm);
  const main = allPanels[data.panelType] || allPanels[data.freePanels[0].type];
  const {cw: mw, ch: mh} = freeCells(main, data.freeCell_mm);
  const used = new Set();
  const rects = [];
  for(let by = 0; by + mh <= b.maxY; by += mh) {
    for(let bx = 0; bx + mw <= b.maxX; bx += mw) {
      const cells = [];
      for(let x = 0; x < mw; x++) for(let y = 0; y < mh; y++) cells.push(`${bx + x},${by + y}`);
      if(cells.some(k => occ.has(k))) continue;
      cells.forEach(k => used.add(k));
      rects.push({gx: bx, gy: by, cw: mw, ch: mh});
    }
  }
  for(let y = 0; y < b.maxY; y++) for(let x = 0; x < b.maxX; x++) {
    if(!occ.has(`${x},${y}`) && !used.has(`${x},${y}`)) rects.push({gx: x, gy: y, cw: 1, ch: 1});
  }
  return rects;
}

// Where a drawn screen's name goes, as grid screens place theirs: over the middle of its
// panels, or on the nearest panel's centre when that lands in a gap. {x, y} in cells.
function freeNamePoint(data, allPanels) {
  const centres = data.freePanels.map(fp => {
    const {cw, ch} = freeCells(allPanels[fp.type], data.freeCell_mm);
    return {x: fp.gx + cw / 2, y: fp.gy + ch / 2};
  });
  let x = centres.reduce((s, c) => s + c.x, 0) / centres.length;
  let y = centres.reduce((s, c) => s + c.y, 0) / centres.length;
  if(!freeOccupancy(data.freePanels, allPanels, data.freeCell_mm).has(`${Math.floor(x)},${Math.floor(y)}`)) {
    const d = c => (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y);
    const near = centres.reduce((a, c) => d(c) < d(a) ? c : a);
    x = near.x;
    y = near.y;
  }
  return {x, y};
}

// Pixels for a Draw-tab layout `cols` snap cells wide, sized as generateLayout()
// (core/calculate.js) sizes a grid wall of the screen's main panel: 30-80 px a panel width,
// a tall CB5 capped so its height stays in range. unitPx is one main panel's width, cellPx
// a snap cell's share of it.
function freeLayoutSize(data, allPanels, cols, maxCanvasWidth, pdf) {
  const main = allPanels[data.panelType] || allPanels[data.freePanels[0].type];
  const unit = data.freeCell_mm / (main.width_m * 1000);
  const ratio = getPanelHeightRatio(data.panelType);
  const maxSize = (!pdf && ratio > 1) ? Math.floor(80 / ratio) : 80;
  const unitPx = Math.max(30, Math.min(maxSize, Math.floor(maxCanvasWidth / (cols * unit))));
  return {unitPx, cellPx: unitPx * unit};
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

// ==================== CELL VIEW ====================
// A drawn screen as the views that place a screen by its pixels see it (Canvas, Raster,
// Resolume, PNG export, Combined): a grid of its snap cells, panelsWide × panelsHigh, with
// every cell no panel covers knocked out and freeCellPanel standing in for the panel type
// (one cell's size and pixels). Like splitPartView() for a split screen, so their grid
// code runs unchanged; only the loops that draw panels one by one read freePlacedPanels().
// Writing canvasX / canvasY moves the real screen.
function freeCellData(data, allPanels) {
  const b = freeBounds(data.freePanels, allPanels, data.freeCell_mm);
  const view = Object.create(data);
  view.panelsWide = b ? b.maxX : 0;
  view.panelsHigh = b ? b.maxY : 0;
  view.addCB5HalfRow = false;
  view.split = null;
  if(b) {
    const ref = allPanels[data.freePanels[0].type];
    const cellM = data.freeCell_mm / 1000;
    view.freeCellPanel = Object.assign({}, ref, {
      width_m: cellM, height_m: cellM,
      res_x: Math.round(ref.res_x * cellM / ref.width_m), res_y: Math.round(ref.res_y * cellM / ref.height_m)
    });
    const occ = freeOccupancy(data.freePanels, allPanels, data.freeCell_mm);
    const holes = new Set();
    for(let x = 0; x < b.maxX; x++) for(let y = 0; y < b.maxY; y++) if(!occ.has(`${x},${y}`)) holes.add(`${x},${y}`);
    view.deletedPanels = holes;
  }
  Object.defineProperty(view, 'canvasX', { get: () => data.canvasX, set: v => { data.canvasX = v; }, enumerable: true });
  Object.defineProperty(view, 'canvasY', { get: () => data.canvasY, set: v => { data.canvasY = v; }, enumerable: true });
  return view;
}

// A screen as a canvas item: a drawn screen through freeCellData(), any other as it is
function freeCanvasItem(screen) {
  if(!isFreeScreen(screen.data)) return screen;
  const item = Object.create(screen);
  item.data = freeCellData(screen.data, getAllPanels());
  return item;
}

// Draws a drawn screen's panels at their true sizes for drawScreenToContext(): the
// two-tone fill, outline and "column.row" name the grid panels get
function drawFreePanelsToContext(ctx, data, allPanels, offsetX, offsetY, colors, dataOverlay) {
  const wall = freePlacedPanels(data, allPanels);
  const tones = freeColorIndexes(data.freePanels, allPanels, data.freeCell_mm);
  const names = freePanelNames(data.freePanels, allPanels, data.freeCell_mm);
  wall.panels.forEach((pp, i) => {
    const x = offsetX + pp.x_px, y = offsetY + pp.y_px;
    ctx.fillStyle = colors[tones[i]];
    ctx.fillRect(x, y, pp.w_px, pp.h_px);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, pp.w_px, pp.h_px);
    ctx.fillStyle = '#FFFFFF';
    const label = names.get(pp.key);
    if(dataOverlay && dataOverlay.active) {
      ctx.font = `${Math.max(10, Math.min(pp.w_px, pp.h_px) / 6)}px Arial`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      const pad = Math.max(3, pp.w_px * 0.05);
      ctx.fillText(label, x + pp.w_px - pad, y + pad);
    } else {
      ctx.font = `${Math.max(12, Math.min(pp.w_px, pp.h_px) / 4)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + pp.w_px / 2, y + pp.h_px / 2);
    }
  });
}

// Size, pixels, watts and panel weight of a drawn wall, for summaries that would
// otherwise multiply one panel's figures by a panel count
function freeWallTotals(data, allPanels, powerType) {
  const wall = freePlacedPanels(data, allPanels);
  return {
    widthM: wall.widthM, heightM: wall.heightM, resX: wall.resX, resY: wall.resY,
    watts: data.freePanels.reduce((sum, fp) => sum + freePanelWatts(allPanels[fp.type], powerType), 0),
    maxPanelW: Math.max(0, ...data.freePanels.map(fp => freePanelWatts(allPanels[fp.type], powerType))),
    weightKg: data.freePanels.reduce((sum, fp) => sum + getPanelWeight(fp.type, shouldUseConnectingPlates(fp.type)), 0)
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
  // A drawn screen's bumpers are placed for it, so the grid's manual bumper tools hide
  const structureEl = document.getElementById('structureContainer');
  if(structureEl) structureEl.classList.toggle('free-structure', isFree);
  // Select Mode for the drawn Power and Data layouts, one each so every layout is selected
  // on its own; off whenever it is hidden so a grid screen's canvases stay view-only
  [['powerCanvas', 'freePowerSelectModeRow'], ['dataCanvas', 'freeDataSelectModeRow']].forEach(([canvasId, rowId]) => {
    const modeRow = document.getElementById(rowId);
    if(modeRow) modeRow.style.display = on ? '' : 'none';
    if(!on && freeLayerSelectMode[canvasId]) setFreeSelectMode(canvasId, false);
  });
  updateFreeDataPathRow(on);
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

// Standard layout tool: Draw only places panels; Select picks, moves and deletes them
function setFreeTool(tool) {
  freeTool = tool;
  freeHover = null;
  if(tool === 'draw') freeSelected.clear();
  updateFreeDrawRow();
  freeRedraw();
}

// Specs, stored totals and the Standard, Power, Data and Structure layouts for the
// current screen when it is a free screen.
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
  const structure = calculateFreeStructure(data, allPanels);
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
    const kgShown = kg => displayWeightUnit === 'lbs' ? Math.ceil(kg * KG_TO_LBS) : Math.ceil(kg);
    const structureKg = structure.bumperWeightKg + (structure.groundSupport ? structure.groundSupport.totalWeightKg : 0) +
      (structure.plates ? structure.plates.totalPlateWeight : 0) + (structure.floorFrames ? structure.floorFrames.totalWeightKg : 0);
    if(structureKg > 0) {
      html += `<div class="result-row"><strong>Total weight:</strong> ${kgShown(panelWeightKg + structureKg)} ${wtUnit}</div>`;
      html += `<div class="result-row result-indent"><strong>Panels:</strong> ${weightDisplay} ${wtUnit}</div>`;
      html += `<div class="result-row result-indent"><strong>Structure:</strong> ${kgShown(structureKg)} ${wtUnit}</div>`;
    } else {
      html += `<div class="result-row"><strong>Wall weight:</strong> ${weightDisplay} ${wtUnit}</div>`;
    }
    const bumperText = ['1w', '2w', '4w'].filter(t => structure.counts[t] > 0).map(t => `${structure.counts[t]} × ${t.toUpperCase()}`).join(', ');
    if(bumperText) html += `<div class="result-row"><strong>Bumpers:</strong> ${bumperText}</div>`;
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
    bumperWeightKg: structure.bumperWeightKg,
    bumper1wCount: structure.counts['1w'],
    bumper2wCount: structure.counts['2w'],
    bumper4wCount: structure.counts['4w'],
    groundSupport: structure.groundSupport,
    plates2way: structure.plates ? structure.plates.total2way : 0,
    plates4way: structure.plates ? structure.plates.total4way : 0,
    platesWeightKg: structure.plates ? structure.plates.totalPlateWeight : 0,
    groundSupportWeightKg: structure.groundSupport ? structure.groundSupport.totalWeightKg : 0,
    floorFrames: structure.floorFrames
      ? Object.assign({}, structure.floorFrames.counts, {totalWeightLbs: structure.floorFrames.totalWeightLbs, totalWeightKg: structure.floorFrames.totalWeightKg})
      : {frame_1x1: 0, frame_2x1: 0, frame_2x2: 0, frame_3x2: 0, totalWeightLbs: 0, totalWeightKg: 0},
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

  updateFreeDrawRow();
  generateLayout('standard');
  if(totalPanels > 0) {
    generateLayout('power');
    renderPhaseBalanceLegend();
    generateLayout('data');
    renderFreeStructureLayout();
  } else {
    document.getElementById('powerContainer').style.display = 'none';
    document.getElementById('dataContainer').style.display = 'none';
    document.getElementById('structureContainer').style.display = 'none';
    renderDataLineMap();
  }
  showCanvasView();
  generateGearList();
  if(typeof updateCanvasFitWarning === 'function') updateCanvasFitWarning();
}

// Two-tone fill like the grid's checkerboard: by column + row as freePanelNames numbers
// them, so a wall of one panel size colours exactly as its grid would. Where that puts one
// colour on two touching panels (mixed sizes), each panel takes the first colour unless a
// panel it touches already has it.
function freeColorIndexes(list, allPanels, cellMm) {
  const cols = [...new Set(list.map(fp => fp.gx))].sort((a, b) => a - b);
  const rows = [...new Set(list.map(fp => fp.gy))].sort((a, b) => a - b);
  const checker = list.map(fp => (cols.indexOf(fp.gx) + rows.indexOf(fp.gy)) % 2);
  const occ = freeOccupancy(list, allPanels, cellMm);
  const at = new Map(list.map((fp, i) => [`${fp.gx},${fp.gy}`, i]));
  const clash = list.some((fp, i) => {
    const {cw, ch} = freeCells(allPanels[fp.type], cellMm);
    const side = [];
    for(let x = 0; x < cw; x++) side.push(`${fp.gx + x},${fp.gy + ch}`);
    for(let y = 0; y < ch; y++) side.push(`${fp.gx + cw},${fp.gy + y}`);
    return side.some(k => occ.has(k) && checker[at.get(occ.get(k))] === checker[i]);
  });
  if(!clash) return checker;
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
  // Editing shows the snap grid, selection and ghost; a PDF capture crops to the panels
  const pdf = typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode;
  const editing = freeDrawMode && !pdf;
  const showGrid = editing || !b;
  // A drag keeps the grid it started on, scrolled along when held at an edge
  const held = editing && freeAction && freeAction.view;
  let gx0, gy0, cols, rows;
  if(held) {
    ({gx0, gy0, cols, rows} = held);
  } else if(!b) {
    gx0 = 0; gy0 = 0; cols = 16; rows = 8;
  } else if(showGrid) {
    gx0 = b.minX - 2; gy0 = b.minY - 2;
    cols = Math.max(16, b.maxX - b.minX + 4); rows = Math.max(8, b.maxY - b.minY + 4);
  } else {
    gx0 = b.minX; gy0 = b.minY; cols = b.maxX - b.minX; rows = b.maxY - b.minY;
  }
  const cellM = cellMm / 1000;
  const cellPx = held ? held.cellPx : freeLayoutSize(data, allPanels, cols, maxCanvasWidth, typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode).cellPx;
  const pxPerM = cellPx / cellM;
  canvas.width = Math.round(cols * cellPx);
  canvas.height = Math.round(rows * cellPx);
  freeView = {gx0, gy0, cellPx, cols, rows};

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
  const names = freePanelNames(list, allPanels, cellMm);
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
    if(editing && freeSelected.has(`${fp.gx},${fp.gy}`)) {
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
    // "column.row", as the grid numbers its panels; shrunk to fit narrow panels and left
    // off when it would be unreadable
    const label = names.get(`${fp.gx},${fp.gy}`);
    const textW = ctx.measureText(label).width;
    const fitSize = textW > w - 6 ? Math.floor(fontSize * (w - 6) / textW) : fontSize;
    if(fitSize >= 7) {
      ctx.font = `${fitSize}px Arial`;
      ctx.fillStyle = '#000000';
      ctx.fillText(label, x+w/2, y+h/2);
      ctx.font = `${fontSize}px Arial`;
    }
  });

  if(editing) drawFreeGhost(ctx, data, allPanels, toX, toY);
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
  if(freeAction && freeAction.kind === 'paint' && freeAction.moved) drawFreePaintCount(ctx, boxes, toX, toY);
}

// "columns × rows · N panels" for a paint drag, beside the corner of the block under the
// pointer, at the same on-screen size however much the canvas is scaled down
function drawFreePaintCount(ctx, boxes, toX, toY) {
  const nx = new Set(boxes.map(bx => bx.gx)).size;
  const ny = new Set(boxes.map(bx => bx.gy)).size;
  const n = boxes.filter(bx => bx.ok).length;
  const text = `${nx} × ${ny} · ${n} panel${n === 1 ? '' : 's'}`;
  const canvas = ctx.canvas;
  const scale = canvas.width / (canvas.getBoundingClientRect().width || canvas.width);
  const fs = Math.round(13 * scale), pad = Math.round(6 * scale);
  ctx.save();
  ctx.font = `bold ${fs}px Arial`;
  const w = ctx.measureText(text).width + pad * 2, h = fs + pad * 2;
  const right = freeAction.cur.gx >= freeAction.start.gx, down = freeAction.cur.gy >= freeAction.start.gy;
  const edgeX = right ? Math.max(...boxes.map(bx => toX(bx.gx + bx.cw))) : Math.min(...boxes.map(bx => toX(bx.gx)));
  const edgeY = down ? Math.max(...boxes.map(bx => toY(bx.gy + bx.ch))) : Math.min(...boxes.map(bx => toY(bx.gy)));
  const x = Math.max(0, Math.min(canvas.width - w, right ? edgeX + pad : edgeX - pad - w));
  const y = Math.max(0, Math.min(canvas.height - h, down ? edgeY + pad : edgeY - pad - h));
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = Math.max(1, scale);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + pad, y + h / 2);
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
  // Drawn data paths follow their panels too
  const data = screens[currentScreenId] && screens[currentScreenId].data;
  if(data && data.freeDataPaths) {
    data.freeDataPaths = data.freeDataPaths
      .map(p => ({line: p.line, panels: p.panels.map(newKey).filter(k => k !== null)}))
      .filter(p => p.panels.length);
  }
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
  // New panels put the automatic bumpers back, as a grid screen's new size does
  delete data.freeBumpers;
  delete data.freeBumpersPosition;
  data.freePanels = list;
  normalizeFreePanels(data, getAllPanels());
  // The specs above the Standard layout grow and shrink with the panels; keep the layout
  // where it sits on screen
  const canvas = document.getElementById('standardCanvas');
  const top = canvas.getBoundingClientRect().top;
  calculate();
  window.scrollBy(0, canvas.getBoundingClientRect().top - top);
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

// The cell under a dragging pointer, kept to the grid on show: past an edge it is the edge
// cell, and the grid scrolls on to meet the pointer (freeEdgeScrollAt)
function freeDragCellAt(clientX, clientY) {
  const rect = document.getElementById('standardCanvas').getBoundingClientRect();
  return freeCellAt(Math.min(Math.max(clientX, rect.left), rect.right - 1), Math.min(Math.max(clientY, rect.top), rect.bottom - 1));
}

// A drag held at or past an edge of the Standard layout scrolls the grid that way, a brush
// panel at a time (a cell when moving or selecting), so a wall can be drawn bigger than the
// box shows
function freeEdgeScrollAt(clientX, clientY) {
  const rect = document.getElementById('standardCanvas').getBoundingClientRect();
  const zone = 8;
  const dx = clientX > rect.right - zone ? 1 : (clientX < rect.left + zone ? -1 : 0);
  const dy = clientY > rect.bottom - zone ? 1 : (clientY < rect.top + zone ? -1 : 0);
  const timer = freeEdgeScroll ? freeEdgeScroll.timer : 0;
  freeEdgeScroll = {dx, dy, x: clientX, y: clientY, timer};
  if((dx || dy) && !timer) freeEdgeScroll.timer = setInterval(freeEdgeScrollTick, 100);
}

function freeEdgeScrollTick() {
  const s = freeEdgeScroll;
  if(!freeAction || !freeAction.view || !(s.dx || s.dy)) {
    clearInterval(s.timer);
    s.timer = 0;
    return;
  }
  const data = screens[currentScreenId].data;
  const allPanels = getAllPanels();
  const step = freeAction.kind === 'paint' && freeBrushType && allPanels[freeBrushType]
    ? freeCells(allPanels[freeBrushType], data.freeCell_mm) : {cw: 1, ch: 1};
  freeAction.view.gx0 += s.dx * step.cw;
  freeAction.view.gy0 += s.dy * step.ch;
  freeView = Object.assign({}, freeAction.view);
  freeAction.cur = freeDragCellAt(s.x, s.y);
  freeRedraw();
}

function freeRedraw() {
  if(freeRafId) return;
  freeRafId = requestAnimationFrame(() => {
    freeRafId = 0;
    if(isFreeCurrentScreen()) generateLayout('standard');
  });
}

// The Draw tool only places panels: a click or drag paints wherever it starts. With the
// Select tool, `additive` (Shift/Ctrl/⌘ held) makes a click toggle a panel and a drag on
// empty space add a selection box; `touch`: a tap adds a panel to the selection and a tap
// on a selected panel opens the options menu, like Select Mode on the grid.
function freePointerDown(clientX, clientY, additive, touch) {
  const data = screens[currentScreenId].data;
  const allPanels = getAllPanels();
  const cell = freeCellAt(clientX, clientY);
  const hit = freeOccupancy(data.freePanels, allPanels, data.freeCell_mm).get(`${cell.gx},${cell.gy}`);
  if(freeTool === 'draw') {
    freeAction = {kind: 'paint', start: cell, cur: cell, moved: false, x: clientX, y: clientY};
  } else if(hit) {
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
  } else {
    // A plain drag on empty grid starts a fresh selection box
    if(!additive) freeSelected.clear();
    freeAction = {kind: 'box', start: cell, cur: cell, moved: false, x: clientX, y: clientY};
  }
  freeAction.view = Object.assign({}, freeView);
  freeHover = null;
  updateFreeDrawRow();
  freeRedraw();
}

function freePointerMove(clientX, clientY) {
  if(!freeAction) return;
  if(!freeAction.moved && Math.abs(clientX - freeAction.x) <= 4 && Math.abs(clientY - freeAction.y) <= 4) return;
  freeAction.moved = true;
  freeEdgeScrollAt(clientX, clientY);
  const cell = freeDragCellAt(clientX, clientY);
  if(cell.gx === freeAction.cur.gx && cell.gy === freeAction.cur.gy) return;
  freeAction.cur = cell;
  freeRedraw();
}

function freePointerUp() {
  const action = freeAction;
  freeAction = null;
  if(freeEdgeScroll) {
    clearInterval(freeEdgeScroll.timer);
    freeEdgeScroll = null;
  }
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
  // Right-click a panel with the Select tool: select it if it isn't already, then show the
  // options menu
  canvas.addEventListener('contextmenu', function(e) {
    if(!active()) return;
    e.preventDefault();
    if(freeTool === 'draw') return;
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
