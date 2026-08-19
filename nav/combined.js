// ==================== COMBINED VIEW ====================
// Combined multi-screen view with layout renderers, specs, gear list,
// canvas handlers, zoom, mirroring, and position management.
// Called by switchMobileView() in the navigation dispatcher.

function activateCombinedView() {
  // Show combined view with screen toggle buttons
  const combinedContainer = document.getElementById('combinedContainer');
  if(combinedContainer) combinedContainer.style.display = 'block';
  // Save current screen data first to ensure deletedPanels is synced
  if(typeof saveCurrentScreenData === 'function') {
    saveCurrentScreenData();
  }
  // Seed the power toggles from the selected screens' per-screen flags, so opening the view
  // after a project load reflects the groups already in the file.
  combinedShareDistroOn = combinedScreensAllHaveFlag('sharedDistro');
  combinedPhaseBalanceOn = combinedScreensAllHaveFlag('phaseBalance');
  // Initialize combined view
  if(typeof initCombinedView === 'function') {
    initCombinedView();
  }
}

// ==================== COMBINED VIEW FUNCTIONS ====================

// Track which screens are selected for combined view
let combinedSelectedScreens = new Set();

// Combined specs power/phase toggle state
let combinedPowerType = 'max';
let combinedPhase = 3;

// Combined power-layout toggles. Both drive the SAME per-screen flags the Complex tab uses
// (data.sharedDistro / data.phaseBalance) — the combined selection defines the group exactly:
// on = true for every selected screen and false for every screen that isn't.
let combinedShareDistroOn = false;
let combinedPhaseBalanceOn = false;

// True when every selected screen already has the per-screen flag on (and something is
// selected). Used to seed the two toggles when the Combined view is opened.
function combinedScreensAllHaveFlag(flag) {
  if(combinedSelectedScreens.size === 0) return false;
  return [...combinedSelectedScreens].every(id => screens[id] && screens[id].data && !!screens[id].data[flag]);
}

// "Selection defines the group exactly": set the flag on the selected screens and clear it
// everywhere else, so a screen that isn't in the Combined view is never in the distro group
// and is never phase balanced — its Complex-tab toggle reads Off to match.
function applyCombinedScreenFlag(flag, on) {
  Object.keys(screens).forEach(id => {
    if(!screens[id] || !screens[id].data) return;
    screens[id].data[flag] = !!(on && combinedSelectedScreens.has(id));
  });
}

function updateCombinedPowerToggleButtons() {
  const sd = document.getElementById('combinedShareDistroBtn');
  if(sd) { sd.classList.toggle('active', combinedShareDistroOn); sd.textContent = combinedShareDistroOn ? 'On' : 'Off'; }
  const pb = document.getElementById('combinedPhaseBalanceBtn');
  if(pb) { pb.classList.toggle('active', combinedPhaseBalanceOn); pb.textContent = combinedPhaseBalanceOn ? 'On' : 'Off'; }
}

// After changing a per-screen flag from the Combined view, pull the current screen's value
// back into the Complex tab's global + button so the two views can't disagree.
function syncComplexPowerToggles() {
  const data = (screens[currentScreenId] && screens[currentScreenId].data) || null;
  if(!data) return;

  if(typeof shareDistroEnabled !== 'undefined') {
    shareDistroEnabled = !!data.sharedDistro;
    const btn = document.getElementById('shareDistroBtn');
    if(btn) { btn.classList.toggle('active', shareDistroEnabled); btn.textContent = shareDistroEnabled ? 'On' : 'Off'; }
  }
  if(typeof phaseBalanceMode !== 'undefined') {
    phaseBalanceMode = data.phaseBalance ? 'balanced' : 'aswired';
    const btn = document.getElementById('phaseBalanceBtn');
    if(btn) { btn.classList.toggle('active', !!data.phaseBalance); btn.textContent = data.phaseBalance ? 'On' : 'Off'; }
  }
}

function toggleCombinedShareDistro() {
  combinedShareDistroOn = !combinedShareDistroOn;
  applyCombinedScreenFlag('sharedDistro', combinedShareDistroOn);
  syncComplexPowerToggles();
  updateCombinedPowerToggleButtons();
  if(typeof calculate === 'function') calculate();
  renderCombinedView();
}

function toggleCombinedPhaseBalance() {
  combinedPhaseBalanceOn = !combinedPhaseBalanceOn;
  applyCombinedScreenFlag('phaseBalance', combinedPhaseBalanceOn);
  syncComplexPowerToggles();
  updateCombinedPowerToggleButtons();
  if(typeof calculate === 'function') calculate();
  renderCombinedView();
}

function setCombinedPowerType(type) {
  combinedPowerType = type;
  document.getElementById('combinedPowerMaxBtn').classList.toggle('active', type === 'max');
  document.getElementById('combinedPowerAvgBtn').classList.toggle('active', type === 'avg');
  renderCombinedSpecs(Array.from(combinedSelectedScreens));
  renderCombinedPhaseBalance(Array.from(combinedSelectedScreens));
}

function setCombinedPhase(phase) {
  combinedPhase = phase;
  document.getElementById('combinedPhase3Btn').classList.toggle('active', phase === 3);
  document.getElementById('combinedPhase1Btn').classList.toggle('active', phase === 1);
  renderCombinedSpecs(Array.from(combinedSelectedScreens));
}

// Store screen dimensions for click handling in Combined view
let combinedScreenDimensions = [];
let combinedPanelSize = 40;
let combinedTopPadding = 60;
let combinedLeftPadding = 20;
let combinedPixelScale = 1; // Uniform scale for mirroring canvas positions
let combinedZoomLevel = 100; // Zoom percentage (100 = 100%)

// Combined view panel selection state.
// These two always mirror the canvas last interacted with — the assign/delete helpers read
// them, so pointing them at one canvas's selection is what makes those helpers act on it.
let combinedSelectedPanel = null; // { screenId, col, row, key } - for single selection (mobile)
let combinedSelectedPanels = new Set(); // Set of "screenId:col,row" strings for multi-selection (desktop)

// Selection is PER CANVAS: selecting panels in the standard view must not select the same
// panels in the power and data views — each layout is edited independently.
const combinedSelectionByCanvas = {
  combinedStandardCanvas: { panels: new Set(), panel: null },
  combinedPowerCanvas:    { panels: new Set(), panel: null },
  combinedDataCanvas:     { panels: new Set(), panel: null }
};
let combinedActiveSelectionCanvasId = 'combinedStandardCanvas';

// Point the globals at one canvas's selection. Called at the start of every canvas
// interaction. combinedSelectedPanels is assigned the stored Set itself (not a copy), so
// every mutation the existing helpers make lands on that canvas's selection.
function useCombinedSelection(canvasId) {
  const sel = combinedSelectionByCanvas[canvasId];
  if(!sel) return;
  combinedActiveSelectionCanvasId = canvasId;
  combinedSelectedPanels = sel.panels;
  combinedSelectedPanel = sel.panel;
}

// combinedSelectedPanel is a value, not a reference like the Set, so it has to be written
// back to the active canvas whenever it changes.
function syncCombinedSelectedPanel() {
  const sel = combinedSelectionByCanvas[combinedActiveSelectionCanvasId];
  if(sel) sel.panel = combinedSelectedPanel;
}

// Drop every canvas's selection (leaving Select Mode, clearing the view).
function clearAllCombinedSelections() {
  Object.keys(combinedSelectionByCanvas).forEach(id => {
    combinedSelectionByCanvas[id].panels.clear();
    combinedSelectionByCanvas[id].panel = null;
  });
  combinedSelectedPanel = null;
}

// Geometry each combined renderer ACTUALLY drew, keyed by canvas id, so hit detection and the
// selection overlay can never disagree with the pixels on screen. The standard canvas applies
// zoom / custom drag positions / mirroring while the power+data canvases draw a plain
// left-to-right row at the unzoomed panel size — re-deriving that in the hit-test would be
// right at 100% zoom and silently wrong everywhere else.
// canvasId -> [{ screenId, screen, data, pw, screenX, screenY, panelWidth, geo }]
let combinedHitGeometry = {};

function recordCombinedHitGeometry(canvasId, entries) {
  combinedHitGeometry[canvasId] = entries;
}

// Green outline over every selected panel, drawn from the geometry the renderer just
// published so it lands on the right cells on any of the three canvases. Deleted panels
// aren't drawn at all, so an outline there would float on empty background — they stay
// selectable (that's how they get restored), they just don't get an outline.
function drawCombinedSelectionOverlay(ctx, canvasId) {
  const entries = combinedHitGeometry[canvasId];
  if(!entries || entries.length === 0) return;

  // This canvas's OWN selection — not the active one, so each layout outlines only what
  // was selected in it.
  const sel = combinedSelectionByCanvas[canvasId];
  if(!sel) return;
  if(sel.panels.size === 0 && !sel.panel) return;

  const byScreen = new Map();
  entries.forEach(e => byScreen.set(e.screenId, e));

  // Thin outline that still scales a little with the drawn panel size (2px at the usual
  // 40px panel) — it marks the panel without hiding its colour or label.
  const ref = entries[0].panelWidth || 20;
  const lineWidth = Math.max(1, Math.round(ref / 24));
  const inset = lineWidth / 2; // stroke is centred, so this keeps it inside the cell

  const outline = (screenId, panelKey) => {
    const e = byScreen.get(screenId);
    if(!e || isCombinedPanelDeleted(e.data, panelKey)) return;
    const [col, row] = panelKey.split(',').map(Number);
    if(!(col >= 0 && col < e.pw && row >= 0 && row < e.geo.effectivePh)) return;
    const px = e.screenX + col * e.panelWidth;
    const py = e.screenY + e.geo.rowY(row);
    ctx.strokeRect(px + inset, py + inset, e.panelWidth - inset * 2, e.geo.rowH(row) - inset * 2);
  };

  ctx.save();
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = lineWidth;
  if(sel.panels.size > 0) {
    sel.panels.forEach(key => {
      const sep = key.indexOf(':');
      outline(key.slice(0, sep), key.slice(sep + 1));
    });
  } else if(sel.panel) {
    outline(sel.panel.screenId, sel.panel.key);
  }
  ctx.restore();
}

// Drag-select (marquee) state — client coords, live only while a drag is in progress
let combinedSelectMode = false; // mobile: drag-select panels without scrolling the canvas
let combinedMarqueeActive = false;
let combinedMarqueeMoved = false;
let combinedMarqueeX1 = 0, combinedMarqueeY1 = 0, combinedMarqueeX2 = 0, combinedMarqueeY2 = 0;
let combinedMarqueeBase = null;
let combinedMarqueeRafId = 0;
let combinedLastTouch = 0; // touch devices fire compatibility mouse events after a tap
// Which canvas the current drag started on — selection works on standard/power/data.
let combinedMarqueeCanvasId = 'combinedStandardCanvas';

// Mouse selection state. Module-level rather than per-canvas closures because the
// mousemove/mouseup handlers live on `document` and are registered once for all canvases.
let combinedMouseSelectStart = { x: 0, y: 0 };
let combinedIsMouseSelecting = false;
let combinedDocHandlersBound = false;

// The canvases that support panel selection, and the options each one offers.
const COMBINED_SELECTABLE_CANVASES = [
  { id: 'combinedStandardCanvas', layoutKind: 'standard' },
  { id: 'combinedPowerCanvas',    layoutKind: 'power' },
  { id: 'combinedDataCanvas',     layoutKind: 'data' }
];

// Draw the drag-selection box on top of the freshly rendered combined layout.
function drawCombinedMarqueeRect() {
  if(!combinedMarqueeActive || !combinedMarqueeMoved) return;

  const canvas = document.getElementById(combinedMarqueeCanvasId);
  if(!canvas) return;

  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (Math.min(combinedMarqueeX1, combinedMarqueeX2) - rect.left) * scaleX;
  const y = (Math.min(combinedMarqueeY1, combinedMarqueeY2) - rect.top) * scaleY;
  const w = Math.abs(combinedMarqueeX2 - combinedMarqueeX1) * scaleX;
  const h = Math.abs(combinedMarqueeY2 - combinedMarqueeY1) * scaleY;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 255, 0, 0.12)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.restore();
}

// Replace (or extend, when a modifier is held) the selection with everything
// the drag box covers, then redraw the combined view with the box on top.
function applyCombinedMarqueeSelection(isAdditive) {
  const canvas = document.getElementById(combinedMarqueeCanvasId);
  if(!canvas) return;

  const next = (isAdditive && combinedMarqueeBase) ? new Set(combinedMarqueeBase) : new Set();
  getCombinedPanelsInRect(canvas, combinedMarqueeX1, combinedMarqueeY1, combinedMarqueeX2, combinedMarqueeY2)
    .forEach(p => next.add(`${p.screenId}:${p.key}`));

  combinedSelectedPanels.clear();
  next.forEach(key => combinedSelectedPanels.add(key));
  combinedSelectedPanel = null;
  syncCombinedSelectedPanel();

  // Coalesce redraws — renderCombinedView() is a full re-render, too heavy per raw move event
  if(combinedMarqueeRafId) return;
  combinedMarqueeRafId = requestAnimationFrame(function() {
    combinedMarqueeRafId = 0;
    renderCombinedView();
    drawCombinedMarqueeRect();
  });
}

function endCombinedMarquee() {
  combinedMarqueeActive = false;
  combinedMarqueeMoved = false;
  combinedMarqueeBase = null;
  if(combinedMarqueeRafId) {
    cancelAnimationFrame(combinedMarqueeRafId);
    combinedMarqueeRafId = 0;
  }
}

// Toggle mobile Select Mode for the Combined view: blocks native scroll on the
// canvas so dragging paints a selection box instead of scrolling.
function toggleCombinedSelectMode() {
  combinedSelectMode = !combinedSelectMode;

  const btn = document.getElementById('combinedSelectModeBtn');

  // All three selectable canvases must block native scroll, or dragging a box on the
  // power/data canvas would scroll the page instead of selecting.
  COMBINED_SELECTABLE_CANVASES.forEach(({ id }) => {
    const c = document.getElementById(id);
    if(c) c.classList.toggle('select-mode-active', combinedSelectMode);
  });
  if(btn) {
    btn.classList.toggle('active', combinedSelectMode);
    btn.setAttribute('aria-pressed', combinedSelectMode ? 'true' : 'false');
  }

  // Leaving Select Mode clears the working selection on every canvas
  if(!combinedSelectMode) {
    clearAllCombinedSelections();
    renderCombinedView();
  }

  vibrate(10);
}

// Screen positions for Combined view (custom offsets)
// Format: { screenId: { x: offsetX, y: offsetY } }
let combinedScreenPositions = {};
const STORAGE_KEY_COMBINED_POSITIONS = 'ledcalc_combined_positions';

// Manual adjust mode for Combined view (controls whether dragging is enabled)
let combinedManualAdjust = false;

// Load combined screen positions from localStorage
function loadCombinedPositions() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_COMBINED_POSITIONS);
    if(data) {
      const parsed = JSON.parse(data);
      if(parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const safe = {};
        Object.keys(parsed).forEach(key => {
          if(!isSafeKey(key)) return;
          const val = parsed[key];
          if(val && typeof val === 'object' && typeof val.x === 'number' && typeof val.y === 'number') {
            safe[key] = val;
          }
        });
        combinedScreenPositions = safe;
      }
    }
  } catch(e) {
    console.error('Error loading combined positions:', e);
    combinedScreenPositions = {};
  }
}

// Save combined screen positions to localStorage
function saveCombinedPositions() {
  try {
    localStorage.setItem(STORAGE_KEY_COMBINED_POSITIONS, JSON.stringify(combinedScreenPositions));
  } catch(e) {
    console.error('Error saving combined positions:', e);
  }
}

// ==================== COMBINED ARRANGEMENT SNAPSHOT ====================
// Read-only description of how the Combined view currently arranges screens, so the PDF
// combined diagram can render the same thing. Nothing here renders or mutates the view.

// Panel size the persisted drag offsets were captured at, restored from a project file.
let combinedSavedPanelSize = 0;

// Base (unzoomed) panel size the current arrangement is laid out with. renderCombinedView()
// stores width in unzoomed px, so width/pw recovers it.
function getCombinedArrangementPanelSize() {
  // A saved panel size wins while the Combined view is off-screen: renderCombinedView()
  // measures a hidden wrapper as 0 wide and clamps to its 15px floor, which would
  // misscale the stored drag offsets.
  const container = document.getElementById('combinedStandardCanvasWrapper');
  const containerVisible = !!(container && container.clientWidth > 0);
  if(containerVisible) {
    for(let i = 0; i < combinedScreenDimensions.length; i++) {
      const dim = combinedScreenDimensions[i];
      if(dim && dim.pw > 0 && dim.width > 0) return dim.width / dim.pw;
    }
  }
  if(combinedSavedPanelSize > 0) return combinedSavedPanelSize;
  return 40;
}

// Returns { items, panelSize, gapUnits } with geometry in panel units (1 unit = one panel
// width), which makes it independent of zoom and of the container width. Selected screens
// come first in combinedSelectedScreens order — the app's left-to-right order — carrying
// their manual drag offsets. Screens not in the Combined view are appended in tab order to
// the right of that arrangement. Returns null when there is nothing to draw.
function getCombinedArrangement() {
  if(typeof screens === 'undefined' || Object.keys(screens).length === 0) return null;

  const panelSize = getCombinedArrangementPanelSize();
  const gapUnits = Math.max(10, Math.min(20, panelSize / 2)) / panelSize;

  // Box size in panel units — mirrors the height math in renderCombinedView()
  function boxUnits(screenId) {
    const data = (screens[screenId] && screens[screenId].data) || {};
    const pw = parseInt(data.panelsWide) || 0;
    const ph = parseInt(data.panelsHigh) || 0;
    const panelType = data.panelType || 'CB5_MKII';
    const heightRatio = getPanelHeightRatio(panelType);
    const halfRow = !!(data.addCB5HalfRow && panelType === 'CB5_MKII');
    return {
      pw: pw,
      ph: ph,
      heightRatio: heightRatio,
      halfRow: halfRow,
      w: pw,
      h: ph * heightRatio + (halfRow ? 1 : 0)
    };
  }

  const items = [];
  const used = {};

  // Selected screens. Base x is the running row position renderCombinedView() computes
  // (running sum of widths plus a gap between neighbours), expressed in panel units; the
  // manual drag offset is then applied on top exactly as the canvas renderer does.
  let rowX = 0;
  let placed = 0;
  Array.from(combinedSelectedScreens).forEach(screenId => {
    if(!screens[screenId]) return;
    const box = boxUnits(screenId);
    if(box.pw <= 0 || box.ph <= 0) return;
    const baseX = rowX + (placed > 0 ? gapUnits : 0);
    const pos = combinedScreenPositions[screenId] || { x: 0, y: 0 };
    items.push({
      screenId: screenId,
      pw: box.pw,
      ph: box.ph,
      heightRatio: box.heightRatio,
      halfRow: box.halfRow,
      x: baseX + pos.x / panelSize,
      y: pos.y / panelSize,
      w: box.w,
      h: box.h,
      arranged: true
    });
    rowX = baseX + box.w;
    placed++;
    used[screenId] = true;
  });

  // Screens not in the Combined view still belong in the diagram — appended to the right
  // of the arrangement in tab order, on the default baseline.
  let tailX = 0;
  items.forEach(it => { tailX = Math.max(tailX, it.x + it.w + gapUnits); });

  Object.keys(screens)
    .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
    .forEach(screenId => {
      if(used[screenId]) return;
      const box = boxUnits(screenId);
      if(box.pw <= 0 || box.ph <= 0) return;
      items.push({
        screenId: screenId,
        pw: box.pw,
        ph: box.ph,
        heightRatio: box.heightRatio,
        halfRow: box.halfRow,
        x: tailX,
        y: 0,
        w: box.w,
        h: box.h,
        arranged: false
      });
      tailX += box.w + gapUnits;
    });

  if(items.length === 0) return null;
  return { items: items, panelSize: panelSize, gapUnits: gapUnits };
}

// Snapshot of the Combined view arrangement for the project file, so the layout — and with
// it the PDF combined diagram — survives save/reload and moves between devices. Offsets are
// stored in px alongside the panel size they were captured at, so they can be interpreted
// on a device whose container width produces a different panel size.
function getCombinedViewSaveState() {
  const positions = {};
  Object.keys(combinedScreenPositions).forEach(screenId => {
    const pos = combinedScreenPositions[screenId];
    if(pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
      positions[screenId] = { x: pos.x, y: pos.y };
    }
  });
  return {
    selected: Array.from(combinedSelectedScreens),
    positions: positions,
    panelSize: getCombinedArrangementPanelSize(),
    manualAdjust: combinedManualAdjust
  };
}

