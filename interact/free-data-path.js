// ==================== FREE-DRAW DATA PATHS ====================
// How a drawn screen's data is distributed, picked on its Data layout: Automatic (the
// grid's automatic lines) or Manual (lines drawn by hand, Tessera-style). Until one is
// picked the layout shows just the wall's outline. In Manual, pick a line (or New, which
// asks for its number), then click panels in cable order or drag across them: each joins
// the line in the order it is reached, leaving any other line it was on; clicking the
// line's last panel takes it off again. The panel under the pointer is outlined. Select
// Mode pauses drawing. The lines live on the screen (data.freeDataPaths, layouts/free-data.js).
// A grid built in Draw draws its lines the same way on its own Data layout, where they run
// through Complex's data walk (gridDrawnDataPaths, layouts/data.js); it starts on Automatic.

let freeDataPathLine = null;       // the line being drawn, 1-based like Assign Data Line
let freeDataPathStroke = null;     // {saved, last} while a click or drag is drawing
let freeDataPathHover = null;      // the panel under the pointer while drawing
let freeDataPathListenersSetup = false;
let gridDataLayoutView = null;     // a grid's Data canvas as last drawn: {pw, ph, rowGeo, colGeo, rearView}

// The screen whose lines can be drawn: the current one when it is drawn (free or a drawn grid)
function freeDataPathScreenData() {
  const data = screens[currentScreenId] ? screens[currentScreenId].data : null;
  return (isFreeScreen(data) || isDrawnGridScreen(data)) ? data : null;
}

// The panel key under a point on the Data canvas, or null
function freeDataPathPanelAt(clientX, clientY) {
  if(isFreeCurrentScreen()) return freeLayerPanelAt('dataCanvas', clientX, clientY);
  const v = gridDataLayoutView;
  if(!v) return null;
  const p = freeLayerCanvasPoint(document.getElementById('dataCanvas'), clientX, clientY);
  const c = v.colGeo.colAt(v.rearView ? v.colGeo.width - p.x : p.x);
  const r = v.rowGeo.rowAt(p.y);
  if(c < 0 || c >= v.pw || r < 0 || r >= v.ph || deletedPanels.has(`${c},${r}`)) return null;
  return `${c},${r}`;
}

// Draws the Data layout again, for the hover outline or a line that just grew
function freeDataPathRedraw() {
  if(isFreeCurrentScreen()) freeLayerRedraw('dataCanvas');
  else generateLayout('data');
}

// The outline on the grid panel under the pointer while drawing (layouts/data.js draws it)
function drawGridDataPathHover(ctx) {
  const v = gridDataLayoutView;
  if(!v || !freeDataPathHover || !freeDataPathDrawing()) return;
  const [c, r] = freeDataPathHover.split(',').map(Number);
  const w = v.colGeo.w(c), h = v.rowGeo.h(r);
  const x = v.rearView ? v.colGeo.width - v.colGeo.x(c + 1) : v.colGeo.x(c);
  const y = v.rowGeo.y(r);
  ctx.save();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.restore();
}

// Clicks and drags on the Data canvas draw lines: Manual data on a drawn screen or grid in
// Draw mode, with Select Mode off
function freeDataPathDrawing() {
  const data = freeDataPathScreenData();
  return !!data && data.freeDataMode === 'manual' && freeDrawMode && !freeLayerSelectMode.dataCanvas;
}

// Drawing blocks native touch scroll on the Data canvas, as Select Mode does
function syncFreeDataPathCanvas() {
  const canvas = document.getElementById('dataCanvas');
  if(canvas) canvas.classList.toggle('select-mode-active', freeDataPathDrawing() || freeLayerSelectMode.dataCanvas);
}

function setFreeDataMode(mode) {
  const data = screens[currentScreenId].data;
  if(data.freeDataMode === mode) return;
  saveState();
  data.freeDataMode = mode;
  calculate();
  vibrate(10);
}

