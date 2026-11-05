// ==================== FREE-DRAW STRUCTURE ====================
// Bumpers for drawn (free) screens, worked out from the drawn panels. A hung wall takes
// bumpers on top of every panel with nothing above it; a ground-stacked wall under every
// panel with nothing below it. Side-by-side edge panels are paired from the left as grid
// columns are, a 2W per two widths of the family's narrowest panel and a 1W for an odd one
// left over (V4ST: two 0.5 m panels share a 2W, a 1 m panel takes a 2W). A bumper picks up
// its own weight plus the panels hanging from it (or stacked on it): every panel whose
// middle sits over it, nearest bumper first.

let freeStructureState = null;     // last calculateFreeStructure() result, read by the canvas

const FREE_BUMPER_COLORS = { '1w': '#2196F3', '2w': '#4CAF50', '4w': '#FF6B35' };

// A bumper's colour as the grid structure layout draws it: bottom 2Ws are orange
function freeBumperColor(type, position) {
  return type === '2w' && position === 'bottom' ? '#FF9800' : FREE_BUMPER_COLORS[type];
}

// Bumpers along one edge of a drawn wall: [{type, gx, cw, gy, panelType}], gx/cw in cells
// and gy the row the panel it carries starts (top) or ends (bottom) on
function freeBumpers(data, allPanels, position) {
  const cellMm = data.freeCell_mm;
  const occ = freeOccupancy(data.freePanels, allPanels, cellMm);
  const fam = freeFamily(data.freePanels[0].type, allPanels).types;
  const unit = Math.min(...fam.map(t => freeCells(allPanels[t], cellMm).cw));
  // Panels with a clear edge, by the row that edge sits on
  const levels = new Map();
  data.freePanels.forEach(fp => {
    const {cw, ch} = freeCells(allPanels[fp.type], cellMm);
    const edgeY = position === 'top' ? fp.gy - 1 : fp.gy + ch;
    for(let x = 0; x < cw; x++) if(occ.has(`${fp.gx + x},${edgeY}`)) return;
    const gy = position === 'top' ? fp.gy : fp.gy + ch;
    if(!levels.has(gy)) levels.set(gy, []);
    levels.get(gy).push({gx: fp.gx, cw, type: fp.type});
  });

  // Each run of edge panels side by side is paired from its left end
  const bumpers = [];
  levels.forEach((edge, gy) => {
    edge.sort((a, b) => a.gx - b.gx);
    for(let i = 0; i < edge.length; i++) {
      const run = [edge[i]];
      while(i + 1 < edge.length && edge[i + 1].gx === run[run.length - 1].gx + run[run.length - 1].cw) run.push(edge[++i]);
      const end = run[run.length - 1].gx + run[run.length - 1].cw;
      for(let x = run[0].gx; x < end;) {
        const cw = x + 2 * unit <= end ? 2 * unit : end - x;
        const panelType = run.find(p => x < p.gx + p.cw).type;
        bumpers.push({type: cw === 2 * unit ? '2w' : '1w', gx: x, cw, gy, panelType});
        x += cw;
      }
    }
  });
  return bumpers.sort((a, b) => a.gx - b.gx || a.gy - b.gy);
}

// The edge a drawn wall's bumpers go on: the top when it hangs, the bottom when it is
// ground stacked, none on the floor or with bumpers off
function freeBumperPosition(structureType, useBumpers) {
  if(!useBumpers) return null;
  return structureType === 'hanging' ? 'top' : (structureType === 'ground' ? 'bottom' : null);
}

// Bumpers for the current free screen, from the live structure settings
function calculateFreeStructure(data, allPanels) {
  const structureType = document.getElementById('structureType').value;
  freeStructureState = freeStructurePlan(data, allPanels, freeBumperPosition(structureType, showTopBumper || showBottomBumper));
  return freeStructureState;
}

