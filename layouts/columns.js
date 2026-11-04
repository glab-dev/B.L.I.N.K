// ==================== COLUMN-STACK (MIXED PANEL) LAYOUT ====================
// A mixed-panel screen is a row of columns. Each column is one width wide and holds
// a stack of panels of that width, listed bottom to top, so one screen can mix sizes
// (e.g. V4ST 1000x1000 columns next to V4ST-V 500x1000 columns, capped with V4ST-H).
// Stored on the screen as data.layoutMode = 'columns' and
// data.columns = [{width_m, rigging: 'hung' | 'stacked', panels: [panelTypeId, ...]}].

function isColumnsScreen(data) {
  return !!(data && data.layoutMode === 'columns' && Array.isArray(data.columns) && data.columns.length > 0);
}

// Every panel of a columns layout with its place on the wall, in metres and in
// pixels. Columns stand side by side on one shared bottom line; y runs down from the
// top of the tallest column. idx counts panels from the top of their column,
// fromBottom from the bottom (the shared bottom line keeps the checkerboard aligned).
function columnsPlacedPanels(columns, allPanels) {
  const stacks = columns.map(col => col.panels.map(t => allPanels[t]));
  const stackHM = s => s.reduce((h, p) => h + p.height_m, 0);
  const stackHPx = s => s.reduce((h, p) => h + p.res_y, 0);
  const heightM = Math.max(...stacks.map(stackHM));
  const resY = Math.max(...stacks.map(stackHPx));
  const placed = [];
  let x_m = 0, x_px = 0;
  columns.forEach((col, c) => {
    const s = stacks[c];
    let y_m = heightM - stackHM(s);
    let y_px = resY - stackHPx(s);
    for(let i = s.length - 1; i >= 0; i--) {
      const p = s[i];
      placed.push({
        type: col.panels[i], col: c, idx: s.length - 1 - i, fromBottom: i,
        x_m, y_m, w_m: col.width_m, h_m: p.height_m,
        x_px, y_px, w_px: p.res_x, h_px: p.res_y
      });
      y_m += p.height_m;
      y_px += p.res_y;
    }
    x_m += col.width_m;
    x_px += s.length ? s[0].res_x : 0; // empty only while being edited
  });
  return {panels: placed, widthM: x_m, heightM, resX: x_px, resY};
}

