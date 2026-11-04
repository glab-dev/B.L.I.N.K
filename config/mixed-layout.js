// ==================== MIXED LAYOUT EDITOR + DRAWING TRACE ====================
// Builds and edits a screen's column-stack layout (see layouts/columns.js). A layout can
// start blank, from the screen's current grid, or be traced from a PNG/JPG stage plot:
// the user boxes the wall and one panel, the columns are guessed from the drawing's
// pixels (all in the browser, so it works offline), then fixed up in the editor.

let mixedLayoutState = null;
let mixedLayoutListenersSetup = false;

// Panels that can share a mixed screen with `panelType`: same brand and pixel pitch,
// so the wall stays one clean pixel map. Largest panel first.
function mixedLayoutFamily(panelType) {
  const all = getAllPanels();
  const base = all[panelType];
  if(!base) return [];
  return Object.keys(all).filter(id => {
    const p = all[id];
    return p && p.brand === base.brand && p.pixel_pitch_mm === base.pixel_pitch_mm &&
      p.width_m > 0 && p.height_m > 0 && p.res_x > 0 && p.res_y > 0;
  }).sort((a, b) => (all[b].width_m * all[b].height_m) - (all[a].width_m * all[a].height_m));
}

// Column widths the family offers, widest first
function mixedLayoutWidths(family) {
  const all = getAllPanels();
  return [...new Set(family.map(t => all[t].width_m))].sort((a, b) => b - a);
}

// Family panels of one width, tallest first
function mixedLayoutTypesForWidth(family, width_m) {
  const all = getAllPanels();
  return family.filter(t => Math.abs(all[t].width_m - width_m) < 0.001)
    .sort((a, b) => all[b].height_m - all[a].height_m);
}

// Stack panels of one width (bottom to top) to fill `height_m` as closely as possible
function mixedLayoutFillColumn(family, width_m, height_m) {
  const all = getAllPanels();
  const types = mixedLayoutTypesForWidth(family, width_m);
  const panels = [];
  let left = height_m;
  types.forEach(t => {
    while(left >= all[t].height_m - 0.001) {
      panels.push(t);
      left -= all[t].height_m;
    }
  });
  return panels;
}

function updateMixedLayoutButton() {
  const btn = document.getElementById('mixedLayoutBtn');
  const note = document.getElementById('mixedLayoutNote');
  if(!btn) return;
  const isColumns = !!(screens[currentScreenId] && isColumnsScreen(screens[currentScreenId].data));
  btn.textContent = isColumns ? 'Edit Mixed Layout' : 'Mixed Layout';
  btn.classList.toggle('active', isColumns);
  if(note) note.style.display = isColumns ? 'block' : 'none';
}

function openMixedLayoutModal() {
  const screen = screens[currentScreenId];
  if(!screen) return;
  const isColumns = isColumnsScreen(screen.data);
  const panelType = isColumns ? screen.data.panelType : document.getElementById('panelType').value;
  const family = mixedLayoutFamily(panelType);
  if(family.length === 0) {
    showAlert('Pick a panel type with confirmed specs first.', 'Mixed Layout');
    return;
  }
  mixedLayoutState = {
    family: family,
    panelType: family.includes(panelType) ? panelType : family[0],
    columns: isColumns ? screen.data.columns.map(c => ({ width_m: c.width_m, rigging: c.rigging, panels: c.panels.slice() })) : [],
    selected: 0,
    legend: {},
    image: null,
    work: null,
    wallBox: null,
    panelBox: null,
    drag: null,
    skipped: 0
  };
  setupMixedLayoutListeners();
  document.getElementById('mixedBackToGridBtn').style.display = isColumns ? '' : 'none';
  showMixedLayoutStep(isColumns ? 'edit' : 'start');
  document.getElementById('mixedLayoutModal').classList.add('active');
}

function closeMixedLayoutModal() {
  document.getElementById('mixedLayoutModal').classList.remove('active');
  if(mixedLayoutState && mixedLayoutState.image) URL.revokeObjectURL(mixedLayoutState.image.src);
  mixedLayoutState = null;
}

function showMixedLayoutStep(step) {
  document.getElementById('mixedStartStep').style.display = step === 'start' ? '' : 'none';
  document.getElementById('mixedTraceStep').style.display = step === 'trace' ? '' : 'none';
  document.getElementById('mixedEditStep').style.display = step === 'edit' ? '' : 'none';
  document.getElementById('mixedApplyBtn').style.display = step === 'edit' ? '' : 'none';
  if(step === 'edit') renderMixedLayoutEditor();
}

