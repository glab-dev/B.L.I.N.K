// ==================== STANDARD CANVAS INTERACTIVITY ====================
// Panel selection, context menus, circuit/data prompts, suggested limits.
// Depends on globals: currentCanvas, currentPw, currentPh, currentPanelWidth,
// currentPanelHeight, deletedPanels, selectedPanels, isDragging, etc.

// Interactive panel selection functions
function getPanelAtPosition(canvas, x, y) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const canvasX = (x - rect.left) * scaleX;
  const canvasY = (y - rect.top) * scaleY;
  
  const col = Math.floor(canvasX / currentPanelWidth);
  const row = Math.floor(canvasY / currentPanelHeight);
  
  if(col >= 0 && col < currentPw && row >= 0 && row < currentPh) {
    return {col, row, key: `${col},${row}`};
  }
  return null;
}

function getPanelsInRect(x1, y1, x2, y2) {
  const rect = currentCanvas.getBoundingClientRect();
  const scaleX = currentCanvas.width / rect.width;
  const scaleY = currentCanvas.height / rect.height;
  
  const canvasX1 = (Math.min(x1, x2) - rect.left) * scaleX;
  const canvasY1 = (Math.min(y1, y2) - rect.top) * scaleY;
  const canvasX2 = (Math.max(x1, x2) - rect.left) * scaleX;
  const canvasY2 = (Math.max(y1, y2) - rect.top) * scaleY;
  
  const col1 = Math.max(0, Math.floor(canvasX1 / currentPanelWidth));
  const row1 = Math.max(0, Math.floor(canvasY1 / currentPanelHeight));
  const col2 = Math.min(currentPw - 1, Math.floor(canvasX2 / currentPanelWidth));
  const row2 = Math.min(currentPh - 1, Math.floor(canvasY2 / currentPanelHeight));
  
  const panels = [];
  for(let c = col1; c <= col2; c++) {
    for(let r = row1; r <= row2; r++) {
      panels.push({col: c, row: r, key: `${c},${r}`});
    }
  }
  return panels;
}

function deleteSelectedPanels() {
  if(selectedPanels.size === 0) return;
  
  saveState(); // Save state before making changes
  
  selectedPanels.forEach(key => {
    deletedPanels.add(key);
  });
  selectedPanels.clear();
  
  // Save to current screen data so canvas view can see it
  if(screens[currentScreenId]) {
    screens[currentScreenId].data.deletedPanels = new Set(deletedPanels);
  }
  
  // Regenerate all layouts and recalculate
  calculate();
  
  // Update canvas view to reflect deleted panels
  showCanvasView();
  
  // Re-draw selection highlight if there's a selected screen
  if(selectedCanvasScreenId) {
    drawSelectionHighlight();
  }
}

let canvasListenersSetup = false;