// Restore a Combined view arrangement from a project file. Validation mirrors
// loadCombinedPositions() — this is untrusted file input.
function applyCombinedViewSaveState(state) {
  combinedSelectedScreens.clear();
  if(!state || typeof state !== 'object' || Array.isArray(state)) return;

  if(Array.isArray(state.selected)) {
    state.selected.forEach(screenId => {
      if(typeof screenId !== 'string' || !/^screen_\d+$/.test(screenId)) return;
      if(!screens[screenId]) return;
      combinedSelectedScreens.add(screenId);
    });
  }

  if(state.positions && typeof state.positions === 'object' && !Array.isArray(state.positions)) {
    const safe = {};
    Object.keys(state.positions).forEach(key => {
      if(!isSafeKey(key) || !/^screen_\d+$/.test(key)) return;
      const val = state.positions[key];
      if(val && typeof val === 'object' && typeof val.x === 'number' && typeof val.y === 'number') {
        safe[key] = { x: val.x, y: val.y };
      }
    });
    combinedScreenPositions = safe;
    saveCombinedPositions();
  }

  combinedSavedPanelSize = (typeof state.panelSize === 'number' && state.panelSize > 0)
    ? state.panelSize
    : 0;
  combinedManualAdjust = state.manualAdjust === true;
  updateManualAdjustButton();
}

// Get screen at position for dragging (checks screen label area)
function getCombinedScreenAtPosition(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const canvasX = (clientX - rect.left) * scaleX;
  const canvasY = (clientY - rect.top) * scaleY;

  // Check each screen top-most first (screens are painted in array order,
  // so the last one is drawn on top) - include label area above panels for
  // easier dragging.
  const allPanels = getAllPanels();
  const labelHeight = 25; // Height above panels for label
  for(let i = combinedScreenDimensions.length - 1; i >= 0; i--) {
    const dim = combinedScreenDimensions[i];

    let screenX, screenY, drawPanelSize;
    if(combinedMirrorCanvas) {
      const dataCanvasX = dim.data.canvasX || 0;
      const dataCanvasY = dim.data.canvasY || 0;
      const panelType = dim.data.panelType || 'CB5_MKII';
      const panelInfo = allPanels[panelType];
      const pixelWidth = panelInfo ? panelInfo.res_x : 176;
      screenX = combinedLeftPadding + (dataCanvasX / pixelWidth) * combinedPanelSize;
      screenY = combinedTopPadding + (dataCanvasY / pixelWidth) * combinedPanelSize;
      drawPanelSize = combinedPanelSize;
    } else {
      const zoomFactor = combinedZoomLevel / 100;
      const customPos = combinedScreenPositions[dim.screenId] || { x: 0, y: 0 };
      screenX = combinedLeftPadding + (dim.x + customPos.x) * zoomFactor;
      screenY = combinedTopPadding + customPos.y * zoomFactor;
      drawPanelSize = combinedPanelSize;
    }

    const geo = combinedRowGeometry(dim.data, drawPanelSize);
    const actualPanelWidth = drawPanelSize;
    const screenWidth = dim.pw * actualPanelWidth;
    const screenHeight = geo.totalH;

    const withinX = canvasX >= screenX && canvasX < screenX + screenWidth;

    // Label strip above panels is always a valid grab handle
    if(withinX && canvasY >= screenY - labelHeight && canvasY < screenY) {
      return dim;
    }

    // Inside the panel grid: only grab if over a LIVE (non-deleted) panel,
    // so clicks over blank/dead cells fall through to the screen behind.
    if(withinX && canvasY >= screenY && canvasY < screenY + screenHeight) {
      const col = Math.floor((canvasX - screenX) / actualPanelWidth);
      const row = geo.rowAt(canvasY - screenY);
      if(row < 0) continue;

      // Normalize deletedPanels (may be array from JSON or Set) to a Set
      const deleted = new Set();
      const rawDeleted = dim.data.deletedPanels;
      if(rawDeleted instanceof Set || Array.isArray(rawDeleted)) {
        rawDeleted.forEach(key => deleted.add(key));
      } else if(rawDeleted && typeof rawDeleted[Symbol.iterator] === 'function') {
        for(const key of rawDeleted) { deleted.add(key); }
      }

      if(!deleted.has(`${col},${row}`)) {
        return dim;
      }
    }
  }
  return null;
}

// Drag state for Combined view screens
let combinedDragState = {
  isDragging: false,
  screenDim: null,
  startX: 0,
  startY: 0,
  startPosX: 0,
  startPosY: 0
};

// Setup drag handlers for Combined view screens (now handled by setupCombinedCanvasHandlers)
function setupCombinedDragHandlers() {
  // Drag handling is now integrated into setupCombinedCanvasHandlers
  // This function is kept for backward compatibility
}

// Reset all screen positions in Combined view
function resetCombinedPositions() {
  combinedScreenPositions = {};
  combinedMirrorCanvas = false;
  combinedManualAdjust = false;
  combinedZoomLevel = 100; // Reset zoom to 100%
  updateCombinedZoomDisplay();
  updateMirrorCanvasButton();
  updateManualAdjustButton();
  saveCombinedPositions();
  renderCombinedView();
}

// Toggle manual adjust mode for Combined view
function toggleManualAdjust() {
  combinedManualAdjust = !combinedManualAdjust;
  updateManualAdjustButton();
}

// Update manual adjust button visual state
function updateManualAdjustButton() {
  const btn = document.getElementById('manualAdjustBtn');
  if(btn) {
    if(combinedManualAdjust) {
      btn.classList.add('active');
      btn.style.backgroundColor = '#10b981';
      btn.style.color = '#fff';
    } else {
      btn.classList.remove('active');
      btn.style.backgroundColor = '';
      btn.style.color = '';
    }
  }
}

// Mirror Canvas Layout mode
let combinedMirrorCanvas = false;

// Toggle mirroring of Canvas view layout positions
function toggleMirrorCanvasLayout() {
  combinedMirrorCanvas = !combinedMirrorCanvas;

  if(combinedMirrorCanvas) {
    // Copy positions from Canvas view to Combined view
    mirrorCanvasPositions();
    // Auto-fit zoom to show all screens
    autoFitCombinedZoom();
  } else {
    // Clear mirrored positions and use default/custom positions
    combinedScreenPositions = {};
    saveCombinedPositions();
    // Reset zoom to 100%
    combinedZoomLevel = 100;
    updateCombinedZoomDisplay();
  }

  updateMirrorCanvasButton();
  renderCombinedView();
}

// Copy positions from Canvas view to Combined view
function mirrorCanvasPositions() {
  // Get all screen canvas positions and convert to Combined view coordinates
  const allPanels = getAllPanels();
  const selectedIds = Array.from(combinedSelectedScreens);

  if(selectedIds.length === 0) return;

  // Find the bounds of all SELECTED screens in Canvas view (pixel coordinates)
  let minCanvasX = Infinity, minCanvasY = Infinity;

  selectedIds.forEach(screenId => {
    const screen = screens[screenId];
    if(!screen || !screen.data) return;

    const data = screen.data;
    const canvasX = data.canvasX || 0;
    const canvasY = data.canvasY || 0;

    minCanvasX = Math.min(minCanvasX, canvasX);
    minCanvasY = Math.min(minCanvasY, canvasY);
  });

  if(minCanvasX === Infinity) return;

  // Get a reference panel for pixel-to-panel conversion
  // Use the first selected screen's panel type
  const firstScreen = screens[selectedIds[0]];
  const refPanelType = firstScreen?.data?.panelType || 'CB5_MKII';
  const refPanel = allPanels[refPanelType];
  if(!refPanel) return;

  // Pixel size of one panel in the Canvas view
  const pixelsPerPanel = refPanel.res_x; // Assuming square-ish panels for simplicity

  // Combined view panel size (will be recalculated in renderCombinedView)
  const combinedPanelPx = combinedPanelSize || 40;

  // Scale factor: Combined pixels per Canvas pixel
  const scale = combinedPanelPx / pixelsPerPanel;

  // Convert Canvas positions directly to Combined view absolute positions
  combinedScreenPositions = {};

  selectedIds.forEach((screenId, index) => {
    const screen = screens[screenId];
    if(!screen || !screen.data) return;

    const data = screen.data;
    const pw = data.panelsWide || 0;
    const ph = data.panelsHigh || 0;
    if(pw === 0 || ph === 0) return;

    // Get Canvas position (pixel-based)
    const canvasX = data.canvasX || 0;
    const canvasY = data.canvasY || 0;

    // Position relative to top-left of all selected screens
    const relativeCanvasX = canvasX - minCanvasX;
    const relativeCanvasY = canvasY - minCanvasY;

    // Convert to Combined view coordinates
    const combinedX = relativeCanvasX * scale;
    const combinedY = relativeCanvasY * scale;

    // Calculate what the default X position would be (side-by-side)
    let defaultX = 0;
    const gap = Math.max(10, Math.min(20, combinedPanelPx / 2));
    for(let i = 0; i < index; i++) {
      const prevScreen = screens[selectedIds[i]];
      if(prevScreen && prevScreen.data) {
        defaultX += (prevScreen.data.panelsWide || 0) * combinedPanelPx + gap;
      }
    }

    // Store as offset from default position
    combinedScreenPositions[screenId] = {
      x: combinedX - defaultX,
      y: combinedY
    };
  });

  saveCombinedPositions();
}

// Update the mirror canvas button state
function updateMirrorCanvasButton() {
  const btn = document.getElementById('mirrorCanvasBtn');
  const status = document.getElementById('mirrorCanvasStatus');

  if(btn) {
    if(combinedMirrorCanvas) {
      btn.classList.add('active');
      btn.style.background = 'var(--primary)';
      btn.style.color = '#fff';
      btn.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
    } else {
      btn.classList.remove('active');
      btn.style.background = 'transparent';
      btn.style.color = '#9ca3af';
      btn.style.textShadow = 'none';
    }
  }

  if(status) {
    status.textContent = combinedMirrorCanvas ? '✓ Mirroring' : '';
  }
}

// Load positions on startup
loadCombinedPositions();

// Adjust zoom level for combined standard layout
function adjustCombinedZoom(delta) {
  combinedZoomLevel = Math.max(50, Math.min(200, combinedZoomLevel + delta));
  updateCombinedZoomDisplay();
  renderCombinedView();
}

// Set zoom level directly
function setCombinedZoom(level) {
  combinedZoomLevel = Math.max(50, Math.min(200, level));
  updateCombinedZoomDisplay();
  renderCombinedView();
}

// Update zoom display
function updateCombinedZoomDisplay() {
  const input = document.getElementById('combinedZoomInput');
  if(input) {
    input.value = combinedZoomLevel;
  }
}

// Auto-fit zoom to show all screens comfortably
function autoFitCombinedZoom() {
  // When toggling mirror canvas ON, just keep zoom at 100%
  // The mirrored view uses the same panel sizes as non-mirrored at 100% zoom
  // User can manually zoom out if needed
  combinedZoomLevel = 100;
  updateCombinedZoomDisplay();
}

// Get panel and screen at position in Combined standard canvas
function getCombinedPanelAtPosition(canvas, clientX, clientY) {
  const entries = combinedHitGeometry[canvas.id];
  if(!entries) return null;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const canvasX = (clientX - rect.left) * scaleX;
  const canvasY = (clientY - rect.top) * scaleY;

  // Walk the geometry this canvas's renderer published, so hit detection uses the exact
  // origin and panel size that were drawn (they differ per canvas — see recordCombinedHitGeometry).
  for(const e of entries) {
    const screenWidth = e.pw * e.panelWidth;
    const screenHeight = e.geo.totalH;

    if(canvasX >= e.screenX && canvasX < e.screenX + screenWidth &&
       canvasY >= e.screenY && canvasY < e.screenY + screenHeight) {
      const col = Math.floor((canvasX - e.screenX) / e.panelWidth);
      const row = e.geo.rowAt(canvasY - e.screenY);

      if(col >= 0 && col < e.pw && row >= 0 && row < e.geo.effectivePh) {
        return {
          screenId: e.screenId,
          screen: e.screen,
          data: e.data,
          col,
          row,
          key: `${col},${row}`
        };
      }
    }
  }
  return null;
}

// Row geometry for one combined-view screen at a given drawn panel size, honouring
// the CB5 half row: it is an EXTRA row below the full ones (data.panelsHigh excludes
// it) and is half their height. Mirrors what the renderers draw, so hit detection and
// the canvas can never disagree about where a row is.
function combinedRowGeometry(data, panelSize) {
  const panelType = (data && data.panelType) || 'CB5_MKII';
  const fullH = panelSize * getPanelHeightRatio(panelType);
  const halfH = panelSize; // half panels are square
  const hasHalf = !!(data && data.addCB5HalfRow) && panelType === 'CB5_MKII';
  const ph = (data && data.panelsHigh) || 0;
  return {
    hasHalf,
    effectivePh: hasHalf ? ph + 1 : ph,
    totalH: hasHalf ? (ph * fullH + halfH) : (ph * fullH),
    rowY: r => (hasHalf && r === ph) ? (ph * fullH) : (r * fullH),
    rowH: r => (hasHalf && r === ph) ? halfH : fullH,
    // Row index at a y offset from the top of the grid, or -1 when outside it.
    rowAt: dy => {
      if(dy < 0) return -1;
      const full = Math.floor(dy / fullH);
      if(full < ph) return full;
      if(hasHalf && dy < ph * fullH + halfH) return ph;
      return -1;
    }
  };
}

// Is a panel deleted on its screen? deletedPanels may be a Set, an array (from
// loaded JSON), or another iterable, so handle all three the way the renderer does.
function isCombinedPanelDeleted(data, panelKey) {
  const deleted = data && data.deletedPanels;
  if(!deleted) return false;
  if(deleted instanceof Set) return deleted.has(panelKey);
  if(Array.isArray(deleted)) return deleted.includes(panelKey);
  if(typeof deleted[Symbol.iterator] === 'function') {
    for(const key of deleted) {
      if(key === panelKey) return true;
    }
  }
  return false;
}

// Get all panels within a rectangle (for drag selection)
function getCombinedPanelsInRect(canvas, x1, y1, x2, y2) {
  const entries = combinedHitGeometry[canvas.id];
  if(!entries) return [];

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const canvasX1 = (Math.min(x1, x2) - rect.left) * scaleX;
  const canvasY1 = (Math.min(y1, y2) - rect.top) * scaleY;
  const canvasX2 = (Math.max(x1, x2) - rect.left) * scaleX;
  const canvasY2 = (Math.max(y1, y2) - rect.top) * scaleY;

  const panels = [];

  // Same published geometry the point hit-test uses, so a drag box and a click can
  // never disagree about where a panel is.
  for(const dim of entries) {
    const drawPanelSize = dim.panelWidth;
    const screenX = dim.screenX;
    const screenY = dim.screenY;

    const geo = dim.geo;
    for(let c = 0; c < dim.pw; c++) {
      for(let r = 0; r < geo.effectivePh; r++) {
        const px = screenX + c * drawPanelSize;
        const py = screenY + geo.rowY(r);
        const px2 = px + drawPanelSize;
        const py2 = py + geo.rowH(r);

        // Check if panel overlaps with selection rect
        if(px < canvasX2 && px2 > canvasX1 && py < canvasY2 && py2 > canvasY1) {
          panels.push({
            screenId: dim.screenId,
            screen: dim.screen,
            data: dim.data,
            col: c,
            row: r,
            key: `${c},${r}`
          });
        }
      }
    }
  }
  return panels;
}

// Toggle panel deletion in Combined view (syncs to Complex tab)
function toggleCombinedPanelDelete(screenId, panelKey) {
  const screen = screens[screenId];
  if(!screen || !screen.data) return;

  // Ensure deletedPanels is a Set
  if(!(screen.data.deletedPanels instanceof Set)) {
    if(Array.isArray(screen.data.deletedPanels)) {
      screen.data.deletedPanels = new Set(screen.data.deletedPanels);
    } else {
      screen.data.deletedPanels = new Set();
    }
  }

  // Toggle the panel
  if(screen.data.deletedPanels.has(panelKey)) {
    screen.data.deletedPanels.delete(panelKey);
  } else {
    screen.data.deletedPanels.add(panelKey);
  }

  // If this is the current screen, sync to global deletedPanels
  if(screenId === currentScreenId) {
    deletedPanels = new Set(screen.data.deletedPanels);
    // Recalculate for current screen
    calculate();
  }

  // Re-render combined view
  renderCombinedView();
}

// Show context menu for Combined view panel.
// layoutKind decides which options belong here: the power canvas offers only power
// options, the data canvas only data options, and neither offers panel deletion —
// those stay on the standard canvas where the whole panel grid is the subject.
function showCombinedPanelContextMenu(x, y, panelInfo, layoutKind) {
  // Remove existing menu if any
  const existingMenu = document.getElementById('combinedPanelContextMenu');
  if(existingMenu) existingMenu.remove();

  const kind = layoutKind || 'standard';
  const showPower = (kind === 'standard' || kind === 'power');
  const showData = (kind === 'standard' || kind === 'data');
  const showDelete = (kind === 'standard');

  const { screenId, screen, data, col, row, key } = panelInfo;

  // Get selected panel count (use multi-selection if available, otherwise single)
  const selectedCount = combinedSelectedPanels.size > 0 ? combinedSelectedPanels.size : 1;
  const panelLabel = selectedCount === 1 ? 'panel' : 'panels';

  // Check if panel is deleted (for single panel)
  let isDeleted = false;
  if(data.deletedPanels instanceof Set) {
    isDeleted = data.deletedPanels.has(key);
  } else if(Array.isArray(data.deletedPanels)) {
    isDeleted = data.deletedPanels.includes(key);
  }

  // Create context menu
  const menu = document.createElement('div');
  menu.id = 'combinedPanelContextMenu';
  menu.style.position = 'fixed';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.style.background = '#242424';
  menu.style.border = '2px solid ' + (screen.color || '#10b981');
  menu.style.borderRadius = '6px';
  menu.style.padding = '4px 0';
  menu.style.zIndex = '10000';
  menu.style.minWidth = '220px';
  menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.6)';

  // Header showing selection count
  const header = document.createElement('div');
  if(selectedCount === 1) {
    header.textContent = `${screen.name} - Panel ${col+1}.${row+1}`;
  } else {
    header.textContent = `${selectedCount} panels selected`;
  }
  header.style.padding = '8px 12px';
  header.style.color = screen.color || '#10b981';
  header.style.fontWeight = 'bold';
  header.style.fontSize = '13px';
  header.style.borderBottom = '1px solid #383838';
  menu.appendChild(header);

  // Helper to create menu option
  function createMenuOption(text, hoverColor, onClick) {
    const option = document.createElement('div');
    option.textContent = text;
    option.style.padding = '10px 12px';
    option.style.cursor = 'pointer';
    option.style.color = '#e0e0e0';
    option.style.fontSize = '13px';
    option.addEventListener('mouseover', function() {
      option.style.background = hoverColor;
    });
    option.addEventListener('mouseout', function() {
      option.style.background = 'transparent';
    });
    option.addEventListener('click', onClick);
    return option;
  }

  // Assign Custom Circuit # option (power)
  if(showPower) {
    const circuitOption = createMenuOption(
      `Assign Circuit # to ${selectedCount} ${panelLabel}`,
      '#2a4a6a',
      function() {
        menu.remove();
        promptAssignCombinedCircuit();
      }
    );
    menu.appendChild(circuitOption);

    // Assign SOCA # option — only when the selection sits inside ONE screen and spans 2+
    // columns and 2+ rows, matching the Complex-view gate in interact/standard-canvas.js.
    const socaSel = combinedSelectionForSoca(screenId, key);
    if(socaSel) {
      const socaOption = createMenuOption(
        `Assign SOCA # to ${socaSel.keys.length} ${socaSel.keys.length === 1 ? 'panel' : 'panels'}`,
        '#2a4a6a',
        function() {
          menu.remove();
          promptAssignCombinedSoca(socaSel.screenId, socaSel.keys);
        }
      );
      menu.appendChild(socaOption);
    }
  }

  // Assign Custom Data Line # option (data)
  if(showData) {
    const dataOption = createMenuOption(
      `Assign Data Line # to ${selectedCount} ${panelLabel}`,
      '#4a2a6a',
      function() {
        menu.remove();
        promptAssignCombinedDataLine();
      }
    );
    menu.appendChild(dataOption);
  }

  // Delete/Restore option
  if(showDelete) {
    const toggleOption = createMenuOption(
      selectedCount > 1 ? `Delete ${selectedCount} ${panelLabel}` : (isDeleted ? 'Restore Panel' : 'Delete Panel'),
      isDeleted ? '#2a6a2a' : '#6a2a2a',
      function() {
        if(combinedSelectedPanels.size > 0) {
          combinedSelectedPanels.forEach(pkey => {
            const [sid, pk] = pkey.split(':');
            toggleCombinedPanelDelete(sid, pk);
          });
          combinedSelectedPanels.clear();
        } else {
          toggleCombinedPanelDelete(screenId, key);
        }
        menu.remove();
      }
    );
    toggleOption.style.borderTop = '1px solid #383838';
    menu.appendChild(toggleOption);
  }

  // Go to screen option (only for single selection)
  if(selectedCount === 1) {
    const goToOption = createMenuOption(
      `Edit in ${screen.name} tab`,
      '#0a66c2',
      function() {
        menu.remove();
        switchToScreen(screenId);
        switchMobileView('complex');
      }
    );
    goToOption.style.borderTop = '1px solid #383838';
    menu.appendChild(goToOption);
  }

  document.body.appendChild(menu);

  // Adjust position if menu goes off screen
  const menuRect = menu.getBoundingClientRect();
  if(menuRect.right > window.innerWidth) {
    menu.style.left = (window.innerWidth - menuRect.width - 10) + 'px';
  }
  if(menuRect.bottom > window.innerHeight) {
    menu.style.top = (window.innerHeight - menuRect.height - 10) + 'px';
  }

  // Close menu on click outside
  function closeMenu(e) {
    if(!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('touchstart', closeMenu);
    }
  }
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
    document.addEventListener('touchstart', closeMenu);
  }, 100);
}

