// ==================== CUSTOM PANELS AND PROCESSORS SYSTEM v24 ====================
// Storage infrastructure for both custom panels and processors,
// plus all custom panel CRUD, modals, and dropdown management.

// Storage keys
const STORAGE_KEY_CUSTOM_PANELS = 'ledcalc_custom_panels';
const STORAGE_KEY_CUSTOM_PROCESSORS = 'ledcalc_custom_processors';

// Custom panels storage
let customPanels = {};
let customProcessors = {};

// Load custom data from localStorage
function validateCustomData(parsed) {
  if(!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const safe = {};
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  Object.keys(parsed).forEach(key => {
    if(dangerousKeys.includes(key)) return;
    const entry = parsed[key];
    if(!entry || typeof entry !== 'object') return;
    if(typeof entry.brand !== 'string' || typeof entry.name !== 'string') return;
    safe[key] = entry;
  });
  return safe;
}

function loadCustomData() {
  try {
    const panelsData = localStorage.getItem(STORAGE_KEY_CUSTOM_PANELS);
    if(panelsData) {
      customPanels = validateCustomData(JSON.parse(panelsData));
      console.log('Loaded custom panels:', Object.keys(customPanels).length);
    }

    const processorsData = localStorage.getItem(STORAGE_KEY_CUSTOM_PROCESSORS);
    if(processorsData) {
      customProcessors = validateCustomData(JSON.parse(processorsData));
      console.log('Loaded custom processors:', Object.keys(customProcessors).length);
    }
  } catch(err) {
    console.error('Error loading custom data:', err);
  }
}

// Save custom data to localStorage
function saveCustomPanels() {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_PANELS, JSON.stringify(customPanels));
  } catch(err) {
    console.error('Error saving custom panels:', err);
    showAlert('Error saving custom panel data');
  }
}

// Get all panels (built-in + custom)
function getAllPanels() {
  return {...panels, ...customPanels};
}

// Get panel height ratio (for CB5_MKII full panels which are 2:1 aspect ratio)
function getPanelHeightRatio(panelType) {
  // CB5_MKII full panels are 0.6m x 1.2m (width x height), so height = 2x width
  if(panelType === 'CB5_MKII') {
    return 2;
  }
  // All other panels are square (1:1 aspect ratio)
  return 1;
}

// Load custom data from localStorage on startup
loadCustomData();

// Helper functions to get current selections
function getCurrentPanel() {
  const allPanels = getAllPanels();
  const panelType = document.getElementById('panelType')?.value;
  return panelType ? allPanels[panelType] : null;
}

// Update panel dropdowns
function updatePanelDropdowns() {
  const panelSelect = document.getElementById('panelType');
  if(!panelSelect) return;

  const currentValue = panelSelect.value;
  const allPanels = getAllPanels();

  // Clear and rebuild
  panelSelect.innerHTML = '';

  // Group built-in panels by brand
  const builtInByBrand = {};
  Object.keys(panels).forEach(key => {
    const brand = panels[key].brand || 'Other';
    if(!builtInByBrand[brand]) builtInByBrand[brand] = [];
    builtInByBrand[brand].push({key, panel: panels[key]});
  });

  // Add built-in panels grouped by brand
  Object.keys(builtInByBrand).sort().forEach(brand => {
    const brandGroup = document.createElement('optgroup');
    brandGroup.label = brand;
    builtInByBrand[brand].forEach(({key, panel}) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = panel.name;
      brandGroup.appendChild(option);
    });
    panelSelect.appendChild(brandGroup);
  });

  // Group custom panels by brand
  if(Object.keys(customPanels).length > 0) {
    const customByBrand = {};
    Object.keys(customPanels).forEach(key => {
      const brand = customPanels[key].brand || 'Custom';
      if(!customByBrand[brand]) customByBrand[brand] = [];
      customByBrand[brand].push({key, panel: customPanels[key]});
    });

    // Add custom panels grouped by brand
    Object.keys(customByBrand).sort().forEach(brand => {
      const brandGroup = document.createElement('optgroup');
      brandGroup.label = `${brand} (Custom)`;
      customByBrand[brand].forEach(({key, panel}) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = panel.name;
        brandGroup.appendChild(option);
      });
      panelSelect.appendChild(brandGroup);
    });
  }

  // Add "Add Custom Panel" option
  const addOption = document.createElement('option');
  addOption.value = '__ADD_CUSTOM__';
  addOption.textContent = '+ Add Custom Panel...';
  addOption.style.fontWeight = 'bold';
  addOption.style.color = '#4a9eff';
  panelSelect.appendChild(addOption);

  // Restore selection
  if(currentValue && allPanels[currentValue]) {
    panelSelect.value = currentValue;
  }
}