function setupMixedLayoutListeners() {
  if(mixedLayoutListenersSetup) return;
  mixedLayoutListenersSetup = true;

  document.getElementById('mixedImageInput').addEventListener('change', function(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if(!file || !mixedLayoutState) return;
    if(!/^image\/(png|jpeg)$/.test(file.type)) {
      showAlert('Choose a PNG or JPG image.', 'Mixed Layout');
      return;
    }
    const img = new Image();
    img.onload = () => {
      if(!mixedLayoutState) return;
      mixedLayoutState.image = img;
      mixedLayoutState.work = mixedLayoutWorkImage(img);
      mixedLayoutState.wallBox = null;
      mixedLayoutState.panelBox = null;
      showMixedLayoutStep('trace');
      renderMixedLayoutTrace();
    };
    img.onerror = () => showAlert('That image could not be opened.', 'Mixed Layout');
    img.src = URL.createObjectURL(file);
  });

  const trace = document.getElementById('mixedTraceCanvas');
  const toWork = (e) => {
    const rect = trace.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(trace.width, (e.clientX - rect.left) * trace.width / rect.width)),
      y: Math.max(0, Math.min(trace.height, (e.clientY - rect.top) * trace.height / rect.height))
    };
  };
  trace.addEventListener('pointerdown', function(e) {
    if(!mixedLayoutState || !mixedLayoutState.work) return;
    trace.setPointerCapture(e.pointerId);
    const p = toWork(e);
    mixedLayoutState.drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    renderMixedLayoutTrace();
  });
  trace.addEventListener('pointermove', function(e) {
    if(!mixedLayoutState || !mixedLayoutState.drag) return;
    const p = toWork(e);
    mixedLayoutState.drag.x1 = p.x;
    mixedLayoutState.drag.y1 = p.y;
    renderMixedLayoutTrace();
  });
  trace.addEventListener('pointerup', function() {
    if(!mixedLayoutState || !mixedLayoutState.drag) return;
    const d = mixedLayoutState.drag;
    mixedLayoutState.drag = null;
    const box = { x0: Math.min(d.x0, d.x1), y0: Math.min(d.y0, d.y1), x1: Math.max(d.x0, d.x1), y1: Math.max(d.y0, d.y1) };
    if(box.x1 - box.x0 < 6 || box.y1 - box.y0 < 6) { renderMixedLayoutTrace(); return; }
    if(!mixedLayoutState.wallBox) {
      mixedLayoutState.wallBox = box;
      renderMixedLayoutTrace();
      return;
    }
    mixedLayoutState.panelBox = box;
    mixedLayoutState.columns = mixedLayoutGuessColumns();
    mixedLayoutState.selected = 0;
    if(mixedLayoutState.columns.length === 0) {
      mixedLayoutState.wallBox = null;
      mixedLayoutState.panelBox = null;
      renderMixedLayoutTrace();
      showAlert('No panels were found inside that box. Try drawing the boxes again.', 'Mixed Layout');
      return;
    }
    showMixedLayoutStep('edit');
  });

  document.getElementById('mixedEditCanvas').addEventListener('click', function(e) {
    if(!mixedLayoutState || !mixedLayoutState.editView) return;
    const canvas = this;
    const rect = canvas.getBoundingClientRect();
    const xM = (e.clientX - rect.left) * canvas.width / rect.width / mixedLayoutState.editView.pxPerM;
    let edge = 0;
    for(let c = 0; c < mixedLayoutState.columns.length; c++) {
      edge += mixedLayoutState.columns[c].width_m;
      if(xM < edge) { mixedLayoutState.selected = c; break; }
    }
    renderMixedLayoutEditor();
  });
}

// ---------- Start ----------

function mixedLayoutPickImage() {
  document.getElementById('mixedImageInput').click();
}

// Blank start: the screen's current grid as columns (pw columns of ph panels), or 4 × 3
function mixedLayoutStartBlank() {
  const st = mixedLayoutState;
  const all = getAllPanels();
  const p = all[st.panelType];
  const pw = parseInt(document.getElementById('panelsWide').value) || 4;
  const ph = parseInt(document.getElementById('panelsHigh').value) || 3;
  st.columns = Array.from({ length: pw }, () => ({ width_m: p.width_m, rigging: 'hung', panels: Array(ph).fill(st.panelType) }));
  st.selected = 0;
  showMixedLayoutStep('edit');
}