// Prompt for a custom SOCA # and/or circuit # and assign them to the selected panels.
// Mirrors showCircuitNumberPrompt() in interact/standard-canvas.js — the same dual-field
// modal, the same validation, and the same rule that a blank field CLEARS that assignment —
// but writes into each screen's data, since a combined selection can span screens.
async function promptAssignCombinedCircuit() {
  // Get panels to assign (use multi-selection or single selected panel)
  const panelsToAssign = [];
  if(combinedSelectedPanels.size > 0) {
    combinedSelectedPanels.forEach(pkey => {
      const [screenId, panelKey] = pkey.split(':');
      panelsToAssign.push({ screenId, panelKey });
    });
  } else if(combinedSelectedPanel) {
    panelsToAssign.push({
      screenId: combinedSelectedPanel.screenId,
      panelKey: combinedSelectedPanel.key
    });
  }

  if(panelsToAssign.length === 0) return;

  const result = await showSocaCircuitPrompt(panelsToAssign.length);
  if(result === null) return; // Cancelled

  const socaRaw = (result.soca || '').trim();
  const circRaw = (result.circuit || '').trim();

  let socaNum = null;
  if(socaRaw !== '') {
    socaNum = parseSocaInput(socaRaw);
    if(socaNum === null) {
      showAlert('Please enter a valid SOCA (1-99 or A-Z)');
      return;
    }
  }

  let circNum = null;
  if(circRaw !== '') {
    circNum = parseInt(circRaw);
    if(isNaN(circNum) || circNum < 1 || circNum > 999) {
      showAlert('Please enter a valid circuit number between 1 and 999');
      return;
    }
  }

  // Group panels by screen for efficient updates
  const panelsByScreen = {};
  panelsToAssign.forEach(p => {
    if(!panelsByScreen[p.screenId]) panelsByScreen[p.screenId] = [];
    panelsByScreen[p.screenId].push(p.panelKey);
  });

  // One circuit can only hold so many panels. The limit is per screen (each has its own
  // voltage/breaker/panel type), so check every screen the selection touches before
  // writing anything — a partial assignment would be worse than none.
  if(circNum !== null) {
    for(const screenId of Object.keys(panelsByScreen)) {
      const screen = screens[screenId];
      if(!screen || !screen.data) continue;
      const inp = (typeof resolveScreenPowerInputs === 'function') ? resolveScreenPowerInputs(screen.data) : null;
      if(!inp) continue;
      const liveCount = panelsByScreen[screenId].filter(k => !inp.deletedPanels.has(k)).length;
      if(liveCount > inp.panelsPerCircuit) {
        showAlert(
          `${screen.name} has ${liveCount} panels selected but its max per circuit is ${inp.panelsPerCircuit}. ` +
          `Reduce the selection or raise panels-per-circuit.`
        );
        return;
      }
    }
  }

  // Apply to each screen's data
  Object.keys(panelsByScreen).forEach(screenId => {
    const screen = screens[screenId];
    if(!screen || !screen.data) return;

    const socaMap = toCombinedSocaMap(screen.data.customSocaAssignments);
    const circuitMap = toCombinedSocaMap(screen.data.customCircuitAssignments);

    // Update each panel — a blank field clears that override
    panelsByScreen[screenId].forEach(panelKey => {
      if(socaNum === null) socaMap.delete(panelKey);
      else socaMap.set(panelKey, socaNum);

      if(circNum === null) circuitMap.delete(panelKey);
      else circuitMap.set(panelKey, circNum);
    });

    screen.data.customSocaAssignments = socaMap;
    screen.data.customCircuitAssignments = circuitMap;

    // If this is the current screen, sync to the globals
    if(screenId === currentScreenId) {
      customSocaAssignments = new Map(socaMap);
      customCircuitAssignments = new Map(circuitMap);
    }
  });

  // Always recalculate — the current screen caches the shared-distro label map in its
  // calculatedData, and changing any group member's SOCAs invalidates it.
  if(typeof calculate === 'function') calculate();

  // Clear selection and re-render
  combinedSelectedPanels.clear();
  combinedSelectedPanel = null;
  syncCombinedSelectedPanel();
  renderCombinedView();
}

// Prompt user for custom data line number and assign to selected panels
async function promptAssignCombinedDataLine() {
  // Get panels to assign (use multi-selection or single selected panel)
  const panelsToAssign = [];
  if(combinedSelectedPanels.size > 0) {
    combinedSelectedPanels.forEach(pkey => {
      const [screenId, panelKey] = pkey.split(':');
      panelsToAssign.push({ screenId, panelKey });
    });
  } else if(combinedSelectedPanel) {
    panelsToAssign.push({
      screenId: combinedSelectedPanel.screenId,
      panelKey: combinedSelectedPanel.key
    });
  }

  if(panelsToAssign.length === 0) return;

  const input = await showPrompt(`Enter data line number for ${panelsToAssign.length} panel(s):\n(Enter 0 or leave blank to clear custom assignment)`);
  if(input === null) return; // Cancelled

  const dataLineNum = parseInt(input);
  const clearAssignment = input.trim() === '' || dataLineNum === 0;

  // Group panels by screen for efficient updates
  const panelsByScreen = {};
  panelsToAssign.forEach(p => {
    if(!panelsByScreen[p.screenId]) panelsByScreen[p.screenId] = [];
    panelsByScreen[p.screenId].push(p.panelKey);
  });

  // Apply to each screen's data
  Object.keys(panelsByScreen).forEach(screenId => {
    const screen = screens[screenId];
    if(!screen || !screen.data) return;

    // Ensure customDataLineAssignments is a Map
    if(!(screen.data.customDataLineAssignments instanceof Map)) {
      if(Array.isArray(screen.data.customDataLineAssignments)) {
        screen.data.customDataLineAssignments = new Map(screen.data.customDataLineAssignments);
      } else {
        screen.data.customDataLineAssignments = new Map();
      }
    }

    // Update each panel
    panelsByScreen[screenId].forEach(panelKey => {
      if(clearAssignment) {
        screen.data.customDataLineAssignments.delete(panelKey);
      } else {
        screen.data.customDataLineAssignments.set(panelKey, dataLineNum);
      }
    });

    // If this is the current screen, sync to global variable
    if(screenId === currentScreenId) {
      customDataLineAssignments = new Map(screen.data.customDataLineAssignments);
      calculate(); // Recalculate layouts
    }
  });

  // Clear selection and re-render
  combinedSelectedPanels.clear();
  combinedSelectedPanel = null;
  syncCombinedSelectedPanel();
  renderCombinedView();
}

// ==================== COMBINED "ASSIGN SOCA #" (PER PANEL) ====================

// The current combined selection, but only when it can take a SOCA assignment: every panel
// must belong to ONE screen and the block must span 2+ columns and 2+ rows — the same gate
// showContextMenu() applies in interact/standard-canvas.js. Returns { screenId, keys } or null.
function combinedSelectionForSoca(fallbackScreenId, fallbackKey) {
  let screenId = null;
  const keys = [];

  if(combinedSelectedPanels.size > 0) {
    for(const pkey of combinedSelectedPanels) {
      const [sid, pk] = pkey.split(':');
      if(screenId === null) screenId = sid;
      else if(sid !== screenId) return null; // spans more than one screen
      keys.push(pk);
    }
  } else if(fallbackScreenId && fallbackKey) {
    screenId = fallbackScreenId;
    keys.push(fallbackKey);
  }

  if(!screenId || keys.length === 0) return null;

  const cols = new Set(), rows = new Set();
  keys.forEach(k => {
    const [c, r] = k.split(',').map(Number);
    cols.add(c); rows.add(r);
  });
  if(cols.size < 2 || rows.size < 2) return null;

  return { screenId, keys };
}

// customSocaAssignments / customCircuitAssignments may be a Map or an array of entries
// (from loaded JSON) — normalise to a Map we can write into.
function toCombinedSocaMap(value) {
  if(value instanceof Map) return new Map(value);
  if(Array.isArray(value)) return new Map(value.filter(e => Array.isArray(e) && e.length === 2));
  return new Map();
}

// Assign a SOCA # to a block of panels in one screen. Mirrors showAssignSocaPrompt() in
// interact/standard-canvas.js — same column-bundling into circuits and the same two guards —
// but writes into screens[screenId].data instead of the current screen's globals.
async function promptAssignCombinedSoca(screenId, keys) {
  const screen = screens[screenId];
  if(!screen || !screen.data || !keys || keys.length === 0) return;

  const inp = (typeof resolveScreenPowerInputs === 'function') ? resolveScreenPowerInputs(screen.data) : null;
  if(!inp) return;

  const result = await showSocaOnlyPrompt(keys.length);
  if(result === null || result === undefined) return;

  const socaNum = parseSocaInput(result);
  if(socaNum === null) {
    showAlert('Please enter a valid SOCA (1-99 or A-Z)');
    return;
  }

  const ppc = inp.panelsPerCircuit;

  // Group the selected panels by column
  const byCol = new Map();
  keys.forEach(k => {
    if(inp.deletedPanels.has(k)) return;
    const c = parseInt(k.split(',')[0]);
    if(!byCol.has(c)) byCol.set(c, []);
    byCol.get(c).push(k);
  });
  const sortedCols = [...byCol.keys()].sort((a, b) => a - b);
  if(sortedCols.length === 0) return;

  let maxColCount = 0, worstCol = sortedCols[0];
  sortedCols.forEach(c => {
    const n = byCol.get(c).length;
    if(n > maxColCount) { maxColCount = n; worstCol = c; }
  });
  if(maxColCount > ppc) {
    showAlert(
      `Column ${worstCol + 1} has ${maxColCount} selected panels, but the max per circuit is ${ppc}. ` +
      `Raise panels-per-circuit or reduce the selection.`
    );
    return;
  }

  // Bundle whole columns into circuits: as many equal-height columns as fit within
  // one circuit's panel budget. A SOCA holds 6 circuits.
  const colsPerCircuit = Math.max(1, Math.floor(ppc / maxColCount));
  const circuitsNeeded = Math.ceil(sortedCols.length / colsPerCircuit);
  if(circuitsNeeded > 6) {
    showAlert(
      `This selection needs ${circuitsNeeded} circuits, but a SOCA holds only 6. ` +
      `Reduce the selection or raise panels-per-circuit.`
    );
    return;
  }

  const socaMap = toCombinedSocaMap(screen.data.customSocaAssignments);
  const circuitMap = toCombinedSocaMap(screen.data.customCircuitAssignments);
  const baseCircuit = (socaNum - 1) * 6 + 1;

  sortedCols.forEach((c, colIdx) => {
    const circuit = baseCircuit + Math.floor(colIdx / colsPerCircuit);
    byCol.get(c).forEach(key => {
      socaMap.set(key, socaNum);
      circuitMap.set(key, circuit);
    });
  });

  screen.data.customSocaAssignments = socaMap;
  screen.data.customCircuitAssignments = circuitMap;

  if(screenId === currentScreenId) {
    customSocaAssignments = new Map(socaMap);
    customCircuitAssignments = new Map(circuitMap);
  }

  // Always recalculate, even when another screen was edited: the CURRENT screen caches the
  // shared-distro label map in its calculatedData, and sharedDistroSocaLabelMap() prefers that
  // cache over the live plan. Changing any group member's SOCAs invalidates it, so skipping
  // this leaves the current screen labelled from a stale plan while every other screen uses
  // the fresh one — which shows up as two screens sharing a SOCA label.
  if(typeof calculate === 'function') calculate();

  combinedSelectedPanels.clear();
  combinedSelectedPanel = null;
  syncCombinedSelectedPanel();
  renderCombinedView();
}

// Setup Combined canvas touch/click handlers.
// The standard canvas additionally supports screen dragging (Manual Adjust) and
// double-click delete; the power and data canvases are selection-only, and their context
// menus offer just the options that belong to that layout.
function setupCombinedCanvasHandlers() {
  bindCombinedDocumentSelectionHandlers();
  COMBINED_SELECTABLE_CANVASES.forEach(({ id, layoutKind }) => {
    setupCombinedCanvasHandlersFor(id, layoutKind);
  });
}

// mousemove/mouseup live on `document` so a drag that leaves the canvas keeps working.
// They are shared by all three canvases, so they must be registered exactly once —
// combinedMarqueeCanvasId says which canvas the active drag belongs to.
function bindCombinedDocumentSelectionHandlers() {
  if(combinedDocHandlersBound) return;
  combinedDocHandlersBound = true;

  document.addEventListener('mousemove', function(e) {
    if(!combinedIsMouseSelecting) return;

    combinedMarqueeX2 = e.clientX;
    combinedMarqueeY2 = e.clientY;

    const dx = Math.abs(e.clientX - combinedMouseSelectStart.x);
    const dy = Math.abs(e.clientY - combinedMouseSelectStart.y);

    // Only start the box once dragged past the click threshold
    if(!combinedMarqueeMoved && dx <= 4 && dy <= 4) return;

    combinedMarqueeMoved = true;
    applyCombinedMarqueeSelection(e.ctrlKey || e.metaKey || e.shiftKey);
  });

  document.addEventListener('mouseup', function(e) {
    if(combinedDragState.isDragging) {
      combinedDragState.isDragging = false;
      combinedDragState.screenDim = null;
      const dragCanvas = document.getElementById('combinedStandardCanvas');
      if(dragCanvas) dragCanvas.style.cursor = '';
      saveCombinedPositions();
    }

    if(combinedIsMouseSelecting && !combinedMarqueeMoved) {
      // No drag - treat as a plain click on the panel under the cursor
      useCombinedSelection(combinedMarqueeCanvasId);
      const canvas = document.getElementById(combinedMarqueeCanvasId);
      const panel = canvas ? getCombinedPanelAtPosition(canvas, e.clientX, e.clientY) : null;
      if(panel) {
        const panelKey = `${panel.screenId}:${panel.key}`;
        const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
        const wasSelected = combinedSelectedPanels.has(panelKey);

        if(!isMultiSelect) {
          combinedSelectedPanels.clear();
        }
        if(wasSelected) {
          combinedSelectedPanels.delete(panelKey);
        } else {
          combinedSelectedPanels.add(panelKey);
        }
      } else if(!(e.ctrlKey || e.metaKey || e.shiftKey)) {
        // Clicking empty canvas space clears the selection
        combinedSelectedPanels.clear();
      }
      combinedSelectedPanel = null;
      syncCombinedSelectedPanel();
    }

    const wasSelecting = combinedIsMouseSelecting;
    combinedIsMouseSelecting = false;
    endCombinedMarquee();
    if(wasSelecting) renderCombinedView(); // final render without the box
  });
}

