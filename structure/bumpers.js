// ==================== BUMPER MANAGEMENT ====================
// Structure type handling, bumper initialization, CRUD, context menus.
// Depends on globals: bumpers, nextBumperId, showTopBumper, showBottomBumper,
// useBumpers, manualBumperMode, selectedBumpers, structureHistory, etc.

// Structure type and legacy bumper functions
// Structure functions
function updateBumpersFromStructureType() {
  const structureType = document.getElementById('structureType').value;

  if(structureType === 'hanging') {
    showTopBumper = true;
    showBottomBumper = false;
  } else if(structureType === 'floor') {
    // Floor panels don't use bumpers - they use floor frames
    showTopBumper = false;
    showBottomBumper = false;
  } else { // ground
    showTopBumper = false;
    showBottomBumper = true;
  }

  // Re-initialize bumpers when structure type changes (not for floor)
  const pw = parseInt(document.getElementById('panelsWide').value) || 0;
  if(pw > 0 && structureType !== 'floor') {
    initializeBumpers();
  }

  updateStructureVisualization();
  updateWeightDisplay();
}

function set1wColumn() {
  const input = document.getElementById('bumper1wColumnInput');
  const col = parseInt(input.value);
  const W = parseInt(document.getElementById('panelsWide').value) || 0;
  
  if(col >= 1 && col <= W) {
    const structureType = document.getElementById('structureType').value;
    
    if(structureType === 'hanging') {
      topBumper1wColumn = col - 1; // Convert to 0-indexed
    } else { // ground
      bottomBumper1wColumn = col - 1;
    }
    
    updateStructureVisualization();
    updateWeightDisplay();
  } else {
    showAlert(`Please enter a column number between 1 and ${W}`);
  }
}

function clear1wColumn() {
  const structureType = document.getElementById('structureType').value;
  
  if(structureType === 'hanging') {
    topBumper1wColumn = -1;
  } else { // ground
    bottomBumper1wColumn = -1;
  }
  
  const input = document.getElementById('bumper1wColumnInput');
  if(input) input.value = '';
  
  updateStructureVisualization();
  updateWeightDisplay();
}

function updateStructureVisualization() {
  const canvas = document.getElementById('structureCanvas');
  if(canvas && canvas.width > 0) {
    generateStructureLayout();
  }
}

