// ==================== CUSTOM PROCESSOR FUNCTIONS ====================
// Storage, aggregation, dropdown, request modal, and delete for custom processors.
// Depends on: processors (specs/processors.js), customProcessors (specs/custom-panels.js)

function saveCustomProcessors() {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_PROCESSORS, JSON.stringify(customProcessors));
  } catch(err) {
    console.error('Error saving custom processors:', err);
    showAlert('Error saving custom processor data');
  }
}

// Get all processors (built-in + custom)
function getAllProcessors() {
  return {...processors, ...customProcessors};
}

function getCurrentProcessor() {
  const allProcessors = getAllProcessors();
  const processorType = document.getElementById('processor')?.value;
  return processorType ? allProcessors[processorType] : null;
}

// Update processor dropdowns
function updateProcessorDropdowns() {
  const processorSelect = document.getElementById('processor');
  if(!processorSelect) return;

  const currentValue = processorSelect.value;
  const allProcessors = getAllProcessors();

  // Clear and rebuild
  processorSelect.innerHTML = '';

  // Helper to extract brand from processor key or name
  function getProcessorBrand(key, proc) {
    if(proc.brand) return proc.brand;
    // Extract brand from key (e.g., "Brompton_SX40" -> "Brompton")
    if(key.startsWith('Brompton')) return 'Brompton';
    if(key.startsWith('NovaStar')) return 'NovaStar';
    if(key.startsWith('Megapixel')) return 'Megapixel';
    if(key.startsWith('ROE')) return 'ROE Visual';
    // Try to extract from name
    if(proc.name && proc.name.startsWith('Brompton')) return 'Brompton';
    if(proc.name && proc.name.startsWith('NovaStar')) return 'NovaStar';
    if(proc.name && proc.name.startsWith('Megapixel')) return 'Megapixel';
    if(proc.name && proc.name.startsWith('ROE')) return 'ROE Visual';
    return 'Other';
  }

  // Helper to get display name (without brand prefix)
  function getProcessorDisplayName(proc, brand) {
    let name = proc.name;
    // Remove brand prefix from name if present
    if(name.startsWith(brand + ' ')) {
      name = name.substring(brand.length + 1);
    }
    return name;
  }

  // Group built-in processors by brand
  const builtInByBrand = {};
  Object.keys(processors).forEach(key => {
    const brand = getProcessorBrand(key, processors[key]);
    if(!builtInByBrand[brand]) builtInByBrand[brand] = [];
    builtInByBrand[brand].push({key, proc: processors[key], brand});
  });

  // Add built-in processors grouped by brand
  Object.keys(builtInByBrand).sort().forEach(brand => {
    const brandGroup = document.createElement('optgroup');
    brandGroup.label = brand;
    builtInByBrand[brand].forEach(({key, proc, brand}) => {
      const option = document.createElement('option');
      option.value = key;
      let displayName = getProcessorDisplayName(proc, brand);
      // Keep "(in development)" in the name for development processors
      option.textContent = displayName;
      brandGroup.appendChild(option);
    });
    processorSelect.appendChild(brandGroup);
  });

  // Group custom processors by brand
  if(Object.keys(customProcessors).length > 0) {
    const customByBrand = {};
    Object.keys(customProcessors).forEach(key => {
      const brand = customProcessors[key].brand || 'Custom';
      if(!customByBrand[brand]) customByBrand[brand] = [];
      customByBrand[brand].push({key, proc: customProcessors[key]});
    });

    // Add custom processors grouped by brand
    Object.keys(customByBrand).sort().forEach(brand => {
      const brandGroup = document.createElement('optgroup');
      brandGroup.label = `${brand} (Custom)`;
      customByBrand[brand].forEach(({key, proc}) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = proc.name;
        brandGroup.appendChild(option);
      });
      processorSelect.appendChild(brandGroup);
    });
  }

  // Add "Add Custom Processor" option at the end
  const addCustomOption = document.createElement('option');
  addCustomOption.value = '__ADD_CUSTOM_PROCESSOR__';
  addCustomOption.textContent = '+ Add Custom Processor...';
  addCustomOption.style.fontStyle = 'italic';
  processorSelect.appendChild(addCustomOption);

  // Restore selection
  if(currentValue && allProcessors[currentValue]) {
    processorSelect.value = currentValue;
  }
}

// ==================== CUSTOM PROCESSOR MODAL ====================

let editingProcessorKey = null;