// ---------- Trace ----------

// The drawing at a working size (longest side at most 2400 px) with its pixels
function mixedLayoutWorkImage(img) {
  const scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { canvas: canvas, pixels: ctx.getImageData(0, 0, canvas.width, canvas.height) };
}

function renderMixedLayoutTrace() {
  const st = mixedLayoutState;
  const canvas = document.getElementById('mixedTraceCanvas');
  const hint = document.getElementById('mixedTraceHint');
  const all = getAllPanels();
  const main = all[st.family[0]];
  canvas.width = st.work.canvas.width;
  canvas.height = st.work.canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(st.work.canvas, 0, 0);
  const lw = Math.max(2, Math.round(canvas.width / 500));
  const drawBox = (b, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.setLineDash([lw * 4, lw * 2]);
    ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    ctx.setLineDash([]);
  };
  if(st.wallBox) drawBox(st.wallBox, '#10b981');
  if(st.drag) drawBox({ x0: Math.min(st.drag.x0, st.drag.x1), y0: Math.min(st.drag.y0, st.drag.y1), x1: Math.max(st.drag.x0, st.drag.x1), y1: Math.max(st.drag.y0, st.drag.y1) }, '#f59e0b');
  hint.textContent = !st.wallBox
    ? 'Step 1 of 2: drag a box around the LED wall. Start at the bottom-left corner of the bottom-left panel and go to the right edge of the wall and the top of the tallest column. Leave out the legend.'
    : `Step 2 of 2: drag a box around one ${main.brand} ${main.name} panel (${main.width_m} × ${main.height_m} m) so the app knows the drawing's scale.`;
}

function mixedLayoutRedoBoxes() {
  mixedLayoutState.wallBox = null;
  mixedLayoutState.panelBox = null;
  renderMixedLayoutTrace();
}

// Guess the columns inside the wall box. The box is cut into slots of the narrowest
// panel width and each slot is read in 10 cm bands from the bottom up. Panel drawings
// are dense with lines, while background and fascia fills are nearly empty, so the
// column runs up while the bands stay dense (one thin seam band is allowed). Its top is
// the highest very dark band in that run — the panel's top edge, under the lighter
// bumper drawing. A legend or title block overlapping the box is never reached, because
// blank space separates it from the wall. The slot's tint (green / magenta / none) tells
// colour-coded drawings' panel types apart; neighbouring slots with the same height and
// tint merge into the family's wider columns.
function mixedLayoutGuessColumns() {
  const st = mixedLayoutState;
  const all = getAllPanels();
  const main = all[st.family[0]];
  const widths = mixedLayoutWidths(st.family);
  const unit = widths[widths.length - 1];
  const minH = Math.min(...st.family.map(t => all[t].height_m));
  const { data, width } = st.work.pixels;
  const wb = st.wallBox, pb = st.panelBox;
  const pxPerMX = (pb.x1 - pb.x0) / main.width_m;
  const pxPerMY = (pb.y1 - pb.y0) / main.height_m;
  const slots = Math.max(1, Math.round((wb.x1 - wb.x0) / (unit * pxPerMX)));
  const slotPx = (wb.x1 - wb.x0) / slots;
  const x0 = Math.round(wb.x0), y0 = Math.round(wb.y0), y1 = Math.round(wb.y1);
  const bandPx = Math.max(1, 0.1 * pxPerMY);
  const bands = Math.floor((y1 - y0) / bandPx);

  // Dark line pixel; the red of dimension lines doesn't count
  const isInk = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return 0.3 * r + 0.59 * g + 0.11 * b < 150 && !(r > g + 80 && r > b + 80);
  };

  const slotInfo = [];
  for(let s = 0; s < slots; s++) {
    const sx0 = Math.round(x0 + (s + 0.2) * slotPx);
    const sx1 = Math.max(sx0 + 1, Math.round(x0 + (s + 0.8) * slotPx));
    const density = (b) => {
      let ink = 0, n = 0;
      for(let y = Math.round(y1 - (b + 1) * bandPx); y < Math.round(y1 - b * bandPx); y++) {
        for(let x = sx0; x < sx1; x++) { n++; if(isInk((y * width + x) * 4)) ink++; }
      }
      return n ? ink / n : 0;
    };
    const dens = [];
    for(let b = 0; b < bands; b++) {
      dens.push(density(b));
      if(dens[b] < 0.1 && b > 0 && dens[b - 1] < 0.1) break;
    }
    let topBand = -1;
    for(let b = 0; b < dens.length; b++) {
      if(dens[b] < 0.1 && (b === 0 || dens[b - 1] < 0.1)) break;
      if(dens[b] >= 0.4) topBand = b;
    }
    const height_m = topBand < 0 ? 0 : Math.round(((topBand + 1) * bandPx / pxPerMY) / minH) * minH;
    let green = 0, magenta = 0, total = 0;
    for(let y = Math.round(y1 - (topBand + 1) * bandPx); y < y1; y += 2) {
      for(let x = sx0; x < sx1; x += 2) {
        const i = (y * width + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        total++;
        if(g > r + 25 && g > b + 25) green++;
        else if(r > g + 25 && b > g + 25) magenta++;
      }
    }
    const tint = total && green / total > 0.15 ? 'green' : (total && magenta / total > 0.15 ? 'magenta' : 'none');
    slotInfo.push({ height_m, tint });
  }

  const columns = [];
  let skipped = 0;
  for(let s = 0; s < slots;) {
    let used = 1;
    let colWidth = unit;
    for(const w of widths) {
      const k = Math.round(w / unit);
      if(s + k > slots) continue;
      const run = slotInfo.slice(s, s + k);
      if(run.every(r => Math.abs(r.height_m - run[0].height_m) < 0.001 && r.tint === run[0].tint)) {
        used = k;
        colWidth = w;
        break;
      }
    }
    const panels = mixedLayoutFillColumn(st.family, colWidth, slotInfo[s].height_m);
    if(panels.length > 0) columns.push({ width_m: colWidth, rigging: 'hung', panels: panels });
    else skipped++;
    s += used;
  }
  st.skipped = skipped;
  return columns;
}