function setupCombinedCanvasHandlersFor(canvasId, layoutKind) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;

  // Prevent duplicate handlers (the flag lives on the element, so it is already per-canvas)
  if(canvas.dataset.combinedHandlersSet) return;
  canvas.dataset.combinedHandlersSet = 'true';

  // Screen dragging and delete are standard-canvas only: the power/data canvases lay
  // screens out in a fixed row and offer no delete options.
  const allowScreenDrag = (layoutKind === 'standard');
  const allowDelete = (layoutKind === 'standard');

  // Touch state (per canvas)
  let touchStartPos = { x: 0, y: 0 };
  let touchLastPos = { x: 0, y: 0 };
  let touchStartPanel = null;
  let touchDragPending = false;

  // ===== MOUSE HANDLERS (Desktop) =====

  // Mouse down - start drag (if Manual Adjust) or start panel selection
  canvas.addEventListener('mousedown', function(e) {
    if(e.button !== 0) return; // Only left click

    if(allowScreenDrag && combinedManualAdjust) {
      // Manual Adjust mode: drag screens
      const screenDim = getCombinedScreenAtPosition(canvas, e.clientX, e.clientY);
      if(screenDim) {
        combinedDragState.isDragging = true;
        combinedDragState.screenDim = screenDim;
        combinedDragState.startX = e.clientX;
        combinedDragState.startY = e.clientY;
        combinedDragState.startPosX = combinedScreenPositions[screenDim.screenId]?.x || 0;
        combinedDragState.startPosY = combinedScreenPositions[screenDim.screenId]?.y || 0;
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    } else if(!combinedManualAdjust) {
      // Panel selection mode: anchor the drag box. The selection is not touched
      // until the mouse moves (marquee) or is released without moving (click).
      // Ignore the mousedown a touch device synthesizes after a tap
      if(Date.now() - combinedLastTouch < 700) return;

      e.preventDefault(); // suppress native drag/text selection while dragging the box

      useCombinedSelection(canvasId);
      combinedMarqueeCanvasId = canvasId;
      combinedMouseSelectStart.x = e.clientX;
      combinedMouseSelectStart.y = e.clientY;
      combinedIsMouseSelecting = true;

      combinedMarqueeActive = true;
      combinedMarqueeMoved = false;
      combinedMarqueeX1 = combinedMarqueeX2 = e.clientX;
      combinedMarqueeY1 = combinedMarqueeY2 = e.clientY;
      combinedMarqueeBase = new Set(combinedSelectedPanels);
    }
  });

  // Mouse move - drag screen (standard canvas only; the box is handled on document)
  if(allowScreenDrag) {
    canvas.addEventListener('mousemove', function(e) {
      if(!combinedDragState.isDragging) return;

      const dx = e.clientX - combinedDragState.startX;
      const dy = e.clientY - combinedDragState.startY;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const screenId = combinedDragState.screenDim.screenId;
      if(!combinedScreenPositions[screenId]) {
        combinedScreenPositions[screenId] = { x: 0, y: 0 };
      }
      // Store positions in unzoomed units so they work correctly at any zoom level
      // The drag movement is in screen pixels, convert to canvas pixels, then to unzoomed units
      const zoomFactor = combinedZoomLevel / 100;
      combinedScreenPositions[screenId].x = combinedDragState.startPosX + (dx * scaleX) / zoomFactor;
      combinedScreenPositions[screenId].y = combinedDragState.startPosY + (dy * scaleY) / zoomFactor;

      renderCombinedView();
    });
  }

  // Right-click - context menu for panel (desktop)
  canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    if(combinedManualAdjust) return; // No panel menu in adjust mode

    useCombinedSelection(canvasId);
    const panelInfo = getCombinedPanelAtPosition(canvas, e.clientX, e.clientY);
    if(panelInfo) {
      // If clicked panel is not in selection, clear and select only it
      const panelKey = `${panelInfo.screenId}:${panelInfo.key}`;
      if(!combinedSelectedPanels.has(panelKey)) {
        combinedSelectedPanels.clear();
        combinedSelectedPanels.add(panelKey);
      }
      combinedSelectedPanel = panelInfo;
      syncCombinedSelectedPanel();
      renderCombinedView(); // Show highlight
      showCombinedPanelContextMenu(e.clientX, e.clientY, panelInfo, layoutKind);
    }
  });

  // Double-click to quick toggle delete (desktop, standard canvas only)
  if(allowDelete) {
    canvas.addEventListener('dblclick', function(e) {
      if(combinedManualAdjust) return; // No panel actions in adjust mode

      useCombinedSelection(canvasId);
      // Delete all selected panels
      if(combinedSelectedPanels.size > 0) {
        combinedSelectedPanels.forEach(key => {
          const [screenId, panelKey] = key.split(':');
          toggleCombinedPanelDelete(screenId, panelKey);
        });
        combinedSelectedPanels.clear();
      } else {
        const panelInfo = getCombinedPanelAtPosition(canvas, e.clientX, e.clientY);
        if(panelInfo) {
          toggleCombinedPanelDelete(panelInfo.screenId, panelInfo.key);
        }
      }
    });
  }

  // ===== TOUCH HANDLERS (Mobile) =====

  canvas.addEventListener('touchstart', function(e) {
    combinedLastTouch = Date.now();
    if(e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStartPos.x = touch.clientX;
    touchStartPos.y = touch.clientY;
    touchLastPos.x = touch.clientX;
    touchLastPos.y = touch.clientY;

    if(allowScreenDrag && combinedManualAdjust) {
      // Manual Adjust mode: immediate drag like Canvas view
      const screenDim = getCombinedScreenAtPosition(canvas, touch.clientX, touch.clientY);
      if(screenDim) {
        combinedDragState.isDragging = true;
        combinedDragState.screenDim = screenDim;
        combinedDragState.startX = touch.clientX;
        combinedDragState.startY = touch.clientY;
        combinedDragState.startPosX = combinedScreenPositions[screenDim.screenId]?.x || 0;
        combinedDragState.startPosY = combinedScreenPositions[screenDim.screenId]?.y || 0;
        e.preventDefault();
      }
    } else if(!combinedManualAdjust) {
      // Panel selection mode: track start panel for tap-to-select
      useCombinedSelection(canvasId);
      touchStartPanel = getCombinedPanelAtPosition(canvas, touch.clientX, touch.clientY);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', function(e) {
    if(e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchLastPos.x = touch.clientX;
    touchLastPos.y = touch.clientY;

    if(allowScreenDrag && combinedManualAdjust && combinedDragState.isDragging) {
      // Drag screen
      if(!touchDragPending) {
        touchDragPending = true;
        requestAnimationFrame(function() {
          touchDragPending = false;
          if(!combinedDragState.isDragging) return;

          const dx = touchLastPos.x - combinedDragState.startX;
          const dy = touchLastPos.y - combinedDragState.startY;

          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;

          const screenId = combinedDragState.screenDim.screenId;
          if(!combinedScreenPositions[screenId]) {
            combinedScreenPositions[screenId] = { x: 0, y: 0 };
          }
          combinedScreenPositions[screenId].x = combinedDragState.startPosX + (dx * scaleX);
          combinedScreenPositions[screenId].y = combinedDragState.startPosY + (dy * scaleY);

          renderCombinedView();
        });
      }
      e.preventDefault();
    } else if(combinedSelectMode && !combinedManualAdjust) {
      // Select Mode: drag a box to select panels instead of scrolling the canvas
      const dx = Math.abs(touch.clientX - touchStartPos.x);
      const dy = Math.abs(touch.clientY - touchStartPos.y);

      if(dx > 10 || dy > 10) {
        if(!combinedMarqueeActive) {
          useCombinedSelection(canvasId);
          combinedMarqueeCanvasId = canvasId;
          combinedMarqueeActive = true;
          combinedMarqueeMoved = true;
          combinedMarqueeX1 = touchStartPos.x;
          combinedMarqueeY1 = touchStartPos.y;
          combinedMarqueeBase = new Set(combinedSelectedPanels);
          vibrate(10); // Light haptic feedback
        }

        e.preventDefault();

        combinedMarqueeX2 = touch.clientX;
        combinedMarqueeY2 = touch.clientY;
        applyCombinedMarqueeSelection(false); // no modifier keys on touch — a drag always replaces
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', function(e) {
    combinedLastTouch = Date.now();

    // A drag box just finished - keep the selection, don't treat it as a tap
    if(combinedMarqueeActive) {
      endCombinedMarquee();
      touchStartPanel = null;
      renderCombinedView(); // final render without the box
      return;
    }

    if(allowScreenDrag && combinedManualAdjust) {
      // End screen drag
      if(combinedDragState.isDragging) {
        combinedDragState.isDragging = false;
        combinedDragState.screenDim = null;
        saveCombinedPositions();
      }
    } else if(!combinedManualAdjust) {
      // Panel selection mode: tap to select, tap again for menu
      useCombinedSelection(canvasId);
      const dx = Math.abs(touchLastPos.x - touchStartPos.x);
      const dy = Math.abs(touchLastPos.y - touchStartPos.y);

      // Only process as tap if didn't move much
      if(dx < 15 && dy < 15 && touchStartPanel) {
        const panelKey = `${touchStartPanel.screenId}-${touchStartPanel.key}`;
        const selectedKey = combinedSelectedPanel ? `${combinedSelectedPanel.screenId}-${combinedSelectedPanel.key}` : null;

        if(selectedKey === panelKey) {
          // Panel was already selected - show context menu
          vibrate(30);
          showCombinedPanelContextMenu(touchLastPos.x, touchLastPos.y, touchStartPanel, layoutKind);
        } else {
          // Select this panel (highlight it)
          combinedSelectedPanel = touchStartPanel;
          syncCombinedSelectedPanel();
          vibrate(10);
          renderCombinedView(); // Will highlight selected panel
        }
      }
    }

    touchStartPanel = null;
  });

  canvas.addEventListener('touchcancel', function(e) {
    const wasMarquee = combinedMarqueeActive;
    combinedDragState.isDragging = false;
    combinedDragState.screenDim = null;
    touchStartPanel = null;
    endCombinedMarquee();
    if(wasMarquee) renderCombinedView(); // final render without the box
  });
}

// Initialize combined view - create toggle buttons for each screen
function initCombinedView() {
  const togglesContainer = document.getElementById('combinedScreenToggles');
  if(!togglesContainer) return;

  // Show appropriate hints based on device type
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const desktopHints = document.getElementById('combinedHintsDesktop');
  const mobileHints = document.getElementById('combinedHintsMobile');
  if(desktopHints) desktopHints.style.display = isMobile ? 'none' : 'inline';
  if(mobileHints) mobileHints.style.display = isMobile ? 'inline' : 'none';

  // Select Mode toggle is touch-only — desktop drag-select already works with the mouse
  const selectModeRow = document.getElementById('combinedSelectModeRow');
  if(selectModeRow) selectModeRow.style.display = isMobile ? 'inline-flex' : 'none';

  // Clear existing toggles
  togglesContainer.innerHTML = '';

  // Create a toggle button for each screen (compact for mobile)
  Object.keys(screens).forEach(screenId => {
    const screen = screens[screenId];
    const btn = document.createElement('button');
    btn.className = 'slider-toggle-btn';
    btn.dataset.screenId = screenId;
    btn.style.cssText = 'padding: 6px 12px; min-height: 32px; font-size: 12px; border: 2px solid #000; border-radius: 0; box-shadow: 1px 1px 0px 0px rgba(0,0,0,1); white-space: nowrap; width: fit-content; flex-grow: 0; flex-shrink: 0;';

    // Set button color based on screen color
    if(combinedSelectedScreens.has(screenId)) {
      btn.classList.add('active');
      btn.style.background = screen.color || '#10b981';
      btn.style.color = '#fff';
      btn.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
    } else {
      btn.style.background = '#2a2a2a';
      btn.style.color = '#9ca3af';
      btn.style.textShadow = 'none';
    }

    btn.textContent = screen.name;
    btn.onclick = function() {
      toggleCombinedScreen(screenId);
    };

    togglesContainer.appendChild(btn);
  });

  // Power-layout toggle buttons
  updateCombinedPowerToggleButtons();

  // Update dist box availability based on selected screens' processor
  if (typeof updateCombinedDistBoxAvailability === 'function') {
    updateCombinedDistBoxAvailability();
  }

  // Render combined view if screens are selected
  if(combinedSelectedScreens.size > 0) {
    renderCombinedView();
  } else {
    showCombinedPlaceholder();
  }
}

// Clear the combined specs/gear/canvases and show the "No screens selected" placeholder.
// Called by initCombinedView when nothing is selected, and by renderCombinedView when the
// selected screens have no panels yet - renderCombinedView must never call initCombinedView
// back, or the two recurse until the stack overflows.
function showCombinedPlaceholder() {
  // Nothing is drawn any more — drop the published geometry so a stale map can't
  // keep answering hit tests for screens that are no longer on the canvas, and drop
  // the selections that pointed at those screens.
  combinedHitGeometry = {};
  clearAllCombinedSelections();

  const specsContent = document.getElementById('combinedSpecsContent');
  const gearContent = document.getElementById('combinedGearListContent');
  const specsToggles = document.getElementById('combinedSpecsToggles');
  if(specsToggles) specsToggles.style.display = 'none';
  if(specsContent) specsContent.innerHTML = '';
  if(gearContent) gearContent.innerHTML = '';

  // Clear canvases
  ['combinedStandardCanvas', 'combinedPowerCanvas', 'combinedDataCanvas', 'combinedStructureCanvas', 'combinedCableDiagramCanvas'].forEach(canvasId => {
    const canvas = document.getElementById(canvasId);
    if(canvas) {
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode) ? '#ffffff' : '#1a1a1a';
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = '#888';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No screens', 50, 45);
      ctx.fillText('selected', 50, 58);
    }
  });
}

// Toggle a screen in the combined view
function toggleCombinedScreen(screenId) {
  if(combinedSelectedScreens.has(screenId)) {
    combinedSelectedScreens.delete(screenId);
  } else {
    combinedSelectedScreens.add(screenId);
  }

  // Reset custom positions when toggling screens to keep layout neat
  // (unless in manual adjust mode where user is actively positioning)
  if(!combinedManualAdjust) {
    combinedScreenPositions = {};
    combinedMirrorCanvas = false;
    updateMirrorCanvasButton();
    saveCombinedPositions();
  }

  // Re-apply the active power toggles to the new selection: a screen toggled off leaves the
  // distro group / stops being balanced, and a screen toggled on joins.
  if(combinedShareDistroOn) applyCombinedScreenFlag('sharedDistro', true);
  if(combinedPhaseBalanceOn) applyCombinedScreenFlag('phaseBalance', true);
  if(combinedShareDistroOn || combinedPhaseBalanceOn) {
    syncComplexPowerToggles();
    if(typeof calculate === 'function') calculate();
  }

  // Re-initialize to update button states and render
  initCombinedView();
}

// Render the combined view with all selected screens side by side
function renderCombinedView() {
  if(combinedSelectedScreens.size === 0) return;

  // IMPORTANT: Save current screen data first so the combined view has up-to-date info
  // This ensures the current screen's customCircuitAssignments, deletedPanels, etc. are saved
  if(typeof saveCurrentScreenData === 'function') {
    saveCurrentScreenData();
  }

  const allPanels = getAllPanels();
  const selectedScreenIds = Array.from(combinedSelectedScreens);

  // Get available width from the container
  const container = document.getElementById('combinedStandardCanvasWrapper');
  const availableWidth = container ? container.clientWidth - 40 : window.innerWidth - 60; // Account for padding

  // First pass: calculate total panels wide to determine optimal panel size
  let totalPanelsWide = 0;
  let maxPanelsHigh = 0;
  const gapCount = Math.max(0, selectedScreenIds.length - 1);
  const minGap = 10; // Minimum gap between screens

  selectedScreenIds.forEach(screenId => {
    const screen = screens[screenId];
    if(!screen || !screen.data) return;
    const pw = screen.data.panelsWide || 0;
    const ph = screen.data.panelsHigh || 0;
    if(pw > 0 && ph > 0) {
      totalPanelsWide += pw;
      maxPanelsHigh = Math.max(maxPanelsHigh, ph);
    }
  });

  if(totalPanelsWide === 0) {
    showCombinedPlaceholder();
    return;
  }

  // Calculate panel size to fit all screens (with minimum size of 15px, max of 40px)
  const totalGapWidth = gapCount * minGap;
  const maxPanelSize = Math.floor((availableWidth - totalGapWidth) / totalPanelsWide);
  const panelSize = Math.max(15, Math.min(40, maxPanelSize));
  const gap = Math.max(minGap, Math.min(20, panelSize / 2)); // Scale gap with panel size

  // Calculate combined dimensions with dynamic panel size
  let totalWidth = 0;
  let maxHeight = 0;
  const screenDimensions = [];

  selectedScreenIds.forEach((screenId, index) => {
    const screen = screens[screenId];
    if(!screen || !screen.data) return;

    const data = screen.data;
    const pw = data.panelsWide || 0;
    const ph = data.panelsHigh || 0;

    if(pw > 0 && ph > 0) {
      const width = pw * panelSize;

      // Calculate actual height accounting for CB5 panel type (2:1 ratio) and half panel rows
      const screenPanelType = data.panelType || 'CB5_MKII';
      const heightRatio = getPanelHeightRatio(screenPanelType);
      const hasCB5HalfRow = data.addCB5HalfRow && screenPanelType === 'CB5_MKII';
      // The half row is an EXTRA row below the full ones — data.panelsHigh excludes it.
      const originalPh = ph;
      const fullPanelHeight = panelSize * heightRatio;
      const halfPanelHeight = panelSize; // Half panels are square
      const height = hasCB5HalfRow ? (originalPh * fullPanelHeight + halfPanelHeight) : (ph * fullPanelHeight);

      screenDimensions.push({
        screenId,
        screen,
        data,
        pw,
        ph,
        width,
        height,
        x: totalWidth + (index > 0 ? gap : 0)
      });

      totalWidth += width + (index > 0 ? gap : 0);
      maxHeight = Math.max(maxHeight, height);
    }
  });

  if(screenDimensions.length === 0) {
    showCombinedPlaceholder();
    return;
  }

  // Add padding for bumpers/structure (scale with panel size)
  const topPadding = Math.max(40, panelSize * 1.5);
  const bottomPadding = Math.max(40, panelSize * 1.5);
  const canvasHeight = maxHeight + topPadding + bottomPadding;
  const canvasWidth = totalWidth + 40; // Add side padding

  // Store dimensions globally for click handlers
  combinedScreenDimensions = screenDimensions;
  combinedPanelSize = panelSize * (combinedZoomLevel / 100); // Store zoomed size for hit detection
  combinedTopPadding = topPadding; // Don't scale padding - positions are not zoomed

  // Render each layout type
  renderCombinedStandardLayout(screenDimensions, canvasWidth, canvasHeight, panelSize, topPadding);
  renderCombinedPowerLayout(screenDimensions, canvasWidth, canvasHeight, panelSize, topPadding);
  renderCombinedDataLayout(screenDimensions, canvasWidth, canvasHeight, panelSize, topPadding);
  updateCombinedDataToggleButtons();
  renderCombinedStructureLayout(screenDimensions, canvasWidth, canvasHeight, panelSize, topPadding);

  // Combined cable diagram (uses screenDimensions for matching standard layout positions)
  if (typeof renderCombinedCableDiagram === 'function') {
    renderCombinedCableDiagram(selectedScreenIds, screenDimensions);
  }
  // Restore cabling input UI from saved config
  if (typeof restoreCombinedCablingInputs === 'function') {
    restoreCombinedCablingInputs();
  }

  // Render combined specs and gear list
  renderCombinedSpecs(selectedScreenIds);
  renderCombinedGearList(selectedScreenIds);
  renderCombinedPhaseBalance(selectedScreenIds);
}

// Render combined standard layout
function renderCombinedStandardLayout(screenDimensions, canvasWidth, canvasHeight, panelSize, topPadding) {
  const canvas = document.getElementById('combinedStandardCanvas');
  if(!canvas) return;

  // Get panel pixel dimensions to calculate scale factor from canvas view to combined view
  const allPanels = getAllPanels();

  // When mirroring, calculate a pixel scale that makes panels the same size as non-mirrored mode
  // We use a single scale factor: zoomedPanelSize / referencePixelWidth
  // This way, at 100% zoom, mirrored panels are the same size as non-mirrored panels
  const zoomedPanelSize = panelSize * (combinedZoomLevel / 100);
  const referencePixelWidth = 176; // CB5 pixel width as reference
  let pixelScale = zoomedPanelSize / referencePixelWidth;
  if(pixelScale < 0.05) pixelScale = 0.05;

  // Store globally for hit detection functions
  combinedPixelScale = pixelScale;

  // Calculate canvas size with positions (use canvas positions only when mirroring is enabled)
  // Start with no assumptions - calculate actual bounds from screen positions
  let minX = Infinity, maxX = 0, minY = Infinity, maxY = 0;
  const zoomFactor = combinedZoomLevel / 100;
  const leftPad = 20; // Use different name to avoid conflict with leftPadding below

  screenDimensions.forEach(dim => {
    let scaledX, scaledY, screenWidth, screenHeight;

    if(combinedMirrorCanvas) {
      // Use canvas positions - convert from pixel coordinates to panel-based layout
      const canvasX = dim.data.canvasX || 0;
      const canvasY = dim.data.canvasY || 0;
      const panelType = dim.data.panelType || 'CB5_MKII';
      const panelInfo = allPanels[panelType];
      const pixelWidth = panelInfo ? panelInfo.res_x : 176;
      scaledX = (canvasX / pixelWidth) * zoomedPanelSize;
      scaledY = (canvasY / pixelWidth) * zoomedPanelSize;
      screenWidth = dim.pw * zoomedPanelSize;
      screenHeight = dim.ph * zoomedPanelSize;
    } else {
      // Use custom positions or default horizontal layout
      // Scale both base position and custom offset by zoom factor
      const customPos = combinedScreenPositions[dim.screenId] || { x: 0, y: 0 };
      scaledX = (dim.x + customPos.x) * zoomFactor;
      scaledY = customPos.y * zoomFactor;
      screenWidth = dim.pw * zoomedPanelSize;
      screenHeight = dim.ph * zoomedPanelSize;
    }

    // Calculate actual screen bounds on canvas
    const screenLeft = leftPad + scaledX;
    const screenRight = screenLeft + screenWidth;
    const screenTop = topPadding + scaledY - 30; // Include label area
    const screenBottom = topPadding + scaledY + screenHeight;

    minX = Math.min(minX, screenLeft);
    maxX = Math.max(maxX, screenRight);
    minY = Math.min(minY, screenTop);
    maxY = Math.max(maxY, screenBottom);
  });

  // Add padding around all content
  const paddingX = 40;
  const paddingY = 60;

  // Canvas must be large enough to show all screens with padding
  // Handle case where screens might have negative positions
  const contentWidth = maxX - Math.min(0, minX) + paddingX;
  const contentHeight = maxY - Math.min(0, minY) + paddingY;

  const adjustedWidth = Math.max(canvasWidth * zoomFactor, contentWidth);
  const adjustedHeight = Math.max(canvasHeight * zoomFactor, contentHeight);

  canvas.width = adjustedWidth;
  canvas.height = adjustedHeight;
  const ctx = canvas.getContext('2d');

  // Background — white in eco/greyscale print mode, black in normal mode
  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode) ? '#ffffff' : '#000';
  ctx.fillRect(0, 0, adjustedWidth, adjustedHeight);

  const leftPadding = 20;

  const hitEntries = [];

  screenDimensions.forEach(dim => {
    const { screen, data, pw, ph, x, screenId } = dim;

    let screenX, screenY, actualPanelSize;
    if(combinedMirrorCanvas) {
      // Use canvas positions with pixel scale for positioning only
      const canvasX = data.canvasX || 0;
      const canvasY = data.canvasY || 0;
      // Get this screen's panel pixel width to properly scale its position
      const panelType = data.panelType || 'CB5_MKII';
      const panelInfo = allPanels[panelType];
      const pixelWidth = panelInfo ? panelInfo.res_x : 176;
      // Convert pixel position to panel units, then to display pixels
      screenX = leftPadding + (canvasX / pixelWidth) * zoomedPanelSize;
      screenY = topPadding + (canvasY / pixelWidth) * zoomedPanelSize;
      // Use same panel size as non-mirrored mode for consistent appearance
      actualPanelSize = zoomedPanelSize;
    } else {
      // Use custom positions or default horizontal layout
      // Scale both base position and custom offset by zoom factor
      const zoomFactor = combinedZoomLevel / 100;
      const customPos = combinedScreenPositions[screenId] || { x: 0, y: 0 };
      screenX = leftPadding + (x + customPos.x) * zoomFactor;
      screenY = topPadding + customPos.y * zoomFactor;
      actualPanelSize = zoomedPanelSize;
    }

    // Publish what this screen was drawn at, for hit detection + the selection overlay
    hitEntries.push({
      screenId, screen, data, pw,
      screenX, screenY,
      panelWidth: actualPanelSize,
      geo: combinedRowGeometry(data, actualPanelSize)
    });

    // Get screen colors for checkerboard pattern (same as original)
    let primaryColor = screen.color || '#808080';
    let secondaryColor = screen.color2 || darkenColor(primaryColor, 30);
    // Convert to pastel for eco-friendly printing
    if (ecoPrintMode) {
      primaryColor = toPastelColor(primaryColor);
      secondaryColor = toPastelColor(secondaryColor);
    }
    // Convert to greyscale for greyscale printing
    if (greyscalePrintMode) {
      primaryColor = toGreyscale(primaryColor);
      secondaryColor = toGreyscale(secondaryColor);
    }

    // Properly convert deletedPanels to Set (may be array from JSON or Set with Array iterator)
    let screenDeletedPanels = new Set();
    if(data.deletedPanels instanceof Set) {
      data.deletedPanels.forEach(key => screenDeletedPanels.add(key));
    } else if(Array.isArray(data.deletedPanels)) {
      data.deletedPanels.forEach(key => screenDeletedPanels.add(key));
    } else if(data.deletedPanels && typeof data.deletedPanels[Symbol.iterator] === 'function') {
      for(const key of data.deletedPanels) {
        screenDeletedPanels.add(key);
      }
    }

    // Draw panels with checkerboard pattern (same as original)
    // Use actualPanelSize for mirroring mode, zoomedPanelSize for normal mode
    const drawPanelSize = combinedMirrorCanvas ? actualPanelSize : zoomedPanelSize;

    // Calculate panel height for CB5_MKII (rectangular) vs other panels (square)
    const screenPanelType = data.panelType || 'CB5_MKII';
    const screenHeightRatio = getPanelHeightRatio(screenPanelType);
    const drawPanelWidth = drawPanelSize;
    const drawPanelHeight = drawPanelSize * screenHeightRatio;

    // Check if this screen has half panel row enabled. The half row is an EXTRA row
    // below the full ones, so the grid is one taller than data.panelsHigh.
    const screenHasCB5HalfRow = data.addCB5HalfRow && screenPanelType === 'CB5_MKII';
    const screenOriginalPh = ph;                                  // full-height rows
    const screenEffectivePh = screenHasCB5HalfRow ? ph + 1 : ph;  // incl. the half row
    const halfPanelDrawHeight = drawPanelSize; // Half panels are square

    for(let c = 0; c < pw; c++) {
      for(let r = 0; r < screenEffectivePh; r++) {
        const panelKey = `${c},${r}`;

        // Determine if this row is the half panel row
        const isHalfPanelRow = screenHasCB5HalfRow && r === screenOriginalPh;
        const currentDrawHeight = isHalfPanelRow ? halfPanelDrawHeight : drawPanelHeight;
        const px = screenX + c * drawPanelWidth;
        const py = screenY + (isHalfPanelRow ? (screenOriginalPh * drawPanelHeight) : (r * drawPanelHeight));

        const hasDeleted = screenDeletedPanels.has(panelKey);
        if(hasDeleted) {
          continue;
        }

        // Checkerboard pattern (same as original)
        const isEvenPanel = (c + r) % 2 === 0;
        ctx.fillStyle = isEvenPanel ? primaryColor : secondaryColor;
        ctx.fillRect(px, py, drawPanelWidth, currentDrawHeight);

        // Black border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, drawPanelWidth, currentDrawHeight);

        // Black panel number (scale font with panel size)
        ctx.fillStyle = '#000000';
        const panelFontSize = Math.max(6, Math.min(11, drawPanelSize * 0.28));
        ctx.font = `${panelFontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Only show panel numbers if panels are large enough
        if(drawPanelSize >= 15) {
          ctx.fillText(`${c+1}.${r+1}`, px + drawPanelWidth/2, py + currentDrawHeight/2);
        }
      }
    }

    // Calculate total screen height for label positioning
    const screenTotalHeight = screenHasCB5HalfRow ? (screenOriginalPh * drawPanelHeight + halfPanelDrawHeight) : (ph * drawPanelHeight);

    // Draw screen label centered over the screen's live panels (overlay style,
    // like the Canvas view) so it stays with the screen when screens overlap.
    if(screen.name) {
      let sumX = 0, sumY = 0, liveCount = 0;
      for(let c = 0; c < pw; c++) {
        for(let r = 0; r < screenEffectivePh; r++) {
          if(screenDeletedPanels.has(`${c},${r}`)) continue;
          const isHalfRow = screenHasCB5HalfRow && r === screenOriginalPh;
          const cellH = isHalfRow ? halfPanelDrawHeight : drawPanelHeight;
          const cellY = screenY + (isHalfRow ? (screenOriginalPh * drawPanelHeight) : (r * drawPanelHeight));
          sumX += screenX + c * drawPanelWidth + drawPanelWidth / 2;
          sumY += cellY + cellH / 2;
          liveCount++;
        }
      }
      if(liveCount > 0) {
        let labelX = sumX / liveCount;
        let labelY = sumY / liveCount;

        // If the centroid lands on a deleted (blank) cell, snap to the nearest
        // live panel center so the label never floats in an empty gap.
        const cCol = Math.floor((labelX - screenX) / drawPanelWidth);
        const cRow = Math.floor((labelY - screenY) / drawPanelHeight);
        if(screenDeletedPanels.has(`${cCol},${cRow}`)) {
          let bestDist = Infinity;
          for(let c = 0; c < pw; c++) {
            for(let r = 0; r < screenEffectivePh; r++) {
              if(screenDeletedPanels.has(`${c},${r}`)) continue;
              const isHalfRow = screenHasCB5HalfRow && r === screenOriginalPh;
              const cellH = isHalfRow ? halfPanelDrawHeight : drawPanelHeight;
              const cellY = screenY + (isHalfRow ? (screenOriginalPh * drawPanelHeight) : (r * drawPanelHeight));
              const pcx = screenX + c * drawPanelWidth + drawPanelWidth / 2;
              const pcy = cellY + cellH / 2;
              const d = (pcx - labelX) * (pcx - labelX) + (pcy - labelY) * (pcy - labelY);
              if(d < bestDist) { bestDist = d; labelX = pcx; labelY = pcy; }
            }
          }
        }

        const labelFontSize = Math.max(8, Math.min(14, drawPanelSize * 0.35));
        ctx.font = `bold ${labelFontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const printMode = ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode;
        // Shadow for legibility over the panels
        ctx.fillStyle = printMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)';
        ctx.fillText(screen.name, labelX + 2, labelY + 2);
        ctx.fillText(screen.name, labelX - 1, labelY + 1);
        // Label text on top
        ctx.fillStyle = printMode ? '#000' : '#FFFF00';
        ctx.fillText(screen.name, labelX, labelY);
      }
    }
  });

  recordCombinedHitGeometry('combinedStandardCanvas', hitEntries);

  // Selection outlines, drawn from the geometry recorded just above so this canvas
  // and the power/data canvases all highlight the same cells.
  drawCombinedSelectionOverlay(ctx, 'combinedStandardCanvas');
}

// Render combined power layout
function renderCombinedPowerLayout(screenDimensions, canvasWidth, canvasHeight, panelSize, topPadding) {
  const canvas = document.getElementById('combinedPowerCanvas');
  if(!canvas) return;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  // Background — white in eco/greyscale print mode, black in normal mode
  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode) ? '#ffffff' : '#000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const leftPadding = 20;

  // Shared-distro group balancing is solved once for the whole distro, not per screen.
  const _groupPlan = (typeof sharedDistroBalancedPlan === 'function') ? sharedDistroBalancedPlan() : null;

  const hitEntries = [];

  screenDimensions.forEach(dim => {
    const { screen, data, pw, ph, x, screenId } = dim;
    // Use the default x position from screenDimensions (no custom positioning)
    const screenX = leftPadding + x;
    const screenY = topPadding;

    // Publish what this screen was drawn at, for hit detection + the selection overlay.
    // Note this canvas draws at the UNZOOMED panelSize, unlike the standard canvas.
    hitEntries.push({
      screenId, screen, data, pw,
      screenX, screenY,
      panelWidth: panelSize,
      geo: combinedRowGeometry(data, panelSize)
    });

    // Properly convert deletedPanels to Set (may be array from JSON or Set with Array iterator)
    let screenDeletedPanels = new Set();
    if(data.deletedPanels instanceof Set) {
      // It's already a Set, copy it
      data.deletedPanels.forEach(key => screenDeletedPanels.add(key));
    } else if(Array.isArray(data.deletedPanels)) {
      // It's an array (from JSON)
      data.deletedPanels.forEach(key => screenDeletedPanels.add(key));
    } else if(data.deletedPanels && typeof data.deletedPanels[Symbol.iterator] === 'function') {
      // It's some other iterable
      for(const key of data.deletedPanels) {
        screenDeletedPanels.add(key);
      }
    }

    // Properly convert customCircuitAssignments to Map (may be array from JSON)
    let screenCustomCircuits = new Map();
    if(data.customCircuitAssignments instanceof Map) {
      data.customCircuitAssignments.forEach((val, key) => screenCustomCircuits.set(key, val));
    } else if(Array.isArray(data.customCircuitAssignments)) {
      data.customCircuitAssignments.forEach(([key, val]) => screenCustomCircuits.set(key, val));
    } else if(data.customCircuitAssignments && typeof data.customCircuitAssignments.entries === 'function') {
      for(const [key, val] of data.customCircuitAssignments.entries()) {
        screenCustomCircuits.set(key, val);
      }
    }

    // Same conversion for customSocaAssignments
    let screenCustomSocas = new Map();
    if(data.customSocaAssignments instanceof Map) {
      data.customSocaAssignments.forEach((val, key) => screenCustomSocas.set(key, val));
    } else if(Array.isArray(data.customSocaAssignments)) {
      data.customSocaAssignments.forEach(([key, val]) => screenCustomSocas.set(key, val));
    } else if(data.customSocaAssignments && typeof data.customSocaAssignments.entries === 'function') {
      for(const [key, val] of data.customSocaAssignments.entries()) {
        screenCustomSocas.set(key, val);
      }
    }

    // Get panels per circuit - need to calculate like original if not set
    const allPanelsData = getAllPanels();
    const panelType = data.panelType || 'CB5_MKII';
    const panelInfo = allPanelsData[panelType];
    const voltage = parseInt(data.voltage) || 208;
    const breaker = parseInt(data.breaker) || 20;
    const powerType = data.powerType || 'max';
    const perPanelW = powerType === 'max' ? (panelInfo?.power_max_w || 500) : (panelInfo?.power_avg_w || 250);
    // NEC 80% continuous-load derate (per-screen, mirrors generateLayout() in core/calculate.js).
    const derate = data.derate ? 0.8 : 1.0;
    const circuitCapacityW = voltage * breaker * derate;
    const calculatedPanelsPerCircuit = Math.max(1, Math.floor(circuitCapacityW / perPanelW));
    const userMaxPanelsPerCircuit = parseInt(data.maxPanelsPerCircuit);
    const panelsPerCircuit = userMaxPanelsPerCircuit > 0 ? userMaxPanelsPerCircuit : calculatedPanelsPerCircuit;

    // The CB5 half row is an EXTRA row below the full ones, so the grid is one row
    // taller than data.panelsHigh. Mirrors getEffectivePanelCountsForLayout() in
    // core/calculate.js, which returns ph + 1 for the Complex canvas.
    const screenHasCB5HalfRow = data.addCB5HalfRow && panelType === 'CB5_MKII';
    const screenOriginalPh = ph;                                  // full-height rows
    const screenEffectivePh = screenHasCB5HalfRow ? ph + 1 : ph;  // incl. the half row

    // Circuit + SOCA assignment via the shared helpers in core/phase-balance.js — the
    // same ones renderPowerLayout() uses — so the grouping matches the Complex canvas.
    // Phase Balance: on a shared distro the whole group is solved together (each screen
    // balances against the legs the earlier SOCAs already loaded); otherwise the screen is
    // balanced on its own. Both fall back to as-wired when balancing wouldn't help.
    const _wiring = (typeof resolveDistroWiring === 'function') ? resolveDistroWiring(voltage) : null;
    const _groupEntry = (_groupPlan && _groupPlan.useBalanced && data.sharedDistro)
      ? _groupPlan.byScreen.get(screenId) : null;
    const _bal = (!_groupEntry && data.phaseBalance && typeof resolveBalancedCircuits === 'function')
      ? resolveBalancedCircuits(pw, screenEffectivePh, panelsPerCircuit, screenDeletedPanels, _wiring, screenCustomCircuits, screenCustomSocas, perPanelW, voltage)
      : null;
    const panelToCircuit = _groupEntry ? _groupEntry.panelToCircuit
      : (_bal ? _bal.panelToCircuit
              : assignCircuits(pw, screenEffectivePh, panelsPerCircuit, screenDeletedPanels, screenCustomCircuits).panelToCircuit);
    // Balancing PRESERVES SOCA membership — balanceCircuitsByLeg() re-numbers circuits as
    // soca*6 + slot using the same assignSocas() grouping, so only the slot within a SOCA
    // moves. Custom SOCAs and the shared-distro numbering therefore stay valid and MUST be
    // re-applied: dropping them would restart a balanced screen at SOCA A/B/C even when
    // those numbers are already taken by another screen on the same distro.
    const panelToSoca = assignSocas(panelToCircuit, screenCustomSocas);

    // Share Distro: continuous SOCA numbering across the shared-distro group (if this screen is in it).
    const _socaLabelMap = (typeof sharedDistroSocaLabelMap === 'function') ? sharedDistroSocaLabelMap(screenId) : null;
    const _socaLabelIdx = idx => (_socaLabelMap && _socaLabelMap.has(idx)) ? _socaLabelMap.get(idx) : idx;

    // Calculate panel dimensions for CB5_MKII (rectangular) vs other panels (square)
    const screenHeightRatio = getPanelHeightRatio(panelType);
    const drawPanelWidth = panelSize;
    const drawPanelHeight = panelSize * screenHeightRatio;
    const halfPanelDrawHeight = panelSize; // Half panels are square

    // Draw all panels using resistor colors (same as original)
    for(let c=0; c<pw; c++){
      for(let r=0; r<screenEffectivePh; r++){
        const panelKey = `${c},${r}`;

        // Determine if this row is the half panel row
        const isHalfPanelRow = screenHasCB5HalfRow && r === screenOriginalPh;
        const currentDrawHeight = isHalfPanelRow ? halfPanelDrawHeight : drawPanelHeight;
        const px = screenX + c * drawPanelWidth;
        const py = screenY + (isHalfPanelRow ? (screenOriginalPh * drawPanelHeight) : (r * drawPanelHeight));

        const hasDeleted = screenDeletedPanels.has ? screenDeletedPanels.has(panelKey) : false;
        if(hasDeleted) {
          ctx.fillStyle = (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode) ? '#ffffff' : '#1a1a1a';
          ctx.fillRect(px, py, drawPanelWidth, currentDrawHeight);
          ctx.strokeStyle = (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode) ? '#cccccc' : '#333333';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(px, py, drawPanelWidth, currentDrawHeight);
          ctx.setLineDash([]);
          continue;
        }

        const circuitNum = panelToCircuit.get(panelKey);
        if(circuitNum === undefined) continue;

        // SOCA group: explicit assignment wins over derived
        const socaGroup = panelToSoca.has(panelKey) ? panelToSoca.get(panelKey) : Math.floor(circuitNum / 6);
        const colorIndex = circuitNum % 6;
        const colors = colorForIndex(colorIndex);

        const fillColor = applySocaShade(colors.solid, socaGroup);

        ctx.fillStyle = fillColor;
        ctx.fillRect(px, py, drawPanelWidth, currentDrawHeight);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, drawPanelWidth, currentDrawHeight);

        // Panel label: SOCA-local circuit (1-6 per SOCA, matching the panel colour and
        // the COMPLEX view). Same-circuit panels share a label.
        const labelFont = Math.max(7, Math.round(panelSize * 0.32));
        ctx.fillStyle = '#000000';
        ctx.font = `${labelFont}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${formatSocaLabel(_socaLabelIdx(socaGroup))}.${(circuitNum % 6) + 1}`, px + drawPanelWidth/2, py + currentDrawHeight/2);
      }
    }

    // SOCA outlines + diagonal labels, drawn by the same shared renderer the Complex
    // power canvas uses (layouts/power.js) so the two views match, including when
    // manual circuit/SOCA assignments make the groups non-contiguous.
    drawSocaOverlay(ctx, {
      panelToCircuit, panelToSoca,
      deletedPanels: screenDeletedPanels,
      panelWidth: drawPanelWidth,
      panelHeight: drawPanelHeight,
      halfPanelHeight: halfPanelDrawHeight,
      hasCB5HalfRow: screenHasCB5HalfRow,
      originalPh: screenOriginalPh,
      offsetX: screenX, offsetY: screenY,
      outlineLineWidth: 1.5,
      socaLabelIdx: _socaLabelIdx,
      drawOutlines: (typeof socaOutlinesEnabled !== 'undefined') ? socaOutlinesEnabled : true,
      drawLabels:   (typeof socaDiagonalLabelEnabled !== 'undefined') ? socaDiagonalLabelEnabled : true
    });

    // Draw screen label
    ctx.fillStyle = (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode) ? '#000' : '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(screen.name, screenX + (pw * panelSize) / 2, screenY - 10);
  });

  recordCombinedHitGeometry('combinedPowerCanvas', hitEntries);
  drawCombinedSelectionOverlay(ctx, 'combinedPowerCanvas');
}