function openCustomProcessorModal(editKey = null) {
  const modal = document.getElementById('customProcessorModal');
  const title = document.getElementById('customProcessorModalTitle');
  editingProcessorKey = editKey;

  if(editKey && customProcessors[editKey]) {
    // Editing existing processor
    title.textContent = 'Edit Custom Processor';
    const proc = customProcessors[editKey];
    document.getElementById('customProcessorBrand').value = proc.brand || '';
    document.getElementById('customProcessorName').value = proc.name || '';
    document.getElementById('customProcessorPortType').value = proc.port_type || '1g';
    document.getElementById('customProcessorPixelsPerPort').value = proc.base_pixels_1g || '';
    document.getElementById('customProcessorFrameRate').value = proc.base_framerate || 60;
    document.getElementById('customProcessorBitDepth').value = proc.base_bitdepth || 8;
    document.getElementById('customProcessorTotalPixels').value = proc.total_pixels || '';
    document.getElementById('customProcessorOutputPorts').value = proc.output_ports || '';
    document.getElementById('cpProcessorDirect').checked = proc.supports_direct !== false;
    document.getElementById('cpProcessorDistBox').checked = proc.uses_distribution_box || false;
    setCustomProcessorDistBox(proc.uses_distribution_box || false);
    document.getElementById('customProcessorDistBoxName').value = proc.distribution_box_name || '';
    document.getElementById('customProcessorDistBoxPorts').value = proc.distribution_box_ports || '';
    document.getElementById('cpProcessorBackup').checked = proc.backup_configurable || false;
  } else {
    // New processor
    title.textContent = 'Add Custom Processor';
    document.getElementById('customProcessorBrand').value = '';
    document.getElementById('customProcessorName').value = '';
    document.getElementById('customProcessorPortType').value = '1g';
    document.getElementById('customProcessorPixelsPerPort').value = '';
    document.getElementById('customProcessorFrameRate').value = '60';
    document.getElementById('customProcessorBitDepth').value = '8';
    document.getElementById('customProcessorTotalPixels').value = '';
    document.getElementById('customProcessorOutputPorts').value = '';
    document.getElementById('cpProcessorDirect').checked = true;
    document.getElementById('cpProcessorDistBox').checked = false;
    setCustomProcessorDistBox(false);
    document.getElementById('customProcessorDistBoxName').value = '';
    document.getElementById('customProcessorDistBoxPorts').value = '';
    document.getElementById('cpProcessorBackup').checked = false;
  }

  updateProcessorPortLabel();
  modal.classList.add('active');
}

function closeCustomProcessorModal() {
  const modal = document.getElementById('customProcessorModal');
  modal.classList.remove('active');
  reopenMenuIfNeeded();
}

function setCustomProcessorDistBox(enabled) {
  const fields = document.getElementById('cpProcessorDistBoxFields');
  if(fields) fields.style.display = enabled ? 'block' : 'none';
}

function updateProcessorPortLabel() {
  const label = document.getElementById('labelPixelsPerPort');
  if(label) {
    label.textContent = 'Pixels per Port';
  }
}

