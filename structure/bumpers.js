// ==================== BUMPER MANAGEMENT ====================
// Structure type handling, bumper initialization, CRUD, context menus.
// Depends on globals: bumpers, nextBumperId, showTopBumper, showBottomBumper,
// useBumpers, manualBumperMode, selectedBumpers, etc.

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

// The bumper column count: the same column count the structure canvas draws. Reading
// panelsWide directly drifts from the grid whenever the wall fields drive the count (panel
// type change, aspect-ratio lock, dimension mode) and leaves bumpers overhanging the wall.
function bumperColumnCount() {
  const hasDimensions = !!(document.getElementById('panelsWide').value || document.getElementById('wallWidth').value);
  // Half columns (V4ST-V) are columns of panels too: a 2W carries two panels whatever their width
  const halfCols = getCurrentHalfCols();
  return hasDimensions ? getEffectivePanelCounts().pw + halfCols.left + halfCols.right : 0;
}

// The automatic bumpers along one edge of a wall pw columns wide, left to right: two columns
// to a 2W when their edge panels (the first live panel down each column from the top, or up
// from the bottom) are on the same row, else a 1W on the first - a 2W can't sit on two rows -
// and pairing goes on from the next. With 4Ws, each two touching 2Ws are joined by one, from
// the centre of one to the centre of the other. `plain` ignores knocked-out panels (the
// pairing used before knock-outs were followed). 4Ws first: [{type, startCol, endCol}]
function autoBumperLayout(pw, position, with4w, plain) {
  const ph = getEffectivePanelCountsForLayout().ph;
  const edgeRow = c => plain ? 0 : (position === 'top' ? getFirstNonDeletedRow(c, ph) : getLastNonDeletedRow(c, ph));
  const pieces = [];
  for(let c = 0; c < pw; c++) {
    if(c + 1 < pw && edgeRow(c) === edgeRow(c + 1)) {
      pieces.push({type: '2w', startCol: c, endCol: c + 1});
      c++;
    } else {
      pieces.push({type: '1w', startCol: c, endCol: c});
    }
  }
  const fours = [];
  if(with4w) {
    for(let i = 0; i + 1 < pieces.length; i++) {
      if(pieces[i].type !== '2w' || pieces[i + 1].type !== '2w') continue;
      fours.push({type: '4w', startCol: pieces[i].startCol + 1, endCol: pieces[i + 1].startCol + 1});
      i++;
    }
  }
  return fours.concat(pieces);
}

// The current screen's automatic bumpers, without ids: the top edge's (4Ws first) on a hung
// wall, the bottom edge's on a ground stack, which never takes 4W bumpers
function autoBumpers(pw, plain) {
  const panelType = document.getElementById('panelType').value;
  const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';
  const pSpec = getAllPanels()[panelType];
  const with4w = use4WayBumpersEnabled && (isCB5 || !!(pSpec && pSpec.custom && pSpec.supports_4w_bumpers));
  const list = [];
  const add = (position, layout) => layout.forEach(b => {
    list.push({type: b.type, position: position, startCol: b.startCol, endCol: b.endCol});
  });
  if(showTopBumper) add('top', autoBumperLayout(pw, 'top', with4w, plain));
  if(showBottomBumper) add('bottom', autoBumperLayout(pw, 'bottom', false, plain));
  return list;
}

// A bumper layout as one string, to tell whether it is still the one auto-distribution made
function bumperLayoutSig(list) {
  return list.map(b => `${b.position}:${b.type}:${b.startCol}-${b.endCol}:${b.ladderColumn || ''}`).sort().join('|');
}

// Automatic bumpers follow the panels they sit on: while the current screen's bumpers are
// still the ones auto-distribution made (none added, moved, changed or deleted by hand since),
// they are laid out again whenever panels are knocked out or put back. Screens saved before
// this was tracked count as automatic when theirs are the plain left-to-right pairing.
function reconcileBumpersToKnockouts() {
  if(!useBumpers || !screens[currentScreenId] || !screens[currentScreenId].data) return false;
  const pw = bumperColumnCount();
  if(pw <= 0) return false;
  const data = screens[currentScreenId].data;
  const sig = bumperLayoutSig(bumpers);
  const untouched = typeof data.bumperAutoSig === 'string'
    ? sig === data.bumperAutoSig
    : sig === bumperLayoutSig(autoBumpers(pw, true));
  if(!untouched) return false;
  const fresh = autoBumpers(pw, false);
  data.bumperAutoSig = bumperLayoutSig(fresh);
  if(data.bumperAutoSig === sig) return false;
  bumpers = fresh.map(b => Object.assign({id: nextBumperId++}, b));
  return true;
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
  
  const pw = bumperColumnCount();
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
  bumpersWidth = pw;

  // Reset the bumpersInitialized flag for current screen since we're creating fresh bumpers
  // This will be set back to true when saveCurrentScreenData() runs
  if(screens[currentScreenId] && screens[currentScreenId].data) {
    screens[currentScreenId].data.bumpersInitialized = false;
  }
  
  if(pw === 0) {
    console.log('Width is 0, skipping bumper initialization');
    return;
  }
  
  autoBumpers(pw, false).forEach(b => {
    bumpers.push(Object.assign({id: nextBumperId++}, b));
  });
  if(screens[currentScreenId] && screens[currentScreenId].data) {
    screens[currentScreenId].data.bumperAutoSig = bumperLayoutSig(bumpers);
  }
  
  console.log(`Initialized ${bumpers.length} bumpers:`, bumpers);
}