// ==================== COMPREHENSIVE BUMPER MANAGEMENT SYSTEM v23 ====================
// Initialize bumpers based on structure configuration
function initializeBumpers() {
  // Skip if bumpers are disabled
  if(!useBumpers) {
    bumpers = [];
    showTopBumper = false;
    showBottomBumper = false;
    return;
  }
  
  const pw = parseInt(document.getElementById('panelsWide').value) || 0;
  const ph = parseInt(document.getElementById('panelsHigh').value) || 0;
  const use4Way = use4WayBumpersEnabled;
  const panelType = document.getElementById('panelType').value;
  const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';
  const allP = getAllPanels();
  const pSpec = allP[panelType];
  const supports4w = isCB5 || (pSpec && pSpec.custom && pSpec.supports_4w_bumpers);

  console.log('Initializing bumpers:', {pw, ph, use4Way, supports4w, showTopBumper, showBottomBumper});
  
  bumpers = [];
  nextBumperId = 1;
  
  // Reset the bumpersInitialized flag for current screen since we're creating fresh bumpers
  // This will be set back to true when saveCurrentScreenData() runs
  if(screens[currentScreenId] && screens[currentScreenId].data) {
    screens[currentScreenId].data.bumpersInitialized = false;
  }
  
  if(pw === 0) {
    console.log('Width is 0, skipping bumper initialization');
    return;
  }
  
  // Initialize top bumpers
  if(showTopBumper) {
    console.log('Adding top bumpers...');
    if(use4Way && supports4w) {
      // Add 4W bumpers first - each spans from center of one 2W to center of next 2W
      // This covers 2 columns (2 panel widths) per 4W bumper
      const fourWayCount = Math.floor(pw / 4);
      for(let i = 0; i < fourWayCount; i++) {
        // Each 4W spans from center of 2W at (i*4, i*4+1) to center of 2W at (i*4+2, i*4+3)
        // First 2W center: (i*4 + 0.5 + i*4 + 1.5)/2 = i*4 + 1
        // Second 2W center: (i*4 + 2.5 + i*4 + 3.5)/2 = i*4 + 3
        bumpers.push({
          id: nextBumperId++,
          type: '4w',
          position: 'top',
          startCol: i * 4 + 1,      // Center of first 2W: 1, 5, 9...
          endCol: i * 4 + 3         // Center of second 2W: 3, 7, 11...
        });
      }
      
      // Add 2W bumpers - one per pair of columns
      const num2WBumpers = Math.floor(pw / 2);
      for(let i = 0; i < num2WBumpers; i++) {
        bumpers.push({
          id: nextBumperId++,
          type: '2w',
          position: 'top',
          startCol: i * 2,
          endCol: i * 2 + 1
        });
      }
      
      // Add 1W bumper for odd last column
      if(pw % 2 === 1) {
        bumpers.push({
          id: nextBumperId++,
          type: '1w',
          position: 'top',
          startCol: pw - 1,
          endCol: pw - 1
        });
      }
    } else {
      // Just 2W bumpers - one per pair of columns
      const num2WBumpers = Math.floor(pw / 2);
      for(let i = 0; i < num2WBumpers; i++) {
        bumpers.push({
          id: nextBumperId++,
          type: '2w',
          position: 'top',
          startCol: i * 2,
          endCol: i * 2 + 1
        });
      }
      
      // Add 1W bumper for odd last column
      if(pw % 2 === 1) {
        bumpers.push({
          id: nextBumperId++,
          type: '1w',
          position: 'top',
          startCol: pw - 1,
          endCol: pw - 1
        });
      }
    }
  }
  
  // Initialize bottom bumpers
  if(showBottomBumper) {
    console.log('Adding bottom bumpers...');
    if(use4Way && supports4w) {
      // Add 2W bumpers - one per pair of columns
      const num2WBumpers = Math.floor(pw / 2);
      for(let i = 0; i < num2WBumpers; i++) {
        bumpers.push({
          id: nextBumperId++,
          type: '2w',
          position: 'bottom',
          startCol: i * 2,
          endCol: i * 2 + 1
        });
      }
      
      // Add 1W bumper for odd last column
      if(pw % 2 === 1) {
        bumpers.push({
          id: nextBumperId++,
          type: '1w',
          position: 'bottom',
          startCol: pw - 1,
          endCol: pw - 1
        });
      }
      
      // Add 4W bumpers - each spans from center of one 2W to center of next 2W
      const fourWayCount = Math.floor(pw / 4);
      for(let i = 0; i < fourWayCount; i++) {
        bumpers.push({
          id: nextBumperId++,
          type: '4w',
          position: 'bottom',
          startCol: i * 4 + 1,      // Center of first 2W: 1, 5, 9...
          endCol: i * 4 + 3         // Center of second 2W: 3, 7, 11...
        });
      }
    } else {
      // Just 2W bumpers - one per pair of columns
      const num2WBumpers = Math.floor(pw / 2);
      for(let i = 0; i < num2WBumpers; i++) {
        bumpers.push({
          id: nextBumperId++,
          type: '2w',
          position: 'bottom',
          startCol: i * 2,
          endCol: i * 2 + 1
        });
      }
      
      // Add 1W bumper for odd last column
      if(pw % 2 === 1) {
        bumpers.push({
          id: nextBumperId++,
          type: '1w',
          position: 'bottom',
          startCol: pw - 1,
          endCol: pw - 1
        });
      }
    }
  }
  
  console.log(`Initialized ${bumpers.length} bumpers:`, bumpers);
}