// ==================== COMBINED DATA VIEW TOGGLES ====================
// The data view toggles are per-screen (screens[id].data.dataFlip etc.), so the
// combined row is a BULK control: clicking writes the chosen value to every selected
// screen. A button reads back as active only when all selected screens agree — a
// mixed selection shows off rather than implying agreement.

// 'on' | 'off' | 'mixed' across the selected screens.
// showArrows defaults to true when unset; the other three default to false.
function combinedDataToggleState(key) {
  let seen = 0, onCount = 0;
  combinedSelectedScreens.forEach(screenId => {
    const screen = screens[screenId];
    if(!screen || !screen.data) return;
    seen++;
    const on = (key === 'showArrows') ? (screen.data[key] !== false) : !!screen.data[key];
    if(on) onCount++;
  });
  if(seen === 0 || onCount === 0) return 'off';
  return onCount === seen ? 'on' : 'mixed';
}

function applyCombinedDataToggle(mutate) {
  if(combinedSelectedScreens.size === 0) return;

  let currentScreenTouched = false;
  combinedSelectedScreens.forEach(screenId => {
    const screen = screens[screenId];
    if(!screen || !screen.data) return;
    mutate(screen.data);
    if(screenId === currentScreenId) currentScreenTouched = true;
  });

  if(currentScreenTouched) {
    // Keep the open screen's globals and its Complex-tab buttons in step. Without
    // this, saveCurrentScreenData() — run at the top of renderCombinedView() — writes
    // the stale globals straight back over what we just set.
    const d = screens[currentScreenId].data;
    showArrowsEnabled = d.showArrows !== false;
    dataFlipEnabled = !!d.dataFlip;
    dataRearViewEnabled = !!d.dataRearView;
    dataLineLabelsEnabled = !!d.dataLineLabels;

    const showArrowsBtn = document.getElementById('showArrowsBtn');
    if(showArrowsBtn) showArrowsBtn.classList.toggle('active', showArrowsEnabled);
    const dataFlipBtn = document.getElementById('dataFlipBtn');
    if(dataFlipBtn) {
      dataFlipBtn.classList.toggle('active', dataFlipEnabled);
      dataFlipBtn.style.display = showArrowsEnabled ? '' : 'none';
    }
    const dataFrontViewBtn = document.getElementById('dataFrontViewBtn');
    const dataRearViewBtn = document.getElementById('dataRearViewBtn');
    if(dataFrontViewBtn) dataFrontViewBtn.classList.toggle('active', !dataRearViewEnabled);
    if(dataRearViewBtn) dataRearViewBtn.classList.toggle('active', dataRearViewEnabled);
    const dataLineLabelsBtn = document.getElementById('dataLineLabelsBtn');
    if(dataLineLabelsBtn) { dataLineLabelsBtn.classList.toggle('active', dataLineLabelsEnabled); dataLineLabelsBtn.textContent = dataLineLabelsEnabled ? 'On' : 'Off'; }

    calculate(); // redraws the Complex canvases, and the combined ones via its own hook
  } else {
    renderCombinedView();
  }
}

function setCombinedDataView(view) {
  const rear = (view === 'rear');
  applyCombinedDataToggle(d => { d.dataRearView = rear; });
}

function toggleCombinedShowArrows() {
  const on = combinedDataToggleState('showArrows') !== 'on';
  // Mirrors toggleShowArrows(): turning arrows off clears Flip too.
  applyCombinedDataToggle(d => {
    d.showArrows = on;
    if(!on) d.dataFlip = false;
  });
}

function toggleCombinedDataFlip() {
  const on = combinedDataToggleState('dataFlip') !== 'on';
  applyCombinedDataToggle(d => { d.dataFlip = on; });
}

function toggleCombinedDataLineLabels() {
  const on = combinedDataToggleState('dataLineLabels') !== 'on';
  applyCombinedDataToggle(d => { d.dataLineLabels = on; });
}

