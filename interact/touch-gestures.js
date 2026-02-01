// ==================== TOUCH GESTURE SUPPORT ====================
// Pinch zoom, long-press context menus, bumper touch drag, haptic feedback.
// Depends on globals: canvasZoomLevel, selectedPanels, manualBumperMode, bumpers, panelSize, etc.

// Touch gesture support for canvases
let touchStartX = 0;
let touchStartY = 0;
let touchStartDistance = 0;
let initialZoom = 1;

function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Add touch handlers to canvases
function initializeTouchCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;

  canvas.addEventListener('touchstart', function(e) {
    if(e.touches.length === 2) {
      // Pinch start
      touchStartDistance = getTouchDistance(e.touches);
      initialZoom = canvasZoomLevel || 1;
      e.preventDefault();
    } else if(e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, {passive: false});

  canvas.addEventListener('touchmove', function(e) {
    if(e.touches.length === 2 && touchStartDistance > 0) {
      // Pinch zoom
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / touchStartDistance;
      const newZoom = Math.min(3, Math.max(0.5, initialZoom * scale));

      if(typeof setCanvasZoom === 'function') {
        setCanvasZoom(newZoom * 100);
      }
      e.preventDefault();
    }
  }, {passive: false});

  canvas.addEventListener('touchend', function(e) {
    touchStartDistance = 0;
  });
}

// Initialize touch on all canvases after load
window.addEventListener('load', function() {
  ['standardCanvas', 'powerCanvas', 'dataCanvas', 'structureCanvas', 'canvasView'].forEach(initializeTouchCanvas);
});

// Long-press for context menu (replaces right-click)
let longPressTimer = null;
let longPressTriggered = false;
let longPressTouchStart = {x: 0, y: 0};

function setupMobileLongPress() {
  console.log('Setting up mobile long-press handlers...');

  // Standard Canvas - long press for panel context menu
  const standardCanvas = document.getElementById('standardCanvas');
  if(standardCanvas) {
    standardCanvas.addEventListener('touchstart', function(e) {
      if(e.touches.length !== 1) return;

      longPressTriggered = false;
      longPressTouchStart.x = e.touches[0].clientX;
      longPressTouchStart.y = e.touches[0].clientY;

      longPressTimer = setTimeout(() => {
        longPressTriggered = true;
        vibrate(50);

        // Get panel at touch position
        const panel = getPanelAtPosition(standardCanvas, longPressTouchStart.x, longPressTouchStart.y);
        if(panel) {
          // Select the panel if not already selected
          if(!selectedPanels.has(panel.key)) {
            selectedPanels.clear();
            selectedPanels.add(panel.key);
            generateLayout('standard');
          }
          // Show context menu
          showContextMenu(longPressTouchStart.x, longPressTouchStart.y);
        }
      }, 600);
    }, {passive: true});

    standardCanvas.addEventListener('touchmove', function(e) {
      if(longPressTimer) {
        const dx = Math.abs(e.touches[0].clientX - longPressTouchStart.x);
        const dy = Math.abs(e.touches[0].clientY - longPressTouchStart.y);
        if(dx > 10 || dy > 10) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }
    }, {passive: true});

    standardCanvas.addEventListener('touchend', function(e) {
      if(longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      // Prevent click if long press was triggered
      if(longPressTriggered) {
        e.preventDefault();
        longPressTriggered = false;
      }
    });

    console.log('Standard canvas long-press enabled');
  }

  // Structure Canvas - long press for empty area context menu (to add bumpers)
  // Note: Bumper tap/drag is handled by setupBumperTouchDrag()
  const structureCanvas = document.getElementById('structureCanvas');
  if(structureCanvas) {
    structureCanvas.addEventListener('touchstart', function(e) {
      if(e.touches.length !== 1) return;

      longPressTriggered = false;
      longPressTouchStart.x = e.touches[0].clientX;
      longPressTouchStart.y = e.touches[0].clientY;

      // Check if touching a bumper - if so, let setupBumperTouchDrag handle it
      const bumper = getBumperAtMouse(structureCanvas, longPressTouchStart.x, longPressTouchStart.y);
      if(bumper && manualBumperMode) {
        // Bumper touch is handled by setupBumperTouchDrag
        return;
      }

      longPressTimer = setTimeout(() => {
        longPressTriggered = true;
        vibrate(50);

        if(!manualBumperMode) {
          // Auto-enable manual mode on long press
          toggleManualBumperMode();
        }

        // Check if in bumper area for adding (empty space, not on a bumper)
        const rect = structureCanvas.getBoundingClientRect();
        const y = (longPressTouchStart.y - rect.top) * (structureCanvas.height / rect.height);
        const x = (longPressTouchStart.x - rect.left) * (structureCanvas.width / rect.width);

        const pw = parseInt(document.getElementById('panelsWide').value) || 0;
        const ph = parseInt(document.getElementById('panelsHigh').value) || 0;
        const size = panelSize; // Use global panelSize for consistent sizing
        const bumperHeight = Math.max(30, size * 0.8);

        const column = Math.floor(x / size);

        if(showTopBumper && y < bumperHeight && column >= 0 && column < pw) {
          showEmptyAreaContextMenu('top', column, longPressTouchStart.x, longPressTouchStart.y);
        } else if(showBottomBumper) {
          const bottomStart = (showTopBumper ? bumperHeight : 0) + (ph * size);
          if(y >= bottomStart && column >= 0 && column < pw) {
            showEmptyAreaContextMenu('bottom', column, longPressTouchStart.x, longPressTouchStart.y);
          }
        }
      }, 600);
    }, {passive: true});

    structureCanvas.addEventListener('touchmove', function(e) {
      if(longPressTimer) {
        const dx = Math.abs(e.touches[0].clientX - longPressTouchStart.x);
        const dy = Math.abs(e.touches[0].clientY - longPressTouchStart.y);
        if(dx > 10 || dy > 10) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }
    }, {passive: true});

    structureCanvas.addEventListener('touchend', function(e) {
      if(longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      if(longPressTriggered) {
        e.preventDefault();
        longPressTriggered = false;
      }
    });

    console.log('Structure canvas long-press enabled');
  }

  // Setup bumper touch drag support for manual mode
  setupBumperTouchDrag();
}

// Touch drag support for bumpers in structure layout manual mode
// Behavior: TAP = show context menu, HOLD then drag = move bumper
function setupBumperTouchDrag() {
  const canvas = document.getElementById('structureCanvas');
  if(!canvas || canvas._bumperTouchSetup) return;
  canvas._bumperTouchSetup = true;

  // Behavior: 1 tap = select bumper, 2nd tap on selected = menu, hold+drag = move
  let touchDragBumper = null;
  let touchDragStartCol = -1;
  let touchDragOffsetX = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let isTouchDragging = false;
  let isDragEnabled = false; // Only allow drag after hold delay
  let holdTimer = null;
  let touchedBumper = null;
  let wasAlreadySelected = false;

  canvas.addEventListener('touchstart', function(e) {
    if(e.touches.length !== 1) return;
    if(!manualBumperMode) return;

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    // Check if touching a bumper
    const bumper = getBumperAtMouse(canvas, touch.clientX, touch.clientY);
    touchedBumper = bumper;

    if(bumper) {
      // Check if bumper was already selected BEFORE we potentially select it
      wasAlreadySelected = selectedBumpers.has(bumper.id);

      // Start hold timer - after 300ms, enable dragging
      holdTimer = setTimeout(() => {
        isDragEnabled = true;
        vibrate(30); // Haptic feedback to indicate drag mode enabled

        // Prepare for drag
        touchDragBumper = bumper;
        touchDragStartCol = bumper.startCol;

        // Calculate drag offset
        const rect = canvas.getBoundingClientRect();
        const touchX = (touchStartX - rect.left) * (canvas.width / rect.width);
        touchDragOffsetX = touchX - (bumper.startCol * panelSize);
      }, 300);
    }
  }, {passive: true});

  canvas.addEventListener('touchmove', function(e) {
    if(!manualBumperMode) return;
    if(e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartX);
    const dy = Math.abs(touch.clientY - touchStartY);

    // If moved before hold timer, cancel the hold (this was a scroll/swipe)
    if(!isDragEnabled && (dx > 10 || dy > 10)) {
      if(holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      // Cancel long press timer too
      if(longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      return;
    }

    // Only drag if hold delay passed and we have a bumper
    if(!isDragEnabled || !touchDragBumper) return;

    isTouchDragging = true;
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);

    const newCol = Math.floor((touchX - touchDragOffsetX) / currentPanelWidth);
    const pw = parseInt(document.getElementById('panelsWide').value) || 0;

    // Constrain to valid columns
    if(newCol >= 0 && newCol < pw) {
      const bumperWidth = touchDragBumper.endCol - touchDragBumper.startCol;
      const maxStartCol = Math.max(0, pw - 1 - bumperWidth);
      const constrainedCol = Math.max(0, Math.min(newCol, maxStartCol));

      if(constrainedCol !== touchDragBumper.startCol) {
        const colDelta = constrainedCol - touchDragBumper.startCol;
        touchDragBumper.startCol = constrainedCol;
        touchDragBumper.endCol = touchDragBumper.endCol + colDelta;

        generateStructureLayout();
      }
    }
  }, {passive: false});

  canvas.addEventListener('touchend', function(e) {
    // Cancel hold timer
    if(holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }

    if(manualBumperMode) {
      if(isTouchDragging && touchDragBumper) {
        // Bumper was dragged - save state if moved
        if(touchDragStartCol !== -1 && touchDragStartCol !== touchDragBumper.startCol) {
          saveStructureState();
          vibrate(30);
        }
        // Update weight and calculations
        updateWeightDisplay();
        calculate();
        updateStructureUndoRedoButtons();
      } else if(!isDragEnabled && touchedBumper) {
        // Quick tap (no drag) - check if bumper was already selected
        if(wasAlreadySelected) {
          // 2nd tap on selected bumper - show context menu
          vibrate(20);
          showBumperContextMenu(touchedBumper, touchStartX, touchStartY);
        } else {
          // 1st tap - select the bumper
          selectedBumpers.clear();
          selectedBumpers.add(touchedBumper.id);
          updateStructureSelectionInfo();
          generateStructureLayout();
        }
      }
    }

    // Reset all state
    touchDragBumper = null;
    touchDragStartCol = -1;
    isTouchDragging = false;
    isDragEnabled = false;
    touchedBumper = null;
    wasAlreadySelected = false;
  });

  canvas.addEventListener('touchcancel', function(e) {
    if(holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    touchDragBumper = null;
    touchDragStartCol = -1;
    isTouchDragging = false;
    isDragEnabled = false;
    touchedBumper = null;
    wasAlreadySelected = false;
  });

  console.log('Bumper touch drag enabled (tap=select, 2nd tap=menu, hold+drag=move)');
}

// Haptic feedback helper
function vibrate(pattern = 10) {
  if('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// Initialize long-press after page loads
window.addEventListener('load', function() {
  setTimeout(setupMobileLongPress, 500);
});