// Panel count per panel type, e.g. {V4ST: 93, V4ST_V: 20}.
function columnsPanelCounts(columns) {
  const counts = {};
  columns.forEach(col => col.panels.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
  return counts;
}

// Power circuits for a columns layout. Whole columns share a circuit until the next
// column would go over the breaker's watts (or the max-panels-per-circuit override); a
// column that needs more than one circuit is split from the bottom up. Panel ids are
// "column:fromBottom".
function columnsPowerPlan(columns, panelWatts, capacityW, maxPanels) {
  const circuits = [];
  let cur = null;
  const close = () => { if(cur && cur.panels.length) circuits.push(cur); cur = null; };
  const fits = (w, n) => cur && cur.watts + w <= capacityW && (!maxPanels || cur.panels.length + n <= maxPanels);
  const open = () => { close(); cur = { panels: [], watts: 0, cols: new Set() }; };
  columns.forEach((col, c) => {
    const panels = col.panels.map((t, i) => ({ id: `${c}:${i}`, w: panelWatts(t) }));
    const colW = panels.reduce((sum, pnl) => sum + pnl.w, 0);
    if(colW <= capacityW && (!maxPanels || panels.length <= maxPanels)) {
      if(!fits(colW, panels.length)) open();
      panels.forEach(pnl => cur.panels.push(pnl.id));
      cur.watts += colW;
      cur.cols.add(c);
    } else {
      open();
      panels.forEach(pnl => {
        if(!fits(pnl.w, 1)) open();
        cur.panels.push(pnl.id);
        cur.watts += pnl.w;
        cur.cols.add(c);
      });
      close();
    }
  });
  close();
  const panelCircuit = new Map();
  circuits.forEach((ci, n) => ci.panels.forEach(id => panelCircuit.set(id, n)));
  return { circuits, panelCircuit };
}

// Data lines for a columns layout. The path snakes column by column, left to right:
// 'top' starts the first column at its top, 'bottom' at its bottom; 'all_top' /
// 'all_bottom' run every column the same way. A line takes panels until the next one
// would go over the port's pixel capacity (or the max-panels-per-data-line override).
function columnsDataPlan(wall, startDir, capacityPx, maxPanels) {
  const byCol = [];
  wall.panels.forEach(pp => { (byCol[pp.col] = byCol[pp.col] || []).push(pp); }); // top to bottom
  const fromTop = startDir === 'top' || startDir === 'all_top' || startDir === 'lr_top';
  const snake = startDir !== 'all_top' && startDir !== 'all_bottom';
  const lines = [];
  let cur = null;
  let n = 0;
  byCol.forEach(list => {
    const down = snake ? (n % 2 === 0) === fromTop : fromTop;
    n++;
    (down ? list : list.slice().reverse()).forEach(pp => {
      const px = pp.w_px * pp.h_px;
      if(!cur || cur.px + px > capacityPx || (maxPanels && cur.panels.length >= maxPanels)) {
        cur = { panels: [], px: 0 };
        lines.push(cur);
      }
      cur.panels.push(pp);
      cur.px += px;
    });
  });
  return { lines };
}

// Bumpers for a columns layout: one per hung column, sized by the column's width in
// units of the family's narrowest panel (V4ST: 0.5 m column = 1W, 1 m column = 2W).
// Ground-stacked columns take none.
function columnsBumpers(data, allPanels) {
  const family = mixedLayoutFamily(data.panelType);
  const unit = Math.min(...(family.length ? family : [data.panelType]).map(t => allPanels[t].width_m));
  const counts = { '1w': 0, '2w': 0, '4w': 0 };
  data.columns.forEach(col => {
    if(col.rigging !== 'hung') return;
    const k = Math.round(col.width_m / unit);
    if(k === 2) counts['2w']++;
    else if(k === 4) counts['4w']++;
    else counts['1w'] += Math.max(1, k);
  });
  const p = allPanels[data.panelType] || {};
  const lbs = (counts['1w'] * (p.bumper_1w_lbs || 0)) + (counts['2w'] * (p.bumper_2w_lbs || 0)) + (counts['4w'] * (p.bumper_4w_lbs || 0));
  return { counts, weightKg: lbs * LBS_TO_KG };
}

// Everything a columns screen's specs, layouts and gear read, from its columns and its
// power / data settings: the live form for the open screen, the saved values for the rest
function columnsScreenPlans(data) {
  const allPanels = getAllPanels();
  const wall = columnsPlacedPanels(data.columns, allPanels);
  const live = screens[currentScreenId] && screens[currentScreenId].data === data;
  const setting = (id, key) => live ? document.getElementById(id).value : data[key];
  const powerType = setting('powerType', 'powerType') || 'max';
  const voltage = parseFloat(setting('voltage', 'voltage'))||220;
  const breaker = parseFloat(setting('breaker', 'breaker'))||20;
  const derate = (live ? document.getElementById('derate').value === 'on' : !!data.derate) ? 0.8 : 1.0;
  const panelWatts = t => {
    const p = allPanels[t];
    return powerType==='max' ? p.power_max_w : (p.power_avg_w||p.power_max_w*0.5);
  };
  const capacityW = voltage*breaker*derate;
  const maxPerCircuit = parseInt(setting('maxPanelsPerCircuit', 'maxPanelsPerCircuit')) || 0;
  const pr = getAllProcessors()[setting('processor', 'processor')];
  const frameRate = parseInt(setting('frameRate', 'frameRate')) || 60;
  const bitDepth = parseInt(setting('bitDepth', 'bitDepth')) || 8;
  const capacityPx = calculateAdjustedPixelCapacity(pr, frameRate, bitDepth);
  const maxPerData = parseInt(setting('maxPanelsPerData', 'maxPanelsPerData')) || 0;
  return {
    allPanels, wall, powerType, voltage, derate, panelWatts, capacityW, pr, capacityPx,
    power: columnsPowerPlan(data.columns, panelWatts, capacityW, maxPerCircuit),
    // Same 500-panel port ceiling as grid screens (Brompton Tessera hardware limit)
    dataPlan: columnsDataPlan(wall, setting('dataStartDir', 'dataStartDir') || 'top', capacityPx, Math.min(maxPerData || 500, 500))
  };
}

// Specs, stored totals and the Standard, Power and Data layouts for the current
// screen when it is a columns screen. Its bumpers show in the specs and gear; the grid
// Structure layout (manual bumpers, plates, ground support) stays hidden.
function calculateColumnsScreen() {
  const screen = screens[currentScreenId];
  const data = screen.data;
  const plans = columnsScreenPlans(data);
  const { allPanels, wall, powerType, voltage, panelWatts, pr, capacityPx } = plans;
  const counts = columnsPanelCounts(data.columns);
  const types = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const phase = parseInt(document.getElementById('phase').value)||3;

  let totalPanels = 0, totalPixels = 0, panelWeightKg = 0, totalPowerW = 0;
  types.forEach(t => {
    const p = allPanels[t];
    const n = counts[t];
    totalPanels += n;
    totalPixels += n * p.res_x * p.res_y;
    panelWeightKg += n * getPanelWeight(t, shouldUseConnectingPlates(t));
    totalPowerW += n * panelWatts(t);
  });
  const totalAmps = totalPowerW / voltage;
  const ampsPerPhase = phase===3 ? (totalAmps / Math.sqrt(3)) : totalAmps;

  const circuits = plans.power.circuits;
  const socaCount = Math.ceil(circuits.length / 6);
  const socaBreakdown = [];
  circuits.forEach((ci, n) => {
    const socaIdx = Math.floor(n / 6);
    if(!socaBreakdown[socaIdx]) socaBreakdown[socaIdx] = { socaIdx, circuits: [], totalAmps: 0 };
    socaBreakdown[socaIdx].circuits.push({ circuit: n, amps: ci.watts / voltage });
    socaBreakdown[socaIdx].totalAmps += ci.watts / voltage;
  });
  const dataLines = plans.dataPlan.lines.length;
  const redundancyMultiplier = redundancyEnabled ? 2 : 1;
  const bumpers = columnsBumpers(data, allPanels);
  // Columns taller than the panel's hanging / stacking limit, counted in main-panel heights
  const mainPanel = allPanels[data.panelType] || {};
  const structureWarnings = [];
  data.columns.forEach((col, c) => {
    const limit = col.rigging === 'hung' ? mainPanel.max_hanging : mainPanel.max_stacking;
    if(!limit || !mainPanel.height_m) return;
    const high = col.panels.reduce((h, t) => h + allPanels[t].height_m, 0) / mainPanel.height_m;
    if(high > limit + 0.001) structureWarnings.push(`Column ${c + 1} is ${+high.toFixed(1)} panels high; ${mainPanel.name} max ${col.rigging === 'hung' ? 'hanging' : 'stacking'} is ${limit}.`);
  });

  screen.calculatedData = {
    processorName: pr ? pr.name : '',
    processorCount: 1,
    panelCount: totalPanels,
    activePanels: totalPanels,
    panelWeightOnlyKg: panelWeightKg,
    bumperWeightKg: bumpers.weightKg,
    bumper1wCount: bumpers.counts['1w'],
    bumper2wCount: bumpers.counts['2w'],
    bumper4wCount: bumpers.counts['4w'],
    dataLines: dataLines,
    dataLinesFinal: dataLines * redundancyMultiplier,
    portsNeeded: dataLines,
    portsNeededFinal: dataLines * redundancyMultiplier,
    totalPixels: totalPixels,
    circuitsNeeded: circuits.length,
    socaCount: socaCount,
    socaBreakdown: socaBreakdown,
    phaseBalance: null
  };
  // Processor and box counts as the gear list has them, the same as grid screens
  const gearGroup = Object.values(buildGearListData([currentScreenId]).processorGroups)[0];
  if(gearGroup) {
    screen.calculatedData.processorCount = gearGroup.processorCount;
    screen.calculatedData.distributionBoxCount = gearGroup.distBoxCount;
    screen.calculatedData.distributionBoxName = gearGroup.distBoxName;
  }
  const cd = screen.calculatedData;

  const lenUnit = getLengthUnitLabel();
  const wtUnit = getWeightUnitLabel();
  const len = m => (displayLengthUnit === 'ft' ? m * M_TO_FT : m).toFixed(2);
  const weight = kg => displayWeightUnit === 'lbs' ? Math.ceil(kg * KG_TO_LBS) : Math.ceil(kg);
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
  html += `<div class="result-row"><strong>Dimensions:</strong> ${len(wall.widthM)} ${lenUnit} × ${len(wall.heightM)} ${lenUnit} (${data.columns.length} columns)</div>`;
  html += `<div class="result-row"><strong>Total panel count:</strong> ${totalPanels}</div>`;
  html += `<div class="result-row"><strong>Resolution:</strong> ${wall.resX} × ${wall.resY}</div>`;
  html += `<div class="result-row"><strong>Total pixel count:</strong> (${totalPixels.toLocaleString()} px)</div>`;
  html += `<div class="result-row"><strong>Total weight:</strong> ${weight(panelWeightKg + bumpers.weightKg)} ${wtUnit}</div>`;
  html += `<div class="result-row result-indent"><strong>Panels:</strong> ${weight(panelWeightKg)} ${wtUnit}</div>`;
  html += `<div class="result-row result-indent"><strong>Structure:</strong> ${weight(bumpers.weightKg)} ${wtUnit}</div>`;
  const bumperText = [['1w', '1W'], ['2w', '2W'], ['4w', '4W']].filter(([k]) => bumpers.counts[k] > 0).map(([k, l]) => `${bumpers.counts[k]} × ${l}`).join(', ');
  html += `<div class="result-row"><strong>Bumpers:</strong> ${bumperText || 'none (all stacked)'}</div>`;
  structureWarnings.forEach(w => { html += `<div class="warn">${escapeHtml(w)}</div>`; });
  html += `</div></div><div class="specs-row specs-row-bottom"><div class="spec-group">`;
  html += `<div class="result-section-title">POWER (${powerType.toUpperCase()})</div>`;
  html += `<div class="result-row"><strong>Total watts:</strong> ${totalPowerW.toLocaleString()} W</div>`;
  html += `<div class="result-row"><strong>Total amps:</strong> ${ampsPerPhase.toFixed(2)} A @ ${voltage} V</div>`;
  const svc = serviceNeededLabel(ampsPerPhase, plans.derate);
  if(svc) html += `<div class="result-row"><strong>Service needed:</strong> ${svc}</div>`;
  html += `<div class="result-row"><strong>Circuits:</strong> ${circuits.length}</div>`;
  html += `<div class="result-row"><strong>SOCAs needed:</strong> ${socaCount}</div>`;
  html += `</div><div class="spec-group">`;
  html += `<div class="result-section-title">DATA</div>`;
  html += `<div class="result-row"><strong>Processor:</strong> ${escapeHtml(pr ? pr.name : '')}${cd.processorCount > 1 ? ` (${cd.processorCount})` : ''}</div>`;
  if(cd.distributionBoxCount > 0) html += `<div class="result-row"><strong>Distribution box:</strong> ${escapeHtml(cd.distributionBoxName || '')} (${cd.distributionBoxCount})</div>`;
  html += `<div class="result-row"><strong>Port capacity:</strong> ${capacityPx.toLocaleString()} px</div>`;
  html += `<div class="result-row"><strong>Data lines:</strong> ${dataLines}</div>`;
  html += `<div class="result-row"><strong>Ports needed:</strong> ${cd.portsNeededFinal}${redundancyEnabled ? ' (with backup)' : ''}</div>`;
  html += `</div></div></div>`;
  document.getElementById('results').innerHTML = html;

  const structureEl = document.getElementById('structureContainer');
  if(structureEl) structureEl.style.display = 'none';

  generateLayout('standard');
  generateLayout('power');
  renderPhaseBalanceLegend();
  generateLayout('data');
  showCanvasView();
  generateGearList();
}

// Shared canvas setup for a columns screen's layouts: shows the container, sizes the
// canvas to the wall (same 30–80 px cell range as grid screens, applied per metre) and
// paints the space above the shorter columns with the deleted-panel fill.
function columnsLayoutCanvas(canvasId, containerId, wall) {
  const canvas = document.getElementById(canvasId);
  const container = document.getElementById(containerId);
  const ctx = canvas.getContext('2d');
  const isSimpleMode = typeof currentAppMode !== 'undefined' && currentAppMode === 'simple';
  if(!isSimpleMode) {
    container.style.display = 'block';
  }
  const containerWidth = container.clientWidth - 32; // Account for padding
  const maxCanvasWidth = (typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode)
    ? Math.min(containerWidth, 4000)
    : Math.min(containerWidth, 800);
  const pxPerM = Math.max(30, Math.min(80, Math.floor(maxCanvasWidth / wall.widthM)));
  canvas.width = Math.round(wall.widthM * pxPerM);
  canvas.height = Math.round(wall.heightM * pxPerM);
  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const rect = pp => {
    const x = Math.round(pp.x_m * pxPerM);
    const y = Math.round(pp.y_m * pxPerM);
    return { x, y, w: Math.round((pp.x_m + pp.w_m) * pxPerM) - x, h: Math.round((pp.y_m + pp.h_m) * pxPerM) - y };
  };
  const smallestSide = Math.min(...wall.panels.map(pp => Math.min(pp.w_m, pp.h_m))) * pxPerM;
  return { canvas, ctx, pxPerM, rect, fontSize: Math.max(10, Math.floor(smallestSide * 0.22)) };
}

// Label centred in a panel, shrunk until it fits
function columnsFitText(ctx, text, r, fontSize) {
  let fs = fontSize;
  ctx.font = `${fs}px Arial`;
  while(fs > 6 && ctx.measureText(text).width > r.w - 4) { fs--; ctx.font = `${fs}px Arial`; }
  ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2);
}

