// ==================== FREE-DRAW LAYOUT SELECTION ====================
// Panel selection on the Power and Data layouts of a drawn screen, the way the Combined
// view does it. Each layout has its own Select Mode toggle and its own selection, so the
// layouts are edited independently. With Select Mode on: click a panel, drag a box,
// Shift/Ctrl/⌘ to add, right-click for that layout's options; on touch, tap to select,
// drag a box, and tap a selected panel for the options. With it off the layout is view-only.

const freeLayerSel = { powerCanvas: new Set(), dataCanvas: new Set() };
const freeLayerSelectMode = { powerCanvas: false, dataCanvas: false };
const FREE_LAYER_KIND = { powerCanvas: 'power', dataCanvas: 'data' };
const FREE_LAYER_SELECT_BTN = { powerCanvas: 'freePowerSelectModeBtn', dataCanvas: 'freeDataSelectModeBtn' };
const freeLayerView = {};   // canvasId -> {cellPx, cols, mirror}, set by the renderer
let freeLayerAction = null; // drag box in progress: {canvasId, x, y, x2, y2, moved, additive, base}
let freeLayerRafId = 0;
let freeLayerListenersSetup = false;

// Where a panel is drawn on a layout canvas, in canvas pixels. A mirrored (rear view)
// canvas draws the wall flipped left to right.
function freeLayerRect(canvasId, gx, gy, cells) {
  const v = freeLayerView[canvasId];
  const toPx = g => Math.round(g * v.cellPx);
  const x0 = v.mirror ? v.cols - gx - cells.cw : gx;
  return {x: toPx(x0), y: toPx(gy), w: toPx(x0 + cells.cw) - toPx(x0), h: toPx(gy + cells.ch) - toPx(gy)};
}

// Keys of the panels a canvas-pixel rectangle touches (a point when x0 = x1 and y0 = y1)
function freeLayerPanelsIn(canvasId, x0, y0, x1, y1) {
  if(!freeLayerView[canvasId]) return [];
  const data = screens[currentScreenId].data;
  const allPanels = getAllPanels();
  const keys = [];
  data.freePanels.forEach(fp => {
    const r = freeLayerRect(canvasId, fp.gx, fp.gy, freeCells(allPanels[fp.type], data.freeCell_mm));
    if(r.x <= x1 && r.x + r.w > x0 && r.y <= y1 && r.y + r.h > y0) keys.push(`${fp.gx},${fp.gy}`);
  });
  return keys;
}

function freeLayerCanvasPoint(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height)};
}

function freeLayerPanelAt(canvasId, clientX, clientY) {
  const p = freeLayerCanvasPoint(document.getElementById(canvasId), clientX, clientY);
  return freeLayerPanelsIn(canvasId, p.x, p.y, p.x, p.y)[0] || null;
}

function freeLayerRedraw(canvasId) {
  if(freeLayerRafId) return;
  freeLayerRafId = requestAnimationFrame(() => {
    freeLayerRafId = 0;
    if(isFreeCurrentScreen()) generateLayout(FREE_LAYER_KIND[canvasId]);
  });
}

// The drag box, drawn by the layout renderer on top of the panels
function drawFreeLayerBox(ctx, canvasId) {
  const a = freeLayerAction;
  if(!a || a.canvasId !== canvasId || !a.moved) return;
  const p1 = freeLayerCanvasPoint(ctx.canvas, a.x, a.y), p2 = freeLayerCanvasPoint(ctx.canvas, a.x2, a.y2);
  const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
  const w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);
  ctx.save();
  ctx.fillStyle = 'rgba(0, 255, 0, 0.12)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

// Replace (or, with a modifier held, extend) the selection with every panel the box touches
function applyFreeLayerBox() {
  const a = freeLayerAction;
  const canvas = document.getElementById(a.canvasId);
  const p1 = freeLayerCanvasPoint(canvas, a.x, a.y), p2 = freeLayerCanvasPoint(canvas, a.x2, a.y2);
  const keys = freeLayerPanelsIn(a.canvasId, Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.max(p1.x, p2.x), Math.max(p1.y, p2.y));
  const sel = freeLayerSel[a.canvasId];
  sel.clear();
  if(a.additive) a.base.forEach(k => sel.add(k));
  keys.forEach(k => sel.add(k));
  freeLayerRedraw(a.canvasId);
}