// ---------- Editor ----------

function renderMixedLayoutEditor() {
  const st = mixedLayoutState;
  const all = getAllPanels();
  const canvas = document.getElementById('mixedEditCanvas');
  const ctx = canvas.getContext('2d');
  if(st.selected >= st.columns.length) st.selected = st.columns.length - 1;

  const wall = columnsPlacedPanels(st.columns, all);
  // The traced drawing sits behind the columns at the same scale, bottom-left aligned
  let imgW = 0, imgH = 0;
  if(st.wallBox && st.panelBox) {
    const main = all[st.family[0]];
    imgW = (st.wallBox.x1 - st.wallBox.x0) / ((st.panelBox.x1 - st.panelBox.x0) / main.width_m);
    imgH = (st.wallBox.y1 - st.wallBox.y0) / ((st.panelBox.y1 - st.panelBox.y0) / main.height_m);
  }
  const viewW = Math.max(wall.widthM, imgW);
  const viewH = Math.max(wall.heightM, imgH, 1);
  const pxPerM = Math.max(20, Math.min(120, Math.floor(1100 / viewW)));
  st.editView = { pxPerM };
  canvas.width = Math.round(viewW * pxPerM);
  canvas.height = Math.round(viewH * pxPerM);
  const bottom = canvas.height;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if(imgW > 0) {
    const wb = st.wallBox;
    ctx.drawImage(st.work.canvas, wb.x0, wb.y0, wb.x1 - wb.x0, wb.y1 - wb.y0,
      0, bottom - imgH * pxPerM, imgW * pxPerM, imgH * pxPerM);
  }

  const screen = screens[currentScreenId];
  const primary = screen ? screen.color : '#808080';
  const secondary = screen ? (screen.color2 || darkenColor(primary, 30)) : '#606060';
  const top = bottom - wall.heightM * pxPerM;
  const fontSize = Math.max(10, Math.floor(Math.min(1, ...wall.panels.map(pp => Math.min(pp.w_m, pp.h_m))) * pxPerM * 0.22));
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = imgW > 0 ? 0.55 : 1;
  wall.panels.forEach(pp => {
    const x = Math.round(pp.x_m * pxPerM);
    const y = Math.round(top + pp.y_m * pxPerM);
    const w = Math.round((pp.x_m + pp.w_m) * pxPerM) - x;
    const h = Math.round(top + (pp.y_m + pp.h_m) * pxPerM) - y;
    ctx.fillStyle = (pp.col + pp.fromBottom) % 2 === 0 ? primary : secondary;
    ctx.fillRect(x, y, w, h);
  });
  ctx.globalAlpha = 1;
  wall.panels.forEach(pp => {
    const x = Math.round(pp.x_m * pxPerM);
    const y = Math.round(top + pp.y_m * pxPerM);
    const w = Math.round((pp.x_m + pp.w_m) * pxPerM) - x;
    const h = Math.round(top + (pp.y_m + pp.h_m) * pxPerM) - y;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    const name = all[pp.type].name;
    if(ctx.measureText(name).width < w - 4) {
      ctx.fillStyle = '#000000';
      ctx.fillText(name, x + w / 2, y + h / 2);
    }
  });

  // Selected column outline, and a mark under stacked (no bumper) columns
  let colX = 0;
  st.columns.forEach((col, c) => {
    const x = Math.round(colX * pxPerM);
    const w = Math.round((colX + col.width_m) * pxPerM) - x;
    const colTop = bottom - col.panels.reduce((hh, t) => hh + all[t].height_m, 0) * pxPerM;
    if(col.rigging === 'stacked') {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x + 2, bottom - 6, w - 4, 4);
    }
    if(c === st.selected) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 4;
      if(col.panels.length === 0) ctx.setLineDash([8, 6]);
      const selTop = col.panels.length ? colTop : 0;
      ctx.strokeRect(x + 2, selTop + 2, w - 4, bottom - selTop - 4);
      ctx.setLineDash([]);
    }
    colX += col.width_m;
  });

  renderMixedLayoutControls();
  renderMixedLayoutLegend();
}

