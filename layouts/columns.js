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

// Specs, stored totals and the Standard layout for the current screen when it is a
// columns screen. Power, data and structure routing for mixed screens come later, so
// those layouts stay hidden.
function calculateColumnsScreen() {
  const screen = screens[currentScreenId];
  const data = screen.data;
  const allPanels = getAllPanels();
  const pr = getAllProcessors()[document.getElementById('processor').value];
  const wall = columnsPlacedPanels(data.columns, allPanels);
  const counts = columnsPanelCounts(data.columns);
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
  html += `<div class="result-row"><strong>Dimensions:</strong> ${len(wall.widthM)} ${lenUnit} × ${len(wall.heightM)} ${lenUnit} (${data.columns.length} columns)</div>`;
  html += `<div class="result-row"><strong>Total panel count:</strong> ${totalPanels}</div>`;
  html += `<div class="result-row"><strong>Resolution:</strong> ${wall.resX} × ${wall.resY}</div>`;
  html += `<div class="result-row"><strong>Total pixel count:</strong> (${totalPixels.toLocaleString()} px)</div>`;
  html += `<div class="result-row"><strong>Wall weight:</strong> ${weightDisplay} ${wtUnit}</div>`;
  html += `</div></div><div class="specs-row specs-row-bottom"><div class="spec-group">`;
  html += `<div class="result-section-title">POWER (${powerType.toUpperCase()})</div>`;
  html += `<div class="result-row"><strong>Total watts:</strong> ${totalPowerW.toLocaleString()} W</div>`;
  html += `<div class="result-row"><strong>Total amps:</strong> ${ampsPerPhase.toFixed(2)} A @ ${voltage} V</div>`;
  html += `</div></div></div>`;
  document.getElementById('results').innerHTML = html;

  screen.calculatedData = {
    processorName: pr ? pr.name : '',
    panelCount: totalPanels,
    activePanels: totalPanels,
    panelWeightOnlyKg: panelWeightKg,
    bumperWeightKg: 0,
    totalPixels: totalPixels
  };

  ['powerContainer', 'dataContainer', 'structureContainer'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = 'none';
  });

  generateLayout('standard');
  showCanvasView();
  generateGearList();
}

// Standard layout for a columns screen: every panel at its true size relative to the
// others, labelled column.panel (panel 1 = top of the column).
function renderColumnsStandardLayout() {
  const data = screens[currentScreenId].data;
  const wall = columnsPlacedPanels(data.columns, getAllPanels());
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
  // Same 30–80 px cell range as grid screens, applied per metre
  const pxPerM = Math.max(30, Math.min(80, Math.floor(maxCanvasWidth / wall.widthM)));

  canvas.width = Math.round(wall.widthM * pxPerM);
  canvas.height = Math.round(wall.heightM * pxPerM);

  // The grid click/drag handlers stay attached to this canvas; a zero-size grid
  // makes their hit-tests find nothing, so a columns screen can't be edited as a grid
  currentCanvas = canvas;
  currentPw = 0;
  currentPh = 0;

  const smallestSide = Math.min(...wall.panels.map(pp => Math.min(pp.w_m, pp.h_m))) * pxPerM;
  const fontSize = Math.max(10, Math.floor(smallestSide * 0.22));
  // Space above the shorter columns: the deleted-panel fill, without its dashed outline
  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  wall.panels.forEach(pp => {
    const x = Math.round(pp.x_m * pxPerM);
    const y = Math.round(pp.y_m * pxPerM);
    const w = Math.round((pp.x_m + pp.w_m) * pxPerM) - x;
    const h = Math.round((pp.y_m + pp.h_m) * pxPerM) - y;
    ctx.fillStyle = getStandardColorForPanel(pp.col, pp.fromBottom);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#000000';
    ctx.fillText(`${pp.col+1}.${pp.idx+1}`, x+w/2, y+h/2);
  });
}