// Get bumper at mouse position
function getBumperAtMouse(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  
  // Check bumpers in reverse order (top-most first)
  for(let i = bumpers.length - 1; i >= 0; i--) {
    const bumper = bumpers[i];
    
    // Check if bumper has position data (use undefined check, not falsy check since y can be 0)
    if(bumper.x === undefined || bumper.y === undefined || 
       bumper.width === undefined || bumper.height === undefined) continue;
    
    if(x >= bumper.x && x <= bumper.x + bumper.width &&
       y >= bumper.y && y <= bumper.y + bumper.height) {
      return bumper;
    }
  }
  
  return null;
}

// Create and show context menu
function showBumperContextMenu(bumper, x, y) {
  hideContextMenu();
  
  const menu = document.createElement('div');
  menu.id = 'bumperContextMenu';
  menu.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: #242424;
    border: 1px solid #555;
    border-radius: 6px;
    padding: 4px 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 10000;
    min-width: 180px;
    font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
  `;
  
  const options = [];
  
  // Type-specific options
  if(bumper.type === '2w') {
    options.push({
      label: `Replace with 1W Bumper`,
      action: () => replaceBumperType(bumper.id, '1w')
    });
    
    // Add option to move ladder hardware to other column (only for bottom 2W bumpers)
    if(bumper.position === 'bottom') {
      const currentLadderCol = bumper.ladderColumn === 'right' ? 'right (col ' + (bumper.endCol + 1) + ')' : 'left (col ' + (bumper.startCol + 1) + ')';
      const targetCol = bumper.ladderColumn === 'right' ? 'left' : 'right';
      const targetColNum = bumper.ladderColumn === 'right' ? bumper.startCol + 1 : bumper.endCol + 1;
      options.push({
        label: `Move Ladder to Col ${targetColNum}`,
        action: () => toggleBumperLadderColumn(bumper.id)
      });
    }
  } else if(bumper.type === '1w') {
    options.push({
      label: `Replace with 2W Bumper`,
      action: () => replaceBumperType(bumper.id, '2w')
    });
  }
  
  options.push({ separator: true });
  
  options.push({
    label: `Delete Bumper`,
    danger: true,
    action: () => deleteBumper(bumper.id)
  });
  
  options.forEach(opt => {
    if(opt.separator) {
      const sep = document.createElement('div');
      sep.style.cssText = 'height: 1px; background: #383838; margin: 4px 0;';
      menu.appendChild(sep);
    } else {
      const item = document.createElement('div');
      item.textContent = opt.label;
      item.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        color: ${opt.danger ? '#ff6b6b' : '#e0e0e0'};
        font-size: 13px;
      `;
      
      item.addEventListener('mouseenter', function() {
        this.style.background = opt.danger ? '#4a2020' : '#3a3a3a';
      });
      
      item.addEventListener('mouseleave', function() {
        this.style.background = 'transparent';
      });
      
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        opt.action();
        hideContextMenu();
      });
      
      menu.appendChild(item);
    }
  });
  
  document.body.appendChild(menu);
  contextMenuVisible = true;
  
  // Adjust if off-screen
  const menuRect = menu.getBoundingClientRect();
  if(menuRect.right > window.innerWidth) {
    menu.style.left = (window.innerWidth - menuRect.width - 10) + 'px';
  }
  if(menuRect.bottom > window.innerHeight) {
    menu.style.top = (window.innerHeight - menuRect.height - 10) + 'px';
  }
}

// Toggle which column the ladder hardware is on for a 2W bumper
function toggleBumperLadderColumn(bumperId) {
  const bumper = bumpers.find(b => b.id === bumperId);
  if(!bumper || bumper.type !== '2w') return;
  
  // Toggle between left (default/undefined) and right
  bumper.ladderColumn = bumper.ladderColumn === 'right' ? 'left' : 'right';
  
  // Redraw structure layout
  generateStructureLayout();
}

function hideContextMenu() {
  const menu = document.getElementById('bumperContextMenu');
  if(menu && menu.parentNode) {
    menu.parentNode.removeChild(menu);
  }
  contextMenuVisible = false;
}