// Standard layout for a columns screen: every panel at its true size relative to the
// others, labelled column.panel (panel 1 = top of the column).
function renderColumnsStandardLayout() {
  const data = screens[currentScreenId].data;
  const wall = columnsPlacedPanels(data.columns, getAllPanels());
  const { canvas, ctx, rect, fontSize } = columnsLayoutCanvas('standardCanvas', 'standardContainer', wall);

  // The grid click/drag handlers stay attached to this canvas; a zero-size grid
  // makes their hit-tests find nothing, so a columns screen can't be edited as a grid
  currentCanvas = canvas;
  currentPw = 0;
  currentPh = 0;

  ctx.font = `${fontSize}px Arial`;
  wall.panels.forEach(pp => {
    const r = rect(pp);
    ctx.fillStyle = getStandardColorForPanel(pp.col, pp.fromBottom);
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#000000';
    ctx.fillText(`${pp.col+1}.${pp.idx+1}`, r.x + r.w/2, r.y + r.h/2);
  });
}

// Power layout for a columns screen: each panel in its circuit's colour, shaded per
// SOCA, labelled SOCA.circuit — the grid power layout's colours and labels — plus the
// per-SOCA amps cards below the canvas.
function renderColumnsPowerLayout() {
  const data = screens[currentScreenId].data;
  const plans = columnsScreenPlans(data);
  const { ctx, rect, fontSize } = columnsLayoutCanvas('powerCanvas', 'powerContainer', plans.wall);
  plans.wall.panels.forEach(pp => {
    const n = plans.power.panelCircuit.get(`${pp.col}:${pp.fromBottom}`);
    const soca = Math.floor(n / 6);
    const r = rect(pp);
    ctx.fillStyle = applySocaShade(colorForIndex(n % 6).solid, soca);
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#000000';
    columnsFitText(ctx, `${formatSocaLabel(soca)}.${(n % 6) + 1}`, r, fontSize);
  });
  const cd = screens[currentScreenId].calculatedData;
  renderSocaCircuitTable(cd && cd.socaBreakdown);
}

