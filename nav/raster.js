// ==================== RASTER MAPPING VIEW ====================
// Single-page raster mapping mode with canvas view + screen table.
// Shares the global `screens` object with Simple/Complex modes.
// Canvas rendering and interactivity is reused from nav/canvas.js.

// ==================== RASTER VIEW ACTIVATION ====================

function activateRasterView() {
  // Show canvas tabs, canvas container, and raster screen table
  const canvasTabsEl = document.getElementById('canvasTabsContainer');
  const canvasContainer = document.getElementById('canvasContainer');
  const rasterTable = document.getElementById('rasterScreenTableContainer');

  if(canvasTabsEl) canvasTabsEl.style.display = 'flex';
  if(canvasContainer) canvasContainer.style.display = 'block';
  if(canvasContainer) canvasContainer.classList.add('raster-mode');
  if(rasterTable) rasterTable.style.display = 'block';

  // Render the screen table and refresh canvas
  renderRasterScreenTable();

  // Use existing canvas rendering
  if(typeof showCanvasView === 'function') {
    showCanvasView();
  }

  // Hide elements redundant with the raster table
  const canvasToggles = document.getElementById('canvasScreenToggles');
  if(canvasToggles) canvasToggles.style.display = 'none';
  const canvasInfo = document.getElementById('canvasInfo');
  if(canvasInfo) canvasInfo.style.display = 'none';

  // Sync toolbar values from canvas options and init listeners once
  syncToolbarFromCanvasOptions();
  if(!rasterToolbarInitialized) {
    initRasterToolbarListeners();
    rasterToolbarInitialized = true;
  }
}

// ==================== SCREEN TABLE RENDERING ====================