// Repair a saved bumper array against the column count actually being drawn. The array is a
// snapshot, so anything that changes the effective width without re-running initializeBumpers()
// - panel type change, aspect-ratio lock, dimension mode switch, or a duplicated screen that
// inherited bumpersInitialized - leaves bumpers hanging off the edge of the wall (a 2W drawn
// and gear-listed where a 1W belongs) or trailing columns with nothing above them.
// Repairs in place so manual distribution on columns that still exist survives.
function reconcileBumpersToWidth(pw) {
  if(!useBumpers || bumpers.length === 0 || pw <= 0) return false;

  let changed = false;
  const kept = [];

  bumpers.forEach(bumper => {
    // Starts past the last column - nothing of it is on the wall
    if(bumper.startCol < 0 || bumper.startCol >= pw) { changed = true; return; }

    // A ground-stacked wall never takes 4W bumpers (projects saved before this was enforced)
    if(bumper.type === '4w' && bumper.position === 'bottom') { changed = true; return; }

    // Measure a 1W/2W from its type, not its stored endCol - drawAllBumpers() sizes by type,
    // so a bumper whose endCol disagrees would otherwise be drawn overhanging unnoticed
    if(bumper.type === '2w' && bumper.startCol + 1 >= pw) {
      // Only its left column still exists, so it is a 1W now
      bumper.type = '1w';
      bumper.endCol = bumper.startCol;
      changed = true;
    } else if(bumper.type === '2w' && bumper.endCol !== bumper.startCol + 1) {
      bumper.endCol = bumper.startCol + 1; // fits, but endCol had drifted
      changed = true;
    } else if(bumper.type === '1w' && bumper.endCol !== bumper.startCol) {
      bumper.endCol = bumper.startCol;
      changed = true;
    } else if(bumper.type === '4w' && bumper.endCol >= pw) {
      // startCol/endCol are the centres of the two 2W bumpers underneath - half a 4W
      // is not a real piece of hardware
      changed = true;
      return;
    }

    kept.push(bumper);
  });

  // Wall got wider: cover the trailing columns that never had a bumper. Gated on an actual
  // widening - a bare column the user created by deleting or downsizing the last bumper is
  // their choice, and getOrphanedColumns() already transfers its weight to the nearest
  // bumper. Skipped when bumpersWidth is unknown (screens saved before this was tracked).
  const widened = bumpersWidth > 0 && pw > bumpersWidth;
  if(widened) ['top', 'bottom'].forEach(position => {
    if(position === 'top' && !showTopBumper) return;
    if(position === 'bottom' && !showBottomBumper) return;

    const band = kept.filter(b => b.position === position);
    if(band.length === 0) return; // band deliberately emptied by the user - don't resurrect it

    let maxCovered = -1;
    band.forEach(b => {
      getBumperColumns(b).forEach(col => { if(col > maxCovered) maxCovered = col; });
    });

    for(let c = maxCovered + 1; c < pw; c += 2) {
      const isPair = (pw - c) >= 2;
      kept.push({
        id: nextBumperId++,
        type: isPair ? '2w' : '1w',
        position: position,
        startCol: c,
        endCol: isPair ? c + 1 : c
      });
      changed = true;
    }
  });

  bumpersWidth = pw;
  if(changed) bumpers = kept;
  return changed;
}

// Get bumper at mouse position
function getBumperAtMouse(canvas, clientX, clientY) {
  // A drawn screen's bumpers are picked by interact/free-bumpers.js
  if(isFreeCurrentScreen()) return null;
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
  // A drawn wall's bumpers become its own to edit (interact/free-bumpers.js)
  if(manualBumperMode && isFreeCurrentScreen()) ensureFreeBumpersCustom();
  
  const toggleBtn = document.getElementById('manualBumperToggle');
  const hintSpan = document.getElementById('structureModeHint');
  const selectionInfo = document.getElementById('structureSelectionInfo');
  
  const selectModeRow = document.getElementById('structureSelectModeRow');

  if(manualBumperMode) {
    toggleBtn.classList.add('active');
    toggleBtn.textContent = '✓ Manual Mode Active';
    hintSpan.textContent = 'Click bumpers to select';
    selectionInfo.classList.add('visible');

    // Show the bumper Select Mode toggle on touch devices only — desktop drags
    // bumpers with the mouse and never scrolls the page.
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if(selectModeRow && isTouchDevice) selectModeRow.style.display = 'flex';

  } else {
    toggleBtn.classList.remove('active');
    toggleBtn.textContent = 'Manually Distribute Bumpers';
    hintSpan.textContent = 'Auto-distribution active';
    selectionInfo.classList.remove('visible');

    // Hide and reset the bumper Select Mode toggle when leaving manual mode
    if(selectModeRow) selectModeRow.style.display = 'none';
    if(bumperSelectMode) {
      bumperSelectMode = false;
      const selCanvas = document.getElementById('structureCanvas');
      if(selCanvas) selCanvas.classList.remove('bumper-select-mode-active');
      const selBtn = document.getElementById('structureBumperSelectModeBtn');
      if(selBtn) { selBtn.textContent = 'Off'; selBtn.classList.remove('active'); }
    }

    // Clear selections when exiting manual mode
    selectedBumpers.clear();
    selectedBumper = null;
  }

  // Redraw to show/hide selection highlights
  generateStructureLayout();
}