function mixedLayoutButton(label, onClick, active) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-secondary' + (active ? ' active' : '');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function mixedLayoutRow(label, buttons) {
  const row = document.createElement('div');
  row.className = 'mixed-layout-row';
  const span = document.createElement('span');
  span.className = 'mixed-layout-label';
  span.textContent = label;
  row.appendChild(span);
  buttons.forEach(b => row.appendChild(b));
  return row;
}

function renderMixedLayoutControls() {
  const st = mixedLayoutState;
  const all = getAllPanels();
  const box = document.getElementById('mixedColumnControls');
  box.innerHTML = '';
  const col = st.columns[st.selected];
  if(!col) return;
  const changed = () => renderMixedLayoutEditor();

  const widthBtns = mixedLayoutWidths(st.family).map(w => mixedLayoutButton(`${w} m`, () => {
    if(Math.abs(w - col.width_m) < 0.001) return;
    const height = col.panels.reduce((hh, t) => hh + all[t].height_m, 0);
    col.width_m = w;
    col.panels = mixedLayoutFillColumn(st.family, w, height);
    if(col.panels.length === 0) col.panels = [mixedLayoutTypesForWidth(st.family, w)[0]];
    changed();
  }, Math.abs(w - col.width_m) < 0.001));
  // Step buttons: narrow columns are hard to tap on a phone-sized preview
  widthBtns.unshift(
    mixedLayoutButton('◀', () => { st.selected = Math.max(0, st.selected - 1); changed(); }),
    mixedLayoutButton('▶', () => { st.selected = Math.min(st.columns.length - 1, st.selected + 1); changed(); })
  );
  box.appendChild(mixedLayoutRow(`Column ${st.selected + 1}`, widthBtns));

  const addBtns = mixedLayoutTypesForWidth(st.family, col.width_m).map(t => mixedLayoutButton(`+ ${all[t].name}`, () => {
    col.panels.push(t);
    changed();
  }));
  addBtns.push(mixedLayoutButton('Remove Top', () => {
    col.panels.pop();
    changed();
  }));
  box.appendChild(mixedLayoutRow('Panels', addBtns));
  const stack = document.createElement('div');
  stack.className = 'mixed-layout-summary';
  const runs = [];
  col.panels.forEach(t => {
    if(runs.length && runs[runs.length - 1].t === t) runs[runs.length - 1].n++;
    else runs.push({ t, n: 1 });
  });
  stack.textContent = runs.length ? 'Bottom to top: ' + runs.map(r => `${r.n} × ${all[r.t].name}`).join(', ') : 'Empty: add panels, or Delete the column. Empty columns are left out on Apply.';
  box.appendChild(stack);

  box.appendChild(mixedLayoutRow('Rigging', [
    mixedLayoutButton('Hung', () => { col.rigging = 'hung'; changed(); }, col.rigging === 'hung'),
    mixedLayoutButton('Stacked', () => { col.rigging = 'stacked'; changed(); }, col.rigging === 'stacked')
  ]));

  const copy = () => ({ width_m: col.width_m, rigging: col.rigging, panels: col.panels.slice() });
  box.appendChild(mixedLayoutRow('Column', [
    mixedLayoutButton('Insert Left', () => { st.columns.splice(st.selected, 0, copy()); changed(); }),
    mixedLayoutButton('Insert Right', () => { st.columns.splice(st.selected + 1, 0, copy()); st.selected++; changed(); }),
    mixedLayoutButton('Delete', () => {
      if(st.columns.length > 1) st.columns.splice(st.selected, 1);
      changed();
    })
  ]));
}

