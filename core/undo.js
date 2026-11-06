// ==================== UNDO/REDO SYSTEM ====================
// One history for the whole project, stepped by the Undo / Redo buttons in the top bar and
// Ctrl/⌘+Z (Shift+Z or Y to redo). Each step is the project as Save writes it
// (buildCurrentConfig()), taken once a change settles: shortly after any input, click, drag
// or key, and straight away wherever saveState() marks the start or end of an edit. Undo and
// Redo put a step back with applyConfiguration(), quietly, leaving the current screen,
// canvas and zoom as they are. Opening a project or entering a mode starts a new history.
// Depends on globals: undoHistory, redoHistory, MAX_HISTORY.
// undoHistory holds every step up to the current one (last = now); redoHistory the steps
// undone, last = the next Redo. Each step is {full, key}: the project to restore, and the
// part of it that counts as a change (no view state, no calculated results).

let historyCaptureTimer = null;
let historyRestoring = false;

// The project now, as a history step
function historySnapshot() {
  const config = buildCurrentConfig();
  delete config.timestamp;
  Object.values(config.screens).forEach(s => { delete s.calculatedData; });
  const full = JSON.stringify(config);
  config.currentScreenId = null;
  config.currentCanvasId = null;
  Object.values(config.canvases || {}).forEach(c => { delete c.data.zoom; delete c.data.panX; delete c.data.panY; });
  // A grid bumper also carries where it was last drawn (x, y, width, height, for picking it),
  // which changes with the view it was drawn in
  const viewOnly = function(k, v) {
    return ('startCol' in this) && (k === 'x' || k === 'y' || k === 'width' || k === 'height') ? undefined : v;
  };
  return {full, key: JSON.stringify(config, viewOnly)};
}

// Records the project as a new step when it has changed since the last one
function captureHistory() {
  clearTimeout(historyCaptureTimer);
  historyCaptureTimer = null;
  if(historyRestoring) return;
  const step = historySnapshot();
  const last = undoHistory[undoHistory.length - 1];
  if(last && last.key === step.key) return;
  undoHistory.push(step);
  if(undoHistory.length > MAX_HISTORY + 1) undoHistory.shift();
  redoHistory = [];
  updateUndoRedoButtons();
}

// A change has probably just been made: record it once things settle (typing pauses, a
// drag ends), or straight after the code making it has run (delay 0)
function scheduleHistoryCapture(delay) {
  clearTimeout(historyCaptureTimer);
  historyCaptureTimer = setTimeout(captureHistory, typeof delay === 'number' ? delay : 400);
}

// Starts a new history from the project as it will stand once it settles
function resetHistory() {
  undoHistory = [];
  redoHistory = [];
  updateUndoRedoButtons();
  scheduleHistoryCapture();
}

// Marks the edge of an edit: whatever came before becomes its own step, and the change
// about to be made is recorded as soon as the code making it has run
function saveState() {
  captureHistory();
  scheduleHistoryCapture(0);
}

// Puts a step back as the project, keeping the view the user is on
function restoreHistoryStep(step) {
  const config = JSON.parse(step.full);
  if(config.screens[currentScreenId]) config.currentScreenId = currentScreenId;
  if(typeof currentCanvasId !== 'undefined' && config.canvases && config.canvases[currentCanvasId]) config.currentCanvasId = currentCanvasId;
  Object.keys(config.canvases || {}).forEach(id => {
    const now = (typeof canvases !== 'undefined' && canvases[id] && canvases[id].data) || null;
    if(!now) return;
    ['zoom', 'panX', 'panY'].forEach(f => { if(typeof now[f] === 'number') config.canvases[id].data[f] = now[f]; });
  });
  historyRestoring = true;
  const wasManualBumpers = manualBumperMode;
  if(typeof selectedBumpers !== 'undefined') selectedBumpers.clear();
  if(typeof freeSelected !== 'undefined') freeSelected.clear();
  applyConfiguration(config, undefined, {quiet: true});
  // Reloading the screen leaves Manually Distribute Bumpers; stay in it
  if(wasManualBumpers && !manualBumperMode) toggleManualBumperMode();
  // applyConfiguration() refreshes the Combined view a moment later; once it has, take the
  // step again as the app now holds it so the next change is measured against that
  setTimeout(() => {
    historyRestoring = false;
    undoHistory[undoHistory.length - 1] = historySnapshot();
    updateUndoRedoButtons();
  }, 150);
}

function undo() {
  if(historyRestoring) return;
  captureHistory();
  if(undoHistory.length < 2) return;
  redoHistory.push(undoHistory.pop());
  restoreHistoryStep(undoHistory[undoHistory.length - 1]);
}

function redo() {
  if(historyRestoring) return;
  captureHistory();
  if(redoHistory.length === 0) return;
  const step = redoHistory.pop();
  undoHistory.push(step);
  restoreHistoryStep(step);
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');

  if(undoBtn) {
    undoBtn.disabled = undoHistory.length < 2;
  }
  if(redoBtn) {
    redoBtn.disabled = redoHistory.length === 0;
  }
}

// Any input, click, drag or key may have changed the project
['input', 'change', 'pointerup', 'keyup'].forEach(type => document.addEventListener(type, () => scheduleHistoryCapture(), true));