// Custom Panel Modal
function openCustomPanelModal(editKey = null) {
  const modal = document.getElementById('customPanelModal');
  const title = document.getElementById('customPanelModalTitle');

  // Update labels based on current unit system
  const isMetric = displayLengthUnit === 'm';
  const lengthUnit = isMetric ? 'mm' : 'in';
  const weightUnit = isMetric ? 'kg' : 'lbs';

  // Update dimension labels
  document.getElementById('labelPixelPitch').textContent = 'Pixel Pitch (mm)'; // Always mm
  document.getElementById('labelPanelWidth').textContent = `Panel Width (${lengthUnit})`;
  document.getElementById('labelPanelHeight').textContent = `Panel Height (${lengthUnit})`;
  document.getElementById('labelPanelDepth').textContent = `Panel Depth (${lengthUnit})`;

  // Update weight labels
  document.getElementById('labelPanelWeight').textContent = `Panel Weight (${weightUnit})`;
  document.getElementById('labelFrameWeight').textContent = `Frame Weight (${weightUnit})`;
  document.getElementById('labelWeightNoFrame').textContent = `Weight Without Frame (${weightUnit})`;
  document.getElementById('label1wBumper').textContent = `1W Bumper Weight (${weightUnit})`;
  document.getElementById('label2wBumper').textContent = `2W Bumper Weight (${weightUnit})`;

  // Conversion constants
  const MM_TO_IN = 0.0393701;
  const IN_TO_MM = 25.4;

  if(editKey) {
    title.textContent = 'Edit Custom Panel';
    const panel = customPanels[editKey];
    document.getElementById('customPanelBrand').value = panel.brand || '';
    document.getElementById('customPanelName').value = panel.name || '';
    document.getElementById('customPanelPixelPitch').value = panel.pixel_pitch_mm || '';

    // Convert dimensions based on unit system (stored in mm internally)
    const widthMm = (panel.width_m * 1000) || '';
    const heightMm = (panel.height_m * 1000) || '';
    const depthMm = panel.depth_mm || '';

    if(isMetric) {
      document.getElementById('customPanelWidth').value = widthMm;
      document.getElementById('customPanelHeight').value = heightMm;
      document.getElementById('customPanelDepth').value = depthMm;
    } else {
      document.getElementById('customPanelWidth').value = widthMm ? (widthMm * MM_TO_IN).toFixed(2) : '';
      document.getElementById('customPanelHeight').value = heightMm ? (heightMm * MM_TO_IN).toFixed(2) : '';
      document.getElementById('customPanelDepth').value = depthMm ? (depthMm * MM_TO_IN).toFixed(2) : '';
    }

    document.getElementById('customPanelResX').value = panel.res_x || '';
    document.getElementById('customPanelResY').value = panel.res_y || '';
    document.getElementById('customPanelPowerMax').value = panel.power_max_w || '';
    document.getElementById('customPanelPowerAvg').value = panel.power_avg_w || '';
    document.getElementById('customPanelBrightness').value = panel.brightness_nits || '';
    document.getElementById('customPanelMaxHanging').value = panel.max_hanging || '';
    document.getElementById('customPanelMaxStacking').value = panel.max_stacking || '';

    // Convert weights based on unit system (stored in kg internally, bumpers in lbs)
    if(isMetric) {
      document.getElementById('customPanelWeight').value = panel.weight_kg || '';
      document.getElementById('customPanelFrameWeight').value = panel.frame_weight_kg || '';
      document.getElementById('customPanelWeightNoFrame').value = panel.weight_no_frame_kg || '';
      // Convert bumper weights from lbs to kg for display
      document.getElementById('customPanel1wBumper').value = panel.bumper_1w_lbs ? (panel.bumper_1w_lbs * LBS_TO_KG).toFixed(2) : '';
      document.getElementById('customPanel2wBumper').value = panel.bumper_2w_lbs ? (panel.bumper_2w_lbs * LBS_TO_KG).toFixed(2) : '';
    } else {
      // Convert kg to lbs for display
      document.getElementById('customPanelWeight').value = panel.weight_kg ? (panel.weight_kg * KG_TO_LBS).toFixed(2) : '';
      document.getElementById('customPanelFrameWeight').value = panel.frame_weight_kg ? (panel.frame_weight_kg * KG_TO_LBS).toFixed(2) : '';
      document.getElementById('customPanelWeightNoFrame').value = panel.weight_no_frame_kg ? (panel.weight_no_frame_kg * KG_TO_LBS).toFixed(2) : '';
      // Bumper weights already stored in lbs
      document.getElementById('customPanel1wBumper').value = panel.bumper_1w_lbs || '';
      document.getElementById('customPanel2wBumper').value = panel.bumper_2w_lbs || '';
    }

    document.getElementById('customPanelRemovableFrame').checked = panel.removable_frame || false;
    modal.dataset.editKey = editKey;
  } else {
    title.textContent = 'Add Custom Panel';
    // Clear all fields
    document.getElementById('customPanelBrand').value = '';
    document.getElementById('customPanelName').value = '';
    document.getElementById('customPanelPixelPitch').value = '';
    document.getElementById('customPanelWidth').value = '';
    document.getElementById('customPanelHeight').value = '';
    document.getElementById('customPanelDepth').value = '';
    document.getElementById('customPanelResX').value = '';
    document.getElementById('customPanelResY').value = '';
    document.getElementById('customPanelPowerMax').value = '';
    document.getElementById('customPanelPowerAvg').value = '';
    document.getElementById('customPanelBrightness').value = '';
    document.getElementById('customPanelMaxHanging').value = '';
    document.getElementById('customPanelMaxStacking').value = '';
    document.getElementById('customPanelWeight').value = '';
    document.getElementById('customPanelRemovableFrame').checked = false;
    document.getElementById('customPanelFrameWeight').value = '';
    document.getElementById('customPanelWeightNoFrame').value = '';
    document.getElementById('customPanel1wBumper').value = '';
    document.getElementById('customPanel2wBumper').value = '';

    delete modal.dataset.editKey;
  }

  modal.classList.add('active');
  updateFrameWeightFields();
}