// The Data row: Automatic | Manual, and in Manual the line chips (each drawn line, then
// New), Clear Line / Clear All and the warning for a drawn line over a port's capacity.
// Shown with the Select Mode toggles: a drawn screen in Draw mode.
function updateFreeDataPathRow(on) {
  const row = document.getElementById('freeDataPathRow');
  const warn = document.getElementById('freeDataPathWarning');
  if(row) row.style.display = on ? '' : 'none';
  if(!on) {
    freeDataPathHover = null;
    if(warn) warn.style.display = 'none';
    syncFreeDataPathCanvas();
    return;
  }
  const data = screens[currentScreenId].data;
  // A drawn grid runs Complex's automatic lines until Manual is picked
  const mode = data.freeDataMode || (isFreeScreen(data) ? undefined : 'auto');
  [['auto', 'freeDataAutoBtn'], ['manual', 'freeDataManualBtn']].forEach(([m, id]) => {
    const btn = document.getElementById(id);
    if(!btn) return;
    btn.classList.toggle('active', mode === m);
    btn.setAttribute('aria-checked', mode === m ? 'true' : 'false');
  });
  const manual = mode === 'manual';
  const picker = document.getElementById('freeDataLinePicker');
  if(picker) picker.style.display = manual ? '' : 'none';
  const clearGroup = document.getElementById('freeDataPathClearGroup');
  if(clearGroup) clearGroup.style.display = manual ? '' : 'none';
  setupFreeDataPathInteractivity();
  syncFreeDataPathCanvas();
  if(!manual) {
    if(warn) warn.style.display = 'none';
    return;
  }

  const paths = data.freeDataPaths || [];
  const lines = [...new Set(paths.map(p => p.line))].sort((a, b) => a - b);
  if(freeDataPathLine === null && lines.length) freeDataPathLine = lines[0];
  // A line picked with New shows before it has any panels
  if(freeDataPathLine !== null && !lines.includes(freeDataPathLine)) lines.push(freeDataPathLine);
  lines.sort((a, b) => a - b);

  const chips = document.getElementById('freeDataLineChips');
  if(chips) {
    chips.textContent = '';
    const chip = (text, title, picked, onClick) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toggle-btn';
      b.textContent = text;
      b.title = title;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', picked ? 'true' : 'false');
      b.classList.toggle('active', picked);
      b.addEventListener('click', onClick);
      chips.appendChild(b);
    };
    lines.forEach(ln => chip(`${ln}`, `Line ${ln}`, ln === freeDataPathLine, () => {
      freeDataPathLine = ln;
      updateFreeDataPathRow(true);
    }));
    chip('New', 'Start a new data line', false, newFreeDataPathLine);
  }
  const clearBtn = document.getElementById('freeDataPathClearBtn');
  if(clearBtn) clearBtn.disabled = !paths.some(p => p.line === freeDataPathLine);
  const clearAllBtn = document.getElementById('freeDataPathClearAllBtn');
  if(clearAllBtn) clearAllBtn.disabled = paths.length === 0;

  // A drawn line can take more than a port carries; say so, as the grid's limits would
  if(warn) {
    const st = isFreeScreen(data) ? freeDataState : gridDataPathState();
    const msgs = [];
    if(st && paths.length) {
      const allPanels = getAllPanels();
      const typeOf = isFreeScreen(data) ? new Map(data.freePanels.map(fp => [`${fp.gx},${fp.gy}`, fp.type])) : st.typeOf;
      paths.forEach(path => {
        const g = st.groups.find(gr => gr.some(pt => pt.c + ',' + pt.r === path.panels[0]));
        if(!g) return;
        const px = g.reduce((sum, pt) => {
          const p = allPanels[typeOf.get(`${pt.c},${pt.r}`)];
          return sum + (p ? p.res_x * p.res_y : 0);
        }, 0);
        if(st.capacity > 0 && px > st.capacity) {
          msgs.push(`Line ${path.line} is ${px.toLocaleString()} px — over the ${st.capacity.toLocaleString()} px one port carries.`);
        } else if(g.length > st.panelsPerDataLine) {
          msgs.push(`Line ${path.line} has ${g.length} panels — over the ${st.panelsPerDataLine} per data line.`);
        }
      });
    }
    warn.textContent = msgs.length ? '⚠️ ' + msgs.join(' ') : '';
    warn.style.display = msgs.length ? 'block' : 'none';
  }
}