// Select Mode for one drawn layout. It also blocks native touch scroll on its canvas so a
// drag draws a selection box instead of scrolling. Leaving it drops that layout's selection.
function setFreeSelectMode(canvasId, on) {
  freeLayerSelectMode[canvasId] = on;
  const canvas = document.getElementById(canvasId);
  if(canvas) canvas.classList.toggle('select-mode-active', on);
  // In Manual data, Select Mode pauses drawing lines and turning it off resumes it
  if(canvasId === 'dataCanvas') syncFreeDataPathCanvas();
  const btn = document.getElementById(FREE_LAYER_SELECT_BTN[canvasId]);
  if(btn) {
    btn.textContent = on ? 'On' : 'Off';
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  if(!on) freeLayerSel[canvasId].clear();
}

function toggleFreeSelectMode(canvasId) {
  setFreeSelectMode(canvasId, !freeLayerSelectMode[canvasId]);
  freeLayerRedraw(canvasId);
  vibrate(10);
}

// Listeners on the Power and Data canvases, attached once. They only act on a drawn
// screen in Draw mode; grid screens keep their canvases view-only.
function setupFreeLayerInteractivity() {
  if(freeLayerListenersSetup) return;
  freeLayerListenersSetup = true;

  Object.keys(freeLayerSel).forEach(canvasId => {
    const canvas = document.getElementById(canvasId);
    const kind = FREE_LAYER_KIND[canvasId];
    const active = () => freeDrawMode && isFreeCurrentScreen() && !!freeLayerView[canvasId] && freeLayerSelectMode[canvasId];
    let touchStart = null;

    canvas.addEventListener('mousedown', function(e) {
      if(e.button !== 0 || !active()) return;
      // Ignore the mousedown a touch device synthesizes after a tap
      if(Date.now() - lastTouchInteraction < 700) return;
      e.preventDefault();
      freeLayerAction = {canvasId, x: e.clientX, y: e.clientY, x2: e.clientX, y2: e.clientY, moved: false,
        additive: e.ctrlKey || e.metaKey || e.shiftKey, base: new Set(freeLayerSel[canvasId])};
    });

    // Right-click a panel: select it if it isn't already, then show this layout's options
    canvas.addEventListener('contextmenu', function(e) {
      if(!active()) return;
      e.preventDefault();
      const hit = freeLayerPanelAt(canvasId, e.clientX, e.clientY);
      if(!hit) return;
      const sel = freeLayerSel[canvasId];
      if(!sel.has(hit)) {
        sel.clear();
        sel.add(hit);
        generateLayout(kind);
      }
      showFreeContextMenu(e.clientX, e.clientY, kind, sel);
    });

    canvas.addEventListener('touchstart', function(e) {
      if(!active()) return;
      lastTouchInteraction = Date.now();
      if(e.touches.length !== 1) { touchStart = null; return; }
      const t = e.touches[0];
      touchStart = {x: t.clientX, y: t.clientY, hit: freeLayerPanelAt(canvasId, t.clientX, t.clientY)};
    }, {passive: false});

    canvas.addEventListener('touchmove', function(e) {
      if(!touchStart || e.touches.length !== 1) return;
      const t = e.touches[0];
      if(!freeLayerAction && Math.abs(t.clientX - touchStart.x) <= 10 && Math.abs(t.clientY - touchStart.y) <= 10) return;
      e.preventDefault();
      if(!freeLayerAction) {
        freeLayerAction = {canvasId, x: touchStart.x, y: touchStart.y, moved: true, additive: false, base: new Set()};
        vibrate(10);
      }
      freeLayerAction.x2 = t.clientX;
      freeLayerAction.y2 = t.clientY;
      applyFreeLayerBox();
    }, {passive: false});

    canvas.addEventListener('touchend', function(e) {
      lastTouchInteraction = Date.now();
      const start = touchStart;
      touchStart = null;
      if(freeLayerAction && freeLayerAction.canvasId === canvasId) {
        freeLayerAction = null;
        freeLayerRedraw(canvasId);
        return;
      }
      if(!start || !start.hit) return;
      const t = e.changedTouches[0];
      if(Math.abs(t.clientX - start.x) >= 15 || Math.abs(t.clientY - start.y) >= 15) return;
      const sel = freeLayerSel[canvasId];
      if(sel.has(start.hit)) {
        vibrate(30);
        showFreeContextMenu(t.clientX, t.clientY, kind, sel);
      } else {
        sel.clear();
        sel.add(start.hit);
        vibrate(10);
        freeLayerRedraw(canvasId);
      }
    });

    canvas.addEventListener('touchcancel', function() {
      touchStart = null;
      if(freeLayerAction && freeLayerAction.canvasId === canvasId) {
        freeLayerAction = null;
        freeLayerRedraw(canvasId);
      }
    });
  });

  document.addEventListener('mousemove', function(e) {
    const a = freeLayerAction;
    if(!a) return;
    a.x2 = e.clientX;
    a.y2 = e.clientY;
    if(!a.moved && Math.abs(a.x2 - a.x) <= 4 && Math.abs(a.y2 - a.y) <= 4) return;
    a.moved = true;
    applyFreeLayerBox();
  });

  document.addEventListener('mouseup', function(e) {
    const a = freeLayerAction;
    if(!a) return;
    freeLayerAction = null;
    if(!a.moved) {
      // A click: select just this panel, or with a modifier add/remove it; a click on
      // a selected panel or on empty space drops the selection
      const sel = freeLayerSel[a.canvasId];
      const hit = freeLayerPanelAt(a.canvasId, e.clientX, e.clientY);
      if(hit) {
        const was = sel.has(hit);
        if(!a.additive) sel.clear();
        if(was) sel.delete(hit); else sel.add(hit);
      } else if(!a.additive) {
        sel.clear();
      }
    }
    freeLayerRedraw(a.canvasId);
  });
}