function updateCombinedDataToggleButtons() {
  const arrows = combinedDataToggleState('showArrows');
  const flip = combinedDataToggleState('dataFlip');
  const rear = combinedDataToggleState('dataRearView');
  const labels = combinedDataToggleState('dataLineLabels');

  const frontBtn = document.getElementById('combinedDataFrontViewBtn');
  const rearBtn = document.getElementById('combinedDataRearViewBtn');
  if(frontBtn) frontBtn.classList.toggle('active', rear === 'off');
  if(rearBtn) rearBtn.classList.toggle('active', rear === 'on');

  const arrowsBtn = document.getElementById('combinedShowArrowsBtn');
  if(arrowsBtn) arrowsBtn.classList.toggle('active', arrows === 'on');

  const flipBtn = document.getElementById('combinedDataFlipBtn');
  if(flipBtn) {
    flipBtn.classList.toggle('active', flip === 'on');
    // Flip only applies while arrows are drawn — same as the Complex tab.
    flipBtn.style.display = (arrows === 'off') ? 'none' : '';
  }

  const labelsBtn = document.getElementById('combinedDataLineLabelsBtn');
  if(labelsBtn) {
    labelsBtn.classList.toggle('active', labels === 'on');
    labelsBtn.textContent = labels === 'on' ? 'On' : 'Off';
  }
}

// Render combined data layout
function renderCombinedDataLayout(screenDimensions, canvasWidth, canvasHeight, panelSize, topPadding) {
  const canvas = document.getElementById('combinedDataCanvas');
  if(!canvas) return;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  // Background — white in eco/greyscale print mode, black in normal mode
  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode) ? '#ffffff' : '#000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const leftPadding = 20;
  const mapSections = []; // per-screen Mains/Backups, built from the endpoints actually drawn
  const hitEntries = [];

  screenDimensions.forEach(dim => {
    const { screen, data, pw, ph, x, screenId } = dim;
    // Use the default x position from screenDimensions (no custom positioning)
    const screenX = leftPadding + x;
    const screenY = topPadding;

    // Publish what this screen was drawn at, for hit detection + the selection overlay.
    // Note this canvas draws at the UNZOOMED panelSize, unlike the standard canvas.
    hitEntries.push({
      screenId, screen, data, pw,
      screenX, screenY,
      panelWidth: panelSize,
      geo: combinedRowGeometry(data, panelSize)
    });

    // Properly convert deletedPanels to Set (may be array from JSON or Set with Array iterator)
    let screenDeletedPanels = new Set();
    if(data.deletedPanels instanceof Set) {
      data.deletedPanels.forEach(key => screenDeletedPanels.add(key));
    } else if(Array.isArray(data.deletedPanels)) {
      data.deletedPanels.forEach(key => screenDeletedPanels.add(key));
    } else if(data.deletedPanels && typeof data.deletedPanels[Symbol.iterator] === 'function') {
      for(const key of data.deletedPanels) {
        screenDeletedPanels.add(key);
      }
    }

    // Properly convert customDataLineAssignments to Map (may be array from JSON)
    let screenCustomDataLines = new Map();
    if(data.customDataLineAssignments instanceof Map) {
      data.customDataLineAssignments.forEach((val, key) => screenCustomDataLines.set(key, val));
    } else if(Array.isArray(data.customDataLineAssignments)) {
      data.customDataLineAssignments.forEach(([key, val]) => screenCustomDataLines.set(key, val));
    } else if(data.customDataLineAssignments && typeof data.customDataLineAssignments.entries === 'function') {
      for(const [key, val] of data.customDataLineAssignments.entries()) {
        screenCustomDataLines.set(key, val);
      }
    }

    const startDir = data.dataStartDir || 'top';

    // Calculate panel dimensions for CB5_MKII (rectangular) vs other panels (square)
    const screenPanelType = data.panelType || 'CB5_MKII';
    const screenHeightRatio = getPanelHeightRatio(screenPanelType);
    const drawPanelWidth = panelSize;
    const drawPanelHeight = panelSize * screenHeightRatio;

    // Check if this screen has half panel row enabled
    const screenHasCB5HalfRow = data.addCB5HalfRow && screenPanelType === 'CB5_MKII';
    const screenOriginalPh = ph;                                  // full-height rows
    const screenEffectivePh = screenHasCB5HalfRow ? ph + 1 : ph;  // incl. the half row
    const halfPanelDrawHeight = panelSize; // Half panels are square

    // Panels per data line from THIS screen's own processor capacity, via the shared
    // helper generateLayout() uses (core/calculate.js) — the combined view used to
    // hard-code 48, which silently disagreed with the Complex canvas on Auto.
    const allPanelsData = getAllPanels();
    const allProcessorsData = getAllProcessors();
    const panelsPerDataLine = resolvePanelsPerDataLine({
      panel: allPanelsData[screenPanelType],
      halfPanel: allPanelsData['CB5_MKII_HALF'],
      processor: allProcessorsData[data.processor],
      frameRate: parseInt(data.frameRate) || 60,
      bitDepth: parseInt(data.bitDepth) || 8,
      hasCB5HalfRow: screenHasCB5HalfRow,
      pw, ph,
      deletedCount: screenDeletedPanels.size,
      userMax: parseInt(data.maxPanelsPerData)
    });

    // Data line grouping via the shared walk in layouts/data.js — the same one
    // renderDataLayout() uses — so the grouping and colours match the Complex canvas
    // for deleted columns, custom assignments and all_top/all_bottom start directions.
    const {groups, sortedDataLines} = buildDataLineGroups({
      pw, ph: screenEffectivePh, panelsPerDataLine, startDir,
      deletedPanels: screenDeletedPanels,
      customDataLineAssignments: screenCustomDataLines
    });

    // Per-screen view toggles: each wall draws with its OWN saved settings so it
    // matches its own Data tab, not whichever screen happens to be open.
    const screenFlip = !!data.dataFlip;
    const endpoints = computeDataLineEndpoints(groups, sortedDataLines, screenFlip);
    mapSections.push({ name: screen.name, endpoints, redundancy: !!data.redundancy });

    // Panel numbers scale down for the combined view's smaller cells; shrink further
    // if the widest label (e.g. "16.12") would overflow the panel.
    let numberFontSize = Math.max(7, Math.round(panelSize * 0.32));
    ctx.save();
    ctx.font = `${numberFontSize}px Arial`;
    while(numberFontSize > 5 && ctx.measureText(`${pw}.${screenEffectivePh}`).width > drawPanelWidth * 0.85) {
      numberFontSize -= 1;
      ctx.font = `${numberFontSize}px Arial`;
    }
    ctx.restore();

    drawDataOverlay(ctx, {
      groups, sortedDataLines, endpoints,
      deletedPanels: screenDeletedPanels,
      startDir,
      pw, ph: screenEffectivePh,
      panelWidth: drawPanelWidth,
      panelHeight: drawPanelHeight,
      halfPanelHeight: halfPanelDrawHeight,
      hasCB5HalfRow: screenHasCB5HalfRow,
      originalPh: screenOriginalPh,
      offsetX: screenX, offsetY: screenY,
      rearView: !!data.dataRearView,
      flip: screenFlip,
      showArrows: data.showArrows !== false,
      showLabels: !!data.dataLineLabels,
      redundancy: !!data.redundancy,
      panelFontSize: numberFontSize,
      arrowLineWidth: Math.max(1.5, panelSize * 0.075),
      arrowHeadSize: Math.max(5, panelSize * 0.3),
      lightDeletedPanels: (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode)
    });

    // Draw screen label
    ctx.fillStyle = (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode) ? '#000' : '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(screen.name, screenX + (pw * drawPanelWidth) / 2, screenY - 10);
  });

  recordCombinedHitGeometry('combinedDataCanvas', hitEntries);
  drawCombinedSelectionOverlay(ctx, 'combinedDataCanvas');

  renderCombinedDataLineMap(mapSections);
}

// Mains/Backups start-panel cards below the combined data canvas — the multi-screen
// counterpart of renderDataLineMap(). Built from the endpoints the canvas just drew,
// so the table and the layout can't disagree. Each screen gets a block (heading + its
// own .data-line-map grid) and the blocks flow across the width of the data layout,
// up to three per row. The card titles stay "Mains"/"Backups" because
// .structure-info-title is an absolutely-positioned tab that only fits one line.
function renderCombinedDataLineMap(sections) {
  const host = document.getElementById('combinedDataLineMap');
  if(!host) return;
  host.textContent = '';

  sections.forEach(section => {
    if(!section.endpoints || section.endpoints.length === 0) return;

    const block = document.createElement('div');
    block.className = 'combined-data-map-block';

    const heading = document.createElement('div');
    heading.className = 'combined-data-map-screen';
    heading.textContent = section.name;
    block.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'data-line-map';

    grid.appendChild(buildDataLineMapBox('mains', 'Mains', section.endpoints.map(function(ep){
      return { label: `${ep.line}`, panel: formatDataLinePanel(ep.main) };
    })));

    if(section.redundancy) {
      grid.appendChild(buildDataLineMapBox('backups', 'Backups', section.endpoints.map(function(ep){
        return { label: `${ep.line}B`, panel: formatDataLinePanel(ep.backup) };
      })));
    }

    block.appendChild(grid);
    host.appendChild(block);
  });
}

// Render combined structure layout
function renderCombinedStructureLayout(screenDimensions, canvasWidth, canvasHeight, panelSize, topPadding) {
  const canvas = document.getElementById('combinedStructureCanvas');
  if(!canvas) return;

  // Add extra height for bumpers at top and bottom
  const bumperHeight = Math.max(25, panelSize * 0.7);
  canvas.width = canvasWidth;
  canvas.height = canvasHeight + bumperHeight * 2 + 20; // Extra space for bumpers
  const ctx = canvas.getContext('2d');

  // Dark background (same as original structure layout)
  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode) ? '#ffffff' : '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const leftPadding = 20;

  screenDimensions.forEach(dim => {
    const { screen, data, pw, ph, x, screenId } = dim;
    // Use the default x position from screenDimensions (no custom positioning)
    const screenX = leftPadding + x;
    const structureType = data.structureType || 'hanging';

    // Properly convert deletedPanels to Set (may be array from JSON or Set with Array iterator)
    let screenDeletedPanels = new Set();
    if(data.deletedPanels instanceof Set) {
      data.deletedPanels.forEach(key => screenDeletedPanels.add(key));
    } else if(Array.isArray(data.deletedPanels)) {
      data.deletedPanels.forEach(key => screenDeletedPanels.add(key));
    } else if(data.deletedPanels && typeof data.deletedPanels[Symbol.iterator] === 'function') {
      for(const key of data.deletedPanels) {
        screenDeletedPanels.add(key);
      }
    }

    const screenBumpers = data.bumpers || [];

    // Calculate panel dimensions for CB5_MKII (rectangular) vs other panels (square)
    const screenPanelType = data.panelType || 'CB5_MKII';
    const screenHeightRatio = getPanelHeightRatio(screenPanelType);
    const drawPanelWidth = panelSize;
    const drawPanelHeight = panelSize * screenHeightRatio;

    // Check if this screen has half panel row enabled. The half row is an EXTRA row
    // below the full ones, so the grid is one taller than data.panelsHigh.
    const screenHasCB5HalfRow = data.addCB5HalfRow && screenPanelType === 'CB5_MKII';
    const screenOriginalPh = ph;                                  // full-height rows
    const screenEffectivePh = screenHasCB5HalfRow ? ph + 1 : ph;  // incl. the half row
    const halfPanelDrawHeight = panelSize; // Half panels are square

    // Calculate total screen height (accounting for half panel row if present)
    const screenTotalHeight = screenHasCB5HalfRow ? (screenOriginalPh * drawPanelHeight + halfPanelDrawHeight) : (ph * drawPanelHeight);

    // Determine if we have top or bottom bumpers based on structure type
    const isHanging = structureType === 'hanging' || structureType === 'hybrid';
    const isGround = structureType === 'ground' || structureType === 'floor';

    // Check if there are any top or bottom bumpers
    const hasTopBumpers = screenBumpers.some(b => b.position === 'top');
    const hasBottomBumpers = screenBumpers.some(b => b.position === 'bottom');

    // Calculate panel Y position based on bumper placement (no custom positioning)
    let panelYOffset = topPadding;
    if(hasTopBumpers) {
      panelYOffset += bumperHeight + 5;
    }

    // Draw panels first (white background with black outline, same as original)
    for(let c=0; c<pw; c++){
      for(let r=0; r<screenEffectivePh; r++){
        const panelKey = `${c},${r}`;

        // Determine if this row is the half panel row
        const isHalfPanelRow = screenHasCB5HalfRow && r === screenOriginalPh;
        const currentDrawHeight = isHalfPanelRow ? halfPanelDrawHeight : drawPanelHeight;
        const px = screenX + c * drawPanelWidth;
        const py = panelYOffset + (isHalfPanelRow ? (screenOriginalPh * drawPanelHeight) : (r * drawPanelHeight));

        const hasDeleted = screenDeletedPanels.has(panelKey);
        if(hasDeleted) {
          // Deleted panels show dashed outline
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(px, py, drawPanelWidth, currentDrawHeight);
          ctx.setLineDash([]);
          continue;
        }

        // White background for panels (same as original)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px, py, drawPanelWidth, currentDrawHeight);

        // Black outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, drawPanelWidth, currentDrawHeight);
      }
    }

    // Draw bumpers from screen data using proper bumper structure
    if(screenBumpers.length > 0) {
      screenBumpers.forEach(bumper => {
        // Calculate bumper width based on type
        let bumperWidthCols = 1;
        if(bumper.type === '2w') {
          bumperWidthCols = 2;
        } else if(bumper.type === '4w') {
          // 4W bumpers span from startCol to endCol
          bumperWidthCols = (bumper.endCol - bumper.startCol) || 2;
        }

        const bumperX = screenX + bumper.startCol * drawPanelWidth;
        const bumperWidthPx = bumperWidthCols * drawPanelWidth;
        let bumperY;

        if(bumper.position === 'top') {
          // Top bumpers
          bumperY = topPadding;
        } else {
          // Bottom bumpers - use total screen height which accounts for half panel row
          bumperY = panelYOffset + screenTotalHeight + 5;
        }

        // Use colors matching original: green for top 2W, orange for bottom, blue for 1W, orange for 4W
        let fillColor = '#4CAF50'; // Default green
        if(bumper.type === '1w') {
          fillColor = '#2196F3'; // Blue for 1W
        } else if(bumper.type === '4w') {
          fillColor = '#FF6B35'; // Orange for 4W
        } else if(bumper.position === 'bottom') {
          fillColor = '#FF9800'; // Orange for bottom bumpers
        }

        // Apply eco/greyscale color conversion
        if(greyscalePrintMode && typeof toGreyscale === 'function') {
          fillColor = toGreyscale(fillColor);
        } else if(ecoPrintMode && typeof toPastelColor === 'function') {
          fillColor = toPastelColor(fillColor);
        }

        // Draw bumper
        ctx.fillStyle = fillColor;
        ctx.fillRect(bumperX, bumperY, bumperWidthPx, bumperHeight);

        // Black outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(bumperX, bumperY, bumperWidthPx, bumperHeight);

        // Bumper label (black for eco print, white otherwise)
        ctx.fillStyle = (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode) ? '#000000' : '#FFFFFF';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = bumper.type ? bumper.type.toUpperCase() : '2W';
        ctx.fillText(label, bumperX + bumperWidthPx/2, bumperY + bumperHeight/2);
      });
    }

    // Draw screen label
    ctx.fillStyle = (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode) ? '#000' : '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    let labelY;
    if(hasTopBumpers) {
      labelY = topPadding - 15;
    } else {
      labelY = panelYOffset - 15;
    }
    ctx.fillText(screen.name, screenX + (pw * drawPanelWidth) / 2, labelY);
  });
}

// Whole-show 3-phase load: phasor-aggregate every selected 3-phase screen's per-leg-pair
// currents into one combined Leg X/Y/Z + imbalance, shown below the combined power canvas.
// Computed fresh from each screen's data (the combined view doesn't refresh per-screen
// calculatedData), reusing the shared phase-balance helpers so the math matches the
// per-screen legend. As-wired (actual draw), like the combined power canvas itself.
// Combined 3-phase per-leg amps across the selected screens, using the phasor circuit
// model (same as each screen's power view): assign each screen's circuits to their
// leg-pairs, sum the branch currents, then phasor-combine. Returns { any3phase, legAmps,
// peakLeg, imbalancePct }. Shared by the combined legend and the combined specs so the
// two can't drift.
function computeCombinedLegAmps(selectedScreenIds) {
  if(typeof assignCircuits !== 'function' || typeof computePhaseBalance !== 'function') {
    return { any3phase: false, legAmps: { X: 0, Y: 0, Z: 0 }, peakLeg: 0, imbalancePct: 0, anyBalanceMode: false, anyBalanced: false, allShared: false };
  }

  const allPanelsData = getAllPanels();
  const totalPair = { XY: 0, YZ: 0, ZX: 0 };   // line-to-line branch currents
  const totalSingle = { X: 0, Y: 0, Z: 0 };    // line-to-neutral leg currents
  let any3phase = false;
  let anyBalanceMode = false;  // at least one screen has Phase Balance on
  let anyBalanced = false;     // ...and on at least one of those it actually re-circuited
  let allShared = true;        // every counted screen is in the shared-distro group

  // Shared-distro group balancing — solved once for the whole distro, exactly as the
  // combined power canvas does, so the legend can't disagree with what's drawn.
  const groupPlan = (typeof sharedDistroBalancedPlan === 'function') ? sharedDistroBalancedPlan() : null;

  (selectedScreenIds || []).forEach(screenId => {
    const screen = screens[screenId];
    if(!screen || !screen.data) return;
    const data = screen.data;
    const pw = data.panelsWide || 0;
    const ph = data.panelsHigh || 0;
    if(pw <= 0 || ph <= 0) return;
    if((parseInt(data.phase) || 1) !== 3) return; // 3-phase screens only

    // Circuit inputs (panelsPerCircuit incl. the NEC derate, normalised Set/Map overrides,
    // voltage, wiring) come from the shared helper so the grouping matches the combined
    // power canvas exactly — required for balanced re-circuiting to agree with what's drawn.
    const inp = (typeof resolveScreenPowerInputs === 'function') ? resolveScreenPowerInputs(data) : null;
    if(!inp) return;

    // perPanelW for the AMPS still honours the combined Max/Avg toggle, so that control keeps
    // working; the circuit grouping below uses the screen's own perPanelW, like the canvas.
    const panelInfo = allPanelsData[data.panelType || 'CB5_MKII'];
    const perPanelW = combinedPowerType === 'max' ? (panelInfo?.power_max_w || 500) : (panelInfo?.power_avg_w || 250);
    const voltage = inp.voltage;
    const wiring = inp.wiring;

    // Phase Balance — same branch the combined canvas takes: group-wide on a shared distro,
    // per-screen otherwise.
    const groupEntry = (groupPlan && groupPlan.useBalanced && data.sharedDistro)
      ? groupPlan.byScreen.get(screenId) : null;
    const bal = (!groupEntry && data.phaseBalance && typeof resolveBalancedCircuits === 'function')
      ? resolveBalancedCircuits(inp.pw, inp.ph, inp.panelsPerCircuit, inp.deletedPanels, wiring, inp.customCircuit, inp.customSoca, inp.perPanelW, voltage)
      : null;
    const circuitCounts = groupEntry ? groupEntry.circuitCounts
      : (bal ? bal.circuitCounts
             : assignCircuits(inp.pw, inp.ph, inp.panelsPerCircuit, inp.deletedPanels, inp.customCircuit).circuitCounts);
    if(data.phaseBalance) anyBalanceMode = true;
    if(groupEntry || (bal && bal.useBalanced)) anyBalanced = true;

    // Balanced circuits are numbered soca*6 + slot, so 'aswired' pair assignment over them
    // still lands each circuit on its real leg.
    const pb = computePhaseBalance(circuitCounts, perPanelW, voltage, 'aswired', wiring);

    any3phase = true;
    if(!data.sharedDistro) allShared = false;
    (pb.perCircuit || []).forEach(c => {
      if(totalPair[c.pair] !== undefined) totalPair[c.pair] += c.amps;
      else if(totalSingle[c.pair] !== undefined) totalSingle[c.pair] += c.amps;
    });
  });

  // Leg amps: phasor-combine the summed per-pair branch currents (Vll=1 so the helper treats
  // the inputs as currents), then add any single-leg currents directly onto their leg.
  const phasorLegs = (typeof legAmpsFromPairWatts === 'function') ? legAmpsFromPairWatts(totalPair, 1) : { X: 0, Y: 0, Z: 0 };
  const la = {
    X: phasorLegs.X + totalSingle.X,
    Y: phasorLegs.Y + totalSingle.Y,
    Z: phasorLegs.Z + totalSingle.Z
  };
  const arr = [la.X, la.Y, la.Z];
  const peak = Math.max(...arr), min = Math.min(...arr);
  const imb = peak > 0 ? ((peak - min) / peak) * 100 : 0;
  return { any3phase, legAmps: la, peakLeg: peak, imbalancePct: imb, anyBalanceMode, anyBalanced, allShared: any3phase && allShared };
}