// A drawn grid's lines as they run now, with what a port carries and each panel's type,
// for the warning above
function gridDataPathState() {
  const live = liveScreenData(currentScreenId);
  const inp = resolveScreenDataInputs(live);
  if(!inp) return null;
  const built = buildDataLineGroups({
    pw: inp.pw, ph: inp.ph, panelsPerDataLine: inp.panelsPerDataLine, startDir: inp.startDir,
    deletedPanels: inp.deletedPanels, customDataLineAssignments: inp.customDataLines,
    split: live.split, dataPaths: inp.dataPaths
  });
  const proc = getAllProcessors()[inp.processorId];
  const halfRows = getCB5HalfRows(live, live.panelType), halfCols = getHalfCols(live, live.panelType);
  const fullRows = inp.ph - halfRows.top - halfRows.bottom, fullCols = inp.pw - halfCols.left - halfCols.right;
  return {
    groups: built.groups,
    capacity: proc ? calculateAdjustedPixelCapacity(proc, live.frameRate || 60, live.bitDepth || 8) : 0,
    panelsPerDataLine: inp.panelsPerDataLine,
    typeOf: {get: key => {
      const [c, r] = key.split(',').map(Number);
      return gridPanelTypeAt(live.panelType, c, r, halfRows, fullRows, halfCols, fullCols);
    }}
  };
}

// New asks which line to draw, offering the lowest number not drawn yet
async function newFreeDataPathLine() {
  const data = screens[currentScreenId].data;
  const used = new Set((data.freeDataPaths || []).map(p => p.line));
  let next = 1;
  while(used.has(next)) next++;
  const value = await showPrompt('Which data line is this?', String(next), 'New Data Line');
  if(value === null) return;
  const line = parseInt(value, 10);
  if(!(line >= 1)) {
    await showAlert('Enter a data line number of 1 or more.', 'New Data Line');
    return;
  }
  freeDataPathLine = line;
  updateFreeDataPathRow(true);
}

// On the Data layout: "Pick Automatic or Manual" until a distribution is picked, then in
// Manual an outline on the panel under the pointer. Not drawn into PDFs.
function drawFreeDataPathCues(ctx, data, allPanels) {
  if(!data.freeDataMode) {
    // One line when it fits the wall, else two, shrunk until each fits
    const W = ctx.canvas.width - 12;
    const one = ['Pick Automatic or Manual data above'], two = ['Pick Automatic', 'or Manual data above'];
    ctx.save();
    let fs = 16;
    ctx.font = `bold ${fs}px Arial`;
    const lines = ctx.measureText(one[0]).width <= W ? one : two;
    while(fs > 8 && Math.max(...lines.map(l => ctx.measureText(l).width)) > W) { fs--; ctx.font = `bold ${fs}px Arial`; }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    lines.forEach((text, i) => {
      const y = ctx.canvas.height / 2 + (i - (lines.length - 1) / 2) * fs * 1.3;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(text, ctx.canvas.width / 2, y);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(text, ctx.canvas.width / 2, y);
    });
    ctx.restore();
    return;
  }
  if(!freeDataPathHover || !freeDataPathDrawing()) return;
  const fp = data.freePanels.find(p => `${p.gx},${p.gy}` === freeDataPathHover);
  if(!fp) return;
  const r = freeLayerRect('dataCanvas', fp.gx, fp.gy, freeCells(allPanels[fp.type], data.freeCell_mm));
  ctx.save();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  ctx.restore();
}

function setFreeDataPathHover(key) {
  if(key === freeDataPathHover) return;
  freeDataPathHover = key;
  freeDataPathRedraw();
}

// A panel reached while drawing: it joins the picked line at the end, leaving any other
// line it was on. A click on the line's last panel takes it off instead.
function freeDataPathReach(key, isClick) {
  const data = screens[currentScreenId].data;
  const stroke = freeDataPathStroke;
  const paths = (data.freeDataPaths || []).map(p => ({line: p.line, panels: p.panels.slice()}));
  let path = paths.find(p => p.line === freeDataPathLine);
  if(isClick && path && path.panels[path.panels.length - 1] === key) {
    path.panels.pop();
  } else if(path && path.panels.includes(key)) {
    return;
  } else {
    paths.forEach(p => { p.panels = p.panels.filter(k => k !== key); });
    if(!path) {
      path = {line: freeDataPathLine, panels: []};
      paths.push(path);
    }
    path.panels.push(key);
  }
  if(!stroke.saved) {
    saveState();
    stroke.saved = true;
  }
  stroke.last = key;
  data.freeDataPaths = paths.filter(p => p.panels.length);
  if(isFreeScreen(data)) calculateFreeData(data, getAllPanels());
  generateLayout('data');
  vibrate(5);
}

