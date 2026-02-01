// ==================== DOM EVENT SETUP ====================
// setupLive wires DOM input elements to calculate() and saveCurrentScreenData().

function setupLive(){
  // Note: panelType is NOT included here because it has its own handler that calls resetCalculator()
  // Note: canvasX and canvasY have their own handler below to properly move screens
  const liveIds = ['processor','powerType','panelsWide','panelsHigh','voltage','breaker','phase','maxPanelsPerCircuit','maxPanelsPerData','dataStartDir','showArrows','canvasSize','wallWidth','wallHeight','frameRate','bitDepth','redundancy','customCanvasWidth','customCanvasHeight','addCB5HalfRow'];

  liveIds.forEach(id => {
    const el = document.getElementById(id);
    if(!el) {
      return;
    }

    // Add event listener to trigger canvas update when value changes
    const eventType = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
    el.addEventListener(eventType, function() {
      // Update current screen data when inputs change
      saveCurrentScreenData();
      // Trigger recalculation which will update all views including canvas
      calculate();
    });
  });

  // Special handler for canvasX and canvasY inputs - moves selected or current screen
  const canvasXInput = document.getElementById('canvasX');
  const canvasYInput = document.getElementById('canvasY');

  function handleCanvasPositionChange() {
    const newX = parseInt(canvasXInput.value) || 0;
    const newY = parseInt(canvasYInput.value) || 0;

    // Determine which screen to move - selected screen takes priority
    const screenToMove = selectedCanvasScreenId || currentScreenId;

    if(screens[screenToMove]) {
      // Update the screen's position
      screens[screenToMove].data.canvasX = newX;
      screens[screenToMove].data.canvasY = newY;

      // If moving the current screen, also update global offset variables
      if(screenToMove === currentScreenId) {
        canvasOffsetX = newX;
        canvasOffsetY = newY;
      }

      // Save undo state
      saveCanvasMoveState();

      // Redraw canvas view
      showCanvasView();

      // Redraw selection highlight if there's a selected screen
      if(selectedCanvasScreenId) {
        drawSelectionHighlight();
        updateCanvasInfoDisplay();
      }
    }
  }

  if(canvasXInput) {
    canvasXInput.addEventListener('input', handleCanvasPositionChange);
  }
  if(canvasYInput) {
    canvasYInput.addEventListener('input', handleCanvasPositionChange);
  }
}

