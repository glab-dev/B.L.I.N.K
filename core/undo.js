// ==================== UNDO/REDO SYSTEM ====================
// Panel undo/redo for standard layout changes.
// Depends on globals: undoHistory, redoHistory, MAX_HISTORY, deletedPanels,
// selectedPanels, customCircuitAssignments, customDataLineAssignments.

function saveState() {
  const state = {
    deletedPanels: new Set(deletedPanels),
    selectedPanels: new Set(selectedPanels),
    customCircuitAssignments: new Map(customCircuitAssignments),
    customDataLineAssignments: new Map(customDataLineAssignments)
  };
  
  undoHistory.push(state);
  if(undoHistory.length > MAX_HISTORY) {
    undoHistory.shift();
  }
  
  // Clear redo history when new action is performed
  redoHistory = [];
  updateUndoRedoButtons();
}

function undo() {
  if(undoHistory.length === 0) return;
  
  // Save current state to redo history
  const currentState = {
    deletedPanels: new Set(deletedPanels),
    selectedPanels: new Set(selectedPanels),
    customCircuitAssignments: new Map(customCircuitAssignments),
    customDataLineAssignments: new Map(customDataLineAssignments)
  };
  redoHistory.push(currentState);
  
  // Restore previous state
  const previousState = undoHistory.pop();
  deletedPanels = new Set(previousState.deletedPanels);
  selectedPanels = new Set(previousState.selectedPanels);
  customCircuitAssignments = new Map(previousState.customCircuitAssignments);
  customDataLineAssignments = new Map(previousState.customDataLineAssignments);
  
  // Sync deleted panels to current screen data for canvas view
  if(screens[currentScreenId]) {
    screens[currentScreenId].data.deletedPanels = new Set(deletedPanels);
  }
  
  // Regenerate all layouts without calling calculate (which would reset redo stack)
  generateLayout('standard');
  generateLayout('power');
  generateLayout('data');
  generateStructureLayout();
  
  // Update canvas view to reflect changes
  showCanvasView();
  if(selectedCanvasScreenId) {
    drawSelectionHighlight();
  }
  
  updateUndoRedoButtons();
}

function redo() {
  if(redoHistory.length === 0) return;
  
  // Save current state to undo history
  const currentState = {
    deletedPanels: new Set(deletedPanels),
    selectedPanels: new Set(selectedPanels),
    customCircuitAssignments: new Map(customCircuitAssignments),
    customDataLineAssignments: new Map(customDataLineAssignments)
  };
  undoHistory.push(currentState);
  
  // Restore next state
  const nextState = redoHistory.pop();
  deletedPanels = new Set(nextState.deletedPanels);
  selectedPanels = new Set(nextState.selectedPanels);
  customCircuitAssignments = new Map(nextState.customCircuitAssignments);
  customDataLineAssignments = new Map(nextState.customDataLineAssignments);
  
  // Sync deleted panels to current screen data for canvas view
  if(screens[currentScreenId]) {
    screens[currentScreenId].data.deletedPanels = new Set(deletedPanels);
  }
  
  // Regenerate all layouts without calling calculate (which would reset redo stack)
  generateLayout('standard');
  generateLayout('power');
  generateLayout('data');
  generateStructureLayout();
  
  // Update canvas view to reflect changes
  showCanvasView();
  if(selectedCanvasScreenId) {
    drawSelectionHighlight();
  }
  
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  
  if(undoBtn) {
    undoBtn.disabled = undoHistory.length === 0;
  }
  if(redoBtn) {
    redoBtn.disabled = redoHistory.length === 0;
  }
}

