// ==================== CANVAS VIEW ====================
// Canvas tabs management, canvas rendering, interactivity (mouse/touch),
// zoom/pan, undo/redo, and screen visibility toggles.
// Called by switchMobileView() in the navigation dispatcher.

function activateCanvasView() {
  // Show canvas view with all canvas options (no screen tabs on canvas page)
  const canvasTabsEl = document.getElementById('canvasTabsContainer');
  const canvasContainer = document.getElementById('canvasContainer');
  if(canvasTabsEl) canvasTabsEl.style.display = 'flex';
  if(canvasContainer) canvasContainer.style.display = 'block';
  if(canvasContainer) canvasContainer.classList.remove('raster-mode');
  // Sync toolbar values back to section-box when leaving raster mode
  if(typeof syncCanvasOptionsFromToolbar === 'function') syncCanvasOptionsFromToolbar();
  // Restore elements hidden in raster mode
  const canvasToggles = document.getElementById('canvasScreenToggles');
  if(canvasToggles) canvasToggles.style.display = '';
  const canvasInfo = document.getElementById('canvasInfo');
  if(canvasInfo) canvasInfo.style.display = '';
  // Explicitly call showCanvasView to draw the canvas
  if(typeof showCanvasView === 'function') {
    showCanvasView();
  }
}

// ==================== CANVAS TABS MANAGEMENT ====================
// Data structure for multiple canvases
let canvases = {};
let canvasIdCounter = 0;
let currentCanvasId = null;

// Initialize default canvas
function initializeCanvases() {
  if(Object.keys(canvases).length === 0) {
    canvasIdCounter = 1;
    const defaultCanvasId = 'canvas_1';
    const defaultData = getDefaultCanvasData();
    // Initialize with current screen visibility
    Object.keys(screens).forEach(screenId => {
      defaultData.screenVisibility[screenId] = screens[screenId].visible !== false;
    });
    canvases[defaultCanvasId] = {
      id: defaultCanvasId,
      name: 'Canvas 1',
      data: defaultData
    };
    currentCanvasId = defaultCanvasId;
  }
  renderCanvasTabs();
}

function getDefaultCanvasData() {
  return {
    canvasSize: '4K_UHD',
    customCanvasWidth: 3840,
    customCanvasHeight: 2160,
    screenVisibility: {} // Per-canvas screen visibility: {screenId: true/false}
  };
}

function renderCanvasTabs() {
  const container = document.getElementById('canvasTabsContainer');
  if(!container) return;

  const canvasIds = Object.keys(canvases).sort((a, b) => {
    const numA = parseInt(a.split('_')[1]) || 0;
    const numB = parseInt(b.split('_')[1]) || 0;
    return numA - numB;
  });

  let html = '<div class="screen-tabs">';
  canvasIds.forEach(canvasId => {
    const canvas = canvases[canvasId];
    const isActive = canvasId === currentCanvasId;
    html += `
      <div class="screen-tab ${isActive ? 'active' : ''}" onclick="switchToCanvas('${canvasId}')">
        <span class="screen-tab-name">${escapeHtml(canvas.name)}</span>
        <button class="screen-tab-edit" onclick="event.stopPropagation(); openCanvasRenameModal('${canvasId}')" title="Edit canvas">✎</button>
        <button class="screen-tab-close" onclick="event.stopPropagation(); deleteCanvas('${canvasId}')" title="Delete canvas" style="${canvasIds.length <= 1 ? 'visibility: hidden;' : ''}">×</button>
      </div>`;
  });
  html += '</div>';
  html += `<div class="screen-tab-add" onclick="addNewCanvas()" title="Add new canvas" style="flex-shrink: 0; margin-left: auto;">+</div>`;

  container.innerHTML = html;
}

function addNewCanvas() {
  saveCurrentCanvasData();
  canvasIdCounter++;
  const newCanvasId = `canvas_${canvasIdCounter}`;
  const canvasNumber = Object.keys(canvases).length + 1;

  // Create new canvas with all screens hidden (since they may be on other canvases)
  const newCanvasData = getDefaultCanvasData();
  // Initialize all screens as not visible in the new canvas
  Object.keys(screens).forEach(screenId => {
    newCanvasData.screenVisibility[screenId] = false;
  });

  canvases[newCanvasId] = {
    id: newCanvasId,
    name: `Canvas ${canvasNumber}`,
    data: newCanvasData
  };

  currentCanvasId = newCanvasId;
  renderCanvasTabs();
  loadCanvasData(newCanvasId);
  showCanvasView();
}

function switchToCanvas(canvasId) {
  if(canvasId === currentCanvasId) return;
  saveCurrentCanvasData();
  currentCanvasId = canvasId;
  loadCanvasData(canvasId);
  renderCanvasTabs();
  showCanvasView();
}

function deleteCanvas(canvasId) {
  const canvasIds = Object.keys(canvases);
  if(canvasIds.length <= 1) return;

  delete canvases[canvasId];

  if(currentCanvasId === canvasId) {
    const remainingIds = Object.keys(canvases);
    currentCanvasId = remainingIds[0];
    loadCanvasData(currentCanvasId);
  }

  renderCanvasTabs();
  showCanvasView();
}

async function openCanvasRenameModal(canvasId) {
  const canvas = canvases[canvasId];
  if(!canvas) return;
  const newName = await showPrompt('Rename canvas:', canvas.name);
  if(newName && newName.trim()) {
    canvas.name = newName.trim().substring(0, 50);
    renderCanvasTabs();
  }
}

function saveCurrentCanvasData() {
  if(!currentCanvasId || !canvases[currentCanvasId]) return;
  const canvas = canvases[currentCanvasId];

  canvas.data.canvasSize = document.getElementById('canvasSize')?.value || '4K_UHD';
  canvas.data.customCanvasWidth = parseInt(document.getElementById('customCanvasWidth')?.value) || 3840;
  canvas.data.customCanvasHeight = parseInt(document.getElementById('customCanvasHeight')?.value) || 2160;

  // Save current screen visibility for this canvas
  canvas.data.screenVisibility = {};
  Object.keys(screens).forEach(screenId => {
    canvas.data.screenVisibility[screenId] = screens[screenId].visible !== false;
  });
}

function loadCanvasData(canvasId) {
  const canvas = canvases[canvasId];
  if(!canvas) return;

  const canvasSizeSelect = document.getElementById('canvasSize');
  if(canvasSizeSelect) {
    canvasSizeSelect.value = canvas.data.canvasSize || '4K_UHD';
    // Show/hide custom inputs directly — do NOT dispatch change event because
    // its handler calls saveCurrentScreenData() which overwrites screen data
    // from stale DOM form values, corrupting dimensions on canvas switches.
    const customInputs = document.getElementById('customCanvasInputs');
    if(customInputs) customInputs.style.display = canvasSizeSelect.value === 'custom' ? 'flex' : 'none';
  }

  const customWidthInput = document.getElementById('customCanvasWidth');
  const customHeightInput = document.getElementById('customCanvasHeight');
  if(customWidthInput) customWidthInput.value = canvas.data.customCanvasWidth || 3840;
  if(customHeightInput) customHeightInput.value = canvas.data.customCanvasHeight || 2160;

  // Restore screen visibility for this canvas
  // Default all screens to hidden, then restore saved visibility
  Object.keys(screens).forEach(screenId => {
    if(canvas.data.screenVisibility && canvas.data.screenVisibility.hasOwnProperty(screenId)) {
      screens[screenId].visible = canvas.data.screenVisibility[screenId];
    } else {
      // If no saved state, default to hidden
      screens[screenId].visible = false;
    }
  });
  // Update the screen toggles UI
  updateCanvasScreenToggles();
  // Also update raster screen table if available (for raster mode)
  if(typeof renderRasterScreenTable === 'function') renderRasterScreenTable();
  // Sync raster toolbar values (canvas size may differ per canvas)
  if(typeof syncToolbarFromCanvasOptions === 'function') syncToolbarFromCanvasOptions();
}