// Toggle manual bumper distribution mode
function toggleManualBumperMode() {
  manualBumperMode = !manualBumperMode;
  
  const toggleBtn = document.getElementById('manualBumperToggle');
  const hintSpan = document.getElementById('structureModeHint');
  const selectionInfo = document.getElementById('structureSelectionInfo');
  const undoRedoDiv = document.getElementById('structureUndoRedo');
  
  if(manualBumperMode) {
    toggleBtn.classList.add('active');
    toggleBtn.textContent = '✓ Manual Mode Active';
    hintSpan.textContent = 'Click bumpers to select';
    selectionInfo.classList.add('visible');
    undoRedoDiv.style.display = 'flex';
    
    // Save initial state when entering manual mode
    saveStructureState();
    updateStructureUndoRedoButtons();
  } else {
    toggleBtn.classList.remove('active');
    toggleBtn.textContent = 'Manually Distribute Bumpers';
    hintSpan.textContent = 'Auto-distribution active';
    selectionInfo.classList.remove('visible');
    undoRedoDiv.style.display = 'none';
    
    // Clear selections when exiting manual mode
    selectedBumpers.clear();
    selectedBumper = null;
  }
  
  // Redraw to show/hide selection highlights
  generateStructureLayout();
}

// Get panel at mouse position in structure canvas
function getStructurePanelAtMouse(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);

  // Get proper panel dimensions for structure layout
  const panelType = document.getElementById('panelType').value;
  const heightRatio = getPanelHeightRatio(panelType);
  const size = panelSize; // Base size for scaling
  const panelWidth = size;
  const panelHeight = size * heightRatio;
  
  const {pw, ph} = getEffectivePanelCountsForLayout();

  // Calculate panel Y offset (accounting for top bumpers)
  const bumperHeight = Math.max(30, size * 0.8);
  const fourWayHeight = Math.max(15, size * 0.4);
  const fourWayGap = Math.max(3, size * 0.1);
  const use4Way = use4WayBumpersEnabled;
  const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';
  const allPnls = getAllPanels();
  const pnlSpec = allPnls[panelType];
  const supports4wViz = isCB5 || (pnlSpec && pnlSpec.custom && pnlSpec.supports_4w_bumpers);

  let panelYOffset = 0;
  if(showTopBumper) {
    panelYOffset += bumperHeight;
    if(use4Way && supports4wViz) panelYOffset += fourWayHeight + fourWayGap;
  }
  
  // Check if click is in panel area
  if(y < panelYOffset || y >= panelYOffset + ph * panelHeight) return null;
  if(x < 0 || x >= pw * panelWidth) return null;
  
  const col = Math.floor(x / panelWidth);
  const row = Math.floor((y - panelYOffset) / panelHeight);
  
  if(col < 0 || col >= pw || row < 0 || row >= ph) return null;
  
  const panelKey = `${col},${row}`;
  
  // Don't select deleted panels
  if(deletedPanels.has(panelKey)) return null;
  
  return {
    col: col,
    row: row,
    key: panelKey,
    x: col * panelWidth,
    y: panelYOffset + row * panelHeight
  };
}

// Get all panels in a rectangle (for drag selection in structure view)
function getStructurePanelsInRect(startX, startY, endX, endY) {
  const canvas = document.getElementById('structureCanvas');
  if(!canvas) return [];
  
  const rect = canvas.getBoundingClientRect();
  const x1 = (Math.min(startX, endX) - rect.left) * (canvas.width / rect.width);
  const y1 = (Math.min(startY, endY) - rect.top) * (canvas.height / rect.height);
  const x2 = (Math.max(startX, endX) - rect.left) * (canvas.width / rect.width);
  const y2 = (Math.max(startY, endY) - rect.top) * (canvas.height / rect.height);

  const size = panelSize; // Use global panelSize for consistent sizing
  const {pw, ph} = getEffectivePanelCountsForLayout();

  // Calculate panel Y offset
  const bumperHeight = Math.max(30, size * 0.8);
  const fourWayHeight = Math.max(15, size * 0.4);
  const fourWayGap = Math.max(3, size * 0.1);
  const use4Way = use4WayBumpersEnabled;
  const panelType = document.getElementById('panelType').value;
  const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';
  const allPnls2 = getAllPanels();
  const pnlSpec2 = allPnls2[panelType];
  const supports4wViz2 = isCB5 || (pnlSpec2 && pnlSpec2.custom && pnlSpec2.supports_4w_bumpers);

  let panelYOffset = 0;
  if(showTopBumper) {
    panelYOffset += bumperHeight;
    if(use4Way && supports4wViz2) panelYOffset += fourWayHeight + fourWayGap;
  }

  const panels = [];
  
  for(let col = 0; col < pw; col++) {
    for(let row = 0; row < ph; row++) {
      const panelX = col * size;
      const panelY = panelYOffset + row * size;
      
      // Check if panel intersects with selection rectangle
      if(panelX + size > x1 && panelX < x2 && 
         panelY + size > y1 && panelY < y2) {
        const panelKey = `${col},${row}`;
        if(!deletedPanels.has(panelKey)) {
          panels.push({
            col: col,
            row: row,
            key: panelKey
          });
        }
      }
    }
  }
  
  return panels;
}