// Clear the structure editing globals when moving to another screen: manualBumperMode is
// app-global, so it would otherwise carry the previous screen's manual mode over. Mirrors
// the "off" branch of toggleManualBumperMode() but skips the redraw - loadScreenData()
// renders on its own.
function resetStructureEditingState() {
  manualBumperMode = false;
  selectedBumpers.clear();
  selectedBumper = null;
  hoveredBumper = null;

  const toggleBtn = document.getElementById('manualBumperToggle');
  if(toggleBtn) { toggleBtn.classList.remove('active'); toggleBtn.textContent = 'Manually Distribute Bumpers'; }
  const hintSpan = document.getElementById('structureModeHint');
  if(hintSpan) hintSpan.textContent = 'Auto-distribution active';
  const selectionInfo = document.getElementById('structureSelectionInfo');
  if(selectionInfo) selectionInfo.classList.remove('visible');
  const selectModeRow = document.getElementById('structureSelectModeRow');
  if(selectModeRow) selectModeRow.style.display = 'none';

  if(bumperSelectMode) {
    bumperSelectMode = false;
    const selCanvas = document.getElementById('structureCanvas');
    if(selCanvas) selCanvas.classList.remove('bumper-select-mode-active');
    const selBtn = document.getElementById('structureBumperSelectModeBtn');
    if(selBtn) { selBtn.textContent = 'Off'; selBtn.classList.remove('active'); }
  }
}

// Toggle mobile bumper Select Mode: blocks page scroll on the structure canvas
// so dragging moves a bumper immediately (no hold delay) instead of scrolling.
// Mirrors the Standard layout's Select Mode; only meaningful in manual mode.
function toggleBumperSelectMode() {
  bumperSelectMode = !bumperSelectMode;

  const canvas = document.getElementById('structureCanvas');
  const btn = document.getElementById('structureBumperSelectModeBtn');
  const hint = document.getElementById('structureHintText');

  if(canvas) canvas.classList.toggle('bumper-select-mode-active', bumperSelectMode);
  if(btn) {
    btn.textContent = bumperSelectMode ? 'On' : 'Off';
    btn.classList.toggle('active', bumperSelectMode);
  }
  if(hint) {
    hint.textContent = bumperSelectMode
      ? 'Drag to move • Tap to select • Tap selected for options'
      : 'Tap to select • Tap again for options • Hold to drag';
  }

  // Leaving Select Mode clears the working selection
  if(!bumperSelectMode) {
    selectedBumpers.clear();
    generateStructureLayout();
  }

  vibrate(10);
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
  const { bumperHeight, fourWayHeight } = structureBumperHeights(size);
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
  
  // CB5 half rows (above/below the full rows) are square, like the structure canvas draws them
  const rowGeo = getCurrentRowGeometry(panelHeight, size);

  // Check if click is in panel area
  if(y < panelYOffset || y >= panelYOffset + rowGeo.height) return null;
  if(x < 0 || x >= pw * panelWidth) return null;
  
  const col = Math.floor(x / panelWidth);
  const row = rowGeo.rowAt(y - panelYOffset);
  
  if(col < 0 || col >= pw || row < 0 || row >= ph) return null;
  
  const panelKey = `${col},${row}`;
  
  // Don't select deleted panels
  if(deletedPanels.has(panelKey)) return null;
  
  return {
    col: col,
    row: row,
    key: panelKey,
    x: col * panelWidth,
    y: panelYOffset + rowGeo.y(row)
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
  const { bumperHeight, fourWayHeight } = structureBumperHeights(size);
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

// Bumper manipulation functions
function replaceBumperType(bumperId, newType) {
  const bumper = bumpers.find(b => b.id === bumperId);
  if(!bumper) return;
  
  saveState(); // Save before change
  bumper.type = newType;
  // Keep endCol in step with the type. drawAllBumpers() sizes a bumper from its type while
  // the weight and reconcile paths size it from endCol; letting the two drift draws a 2W
  // hanging off the end of the wall that no bounds check can see.
  bumper.endCol = newType === '2w' ? bumper.startCol + 1 : bumper.startCol;
  generateStructureLayout();
  updateWeightDisplay();
  calculate();
}

function deleteBumper(bumperId) {
  saveState(); // Save before change
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
    saveState(); // Save before change
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
  
  // Add 4W option for CB5 and custom panels with 4W support, on a hung wall only
  if(supports4wCtx && position === 'top' && column + 1 < pw) {
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