// A click or drag starts on a panel: with no line picked yet, New asks for one first
function startFreeDataPathStroke(key) {
  if(freeDataPathLine === null) {
    newFreeDataPathLine();
    return;
  }
  freeDataPathStroke = {saved: false, last: null};
  if(key) freeDataPathReach(key, true);
}

// The click or drag is over: recalculate everything the lines feed (ports, gear, cables)
function endFreeDataPathStroke() {
  const stroke = freeDataPathStroke;
  freeDataPathStroke = null;
  if(stroke && stroke.saved) calculate();
}

function clearFreeDataPathLine() {
  const data = screens[currentScreenId].data;
  if(!(data.freeDataPaths || []).some(p => p.line === freeDataPathLine)) return;
  saveState();
  data.freeDataPaths = data.freeDataPaths.filter(p => p.line !== freeDataPathLine);
  calculate();
}

async function clearFreeDataPaths() {
  const data = screens[currentScreenId].data;
  if(!(data.freeDataPaths || []).length) return;
  const ok = await showConfirm('Clear every drawn data line?', 'Clear All');
  if(!ok) return;
  saveState();
  data.freeDataPaths = [];
  freeDataPathLine = null;
  calculate();
}

// Listeners on the Data canvas, attached once. They only act while drawing lines.
function setupFreeDataPathInteractivity() {
  if(freeDataPathListenersSetup) return;
  freeDataPathListenersSetup = true;
  const canvas = document.getElementById('dataCanvas');
  const active = () => freeDataPathDrawing() && !!(isFreeCurrentScreen() ? freeLayerView.dataCanvas : gridDataLayoutView);

  canvas.addEventListener('mousedown', function(e) {
    if(e.button !== 0 || !active()) return;
    // Ignore the mousedown a touch device synthesizes after a tap
    if(Date.now() - lastTouchInteraction < 700) return;
    e.preventDefault();
    startFreeDataPathStroke(freeDataPathPanelAt(e.clientX, e.clientY));
  });

  canvas.addEventListener('mousemove', function(e) {
    if(!active() || freeDataPathStroke) return;
    setFreeDataPathHover(freeDataPathPanelAt(e.clientX, e.clientY));
  });

  canvas.addEventListener('mouseleave', function() {
    if(!freeDataPathStroke) setFreeDataPathHover(null);
  });

  document.addEventListener('mousemove', function(e) {
    if(!freeDataPathStroke) return;
    const hit = freeDataPathPanelAt(e.clientX, e.clientY);
    freeDataPathHover = hit;
    if(hit && hit !== freeDataPathStroke.last) freeDataPathReach(hit, false);
    else freeDataPathRedraw();
  });

  document.addEventListener('mouseup', function() {
    if(freeDataPathStroke) endFreeDataPathStroke();
  });

  canvas.addEventListener('touchstart', function(e) {
    if(!active() || e.touches.length !== 1) return;
    e.preventDefault();
    lastTouchInteraction = Date.now();
    const t = e.touches[0];
    const hit = freeDataPathPanelAt(t.clientX, t.clientY);
    freeDataPathHover = hit;
    startFreeDataPathStroke(hit);
  }, {passive: false});

  canvas.addEventListener('touchmove', function(e) {
    if(!freeDataPathStroke || e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    const hit = freeDataPathPanelAt(t.clientX, t.clientY);
    freeDataPathHover = hit;
    if(hit && hit !== freeDataPathStroke.last) freeDataPathReach(hit, false);
    else freeDataPathRedraw();
  }, {passive: false});

  canvas.addEventListener('touchend', function() {
    lastTouchInteraction = Date.now();
    freeDataPathHover = null;
    if(freeDataPathStroke) endFreeDataPathStroke();
    else freeDataPathRedraw();
  });

  canvas.addEventListener('touchcancel', function() {
    freeDataPathHover = null;
    if(freeDataPathStroke) endFreeDataPathStroke();
  });
}