function closeCustomPanelModal() {
  const modal = document.getElementById('customPanelModal');
  modal.classList.remove('active');
  reopenMenuIfNeeded(); // Restore menu if modal came from menu
}

function updateFrameWeightFields() {
  const hasFrame = document.getElementById('customPanelRemovableFrame').checked;
  const frameFields = document.getElementById('frameWeightFields');
  frameFields.style.display = hasFrame ? 'block' : 'none';
}

function saveCustomPanel() {
  const brand = document.getElementById('customPanelBrand').value.trim();
  const name = document.getElementById('customPanelName').value.trim();

  if(!brand || !name) {
    showAlert('Please enter brand and name');
    return;
  }

  const modal = document.getElementById('customPanelModal');
  const editKey = modal.dataset.editKey;
  const key = editKey || `CUSTOM_${brand.replace(/\s+/g, '_')}_${name.replace(/\s+/g, '_')}`;

  // Check current unit system for conversion
  const isMetric = displayLengthUnit === 'm';
  const IN_TO_MM = 25.4;

  // Get raw input values
  const widthInput = parseFloat(document.getElementById('customPanelWidth').value) || null;
  const heightInput = parseFloat(document.getElementById('customPanelHeight').value) || null;
  const depthInput = parseFloat(document.getElementById('customPanelDepth').value) || null;
  const weightInput = parseFloat(document.getElementById('customPanelWeight').value) || null;
  const frameWeightInput = parseFloat(document.getElementById('customPanelFrameWeight').value) || null;
  const weightNoFrameInput = parseFloat(document.getElementById('customPanelWeightNoFrame').value) || null;
  const bumper1wInput = parseFloat(document.getElementById('customPanel1wBumper').value) || null;
  const bumper2wInput = parseFloat(document.getElementById('customPanel2wBumper').value) || null;

  // Convert dimensions to mm (stored as meters for width/height)
  let widthMm, heightMm, depthMm;
  if(isMetric) {
    // Input is in mm
    widthMm = widthInput;
    heightMm = heightInput;
    depthMm = depthInput;
  } else {
    // Input is in inches, convert to mm
    widthMm = widthInput ? widthInput * IN_TO_MM : null;
    heightMm = heightInput ? heightInput * IN_TO_MM : null;
    depthMm = depthInput ? depthInput * IN_TO_MM : null;
  }

  // Convert weights to kg (panel weights) and lbs (bumper weights)
  let weightKg, frameWeightKg, weightNoFrameKg, bumper1wLbs, bumper2wLbs;
  if(isMetric) {
    // Input is in kg
    weightKg = weightInput;
    frameWeightKg = frameWeightInput;
    weightNoFrameKg = weightNoFrameInput;
    // Bumper input is in kg, convert to lbs for storage
    bumper1wLbs = bumper1wInput ? bumper1wInput * KG_TO_LBS : null;
    bumper2wLbs = bumper2wInput ? bumper2wInput * KG_TO_LBS : null;
  } else {
    // Input is in lbs, convert to kg for panel weights
    weightKg = weightInput ? weightInput * LBS_TO_KG : null;
    frameWeightKg = frameWeightInput ? frameWeightInput * LBS_TO_KG : null;
    weightNoFrameKg = weightNoFrameInput ? weightNoFrameInput * LBS_TO_KG : null;
    // Bumper weights stay in lbs
    bumper1wLbs = bumper1wInput;
    bumper2wLbs = bumper2wInput;
  }

  const panel = {
    brand: brand,
    name: name,
    pixel_pitch_mm: parseFloat(document.getElementById('customPanelPixelPitch').value) || null,
    width_m: widthMm ? widthMm / 1000 : null,
    height_m: heightMm ? heightMm / 1000 : null,
    depth_mm: depthMm,
    res_x: parseInt(document.getElementById('customPanelResX').value) || null,
    res_y: parseInt(document.getElementById('customPanelResY').value) || null,
    power_max_w: parseFloat(document.getElementById('customPanelPowerMax').value) || null,
    power_avg_w: parseFloat(document.getElementById('customPanelPowerAvg').value) || null,
    brightness_nits: parseInt(document.getElementById('customPanelBrightness').value) || null,
    max_hanging: parseInt(document.getElementById('customPanelMaxHanging').value) || null,
    max_stacking: parseInt(document.getElementById('customPanelMaxStacking').value) || null,
    weight_kg: weightKg,
    removable_frame: document.getElementById('customPanelRemovableFrame').checked,
    frame_weight_kg: frameWeightKg,
    weight_no_frame_kg: weightNoFrameKg,
    bumper_1w_lbs: bumper1wLbs,
    bumper_2w_lbs: bumper2wLbs,
    bumper_4w_lbs: 66.15, // Default 4W bumper weight
    custom: true
  };

  customPanels[key] = panel;
  saveCustomPanels();
  updatePanelDropdowns();

  // Select the new/edited panel
  const panelSelect = document.getElementById('panelType');
  if(panelSelect) {
    panelSelect.value = key;
  }

  closeCustomPanelModal();
  showAlert(`Custom panel "${brand} ${name}" saved successfully!`);
}