function saveCustomProcessor() {
  const brand = document.getElementById('customProcessorBrand').value.trim();
  const name = document.getElementById('customProcessorName').value.trim();

  if(!brand || !name) {
    showAlert('Please enter both brand and name');
    return;
  }

  const portType = document.getElementById('customProcessorPortType').value;
  const pixelsPerPort = parseInt(document.getElementById('customProcessorPixelsPerPort').value) || 0;
  const frameRate = parseInt(document.getElementById('customProcessorFrameRate').value) || 60;
  const bitDepth = parseInt(document.getElementById('customProcessorBitDepth').value) || 8;
  const totalPixels = parseInt(document.getElementById('customProcessorTotalPixels').value) || 0;
  const outputPorts = parseInt(document.getElementById('customProcessorOutputPorts').value) || 0;
  const supportsDirect = document.getElementById('cpProcessorDirect').checked;
  const usesDistBox = document.getElementById('cpProcessorDistBox').checked;
  const distBoxName = document.getElementById('customProcessorDistBoxName').value.trim();
  const distBoxPorts = parseInt(document.getElementById('customProcessorDistBoxPorts').value) || null;
  const backupConfigurable = document.getElementById('cpProcessorBackup').checked;

  if(!pixelsPerPort || !totalPixels) {
    showAlert('Please enter pixels per port and total pixel capacity');
    return;
  }

  const key = editingProcessorKey || `custom_${brand.replace(/\s+/g, '_')}_${name.replace(/\s+/g, '_')}`;

  // Check for duplicate key (only when creating new)
  if(!editingProcessorKey && (customProcessors[key] || processors[key])) {
    showAlert('A processor with this brand and name already exists');
    return;
  }

  // Generate display string from port count + type
  const portLabel = portType === '10g' ? '10G' : '1G';
  const outputsStr = outputPorts ? `${outputPorts} × ${portLabel}` : '';

  const processorObj = {
    brand: brand,
    name: `${brand} ${name}`,
    port_type: portType,
    base_pixels_1g: pixelsPerPort,
    base_framerate: frameRate,
    base_bitdepth: bitDepth,
    total_pixels: totalPixels,
    output_ports: outputPorts,
    outputs: outputsStr,
    supports_direct: supportsDirect,
    uses_distribution_box: usesDistBox,
    distribution_box_name: usesDistBox ? distBoxName : null,
    distribution_box_ports: usesDistBox ? distBoxPorts : null,
    backup_configurable: backupConfigurable,
    custom: true
  };

  customProcessors[key] = processorObj;
  saveCustomProcessors();
  updateProcessorDropdowns();

  // Select the new/edited processor
  const processorSelect = document.getElementById('processor');
  if(processorSelect) {
    processorSelect.value = key;
    processorSelect.dispatchEvent(new Event('change'));
  }

  closeCustomProcessorModal();
  calculate();
}

// ==================== REQUEST ITEM MODAL ====================

let currentRequestType = 'panel';

function setRequestType(type) {
  currentRequestType = type;
  document.getElementById('requestTypePanelBtn').classList.toggle('active', type === 'panel');
  document.getElementById('requestTypeProcessorBtn').classList.toggle('active', type === 'processor');
  document.getElementById('requestTypeOtherBtn').classList.toggle('active', type === 'other');
}

function openRequestItemModal() {
  const modal = document.getElementById('requestItemModal');
  document.getElementById('requestBrand').value = '';
  document.getElementById('requestModel').value = '';
  document.getElementById('requestNotes').value = '';
  setRequestType('panel');
  modal.classList.add('active');
}

function openProcessorRequestModal() {
  const modal = document.getElementById('requestItemModal');
  document.getElementById('requestBrand').value = '';
  document.getElementById('requestModel').value = '';
  document.getElementById('requestNotes').value = '';
  setRequestType('processor');
  modal.classList.add('active');
}

function closeRequestItemModal() {
  const modal = document.getElementById('requestItemModal');
  modal.classList.remove('active');
  reopenMenuIfNeeded(); // Restore menu if modal came from menu
}

function sendItemRequest() {
  const brand = document.getElementById('requestBrand').value.trim();
  const model = document.getElementById('requestModel').value.trim();
  const notes = document.getElementById('requestNotes').value.trim();

  if(!brand || !model) {
    showAlert('Please enter both brand and model name');
    return;
  }

  const typeLabel = currentRequestType === 'panel' ? 'Panel' :
                    currentRequestType === 'processor' ? 'Processor' : 'Other';
  const subject = encodeURIComponent(`LED Calculator - ${typeLabel} Request: ${brand} ${model}`);

  // Use %0D%0A for line breaks (works better on mobile email clients)
  const nl = '%0D%0A';
  let body = `Hi Gabriel,${nl}${nl}`;
  body += `I'd like to request adding a new ${typeLabel.toLowerCase()} to the LED Calculator app.${nl}${nl}`;
  body += `Type: ${typeLabel}${nl}`;
  body += `Brand: ${brand}${nl}`;
  body += `Model: ${model}${nl}`;
  if(notes) {
    body += `${nl}Additional Info:${nl}${encodeURIComponent(notes)}${nl}`;
  }
  body += `${nl}Thank you!`;

  const mailtoLink = `mailto:fearlesswandererproductions@gmail.com?subject=${subject}&body=${body}`;
  window.location.href = mailtoLink;

  closeRequestItemModal();
}

// Delete custom processor
async function deleteCustomProcessor(key) {
  const proc = customProcessors[key];
  if(await showConfirm(`Delete custom processor "${proc.name}"?`)) {
    delete customProcessors[key];
    saveCustomProcessors();
    updateProcessorDropdowns();
    closeManageCustomModal();
  }
}
