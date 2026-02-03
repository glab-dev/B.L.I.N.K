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

  // Restore selection
  if(currentValue && allProcessors[currentValue]) {
    processorSelect.value = currentValue;
  }
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