// Update the structure selection info display
function updateStructureSelectionInfo() {
  const infoDiv = document.getElementById('structureSelectionInfo');
  if(!infoDiv) return;
  
  if(!manualBumperMode) {
    infoDiv.classList.remove('visible');
    return;
  }
  
  const bumperCount = selectedBumpers.size;
  
  let text = '<strong>Manual Mode:</strong> ';
  
  if(bumperCount === 0) {
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isMobile = window.innerWidth <= 768;
    if(isTouchDevice || isMobile) {
      text += '<span id="structureHintText">Tap to select • Tap again for options • Hold to drag</span>';
    } else {
      text += '<span id="structureHintText">Click to select • Right-click for options • Drag to move</span>';
    }
  } else {
    text += `Selected: ${bumperCount} bumper${bumperCount > 1 ? 's' : ''}`;
  }

  infoDiv.innerHTML = text;
  infoDiv.classList.add('visible');
}

// Structure undo/redo functions
function saveStructureState() {
  // Don't save if not in manual mode
  if(!manualBumperMode) return;
  
  // Create a deep copy of the bumpers array
  const state = {
    bumpers: bumpers.map(b => ({...b})),
    nextBumperId: nextBumperId
  };
  
  // Remove any states after current index (when we make a new change after undoing)
  if(structureHistoryIndex < structureHistory.length - 1) {
    structureHistory = structureHistory.slice(0, structureHistoryIndex + 1);
  }
  
  // Add new state
  structureHistory.push(state);
  
  // Limit history size
  if(structureHistory.length > MAX_STRUCTURE_HISTORY) {
    structureHistory.shift();
  } else {
    structureHistoryIndex++;
  }
  
  updateStructureUndoRedoButtons();
}

function structureUndo() {
  if(structureHistoryIndex <= 0) return;
  
  structureHistoryIndex--;
  restoreStructureState(structureHistory[structureHistoryIndex]);
}

function structureRedo() {
  if(structureHistoryIndex >= structureHistory.length - 1) return;
  
  structureHistoryIndex++;
  restoreStructureState(structureHistory[structureHistoryIndex]);
}

function restoreStructureState(state) {
  if(!state) return;
  
  // Restore bumpers
  bumpers = state.bumpers.map(b => ({...b}));
  nextBumperId = state.nextBumperId;
  
  // Clear selections
  selectedBumpers.clear();
  selectedBumper = null;
  
  // Redraw
  generateStructureLayout();
  updateWeightDisplay();
  updateStructureUndoRedoButtons();
  updateStructureSelectionInfo();
}

function updateStructureUndoRedoButtons() {
  const undoBtn = document.getElementById('structureUndoBtn');
  const redoBtn = document.getElementById('structureRedoBtn');
  
  if(undoBtn) {
    undoBtn.disabled = structureHistoryIndex <= 0;
  }
  if(redoBtn) {
    redoBtn.disabled = structureHistoryIndex >= structureHistory.length - 1;
  }
}