// Bumpers (each labelled "2W #1" and so on), their pickup weights and the column-height
// warnings for a drawn wall with its bumpers on `position`
function freeStructurePlan(data, allPanels, position) {
  if(!data.freePanels.length) return {position: null, bumpers: [], counts: {'1w': 0, '2w': 0, '4w': 0}, bumperWeightKg: 0, warnings: []};

  const cellMm = data.freeCell_mm;
  // Listed 4W, 2W, 1W and left to right within each, as the grid Pickup Weights box lists them
  const order = {'4w': 0, '2w': 1, '1w': 2};
  const bumpers = (position ? freeBumpers(data, allPanels, position) : []).sort((a, b) => order[a.type] - order[b.type]);
  const counts = {'1w': 0, '2w': 0, '4w': 0};
  let bumperWeightKg = 0;
  bumpers.forEach(b => {
    counts[b.type]++;
    b.label = `${b.type.toUpperCase()} #${counts[b.type]}`;
    b.ownKg = (allPanels[b.panelType]['bumper_' + b.type + '_lbs'] || 0) * LBS_TO_KG;
    b.loadKg = b.ownKg;
    bumperWeightKg += b.ownKg;
  });

  // Each panel loads the nearest bumper level over its middle, shared by overlap width
  data.freePanels.forEach(fp => {
    const p = allPanels[fp.type];
    const {cw, ch} = freeCells(p, cellMm);
    const mid = fp.gx + cw / 2;
    const reach = bumpers.filter(b => b.gx < mid + cw / 2 && mid - cw / 2 < b.gx + b.cw &&
      (position === 'top' ? b.gy <= fp.gy : b.gy >= fp.gy + ch));
    if(!reach.length) return;
    const nearest = position === 'top' ? Math.max(...reach.map(b => b.gy)) : Math.min(...reach.map(b => b.gy));
    const level = reach.filter(b => b.gy === nearest);
    const overlap = b => Math.min(b.gx + b.cw, fp.gx + cw) - Math.max(b.gx, fp.gx);
    const total = level.reduce((s, b) => s + Math.max(0, overlap(b)), 0);
    const kg = getPanelWeight(fp.type, shouldUseConnectingPlates(fp.type));
    level.forEach(b => { b.loadKg += total > 0 ? kg * Math.max(0, overlap(b)) / total : kg / level.length; });
  });

  // Column height against the main panel's hanging / stacking limit, in its panel heights
  const warnings = [];
  const main = allPanels[data.panelType] || allPanels[data.freePanels[0].type];
  const limit = position === 'top' ? main.max_hanging : (position === 'bottom' ? main.max_stacking : null);
  if(limit && main.height_m) {
    const occ = freeOccupancy(data.freePanels, allPanels, cellMm);
    const names = freePanelNames(data.freePanels, allPanels, cellMm);
    bumpers.forEach(b => {
      let tallest = 0;
      for(let x = b.gx; x < b.gx + b.cw; x++) {
        let run = 0;
        const step = position === 'top' ? 1 : -1;
        for(let y = position === 'top' ? b.gy : b.gy - 1; occ.has(`${x},${y}`); y += step) run++;
        tallest = Math.max(tallest, run);
      }
      const high = tallest * cellMm / 1000 / main.height_m;
      if(high > limit + 0.001) {
        const owner = occ.get(`${b.gx},${position === 'top' ? b.gy : b.gy - 1}`);
        const where = owner ? `The column at panel ${names.get(owner)}` : 'A column';
        warnings.push(`${where} is ${+high.toFixed(1)} ${main.name} panels high; max ${position === 'top' ? 'hanging' : 'stacking'} is ${limit}.`);
      }
    });
  }

  return {position, bumpers, counts, bumperWeightKg, warnings: [...new Set(warnings)]};
}

// Draws a drawn wall's structure: white panels at their true sizes (with their names when
// o.numberSize is given), from (ox, oy) at cellPx a snap cell, and every bumper (bumperH
// tall, o.gap off the panel edge) on the edge it carries. o.weights labels each bumper with
// its type and pickup weight as the grid Structure layout does; without it, the type alone
// as the Combined view does. Shared by the Draw tab and the Combined view.
function drawFreeStructure(ctx, data, allPanels, st, o) {
  const toX = g => o.ox + Math.round(g * o.cellPx);
  const toY = g => o.oy + Math.round(g * o.cellPx);
  const names = freePanelNames(data.freePanels, allPanels, data.freeCell_mm);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  data.freePanels.forEach(fp => {
    const {cw, ch} = freeCells(allPanels[fp.type], data.freeCell_mm);
    const x = toX(fp.gx), y = toY(fp.gy), w = toX(fp.gx + cw) - x, h = toY(fp.gy + ch) - y;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    if(!o.numberSize) return;
    const label = names.get(`${fp.gx},${fp.gy}`);
    let fs = o.numberSize(w, h);
    ctx.font = `${fs}px Arial`;
    while(fs > 6 && ctx.measureText(label).width > w - 4) { fs--; ctx.font = `${fs}px Arial`; }
    if(fs >= 6) {
      ctx.fillStyle = '#000000';
      ctx.fillText(label, x + w / 2, y + h / 2);
    }
  });

  // Bumpers sit on the panel edge they carry
  const pdf = typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode;
  const h = o.bumperH;
  st.bumpers.forEach(bp => {
    const x = toX(bp.gx), w = toX(bp.gx + bp.cw) - x;
    const y = st.position === 'top' ? toY(bp.gy) - o.gap - h : toY(bp.gy) + o.gap;
    const color = freeBumperColor(bp.type, st.position);
    ctx.fillStyle = greyscalePrintMode ? toGreyscale(color) : (ecoPrintMode ? toPastelColor(color) : color);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    const type = bp.type.toUpperCase();
    if(!o.weights) {
      ctx.fillStyle = (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode) ? '#000000' : '#FFFFFF';
      ctx.font = 'bold 11px Arial';
      ctx.fillText(type, x + w / 2, y + h / 2);
      return;
    }
    ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#000000' : '#FFFFFF';
    const weight = `${displayWeightUnit === 'lbs' ? Math.ceil(bp.loadKg * KG_TO_LBS) : Math.ceil(bp.loadKg)}${displayWeightUnit}`;
    const fontLg = Math.max(pdf ? 12 : 10, Math.floor(h * 0.28));
    const fontSm = Math.max(pdf ? 11 : 9, Math.floor(h * 0.22));
    const offset = Math.max(6, Math.floor(h * 0.18));
    if(h < 25) {
      ctx.font = `bold ${fontSm}px Arial`;
      ctx.fillText(weight, x + w / 2, y + h / 2);
    } else {
      ctx.font = `bold ${fontLg}px Arial`;
      ctx.fillText(type, x + w / 2, y + h / 2 - offset);
      ctx.font = `${fontSm}px Arial`;
      ctx.fillText(weight, x + w / 2, y + h / 2 + offset);
    }
  });
}