function showCanvasView(){
  // Get all panels (built-in + custom) for use throughout this function
  const allPanels = getAllPanels();

  // Clear any cached canvas image to ensure fresh render
  cachedCanvasImageData = null;

  // Only show canvas container when on canvas page
  const container = document.getElementById('canvasContainer');
  const isCanvasPage = typeof currentMobileView !== 'undefined' && currentMobileView === 'canvas';
  if(isCanvasPage) {
    container.style.display = 'block';
  }

  // Check if ANY screen has valid dimensions (not just current screen)
  let anyScreenHasDimensions = false;
  Object.values(screens).forEach(screen => {
    const data = screen.data;
    if((data.panelsWide && data.panelsWide > 0) || (data.panelsHigh && data.panelsHigh > 0)) {
      anyScreenHasDimensions = true;
    }
  });

  // Reset viewport pan to show origin (0,0)
  if(canvasZoomLevel === 1.0) {
    canvasPanX = 0;
    canvasPanY = 0;
  }

  // Force browser reflow to ensure container is laid out
  void container.offsetHeight;

  const canvasSize = document.getElementById('canvasSize').value;

  // Get canvas resolution
  let canvasResX, canvasResY, canvasName;
  if(canvasSize === '4K_UHD'){
    canvasResX = 3840; canvasResY = 2160; canvasName = '4K UHD (3840x2160)';
  } else if(canvasSize === '4K_DCI'){
    canvasResX = 4096; canvasResY = 2160; canvasName = '4K DCI (4096x2160)';
  } else if(canvasSize === 'HD'){
    canvasResX = 1920; canvasResY = 1080; canvasName = 'HD (1920x1080)';
  } else if(canvasSize === 'custom'){
    canvasResX = parseInt(document.getElementById('customCanvasWidth').value) || 1920;
    canvasResY = parseInt(document.getElementById('customCanvasHeight').value) || 1080;
    canvasName = `Custom (${canvasResX}x${canvasResY})`;
  }

  const canvas = document.getElementById('canvasView');
  const ctx = canvas.getContext('2d');

  // Set canvas internal resolution (always full resolution for quality)
  canvas.width = canvasResX;
  canvas.height = canvasResY;

  // Explicitly position canvas at origin (needed for both empty and populated states)
  canvas.style.position = 'relative';
  canvas.style.left = '0px';
  canvas.style.top = '0px';
  canvas.style.margin = '0';
  canvas.style.padding = '0';

  // If no screens have dimensions, render empty canvas with border and return
  if(!anyScreenHasDimensions) {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    updateCanvasViewport();
    void canvas.offsetHeight;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasResX, canvasResY);
    // Draw canvas boundary border
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 6;
    ctx.setLineDash([]);
    ctx.strokeRect(3, 3, canvasResX - 6, canvasResY - 6);
    // Update info display
    updateCanvasInfoDisplay();
    setupCanvasViewInteractivity();
    return;
  }
  
  // Calculate the base display size to fit in wrapper (use actual wrapper size for mobile compatibility)
  const wrapperEl = document.getElementById('canvasViewWrapper');
  const wrapperRect = wrapperEl.getBoundingClientRect();
  const wrapperWidth = wrapperRect.width || 800;
  const wrapperHeight = wrapperRect.height || 450;
  const scaleX = wrapperWidth / canvasResX;
  const scaleY = wrapperHeight / canvasResY;
  const baseScale = Math.min(scaleX, scaleY);

  // Set canvas display size to fill wrapper (CSS handles responsive sizing)
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  
  console.log(`Canvas setup: internal=${canvasResX}x${canvasResY}, wrapper=${wrapperWidth}x${wrapperHeight}, baseScale=${baseScale}`);
  console.log(`Viewport: zoom=${canvasZoomLevel}, panX=${canvasPanX}, panY=${canvasPanY}`);
  
  // Log actual DOM positions for debugging
  const canvasRect = canvas.getBoundingClientRect();
  const viewportEl = document.getElementById('canvasViewport');
  const viewportRect = viewportEl ? viewportEl.getBoundingClientRect() : null;

  console.log('Canvas rect:', {x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height});
  if(viewportRect) console.log('Viewport rect:', {x: viewportRect.x, y: viewportRect.y, width: viewportRect.width, height: viewportRect.height});
  console.log('Wrapper rect:', {x: wrapperRect.x, y: wrapperRect.y, width: wrapperRect.width, height: wrapperRect.height});
  if(viewportEl) console.log('Viewport transform:', viewportEl.style.transform);
  
  // Apply zoom and pan transform
  updateCanvasViewport();
  
  // Force multiple browser reflows to ensure proper rendering
  void canvas.offsetHeight;
  void canvas.offsetWidth;
  void canvas.getBoundingClientRect();
  
  // Force a style recalculation
  canvas.style.transform = canvas.style.transform;
  
  // Clear canvas with black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasResX, canvasResY);
  
  // Sort screen IDs numerically
  const screenIds = Object.keys(screens).sort((a, b) => {
    const numA = parseInt(a.split('_')[1]);
    const numB = parseInt(b.split('_')[1]);
    return numA - numB;
  });
  
  // Draw each visible screen
  screenIds.forEach(screenId => {
    const screen = screens[screenId];
    
    // Skip invisible screens
    if(!screen.visible) return;
    
    const screenData = screen.data;
    const panelType = screenData.panelType || 'CB5_MKII';
    const p = allPanels[panelType];

    if(!p || !p.res_x || !p.res_y) return;

    // Get panel dimensions for this screen
    const pw = screenData.panelsWide || 0;
    const ph = screenData.panelsHigh || 0;

    if(pw === 0 || ph === 0) return;

    // Check if CB5 half panel row is enabled for this screen
    const hasCB5HalfRow = screenData.addCB5HalfRow && panelType === 'CB5_MKII';

    // Calculate wall resolution accounting for CB5 half panels
    let wallResX, wallResY;
    if(hasCB5HalfRow) {
      const halfPanel = allPanels['CB5_MKII_HALF'];
      wallResX = pw * p.res_x;
      wallResY = ph * p.res_y + halfPanel.res_y;
    } else {
      wallResX = pw * p.res_x;
      wallResY = ph * p.res_y;
    }
    
    // Ensure canvas position is a valid number, default to 0
    const offsetX = (typeof screenData.canvasX === 'number' && !isNaN(screenData.canvasX)) ? screenData.canvasX : 0;
    const offsetY = (typeof screenData.canvasY === 'number' && !isNaN(screenData.canvasY)) ? screenData.canvasY : 0;
    
    console.log(`showCanvasView rendering ${screenId}: offsetX=${offsetX}, offsetY=${offsetY}, screenData.canvasX=${screenData.canvasX}, screenData.canvasY=${screenData.canvasY}`);
    
    const totalRows = hasCB5HalfRow ? ph + 1 : ph;
    // Ensure deletedPanels is a Set (might be array from JSON load)
    let deletedPanelsForScreen = screenData.deletedPanels;
    if(deletedPanelsForScreen && !(deletedPanelsForScreen instanceof Set)) {
      deletedPanelsForScreen = new Set(deletedPanelsForScreen);
    }
    if(!deletedPanelsForScreen) {
      deletedPanelsForScreen = new Set();
    }
    
    // Pre-calculate colors and halfPanel outside loop
    const primaryColor = screen.color || '#808080';
    const secondaryColor = screen.color2 || darkenColor(primaryColor, 30);
    const halfPanel = allPanels['CB5_MKII_HALF'];
    
    // Draw panels for this screen - optimized loop
    for(let c = 0; c < pw; c++){
      const xBase = offsetX + (c * p.res_x);
      
      for(let r = 0; r < totalRows; r++){
        const panelKey = `${c},${r}`;
        
        // Skip deleted panels
        if(deletedPanelsForScreen.has(panelKey)) continue;
        
        // Determine if this is the half panel row
        const isHalfPanelRow = hasCB5HalfRow && (r === ph);
        
        // Calculate panel pixel dimensions
        const panelResX = isHalfPanelRow ? halfPanel.res_x : p.res_x;
        const panelResY = isHalfPanelRow ? halfPanel.res_y : p.res_y;
        
        // Calculate Y position
        const y = offsetY + (r * p.res_y);
        
        // Skip if out of view
        if(xBase >= canvasResX || y >= canvasResY || xBase + panelResX <= 0 || y + panelResY <= 0) continue;
        
        // Use alternating colors for checkerboard pattern
        const fillColor = ((c + r) % 2 === 0) ? primaryColor : secondaryColor;
        ctx.fillStyle = fillColor;
        ctx.fillRect(xBase, y, panelResX, panelResY);
        
        // Off-white outline for visibility
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 2;
        ctx.strokeRect(xBase, y, panelResX, panelResY);
        
        // Draw panel label - always use white text for visibility
        ctx.fillStyle = '#FFFFFF';
        const fontSize = Math.max(12, Math.min(panelResX, panelResY) / 4);
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${c+1}.${r+1}`, xBase + panelResX/2, y + panelResY/2);
      }
    }
    
    // Add X/Y coordinates in top-left corner (if enabled for this screen)
    if(screen.showCoordinates !== false) {
      const coordFontSize = Math.max(24, Math.min(p.res_x, p.res_y) / 4);
      ctx.font = `bold ${coordFontSize}px Arial`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const coordPadding = 12;
      const textX = offsetX + coordPadding;
      const textY = offsetY + coordPadding;
      const lineHeight = coordFontSize + 6;

      // Measure text width for dynamic background sizing
      const xText = `X: ${screenData.canvasX || 0}`;
      const yText = `Y: ${screenData.canvasY || 0}`;
      const maxTextWidth = Math.max(ctx.measureText(xText).width, ctx.measureText(yText).width);

      // Semi-transparent dark background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(textX - 6, textY - 6, maxTextWidth + 16, lineHeight * 2 + 8);

      // Draw coordinates
      ctx.fillStyle = '#f0f0f0';
      ctx.fillText(xText, textX, textY);
      ctx.fillText(yText, textX, textY + lineHeight);
    }
    
    // Add screen name overlay - simplified shadow
    const screenName = screen.name;
    if(screenName) {
      const wallCenterX = offsetX + (wallResX / 2);
      const wallCenterY = offsetY + (wallResY / 2);
      const baseFontSize = Math.min(wallResX, wallResY) * 0.15;
      
      ctx.font = `bold ${baseFontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Simple shadow (reduced from 13 to 4 draws)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillText(screenName, wallCenterX + 3, wallCenterY + 3);
      ctx.fillText(screenName, wallCenterX - 2, wallCenterY + 2);
      
      // Yellow text on top
      ctx.fillStyle = '#FFFF00';
      ctx.fillText(screenName, wallCenterX, wallCenterY);
    }
    
    // Add screen resolution at bottom-left (if enabled for this screen) - simplified shadow
    if(screen.showPixelDimensions !== false) {
      const resFontSize = Math.max(14, Math.min(wallResX, wallResY) * 0.06);
      ctx.font = `bold ${resFontSize}px Arial`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      
      const resTextX = offsetX + 10;
      const resTextY = offsetY + wallResY - 10;
      const resText = `${wallResX} × ${wallResY}`;
      
      // Simple shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillText(resText, resTextX + 2, resTextY + 2);
      
      // Yellow text
      ctx.fillStyle = '#FFFF00';
      ctx.fillText(resText, resTextX, resTextY);
    }

    // Draw X crosshair if enabled for this screen (default: on)
    if(screen.showCrosshair !== false) {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]); // Dashed line for visibility

      // Line from top-left to bottom-right
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.lineTo(offsetX + wallResX, offsetY + wallResY);
      ctx.stroke();

      // Line from top-right to bottom-left
      ctx.beginPath();
      ctx.moveTo(offsetX + wallResX, offsetY);
      ctx.lineTo(offsetX, offsetY + wallResY);
      ctx.stroke();

      ctx.setLineDash([]); // Reset to solid line
    }

    // Add GLAB logo in bottom right corner
    const logoFontSize = Math.max(12, Math.min(wallResX, wallResY) * 0.05);
    ctx.font = `bold ${logoFontSize}px Arial`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    const logoTextX = offsetX + wallResX - 10;
    const logoTextY = offsetY + wallResY - 10;
    const logoText = 'GLAB';

    // Simple shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillText(logoText, logoTextX + 2, logoTextY + 2);

    // White text for logo
    ctx.fillStyle = '#ffffff';
    ctx.fillText(logoText, logoTextX, logoTextY);
  });

  // Cache the canvas state BEFORE drawing the border (for clean export)
  cachedCanvasImageDataForExport = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Draw canvas boundary border (so users can see canvas edges when zoomed)
  // This is only for display, not included in export
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 6;
  ctx.setLineDash([]);
  ctx.strokeRect(3, 3, canvasResX - 6, canvasResY - 6);

  // Update info display
  let totalWalls = 0;
  let totalPanels = 0;
  screenIds.forEach(screenId => {
    const screen = screens[screenId];
    if(screen.visible && screen.data.panelsWide > 0 && screen.data.panelsHigh > 0) {
      totalWalls++;
      totalPanels += screen.data.panelsWide * screen.data.panelsHigh;
    }
  });

  // Update canvas info display (includes selected screen coordinates if any)
  updateCanvasInfoDisplay();

  // Cache the canvas state WITH border for quick selection highlighting
  cachedCanvasImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Setup canvas view interactivity
  setupCanvasViewInteractivity();
  
  // Save focus state before repaint hacks (they can cause browsers to lose focus)
  var _savedActiveEl = document.activeElement;
  var _savedSelStart = null, _savedSelEnd = null;
  if(_savedActiveEl && (_savedActiveEl.tagName === 'INPUT' || _savedActiveEl.tagName === 'TEXTAREA')) {
    try { _savedSelStart = _savedActiveEl.selectionStart; _savedSelEnd = _savedActiveEl.selectionEnd; } catch(e) {}
  }

  // Force browser repaint using multiple techniques
  const viewport = document.getElementById('canvasViewport');
  if(viewport) {
    // Method 1: willChange hint
    viewport.style.willChange = 'transform';
    void viewport.offsetHeight;
    viewport.style.willChange = 'auto';

    // Method 2: Force repaint by toggling visibility
    const originalDisplay = viewport.style.display;
    viewport.style.display = 'none';
    void viewport.offsetHeight; // Force reflow
    viewport.style.display = originalDisplay || '';
  }

  // Method 3: Force repaint on canvas with opacity trick
  canvas.style.opacity = '0.9999';
  void canvas.offsetHeight;
  canvas.style.opacity = '1';

  // Method 4: Force a transform update on viewport
  if(viewport) {
    const currentTransform = viewport.style.transform;
    viewport.style.transform = 'none';
    void viewport.offsetHeight;
    viewport.style.transform = currentTransform;
  }

  // Restore focus if repaint hacks stole it
  if(_savedActiveEl && document.contains(_savedActiveEl) && document.activeElement !== _savedActiveEl) {
    _savedActiveEl.focus();
    if(_savedSelStart !== null) {
      try { _savedActiveEl.selectionStart = _savedSelStart; _savedActiveEl.selectionEnd = _savedSelEnd; } catch(e) {}
    }
  }

  // WORKAROUND: Second render after delay
  if(!isSecondRenderPass) {
    isSecondRenderPass = true;
    setTimeout(() => {
      showCanvasView();
      isSecondRenderPass = false;
    }, 50);
  }
}