function renderMixedLayoutLegend() {
  const st = mixedLayoutState;
  const all = getAllPanels();
  const counts = columnsPanelCounts(st.columns);
  const legend = document.getElementById('mixedLegend');
  legend.innerHTML = '';
  ['Panel', 'Found', 'Legend', ''].forEach(h => {
    const d = document.createElement('div');
    d.className = 'mixed-layout-label';
    d.textContent = h;
    legend.appendChild(d);
  });
  let mismatch = false;
  st.family.forEach(t => {
    const found = counts[t] || 0;
    const want = st.legend[t];
    const ok = want === undefined || want === found;
    if(!ok) mismatch = true;
    const name = document.createElement('div');
    name.textContent = `${all[t].brand} ${all[t].name}`;
    const f = document.createElement('div');
    f.textContent = found;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.className = 'mixed-layout-qty';
    input.setAttribute('aria-label', `Legend quantity for ${all[t].name}`);
    input.value = want === undefined ? '' : want;
    input.addEventListener('change', function() {
      const v = parseInt(this.value);
      if(Number.isInteger(v) && v >= 0) st.legend[t] = v; else delete st.legend[t];
      renderMixedLayoutLegend();
    });
    const status = document.createElement('div');
    status.className = ok ? 'mixed-layout-ok' : 'mixed-layout-bad';
    status.textContent = want === undefined ? '' : (ok ? '✓' : '✗');
    [name, f, input, status].forEach(el => legend.appendChild(el));
  });

  const wall = columnsPlacedPanels(st.columns, all);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  let summary = `${st.columns.length} columns · ${total} panels · ${wall.widthM.toFixed(2)} × ${wall.heightM.toFixed(2)} m. Tap a column to change it. Orange bar = stacked (no bumper).`;
  if(st.skipped) summary += ` ${st.skipped} empty slot${st.skipped > 1 ? 's were' : ' was'} left out.`;
  if(mismatch) summary += ' Counts don\'t match the legend yet.';
  document.getElementById('mixedSummary').textContent = summary;
  document.getElementById('mixedApplyBtn').disabled = mismatch;
}

// ---------- Apply ----------

function applyMixedLayout() {
  const st = mixedLayoutState;
  const screen = screens[currentScreenId];
  if(!st || !screen) return;
  const columns = st.columns.filter(c => c.panels.length > 0);
  if(columns.length === 0) {
    showAlert('Add at least one panel first.', 'Mixed Layout');
    return;
  }
  const data = screen.data;
  data.layoutMode = 'columns';
  data.columns = columns.map(c => ({ width_m: c.width_m, rigging: c.rigging, panels: c.panels.slice() }));
  data.panelType = st.panelType;
  data.panelsWide = 0;
  data.panelsHigh = 0;
  data.wallWidth = '';
  data.wallHeight = '';
  ['panelsWide', 'panelsHigh', 'wallWidth', 'wallHeight'].forEach(id => { document.getElementById(id).value = ''; });
  closeMixedLayoutModal();
  calculate();
}

async function mixedLayoutBackToGrid() {
  const ok = await showConfirm('Turn this screen back into a normal grid? Its mixed layout will be removed.', 'Back to Grid');
  if(!ok) return;
  const data = screens[currentScreenId].data;
  delete data.layoutMode;
  delete data.columns;
  closeMixedLayoutModal();
  calculate();
}