// Data layout for a columns screen: each panel in its data line's colour with its
// column.panel number, black arrows along each line's path (as on grid screens), and the
// Mains / Backups start-panel lists.
function renderColumnsDataLayout() {
  const screen = screens[currentScreenId];
  const plans = columnsScreenPlans(screen.data);
  const { ctx, rect, fontSize } = columnsLayoutCanvas('dataCanvas', 'dataContainer', plans.wall);
  plans.dataPlan.lines.forEach((line, n) => {
    const colors = colorForIndex(n);
    line.panels.forEach(pp => {
      const r = rect(pp);
      ctx.fillStyle = colors.fill;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      // White only on the black (10th) line colour, black on the rest
      ctx.fillStyle = (n % 10 === 9) ? '#FFFFFF' : '#000000';
      columnsFitText(ctx, `${pp.col + 1}.${pp.idx + 1}`, r, fontSize);
    });
  });
  if(showArrowsEnabled) {
    plans.dataPlan.lines.forEach((line, n) => {
      if(line.panels.length < 2) return;
      const points = line.panels.map(pp => { const r = rect(pp); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; });
      drawArrowPath(ctx, points, '#000000', { lineWidth: 3, headSize: 12, hideArrowhead: false });
    });
  }
  // Start panels, in the same column.panel numbering as the Standard layout
  if(!screen.calculatedData) screen.calculatedData = {};
  screen.calculatedData.dataLineEndpoints = plans.dataPlan.lines.map((line, n) => {
    const first = line.panels[0], last = line.panels[line.panels.length - 1];
    return { line: n + 1, main: { c: first.col, r: first.idx }, backup: { c: last.col, r: last.idx } };
  });
  renderDataLineMap();
}