// Cached canvas image for fast selection highlighting (includes border)
let cachedCanvasImageData = null;
// Cached canvas image for export (without border)
let cachedCanvasImageDataForExport = null;
let canvasViewDragging = false;
let canvasViewDragStartX = 0;
let canvasViewDragStartY = 0;
let canvasViewStartOffsetX = 0;
let canvasViewStartOffsetY = 0;
let canvasViewOriginalImageData = null;
let canvasViewFocused = false;
let canvasViewKeyPressed = new Set();
let canvasViewKeyInterval = null;
let canvasViewRedrawTimeout = null;
let isSecondRenderPass = false; // Flag to prevent infinite recursion
let draggedScreenId = null; // Track which screen is being dragged
let selectedCanvasScreenId = null; // Track which screen is selected (highlighted)

// Update canvas info display with selected screen coordinates
function updateCanvasInfoDisplay() {
  const infoEl = document.getElementById('canvasInfo');
  if(!infoEl) return;

  const canvas = document.getElementById('canvasView');
  const canvasResX = canvas ? canvas.width : 0;
  const canvasResY = canvas ? canvas.height : 0;

  // Count visible screens and panels
  let totalWalls = 0;
  let totalPanels = 0;
  Object.keys(screens).forEach(screenId => {
    const screen = screens[screenId];
    if(screen.visible && screen.data.panelsWide > 0 && screen.data.panelsHigh > 0) {
      totalWalls++;
      totalPanels += screen.data.panelsWide * screen.data.panelsHigh;
    }
  });

  let html = `Canvas Resolution: ${canvasResX} × ${canvasResY} px<br>` +
             `Visible Screens: ${totalWalls}<br>` +
             `Total Panels: ${totalPanels}`;

  // Add selected screen info if one is selected
  if(selectedCanvasScreenId && screens[selectedCanvasScreenId]) {
    const screen = screens[selectedCanvasScreenId];
    const x = screen.data.canvasX || 0;
    const y = screen.data.canvasY || 0;
    html += `<br><span style="color: var(--primary);">Selected: ${escapeHtml(screen.name)} (X: ${x}, Y: ${y})</span>`;
  }

  infoEl.innerHTML = html;
}

// Draw selection highlight on canvas without full redraw
function drawSelectionHighlight() {
  if(!selectedCanvasScreenId || !screens[selectedCanvasScreenId]) return;

  const allPanels = getAllPanels();
  const canvas = document.getElementById('canvasView');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  const selectedScreen = screens[selectedCanvasScreenId];
  if(!selectedScreen.visible) return;

  const screenData = selectedScreen.data;
  const panelType = screenData.panelType || 'CB5_MKII';
  const p = allPanels[panelType];

  if(!p || !p.res_x || !p.res_y || !screenData.panelsWide || !screenData.panelsHigh) return;

  const offsetX = screenData.canvasX || 0;
  const offsetY = screenData.canvasY || 0;

  // Check if CB5 half panel row is enabled for this screen
  const hasCB5HalfRow = screenData.addCB5HalfRow && panelType === 'CB5_MKII';

  // Calculate wall resolution accounting for CB5 half panels
  let wallResX, wallResY;
  if(hasCB5HalfRow) {
    const halfPanel = allPanels['CB5_MKII_HALF'];
    wallResX = screenData.panelsWide * p.res_x;
    wallResY = screenData.panelsHigh * p.res_y + halfPanel.res_y;
  } else {
    wallResX = screenData.panelsWide * p.res_x;
    wallResY = screenData.panelsHigh * p.res_y;
  }
  
  // Draw thick cyan highlight border
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 6;
  ctx.setLineDash([]);
  ctx.strokeRect(offsetX - 3, offsetY - 3, wallResX + 6, wallResY + 6);
  
  // Draw inner white border for contrast
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(offsetX - 6, offsetY - 6, wallResX + 12, wallResY + 12);
}

// Helper function to detect which screen is clicked
function getScreenAtPosition(mouseX, mouseY) {
  const allPanels = getAllPanels();

  // Check screens in reverse order (top screen first)
  const screenIds = Object.keys(screens).sort((a, b) => {
    const numA = parseInt(a.split('_')[1]);
    const numB = parseInt(b.split('_')[1]);
    return numB - numA; // Reverse order
  });

  for(const screenId of screenIds) {
    const screen = screens[screenId];

    if(!screen.visible) continue;

    const screenData = screen.data;
    const panelType = screenData.panelType || 'CB5_MKII';
    const p = allPanels[panelType];

    if(!p || !p.res_x || !p.res_y) continue;

    const pw = screenData.panelsWide || 0;
    const ph = screenData.panelsHigh || 0;

    if(pw === 0 || ph === 0) continue;

    // Check if CB5 half panel row is enabled for this screen
    const hasCB5HalfRow = screenData.addCB5HalfRow && panelType === 'CB5_MKII';

    // Calculate wall resolution accounting for CB5 half panels
    let wallResX, wallResY;
    if(hasCB5HalfRow) {
      const halfPanel = allPanels['CB5_MKII_HALF'];
      wallResX = pw * p.res_x;
      wallResY = ph * p.res_y + halfPanel.res_y;
    } else {
      wallResX = pw * p.res_x;
      wallResY = ph * p.res_y;
    }
    
    const offsetX = screenData.canvasX || 0;
    const offsetY = screenData.canvasY || 0;
    
    // Check if click is within this screen's bounds
    if(mouseX >= offsetX && mouseX <= offsetX + wallResX &&
       mouseY >= offsetY && mouseY <= offsetY + wallResY) {
      return screenId;
    }
  }
  
  return null;
}


// Flag to prevent duplicate event listener setup
let canvasInteractivityInitialized = false;

