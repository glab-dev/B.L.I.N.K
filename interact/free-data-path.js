// ==================== FREE-DRAW DATA PATHS ====================
// Drawing data lines by hand on a drawn screen's Data layout, Tessera-style. With Draw
// Path on, pick a line, then click panels in cable order or drag across them: each panel
// joins the line in the order it is reached, leaving any other line it was on. Clicking
// the line's last panel takes it off again. Clear Line drops the picked line's drawn path,
// Auto drops them all. The paths live on the screen (data.freeDataPaths, layouts/free-data.js);
// panels on no drawn path stay on the automatic lines.

let freeDataPathMode = false;
let freeDataPathLine = 1;          // the line being drawn, 1-based like Assign Data Line
let freeDataPathStroke = null;     // {saved, last} while a click or drag is drawing
let freeDataPathListenersSetup = false;

// Draw Path on the Data layout. It shares the canvas with Select Mode, so turning one on
// turns the other off; both block native touch scroll so a drag draws.
function setFreeDataPathMode(on) {
  if(on && freeLayerSelectMode.dataCanvas) setFreeSelectMode('dataCanvas', false);
  freeDataPathMode = on;
  freeDataPathStroke = null;
  const canvas = document.getElementById('dataCanvas');
  if(canvas) canvas.classList.toggle('select-mode-active', on || freeLayerSelectMode.dataCanvas);
  const btn = document.getElementById('freeDataPathBtn');
  if(btn) {
    btn.textContent = on ? 'On' : 'Off';
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  setupFreeDataPathInteractivity();
}

function toggleFreeDataPathMode() {
  setFreeDataPathMode(!freeDataPathMode);
  updateFreeDataPathRow(true);
  vibrate(10);
}

// The Draw Path row, its line chips (each line on the screen, then New) and the warning
// for drawn lines over a port's capacity. Shown with the Select Mode toggles: a drawn
// screen in Draw mode.
function updateFreeDataPathRow(on) {
  const row = document.getElementById('freeDataPathRow');
  const warn = document.getElementById('freeDataPathWarning');
  if(row) row.style.display = on ? '' : 'none';
  if(!on) {
    if(freeDataPathMode) setFreeDataPathMode(false);
    if(warn) warn.style.display = 'none';
    return;
  }
  const data = screens[currentScreenId].data;
  const st = freeDataState;
  const paths = data.freeDataPaths || [];
  const lines = st ? st.sortedDataLines.map(ln => ln + 1) : [];
  const newLine = Math.max(0, ...lines, ...paths.map(p => p.line)) + 1;
  if(freeDataPathLine !== newLine && !lines.includes(freeDataPathLine)) freeDataPathLine = lines[0] || 1;

  const chips = document.getElementById('freeDataLineChips');
  if(chips) {
    chips.textContent = '';
    const chip = (text, line, title) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toggle-btn';
      b.textContent = text;
      b.title = title;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', line === freeDataPathLine ? 'true' : 'false');
      b.classList.toggle('active', line === freeDataPathLine);
      b.addEventListener('click', () => {
        freeDataPathLine = line;
        updateFreeDataPathRow(true);
      });
      chips.appendChild(b);
    };
    // Each line named as everywhere else in the app: its place along the data path
    lines.forEach(ln => {
      const shown = dataLineDisplayNumber(currentScreenId, ln);
      const drawn = paths.some(p => p.line === ln);
      chip(drawn ? `${shown} ✎` : `${shown}`, ln, drawn ? `Line ${shown} — drawn` : `Line ${shown}`);
    });
    chip('New', newLine, 'Start a new line');
  }
  const clearBtn = document.getElementById('freeDataPathClearBtn');
  if(clearBtn) clearBtn.disabled = !paths.some(p => p.line === freeDataPathLine);
  const autoBtn = document.getElementById('freeDataPathAutoBtn');
  if(autoBtn) autoBtn.disabled = paths.length === 0;

  // A drawn line can take more than a port carries; say so, as the grid's limits would
  if(warn) {
    const msgs = [];
    if(st && paths.length) {
      const allPanels = getAllPanels();
      const typeOf = new Map(data.freePanels.map(fp => [`${fp.gx},${fp.gy}`, fp.type]));
      paths.forEach(path => {
        const g = st.groups.find(gr => gr.some(pt => pt.c + ',' + pt.r === path.panels[0]));
        if(!g) return;
        const px = g.reduce((sum, pt) => {
          const p = allPanels[typeOf.get(`${pt.c},${pt.r}`)];
          return sum + (p ? p.res_x * p.res_y : 0);
        }, 0);
        const shown = dataLineDisplayNumber(currentScreenId, path.line);
        if(st.capacity > 0 && px > st.capacity) {
          msgs.push(`Line ${shown} is ${px.toLocaleString()} px — over the ${st.capacity.toLocaleString()} px one port carries.`);
        } else if(g.length > st.panelsPerDataLine) {
          msgs.push(`Line ${shown} has ${g.length} panels — over the ${st.panelsPerDataLine} per data line.`);
        }
      });
    }
    warn.textContent = msgs.length ? '⚠️ ' + msgs.join(' ') : '';
    warn.style.display = msgs.length ? 'block' : 'none';
  }
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
  calculateFreeData(data, getAllPanels());
  generateLayout('data');
  vibrate(5);
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
  const ok = await showConfirm('Clear every drawn data path? Their panels go back to the automatic data lines.', 'Auto Data Lines');
  if(!ok) return;
  saveState();
  data.freeDataPaths = [];
  calculate();
}