function renderCombinedPhaseBalance(selectedScreenIds) {
  const el = document.getElementById('combinedPhaseBalanceLegend');
  if(!el) return;

  const cb = computeCombinedLegAmps(selectedScreenIds);
  if(!cb.any3phase) { el.style.display = 'none'; el.innerHTML = ''; return; }

  const la = cb.legAmps;
  const imb = cb.imbalancePct;
  const imbClass = imb < 10 ? 'pbl-ok' : (imb < 20 ? 'pbl-warn' : 'pbl-bad');

  // Phase Balance status: when the toggle is on, say whether re-circuiting actually lowered
  // the imbalance or the screens were already optimal — otherwise the toggle looks dead on
  // walls it can't improve. Mirrors renderPhaseBalanceLegend() in layouts/power.js.
  let statusRow = '';
  if(cb.anyBalanceMode) {
    statusRow = cb.anyBalanced
      ? `<div class="weight-row phase-balance-status"><span class="weight-label">Phase Balance</span><span class="weight-value pbl-ok">Re-circuited ✓</span></div>`
      : `<div class="weight-row phase-balance-status"><span class="weight-label">Phase Balance</span><span class="weight-value">Already optimal</span></div>`;
  }

  const title = cb.allShared ? '3-Phase Load (Shared Distro)' : '3-Phase Load (Combined)';
  el.innerHTML =
    `<div class="structure-info-box phase-load">` +
      `<div class="structure-info-title phase-load">${title}</div>` +
      `<div class="weight-row"><span class="weight-label">Leg X</span><span class="weight-value">${la.X.toFixed(1)} A</span></div>` +
      `<div class="weight-row"><span class="weight-label">Leg Y</span><span class="weight-value">${la.Y.toFixed(1)} A</span></div>` +
      `<div class="weight-row"><span class="weight-label">Leg Z</span><span class="weight-value">${la.Z.toFixed(1)} A</span></div>` +
      `<div class="weight-row"><span class="weight-label">Imbalance</span><span class="weight-value ${imbClass}">${imb.toFixed(0)}%</span></div>` +
      statusRow +
    `</div>`;
  el.style.display = 'block';
}