// Structure layout for a free screen: the panels at their true sizes with every bumper
// drawn on its edge, the pickup weights beside them and any column-height warning.
function renderFreeStructureLayout() {
  const data = screens[currentScreenId].data;
  const allPanels = getAllPanels();
  const canvas = document.getElementById('structureCanvas');
  const container = document.getElementById('structureContainer');
  const ctx = canvas.getContext('2d');
  const isSimpleMode = typeof currentAppMode !== 'undefined' && currentAppMode === 'simple';
  if(!isSimpleMode) {
    container.style.display = 'block';
  }
  const st = freeStructureState;
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
  const pxPerM = Math.max(30, Math.min(pdf ? 200 : 80, Math.floor(maxCanvasWidth / (b.maxX * cellM))));
  const cellPx = pxPerM * cellM;
  const fam = freeFamily(data.freePanels[0].type, allPanels).types;
  const unitPx = Math.min(...fam.map(t => freeCells(allPanels[t], data.freeCell_mm).cw)) * cellPx;
  const bumperH = Math.max(30, Math.round(unitPx * 0.8));
  const top = st.position === 'top' ? bumperH : 0;
  canvas.width = Math.round(b.maxX * cellPx);
  canvas.height = Math.round(b.maxY * cellPx) + (st.position ? bumperH : 0);
  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawFreeStructure(ctx, data, allPanels, st, {
    ox: 0, oy: top, cellPx, bumperH, gap: 0, weights: true,
    numberSize: (w, h) => Math.max(10, Math.floor(Math.min(w, h) * (pdf ? 0.25 : 0.22)))
  });

  // Center-of-wall mark: thin red vertical line over the bumper band, as on grid screens
  const centerX = Math.round(canvas.width / 2);
  const wallBottom = top + Math.round(b.maxY * cellPx);
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if(st.position === 'top') {
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, top);
  } else if(st.position === 'bottom') {
    ctx.moveTo(centerX, wallBottom);
    ctx.lineTo(centerX, canvas.height);
  } else {
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, Math.min(bumperH, wallBottom));
  }
  ctx.stroke();

  const warnEl = document.getElementById('structureHeightWarning');
  if(warnEl) {
    warnEl.textContent = st.warnings.join(' ');
    warnEl.style.display = st.warnings.length ? 'block' : 'none';
  }

  // Pickup weights, in the box the grid structure layout uses
  const infoPanel = document.getElementById('structureInfoPanel');
  const weightsBox = document.getElementById('structureWeightsBox');
  const weightsContent = document.getElementById('structureWeightsContent');
  if(infoPanel && weightsBox && weightsContent) {
    weightsContent.textContent = '';
    infoPanel.style.display = st.bumpers.length ? 'grid' : 'none';
    weightsBox.style.display = st.bumpers.length ? 'block' : 'none';
    const wtUnit = getWeightUnitLabel();
    const shown = kg => displayWeightUnit === 'lbs' ? Math.ceil(kg * KG_TO_LBS) : Math.ceil(kg);
    const row = (label, value, color, total) => {
      const r = document.createElement('div');
      r.className = 'weight-row';
      if(total) r.style.cssText = 'border-top: 1px solid #4a9eff; margin-top: 6px; padding-top: 6px;';
      const l = document.createElement('span');
      l.className = 'weight-label';
      l.style.color = color;
      l.textContent = label;
      const v = document.createElement('span');
      v.className = 'weight-value';
      if(total) v.style.color = '#4a9eff';
      v.textContent = `${value} ${wtUnit}`;
      r.appendChild(l);
      r.appendChild(v);
      weightsContent.appendChild(r);
    };
    st.bumpers.forEach(bp => row(bp.label, shown(bp.loadKg), freeBumperColor(bp.type, st.position), false));
    if(st.bumpers.length) row('Total', shown(st.bumpers.reduce((s, bp) => s + bp.loadKg, 0)), '#fff', true);
  }
}