function setupStandardCanvasInteractivity() {
  const canvas = document.getElementById('standardCanvas');
  if(!canvas) return;
  
  // Only setup listeners once
  if(canvasListenersSetup) {
    currentCanvas = canvas;
    return;
  }
  
  canvasListenersSetup = true;
  currentCanvas = canvas;
  
  // Mouse down - start selection
  canvas.addEventListener('mousedown', function(e) {
    if(e.button !== 0) return; // Only left click
    
    const panel = getPanelAtPosition(canvas, e.clientX, e.clientY);
    if(!panel) return;
    
    // Check for modifier keys (Ctrl on Windows/Linux, Cmd on Mac)
    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
    
    if(!isMultiSelect) {
      selectedPanels.clear();
    }
    
    // Toggle selection of clicked panel
    if(selectedPanels.has(panel.key)) {
      selectedPanels.delete(panel.key);
    } else {
      selectedPanels.add(panel.key);
    }
    
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    generateLayout('standard');
  });
  
  // Mouse move - drag selection
  canvas.addEventListener('mousemove', function(e) {
    if(!isDragging) return;
    
    const dx = Math.abs(e.clientX - dragStartX);
    const dy = Math.abs(e.clientY - dragStartY);
    
    // Only do rect selection if dragged more than 5 pixels
    if(dx > 5 || dy > 5) {
      const panels = getPanelsInRect(dragStartX, dragStartY, e.clientX, e.clientY);
      
      const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
      if(!isMultiSelect) {
        selectedPanels.clear();
      }
      
      panels.forEach(p => {
        selectedPanels.add(p.key);
      });
      
      generateLayout('standard');
    }
  });
  
  // Mouse up - end selection
  canvas.addEventListener('mouseup', function(e) {
    isDragging = false;
  });
  
  // Mouse leave - end drag
  canvas.addEventListener('mouseleave', function(e) {
    isDragging = false;
  });
  
  // Right click - context menu
  canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();

    const panel = getPanelAtPosition(canvas, e.clientX, e.clientY);
    if(!panel) return;

    // If clicked panel is not selected, select only it
    if(!selectedPanels.has(panel.key)) {
      selectedPanels.clear();
      selectedPanels.add(panel.key);
      generateLayout('standard');
    }

    // Show context menu
    showContextMenu(e.clientX, e.clientY);
  });

  // Touch support for panel selection
  // Behavior: 1 tap = select panel, 2nd tap on selected = menu, drag = multi-select
  let touchSelectStart = null;
  let isTouchSelecting = false;
  let touchStartPanel = null;
  let touchEndX = 0;
  let touchEndY = 0;

  canvas.addEventListener('touchstart', function(e) {
    if(e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchSelectStart = { x: touch.clientX, y: touch.clientY };
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;
    isTouchSelecting = false;

    const panel = getPanelAtPosition(canvas, touch.clientX, touch.clientY);
    touchStartPanel = panel;
  }, {passive: true});

  canvas.addEventListener('touchmove', function(e) {
    if(!touchSelectStart) return;
    if(e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;
    const dx = Math.abs(touch.clientX - touchSelectStart.x);
    const dy = Math.abs(touch.clientY - touchSelectStart.y);

    // Start drag selection after moving enough
    if(dx > 10 || dy > 10) {
      if(!isTouchSelecting) {
        // First move - clear selection and start fresh
        isTouchSelecting = true;
        selectedPanels.clear();
        if(touchStartPanel) {
          selectedPanels.add(touchStartPanel.key);
        }
      }

      e.preventDefault();

      // Get panel at current touch position
      const panel = getPanelAtPosition(canvas, touch.clientX, touch.clientY);
      if(panel && !selectedPanels.has(panel.key)) {
        selectedPanels.add(panel.key);
        vibrate(10); // Light haptic feedback
        generateLayout('standard');
      }
    }
  }, {passive: false});

  canvas.addEventListener('touchend', function(e) {
    // If dragging across panels, tapping on selected panel shows menu
    if(isTouchSelecting) {
      // Multi-select drag ended - don't show menu automatically
      touchSelectStart = null;
      isTouchSelecting = false;
      touchStartPanel = null;
      return;
    }

    // Single tap behavior
    if(touchStartPanel) {
      const wasAlreadySelected = selectedPanels.has(touchStartPanel.key);

      if(wasAlreadySelected) {
        // Panel was already selected - show context menu
        vibrate(30);
        showContextMenu(touchEndX, touchEndY);
      } else {
        // Panel not selected - select it (clear others first)
        selectedPanels.clear();
        selectedPanels.add(touchStartPanel.key);
        generateLayout('standard');
      }
    }

    touchSelectStart = null;
    isTouchSelecting = false;
    touchStartPanel = null;
  });

  canvas.addEventListener('touchcancel', function(e) {
    touchSelectStart = null;
    isTouchSelecting = false;
    touchStartPanel = null;
  });
}

function showContextMenu(x, y) {
  // Remove existing menu if any
  const existingMenu = document.getElementById('panelContextMenu');
  if(existingMenu) existingMenu.remove();
  
  // Create context menu
  const menu = document.createElement('div');
  menu.id = 'panelContextMenu';
  menu.style.position = 'fixed';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.style.background = '#242424';
  menu.style.border = '1px solid #555';
  menu.style.borderRadius = '4px';
  menu.style.padding = '4px 0';
  menu.style.zIndex = '10000';
  menu.style.minWidth = '200px';
  menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
  
  // Assign Circuit option
  const assignCircuitOption = document.createElement('div');
  assignCircuitOption.textContent = `Assign Circuit # to ${selectedPanels.size} panel(s)`;
  assignCircuitOption.style.padding = '8px 12px';
  assignCircuitOption.style.cursor = 'pointer';
  assignCircuitOption.style.color = '#e0e0e0';
  assignCircuitOption.style.fontSize = '13px';
  assignCircuitOption.style.borderBottom = '1px solid #383838';
  assignCircuitOption.addEventListener('mouseover', function() {
    assignCircuitOption.style.background = '#0a66c2';
  });
  assignCircuitOption.addEventListener('mouseout', function() {
    assignCircuitOption.style.background = 'transparent';
  });
  assignCircuitOption.addEventListener('click', function() {
    menu.remove();
    showCircuitNumberPrompt();
  });
  
  // Assign Data Line option
  const assignDataLineOption = document.createElement('div');
  assignDataLineOption.textContent = `Assign Data Line # to ${selectedPanels.size} panel(s)`;
  assignDataLineOption.style.padding = '8px 12px';
  assignDataLineOption.style.cursor = 'pointer';
  assignDataLineOption.style.color = '#e0e0e0';
  assignDataLineOption.style.fontSize = '13px';
  assignDataLineOption.style.borderBottom = '1px solid #383838';
  assignDataLineOption.addEventListener('mouseover', function() {
    assignDataLineOption.style.background = '#0a66c2';
  });
  assignDataLineOption.addEventListener('mouseout', function() {
    assignDataLineOption.style.background = 'transparent';
  });
  assignDataLineOption.addEventListener('click', function() {
    menu.remove();
    showDataLineNumberPrompt();
  });
  
  // Delete option
  const deleteOption = document.createElement('div');
  deleteOption.textContent = `Delete ${selectedPanels.size} panel(s)`;
  deleteOption.style.padding = '8px 12px';
  deleteOption.style.cursor = 'pointer';
  deleteOption.style.color = '#e0e0e0';
  deleteOption.style.fontSize = '13px';
  deleteOption.addEventListener('mouseover', function() {
    deleteOption.style.background = '#0a66c2';
  });
  deleteOption.addEventListener('mouseout', function() {
    deleteOption.style.background = 'transparent';
  });
  deleteOption.addEventListener('click', function() {
    deleteSelectedPanels();
    menu.remove();
  });
  
  menu.appendChild(assignCircuitOption);
  menu.appendChild(assignDataLineOption);
  menu.appendChild(deleteOption);
  document.body.appendChild(menu);
  
  // Close menu when clicking elsewhere
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if(!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 10);
}

async function showCircuitNumberPrompt() {
  const circuitNum = await showPrompt(`Enter circuit number for ${selectedPanels.size} selected panel(s):\n\n(Enter a number 1-999, or leave blank to clear custom assignment)`);

  if(circuitNum === null) return; // User cancelled
  
  saveState(); // Save state before making changes
  
  if(circuitNum.trim() === '') {
    // Clear custom assignments for selected panels
    selectedPanels.forEach(key => {
      customCircuitAssignments.delete(key);
    });
  } else {
    const num = parseInt(circuitNum);
    if(isNaN(num) || num < 1 || num > 999) {
      showAlert('Please enter a valid circuit number between 1 and 999');
      return;
    }
    
    // Assign circuit number to selected panels
    selectedPanels.forEach(key => {
      customCircuitAssignments.set(key, num);
    });
  }
  
  selectedPanels.clear();
  calculate();
}

async function showDataLineNumberPrompt() {
  const dataLineNum = await showPrompt(`Enter data line number for ${selectedPanels.size} selected panel(s):\n\n(Enter a number 1-999, or leave blank to clear custom assignment)`);

  if(dataLineNum === null) return; // User cancelled
  
  saveState(); // Save state before making changes
  
  if(dataLineNum.trim() === '') {
    // Clear custom assignments for selected panels
    selectedPanels.forEach(key => {
      customDataLineAssignments.delete(key);
    });
  } else {
    const num = parseInt(dataLineNum);
    if(isNaN(num) || num < 1 || num > 999) {
      showAlert('Please enter a valid data line number between 1 and 999');
      return;
    }
    
    // Assign data line number to selected panels
    selectedPanels.forEach(key => {
      customDataLineAssignments.set(key, num);
    });
  }
  
  selectedPanels.clear();
  calculate();
}

function drawVArrowhead(ctx, x, y, angle, colorHex){
  const size = 12;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-size, -size/2);
  ctx.lineTo(0, 0);
  ctx.lineTo(-size, size/2);
  ctx.stroke();
  ctx.restore();
}

