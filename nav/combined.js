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

function setCombinedPowerType(type) {
  combinedPowerType = type;
  document.getElementById('combinedPowerMaxBtn').classList.toggle('active', type === 'max');
  document.getElementById('combinedPowerAvgBtn').classList.toggle('active', type === 'avg');
  renderCombinedSpecs(Array.from(combinedSelectedScreens));
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

// Combined view panel selection state
let combinedSelectedPanel = null; // { screenId, col, row, key } - for single selection (mobile)
let combinedSelectedPanels = new Set(); // Set of "screenId:col,row" strings for multi-selection (desktop)

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

// Get screen at position for dragging (checks screen label area)
function getCombinedScreenAtPosition(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const canvasX = (clientX - rect.left) * scaleX;
  const canvasY = (clientY - rect.top) * scaleY;

  // Check each screen - include label area above panels for easier dragging
  const zoomFactor = combinedZoomLevel / 100;
  for(const dim of combinedScreenDimensions) {
    // Scale both base position and custom offset by zoom factor
    const customPos = combinedScreenPositions[dim.screenId] || { x: 0, y: 0 };
    const screenX = combinedLeftPadding + (dim.x + customPos.x) * zoomFactor;
    const screenY = combinedTopPadding + customPos.y * zoomFactor;
    const screenWidth = dim.pw * combinedPanelSize;
    const screenHeight = dim.ph * combinedPanelSize;
    const labelHeight = 25; // Height above panels for label

    // Check if click is within this screen's bounds (including label area)
    if(canvasX >= screenX && canvasX < screenX + screenWidth &&
       canvasY >= screenY - labelHeight && canvasY < screenY + screenHeight) {
      return dim;
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
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const canvasX = (clientX - rect.left) * scaleX;
  const canvasY = (clientY - rect.top) * scaleY;

  const allPanels = getAllPanels();

  // Check each screen
  for(const dim of combinedScreenDimensions) {
    let screenX, screenY, drawPanelSize;

    if(combinedMirrorCanvas) {
      // Use canvas positions - convert from pixel coordinates to panel-based layout
      const dataCanvasX = dim.data.canvasX || 0;
      const dataCanvasY = dim.data.canvasY || 0;
      // Get this screen's panel pixel width to properly scale its position
      const panelType = dim.data.panelType || 'CB5_MKII';
      const panelInfo = allPanels[panelType];
      const pixelWidth = panelInfo ? panelInfo.res_x : 176;
      // Convert pixel position to panel units, then to display pixels
      screenX = combinedLeftPadding + (dataCanvasX / pixelWidth) * combinedPanelSize;
      screenY = combinedTopPadding + (dataCanvasY / pixelWidth) * combinedPanelSize;
      // Use same panel size as non-mirrored mode
      drawPanelSize = combinedPanelSize;
    } else {
      // Use custom positions or default horizontal layout
      // Scale both base position and custom offset by zoom factor
      const zoomFactor = combinedZoomLevel / 100;
      const customPos = combinedScreenPositions[dim.screenId] || { x: 0, y: 0 };
      screenX = combinedLeftPadding + (dim.x + customPos.x) * zoomFactor;
      screenY = combinedTopPadding + customPos.y * zoomFactor;
      drawPanelSize = combinedPanelSize; // Already zoomed from renderCombinedView
    }

    // Calculate proper panel dimensions for this screen
    const screenPanelType = dim.data.panelType || 'CB5_MKII';
    const screenHeightRatio = getPanelHeightRatio(screenPanelType);
    const actualPanelWidth = drawPanelSize;
    const actualPanelHeight = drawPanelSize * screenHeightRatio;

    const screenWidth = dim.pw * actualPanelWidth;
    const screenHeight = dim.ph * actualPanelHeight;

    // Check if click is within this screen's bounds
    if(canvasX >= screenX && canvasX < screenX + screenWidth &&
       canvasY >= screenY && canvasY < screenY + screenHeight) {
      const col = Math.floor((canvasX - screenX) / actualPanelWidth);
      const row = Math.floor((canvasY - screenY) / actualPanelHeight);

      if(col >= 0 && col < dim.pw && row >= 0 && row < dim.ph) {
        return {
          screenId: dim.screenId,
          screen: dim.screen,
          data: dim.data,
          col,
          row,
          key: `${col},${row}`
        };
      }
    }
  }
  return null;
}

// Get all panels within a rectangle (for drag selection)
function getCombinedPanelsInRect(canvas, x1, y1, x2, y2) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const canvasX1 = (Math.min(x1, x2) - rect.left) * scaleX;
  const canvasY1 = (Math.min(y1, y2) - rect.top) * scaleY;
  const canvasX2 = (Math.max(x1, x2) - rect.left) * scaleX;
  const canvasY2 = (Math.max(y1, y2) - rect.top) * scaleY;

  const panels = [];
  const allPanels = getAllPanels();

  // Check each screen
  for(const dim of combinedScreenDimensions) {
    let screenX, screenY, drawPanelSize;

    if(combinedMirrorCanvas) {
      // Use canvas positions - convert from pixel coordinates to panel-based layout
      const dataCanvasX = dim.data.canvasX || 0;
      const dataCanvasY = dim.data.canvasY || 0;
      // Get this screen's panel pixel width to properly scale its position
      const panelType = dim.data.panelType || 'CB5_MKII';
      const panelInfo = allPanels[panelType];
      const pixelWidth = panelInfo ? panelInfo.res_x : 176;
      // Convert pixel position to panel units, then to display pixels
      screenX = combinedLeftPadding + (dataCanvasX / pixelWidth) * combinedPanelSize;
      screenY = combinedTopPadding + (dataCanvasY / pixelWidth) * combinedPanelSize;
      // Use same panel size as non-mirrored mode
      drawPanelSize = combinedPanelSize;
    } else {
      // Use custom positions or default horizontal layout
      // Scale both base position and custom offset by zoom factor
      const zoomFactor = combinedZoomLevel / 100;
      const customPos = combinedScreenPositions[dim.screenId] || { x: 0, y: 0 };
      screenX = combinedLeftPadding + (dim.x + customPos.x) * zoomFactor;
      screenY = combinedTopPadding + customPos.y * zoomFactor;
      drawPanelSize = combinedPanelSize; // Already zoomed from renderCombinedView
    }

    // Check each panel in this screen
    for(let c = 0; c < dim.pw; c++) {
      for(let r = 0; r < dim.ph; r++) {
        const px = screenX + c * drawPanelSize;
        const py = screenY + r * drawPanelSize;
        const px2 = px + drawPanelSize;
        const py2 = py + drawPanelSize;

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

// Show context menu for Combined view panel
function showCombinedPanelContextMenu(x, y, panelInfo) {
  // Remove existing menu if any
  const existingMenu = document.getElementById('combinedPanelContextMenu');
  if(existingMenu) existingMenu.remove();

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

  // Assign Custom Circuit # option
  const circuitOption = createMenuOption(
    `Assign Circuit # to ${selectedCount} ${panelLabel}`,
    '#2a4a6a',
    function() {
      menu.remove();
      promptAssignCombinedCircuit();
    }
  );
  menu.appendChild(circuitOption);

  // Assign Custom Data Line # option
  const dataOption = createMenuOption(
    `Assign Data Line # to ${selectedCount} ${panelLabel}`,
    '#4a2a6a',
    function() {
      menu.remove();
      promptAssignCombinedDataLine();
    }
  );
  menu.appendChild(dataOption);

  // Delete/Restore option
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

// Prompt user for custom circuit number and assign to selected panels
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

  const input = await showPrompt(`Enter circuit number for ${panelsToAssign.length} panel(s):\n(Enter 0 or leave blank to clear custom assignment)`);
  if(input === null) return; // Cancelled

  const circuitNum = parseInt(input);
  const clearAssignment = input.trim() === '' || circuitNum === 0;

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

    // Ensure customCircuitAssignments is a Map
    if(!(screen.data.customCircuitAssignments instanceof Map)) {
      if(Array.isArray(screen.data.customCircuitAssignments)) {
        screen.data.customCircuitAssignments = new Map(screen.data.customCircuitAssignments);
      } else {
        screen.data.customCircuitAssignments = new Map();
      }
    }

    // Update each panel
    panelsByScreen[screenId].forEach(panelKey => {
      if(clearAssignment) {
        screen.data.customCircuitAssignments.delete(panelKey);
      } else {
        screen.data.customCircuitAssignments.set(panelKey, circuitNum);
      }
    });

    // If this is the current screen, sync to global variable
    if(screenId === currentScreenId) {
      customCircuitAssignments = new Map(screen.data.customCircuitAssignments);
      calculate(); // Recalculate layouts
    }
  });

  // Clear selection and re-render
  combinedSelectedPanels.clear();
  combinedSelectedPanel = null;
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
  renderCombinedView();
}

// Setup Combined standard canvas touch/click handlers
// Unified handler for both screen dragging (Manual Adjust mode) and panel selection
function setupCombinedCanvasHandlers() {
  const canvas = document.getElementById('combinedStandardCanvas');
  if(!canvas) return;

  // Prevent duplicate handlers
  if(canvas.dataset.combinedHandlersSet) return;
  canvas.dataset.combinedHandlersSet = 'true';

  // Touch state
  let touchStartPos = { x: 0, y: 0 };
  let touchLastPos = { x: 0, y: 0 };
  let touchStartPanel = null;
  let touchDragPending = false;

  // Mouse panel selection state
  let mouseSelectStart = { x: 0, y: 0 };
  let isMouseSelecting = false;
  let mouseStartPanel = null;

  // ===== MOUSE HANDLERS (Desktop) =====

  // Mouse down - start drag (if Manual Adjust) or start panel selection
  canvas.addEventListener('mousedown', function(e) {
    if(e.button !== 0) return; // Only left click

    if(combinedManualAdjust) {
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
    } else {
      // Panel selection mode: start selection
      mouseSelectStart.x = e.clientX;
      mouseSelectStart.y = e.clientY;
      isMouseSelecting = true;
      mouseStartPanel = getCombinedPanelAtPosition(canvas, e.clientX, e.clientY);

      // Check for modifier keys (Ctrl/Cmd/Shift for multi-select)
      const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
      if(!isMultiSelect) {
        combinedSelectedPanels.clear();
      }

      // Select clicked panel immediately, or deselect all if clicking empty area
      if(mouseStartPanel) {
        const panelKey = `${mouseStartPanel.screenId}:${mouseStartPanel.key}`;
        if(combinedSelectedPanels.has(panelKey)) {
          combinedSelectedPanels.delete(panelKey);
        } else {
          combinedSelectedPanels.add(panelKey);
        }
      }
      // Always re-render to show selection changes (including deselection)
      combinedSelectedPanel = null; // Clear single selection too
      renderCombinedView();
    }
  });

  // Mouse move - drag screen or extend panel selection
  canvas.addEventListener('mousemove', function(e) {
    if(combinedDragState.isDragging) {
      // Screen dragging
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
    } else if(isMouseSelecting) {
      // Panel drag selection
      const dx = Math.abs(e.clientX - mouseSelectStart.x);
      const dy = Math.abs(e.clientY - mouseSelectStart.y);

      // Only do rect selection if dragged more than 5 pixels
      if(dx > 5 || dy > 5) {
        const panels = getCombinedPanelsInRect(canvas, mouseSelectStart.x, mouseSelectStart.y, e.clientX, e.clientY);

        const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
        if(!isMultiSelect) {
          combinedSelectedPanels.clear();
        }

        panels.forEach(p => {
          combinedSelectedPanels.add(`${p.screenId}:${p.key}`);
        });

        renderCombinedView();
      }
    }
  });

  // Mouse up - end drag or selection
  document.addEventListener('mouseup', function(e) {
    if(combinedDragState.isDragging) {
      combinedDragState.isDragging = false;
      combinedDragState.screenDim = null;
      canvas.style.cursor = '';
      saveCombinedPositions();
    }
    isMouseSelecting = false;
    mouseStartPanel = null;
  });

  // Mouse leave - end selection (but not screen drag which uses document)
  canvas.addEventListener('mouseleave', function(e) {
    isMouseSelecting = false;
    mouseStartPanel = null;
  });

  // Right-click - context menu for panel (desktop)
  canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    if(combinedManualAdjust) return; // No panel menu in adjust mode

    const panelInfo = getCombinedPanelAtPosition(canvas, e.clientX, e.clientY);
    if(panelInfo) {
      // If clicked panel is not in selection, clear and select only it
      const panelKey = `${panelInfo.screenId}:${panelInfo.key}`;
      if(!combinedSelectedPanels.has(panelKey)) {
        combinedSelectedPanels.clear();
        combinedSelectedPanels.add(panelKey);
      }
      combinedSelectedPanel = panelInfo;
      renderCombinedView(); // Show highlight
      showCombinedPanelContextMenu(e.clientX, e.clientY, panelInfo);
    }
  });

  // Double-click to quick toggle delete (desktop)
  canvas.addEventListener('dblclick', function(e) {
    if(combinedManualAdjust) return; // No panel actions in adjust mode

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

  // ===== TOUCH HANDLERS (Mobile) =====

  canvas.addEventListener('touchstart', function(e) {
    if(e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStartPos.x = touch.clientX;
    touchStartPos.y = touch.clientY;
    touchLastPos.x = touch.clientX;
    touchLastPos.y = touch.clientY;

    if(combinedManualAdjust) {
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
    } else {
      // Panel selection mode: track start panel for tap-to-select
      touchStartPanel = getCombinedPanelAtPosition(canvas, touch.clientX, touch.clientY);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', function(e) {
    if(e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchLastPos.x = touch.clientX;
    touchLastPos.y = touch.clientY;

    if(combinedManualAdjust && combinedDragState.isDragging) {
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
    }
  }, { passive: false });

  canvas.addEventListener('touchend', function(e) {
    if(combinedManualAdjust) {
      // End screen drag
      if(combinedDragState.isDragging) {
        combinedDragState.isDragging = false;
        combinedDragState.screenDim = null;
        saveCombinedPositions();
      }
    } else {
      // Panel selection mode: tap to select, tap again for menu
      const dx = Math.abs(touchLastPos.x - touchStartPos.x);
      const dy = Math.abs(touchLastPos.y - touchStartPos.y);

      // Only process as tap if didn't move much
      if(dx < 15 && dy < 15 && touchStartPanel) {
        const panelKey = `${touchStartPanel.screenId}-${touchStartPanel.key}`;
        const selectedKey = combinedSelectedPanel ? `${combinedSelectedPanel.screenId}-${combinedSelectedPanel.key}` : null;

        if(selectedKey === panelKey) {
          // Panel was already selected - show context menu
          vibrate(30);
          showCombinedPanelContextMenu(touchLastPos.x, touchLastPos.y, touchStartPanel);
        } else {
          // Select this panel (highlight it)
          combinedSelectedPanel = touchStartPanel;
          vibrate(10);
          renderCombinedView(); // Will highlight selected panel
        }
      }
    }

    touchStartPanel = null;
  });

  canvas.addEventListener('touchcancel', function(e) {
    combinedDragState.isDragging = false;
    combinedDragState.screenDim = null;
    touchStartPanel = null;
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

  // Render combined view if screens are selected
  if(combinedSelectedScreens.size > 0) {
    renderCombinedView();
  } else {
    // Show placeholder message
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
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = '#888';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No screens', 50, 45);
        ctx.fillText('selected', 50, 58);
      }
    });
  }
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
    initCombinedView();
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
      const originalPh = hasCB5HalfRow ? ph - 1 : ph;
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
    initCombinedView(); // Will show placeholder
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

  // Black background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, adjustedWidth, adjustedHeight);

  const leftPadding = 20;

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

    // Check if this screen has half panel row enabled
    const screenHasCB5HalfRow = data.addCB5HalfRow && screenPanelType === 'CB5_MKII';
    const screenOriginalPh = screenHasCB5HalfRow ? ph - 1 : ph;
    const halfPanelDrawHeight = drawPanelSize; // Half panels are square

    for(let c = 0; c < pw; c++) {
      for(let r = 0; r < ph; r++) {
        const panelKey = `${c},${r}`;

        // Determine if this row is the half panel row
        const isHalfPanelRow = screenHasCB5HalfRow && r === screenOriginalPh;
        const currentDrawHeight = isHalfPanelRow ? halfPanelDrawHeight : drawPanelHeight;
        const px = screenX + c * drawPanelWidth;
        const py = screenY + (isHalfPanelRow ? (screenOriginalPh * drawPanelHeight) : (r * drawPanelHeight));

        const hasDeleted = screenDeletedPanels.has(panelKey);
        if(hasDeleted) {
          ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
          ctx.fillRect(px, py, drawPanelWidth, currentDrawHeight);
          ctx.strokeStyle = (ecoPrintMode || greyscalePrintMode) ? '#cccccc' : '#333333';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(px, py, drawPanelWidth, currentDrawHeight);
          ctx.setLineDash([]);
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

    // Draw screen label (scale font with panel size)
    ctx.fillStyle = '#fff';
    const labelFontSize = Math.max(8, Math.min(14, drawPanelSize * 0.35));
    ctx.font = `bold ${labelFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(screen.name, screenX + (pw * drawPanelWidth) / 2, screenY - Math.max(6, drawPanelSize * 0.25));
  });

  // Draw selection highlight on top of everything (after all panels drawn)
  // Calculate scaled border properties based on zoom level (zoomFactor already defined above)
  const scaledLineWidth = Math.max(1, Math.round(2 * zoomFactor));
  const scaledOffset = Math.max(1, Math.round(1 * zoomFactor));
  const scaledInset = scaledOffset * 2;

  // First, highlight all multi-selected panels (desktop)
  if(combinedSelectedPanels.size > 0) {
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = scaledLineWidth;
    combinedSelectedPanels.forEach(key => {
      const [screenId, panelKey] = key.split(':');
      const [col, row] = panelKey.split(',').map(Number);
      const selectedDim = screenDimensions.find(d => d.screenId === screenId);
      if(selectedDim) {
        let screenX, screenY, drawPanelSize;
        if(combinedMirrorCanvas) {
          const canvasX = selectedDim.data.canvasX || 0;
          const canvasY = selectedDim.data.canvasY || 0;
          screenX = leftPadding + canvasX * pixelScale;
          screenY = topPadding + canvasY * pixelScale;
          const panelType = selectedDim.data.panelType || 'CB5_MKII';
          const panelInfo = allPanels[panelType];
          const pixelWidth = panelInfo ? panelInfo.res_x : 176;
          drawPanelSize = pixelWidth * pixelScale;
        } else {
          const customPos = combinedScreenPositions[selectedDim.screenId] || { x: 0, y: 0 };
          screenX = leftPadding + (selectedDim.x + customPos.x) * zoomFactor;
          screenY = topPadding + customPos.y * zoomFactor;
          drawPanelSize = zoomedPanelSize;
        }
        // Calculate proper panel dimensions for highlight (skip CB5 half panels)
        const screenPanelType = selectedDim.data.panelType || 'CB5_MKII';
        const screenHeightRatio = getPanelHeightRatio(screenPanelType);
        const hasCB5HalfRow = selectedDim.data.addCB5HalfRow && screenPanelType === 'CB5_MKII';
        const originalPh = hasCB5HalfRow ? selectedDim.ph - 1 : selectedDim.ph;
        const isHalfPanelRow = hasCB5HalfRow && row === originalPh;
        
        let highlightWidth, highlightHeight;
        if (isHalfPanelRow) {
          // Keep square highlight for CB5 half panels (as requested)
          highlightWidth = drawPanelSize;
          highlightHeight = drawPanelSize;
        } else {
          // Use rectangular highlight for CB5 full panels and other rectangular panels
          highlightWidth = drawPanelSize;
          highlightHeight = drawPanelSize * screenHeightRatio;
        }
        
        const px = screenX + col * highlightWidth;
        // For CB5 with half panel row, calculate Y position properly
        let py;
        if (hasCB5HalfRow) {
          if (isHalfPanelRow) {
            // Half panel row is at the bottom
            py = screenY + originalPh * (drawPanelSize * screenHeightRatio);
          } else {
            // Full panels use rectangular height
            py = screenY + row * (drawPanelSize * screenHeightRatio);
          }
        } else {
          // No half panel row - use calculated highlight height
          py = screenY + row * highlightHeight;
        }
        ctx.strokeRect(px + scaledOffset, py + scaledOffset, highlightWidth - scaledInset, highlightHeight - scaledInset);
      }
    });
  }

  // Also highlight single selected panel (mobile)
  if(combinedSelectedPanel && combinedSelectedPanels.size === 0) {
    const selectedDim = screenDimensions.find(d => d.screenId === combinedSelectedPanel.screenId);
    if(selectedDim) {
      let screenX, screenY, drawPanelSize;
      if(combinedMirrorCanvas) {
        const canvasX = selectedDim.data.canvasX || 0;
        const canvasY = selectedDim.data.canvasY || 0;
        screenX = leftPadding + canvasX * pixelScale;
        screenY = topPadding + canvasY * pixelScale;
        const panelType = selectedDim.data.panelType || 'CB5_MKII';
        const panelInfo = allPanels[panelType];
        const pixelWidth = panelInfo ? panelInfo.res_x : 176;
        drawPanelSize = pixelWidth * pixelScale;
      } else {
        const customPos = combinedScreenPositions[selectedDim.screenId] || { x: 0, y: 0 };
        screenX = leftPadding + (selectedDim.x + customPos.x) * zoomFactor;
        screenY = topPadding + customPos.y * zoomFactor;
        drawPanelSize = zoomedPanelSize;
      }
      const col = combinedSelectedPanel.col;
      const row = combinedSelectedPanel.row;
      const px = screenX + col * drawPanelSize;
      const py = screenY + row * drawPanelSize;

      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = scaledLineWidth;
      ctx.strokeRect(px + scaledOffset, py + scaledOffset, drawPanelSize - scaledInset, drawPanelSize - scaledInset);
    }
  }
}

// Render combined power layout
function renderCombinedPowerLayout(screenDimensions, canvasWidth, canvasHeight, panelSize, topPadding) {
  const canvas = document.getElementById('combinedPowerCanvas');
  if(!canvas) return;

  // Add SOCA label height at the top
  const socaLabelHeight = 60;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight + socaLabelHeight;
  const ctx = canvas.getContext('2d');

  // Fill label area with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, socaLabelHeight);

  // Black background for panel area
  ctx.fillStyle = '#000';
  ctx.fillRect(0, socaLabelHeight, canvasWidth, canvasHeight);

  // Draw black border at bottom of SOCA label area
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, socaLabelHeight);
  ctx.lineTo(canvasWidth, socaLabelHeight);
  ctx.stroke();

  const leftPadding = 20;

  screenDimensions.forEach(dim => {
    const { screen, data, pw, ph, x, screenId } = dim;
    // Use the default x position from screenDimensions (no custom positioning)
    const screenX = leftPadding + x;
    const screenY = topPadding + socaLabelHeight;

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

    // Get panels per circuit - need to calculate like original if not set
    const allPanelsData = getAllPanels();
    const panelType = data.panelType || 'CB5_MKII';
    const panelInfo = allPanelsData[panelType];
    const voltage = parseInt(data.voltage) || 208;
    const breaker = parseInt(data.breaker) || 20;
    const powerType = data.powerType || 'max';
    const perPanelW = powerType === 'max' ? (panelInfo?.power_max_w || 500) : (panelInfo?.power_avg_w || 250);
    const circuitCapacityW = voltage * breaker;
    const calculatedPanelsPerCircuit = Math.max(1, Math.floor(circuitCapacityW / perPanelW));
    const userMaxPanelsPerCircuit = parseInt(data.maxPanelsPerCircuit);
    const panelsPerCircuit = userMaxPanelsPerCircuit > 0 ? userMaxPanelsPerCircuit : calculatedPanelsPerCircuit;

    // Build list of all panels in order (column by column, top to bottom) - SAME AS ORIGINAL
    const orderedPanels = [];
    for(let c=0; c<pw; c++){
      for(let r=0; r<ph; r++){
        const panelKey = `${c},${r}`;
        const hasDeleted = screenDeletedPanels.has ? screenDeletedPanels.has(panelKey) : false;
        if(!hasDeleted) {
          const hasCustom = screenCustomCircuits.has ? screenCustomCircuits.has(panelKey) : false;
          orderedPanels.push({
            key: panelKey,
            col: c,
            row: r,
            isCustom: hasCustom,
            customCircuit: hasCustom ? screenCustomCircuits.get(panelKey) - 1 : null
          });
        }
      }
    }

    // Collect all custom circuit numbers that are in use
    const usedCustomCircuits = new Set();
    orderedPanels.forEach(p => {
      if(p.isCustom) {
        usedCustomCircuits.add(p.customCircuit);
      }
    });

    // Assign circuit numbers using same logic as original
    const panelToCircuit = new Map();
    let autoCircuitCounter = 0;
    let panelsInCurrentAutoCircuit = 0;

    orderedPanels.forEach(panel => {
      if(panel.isCustom) {
        panelToCircuit.set(panel.key, panel.customCircuit);
      } else {
        while(usedCustomCircuits.has(autoCircuitCounter)) {
          autoCircuitCounter++;
        }
        panelToCircuit.set(panel.key, autoCircuitCounter);
        panelsInCurrentAutoCircuit++;

        if(panelsInCurrentAutoCircuit >= panelsPerCircuit) {
          autoCircuitCounter++;
          panelsInCurrentAutoCircuit = 0;
          while(usedCustomCircuits.has(autoCircuitCounter)) {
            autoCircuitCounter++;
          }
        }
      }
    });

    // Calculate panel dimensions for CB5_MKII (rectangular) vs other panels (square)
    const screenHeightRatio = getPanelHeightRatio(panelType);
    const drawPanelWidth = panelSize;
    const drawPanelHeight = panelSize * screenHeightRatio;

    // Check if this screen has half panel row enabled
    const screenHasCB5HalfRow = data.addCB5HalfRow && panelType === 'CB5_MKII';
    const screenOriginalPh = screenHasCB5HalfRow ? ph - 1 : ph;
    const halfPanelDrawHeight = panelSize; // Half panels are square

    // Draw all panels using resistor colors (same as original)
    for(let c=0; c<pw; c++){
      for(let r=0; r<ph; r++){
        const panelKey = `${c},${r}`;

        // Determine if this row is the half panel row
        const isHalfPanelRow = screenHasCB5HalfRow && r === screenOriginalPh;
        const currentDrawHeight = isHalfPanelRow ? halfPanelDrawHeight : drawPanelHeight;
        const px = screenX + c * drawPanelWidth;
        const py = screenY + (isHalfPanelRow ? (screenOriginalPh * drawPanelHeight) : (r * drawPanelHeight));

        const hasDeleted = screenDeletedPanels.has ? screenDeletedPanels.has(panelKey) : false;
        if(hasDeleted) {
          ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
          ctx.fillRect(px, py, drawPanelWidth, currentDrawHeight);
          ctx.strokeStyle = (ecoPrintMode || greyscalePrintMode) ? '#cccccc' : '#333333';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(px, py, drawPanelWidth, currentDrawHeight);
          ctx.setLineDash([]);
          continue;
        }

        const circuitNum = panelToCircuit.get(panelKey);
        if(circuitNum === undefined) continue;

        // Use colorForIndex for resistor colors (same as original)
        const socaGroup = Math.floor(circuitNum / 6);
        const colorIndex = circuitNum % 6;
        const colors = colorForIndex(colorIndex);

        // Lighten the color based on SOCA group (same as original)
        const lightenPercent = socaGroup * 0.15;
        const fillColor = lightenColor(colors.solid, lightenPercent);

        ctx.fillStyle = fillColor;
        ctx.fillRect(px, py, drawPanelWidth, currentDrawHeight);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, drawPanelWidth, currentDrawHeight);
      }
    }

    // Draw SOCA labels for this screen
    let maxCircuitNum = 0;
    panelToCircuit.forEach(circuitNum => {
      if(circuitNum > maxCircuitNum) maxCircuitNum = circuitNum;
    });
    const totalCircuits = maxCircuitNum + 1;
    const socaGroups = Math.ceil(totalCircuits / 6);

    // Build circuit to panels map
    const circuitPanelMap = new Map();
    for(let c=0; c<pw; c++){
      for(let r=0; r<ph; r++){
        const panelKey = `${c},${r}`;
        const hasDeleted = screenDeletedPanels.has ? screenDeletedPanels.has(panelKey) : false;
        if(hasDeleted) continue;

        const circuitNum = panelToCircuit.get(panelKey);
        if(circuitNum !== undefined) {
          if(!circuitPanelMap.has(circuitNum)) {
            circuitPanelMap.set(circuitNum, []);
          }
          circuitPanelMap.get(circuitNum).push({
            c: c,
            r: r,
            x: screenX + c * drawPanelWidth
          });
        }
      }
    }

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for(let s = 0; s < socaGroups; s++){
      const startCircuit = s * 6;
      const endCircuit = Math.min((s + 1) * 6 - 1, totalCircuits - 1);

      let minX = Infinity;
      let maxX = -Infinity;

      for(let circuit = startCircuit; circuit <= endCircuit; circuit++) {
        if(circuitPanelMap.has(circuit)) {
          const panels = circuitPanelMap.get(circuit);
          panels.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
          });
        }
      }

      if(minX === Infinity) continue;

      const lineY = 35;
      const startX = minX;
      const endX = maxX + drawPanelWidth;
      const midX = (startX + endX) / 2;

      // Draw horizontal line
      ctx.beginPath();
      ctx.moveTo(startX, lineY);
      ctx.lineTo(endX, lineY);
      ctx.stroke();

      // Draw vertical ticks
      ctx.beginPath();
      ctx.moveTo(startX, lineY - 8);
      ctx.lineTo(startX, lineY + 8);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(endX, lineY - 8);
      ctx.lineTo(endX, lineY + 8);
      ctx.stroke();

      // Draw SOCA label
      ctx.fillText(`SOCA ${s + 1}`, midX, lineY - 18);
    }

    // Draw screen label (white text above the panels, like data layout)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(screen.name, screenX + (pw * panelSize) / 2, screenY - 10);
  });
}

// Render combined data layout
function renderCombinedDataLayout(screenDimensions, canvasWidth, canvasHeight, panelSize, topPadding) {
  const canvas = document.getElementById('combinedDataCanvas');
  if(!canvas) return;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  // Black background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const leftPadding = 20;

  screenDimensions.forEach(dim => {
    const { screen, data, pw, ph, x, screenId } = dim;
    // Use the default x position from screenDimensions (no custom positioning)
    const screenX = leftPadding + x;
    const screenY = topPadding;

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

    const panelsPerDataLine = data.maxPanelsPerData || 48;
    const startDir = data.dataStartDir || 'top';

    // Calculate panel dimensions for CB5_MKII (rectangular) vs other panels (square)
    const screenPanelType = data.panelType || 'CB5_MKII';
    const screenHeightRatio = getPanelHeightRatio(screenPanelType);
    const drawPanelWidth = panelSize;
    const drawPanelHeight = panelSize * screenHeightRatio;

    // Check if this screen has half panel row enabled
    const screenHasCB5HalfRow = data.addCB5HalfRow && screenPanelType === 'CB5_MKII';
    const screenOriginalPh = screenHasCB5HalfRow ? ph - 1 : ph;
    const halfPanelDrawHeight = panelSize; // Half panels are square

    // Build data line assignments using serpentine pattern (same as original)
    const panelToDataLine = new Map();

    // Collect all custom data line numbers that are in use
    const usedCustomDataLines = new Set();
    for(let c=0; c<pw; c++){
      for(let r=0; r<ph; r++){
        const panelKey = `${c},${r}`;
        if(screenCustomDataLines.has(panelKey)) {
          usedCustomDataLines.add(screenCustomDataLines.get(panelKey) - 1);
        }
      }
    }

    // Build serpentine path based on data start direction
    const serp = [];
    if(startDir === 'all_top') {
      for(let c=0; c<pw; c++){
        for(let r=0; r<ph; r++) {
          const panelKey = `${c},${r}`;
          const hasDeleted = screenDeletedPanels.has ? screenDeletedPanels.has(panelKey) : false;
          if(!hasDeleted) {
            serp.push({c, r, key: panelKey});
          }
        }
      }
    } else if(startDir === 'all_bottom') {
      for(let c=0; c<pw; c++){
        for(let r=ph-1; r>=0; r--) {
          const panelKey = `${c},${r}`;
          const hasDeleted = screenDeletedPanels.has ? screenDeletedPanels.has(panelKey) : false;
          if(!hasDeleted) {
            serp.push({c, r, key: panelKey});
          }
        }
      }
    } else {
      // Serpentine pattern for 'top' and 'bottom'
      const startFromTop = (startDir === 'top');
      for(let c=0; c<pw; c++){
        const goingDown = startFromTop ? (c % 2 === 0) : (c % 2 === 1);
        if(goingDown) {
          for(let r=0; r<ph; r++) {
            const panelKey = `${c},${r}`;
            const hasDeleted = screenDeletedPanels.has ? screenDeletedPanels.has(panelKey) : false;
            if(!hasDeleted) {
              serp.push({c, r, key: panelKey});
            }
          }
        } else {
          for(let r=ph-1; r>=0; r--) {
            const panelKey = `${c},${r}`;
            const hasDeleted = screenDeletedPanels.has ? screenDeletedPanels.has(panelKey) : false;
            if(!hasDeleted) {
              serp.push({c, r, key: panelKey});
            }
          }
        }
      }
    }

    // Assign data lines
    let autoDataLineCounter = 0;
    let panelsInCurrentAutoDataLine = 0;

    serp.forEach(panel => {
      const hasCustom = screenCustomDataLines.has ? screenCustomDataLines.has(panel.key) : false;
      if(hasCustom) {
        panelToDataLine.set(panel.key, screenCustomDataLines.get(panel.key) - 1);
      } else {
        while(usedCustomDataLines.has(autoDataLineCounter)) {
          autoDataLineCounter++;
        }
        panelToDataLine.set(panel.key, autoDataLineCounter);
        panelsInCurrentAutoDataLine++;

        if(panelsInCurrentAutoDataLine >= panelsPerDataLine) {
          autoDataLineCounter++;
          panelsInCurrentAutoDataLine = 0;
          while(usedCustomDataLines.has(autoDataLineCounter)) {
            autoDataLineCounter++;
          }
        }
      }
    });

    // Draw all panels using resistor colors (same as original)
    for(let c=0; c<pw; c++){
      for(let r=0; r<ph; r++){
        const panelKey = `${c},${r}`;

        // Determine if this row is the half panel row
        const isHalfPanelRow = screenHasCB5HalfRow && r === screenOriginalPh;
        const currentDrawHeight = isHalfPanelRow ? halfPanelDrawHeight : drawPanelHeight;
        const px = screenX + c * drawPanelWidth;
        const py = screenY + (isHalfPanelRow ? (screenOriginalPh * drawPanelHeight) : (r * drawPanelHeight));

        const hasDeleted = screenDeletedPanels.has ? screenDeletedPanels.has(panelKey) : false;
        if(hasDeleted) {
          ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
          ctx.fillRect(px, py, drawPanelWidth, currentDrawHeight);
          ctx.strokeStyle = (ecoPrintMode || greyscalePrintMode) ? '#cccccc' : '#333333';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(px, py, drawPanelWidth, currentDrawHeight);
          ctx.setLineDash([]);
          continue;
        }

        const dataLineNum = panelToDataLine.get(panelKey);
        if(dataLineNum === undefined) continue;

        // Use colorForIndex for resistor colors (same as original)
        const colors = colorForIndex(dataLineNum);

        ctx.fillStyle = colors.fill;
        ctx.fillRect(px, py, drawPanelWidth, currentDrawHeight);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, drawPanelWidth, currentDrawHeight);
      }
    }

    // Draw screen label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(screen.name, screenX + (pw * drawPanelWidth) / 2, screenY - 10);
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
  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
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

    // Check if this screen has half panel row enabled
    const screenHasCB5HalfRow = data.addCB5HalfRow && screenPanelType === 'CB5_MKII';
    const screenOriginalPh = screenHasCB5HalfRow ? ph - 1 : ph;
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
      for(let r=0; r<ph; r++){
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

        // Draw bumper
        ctx.fillStyle = fillColor;
        ctx.fillRect(bumperX, bumperY, bumperWidthPx, bumperHeight);

        // Black outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(bumperX, bumperY, bumperWidthPx, bumperHeight);

        // Bumper label (black for eco print, white otherwise)
        ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#000000' : '#FFFFFF';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = bumper.type ? bumper.type.toUpperCase() : '2W';
        ctx.fillText(label, bumperX + bumperWidthPx/2, bumperY + bumperHeight/2);
      });
    }

    // Draw screen label
    ctx.fillStyle = '#fff';
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
  let totalAmps = 0;
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
    totalAmps += screenAmps;
    totalAmpsPerPhase += combinedPhase === 3 ? screenAmps / 1.732 : screenAmps;

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
    short = short.replace(' (Matte)', '');
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
  let html = '<div class="combined-specs-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">';

  // Left column: Total Screens, Total Panels, Total Pixels, Total Weight
  html += '<div style="display: flex; flex-direction: column; gap: 12px;">';
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 0.9em;">Total Screens</div><div style="color: #fff;">${selectedScreenIds.length}</div></div>`;
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 0.9em;">Total Panels</div><div style="color: #fff;">${panelsDisplay}</div></div>`;
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 0.9em;">Total Pixels</div><div style="color: #fff;">${totalPixels.toLocaleString()}</div></div>`;
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 0.9em;">Total Weight</div><div style="color: #fff;">${weightDisplay}</div></div>`;
  html += '</div>';

  // Right column: Dimensions, Power, Amps, Amps/Phase, Data Lines
  html += '<div style="display: flex; flex-direction: column; gap: 12px;">';
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 0.9em;">Dimensions</div><div style="color: #fff;">${widthDisplay} × ${heightDisplay}</div></div>`;
  const powerLabel = combinedPowerType === 'max' ? 'Power (Max)' : 'Power (Avg)';
  const phaseLabel = combinedPhase === 3 ? 'Amps/Phase (3Ø)' : 'Total Amps (1Ø)';
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 0.9em;">${powerLabel}</div><div style="color: #fff;">${totalPowerW.toLocaleString()} W</div></div>`;
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 0.9em;">Total Amps</div><div style="color: #fff;">${totalAmps.toFixed(1)} A</div></div>`;
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 0.9em;">${phaseLabel}</div><div style="color: #fff;">${totalAmpsPerPhase.toFixed(1)} A</div></div>`;
  html += `<div><div style="color: #10b981; font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 0.9em;">Data Lines</div><div style="color: #fff;">${totalDataLines}</div></div>`;
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

    // Estimate plates
    totalPlates2way += Math.max(0, (pw - 2));
    totalPlates4way += data.use4WayBumpers ? Math.floor(pw / 2) : 0;

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
    if(calculatedData.dataCrossJumperCount) {
      totalDataCrossJumpers += calculatedData.dataCrossJumperCount;
    }
    if(panel.jumpers_builtin) {
      const screenDataLines = calculatedData.dataLines || 0;
      const screenCrossJumpers = calculatedData.dataCrossJumperCount || 0;
      totalCat5Couplers += screenDataLines + screenCrossJumpers;
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
    let processorCount = 0;

    if(procType === 'Brompton_SX40') {
      const mainXDs = totalMainPorts > 0 ? Math.ceil(totalMainPorts / 10) : 0;
      const distBoxCount = hasRedundancy ? mainXDs * 2 : mainXDs;
      processorCount = distBoxCount > 0 ? Math.ceil(distBoxCount / 4) : 0;
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
        const distBoxCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 10) : 0;
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
          const distBoxCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / portsPerBox) : 0;
          processorCount = Math.max(processorsByPixels, Math.ceil(distBoxCount / (proc.output_ports || 4)));
        } else {
          const portsPerProcessor = proc.output_ports || 4;
          const processorsByPorts = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / portsPerProcessor) : 0;
          processorCount = Math.max(processorsByPixels, processorsByPorts);
        }
      } else {
        const portsPerProcessor = (proc && proc.output_ports) || 8;
        processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / portsPerProcessor) : group.screens.length;
      }
    }
    if(hasProcessorRedundancy && processorCount > 0) processorCount *= 2;
    group.processorCount = processorCount;
    totalGroupedProcessors += processorCount;
  });

  // Helper to add a gear line only if value > 0
  function addGearLine(label, value) {
    if(value > 0) {
      // If value is a number, format as "countx label" — otherwise keep as "label value" for pre-formatted strings
      if(typeof value === 'number') {
        const cleanLabel = label.replace(/:$/, '').trim(); // Remove trailing colon
        return `<div style="margin-left: 12px;"><strong>${value}x ${cleanLabel}</strong></div>`;
      }
      return `<div style="margin-left: 12px;"><strong>${label}</strong> ${value}</div>`;
    }
    return '';
  }

  // Helper to add a section header
  function addGearHeader(title) {
    return `<div style="font-weight: bold; color: #10b981; margin-top: 12px; margin-bottom: 4px;">${title}</div>`;
  }

  let html = '<div style="line-height: 1.8; font-size: 14px;">';

  // Equipment Section
  html += addGearHeader('Equipment');
  html += addGearLine('Processors:', totalProcessors);
  for(const [panelLabel, count] of Object.entries(panelsByType)) {
    if(count > 0) {
      html += `<div style="margin-left: 12px;"><strong>${escapeHtml(panelLabel)}:</strong> ${count}</div>`;
    }
  }
  html += addGearLine('Power Circuits:', totalCircuits);

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
        html += `<div style="margin-left: 12px;"><strong>${count}x ${len}' Cat6</strong></div>`;
      }
    }
    if(hasDistBox) {
      for(const [desc, count] of Object.entries(combinedDistBoxByType)) {
        html += `<div style="margin-left: 12px;"><strong>Proc → Dist Box:</strong> ${count}x ${desc}</div>`;
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
        html += `<div style="margin-left: 12px;"><strong>${count}x ${len}' SOCA</strong></div>`;
      }
    }
    html += `<div style="margin-top: 8px;"></div>`;
    html += addGearLine("25' True1:", totalSocaSplays);
    html += addGearLine("10' True1:", totalSocaSplays);
    html += addGearLine("5' True1:", totalSocaSplays * 2);
    html += addGearLine('True1 Twofer:', totalTrue1Twofers);
  }

  // Processor → Dist Box Section (if any screen uses dist boxes)
  if(hasDistBox) {
    // Already shown in Data Cables above
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

  // Spares Section
  html += addGearHeader('SPARES');
  html += addGearLine('Spare Soca Splays:', '');
  html += addGearLine('Spare Panel Count:', '');
  if(!hasJumpersBuiltin && dataJumperLen) html += addGearLine(`Spare Data Jumpers ${dataJumperLen}':`, '');
  if(dataCrossJumperLen) html += addGearLine(`Spare Data Cross Jumpers ${dataCrossJumperLen}':`, '');
  if(hasJumpersBuiltin) html += addGearLine('Spare Cat5 Couplers:', '');
  if(!hasJumpersBuiltin && powerJumperLen) html += addGearLine(`Spare Power Jumpers ${powerJumperLen}':`, '');

  html += '</div>';

  gearContent.innerHTML = html;
}