function setupCanvasViewInteractivity() {
  const canvas = document.getElementById('canvasView');
  if(!canvas) return;

  // Initialize history with current position if history is empty
  if(canvasMoveHistory.length === 0) {
    const initialState = {
      x: parseInt(document.getElementById('canvasX').value) || 0,
      y: parseInt(document.getElementById('canvasY').value) || 0
    };
    canvasMoveHistory.push(initialState);
    canvasMoveHistoryIndex = 0;
    updateCanvasUndoRedoButtons();
  }

  // Prevent duplicate event listeners - only setup once
  if(canvasInteractivityInitialized) return;
  canvasInteractivityInitialized = true;

  canvas.style.cursor = 'grab';
  canvas.tabIndex = 0; // Make canvas focusable
  
  // Add click to focus for keyboard controls
  canvas.addEventListener('click', function(e) {
    canvas.focus();
    canvasViewFocused = true;
  });
  
  canvas.addEventListener('focus', function(e) {
    canvasViewFocused = true;
    // Save original state when focusing
    const ctx = canvas.getContext('2d');
    canvasViewOriginalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  });
  
  canvas.addEventListener('blur', function(e) {
    canvasViewFocused = false;
    canvasViewOriginalImageData = null;
    canvasViewKeyPressed.clear();
    if(canvasViewKeyInterval) {
      clearInterval(canvasViewKeyInterval);
      canvasViewKeyInterval = null;
    }
  });
  
  // Keyboard arrow controls
  canvas.addEventListener('keydown', function(e) {
    if(!canvasViewFocused) return;
    
    if(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      
      // Only move if this key wasn't already pressed (prevents repeat events)
      if(!canvasViewKeyPressed.has(e.key)) {
        canvasViewKeyPressed.add(e.key);
        moveCanvasWithKeys(); // Move once per key press
      }
    }
  });
  
  canvas.addEventListener('keyup', function(e) {
    if(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      canvasViewKeyPressed.delete(e.key);
      
      // If no more arrow keys pressed, do final redraw with selection highlight
      if(canvasViewKeyPressed.size === 0) {
        // Debounce the redraw - only redraw after 300ms of no key presses
        if(canvasViewRedrawTimeout) {
          clearTimeout(canvasViewRedrawTimeout);
        }
        canvasViewRedrawTimeout = setTimeout(function() {
          showCanvasView();
          // Re-draw selection highlight if there's a selected screen
          if(selectedCanvasScreenId) {
            drawSelectionHighlight();
          }
          // Sync raster screen table if in raster mode
          if(currentAppMode === 'raster' && typeof renderRasterScreenTable === 'function') {
            renderRasterScreenTable();
            if(typeof syncRasterToolbarPosition === 'function') syncRasterToolbarPosition();
          }
        }, 300);
      }
    }
  });
  
  function moveCanvasWithKeys() {
    if(canvasViewKeyPressed.size === 0) return;
    
    // Determine which screen to move: selected screen or current screen
    const screenToMove = selectedCanvasScreenId || currentScreenId;
    if(!screenToMove || !screens[screenToMove]) return;
    
    // Get increment value directly - this is the exact pixel amount to move
    const increment = parseInt(document.getElementById('arrowKeyIncrement').value) || 10;
    
    // Get current position from the screen data
    let currentX = screens[screenToMove].data.canvasX || 0;
    let currentY = screens[screenToMove].data.canvasY || 0;
    
    // Apply movement for each pressed key
    if(canvasViewKeyPressed.has('ArrowLeft')) {
      currentX -= increment;
    }
    if(canvasViewKeyPressed.has('ArrowRight')) {
      currentX += increment;
    }
    if(canvasViewKeyPressed.has('ArrowUp')) {
      currentY -= increment;
    }
    if(canvasViewKeyPressed.has('ArrowDown')) {
      currentY += increment;
    }
    
    // Update the screen's position
    screens[screenToMove].data.canvasX = currentX;
    screens[screenToMove].data.canvasY = currentY;
    
    // Update the input values
    document.getElementById('canvasX').value = currentX;
    document.getElementById('canvasY').value = currentY;
    
    // If moving current screen, also update global variables
    if(screenToMove === currentScreenId) {
      canvasOffsetX = currentX;
      canvasOffsetY = currentY;
    }
    
    // Save state after moving
    saveCanvasMoveState();
    
    // Redraw the canvas to show updated position
    showCanvasView();
    
    // Re-draw selection highlight if there's a selected screen
    if(selectedCanvasScreenId) {
      drawSelectionHighlight();
    }
  }
  
  function drawCanvasPreviewWithGuides(newOffsetX, newOffsetY, snapMode) {
    if(!draggedScreenId || !screens[draggedScreenId]) return;

    const allPanels = getAllPanels();
    const screen = screens[draggedScreenId];
    const screenData = screen.data;
    const panelType = screenData.panelType || 'CB5_MKII';
    const p = allPanels[panelType];
    if(!p || !p.res_x || !p.res_y) return;

    const pw = screenData.panelsWide || 0;
    const ph = screenData.panelsHigh || 0;

    // Check if CB5 half panel row is enabled for this screen
    const hasCB5HalfRow = screenData.addCB5HalfRow && panelType === 'CB5_MKII';

    // Calculate wall resolution accounting for CB5 half panels
    let wallResX, wallResY;
    if(hasCB5HalfRow) {
      const halfPanel = allPanels['CB5_MKII_HALF'];
      wallResX = pw * p.res_x;
      wallResY = ph * p.res_y + halfPanel.res_y;
    } else {
      wallResX = pw * p.res_x;
      wallResY = ph * p.res_y;
    }
    
    const pixelWidth = p.res_x;
    const pixelHeight = p.res_y;
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Restore original image
    if(canvasViewOriginalImageData) {
      ctx.putImageData(canvasViewOriginalImageData, 0, 0);
    }
    
    // Draw snap guide lines if in markers mode - YELLOW and THICKER
    if(snapMode === 'markers') {
      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      
      // Vertical guide lines - edges (0, 1) and center (1/2)
      const xPositions = [0, 1/2, 1];
      xPositions.forEach(ratio => {
        const x = canvasWidth * ratio;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      });
      
      // Horizontal guide lines - edges (0, 1) and center (1/2)
      const yPositions = [0, 1/2, 1];
      yPositions.forEach(ratio => {
        const y = canvasHeight * ratio;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      });
      
      ctx.setLineDash([]);
    }
    
    // Draw wall preview outline (solid green, THICKER)
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 5;
    ctx.setLineDash([]);
    ctx.strokeRect(newOffsetX, newOffsetY, wallResX, wallResY);
    
    // Draw X pattern across the wall
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Top-left to bottom-right
    ctx.moveTo(newOffsetX, newOffsetY);
    ctx.lineTo(newOffsetX + wallResX, newOffsetY + wallResY);
    // Top-right to bottom-left
    ctx.moveTo(newOffsetX + wallResX, newOffsetY);
    ctx.lineTo(newOffsetX, newOffsetY + wallResY);
    ctx.stroke();
    
    // Draw corner panels (one panel at each corner)
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    
    // Top-left panel
    if(newOffsetX + pixelWidth > 0 && newOffsetY + pixelHeight > 0) {
      ctx.strokeRect(newOffsetX, newOffsetY, pixelWidth, pixelHeight);
    }
    
    // Top-right panel
    if(newOffsetX + wallResX - pixelWidth < canvasWidth && newOffsetY + pixelHeight > 0) {
      ctx.strokeRect(newOffsetX + wallResX - pixelWidth, newOffsetY, pixelWidth, pixelHeight);
    }
    
    // Bottom-left panel
    if(newOffsetX + pixelWidth > 0 && newOffsetY + wallResY - pixelHeight < canvasHeight) {
      ctx.strokeRect(newOffsetX, newOffsetY + wallResY - pixelHeight, pixelWidth, pixelHeight);
    }
    
    // Bottom-right panel
    if(newOffsetX + wallResX - pixelWidth < canvasWidth && newOffsetY + wallResY - pixelHeight < canvasHeight) {
      ctx.strokeRect(newOffsetX + wallResX - pixelWidth, newOffsetY + wallResY - pixelHeight, pixelWidth, pixelHeight);
    }
    
    // Draw center lines through the wall (yellow)
    const centerX = newOffsetX + wallResX / 2;
    const centerY = newOffsetY + wallResY / 2;
    
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    
    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(centerX, newOffsetY);
    ctx.lineTo(centerX, newOffsetY + wallResY);
    ctx.stroke();
    
    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(newOffsetX, centerY);
    ctx.lineTo(newOffsetX + wallResX, centerY);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Draw center crosshair for markers mode
    if(snapMode === 'markers') {
      if(centerX >= 0 && centerX <= canvasWidth && centerY >= 0 && centerY <= canvasHeight) {
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  
  canvas.addEventListener('mousedown', function(e) {
    // Only handle left mouse button (button === 0) for screen selection/dragging
    // Middle mouse button (button === 1) is handled by initCanvasPanning for panning
    if(e.button !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Detect which screen was clicked
    const clickedScreenId = getScreenAtPosition(mouseX, mouseY);
    
    if(clickedScreenId) {
      const screen = screens[clickedScreenId];
      const offsetX = screen.data.canvasX || 0;
      const offsetY = screen.data.canvasY || 0;
      
      // Set as selected screen IMMEDIATELY
      selectedCanvasScreenId = clickedScreenId;
      
      // Update X/Y input boxes to show selected screen's position
      document.getElementById('canvasX').value = offsetX;
      document.getElementById('canvasY').value = offsetY;
      
      draggedScreenId = clickedScreenId;
      canvasViewDragging = true;
      canvasViewDragStartX = mouseX;
      canvasViewDragStartY = mouseY;
      canvasViewStartOffsetX = offsetX;
      canvasViewStartOffsetY = offsetY;
      
      // Focus the canvas
      canvas.focus();
      
      // Use cached canvas image for instant highlight (no full redraw)
      const ctx = canvas.getContext('2d');
      if(cachedCanvasImageData) {
        ctx.putImageData(cachedCanvasImageData, 0, 0);
      }
      drawSelectionHighlight();
      updateCanvasInfoDisplay();

      // Save this state (with highlight) for drag preview
      canvasViewOriginalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    } else {
      // Clicked on empty area - deselect
      if(selectedCanvasScreenId) {
        selectedCanvasScreenId = null;
        updateCanvasInfoDisplay();
        // Restore cached image without highlight
        const ctx = canvas.getContext('2d');
        if(cachedCanvasImageData) {
          ctx.putImageData(cachedCanvasImageData, 0, 0);
        }
      }
    }
  });
  
  canvas.addEventListener('mousemove', function(e) {
    if(!canvasViewDragging || !draggedScreenId) return;

    const allPanels = getAllPanels();
    const screen = screens[draggedScreenId];
    if(!screen) return;

    const screenData = screen.data;
    const panelType = screenData.panelType || 'CB5_MKII';
    const p = allPanels[panelType];
    if(!p || !p.res_x || !p.res_y) return;

    const pw = screenData.panelsWide || 0;
    const ph = screenData.panelsHigh || 0;

    // Check if CB5 half panel row is enabled for this screen
    const hasCB5HalfRow = screenData.addCB5HalfRow && panelType === 'CB5_MKII';

    // Calculate wall resolution accounting for CB5 half panels
    let wallResX, wallResY;
    if(hasCB5HalfRow) {
      const halfPanel = allPanels['CB5_MKII_HALF'];
      wallResX = pw * p.res_x;
      wallResY = ph * p.res_y + halfPanel.res_y;
    } else {
      wallResX = pw * p.res_x;
      wallResY = ph * p.res_y;
    }
    
    const pixelWidth = p.res_x;
    const pixelHeight = p.res_y;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const deltaX = mouseX - canvasViewDragStartX;
    const deltaY = mouseY - canvasViewDragStartY;
    
    let newOffsetX = canvasViewStartOffsetX + deltaX;
    let newOffsetY = canvasViewStartOffsetY + deltaY;
    
    // Get snap mode (checkbox)
    const snapEnabled = snapModeEnabled;
    const snapMode = snapEnabled ? 'markers' : 'none';
    // Snap threshold in canvas pixels - larger on mobile for better feel
    // On a 4K canvas (3840px), 80px is about 2% of width - feels firm
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const snapThreshold = isMobile ? 80 : 30;
    
    if(snapMode === 'markers') {
      // Snap to canvas position markers - now snaps edges and center only
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // Calculate all wall positions
      const wallLeft = newOffsetX;
      const wallRight = newOffsetX + wallResX;
      const wallTop = newOffsetY;
      const wallBottom = newOffsetY + wallResY;
      const wallCenterX = newOffsetX + wallResX / 2;
      const wallCenterY = newOffsetY + wallResY / 2;
      
      // X-axis markers - center only
      const xMarkers = [
        canvasWidth / 2            // Center
      ];
      
      // X-axis edge markers (prioritized)
      const xEdgeMarkers = [
        0,                          // Left edge
        canvasWidth                 // Right edge
      ];
      
      // Y-axis markers - center only
      const yMarkers = [
        canvasHeight / 2           // Center
      ];
      
      // Y-axis edge markers (prioritized)
      const yEdgeMarkers = [
        0,                          // Top edge
        canvasHeight                // Bottom edge
      ];
      
      // Find best X snap (check left edge, right edge, and center)
      let bestXSnap = null;
      let minXDist = Infinity;
      
      // First check center marker
      xMarkers.forEach(marker => {
        // Check left edge
        const leftDist = Math.abs(wallLeft - marker);
        if(leftDist < minXDist && leftDist < snapThreshold) {
          minXDist = leftDist;
          bestXSnap = {marker: marker, edge: 'left'};
        }
        
        // Check right edge
        const rightDist = Math.abs(wallRight - marker);
        if(rightDist < minXDist && rightDist < snapThreshold) {
          minXDist = rightDist;
          bestXSnap = {marker: marker, edge: 'right'};
        }
        
        // Check center
        const centerDist = Math.abs(wallCenterX - marker);
        if(centerDist < minXDist && centerDist < snapThreshold) {
          minXDist = centerDist;
          bestXSnap = {marker: marker, edge: 'center'};
        }
      });
      
      // Then check edge markers with priority (they override fractional if within threshold)
      xEdgeMarkers.forEach(marker => {
        // Check left edge - prioritized
        const leftDist = Math.abs(wallLeft - marker);
        if(leftDist < snapThreshold) {
          if(!bestXSnap || leftDist <= minXDist) {
            minXDist = leftDist;
            bestXSnap = {marker: marker, edge: 'left', priority: true};
          }
        }
        
        // Check right edge - prioritized
        const rightDist = Math.abs(wallRight - marker);
        if(rightDist < snapThreshold) {
          if(!bestXSnap || rightDist <= minXDist) {
            minXDist = rightDist;
            bestXSnap = {marker: marker, edge: 'right', priority: true};
          }
        }
        
        // Check center
        const centerDist = Math.abs(wallCenterX - marker);
        if(centerDist < snapThreshold) {
          if(!bestXSnap || centerDist <= minXDist) {
            minXDist = centerDist;
            bestXSnap = {marker: marker, edge: 'center', priority: true};
          }
        }
      });
      
      // Apply X snap
      if(bestXSnap) {
        if(bestXSnap.edge === 'left') {
          newOffsetX = bestXSnap.marker;
        } else if(bestXSnap.edge === 'right') {
          newOffsetX = bestXSnap.marker - wallResX;
        } else if(bestXSnap.edge === 'center') {
          newOffsetX = bestXSnap.marker - wallResX / 2;
        }
      }
      
      // Find best Y snap (check top edge, bottom edge, and center)
      let bestYSnap = null;
      let minYDist = Infinity;
      
      // First check center marker
      yMarkers.forEach(marker => {
        // Check top edge
        const topDist = Math.abs(wallTop - marker);
        if(topDist < minYDist && topDist < snapThreshold) {
          minYDist = topDist;
          bestYSnap = {marker: marker, edge: 'top'};
        }
        
        // Check bottom edge
        const bottomDist = Math.abs(wallBottom - marker);
        if(bottomDist < minYDist && bottomDist < snapThreshold) {
          minYDist = bottomDist;
          bestYSnap = {marker: marker, edge: 'bottom'};
        }
        
        // Check center
        const centerDist = Math.abs(wallCenterY - marker);
        if(centerDist < minYDist && centerDist < snapThreshold) {
          minYDist = centerDist;
          bestYSnap = {marker: marker, edge: 'center'};
        }
      });
      
      // Then check edge markers with priority (they override fractional if within threshold)
      yEdgeMarkers.forEach(marker => {
        // Check top edge - prioritized
        const topDist = Math.abs(wallTop - marker);
        if(topDist < snapThreshold) {
          if(!bestYSnap || topDist <= minYDist) {
            minYDist = topDist;
            bestYSnap = {marker: marker, edge: 'top', priority: true};
          }
        }
        
        // Check bottom edge - prioritized
        const bottomDist = Math.abs(wallBottom - marker);
        if(bottomDist < snapThreshold) {
          if(!bestYSnap || bottomDist <= minYDist) {
            minYDist = bottomDist;
            bestYSnap = {marker: marker, edge: 'bottom', priority: true};
          }
        }
        
        // Check center
        const centerDist = Math.abs(wallCenterY - marker);
        if(centerDist < snapThreshold) {
          if(!bestYSnap || centerDist <= minYDist) {
            minYDist = centerDist;
            bestYSnap = {marker: marker, edge: 'center', priority: true};
          }
        }
      });
      
      // Apply Y snap
      if(bestYSnap) {
        if(bestYSnap.edge === 'top') {
          newOffsetY = bestYSnap.marker;
        } else if(bestYSnap.edge === 'bottom') {
          newOffsetY = bestYSnap.marker - wallResY;
        } else if(bestYSnap.edge === 'center') {
          newOffsetY = bestYSnap.marker - wallResY / 2;
        }
      }
    }
    
    // Screen-to-screen snapping - snap to other visible screens' edges
    if(snapEnabled) {
      const screenSnapThreshold = isMobile ? 100 : 40; // Larger on mobile for better feel
      
      // Calculate current wall bounds
      const wallLeft = newOffsetX;
      const wallRight = newOffsetX + wallResX;
      const wallTop = newOffsetY;
      const wallBottom = newOffsetY + wallResY;
      
      let bestScreenXSnap = null;
      let minScreenXDist = Infinity;
      let bestScreenYSnap = null;
      let minScreenYDist = Infinity;
      
      // Check against all other visible screens
      Object.keys(screens).forEach(otherScreenId => {
        if(otherScreenId === draggedScreenId) return; // Skip self
        
        const otherScreen = screens[otherScreenId];
        if(!otherScreen.visible) return; // Skip invisible screens
        
        const otherData = otherScreen.data;
        const otherPanelType = otherData.panelType || 'CB5_MKII';
        const allPanelsSnap = getAllPanels();
        const otherPanel = allPanelsSnap[otherPanelType];
        
        if(!otherPanel || !otherPanel.res_x || !otherPanel.res_y) return;
        
        const otherPw = otherData.panelsWide || 0;
        const otherPh = otherData.panelsHigh || 0;
        
        if(otherPw === 0 || otherPh === 0) return;
        
        // Check if other screen has CB5 half panel row
        const otherHasCB5HalfRow = otherData.addCB5HalfRow && otherPanelType === 'CB5_MKII';
        
        let otherWallResX, otherWallResY;
        if(otherHasCB5HalfRow) {
          const halfPanel = panels['CB5_MKII_HALF'];
          otherWallResX = otherPw * otherPanel.res_x;
          otherWallResY = otherPh * otherPanel.res_y + halfPanel.res_y;
        } else {
          otherWallResX = otherPw * otherPanel.res_x;
          otherWallResY = otherPh * otherPanel.res_y;
        }
        
        const otherLeft = otherData.canvasX || 0;
        const otherRight = otherLeft + otherWallResX;
        const otherTop = otherData.canvasY || 0;
        const otherBottom = otherTop + otherWallResY;
        
        // X-axis snapping: check if walls are vertically overlapping (or close)
        const verticalOverlap = !(wallBottom < otherTop - 50 || wallTop > otherBottom + 50);
        
        if(verticalOverlap) {
          // Snap dragged wall's right edge to other wall's left edge
          const rightToLeftDist = Math.abs(wallRight - otherLeft);
          if(rightToLeftDist < minScreenXDist && rightToLeftDist < screenSnapThreshold) {
            minScreenXDist = rightToLeftDist;
            bestScreenXSnap = { target: otherLeft, edge: 'right' };
          }
          
          // Snap dragged wall's left edge to other wall's right edge
          const leftToRightDist = Math.abs(wallLeft - otherRight);
          if(leftToRightDist < minScreenXDist && leftToRightDist < screenSnapThreshold) {
            minScreenXDist = leftToRightDist;
            bestScreenXSnap = { target: otherRight, edge: 'left' };
          }
          
          // Snap left edges together
          const leftToLeftDist = Math.abs(wallLeft - otherLeft);
          if(leftToLeftDist < minScreenXDist && leftToLeftDist < screenSnapThreshold) {
            minScreenXDist = leftToLeftDist;
            bestScreenXSnap = { target: otherLeft, edge: 'left' };
          }
          
          // Snap right edges together
          const rightToRightDist = Math.abs(wallRight - otherRight);
          if(rightToRightDist < minScreenXDist && rightToRightDist < screenSnapThreshold) {
            minScreenXDist = rightToRightDist;
            bestScreenXSnap = { target: otherRight, edge: 'right' };
          }
        }
        
        // Y-axis snapping: check if walls are horizontally overlapping (or close)
        const horizontalOverlap = !(wallRight < otherLeft - 50 || wallLeft > otherRight + 50);
        
        if(horizontalOverlap) {
          // Snap dragged wall's bottom edge to other wall's top edge
          const bottomToTopDist = Math.abs(wallBottom - otherTop);
          if(bottomToTopDist < minScreenYDist && bottomToTopDist < screenSnapThreshold) {
            minScreenYDist = bottomToTopDist;
            bestScreenYSnap = { target: otherTop, edge: 'bottom' };
          }
          
          // Snap dragged wall's top edge to other wall's bottom edge
          const topToBottomDist = Math.abs(wallTop - otherBottom);
          if(topToBottomDist < minScreenYDist && topToBottomDist < screenSnapThreshold) {
            minScreenYDist = topToBottomDist;
            bestScreenYSnap = { target: otherBottom, edge: 'top' };
          }
          
          // Snap top edges together
          const topToTopDist = Math.abs(wallTop - otherTop);
          if(topToTopDist < minScreenYDist && topToTopDist < screenSnapThreshold) {
            minScreenYDist = topToTopDist;
            bestScreenYSnap = { target: otherTop, edge: 'top' };
          }
          
          // Snap bottom edges together
          const bottomToBottomDist = Math.abs(wallBottom - otherBottom);
          if(bottomToBottomDist < minScreenYDist && bottomToBottomDist < screenSnapThreshold) {
            minScreenYDist = bottomToBottomDist;
            bestScreenYSnap = { target: otherBottom, edge: 'bottom' };
          }
        }
      });
      
      // Apply screen X snap (prioritize screen snapping over canvas markers)
      if(bestScreenXSnap) {
        if(bestScreenXSnap.edge === 'left') {
          newOffsetX = bestScreenXSnap.target;
        } else if(bestScreenXSnap.edge === 'right') {
          newOffsetX = bestScreenXSnap.target - wallResX;
        }
      }
      
      // Apply screen Y snap
      if(bestScreenYSnap) {
        if(bestScreenYSnap.edge === 'top') {
          newOffsetY = bestScreenYSnap.target;
        } else if(bestScreenYSnap.edge === 'bottom') {
          newOffsetY = bestScreenYSnap.target - wallResY;
        }
      }
    }
    
    // Update the dragged screen's canvas position
    if(draggedScreenId && screens[draggedScreenId]) {
      screens[draggedScreenId].data.canvasX = Math.round(newOffsetX);
      screens[draggedScreenId].data.canvasY = Math.round(newOffsetY);

      // If this is the current screen, also update global variables
      if(draggedScreenId === currentScreenId) {
        canvasOffsetX = Math.round(newOffsetX);
        canvasOffsetY = Math.round(newOffsetY);
      }

      // Always update the X/Y input fields for the selected/dragged screen
      document.getElementById('canvasX').value = Math.round(newOffsetX);
      document.getElementById('canvasY').value = Math.round(newOffsetY);

      // Update coordinate display during drag
      updateCanvasInfoDisplay();
    }

    // Draw preview with snap guides
    drawCanvasPreviewWithGuides(newOffsetX, newOffsetY, snapMode);
  });
  
  canvas.addEventListener('mouseup', function(e) {
    if(canvasViewDragging) {
      const wasDraggingCurrentScreen = (draggedScreenId === currentScreenId);
      
      canvasViewDragging = false;
      draggedScreenId = null;
      canvas.style.cursor = 'grab';
      canvasViewOriginalImageData = null;
      
      // Only save current screen data if we weren't dragging the current screen
      // (to avoid overwriting the position we just set during drag)
      if(!wasDraggingCurrentScreen) {
        saveCurrentScreenData();
      }
      
      // Full redraw with actual content
      showCanvasView();

      // Re-draw selection highlight if there's a selected screen
      if(selectedCanvasScreenId) {
        drawSelectionHighlight();
        updateCanvasInfoDisplay();
      }

      // Save state after drag completes
      saveCanvasMoveState();

      // Sync raster screen table if in raster mode
      if(currentAppMode === 'raster' && typeof renderRasterScreenTable === 'function') {
        renderRasterScreenTable();
        if(typeof syncRasterToolbarPosition === 'function') syncRasterToolbarPosition();
      }
    }
  });

  canvas.addEventListener('mouseleave', function(e) {
    if(canvasViewDragging) {
      const wasDraggingCurrentScreen = (draggedScreenId === currentScreenId);

      canvasViewDragging = false;
      draggedScreenId = null;
      canvas.style.cursor = 'grab';
      canvasViewOriginalImageData = null;

      // Only save current screen data if we weren't dragging the current screen
      if(!wasDraggingCurrentScreen) {
        saveCurrentScreenData();
      }

      // Full redraw with actual content
      showCanvasView();

      // Re-draw selection highlight if there's a selected screen
      if(selectedCanvasScreenId) {
        drawSelectionHighlight();
      }

      // Sync raster screen table if in raster mode
      if(currentAppMode === 'raster' && typeof renderRasterScreenTable === 'function') {
        renderRasterScreenTable();
        if(typeof syncRasterToolbarPosition === 'function') syncRasterToolbarPosition();
      }
      
      // Save state after drag completes
      saveCanvasMoveState();
    }
  });

  // ===== TOUCH EVENT HANDLERS FOR MOBILE =====
  // Single finger = select/drag screens
  // Two-finger = pan and zoom (handled by initCanvasTouchPanZoom)
  let touchDragPending = false;
  let touchLastX = 0;
  let touchLastY = 0;

  canvas.addEventListener('touchstart', function(e) {
    // Only handle single-finger touch for screen selection/dragging
    // Two-finger gestures are handled by initCanvasTouchPanZoom for panning/zooming
    if(e.touches.length !== 1) return;

    const touch = e.touches[0];

    // Single finger always handles screen selection/dragging (at any zoom level)
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touchX = (touch.clientX - rect.left) * scaleX;
    const touchY = (touch.clientY - rect.top) * scaleY;

    const clickedScreenId = getScreenAtPosition(touchX, touchY);

    if(clickedScreenId) {
      const screen = screens[clickedScreenId];
      const offsetX = screen.data.canvasX || 0;
      const offsetY = screen.data.canvasY || 0;

      selectedCanvasScreenId = clickedScreenId;
      draggedScreenId = clickedScreenId;
      canvasViewDragging = true;
      canvasViewDragStartX = touchX;
      canvasViewDragStartY = touchY;
      canvasViewStartOffsetX = offsetX;
      canvasViewStartOffsetY = offsetY;

      // Update X/Y input boxes to show selected screen's position
      document.getElementById('canvasX').value = offsetX;
      document.getElementById('canvasY').value = offsetY;

      // Simple highlight without heavy operations
      const ctx = canvas.getContext('2d');
      if(cachedCanvasImageData) {
        ctx.putImageData(cachedCanvasImageData, 0, 0);
      }
      drawSelectionHighlight();
      updateCanvasInfoDisplay();

      e.preventDefault();
    } else if(selectedCanvasScreenId) {
      // Tapped empty area - deselect
      selectedCanvasScreenId = null;
      updateCanvasInfoDisplay();
      const ctx = canvas.getContext('2d');
      if(cachedCanvasImageData) {
        ctx.putImageData(cachedCanvasImageData, 0, 0);
      }
    }
  }, {passive: false});

  canvas.addEventListener('touchmove', function(e) {
    // Only handle single-finger for screen dragging
    // Two-finger panning is handled by initCanvasTouchPanZoom
    if(e.touches.length !== 1) return;

    // Handle screen dragging
    if(!canvasViewDragging || !draggedScreenId) return;

    const touch = e.touches[0];

    e.preventDefault();

    touchLastX = touch.clientX;
    touchLastY = touch.clientY;

    // Throttle updates using requestAnimationFrame
    if(!touchDragPending) {
      touchDragPending = true;
      requestAnimationFrame(function() {
        touchDragPending = false;
        if(!canvasViewDragging || !draggedScreenId) return;

        const screen = screens[draggedScreenId];
        if(!screen) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const touchX = (touchLastX - rect.left) * scaleX;
        const touchY = (touchLastY - rect.top) * scaleY;

        const deltaX = touchX - canvasViewDragStartX;
        const deltaY = touchY - canvasViewDragStartY;

        let newOffsetX = Math.round(canvasViewStartOffsetX + deltaX);
        let newOffsetY = Math.round(canvasViewStartOffsetY + deltaY);

        // Apply snapping if enabled
        if(snapModeEnabled) {
          const allPanels = getAllPanels();
          const screenData = screen.data;
          const panelType = screenData.panelType || 'CB5_MKII';
          const p = allPanels[panelType];
          if(p && p.res_x && p.res_y) {
            const pw = screenData.panelsWide || 0;
            const ph = screenData.panelsHigh || 0;
            const wallResX = pw * p.res_x;
            const wallResY = ph * p.res_y;
            // Touch is always mobile, use larger threshold for firm snapping
            const snapThreshold = 80;

            // Canvas edge and center snapping
            const canvasW = canvas.width;
            const canvasH = canvas.height;
            const wallCenterX = newOffsetX + wallResX / 2;
            const wallCenterY = newOffsetY + wallResY / 2;

            // X-axis snap to edges and center
            if(Math.abs(newOffsetX) < snapThreshold) newOffsetX = 0;
            else if(Math.abs(newOffsetX + wallResX - canvasW) < snapThreshold) newOffsetX = canvasW - wallResX;
            else if(Math.abs(wallCenterX - canvasW/2) < snapThreshold) newOffsetX = canvasW/2 - wallResX/2;

            // Y-axis snap to edges and center
            if(Math.abs(newOffsetY) < snapThreshold) newOffsetY = 0;
            else if(Math.abs(newOffsetY + wallResY - canvasH) < snapThreshold) newOffsetY = canvasH - wallResY;
            else if(Math.abs(wallCenterY - canvasH/2) < snapThreshold) newOffsetY = canvasH/2 - wallResY/2;

            // Screen-to-screen snapping
            Object.keys(screens).forEach(otherId => {
              if(otherId === draggedScreenId) return;
              const otherScreen = screens[otherId];
              if(!otherScreen.visible) return;

              const od = otherScreen.data;
              const opt = od.panelType || 'CB5_MKII';
              const allPanelsTouch = getAllPanels();
              const op = allPanelsTouch[opt];
              if(!op) return;

              const oResX = (od.panelsWide || 0) * op.res_x;
              const oResY = (od.panelsHigh || 0) * op.res_y;
              const oX = od.canvasX || 0;
              const oY = od.canvasY || 0;

              // X snapping to other screen
              if(Math.abs(newOffsetX - (oX + oResX)) < snapThreshold) newOffsetX = oX + oResX;
              else if(Math.abs(newOffsetX + wallResX - oX) < snapThreshold) newOffsetX = oX - wallResX;
              else if(Math.abs(newOffsetX - oX) < snapThreshold) newOffsetX = oX;
              else if(Math.abs(newOffsetX + wallResX - (oX + oResX)) < snapThreshold) newOffsetX = oX + oResX - wallResX;

              // Y snapping to other screen
              if(Math.abs(newOffsetY - (oY + oResY)) < snapThreshold) newOffsetY = oY + oResY;
              else if(Math.abs(newOffsetY + wallResY - oY) < snapThreshold) newOffsetY = oY - wallResY;
              else if(Math.abs(newOffsetY - oY) < snapThreshold) newOffsetY = oY;
              else if(Math.abs(newOffsetY + wallResY - (oY + oResY)) < snapThreshold) newOffsetY = oY + oResY - wallResY;
            });
          }
        }

        // Update position
        screens[draggedScreenId].data.canvasX = newOffsetX;
        screens[draggedScreenId].data.canvasY = newOffsetY;

        // If this is the current screen, also update global variables
        if(draggedScreenId === currentScreenId) {
          canvasOffsetX = newOffsetX;
          canvasOffsetY = newOffsetY;
        }

        // Update coordinate display during drag
        updateCanvasInfoDisplay();

        // Simple redraw
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw all screens at their positions
        Object.keys(screens).forEach(id => {
          const s = screens[id];
          if(!s.visible) return;

          const d = s.data;
          const pt = d.panelType || 'CB5_MKII';
          const allPanelsDraw = getAllPanels();
          const panel = allPanelsDraw[pt];
          if(!panel) return;

          const pw = d.panelsWide || 0;
          const ph = d.panelsHigh || 0;
          if(pw <= 0 || ph <= 0) return;

          const resX = pw * panel.res_x;
          const resY = ph * panel.res_y;
          const x = d.canvasX || 0;
          const y = d.canvasY || 0;

          // Draw screen rectangle
          ctx.fillStyle = s.color || '#10b981';
          ctx.globalAlpha = 0.3;
          ctx.fillRect(x, y, resX, resY);
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = s.color || '#10b981';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, resX, resY);

          // Draw screen name
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(s.name, x + resX/2, y + resY/2);
        });

        // Highlight selected screen
        if(selectedCanvasScreenId && screens[selectedCanvasScreenId]) {
          const sel = screens[selectedCanvasScreenId];
          const sd = sel.data;
          const spt = sd.panelType || 'CB5_MKII';
          const allPanelsSel = getAllPanels();
          const sp = allPanelsSel[spt];
          if(sp) {
            const sx = sd.canvasX || 0;
            const sy = sd.canvasY || 0;
            const sw = (sd.panelsWide || 0) * sp.res_x;
            const sh = (sd.panelsHigh || 0) * sp.res_y;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(sx - 2, sy - 2, sw + 4, sh + 4);
            ctx.setLineDash([]);
          }
        }

        // Draw canvas boundary border
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 6;
        ctx.setLineDash([]);
        ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

        // Draw yellow snap guide lines when snapping is enabled
        if(snapModeEnabled) {
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;

          ctx.strokeStyle = '#FFFF00';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);

          // Vertical guide lines - edges (0, 1) and center (1/2)
          [0, 0.5, 1].forEach(ratio => {
            const x = canvasWidth * ratio;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
          });

          // Horizontal guide lines - edges (0, 1) and center (1/2)
          [0, 0.5, 1].forEach(ratio => {
            const y = canvasHeight * ratio;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
          });

          ctx.setLineDash([]);
        }
      });
    }
  }, {passive: false});

  canvas.addEventListener('touchend', function(e) {
    if(canvasViewDragging) {
      canvasViewDragging = false;
      draggedScreenId = null;
      touchDragPending = false;

      // Full redraw on end
      showCanvasView();
      if(selectedCanvasScreenId) {
        drawSelectionHighlight();
        updateCanvasInfoDisplay();
      }
      saveCanvasMoveState();

      // Sync raster screen table if in raster mode
      if(currentAppMode === 'raster' && typeof renderRasterScreenTable === 'function') {
        renderRasterScreenTable();
        if(typeof syncRasterToolbarPosition === 'function') syncRasterToolbarPosition();
      }
    }
  });

  canvas.addEventListener('touchcancel', function(e) {
    if(canvasViewDragging) {
      canvasViewDragging = false;
      draggedScreenId = null;
      touchDragPending = false;

      showCanvasView();
      if(selectedCanvasScreenId) {
        drawSelectionHighlight();
        updateCanvasInfoDisplay();
      }
      saveCanvasMoveState();

      // Sync raster screen table if in raster mode
      if(currentAppMode === 'raster' && typeof renderRasterScreenTable === 'function') {
        renderRasterScreenTable();
        if(typeof syncRasterToolbarPosition === 'function') syncRasterToolbarPosition();
      }
    }
  });
}

// Canvas Zoom Functions
function zoomCanvas(delta) {
  const oldZoom = canvasZoomLevel;
  canvasZoomLevel = Math.max(0.5, Math.min(5.0, canvasZoomLevel + delta));
  
  if(canvasZoomLevel !== oldZoom) {
    // Constrain pan when zooming out
    constrainCanvasPan();
    updateCanvasViewport();
    
    // Re-draw selection highlight if there's a selected screen
    if(selectedCanvasScreenId) {
      drawSelectionHighlight();
    }
  }
}

function setCanvasZoom(percent) {
  const value = parseFloat(percent);
  if(isNaN(value)) return;
  
  canvasZoomLevel = Math.max(0.5, Math.min(5.0, value / 100));
  constrainCanvasPan();
  updateCanvasViewport();
  
  // Re-draw selection highlight if there's a selected screen
  if(selectedCanvasScreenId) {
    drawSelectionHighlight();
  }
}

function resetCanvasZoom() {
  canvasZoomLevel = 1.0;
  canvasPanX = 0;
  canvasPanY = 0;
  updateCanvasViewport();
  
  // Re-draw selection highlight if there's a selected screen
  if(selectedCanvasScreenId) {
    drawSelectionHighlight();
  }
}

function updateCanvasViewport() {
  const viewport = document.getElementById('canvasViewport');
  const zoomInput = document.getElementById('canvasZoomInput');
  
  if(viewport) {
    // First reset to identity transform to clear any stale state
    viewport.style.transform = 'none';
    void viewport.offsetHeight; // Force reflow
    
    // Now apply the actual transform
    viewport.style.transform = `translate(${canvasPanX}px, ${canvasPanY}px) scale(${canvasZoomLevel})`;
    void viewport.offsetHeight; // Force reflow again
  }
  
  if(zoomInput) {
    zoomInput.value = Math.round(canvasZoomLevel * 100);
  }
}

function constrainCanvasPan() {
  const canvas = document.getElementById('canvasView');
  const wrapper = document.getElementById('canvasViewWrapper');
  if(!canvas || !wrapper) return;

  // Get actual wrapper dimensions from DOM
  const wrapperRect = wrapper.getBoundingClientRect();
  const wrapperWidth = wrapperRect.width || 800;
  const wrapperHeight = wrapperRect.height || 450;

  // Get actual canvas display size from DOM
  const canvasRect = canvas.getBoundingClientRect();
  // At zoom 1.0, the canvas display size equals the wrapper size (due to object-fit)
  // We need the base display size before zoom is applied
  const baseDisplayWidth = wrapperWidth;
  const baseDisplayHeight = wrapperHeight;

  // Calculate scaled size (how big the canvas appears with zoom)
  const scaledWidth = baseDisplayWidth * canvasZoomLevel;
  const scaledHeight = baseDisplayHeight * canvasZoomLevel;

  // Calculate pan limits
  // When zoomed in, we can pan to see the entire scaled canvas
  const minPanX = Math.min(0, wrapperWidth - scaledWidth);
  const minPanY = Math.min(0, wrapperHeight - scaledHeight);
  const maxPanX = 0;
  const maxPanY = 0;

  // Constrain pan
  canvasPanX = Math.max(minPanX, Math.min(maxPanX, canvasPanX));
  canvasPanY = Math.max(minPanY, Math.min(maxPanY, canvasPanY));
}

// Add mouse wheel zoom support
function initCanvasWheelZoom() {
  const wrapper = document.getElementById('canvasViewWrapper');
  if(!wrapper) return;
  
  wrapper.addEventListener('wheel', function(e) {
    // Only zoom if Ctrl key is held, otherwise allow normal scroll
    if(e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      zoomCanvas(delta);
    }
  }, { passive: false });
}

// Initialize canvas panning (middle mouse button only)
function initCanvasPanning() {
  const wrapper = document.getElementById('canvasViewWrapper');
  const viewport = document.getElementById('canvasViewport');
  if(!wrapper || !viewport) return;

  // Prevent default middle-click behavior (auto-scroll) on the wrapper
  wrapper.addEventListener('mousedown', function(e) {
    if(e.button === 1) {
      e.preventDefault();
    }
  });

  // Middle mouse button (button === 1) for panning
  wrapper.addEventListener('mousedown', function(e) {
    if(e.button === 1) {
      isPanningCanvas = true;
      panStartX = e.clientX - canvasPanX;
      panStartY = e.clientY - canvasPanY;
      viewport.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', function(e) {
    if(isPanningCanvas) {
      canvasPanX = e.clientX - panStartX;
      canvasPanY = e.clientY - panStartY;
      constrainCanvasPan();
      updateCanvasViewport();
    }
  });

  document.addEventListener('mouseup', function(e) {
    if(isPanningCanvas) {
      isPanningCanvas = false;
      viewport.style.cursor = 'grab';
    }
  });
}

// Touch panning and pinch-to-zoom for mobile
// Two-finger drag = pan (like middle mouse on desktop)
// Pinch = zoom
// Single finger = select/drag screens (handled by canvas touch events)
function initCanvasTouchPanZoom() {
  const wrapper = document.getElementById('canvasViewWrapper');
  const viewport = document.getElementById('canvasViewport');
  if(!wrapper || !viewport) return;

  let touchPanStartX = 0;
  let touchPanStartY = 0;
  let touchPanStartPanX = 0;
  let touchPanStartPanY = 0;
  let isTwoFingerPanning = false;
  let initialPinchDistance = 0;
  let initialPinchZoom = 1;

  // Get distance between two touch points
  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  wrapper.addEventListener('touchstart', function(e) {
    // Two-finger touch: prepare for pinch-zoom and pan
    if(e.touches.length === 2) {
      e.preventDefault();
      initialPinchDistance = getTouchDistance(e.touches);
      initialPinchZoom = canvasZoomLevel;

      // Prepare for two-finger pan (works at any zoom level)
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      touchPanStartX = midX;
      touchPanStartY = midY;
      touchPanStartPanX = canvasPanX;
      touchPanStartPanY = canvasPanY;
      isTwoFingerPanning = true;
    }
    // Single finger: let canvas handle screen selection/dragging (don't prevent default)
  }, { passive: false });

  wrapper.addEventListener('touchmove', function(e) {
    // Two-finger: pinch-zoom and pan
    if(e.touches.length === 2 && isTwoFingerPanning) {
      e.preventDefault();

      // Pinch zoom
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / initialPinchDistance;
      const newZoom = Math.max(0.5, Math.min(5.0, initialPinchZoom * scale));

      if(newZoom !== canvasZoomLevel) {
        canvasZoomLevel = newZoom;
        constrainCanvasPan();
        updateCanvasViewport();
      }

      // Two-finger pan (works at any zoom level)
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      canvasPanX = touchPanStartPanX + (midX - touchPanStartX);
      canvasPanY = touchPanStartPanY + (midY - touchPanStartY);
      constrainCanvasPan();
      updateCanvasViewport();
    }
    // Single finger: let canvas handle screen dragging
  }, { passive: false });

  wrapper.addEventListener('touchend', function(e) {
    if(e.touches.length < 2) {
      isTwoFingerPanning = false;
      initialPinchDistance = 0;
    }
  });

  wrapper.addEventListener('touchcancel', function(e) {
    isTwoFingerPanning = false;
    initialPinchDistance = 0;
  });
}


// ==================== CANVAS MOVEMENT UNDO/REDO ====================
function saveCanvasMoveState() {
  // Save positions of ALL screens
  const state = {
    screenPositions: {}
  };
  
  // Store each screen's position
  Object.keys(screens).forEach(screenId => {
    const screen = screens[screenId];
    state.screenPositions[screenId] = {
      x: screen.data.canvasX || 0,
      y: screen.data.canvasY || 0
    };
  });
  
  // Also store which screen is selected
  state.selectedScreenId = selectedCanvasScreenId;
  
  // Remove any states after current index (user made a new move after undoing)
  canvasMoveHistory = canvasMoveHistory.slice(0, canvasMoveHistoryIndex + 1);
  
  // Add new state
  canvasMoveHistory.push(state);
  
  // Limit history size
  if(canvasMoveHistory.length > MAX_CANVAS_HISTORY) {
    canvasMoveHistory.shift();
  } else {
    canvasMoveHistoryIndex++;
  }
  
  updateCanvasUndoRedoButtons();
}

function undoCanvasMove() {
  // Need at least 2 states to undo (current + previous)
  if(canvasMoveHistoryIndex <= 0) return;
  
  // Move back one step
  canvasMoveHistoryIndex--;
  
  // Restore the state at this index
  const previousState = canvasMoveHistory[canvasMoveHistoryIndex];
  
  // Restore all screen positions
  if(previousState.screenPositions) {
    Object.keys(previousState.screenPositions).forEach(screenId => {
      if(screens[screenId]) {
        screens[screenId].data.canvasX = previousState.screenPositions[screenId].x;
        screens[screenId].data.canvasY = previousState.screenPositions[screenId].y;
      }
    });
  } else {
    // Legacy format - single x/y (for backwards compatibility)
    if(selectedCanvasScreenId && screens[selectedCanvasScreenId]) {
      screens[selectedCanvasScreenId].data.canvasX = previousState.x;
      screens[selectedCanvasScreenId].data.canvasY = previousState.y;
    } else if(screens[currentScreenId]) {
      screens[currentScreenId].data.canvasX = previousState.x;
      screens[currentScreenId].data.canvasY = previousState.y;
    }
  }
  
  // Update X/Y inputs to show selected or current screen position
  const displayScreenId = selectedCanvasScreenId || currentScreenId;
  if(screens[displayScreenId]) {
    document.getElementById('canvasX').value = screens[displayScreenId].data.canvasX || 0;
    document.getElementById('canvasY').value = screens[displayScreenId].data.canvasY || 0;
    
    // Update global variables if it's the current screen
    if(displayScreenId === currentScreenId) {
      canvasOffsetX = screens[displayScreenId].data.canvasX || 0;
      canvasOffsetY = screens[displayScreenId].data.canvasY || 0;
    }
  }
  
  // Redraw canvas
  showCanvasView();
  
  // Re-draw selection highlight if there's a selected screen
  if(selectedCanvasScreenId) {
    drawSelectionHighlight();
  }
  
  updateCanvasUndoRedoButtons();
}

function redoCanvasMove() {
  // Check if we can redo
  if(canvasMoveHistoryIndex >= canvasMoveHistory.length - 1) return;
  
  // Move forward one step
  canvasMoveHistoryIndex++;
  
  // Restore the state at this index
  const nextState = canvasMoveHistory[canvasMoveHistoryIndex];
  
  // Restore all screen positions
  if(nextState.screenPositions) {
    Object.keys(nextState.screenPositions).forEach(screenId => {
      if(screens[screenId]) {
        screens[screenId].data.canvasX = nextState.screenPositions[screenId].x;
        screens[screenId].data.canvasY = nextState.screenPositions[screenId].y;
      }
    });
  } else {
    // Legacy format - single x/y (for backwards compatibility)
    if(selectedCanvasScreenId && screens[selectedCanvasScreenId]) {
      screens[selectedCanvasScreenId].data.canvasX = nextState.x;
      screens[selectedCanvasScreenId].data.canvasY = nextState.y;
    } else if(screens[currentScreenId]) {
      screens[currentScreenId].data.canvasX = nextState.x;
      screens[currentScreenId].data.canvasY = nextState.y;
    }
  }
  
  // Update X/Y inputs to show selected or current screen position
  const displayScreenId = selectedCanvasScreenId || currentScreenId;
  if(screens[displayScreenId]) {
    document.getElementById('canvasX').value = screens[displayScreenId].data.canvasX || 0;
    document.getElementById('canvasY').value = screens[displayScreenId].data.canvasY || 0;
    
    // Update global variables if it's the current screen
    if(displayScreenId === currentScreenId) {
      canvasOffsetX = screens[displayScreenId].data.canvasX || 0;
      canvasOffsetY = screens[displayScreenId].data.canvasY || 0;
    }
  }
  
  // Redraw canvas
  showCanvasView();
  
  // Re-draw selection highlight if there's a selected screen
  if(selectedCanvasScreenId) {
    drawSelectionHighlight();
  }
  
  updateCanvasUndoRedoButtons();
}

function updateCanvasUndoRedoButtons() {
  const undoBtn = document.getElementById('canvasUndoBtn');
  const redoBtn = document.getElementById('canvasRedoBtn');
  
  if(undoBtn) {
    undoBtn.disabled = canvasMoveHistoryIndex <= 0;
  }
  if(redoBtn) {
    redoBtn.disabled = canvasMoveHistoryIndex >= canvasMoveHistory.length - 1;
  }
}


// ==================== CANVAS SCREEN TOGGLES ====================
function updateCanvasScreenToggles() {
  const container = document.getElementById('canvasScreenToggles');
  if(!container) return;

  let html = '<div style="margin-top: 16px; margin-bottom: 12px; display: inline-block; background: #1a1a1a; border: 1px solid var(--primary); padding: 4px 10px; font-family: Bangers, cursive; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; color: var(--primary); transform: rotate(-2deg);">Visible Screens</div>';

  // Sort screen IDs numerically
  const screenIds = Object.keys(screens).sort((a, b) => {
    const numA = parseInt(a.split('_')[1]);
    const numB = parseInt(b.split('_')[1]);
    return numA - numB;
  });
  screenIds.forEach(screenId => {
    const screen = screens[screenId];
    const showCoords = screen.showCoordinates !== false;
    const showPixels = screen.showPixelDimensions !== false;
    const showCrosshair = screen.showCrosshair !== false;

    const textOutline = 'text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;';
    const safeScreenColor = safeColor(screen.color);
    const safeScreenId = escapeJsString(screenId);
    html += `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; padding: 4px 6px; background: #2a2a2a; border-radius: 4px;">
        <button type="button" class="toggle-btn ${screen.visible ? 'active' : ''}"
                style="padding: 3px 6px; font-size: 10px; min-height: 24px; line-height: 1; display: inline-flex; align-items: center; gap: 4px; width: 110px; justify-content: flex-start; border: 2px solid #000; box-shadow: 2px 2px 0px 0px rgba(0,0,0,1); ${screen.visible ? textOutline : ''}"
                onclick="toggleScreenVisibility('${safeScreenId}', ${!screen.visible})">
          <span style="display: inline-block; width: 10px; height: 10px; background: ${safeScreenColor}; border: 1px solid #666; flex-shrink: 0;"></span>
          ${escapeHtml(screen.name)}
        </button>
        <div style="display: flex; gap: 4px;">
          <button type="button" class="toggle-btn ${showCoords ? 'active' : ''}"
                  style="padding: 3px 6px; font-size: 10px; min-width: 28px; min-height: 24px; line-height: 1; border: 2px solid #000; box-shadow: 2px 2px 0px 0px rgba(0,0,0,1); ${showCoords ? textOutline : ''}"
                  onclick="toggleScreenCoordinates('${safeScreenId}')">X/Y</button>
          <button type="button" class="toggle-btn ${showPixels ? 'active' : ''}"
                  style="padding: 3px 6px; font-size: 10px; min-width: 38px; min-height: 24px; line-height: 1; border: 2px solid #000; box-shadow: 2px 2px 0px 0px rgba(0,0,0,1); ${showPixels ? textOutline : ''}"
                  onclick="toggleScreenPixelDimensions('${safeScreenId}')">Pixels</button>
          <button type="button" class="toggle-btn ${showCrosshair ? 'active' : ''}"
                  style="padding: 3px 6px; font-size: 10px; min-width: 24px; min-height: 24px; line-height: 1; border: 2px solid #000; box-shadow: 2px 2px 0px 0px rgba(0,0,0,1); ${showCrosshair ? textOutline : ''}"
                  onclick="toggleScreenCrosshair('${safeScreenId}')" title="Show X crosshair">X</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function toggleScreenVisibility(screenId, visible) {
  if(screens[screenId]) {
    screens[screenId].visible = visible;
    // Update current canvas's visibility tracking
    if(currentCanvasId && canvases[currentCanvasId]) {
      if(!canvases[currentCanvasId].data.screenVisibility) {
        canvases[currentCanvasId].data.screenVisibility = {};
      }
      canvases[currentCanvasId].data.screenVisibility[screenId] = visible;

      // If turning ON a screen, turn it OFF in all other canvases
      if(visible) {
        Object.keys(canvases).forEach(canvasId => {
          if(canvasId !== currentCanvasId) {
            if(!canvases[canvasId].data.screenVisibility) {
              canvases[canvasId].data.screenVisibility = {};
            }
            canvases[canvasId].data.screenVisibility[screenId] = false;
          }
        });
      }
    }
    // Update toggle button states and redraw canvas view
    updateCanvasScreenToggles();
    showCanvasView();
  }
}

function toggleScreenCoordinates(screenId) {
  if(screens[screenId]) {
    // Toggle - default is true (shown), so undefined or true becomes false, false becomes true
    screens[screenId].showCoordinates = screens[screenId].showCoordinates === false ? true : false;
    updateCanvasScreenToggles();
    showCanvasView();
  }
}

function toggleScreenPixelDimensions(screenId) {
  if(screens[screenId]) {
    // Toggle - default is true (shown), so undefined or true becomes false, false becomes true
    screens[screenId].showPixelDimensions = screens[screenId].showPixelDimensions === false ? true : false;
    updateCanvasScreenToggles();
    showCanvasView();
  }
}

function toggleScreenCrosshair(screenId) {
  if(screens[screenId]) {
    // Toggle - default is true (shown), so undefined or true becomes false, false becomes true
    screens[screenId].showCrosshair = screens[screenId].showCrosshair === false ? true : false;
    updateCanvasScreenToggles();
    showCanvasView();
  }
}

