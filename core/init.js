// ==================== APP INITIALIZATION ====================
// Keyboard shortcuts, initial calculation, screen system init, canvas init.
// Depends on globals: selectedPanels, currentCanvas, and functions from all modules.

document.addEventListener('DOMContentLoaded', function() {
  try {
    // Add keyboard listeners for panel selection
    document.addEventListener('keydown', function(e) {
      // Check if we're focused on an input field
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT'
      );

      if(e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete panels if NOT focused on an input field
        if(selectedPanels.size > 0 && !isInputFocused) {
          e.preventDefault();
          deleteSelectedPanels();
        }
      }

      // Escape to clear selection
      if(e.key === 'Escape') {
        selectedPanels.clear();
        if(currentCanvas) generateLayout('standard');
      }

      // Ctrl+Z for Undo
      if((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y for Redo (also Ctrl+Shift+Z as alternative)
      if((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    });

    // Clear selection when clicking outside canvas views
    document.addEventListener('click', function(e) {
      // Only process if we have selected panels
      if(selectedPanels.size === 0) return;

      // Check if click target IS a canvas element
      const canvases = ['standardCanvas', 'structureCanvas', 'powerCanvas', 'dataCanvas', 'canvasView'];
      const clickedCanvas = canvases.some(id => {
        const canvas = document.getElementById(id);
        return canvas && e.target === canvas;
      });

      // If not clicking directly on a canvas, clear selection and redraw
      if(!clickedCanvas) {
        selectedPanels.clear();
        // Redraw the current layout if it exists
        const standardCanvas = document.getElementById('standardCanvas');
        if(standardCanvas && standardCanvas.width > 0) {
          generateLayout('standard');
        }
      }
    });

    // Initialize canvas undo/redo button states
    updateCanvasUndoRedoButtons();

    // Defer calculation and canvas if welcome page is visible
    if(typeof isWelcomePageVisible === 'undefined' || !isWelcomePageVisible) {
      setTimeout(() => { calculate(); }, 100);
    }

    // Initialize v29 multi-screen system
    initializeScreenSystem();

    // Load the initial screen (screen_1) data into the UI
    loadScreenData('screen_1');

    // Set initial placeholders based on the actual default panel type
    updateSuggestedCircuitLimit();
    updateSuggestedDataLimit();

    // Update canvas view to ensure correct positioning
    if(typeof isWelcomePageVisible === 'undefined' || !isWelcomePageVisible) {
      setTimeout(() => { showCanvasView(); }, 150);
    }

    // Initialize canvas wheel zoom
    initCanvasWheelZoom();
    initCanvasPanning();
    initCanvasTouchPanZoom();

    // Initialize Supabase (cloud sync & auth)
    if(typeof initSupabase === 'function') {
      initSupabase();
    }

    console.log('Initialization complete - v55.6 Multi-Screen');
  } catch(err) {
    console.error('Initialization error:', err);
    showAlert('Error initializing calculator: ' + err.message);
  }
});