function renderRasterScreenTable() {
  const container = document.getElementById('rasterScreenTable');
  if(!container) return;

  const allPanels = getAllPanels();

  // Sort screen IDs numerically
  const screenIds = Object.keys(screens).sort(function(a, b) {
    var numA = parseInt(a.split('_')[1]);
    var numB = parseInt(b.split('_')[1]);
    return numA - numB;
  });

  var html = '<table class="raster-table"><thead><tr>';
  html += '<th>Name</th><th>Panel</th><th>Tile X</th><th>Tile Y</th>';
  html += '<th>Cols</th><th>Rows</th>';
  html += '<th>Offset X</th><th>Offset Y</th>';
  html += '<th>Overlays</th><th>Active</th>';
  html += '</tr></thead><tbody>';

  screenIds.forEach(function(screenId) {
    var screen = screens[screenId];
    var data = screen.data;
    var panelType = data.panelType || 'BP2_V2';
    var p = allPanels[panelType];
    var tileX = p ? (p.res_x || 0) : 0;
    var tileY = p ? (p.res_y || 0) : 0;
    var cols = data.panelsWide || 0;
    var rows = data.panelsHigh || 0;

    var safeId = escapeJsString(screenId);
    var showCoords = screen.showCoordinates !== false;
    var showPixels = screen.showPixelDimensions !== false;
    var showCross = screen.showCrosshair !== false;
    var textOutline = 'text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;';
    var screenColor = safeColor(screen.color);

    html += '<tr data-screen-id="' + escapeHtml(screenId) + '">';

    // Screen name
    html += '<td><input type="text" class="raster-input raster-name" value="' + escapeHtml(screen.name) + '" ' +
            'oninput="updateRasterScreenName(\'' + safeId + '\', this.value)"></td>';

    // Panel dropdown
    html += '<td><select class="raster-select" onchange="updateRasterScreenPanel(\'' + safeId + '\', this.value)">' +
            buildRasterPanelOptions(panelType) +
            '</select></td>';

    // Tile X / Tile Y (read-only input fields)
    html += '<td><input type="number" class="raster-input raster-num" value="' + tileX + '" readonly></td>';
    html += '<td><input type="number" class="raster-input raster-num" value="' + tileY + '" readonly></td>';

    // Cols
    html += '<td><input type="number" class="raster-input raster-num" ' + (cols ? 'value="' + cols + '"' : '') + ' placeholder="0" min="0" ' +
            'oninput="updateRasterScreenDim(\'' + safeId + '\', \'panelsWide\', this.value)"></td>';

    // Rows
    html += '<td><input type="number" class="raster-input raster-num" ' + (rows ? 'value="' + rows + '"' : '') + ' placeholder="0" min="0" ' +
            'oninput="updateRasterScreenDim(\'' + safeId + '\', \'panelsHigh\', this.value)"></td>';

    // Offset X
    var ox = data.canvasX || 0;
    html += '<td><input type="number" class="raster-input raster-num" ' + (ox ? 'value="' + ox + '"' : '') + ' placeholder="0" ' +
            'oninput="updateRasterScreenPos(\'' + safeId + '\', \'canvasX\', this.value)"></td>';

    // Offset Y
    var oy = data.canvasY || 0;
    html += '<td><input type="number" class="raster-input raster-num" ' + (oy ? 'value="' + oy + '"' : '') + ' placeholder="0" ' +
            'oninput="updateRasterScreenPos(\'' + safeId + '\', \'canvasY\', this.value)"></td>';

    // Overlay toggles (X/Y, Pixels, Crosshair)
    html += '<td><div class="raster-overlays">' +
            '<button type="button" class="raster-toggle-btn ' + (showCoords ? 'active' : '') + '" ' +
            'style="' + (showCoords ? textOutline : '') + '" ' +
            'onclick="toggleRasterOverlay(\'' + safeId + '\', \'showCoordinates\')">X/Y</button>' +
            '<button type="button" class="raster-toggle-btn ' + (showPixels ? 'active' : '') + '" ' +
            'style="' + (showPixels ? textOutline : '') + '" ' +
            'onclick="toggleRasterOverlay(\'' + safeId + '\', \'showPixelDimensions\')">Px</button>' +
            '<button type="button" class="raster-toggle-btn ' + (showCross ? 'active' : '') + '" ' +
            'style="' + (showCross ? textOutline : '') + '" ' +
            'onclick="toggleRasterOverlay(\'' + safeId + '\', \'showCrosshair\')">X</button>' +
            '</div></td>';

    // Active/visible toggle
    html += '<td><button type="button" class="raster-toggle-btn ' + (screen.visible ? 'active' : '') + '" ' +
            'style="' + (screen.visible ? textOutline : '') + '" ' +
            'onclick="toggleRasterScreenVisible(\'' + safeId + '\')">' +
            '<span style="display:inline-block;width:8px;height:8px;background:' + screenColor + ';border:1px solid #666;"></span>' +
            '</button></td>';

    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// ==================== PANEL DROPDOWN BUILDER ====================

function buildRasterPanelOptions(selectedValue) {
  var html = '';

  // Group built-in panels by brand
  var builtInByBrand = {};
  Object.keys(panels).forEach(function(key) {
    var brand = panels[key].brand || 'Other';
    if(!builtInByBrand[brand]) builtInByBrand[brand] = [];
    builtInByBrand[brand].push({ key: key, panel: panels[key] });
  });

  Object.keys(builtInByBrand).sort().forEach(function(brand) {
    html += '<optgroup label="' + escapeHtml(brand) + '">';
    builtInByBrand[brand].forEach(function(item) {
      html += '<option value="' + item.key + '"' + (item.key === selectedValue ? ' selected' : '') + '>' +
              escapeHtml(item.panel.name) + '</option>';
    });
    html += '</optgroup>';
  });

  // Custom panels
  if(Object.keys(customPanels).length > 0) {
    var customByBrand = {};
    Object.keys(customPanels).forEach(function(key) {
      var brand = customPanels[key].brand || 'Custom';
      if(!customByBrand[brand]) customByBrand[brand] = [];
      customByBrand[brand].push({ key: key, panel: customPanels[key] });
    });

    Object.keys(customByBrand).sort().forEach(function(brand) {
      html += '<optgroup label="' + escapeHtml(brand) + ' (Custom)">';
      customByBrand[brand].forEach(function(item) {
        var star = item.panel.is_community ? '\u2605 ' : '';
        html += '<option value="' + item.key + '"' + (item.key === selectedValue ? ' selected' : '') + '>' +
                star + escapeHtml(item.panel.name) + '</option>';
      });
      html += '</optgroup>';
    });
  }

  // Add Custom Panel option
  html += '<option value="__ADD_CUSTOM__" style="color: #4a9eff; font-weight: bold;">Add Custom Panel...</option>';

  return html;
}

// ==================== SCREEN TABLE UPDATE HANDLERS ====================

var _rasterNameTimer = null;
function updateRasterScreenName(screenId, value) {
  if(!screens[screenId]) return;
  screens[screenId].name = (value || '').trim().substring(0, 50) || screens[screenId].name;

  // Update canvas immediately, debounce table/tabs re-render to avoid losing focus
  showCanvasView();
  clearTimeout(_rasterNameTimer);
  _rasterNameTimer = setTimeout(function() {
    if(typeof renderScreenTabs === 'function') renderScreenTabs();
    renderRasterScreenTable();
    if(typeof updateCanvasScreenToggles === 'function') updateCanvasScreenToggles();
  }, 500);
}

function updateRasterScreenPanel(screenId, panelType) {
  if(panelType === '__ADD_CUSTOM__') {
    openRasterCustomPanelModal(screenId);
    // Reset dropdown to current value (don't keep __ADD_CUSTOM__ selected)
    renderRasterScreenTable();
    return;
  }
  if(!screens[screenId]) return;

  screens[screenId].data.panelType = panelType;

  // Sync to main panelType dropdown if this is the current screen
  if(screenId === currentScreenId) {
    var panelTypeEl = document.getElementById('panelType');
    if(panelTypeEl) panelTypeEl.value = panelType;
  }

  renderRasterScreenTable();
  showCanvasView();
}

var _rasterDimTimer = null;
function updateRasterScreenDim(screenId, field, value) {
  if(!screens[screenId]) return;
  screens[screenId].data[field] = parseInt(value) || 0;

  // Sync to main dimension inputs if this is the current screen
  if(screenId === currentScreenId) {
    var el = document.getElementById(field);
    if(el) el.value = screens[screenId].data[field];
  }

  // Update canvas immediately, debounce table re-render to avoid losing focus
  showCanvasView();
  clearTimeout(_rasterDimTimer);
  _rasterDimTimer = setTimeout(function() { renderRasterScreenTable(); }, 500);
}

function updateRasterScreenPos(screenId, field, value) {
  if(!screens[screenId]) return;
  screens[screenId].data[field] = parseInt(value) || 0;

  // Sync to canvas X/Y inputs if this is the current screen
  if(screenId === currentScreenId) {
    var el = document.getElementById(field);
    if(el) el.value = screens[screenId].data[field];
  }

  showCanvasView();
}

function toggleRasterOverlay(screenId, property) {
  if(!screens[screenId]) return;
  screens[screenId][property] = screens[screenId][property] === false ? true : false;
  renderRasterScreenTable();
  showCanvasView();
  if(typeof updateCanvasScreenToggles === 'function') updateCanvasScreenToggles();
}

function toggleRasterScreenVisible(screenId) {
  if(!screens[screenId]) return;
  screens[screenId].visible = !screens[screenId].visible;

  // Update current canvas's visibility tracking
  if(typeof currentCanvasId !== 'undefined' && currentCanvasId && typeof canvases !== 'undefined' && canvases[currentCanvasId]) {
    if(!canvases[currentCanvasId].data.screenVisibility) {
      canvases[currentCanvasId].data.screenVisibility = {};
    }
    canvases[currentCanvasId].data.screenVisibility[screenId] = screens[screenId].visible;

    // If turning ON, turn it OFF in all other canvases (exclusive assignment)
    if(screens[screenId].visible) {
      Object.keys(canvases).forEach(function(canvasId) {
        if(canvasId !== currentCanvasId) {
          if(!canvases[canvasId].data.screenVisibility) {
            canvases[canvasId].data.screenVisibility = {};
          }
          canvases[canvasId].data.screenVisibility[screenId] = false;
        }
      });
    }
  }

  renderRasterScreenTable();
  showCanvasView();
  if(typeof updateCanvasScreenToggles === 'function') updateCanvasScreenToggles();
}

// ==================== ADD SCREEN ====================

function addRasterScreen() {
  // Reuse existing addNewScreen if available, otherwise create manually
  if(typeof addNewScreen === 'function') {
    addNewScreen();
    renderRasterScreenTable();
    showCanvasView();
    return;
  }

  // Fallback: create screen manually (matching multi-screen.js pattern)
  screenIdCounter++;
  var newScreenId = 'screen_' + screenIdCounter;
  var screenNumber = Object.keys(screens).length + 1;

  var color, color2;
  if(typeof screenColors !== 'undefined' && screenNumber <= screenColors.length) {
    color = screenColors[screenNumber - 1];
    color2 = screenColors2[screenNumber - 1];
  } else if(typeof generateCustomScreenColor === 'function') {
    color = generateCustomScreenColor(screenNumber);
    color2 = typeof darkenColor === 'function' ? darkenColor(color, 30) : color;
  } else {
    color = '#808080';
    color2 = '#606060';
  }

  screens[newScreenId] = {
    id: newScreenId,
    name: 'Screen ' + screenNumber,
    color: color,
    color2: color2,
    visible: true,
    data: typeof getDefaultScreenData === 'function' ? getDefaultScreenData() : {}
  };

  if(typeof renderScreenTabs === 'function') renderScreenTabs();
  renderRasterScreenTable();
  showCanvasView();
}

// ==================== SIMPLIFIED CUSTOM PANEL MODAL ====================

function openRasterCustomPanelModal(returnScreenId) {
  var modal = document.getElementById('rasterCustomPanelModal');
  if(!modal) return;

  // Store which screen triggered this
  modal.dataset.returnScreenId = returnScreenId || '';

  // Clear fields
  document.getElementById('rasterCpBrand').value = '';
  document.getElementById('rasterCpModel').value = '';
  document.getElementById('rasterCpResX').value = '';
  document.getElementById('rasterCpResY').value = '';

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeRasterCustomPanelModal() {
  var modal = document.getElementById('rasterCustomPanelModal');
  if(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

async function saveRasterCustomPanel() {
  var brand = (document.getElementById('rasterCpBrand').value || '').trim();
  var name = (document.getElementById('rasterCpModel').value || '').trim();
  var resX = parseInt(document.getElementById('rasterCpResX').value);
  var resY = parseInt(document.getElementById('rasterCpResY').value);

  if(!brand || !name) {
    await showAlert('Please enter brand and model name.');
    return;
  }
  if(!resX || !resY || resX <= 0 || resY <= 0) {
    await showAlert('Please enter valid pixel dimensions.');
    return;
  }

  var key = 'CUSTOM_' + brand.replace(/\s+/g, '_') + '_' + name.replace(/\s+/g, '_');

  // Check for duplicate
  if(customPanels[key]) {
    await showAlert('A custom panel with this brand and name already exists.');
    return;
  }

  // Create minimal panel spec with raster_created flag
  customPanels[key] = {
    brand: brand,
    name: name,
    res_x: resX,
    res_y: resY,
    pixel_pitch_mm: null,
    width_m: null,
    height_m: null,
    depth_mm: null,
    weight_kg: null,
    power_max_w: null,
    power_avg_w: null,
    brightness_nits: null,
    max_hanging: null,
    max_stacking: null,
    max_panels_per_circuit: null,
    max_panels_per_data: null,
    bumper_1w_lbs: null,
    bumper_2w_lbs: null,
    jumpers_builtin: false,
    data_jumper_ft: null,
    power_jumper_ft: null,
    data_cross_jumper_ft: null,
    uses_bumpers: true,
    is_floor_panel: false,
    raster_created: true,
    custom: true
  };

  // Save to localStorage
  if(typeof saveCustomPanels === 'function') {
    saveCustomPanels();
  } else {
    localStorage.setItem('ledcalc_custom_panels', JSON.stringify(customPanels));
  }

  // Update main panel dropdown
  if(typeof updatePanelDropdowns === 'function') {
    updatePanelDropdowns();
  }

  // Assign to the screen that triggered the modal
  var modal = document.getElementById('rasterCustomPanelModal');
  var returnScreenId = modal ? modal.dataset.returnScreenId : '';
  if(returnScreenId && screens[returnScreenId]) {
    screens[returnScreenId].data.panelType = key;
  }

  closeRasterCustomPanelModal();
  renderRasterScreenTable();
  showCanvasView();
}

// ==================== RASTER TOOLBAR SYNC ====================
// The raster inline toolbar has its own elements that mirror the
// original canvas options section-box. Values sync bidirectionally
// so all existing canvas JS functions work unchanged.

function syncToolbarFromCanvasOptions() {
  var tb = {
    filename: document.getElementById('rasterToolbarFilename'),
    canvasSize: document.getElementById('rasterToolbarCanvasSize'),
    x: document.getElementById('rasterToolbarX'),
    y: document.getElementById('rasterToolbarY'),
    fine: document.getElementById('rasterToolbarFine'),
    snap: document.getElementById('rasterToolbarSnap'),
    format: document.getElementById('rasterToolbarFormat')
  };
  var co = {
    filename: document.getElementById('canvasExportFilename'),
    canvasSize: document.getElementById('canvasSize'),
    x: document.getElementById('canvasX'),
    y: document.getElementById('canvasY'),
    fine: document.getElementById('arrowKeyIncrement'),
    snap: document.getElementById('snapModeBtn'),
    format: document.getElementById('canvasExportFormat')
  };
  if(tb.filename && co.filename) {
    tb.filename.value = co.filename.value;
    tb.filename.placeholder = co.filename.placeholder || 'LED_Wall_Canvas_4K_UHD_3840x2160';
  }
  if(tb.canvasSize && co.canvasSize) tb.canvasSize.value = co.canvasSize.value;
  if(tb.x && co.x) tb.x.value = co.x.value;
  if(tb.y && co.y) tb.y.value = co.y.value;
  if(tb.fine && co.fine) tb.fine.value = co.fine.value;
  if(tb.format && co.format) tb.format.value = co.format.value;
  // Sync snap button active state
  if(tb.snap) {
    if(typeof snapModeEnabled !== 'undefined' && snapModeEnabled) {
      tb.snap.classList.add('active');
    } else {
      tb.snap.classList.remove('active');
    }
  }
}

function syncCanvasOptionsFromToolbar() {
  var tb = {
    filename: document.getElementById('rasterToolbarFilename'),
    canvasSize: document.getElementById('rasterToolbarCanvasSize'),
    x: document.getElementById('rasterToolbarX'),
    y: document.getElementById('rasterToolbarY'),
    fine: document.getElementById('rasterToolbarFine'),
    format: document.getElementById('rasterToolbarFormat')
  };
  var co = {
    filename: document.getElementById('canvasExportFilename'),
    canvasSize: document.getElementById('canvasSize'),
    x: document.getElementById('canvasX'),
    y: document.getElementById('canvasY'),
    fine: document.getElementById('arrowKeyIncrement'),
    format: document.getElementById('canvasExportFormat')
  };
  if(co.filename && tb.filename) co.filename.value = tb.filename.value;
  if(co.canvasSize && tb.canvasSize) co.canvasSize.value = tb.canvasSize.value;
  if(co.x && tb.x) co.x.value = tb.x.value;
  if(co.y && tb.y) co.y.value = tb.y.value;
  if(co.fine && tb.fine) co.fine.value = tb.fine.value;
  if(co.format && tb.format) co.format.value = tb.format.value;
}

function initRasterToolbarListeners() {
  var tbFilename = document.getElementById('rasterToolbarFilename');
  var tbCanvasSize = document.getElementById('rasterToolbarCanvasSize');
  var tbX = document.getElementById('rasterToolbarX');
  var tbY = document.getElementById('rasterToolbarY');
  var tbFine = document.getElementById('rasterToolbarFine');
  var tbFormat = document.getElementById('rasterToolbarFormat');

  if(tbFilename) {
    tbFilename.addEventListener('input', function() {
      var co = document.getElementById('canvasExportFilename');
      if(co) co.value = this.value;
    });
  }
  if(tbCanvasSize) {
    tbCanvasSize.addEventListener('change', function() {
      var co = document.getElementById('canvasSize');
      if(co) {
        co.value = this.value;
        co.dispatchEvent(new Event('change'));
      }
    });
  }
  if(tbX) {
    tbX.addEventListener('input', function() {
      var co = document.getElementById('canvasX');
      if(co) {
        co.value = this.value;
        co.dispatchEvent(new Event('input'));
      }
    });
  }
  if(tbY) {
    tbY.addEventListener('input', function() {
      var co = document.getElementById('canvasY');
      if(co) {
        co.value = this.value;
        co.dispatchEvent(new Event('input'));
      }
    });
  }
  if(tbFine) {
    tbFine.addEventListener('input', function() {
      var co = document.getElementById('arrowKeyIncrement');
      if(co) co.value = this.value;
    });
  }
  if(tbFormat) {
    tbFormat.addEventListener('change', function() {
      var co = document.getElementById('canvasExportFormat');
      if(co) co.value = this.value;
    });
  }
}

// Also sync toolbar X/Y when canvas drags update the original inputs
function syncRasterToolbarPosition() {
  if(typeof currentAppMode === 'undefined' || currentAppMode !== 'raster') return;
  var coX = document.getElementById('canvasX');
  var coY = document.getElementById('canvasY');
  var tbX = document.getElementById('rasterToolbarX');
  var tbY = document.getElementById('rasterToolbarY');
  if(tbX && coX) tbX.value = coX.value;
  if(tbY && coY) tbY.value = coY.value;
}

let rasterToolbarInitialized = false;