// Delete custom panel
async function deleteCustomPanel(key) {
  const panel = customPanels[key];
  if(await showConfirm(`Delete custom panel "${panel.brand} ${panel.name}"?`)) {
    delete customPanels[key];
    saveCustomPanels();
    updatePanelDropdowns();
    closeManageCustomModal();
  }
}

// Manage Custom Panels Modal
function openManageCustomModal() {
  const modal = document.getElementById('manageCustomModal');

  // Populate panels list
  const panelsContent = document.getElementById('manageCustomPanelsContent');
  let panelsHtml = '';
  if(Object.keys(customPanels).length === 0) {
    panelsHtml = '<p style="color: #888; text-align: center; padding: 20px;">No custom panels saved yet.</p>';
  } else {
    panelsHtml = '<div class="custom-item-list">';
    Object.keys(customPanels).forEach(key => {
      const panel = customPanels[key];
      panelsHtml += `
        <div class="custom-item">
          <div class="custom-item-name">${escapeHtml(panel.brand)} ${escapeHtml(panel.name)}</div>
          <div class="custom-item-actions">
            <button class="btn-small" onclick="openCustomPanelModal('${escapeJsString(key)}'); closeManageCustomModal();">Edit</button>
            <button class="btn-small danger" onclick="deleteCustomPanel('${escapeJsString(key)}')">Delete</button>
          </div>
        </div>
      `;
    });
    panelsHtml += '</div>';
  }
  panelsContent.innerHTML = panelsHtml;

  modal.classList.add('active');
}

function closeManageCustomModal() {
  const modal = document.getElementById('manageCustomModal');
  modal.classList.remove('active');
  reopenMenuIfNeeded(); // Restore menu if modal came from menu
}

// Setup removable frame checkbox listener
document.addEventListener('DOMContentLoaded', function() {
  const frameCheckbox = document.getElementById('customPanelRemovableFrame');
  if(frameCheckbox) {
    frameCheckbox.addEventListener('change', updateFrameWeightFields);
  }
});