// Render combined specifications
function renderCombinedSpecs(selectedScreenIds) {
  const specsContent = document.getElementById('combinedSpecsContent');
  if(!specsContent) return;
  const specsToggles = document.getElementById('combinedSpecsToggles');
  if(specsToggles) specsToggles.style.display = 'flex';

  let totalPixels = 0;
  let totalPowerW = 0;
  let totalWeight = 0;
  let totalWidth = 0;
  let maxHeight = 0;
  let totalDataLines = 0;
  let totalAmpsPerPhase = 0;

  // Track panels by type
  const panelsByType = {};

  const allPanels = getAllPanels();

  selectedScreenIds.forEach(screenId => {
    const screen = screens[screenId];
    if(!screen || !screen.data) return;

    const data = screen.data;
    const calcData = screen.calculatedData || {};
    const pw = data.panelsWide || 0;
    const ph = data.panelsHigh || 0;
    const panelType = data.panelType || 'CB5_MKII';
    const panel = allPanels[panelType];

    if(!panel || pw === 0 || ph === 0) return;

    // Use calcData.activePanels directly (same as PDF export) — already accounts for deletions
    const activePanels = calcData.activePanels || calcData.panelCount || 0;

    // CB5 half panel row
    const hasCB5HalfRow = data.addCB5HalfRow && panelType === 'CB5_MKII';
    const halfPanelCount = hasCB5HalfRow ? pw : 0;
    const fullPanelCount = activePanels - halfPanelCount;

    // Track panels by type
    const panelDisplayName = `${panel.brand} ${panel.name}`;
    if(!panelsByType[panelDisplayName]) {
      panelsByType[panelDisplayName] = 0;
    }
    panelsByType[panelDisplayName] += fullPanelCount;

    // Add half panel row to panel count
    if(hasCB5HalfRow) {
      const halfPanel = allPanels['CB5_MKII_HALF'];
      if(halfPanel) {
        const halfDisplayName = `${halfPanel.brand} ${halfPanel.name}`;
        if(!panelsByType[halfDisplayName]) panelsByType[halfDisplayName] = 0;
        panelsByType[halfDisplayName] += halfPanelCount;
      }
    }

    // Pixels - use stored value or calculate
    totalPixels += calcData.totalPixels || (activePanels * panel.res_x * panel.res_y);

    // Power - use combined toggle state
    const powerPerPanel = combinedPowerType === 'max' ? (panel.power_max_w || 0) : (panel.power_avg_w || 0);
    let screenPowerW = activePanels * powerPerPanel;
    if(hasCB5HalfRow) {
      const halfPanel = allPanels['CB5_MKII_HALF'];
      if(halfPanel) {
        screenPowerW += pw * (combinedPowerType === 'max' ? (halfPanel.power_max_w || 0) : (halfPanel.power_avg_w || 0));
      }
    }
    totalPowerW += screenPowerW;

    // Amps - use per-screen voltage with combined phase toggle
    const voltage = parseInt(data.voltage) || 208;
    const screenAmps = voltage > 0 ? screenPowerW / voltage : 0;
    totalAmpsPerPhase += combinedPhase === 3 ? screenAmps / Math.sqrt(3) : screenAmps;

    // Weight - use stored calculated data (panels + structure)
    if('panelWeightOnlyKg' in calcData) {
      // Use stored breakdown: panels + bumpers + plates + ground support + floor frames
      const panelWeightKg = calcData.panelWeightOnlyKg || 0;
      const bumperWeightKg = calcData.bumperWeightKg || 0;
      const platesWeightKg = calcData.platesWeightKg || 0;
      const groundSupportWeightKg = calcData.groundSupportWeightKg || 0;
      const floorFramesWeightKg = (calcData.floorFrames && calcData.floorFrames.totalWeightKg) || 0;
      totalWeight += panelWeightKg + bumperWeightKg + platesWeightKg + groundSupportWeightKg + floorFramesWeightKg;
    } else {
      // Fallback: panel weight only
      const screenUseConnectingPlates = (panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF') && data.connectionMethod === 'plates';
      totalWeight += activePanels * getPanelWeight(panelType, screenUseConnectingPlates);
      if(hasCB5HalfRow) {
        totalWeight += pw * getPanelWeight('CB5_MKII_HALF', screenUseConnectingPlates);
      }
    }

    // Data lines - use stored calculated value
    totalDataLines += calcData.dataLines || Math.ceil(activePanels / (parseInt(data.maxPanelsPerData) || 48));

    // Dimensions
    totalWidth += pw * (panel.width_m || 0.5);
    let screenHeight = ph * (panel.height_m || 0.5);
    if(hasCB5HalfRow) {
      const halfPanel = allPanels['CB5_MKII_HALF'];
      if(halfPanel) screenHeight += halfPanel.height_m || 0;
    }
    maxHeight = Math.max(maxHeight, screenHeight);
  });

  // Calculate total panels
  const totalPanels = Object.values(panelsByType).reduce((sum, count) => sum + count, 0);

  const isImperial = displayLengthUnit === 'ft';
  const weightUnit = displayWeightUnit;

  // Format values
  const widthDisplay = isImperial ? (totalWidth * 3.28084).toFixed(2) + ' ft' : totalWidth.toFixed(2) + ' m';
  const heightDisplay = isImperial ? (maxHeight * 3.28084).toFixed(2) + ' ft' : maxHeight.toFixed(2) + ' m';
  const weightDisplay = weightUnit === 'lbs' ? Math.ceil(totalWeight * 2.20462) + ' lbs' : Math.ceil(totalWeight) + ' kg';

  // Helper to shorten panel type names for display
  function shortenPanelName(fullName) {
    // Remove "ROE Visual" prefix, keep brand abbreviation
    let short = fullName.replace('ROE Visual ', 'ROE ');
    // Remove full names, keep model numbers (e.g., "Black Pearl BP2 V2" -> "BP2 V2")
    short = short.replace('Black Pearl ', '');
    short = short.replace('Black Onyx ', '');
    short = short.replace('Black Marble ', '');
    short = short.replace('Carbon ', '');
    short = short.replace(' Half Panel', ' Half');
    return short;
  }

  // Build panels display
  let panelsDisplay = `${totalPanels}`;
  const panelTypes = Object.keys(panelsByType);
  if(panelTypes.length === 1) {
    panelsDisplay += ` (${escapeHtml(shortenPanelName(panelTypes[0]))})`;
  } else if(panelTypes.length > 1) {
    panelsDisplay += '<br>';
    panelTypes.forEach(type => {
      panelsDisplay += `<span style="font-size: 0.85em; color: #ccc; padding-left: 8px;">• ${panelsByType[type]}x ${escapeHtml(shortenPanelName(type))}</span><br>`;
    });
  }

  // Two-column layout with green title above white value (vertically stacked)
  let html = '<div class="combined-specs-grid" style="display: grid; grid-template-columns: auto auto; justify-content: start; gap: 12px 24px;">';

  // Left column: Total Screens, Total Panels, Total Pixels, Total Weight
  html += '<div style="display: flex; flex-direction: column; gap: 12px;">';
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 13px;">Total Screens</div><div style="color: #fff; font-size: 13px;">${selectedScreenIds.length}</div></div>`;
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 13px;">Total Panels</div><div style="color: #fff; font-size: 13px;">${panelsDisplay}</div></div>`;
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 13px;">Total Pixels</div><div style="color: #fff; font-size: 13px;">${totalPixels.toLocaleString()}</div></div>`;
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 13px;">Total Weight</div><div style="color: #fff; font-size: 13px;">${weightDisplay}</div></div>`;
  html += '</div>';

  // Right column: Dimensions, Power, Total Amps, Service needed, Data Lines
  html += '<div style="display: flex; flex-direction: column; gap: 12px;">';
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 13px;">Dimensions</div><div style="color: #fff; font-size: 13px;">${widthDisplay} × ${heightDisplay}</div></div>`;
  const powerLabel = combinedPowerType === 'max' ? 'Power (Max)' : 'Power (Avg)';
  // 3-phase Total Amps = combined phasor PEAK leg (matches the combined legend + each
  // screen's shared-distro view); 1-phase = summed P/V. Service sizes off the same figure.
  const cbLegs = (combinedPhase === 3) ? computeCombinedLegAmps(selectedScreenIds) : null;
  const displayAmps = (cbLegs && cbLegs.any3phase) ? cbLegs.peakLeg : totalAmpsPerPhase;
  const derateFactor = (document.getElementById('derate') && document.getElementById('derate').value === 'on') ? 0.8 : 1.0;
  const svcLabel = serviceNeededLabel(displayAmps, derateFactor) || '—';
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 13px;">${powerLabel}</div><div style="color: #fff; font-size: 13px;">${totalPowerW.toLocaleString()} W</div></div>`;
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 13px;">Total Amps</div><div style="color: #fff; font-size: 13px;">${displayAmps.toFixed(1)} A</div></div>`;
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 13px;">Service needed</div><div style="color: #fff; font-size: 13px;">${svcLabel}</div></div>`;
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 13px;">Data Lines</div><div style="color: #fff; font-size: 13px;">${totalDataLines}</div></div>`;
  html += '</div>';

  html += '</div>';

  specsContent.innerHTML = html;
}

// Render combined gear list - matches PDF export format with categories
function renderCombinedGearList(selectedScreenIds) {
  const gearContent = document.getElementById('combinedGearListContent');
  if(!gearContent) return;

  const allPanels = getAllPanels();

  // Aggregate gear from all selected screens
  const panelsByType = {}; // { 'Brand Name': count }
  let totalCircuits = 0;
  let totalDataLines = 0;
  let totalProcessors = 0;
  let total1wBumpers = 0;
  let total2wBumpers = 0;
  let total4wBumpers = 0;
  let totalPlates2way = 0;
  let totalPlates4way = 0;
  let totalShackles = 0;
  let totalCheeseye = 0;
  let totalSocaSplays = 0;
  let totalTrue1Twofers = 0;
  let totalDataJumpers = 0;
  let totalDataCrossJumpers = 0;
  let totalCat5Couplers = 0;
  let totalPowerJumpers = 0;

  // Ground support
  let totalRearTruss = 0;
  let totalBaseTruss = 0;
  let totalBridgeClamps = 0;
  let totalRearBridgeAdapters = 0;
  let totalSandbags = 0;
  let totalSwivelCheeseboroughs = 0;
  let totalPipes = 0;

  // Floor frames
  let totalFrame1x1 = 0;
  let totalFrame2x1 = 0;
  let totalFrame2x2 = 0;
  let totalFrame3x2 = 0;
  let totalFloorWeightLbs = 0;
  let totalFloorWeightKg = 0;

  // Track panel info for jumpers
  let hasJumpersBuiltin = false;
  let dataJumperLen = '';
  let dataCrossJumperLen = '';
  let powerJumperLen = '';
  let needsShacklesAndCheeseye = false;
  let hasHangingScreen = false;
  let hasFloorScreen = false;
  let has4KCanvas = false;

  selectedScreenIds.forEach(screenId => {
    const screen = screens[screenId];
    if(!screen) return;

    const data = screen.data || {};
    const calculatedData = screen.calculatedData || {};

    const pw = data.panelsWide || 0;
    const ph = data.panelsHigh || 0;
    const panelType = data.panelType || 'CB5_MKII';
    const panel = allPanels[panelType];

    if(!panel || pw === 0 || ph === 0) return;

    // Use calcData.activePanels directly (same as PDF export) — already accounts for deletions
    const hasCB5HalfRow = data.addCB5HalfRow && panelType === 'CB5_MKII';
    const activePanels = calculatedData.activePanels || calculatedData.panelCount || 0;
    const halfPanelCount = hasCB5HalfRow ? pw : 0;
    const fullPanelCount = activePanels - halfPanelCount;

    const panelLabel = `${panel.brand} ${panel.name}`;
    panelsByType[panelLabel] = (panelsByType[panelLabel] || 0) + fullPanelCount;
    if(halfPanelCount > 0) {
      const halfPanel = allPanels['CB5_MKII_HALF'];
      const halfLabel = halfPanel ? `${halfPanel.brand} ${halfPanel.name}` : `${panel.brand} CB5 MKII Half Panel`;
      panelsByType[halfLabel] = (panelsByType[halfLabel] || 0) + halfPanelCount;
    }

    // Use calculated data if available
    if(calculatedData.circuits) totalCircuits += calculatedData.circuits;
    if(calculatedData.dataLines) totalDataLines += calculatedData.dataLines;
    if(calculatedData.processors) totalProcessors += calculatedData.processors;
    if(calculatedData.socaCount) totalSocaSplays += calculatedData.socaCount;

    // Count bumpers from screen's bumper data
    const screenBumpers = data.bumpers || [];
    const useBumpers = data.useBumpers !== false;
    let screenBumper1w = 0;
    let screenBumper2w = 0;
    screenBumpers.forEach(b => {
      if(b.type === '1w') { total1wBumpers++; screenBumper1w++; }
      else if(b.type === '2w') { total2wBumpers++; screenBumper2w++; }
      else if(b.type === '4w') total4wBumpers++;
    });

    // Estimate plates (only for panels that use connecting plates)
    if (shouldUseConnectingPlates(panelType)) {
      totalPlates2way += Math.max(0, (pw - 2));
      totalPlates4way += data.use4WayBumpers ? Math.floor(pw / 2) : 0;
    }

    // Shackles and Cheeseye
    const needsShackles = ['CB5_MKII', 'CB5_MKII_HALF', 'MC7H', 'INFILED_AMT8_3'].includes(panelType) || (panel.custom && panel.needs_shackles);
    const structureType = data.structureType || 'hanging';
    const isHanging = structureType === 'hanging';
    if(isHanging) hasHangingScreen = true;
    if(structureType === 'floor') hasFloorScreen = true;

    if(needsShackles && isHanging && useBumpers) {
      needsShacklesAndCheeseye = true;
      if(panelType === 'INFILED_AMT8_3' || (panel.custom && panel.double_shackles)) {
        totalShackles += screenBumper1w + (screenBumper2w * 2);
        totalCheeseye += screenBumper1w + (screenBumper2w * 2);
      } else {
        totalShackles += screenBumper1w + screenBumper2w;
        totalCheeseye += screenBumper1w + screenBumper2w;
      }
    }

    // Ground support from calculated data
    if(calculatedData.groundSupport) {
      const gs = calculatedData.groundSupport;
      totalRearTruss += gs.totalRearTruss || 0;
      totalBaseTruss += gs.totalBaseTruss || 0;
      totalBridgeClamps += gs.totalBridgeClamps || 0;
      totalRearBridgeAdapters += gs.totalRearBridgeClampAdapters || 0;
      totalSandbags += gs.totalSandbags || 0;
      totalSwivelCheeseboroughs += gs.totalSwivelCheeseboroughs || 0;
      totalPipes += gs.totalPipes || 0;
    }

    // Floor frames from calculated data
    if(calculatedData.floorFrames) {
      const ff = calculatedData.floorFrames;
      totalFrame1x1 += ff.frame_1x1 || 0;
      totalFrame2x1 += ff.frame_2x1 || 0;
      totalFrame2x2 += ff.frame_2x2 || 0;
      totalFrame3x2 += ff.frame_3x2 || 0;
      totalFloorWeightLbs += ff.totalWeightLbs || 0;
      totalFloorWeightKg += ff.totalWeightKg || 0;
    }

    // Track canvas size for SDI type determination
    const canvasSize = data.canvasSize || '4K_UHD';
    const isHDCanvas = canvasSize === 'HD' || (canvasSize === 'custom' &&
      (parseInt(data.customCanvasWidth) || 1920) <= 1920 &&
      (parseInt(data.customCanvasHeight) || 1080) <= 1080);
    if(!isHDCanvas) has4KCanvas = true;

    // Panel-specific info for data/power jumpers
    if(panel.jumpers_builtin) hasJumpersBuiltin = true;
    if(panel.data_jumper_ft && !dataJumperLen) dataJumperLen = panel.data_jumper_ft;
    if(panel.data_cross_jumper_ft && !dataCrossJumperLen) dataCrossJumperLen = panel.data_cross_jumper_ft;
    if(panel.power_jumper_ft && !powerJumperLen) powerJumperLen = panel.power_jumper_ft;

    // Data and power jumpers
    if(!panel.jumpers_builtin && panel.data_jumper_ft) {
      totalDataJumpers += activePanels;
    }
    if(!panel.jumpers_builtin && panel.power_jumper_ft) {
      totalPowerJumpers += activePanels;
    }
    const screenCrossJumpers = calcDataCrossJumpers(data, panel, pw, ph);
    totalDataCrossJumpers += screenCrossJumpers.crossJumperCount;
    if(panel.jumpers_builtin) {
      totalCat5Couplers += (calculatedData.dataLines || 0) + screenCrossJumpers.crossings;
    }

    // True1 Twofers
    const columnsPerCircuit = calculatedData.columnsPerCircuit || 1;
    const circuitsNeeded = calculatedData.circuits || 0;
    if(columnsPerCircuit > 1) {
      totalTrue1Twofers += circuitsNeeded * columnsPerCircuit;
    }
  });

  // Build processor groups for signal cable calculation (same logic as gear tab)
  const processorGroups = {};
  selectedScreenIds.forEach(sid => {
    const sc = screens[sid];
    if(!sc || !sc.data) return;
    const procType = sc.data.processor || 'Brompton_SX40';
    const cd = sc.calculatedData || {};
    const dl = cd.dataLines || 0;
    if(!processorGroups[procType]) {
      processorGroups[procType] = {
        screens: [], totalMainPorts: 0, totalPixels: 0,
        hasAnyRedundancy: false, hasAnyProcessorRedundancy: false, hasAnyIndirectMode: false
      };
    }
    processorGroups[procType].screens.push({ screenId: sid, mainPorts: dl, totalPixels: cd.totalPixels || 0 });
    processorGroups[procType].totalMainPorts += dl;
    processorGroups[procType].totalPixels += (cd.totalPixels || 0);
    if(sc.data.redundancy) processorGroups[procType].hasAnyRedundancy = true;
    if(sc.data.processorRedundancy) processorGroups[procType].hasAnyProcessorRedundancy = true;
    if(sc.data.mx40ConnectionMode === 'indirect') processorGroups[procType].hasAnyIndirectMode = true;
  });

  // Calculate processor counts per group
  let totalGroupedProcessors = 0;
  Object.keys(processorGroups).forEach(procType => {
    const group = processorGroups[procType];
    const totalMainPorts = group.totalMainPorts;
    const hasRedundancy = group.hasAnyRedundancy;
    const hasProcessorRedundancy = group.hasAnyProcessorRedundancy;
    let processorCount = 0, distBoxCount = 0, distBoxName = '';

    if(procType === 'Brompton_SX40') {
      const mainXDs = totalMainPorts > 0 ? Math.ceil(totalMainPorts / 10) : 0;
      distBoxCount = hasRedundancy ? mainXDs * 2 : mainXDs;
      processorCount = distBoxCount > 0 ? Math.ceil(distBoxCount / 4) : 0;
      distBoxName = 'XD';
    } else if(procType === 'Brompton_S8') {
      const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
      processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 8) : 0;
    } else if(procType === 'Brompton_M2' || procType === 'Brompton_S4') {
      const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
      processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 4) : 0;
    } else if(procType === 'NovaStar_MX40_Pro') {
      const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
      const processorsByPixels = group.totalPixels > 0 ? Math.ceil(group.totalPixels / 9000000) : 0;
      if(group.hasAnyIndirectMode) {
        distBoxCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 10) : 0;
        distBoxName = 'CVT-10 Pro';
        processorCount = Math.max(processorsByPixels, Math.ceil(distBoxCount / 4));
      } else {
        const processorsByPorts = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 20) : 0;
        processorCount = Math.max(processorsByPixels, processorsByPorts);
      }
    } else {
      const allProcs = getAllProcessors();
      const proc = allProcs[procType];
      const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;

      if(proc && proc.custom && proc.supports_direct && proc.uses_distribution_box) {
        const processorsByPixels = group.totalPixels > 0 ? Math.ceil(group.totalPixels / proc.total_pixels) : 0;
        if(group.hasAnyIndirectMode) {
          const portsPerBox = proc.distribution_box_ports || 10;
          distBoxCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / portsPerBox) : 0;
          distBoxName = proc.distribution_box_name || '';
          processorCount = Math.max(processorsByPixels, Math.ceil(distBoxCount / (proc.output_ports || 4)));
        } else {
          const portsPerProcessor = proc.output_ports || 4;
          const processorsByPorts = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / portsPerProcessor) : 0;
          processorCount = Math.max(processorsByPixels, processorsByPorts);
        }
      } else if(proc && proc.uses_distribution_box && proc.distribution_box_name) {
        const portsPerBox = proc.distribution_box_ports || 10;
        distBoxCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / portsPerBox) : 0;
        distBoxName = proc.distribution_box_name;
        processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / (proc.output_ports || 8)) : group.screens.length;
      } else {
        const portsPerProcessor = (proc && proc.output_ports) || 8;
        processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / portsPerProcessor) : group.screens.length;
      }
    }
    if(hasProcessorRedundancy && processorCount > 0) processorCount *= 2;
    group.processorCount = processorCount;
    group.distBoxCount = distBoxCount;
    group.distBoxName = distBoxName;
    totalGroupedProcessors += processorCount;
  });

  // Helper to add a gear line only if value > 0
  function addGearLine(label, value) {
    if(value > 0) {
      // If value is a number, format as "count x label" — otherwise keep as "label value" for pre-formatted strings
      if(typeof value === 'number') {
        const cleanLabel = label.replace(/:$/, '').trim(); // Remove trailing colon
        return `<div style="margin-left: 12px; color: #fff;">${value} x ${cleanLabel}</div>`;
      }
      return `<div style="margin-left: 12px;"><span style="color: #fff;">${label}</span> ${value}</div>`;
    }
    return '';
  }

  // Helper to add a section header
  function addGearHeader(title) {
    return `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #383838; margin-bottom: 4px;"><strong style="color: #10b981; font-size: 13px;">${title}</strong></div>`;
  }

  let html = '<div style="line-height: 1.8; font-size: 13px;">';

  // Equipment Section
  html += addGearHeader('Equipment');
  html += `<div style="margin-left: 12px; color: #fff;">Processor:</div>`;
  Object.keys(processorGroups).forEach(procType => {
    const group = processorGroups[procType];
    if(group.processorCount > 0) {
      const allProcs = getAllProcessors();
      const proc = allProcs[procType];
      const procName = proc ? proc.name : procType;
      html += `<div style="margin-left: 24px; color: #fff;">${group.processorCount} x ${escapeHtml(procName)}</div>`;
      if(group.distBoxCount > 0 && group.distBoxName) {
        html += `<div style="margin-left: 24px; color: #fff;">${group.distBoxCount} x ${escapeHtml(group.distBoxName)}</div>`;
      }
    }
  });
  html += `<div style="margin-left: 12px; color: #fff;">Panels:</div>`;
  for(const [panelLabel, count] of Object.entries(panelsByType)) {
    if(count > 0) {
      html += `<div style="margin-left: 24px; color: #fff;">${count} x ${escapeHtml(panelLabel)}</div>`;
    }
  }

  // Rigging Hardware Section
  const hasRiggingHardware = total1wBumpers > 0 || total2wBumpers > 0 || total4wBumpers > 0 ||
                             totalPlates2way > 0 || totalPlates4way > 0 || totalShackles > 0 || totalCheeseye > 0;
  if(hasRiggingHardware) {
    html += addGearHeader('Rigging Hardware');
    html += addGearLine('1W Bumpers:', total1wBumpers);
    html += addGearLine('2W Bumpers:', total2wBumpers);
    html += addGearLine('4W Bumpers:', total4wBumpers);
    html += addGearLine('4W Connecting Plates:', totalPlates4way);
    html += addGearLine('2W Connecting Plates:', totalPlates2way);
    html += addGearLine('5/8" Shackles:', totalShackles);
    html += addGearLine('Cheeseye:', totalCheeseye);
  }

  // Ground Support Section
  const hasGroundSupport = totalRearTruss > 0 || totalBaseTruss > 0 || totalBridgeClamps > 0 ||
                           totalRearBridgeAdapters > 0 || totalSandbags > 0 || totalSwivelCheeseboroughs > 0 || totalPipes > 0;
  if(hasGroundSupport) {
    html += addGearHeader('Ground Support');
    html += addGearLine('Rear Truss:', totalRearTruss);
    html += addGearLine('Base Truss:', totalBaseTruss);
    html += addGearLine('Bridge Clamps:', totalBridgeClamps);
    html += addGearLine('Rear Bridge Adapter:', totalRearBridgeAdapters);
    html += addGearLine('Sandbags:', totalSandbags);
    html += addGearLine('Swivel Cheeseborough:', totalSwivelCheeseboroughs);
    html += addGearLine('Pipes:', totalPipes);
  }

  // Floor Hardware Section
  const hasFloorHardware = totalFrame1x1 > 0 || totalFrame2x1 > 0 || totalFrame2x2 > 0 || totalFrame3x2 > 0;
  if(hasFloorHardware) {
    html += addGearHeader('Floor Hardware');
    html += addGearLine('3×2 Frame:', totalFrame3x2);
    html += addGearLine('2×2 Frame:', totalFrame2x2);
    html += addGearLine('2×1 Frame:', totalFrame2x1);
    html += addGearLine('1×1 Frame:', totalFrame1x1);
  }

  // Aggregate cable lengths across all screens before rendering cable sections
  const combinedSocaByLength = {};
  const combinedDataByLength = {};
  const combinedDistBoxByType = {};
  let combinedServerCableLength = 0;

  selectedScreenIds.forEach(screenId => {
    const screen = screens[screenId];
    if(!screen) return;
    const cabling = calculateCabling(screenId);
    if(!cabling) return;

    // Aggregate SOCA cables by length
    (cabling.socaCables || []).forEach(s => {
      combinedSocaByLength[s.roundedFt] = (combinedSocaByLength[s.roundedFt] || 0) + 1;
    });

    // Aggregate ALL data cables by length (primary + backup + knockout)
    (cabling.dataCables || []).forEach(c => {
      combinedDataByLength[c.roundedFt] = (combinedDataByLength[c.roundedFt] || 0) + 1;
    });
    (cabling.knockoutBridgeCables || []).forEach(c => {
      combinedDataByLength[c.roundedFt] = (combinedDataByLength[c.roundedFt] || 0) + 1;
    });

    // Aggregate dist box cables
    (cabling.distBoxCables || []).forEach(c => {
      const key = `${c.type === 'fiber' ? 'Fiber' : 'Cat6A'} ${c.roundedFt}'`;
      combinedDistBoxByType[key] = (combinedDistBoxByType[key] || 0) + 1;
    });

    // Server cable: use longest value (system-wide, one run + backup)
    if(cabling.serverCable && cabling.serverCable.lengthFt > combinedServerCableLength) {
      combinedServerCableLength = cabling.serverCable.lengthFt;
    }
  });

  // If per-screen data didn't produce dist box cables, check the combined cabling config
  if(Object.keys(combinedDistBoxByType).length === 0 &&
     typeof combinedCablingConfig !== 'undefined' && combinedCablingConfig.distBoxOnWall &&
     typeof calculateCombinedCabling === 'function') {
    // Use per-screen redundancy as fallback (same as combined cable diagram)
    const ccCfg = Object.assign({}, combinedCablingConfig);
    if(!ccCfg.redundancy) {
      for(const sid of selectedScreenIds) {
        const scr = screens[sid];
        if(scr && scr.data && scr.data.redundancy) { ccCfg.redundancy = true; break; }
      }
    }
    const ccCalc = calculateCombinedCabling(selectedScreenIds, ccCfg);
    if(ccCalc && ccCalc.shared.distributionBoxCount > 0) {
      const cfg = ccCfg;
      const M_TO_FT = 3.28084;
      // Use the tallest wall height across all selected screens
      let maxWallHeightFt = 0;
      let maxWallWidthFt = 0;
      selectedScreenIds.forEach(sid => {
        const sc = screens[sid];
        if(!sc || !sc.data) return;
        const allPanelsObj = typeof getAllPanels === 'function' ? getAllPanels() : panels;
        const p = allPanelsObj[sc.data.panelType];
        if(!p) return;
        const ph = sc.data.panelsHigh || 0;
        const pw = sc.data.panelsWide || 0;
        let wH = ph * p.height_m * M_TO_FT;
        if(sc.data.addCB5HalfRow && sc.data.panelType === 'CB5_MKII') {
          const halfP = allPanelsObj['CB5_MKII_HALF'];
          if(halfP) wH += halfP.height_m * M_TO_FT;
        }
        const wW = pw * p.width_m * M_TO_FT;
        if(wH > maxWallHeightFt) maxWallHeightFt = wH;
        if(wW > maxWallWidthFt) maxWallWidthFt = wW;
      });

      const wallToFloor = cfg.wallToFloor ?? 5;
      const processorToWall = cfg.processorToWall ?? 15;
      const cablePick = cfg.cablePick ?? 0;
      const dropPos = cfg.cableDropPosition ?? 'behind';
      let dropPointFt;
      if(dropPos === 'behind') dropPointFt = maxWallWidthFt / 2;
      else if(dropPos === 'sr') dropPointFt = 0;
      else dropPointFt = maxWallWidthFt;
      const dropToFloorFt = maxWallHeightFt + wallToFloor + cablePick;

      // Main dist box position
      const mainHPos = cfg.distBoxMainHorizPosition ?? 'center';
      let mainDistBoxFt;
      if(mainHPos === 'sr') mainDistBoxFt = maxWallWidthFt * 0.15;
      else if(mainHPos === 'sl') mainDistBoxFt = maxWallWidthFt * 0.85;
      else mainDistBoxFt = maxWallWidthFt / 2;
      const mainHorizFt = Math.abs(mainDistBoxFt - dropPointFt);
      const mainVert = cfg.distBoxMainVertPosition ?? 'top';
      const mainTrunkFt = (mainVert === 'bottom')
        ? mainHorizFt + wallToFloor + processorToWall
        : mainHorizFt + dropToFloorFt + processorToWall;

      const distBoxCount = ccCalc.shared.distributionBoxCount;
      const mainType = mainTrunkFt > 200 ? 'fiber' : 'cat6a';
      const mainRounded = typeof roundUpToStandard === 'function' ? roundUpToStandard(mainTrunkFt) : Math.ceil(mainTrunkFt / 25) * 25;
      const mainKey = `${mainType === 'fiber' ? 'Fiber' : 'Cat6A'} ${mainRounded}'`;
      combinedDistBoxByType[mainKey] = (combinedDistBoxByType[mainKey] || 0) + distBoxCount;

      // Backup trunk — every dist box gets both a main and backup trunk cable
      const backupHPos = cfg.distBoxBackupHorizPosition ?? 'center';
      let backupDistBoxFt;
      if(backupHPos === 'sr') backupDistBoxFt = maxWallWidthFt * 0.15;
      else if(backupHPos === 'sl') backupDistBoxFt = maxWallWidthFt * 0.85;
      else backupDistBoxFt = maxWallWidthFt / 2;
      const backupHorizFt = Math.abs(backupDistBoxFt - dropPointFt);
      const backupVert = cfg.distBoxBackupVertPosition ?? 'top';
      const backupTrunkFt = (backupVert === 'bottom')
        ? backupHorizFt + wallToFloor + processorToWall
        : backupHorizFt + dropToFloorFt + processorToWall;
      const backupType = backupTrunkFt > 200 ? 'fiber' : 'cat6a';
      const backupRounded = typeof roundUpToStandard === 'function' ? roundUpToStandard(backupTrunkFt) : Math.ceil(backupTrunkFt / 25) * 25;
      const backupKey = `${backupType === 'fiber' ? 'Fiber' : 'Cat6A'} ${backupRounded}'`;
      combinedDistBoxByType[backupKey] = (combinedDistBoxByType[backupKey] || 0) + distBoxCount;
    }
  }

  const hasCatCables = Object.keys(combinedDataByLength).length > 0;
  const hasDistBox = Object.keys(combinedDistBoxByType).length > 0;
  const hasSocaRuns = Object.keys(combinedSocaByLength).length > 0;

  // Data Cables Section
  const hasDataCables = totalDataJumpers > 0 || totalDataCrossJumpers > 0 || totalCat5Couplers > 0 || hasCatCables || hasDistBox;
  if(hasDataCables) {
    html += addGearHeader('Data Cables');
    if(totalDataJumpers > 0 && dataJumperLen) {
      html += addGearLine(`Jumpers ${dataJumperLen}':`, totalDataJumpers);
    }
    if(totalDataCrossJumpers > 0 && dataCrossJumperLen) {
      html += addGearLine(`Cross Jumpers ${dataCrossJumperLen}':`, totalDataCrossJumpers);
    }
    html += addGearLine('Cat5 Couplers:', totalCat5Couplers);
    if(hasCatCables) {
      for(const [len, count] of Object.entries(combinedDataByLength).sort((a,b) => a[0] - b[0])) {
        html += `<div style="margin-left: 12px; color: #fff;">${count} x ${len}' Cat6</div>`;
      }
    }
    if(hasDistBox) {
      html += `<div style="margin-top: 10px;"></div>`;
      html += `<div style="margin-left: 12px; color: #fff;">Processor → Dist Box:</div>`;
      for(const [desc, count] of Object.entries(combinedDistBoxByType)) {
        html += `<div style="margin-left: 24px; color: #fff;">${count} x ${desc}</div>`;
      }
    }
  }

  // Power Cables Section
  const hasPowerCables = totalSocaSplays > 0 || totalPowerJumpers > 0 || totalTrue1Twofers > 0 || hasSocaRuns;
  if(hasPowerCables) {
    html += addGearHeader('Power Cables');
    if(totalPowerJumpers > 0 && powerJumperLen) {
      html += addGearLine(`Jumpers ${powerJumperLen}':`, totalPowerJumpers);
    }
    html += addGearLine('Soca Splays:', totalSocaSplays);
    if(hasSocaRuns) {
      for(const [len, count] of Object.entries(combinedSocaByLength).sort((a,b) => a[0] - b[0])) {
        html += `<div style="margin-left: 12px; color: #fff;">${count} x ${len}' Soca</div>`;
      }
    }
    html += `<div style="margin-top: 10px;"></div>`;
    html += addGearLine("25' True1:", totalSocaSplays);
    html += addGearLine("10' True1:", totalSocaSplays);
    html += addGearLine("5' True1:", totalSocaSplays * 2);
    html += addGearLine('True1 Twofer:', totalTrue1Twofers);
  }

  // === SYSTEM-WIDE SECTION ===
  html += `<div style="margin-top: 16px; padding-top: 8px; border-top: 2px solid #10b981;"><span style="font-family: 'Bangers', cursive; font-size: 16px; letter-spacing: 1.5px; text-transform: uppercase; color: #10b981; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;">System</span></div>`;

  // Signal Cables Section
  if(totalGroupedProcessors > 0) {
    html += addGearHeader('Signal Cables');
    const sdiPerProcessor = totalGroupedProcessors * 2;
    const sdiType = has4KCanvas ? '12G SDI' : '3G SDI';
    const sdiCounts = {};
    if(!has4KCanvas) {
      sdiCounts[100] = sdiPerProcessor;
      sdiCounts[50] = sdiPerProcessor;
      sdiCounts[25] = sdiPerProcessor;
      sdiCounts[10] = 6;
      sdiCounts[3] = 6;
    } else {
      sdiCounts[100] = sdiPerProcessor;
      sdiCounts[50] = sdiPerProcessor;
      sdiCounts[25] = sdiPerProcessor;
    }
    // Server → Processor cable: single run + backup (2 cables total)
    let serverFiberLine = null;
    if(combinedServerCableLength > 0) {
      if(combinedServerCableLength > 300) {
        const fiberLen = Math.max(500, Math.ceil(combinedServerCableLength / 100) * 100);
        serverFiberLine = { label: fiberLen + "' Fiber", count: 2 };
      } else {
        const sdiLen = roundUpToStandard(combinedServerCableLength);
        sdiCounts[sdiLen] = (sdiCounts[sdiLen] || 0) + 2;
      }
    }
    // Render SDI lines sorted by length descending
    for(const len of Object.keys(sdiCounts).map(Number).sort((a,b) => b - a)) {
      if(sdiCounts[len] > 0) {
        html += addGearLine(`${len}' ${sdiType}:`, sdiCounts[len]);
      }
    }
    // Fiber line if server cable was too long for SDI
    if(serverFiberLine) {
      html += addGearLine(`${serverFiberLine.label}:`, serverFiberLine.count);
    }
    html += addGearLine("25' HDMI:", 6);
    html += addGearLine("10' HDMI:", 6);
    html += addGearLine("6' HDMI:", 6);
  }

  // Utility Section
  html += addGearHeader('Utility');
  html += addGearLine("UG 10':", 8);
  html += addGearLine("UG 25':", 6);
  html += addGearLine("UG 50':", 6);
  html += addGearLine('UG Twofers:', 8);
  html += addGearLine('Power Bars:', 8);

  // Spares Section (panels 10%, cables/rigging 40%)
  const sparePanel = (count) => count > 0 ? Math.ceil(count * 0.1) : 0;
  const spareCable = (count) => count > 0 ? Math.ceil(count * 0.4) : 0;
  const spacer = '<div style="margin-top: 8px;"></div>';
  html += addGearHeader('SPARES');
  // Panels by type
  for(const [name, count] of Object.entries(panelsByType)) {
    const spare = sparePanel(count);
    if(spare > 0) html += addGearLine(`${name}:`, spare);
  }
  // Rigging
  html += spacer;
  html += addGearLine('Shackles:', spareCable(totalShackles));
  html += addGearLine('Cheeseyes:', spareCable(totalCheeseye));
  // Data
  html += spacer;
  if(dataCrossJumperLen) html += addGearLine(`Cross Jumpers ${dataCrossJumperLen}':`, spareCable(totalDataCrossJumpers));
  if(hasJumpersBuiltin) html += addGearLine('Cat5 Couplers:', spareCable(totalCat5Couplers));
  if(hasCatCables) {
    for(const [len, count] of Object.entries(combinedDataByLength).sort((a,b) => Number(b[0]) - Number(a[0]))) {
      html += addGearLine(`${len}' Cat6:`, spareCable(count));
    }
  }
  // Power
  html += spacer;
  html += addGearLine('Soca Splays:', spareCable(totalSocaSplays));
  html += addGearLine("25' True1:", spareCable(totalSocaSplays));
  html += addGearLine("10' True1:", spareCable(totalSocaSplays));
  html += addGearLine("5' True1:", spareCable(totalSocaSplays * 2));
  html += addGearLine('True1 Twofer:', spareCable(totalTrue1Twofers));

  html += '</div>';

  gearContent.innerHTML = html;
}