// Listeners on the Data canvas, attached once. They only act with Draw Path on, on a
// drawn screen in Draw mode.
function setupFreeDataPathInteractivity() {
  if(freeDataPathListenersSetup) return;
  freeDataPathListenersSetup = true;
  const canvas = document.getElementById('dataCanvas');
  const active = () => freeDataPathMode && freeDrawMode && isFreeCurrentScreen() && !!freeLayerView.dataCanvas;

  canvas.addEventListener('mousedown', function(e) {
    if(e.button !== 0 || !active()) return;
    // Ignore the mousedown a touch device synthesizes after a tap
    if(Date.now() - lastTouchInteraction < 700) return;
    e.preventDefault();
    freeDataPathStroke = {saved: false, last: null};
    const hit = freeLayerPanelAt('dataCanvas', e.clientX, e.clientY);
    if(hit) freeDataPathReach(hit, true);
  });

  document.addEventListener('mousemove', function(e) {
    if(!freeDataPathStroke) return;
    const hit = freeLayerPanelAt('dataCanvas', e.clientX, e.clientY);
    if(hit && hit !== freeDataPathStroke.last) freeDataPathReach(hit, false);
  });

  document.addEventListener('mouseup', function() {
    if(freeDataPathStroke) endFreeDataPathStroke();
  });

  canvas.addEventListener('touchstart', function(e) {
    if(!active() || e.touches.length !== 1) return;
    e.preventDefault();
    lastTouchInteraction = Date.now();
    freeDataPathStroke = {saved: false, last: null};
    const t = e.touches[0];
    const hit = freeLayerPanelAt('dataCanvas', t.clientX, t.clientY);
    if(hit) freeDataPathReach(hit, true);
  }, {passive: false});

  canvas.addEventListener('touchmove', function(e) {
    if(!freeDataPathStroke || e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    const hit = freeLayerPanelAt('dataCanvas', t.clientX, t.clientY);
    if(hit && hit !== freeDataPathStroke.last) freeDataPathReach(hit, false);
  }, {passive: false});

  canvas.addEventListener('touchend', function() {
    lastTouchInteraction = Date.now();
    if(freeDataPathStroke) endFreeDataPathStroke();
  });

  canvas.addEventListener('touchcancel', function() {
    if(freeDataPathStroke) endFreeDataPathStroke();
  });
}