// Calculate and update the suggested max panels per circuit based on power settings
function updateSuggestedCircuitLimit(){
  const allPanels = getAllPanels();
  const p = allPanels[document.getElementById('panelType').value];
  if(!p || !p.power_max_w) {
    document.getElementById('maxPanelsPerCircuit').placeholder = "Auto";
    return;
  }
  
  const voltage = parseFloat(document.getElementById('voltage').value) || 208;
  const breaker = parseFloat(document.getElementById('breaker').value) || 20;
  // Derate removed - default to no derating
  const derate = 1.0; // Derating disabled
  const powerType = document.getElementById('powerType').value;
  
  const circuitCapacityW = voltage * breaker * derate;
  const perPanelW = powerType === 'max' ? p.power_max_w : (p.power_avg_w || p.power_max_w * 0.5);
  const powerBasedLimit = Math.max(1, Math.floor(circuitCapacityW / perPanelW));
  
  const input = document.getElementById('maxPanelsPerCircuit');
  if(input && !input.value) {
    input.placeholder = powerBasedLimit.toString();
  }
}

function updateSuggestedDataLimit(){
  const allPanels = getAllPanels();
  const allProcessors = getAllProcessors();
  const p=allPanels[document.getElementById('panelType').value];
  const pr=allProcessors[document.getElementById('processor').value];
  if(!p || !p.res_x || !p.res_y){ document.getElementById('maxPanelsPerData').placeholder = "Auto"; return; }

  // Check if CB5 half panel row is enabled
  // Using cb5HalfRowEnabled toggle state
  const hasCB5HalfRow = cb5HalfRowEnabled && document.getElementById('panelType').value === 'CB5_MKII';

  // Get panel dimensions
  const pw = parseInt(document.getElementById('panelsWide').value) || 1;
  const ph = parseInt(document.getElementById('panelsHigh').value) || 1;
  const activePanelsCount = (pw * ph) - deletedPanels.size;

  const pixelsPerPanel = p.res_x*p.res_y;
  const frameRate = parseInt(document.getElementById('frameRate').value) || 60;
  const bitDepth = parseInt(document.getElementById('bitDepth').value) || 8;
  const adjustedCapacity = calculateAdjustedPixelCapacity(pr, frameRate, bitDepth);

  // Calculate suggested panels per data line accounting for mixed panel types
  // Uses the SAME logic as calculate() for consistency
  let capacityBasedLimit;
  if(hasCB5HalfRow) {
    // With half panels, calculate based on actual panel counts (same as calculate() function)
    const halfPanel = panels['CB5_MKII_HALF'];
    const halfPanelPixels = halfPanel.res_x * halfPanel.res_y;
    const mainPanelCount = activePanelsCount; // All full panels
    const halfPanelCount = pw; // Additional half panel row
    const totalMixedPanels = mainPanelCount + halfPanelCount;
    const totalMixedPixels = (mainPanelCount * pixelsPerPanel) + (halfPanelCount * halfPanelPixels);
    const avgPixelsPerPanel = totalMixedPixels / totalMixedPanels;
    capacityBasedLimit = Math.max(1, Math.floor(adjustedCapacity / avgPixelsPerPanel));
  } else {
    capacityBasedLimit = Math.max(1, Math.floor(adjustedCapacity / pixelsPerPanel));
  }

  // Cap at 500 panels per port (Brompton Tessera hardware limit)
  const MAX_PANELS_PER_PORT = 500;
  capacityBasedLimit = Math.min(capacityBasedLimit, MAX_PANELS_PER_PORT);

  // Max panels per data = port capacity based (varies with frame rate + bit depth)
  const suggested = capacityBasedLimit;

  const input = document.getElementById('maxPanelsPerData');
  if(!input.value){ input.placeholder = suggested; }
}