// Bumper manipulation functions
function replaceBumperType(bumperId, newType) {
  const bumper = bumpers.find(b => b.id === bumperId);
  if(!bumper) return;
  
  saveStructureState(); // Save before change
  bumper.type = newType;
  generateStructureLayout();
  updateWeightDisplay();
  calculate();
}

function deleteBumper(bumperId) {
  saveStructureState(); // Save before change
  bumpers = bumpers.filter(b => b.id !== bumperId);
  selectedBumpers.delete(bumperId);
  generateStructureLayout();
  updateWeightDisplay();
  calculate();
}

function startMovingBumper(bumperId) {
  const bumper = bumpers.find(b => b.id === bumperId);
  if(!bumper) return;
  
  selectedBumper = bumper;
  // Visual feedback will be added in the draw function
  generateStructureLayout();
}

function addBumperAtColumn(position, type, column) {
  const pw = parseInt(document.getElementById('panelsWide').value) || 0;
  if(column < 0 || column >= pw) return;
  
  let endCol = column;
  if(type === '2w' || type === '4w') {
    endCol = column + 1;
    // Make sure we don't exceed panel width
    if(endCol >= pw) {
      endCol = pw - 1;
    }
  }
  
  // Check if bumper already exists at this position
  const exists = bumpers.some(b => 
    b.position === position && 
    b.type === type && 
    b.startCol === column
  );
  
  if(!exists) {
    saveStructureState(); // Save before change
    bumpers.push({
      id: nextBumperId++,
      type: type,
      position: position,
      startCol: column,
      endCol: endCol
    });
    
    generateStructureLayout();
    updateWeightDisplay();
    calculate();
  }
}

// Show empty area context menu for adding bumpers
function showEmptyAreaContextMenu(position, column, x, y) {
  hideContextMenu();
  
  const use4Way = use4WayBumpersEnabled;
  const panelType = document.getElementById('panelType').value;
  const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';
  const allPnlsCtx = getAllPanels();
  const pnlCtx = allPnlsCtx[panelType];
  const supports4wCtx = isCB5 || (pnlCtx && pnlCtx.custom && pnlCtx.supports_4w_bumpers);
  const pw = parseInt(document.getElementById('panelsWide').value) || 0;

  const menu = document.createElement('div');
  menu.id = 'bumperContextMenu';
  menu.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: #242424;
    border: 1px solid #555;
    border-radius: 6px;
    padding: 4px 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 10000;
    min-width: 180px;
    font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
  `;
  
  const options = [
    {
      label: `Add 2W Bumper at Columns ${column + 1}-${column + 2}`,
      action: () => addBumperAtColumn(position, '2w', column)
    },
    {
      label: `Add 1W Bumper at Column ${column + 1}`,
      action: () => addBumperAtColumn(position, '1w', column)
    }
  ];
  
  // Add 4W option for CB5 and custom panels with 4W support
  if(supports4wCtx && column + 1 < pw) {
    options.push({
      label: `Add 4W Bumper at Columns ${column + 1}-${column + 2}`,
      action: () => addBumperAtColumn(position, '4w', column)
    });
  }
  
  options.forEach(opt => {
    const item = document.createElement('div');
    item.textContent = opt.label;
    item.style.cssText = `
      padding: 8px 16px;
      cursor: pointer;
      color: #e0e0e0;
      font-size: 13px;
    `;
    
    item.addEventListener('mouseenter', function() {
      this.style.background = '#3a3a3a';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.background = 'transparent';
    });
    
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      opt.action();
      hideContextMenu();
    });
    
    menu.appendChild(item);
  });
  
  document.body.appendChild(menu);
  contextMenuVisible = true;
  
  // Adjust if off-screen
  const menuRect = menu.getBoundingClientRect();
  if(menuRect.right > window.innerWidth) {
    menu.style.left = (window.innerWidth - menuRect.width - 10) + 'px';
  }
  if(menuRect.bottom > window.innerHeight) {
    menu.style.top = (window.innerHeight - menuRect.height - 10) + 'px';
  }
}

// ==================== END BUMPER MANAGEMENT SYSTEM ====================

