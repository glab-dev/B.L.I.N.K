// ==================== GEAR CODE MAPPING ====================
// Lets users map their own inventory codes (e.g., for Rental Point software)
// to the gear items B.L.I.N.K. calculates. Codes are stored globally in
// localStorage with optional per-project overrides in .ledconfig files.

const STORAGE_KEY_GEAR_CODES = 'ledcalc_gear_codes';

// Global gear codes (from localStorage)
let globalGearCodes = {};

// Per-project overrides (from .ledconfig, cleared on new project)
let projectGearCodeOverrides = {};

// Current modal state
let gearCodeCurrentTab = 'equipment';
let gearCodeCurrentScope = 'global';
let gearCodeSaveTimeout = null;

// ==================== STORAGE ====================

function loadGearCodes() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_GEAR_CODES);
    if(data) {
      const parsed = JSON.parse(data);
      globalGearCodes = validateGearCodes(parsed);
    }
  } catch(err) {
    console.warn('Failed to load gear codes:', err);
    globalGearCodes = {};
  }
}

function saveGearCodes() {
  try {
    localStorage.setItem(STORAGE_KEY_GEAR_CODES, JSON.stringify(globalGearCodes));
  } catch(err) {
    console.warn('Failed to save gear codes:', err);
  }
}

function validateGearCodes(parsed) {
  if(!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const safe = {};
  Object.keys(parsed).forEach(key => {
    if(typeof key !== 'string' || key.length > 200) return;
    const entry = parsed[key];
    if(!entry || typeof entry !== 'object') return;
    if(typeof entry.code !== 'string' && typeof entry.desc !== 'string') return;
    safe[key] = {
      code: typeof entry.code === 'string' ? entry.code.substring(0, 50) : '',
      desc: typeof entry.desc === 'string' ? entry.desc.substring(0, 200) : ''
    };
  });
  return safe;
}

// ==================== CODE RESOLUTION ====================

// Returns { code, desc } — project override > global > empty
function resolveGearCode(key) {
  if(projectGearCodeOverrides[key]) return projectGearCodeOverrides[key];
  if(globalGearCodes[key]) return globalGearCodes[key];
  return { code: '', desc: '' };
}

// Set a gear code in the appropriate scope
function setGearCode(key, code, desc) {
  const target = gearCodeCurrentScope === 'project' ? projectGearCodeOverrides : globalGearCodes;
  if(!code && !desc) {
    delete target[key];
  } else {
    target[key] = { code: code || '', desc: desc || '' };
  }
  // Debounce save to localStorage (only for global scope)
  if(gearCodeCurrentScope === 'global') {
    clearTimeout(gearCodeSaveTimeout);
    gearCodeSaveTimeout = setTimeout(saveGearCodes, 300);
  }
}

// ==================== .LEDCONFIG INTEGRATION ====================

function getGearCodeOverridesForSave() {
  if(Object.keys(projectGearCodeOverrides).length === 0) return undefined;
  return projectGearCodeOverrides;
}

function loadProjectGearCodeOverrides(overrides) {
  projectGearCodeOverrides = validateGearCodes(overrides || {});
}

// ==================== GEAR ITEM REGISTRY ====================
// Dynamically builds the catalog of all mappable gear items

function buildGearItemRegistry() {
  const items = [];
  const allPanels = getAllPanels();
  const allProcs = getAllProcessors();

  // --- Equipment: Processors ---
  Object.keys(allProcs).forEach(key => {
    items.push({ key: 'proc.' + key, category: 'equipment', label: allProcs[key].name });
  });

  // --- Equipment: Distribution Boxes ---
  // SX40 uses XD, NovaStar uses CVT-10 Pro, custom procs may have their own
  var distBoxAdded = {};
  Object.keys(allProcs).forEach(key => {
    var p = allProcs[key];
    var distName = '';
    if(key === 'Brompton_SX40') distName = 'XD';
    else if(key === 'NovaStar_MX40_Pro') distName = 'CVT-10 Pro';
    else if(p.uses_distribution_box && p.distribution_box_name) distName = p.distribution_box_name;
    if(distName && !distBoxAdded[distName]) {
      items.push({ key: 'dist.' + key, category: 'equipment', label: distName + ' Distribution Box' });
      distBoxAdded[distName] = true;
    }
  });

  // --- Equipment: Panels ---
  Object.keys(allPanels).forEach(key => {
    items.push({ key: 'panel.' + key, category: 'equipment', label: allPanels[key].brand + ' ' + allPanels[key].name });
  });

  // --- Rigging: Bumpers (per panel type) ---
  Object.keys(allPanels).forEach(key => {
    var p = allPanels[key];
    if(p.uses_bumpers === false || p.is_floor_panel) return;
    if(p.bumper_1w_lbs) items.push({ key: 'bumper.' + key + '.1w', category: 'rigging', label: p.name + ' Bumper 1W' });
    if(p.bumper_2w_lbs) items.push({ key: 'bumper.' + key + '.2w', category: 'rigging', label: p.name + ' Bumper 2W' });
    if(p.bumper_4w_lbs) items.push({ key: 'bumper.' + key + '.4w', category: 'rigging', label: p.name + ' Bumper 4W' });
  });

  // --- Rigging: Plates ---
  items.push({ key: 'rig.plate4way', category: 'rigging', label: '4-Way Fixed Connection Plate' });
  items.push({ key: 'rig.plate2way', category: 'rigging', label: '2-Way Fixed Connection Plate' });
  items.push({ key: 'rig.plate4wayCurve', category: 'rigging', label: '4-Way Curving Connection Plate' });
  items.push({ key: 'rig.plate2wayCurve', category: 'rigging', label: '2-Way Curving Connection Plate' });
  items.push({ key: 'rig.shackle', category: 'rigging', label: 'Shackle' });
  items.push({ key: 'rig.cheeseye', category: 'rigging', label: 'Cheeseye' });

  // --- Rigging: Ground Support ---
  items.push({ key: 'gs.rearTruss', category: 'rigging', label: 'Rear Ladder Truss' });
  Object.keys(allPanels).forEach(key => {
    var p = allPanels[key];
    if(p.is_floor_panel) return;
    items.push({ key: 'gs.baseTruss.' + key, category: 'rigging', label: p.name + ' Base Bar' });
  });
  items.push({ key: 'gs.bridgeClamp', category: 'rigging', label: 'Rear Bridge Clamp' });
  items.push({ key: 'gs.rearBridgeAdapter', category: 'rigging', label: 'Rear Bridge Adapter' });
  items.push({ key: 'gs.sandbag', category: 'rigging', label: 'Sandbag' });
  items.push({ key: 'gs.swivelCheeseborough', category: 'rigging', label: 'Swivel Cheeseborough' });
  items.push({ key: 'gs.pipe', category: 'rigging', label: 'Pipe' });

  // --- Rigging: Floor Hardware ---
  items.push({ key: 'floor.frame3x2', category: 'rigging', label: 'Floor Frame 3x2 (6 Panel)' });
  items.push({ key: 'floor.frame2x2', category: 'rigging', label: 'Floor Frame 2x2 (4 Panel)' });
  items.push({ key: 'floor.frame2x1', category: 'rigging', label: 'Floor Frame 2x1 (2 Panel)' });
  items.push({ key: 'floor.frame1x1', category: 'rigging', label: 'Floor Frame 1x1 (1 Panel)' });

  // --- Cables: Data ---
  items.push({ key: 'data.jumper', category: 'cables', label: 'Data Jumper' });
  items.push({ key: 'data.crossJumper', category: 'cables', label: 'Data Cross Jumper' });
  items.push({ key: 'data.cat5Coupler', category: 'cables', label: 'NE8FF EtherCON Coupler' });
  [1, 1.5, 2, 3, 6, 10, 15, 25, 50, 100, 200, 300].forEach(len => {
    items.push({ key: 'data.cat6a.' + len, category: 'cables', label: "Cat6A EtherCON Cable " + len + "'" });
  });

  // --- Cables: Power ---
  items.push({ key: 'power.jumper', category: 'cables', label: 'Power Jumper' });
  items.push({ key: 'power.socaSplay', category: 'cables', label: 'Soca Splay' });
  [25, 50, 75, 100, 150, 200, 250, 300].forEach(len => {
    items.push({ key: 'power.soca.' + len, category: 'cables', label: "Soca Cable " + len + "'" });
  });
  items.push({ key: 'power.true1.25', category: 'cables', label: "True1 25'" });
  items.push({ key: 'power.true1.10', category: 'cables', label: "True1 10'" });
  items.push({ key: 'power.true1.5', category: 'cables', label: "True1 5'" });
  items.push({ key: 'power.true1Twofer', category: 'cables', label: 'True1 Twofer' });

  // --- Cables: Processor to Dist Box ---
  [100, 500, 1000, 1500].forEach(len => {
    items.push({ key: 'p2d.fiber.' + len, category: 'cables', label: "Fiber OpticalCON " + len + "'" });
  });

  // --- Cables: Signal ---
  [1, 3, 6, 10, 15, 25, 50, 75, 100, 150, 200, 250, 300].forEach(len => {
    items.push({ key: 'signal.sdi3g.' + len, category: 'cables', label: "HD-SDI BNC Cable " + len + "'" });
  });
  [5, 15, 25, 50, 100, 200, 300].forEach(len => {
    items.push({ key: 'signal.sdi12g.' + len, category: 'cables', label: "SDI 12G 4K BNC Cable " + len + "'" });
  });
  [500, 1000, 1500].forEach(len => {
    items.push({ key: 'signal.fiber.' + len, category: 'cables', label: "Fiber OpticalCON " + len + "'" });
  });
  items.push({ key: 'signal.hdmi.25', category: 'cables', label: "HDMI Cable 25'" });
  items.push({ key: 'signal.hdmi.10', category: 'cables', label: "HDMI Cable 10'" });
  items.push({ key: 'signal.hdmi.6', category: 'cables', label: "HDMI Cable 6'" });

  // --- Cables: Utility ---
  items.push({ key: 'util.ug.10', category: 'cables', label: "Edison Power Cable 10'" });
  items.push({ key: 'util.ug.25', category: 'cables', label: "Edison Power Cable 25'" });
  items.push({ key: 'util.ug.50', category: 'cables', label: "Edison Power Cable 50'" });
  items.push({ key: 'util.ugTwofer', category: 'cables', label: 'UG Twofer' });
  items.push({ key: 'util.powerBar', category: 'cables', label: 'Power Bar' });

  return items;
}

// ==================== MODAL ====================

function openGearCodeModal() {
  loadGearCodes();
  gearCodeCurrentTab = 'equipment';
  gearCodeCurrentScope = 'global';
  var modal = document.getElementById('gearCodeModal');
  modal.classList.add('active');
  updateGearCodeTabs();
  renderGearCodeTab();
  // Hide welcome page scrollbar if open
  var welcomePage = document.querySelector('.welcome-page');
  if(welcomePage && welcomePage.style.display !== 'none') {
    welcomePage.style.overflowY = 'hidden';
  }
}

function closeGearCodeModal() {
  // Final save in case debounce hasn't fired
  clearTimeout(gearCodeSaveTimeout);
  if(gearCodeCurrentScope === 'global') saveGearCodes();
  handleModalClose('gearCodeModal');
}

function updateGearCodeTabs() {
  var tabs = ['equipment', 'rigging', 'cables'];
  tabs.forEach(tab => {
    var btn = document.getElementById('gcTab' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Btn');
    if(btn) btn.classList.toggle('active', tab === gearCodeCurrentTab);
  });
}

function switchGearCodeTab(tab) {
  gearCodeCurrentTab = tab;
  updateGearCodeTabs();
  document.getElementById('gearCodeSearch').value = '';
  renderGearCodeTab();
}

function switchGearCodeScope(scope) {
  // Save current scope before switching
  if(gearCodeCurrentScope === 'global') {
    clearTimeout(gearCodeSaveTimeout);
    saveGearCodes();
  }
  gearCodeCurrentScope = scope;
  document.getElementById('gcScopeGlobal').classList.toggle('active', scope === 'global');
  document.getElementById('gcScopeProject').classList.toggle('active', scope === 'project');
  renderGearCodeTab();
}

function renderGearCodeTab(filterText) {
  var container = document.getElementById('gearCodeContent');
  var registry = buildGearItemRegistry();
  var items = registry.filter(item => item.category === gearCodeCurrentTab);

  if(filterText) {
    var lower = filterText.toLowerCase();
    items = items.filter(item => {
      var resolved = resolveGearCode(item.key);
      return item.label.toLowerCase().includes(lower) ||
             (resolved.code && resolved.code.toLowerCase().includes(lower)) ||
             (resolved.desc && resolved.desc.toLowerCase().includes(lower));
    });
  }

  if(items.length === 0) {
    container.innerHTML = '<p style="color:#888; text-align:center; padding:20px;">No items found</p>';
    return;
  }

  var html = '<div class="gear-code-header">' +
    '<span style="flex:0 0 40%;">Item</span>' +
    '<span style="flex:0 0 20%;">Code</span>' +
    '<span style="flex:0 0 36%;">Description</span>' +
    '</div>';

  var target = gearCodeCurrentScope === 'project' ? projectGearCodeOverrides : globalGearCodes;

  items.forEach(item => {
    var resolved = resolveGearCode(item.key);
    var scopeValue = target[item.key] || { code: '', desc: '' };
    // In project scope, show the effective value (project override if set, else global as placeholder)
    var codeValue = scopeValue.code || '';
    var descValue = scopeValue.desc || '';
    var codePlaceholder = '';
    var descPlaceholder = '';
    if(gearCodeCurrentScope === 'project' && !target[item.key] && globalGearCodes[item.key]) {
      codePlaceholder = globalGearCodes[item.key].code || '';
      descPlaceholder = globalGearCodes[item.key].desc || '';
    }
    var hasOverride = gearCodeCurrentScope === 'global' && projectGearCodeOverrides[item.key];

    html += '<div class="gear-code-row">' +
      '<span class="gear-code-label" title="' + escapeHtml(item.key) + '">' + escapeHtml(item.label) +
      (hasOverride ? ' <span class="gear-code-override-badge" title="Has project override"></span>' : '') +
      '</span>' +
      '<input type="text" class="gear-code-input" value="' + escapeHtml(codeValue) + '"' +
      ' placeholder="' + escapeHtml(codePlaceholder) + '"' +
      ' data-key="' + escapeHtml(item.key) + '" data-field="code"' +
      ' oninput="handleGearCodeInput(this)">' +
      '<input type="text" class="gear-code-desc-input" value="' + escapeHtml(descValue) + '"' +
      ' placeholder="' + escapeHtml(descPlaceholder || item.label) + '"' +
      ' data-key="' + escapeHtml(item.key) + '" data-field="desc"' +
      ' oninput="handleGearCodeInput(this)">' +
      '</div>';
  });

  container.innerHTML = html;
}

function handleGearCodeInput(el) {
  var key = el.dataset.key;
  var field = el.dataset.field;
  var row = el.closest('.gear-code-row');
  var codeInput = row.querySelector('[data-field="code"]');
  var descInput = row.querySelector('[data-field="desc"]');
  setGearCode(key, codeInput.value.trim(), descInput.value.trim());
}

function filterGearCodeItems(text) {
  renderGearCodeTab(text);
}

// ==================== IMPORT / EXPORT ====================

function importGearCodesFromFile(event) {
  var file = event.target.files[0];
  if(!file) return;
  event.target.value = '';

  var reader = new FileReader();
  reader.onload = function(e) {
    var text = e.target.result;
    var lines = text.split('\n');
    var registry = buildGearItemRegistry();
    var matched = 0;
    var total = 0;

    // Parse tab-delimited lines (skip header)
    for(var i = 0; i < lines.length; i++) {
      var cols = lines[i].split('\t');
      if(cols.length < 3) continue;
      // Format: Type | Code | Description | Qty | ...
      var code = (cols[1] || '').trim();
      var desc = (cols[2] || '').trim();
      if(!code || !desc) continue;
      if(code === 'Code' && desc === 'Description') continue; // header row
      total++;

      // Try to match against registry items
      var match = matchImportLine(code, desc, registry);
      if(match) {
        globalGearCodes[match.key] = { code: code, desc: desc };
        matched++;
      }
    }

    saveGearCodes();
    renderGearCodeTab();
    showAlert(matched + ' of ' + total + ' items matched and imported', 'Import Complete');
  };
  reader.readAsText(file);
}

function matchImportLine(code, desc, registry) {
  var descLower = desc.toLowerCase();
  var codeLower = code.toLowerCase();

  // Pass 1: Exact description match (case-insensitive)
  for(var i = 0; i < registry.length; i++) {
    if(registry[i].label.toLowerCase() === descLower) return registry[i];
  }

  // Pass 2: Registry label is contained in import description
  // e.g. registry "Brompton SX40" found in import "Brompton SX40 LED Controller"
  // Require label to be at least 8 chars to avoid short false matches
  for(var i = 0; i < registry.length; i++) {
    var label = registry[i].label.toLowerCase();
    if(label.length >= 8 && descLower.includes(label)) return registry[i];
  }

  // Pass 3: Code pattern matching for known formats
  var patterns = [
    // Cat5 EtherCON panel cables: CAT5P-## or CAT5P### -> data.cat6a (they're ethercon cables)
    { regex: /^cat5p-?(\d+)$/, keyFn: function(m) { return null; } }, // skip — these are panel jumpers, not Cat6A trunk

    // Cat6A cables: CAT6P### -> data.cat6a.{length}
    { regex: /^cat6p(\d+\.?\d*)$/, keyFn: function(m) {
      var len = parseFloat(m[1]);
      if(m[0] === 'cat6p1.5') len = 1.5;
      return 'data.cat6a.' + len;
    }},

    // SDI 12G: SDI4K### -> signal.sdi12g.{length}
    { regex: /^sdi4k(\d+)$/, keyFn: function(m) { return 'signal.sdi12g.' + parseInt(m[1]); } },

    // SDI 3G: SDI-### -> signal.sdi3g.{length}
    { regex: /^sdi-(\d+)$/, keyFn: function(m) { return 'signal.sdi3g.' + parseInt(m[1]); } },

    // Fiber: FI4O### -> signal.fiber.{length} or p2d.fiber.{length}
    { regex: /^fi4o(\d+)$/, keyFn: function(m) { return 'signal.fiber.' + parseInt(m[1]); } },

    // HDMI: HDMI-## -> signal.hdmi.{length}
    { regex: /^hdmi-(\d+)$/, keyFn: function(m) { return 'signal.hdmi.' + parseInt(m[1]); } },

    // UG cables: UG-## -> util.ug.{length}
    { regex: /^ug-(\d+)$/, keyFn: function(m) { return 'util.ug.' + parseInt(m[1]); } },

    // NE8FF coupler: CATFF
    { regex: /^catff$/, keyFn: function() { return 'data.cat5Coupler'; } },

    // UG Twofer: UGTWOFER
    { regex: /^ugtwofer$/, keyFn: function() { return 'util.ugTwofer'; } },

    // Power Bar: POWERBAR
    { regex: /^powerbar$/, keyFn: function() { return 'util.powerBar'; } }
  ];

  for(var p = 0; p < patterns.length; p++) {
    var match = codeLower.match(patterns[p].regex);
    if(match) {
      var key = patterns[p].keyFn(match);
      if(!key) continue;
      var found = registry.find(r => r.key === key);
      if(found) return found;
      // Also check p2d variant for fiber
      if(key.startsWith('signal.fiber.')) {
        found = registry.find(r => r.key === key.replace('signal.', 'p2d.'));
        if(found) return found;
      }
    }
  }

  return null;
}

function exportGearCodes() {
  var registry = buildGearItemRegistry();
  var lines = ['Item\tCode\tDescription'];
  registry.forEach(function(item) {
    var resolved = resolveGearCode(item.key);
    if(resolved.code || resolved.desc) {
      lines.push(item.label + '\t' + (resolved.code || '') + '\t' + (resolved.desc || ''));
    }
  });
  var blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  var url = URL.createObjectURL(blob);
  var dl = document.createElement('a');
  dl.href = url;
  dl.download = 'gear-codes.txt';
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
  URL.revokeObjectURL(url);
}

function importGearCodesJson(event) {
  var file = event.target.files[0];
  if(!file) return;
  event.target.value = '';
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var parsed = JSON.parse(e.target.result);
      var validated = validateGearCodes(parsed);
      Object.assign(globalGearCodes, validated);
      saveGearCodes();
      renderGearCodeTab();
      showAlert('Imported ' + Object.keys(validated).length + ' gear codes', 'Import Complete');
    } catch(err) {
      showAlert('Invalid JSON file', 'Error');
    }
  };
  reader.readAsText(file);
}

// Clear all codes for the current scope
async function clearGearCodes() {
  var scopeLabel = gearCodeCurrentScope === 'project' ? 'project override' : 'global';
  var confirmed = await showConfirm('Clear all ' + scopeLabel + ' gear codes?', 'Clear Codes');
  if(!confirmed) return;
  if(gearCodeCurrentScope === 'project') {
    projectGearCodeOverrides = {};
  } else {
    globalGearCodes = {};
    saveGearCodes();
  }
  renderGearCodeTab();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', loadGearCodes);
