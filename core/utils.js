// ==================== UTILITY FUNCTIONS ====================
// Security utilities, color manipulation, and math helpers.
// Must load before specs/custom-panels.js which uses escapeHtml/escapeJsString.

// ==================== SECURITY UTILITIES ====================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function escapeJsString(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    .replace(/"/g, '\\"').replace(/</g, '\\x3c').replace(/>/g, '\\x3e');
}

function escapeXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function isValidHexColor(str) {
  return typeof str === 'string' && /^#[0-9a-fA-F]{6,8}$/.test(str);
}

function safeColor(color, fallback) {
  return isValidHexColor(color) ? color : (fallback || '#10b981');
}

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
function isSafeKey(key) {
  return !DANGEROUS_KEYS.includes(key);
}

// Set version number in menu when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const menuVersion = document.getElementById('menuVersionNumber');
  if(menuVersion) menuVersion.textContent = 'v' + APP_VERSION;

  // Update layout hints based on device type
  updateLayoutHints();
  window.addEventListener('resize', updateLayoutHints);
});

// The standard layout hint describes what a tap actually does, so on touch it has to
// track Select Mode — with it off, taps belong to the canvas and select nothing.
// Shared with toggleSelectMode() so the two can't drift apart, and so a resize can't
// repaint the Select-Mode-off text while Select Mode is still on.
function standardLayoutHintText() {
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isMobile = window.innerWidth <= 768;
  if(!isTouchDevice && !isMobile) {
    return 'Click to select • Right-click for options • Drag a box to multi-select';
  }
  return selectMode
    ? 'Drag a box to select • Tap to add • Tap selected for options'
    : 'Turn on Select Mode to select panels';
}

// Update hint text based on mobile vs desktop
function updateLayoutHints() {
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isMobile = window.innerWidth <= 768;

  // Standard layout hint
  const standardHint = document.getElementById('standardLayoutHint');
  if(standardHint) standardHint.textContent = standardLayoutHintText();

  // Structure layout hint
  const structureHint = document.getElementById('structureHintText');
  if(structureHint) {
    if(isTouchDevice || isMobile) {
      structureHint.textContent = 'Tap to select • Tap again for options • Hold to drag';
    } else {
      structureHint.textContent = 'Click to select • Right-click for options • Drag to move';
    }
  }
}

// ==================== COLOR UTILITIES ====================
// Helper function to darken a hex color
function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
  const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

// Convert a color to a pastel/lighter version for eco-friendly printing
// Increases lightness to 85% while keeping hue and reducing saturation
function toPastelColor(hex) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  // Convert to HSL
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  // Light neutrals (e.g. white) are already "pastel" — pass through unchanged
  // so eco mode doesn't darken white to grey.
  if (max === min && l >= 0.7) return hex;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  // Make pastel: moderate lightness (70%), moderate saturation (50%) for better differentiation
  l = 0.70;
  s = s * 0.5;

  // Convert back to RGB
  let r2, g2, b2;
  if (s === 0) {
    r2 = g2 = b2 = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r2 = hue2rgb(p, q, h + 1/3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1/3);
  }

  return '#' + [r2, g2, b2].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

// Convert a color to greyscale for print-friendly output
function toGreyscale(hex) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  // Use luminance formula for perceptually accurate greyscale
  let grey = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

  // Lighten by blending with white (70% grey, 30% white)
  grey = Math.round(grey * 0.7 + 255 * 0.3);
  grey = Math.min(255, grey); // Cap at 255

  return '#' + grey.toString(16).padStart(2, '0').repeat(3);
}

function lightenColor(hex, percent) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const newR = Math.min(255, Math.floor(r + (255 - r) * percent));
  const newG = Math.min(255, Math.floor(g + (255 - g) * percent));
  const newB = Math.min(255, Math.floor(b + (255 - b) * percent));
  return `#${newR.toString(16).padStart(2,'0')}${newG.toString(16).padStart(2,'0')}${newB.toString(16).padStart(2,'0')}`;
}

// SOCA label style — global preference, persisted to localStorage. 'numbers' (default) or 'letters'.
let socaLabelStyle = (typeof localStorage !== 'undefined' && localStorage.getItem('ledcalc_soca_label_style')) || 'numbers';
function formatSocaLabel(socaIndex) {
  if (socaLabelStyle !== 'letters') return String(socaIndex + 1);
  let n = socaIndex, s = '';
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}
function setSocaLabelStyle(style) {
  socaLabelStyle = (style === 'letters') ? 'letters' : 'numbers';
  try { localStorage.setItem('ledcalc_soca_label_style', socaLabelStyle); } catch(e) {}
  ['socaLabelNumBtn', 'combinedSocaLabelNumBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', socaLabelStyle === 'numbers');
  });
  ['socaLabelLetterBtn', 'combinedSocaLabelLetterBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', socaLabelStyle === 'letters');
  });
  if (typeof calculate === 'function') calculate();
  if (typeof renderCombinedView === 'function') renderCombinedView();
}
function initSocaLabelStyleButtons() {
  setSocaLabelStyle(socaLabelStyle);
}

// Label a 1-based unit index as a letter or a number, with the style passed in
// rather than read from a global. formatSocaLabel() above is hard-wired to
// socaLabelStyle, so it cannot serve a second label domain — distribution boxes
// are lettered per the hardware (XD A-D), independently of the SOCA preference.
function formatUnitLabel(index1Based, style) {
  const i = Math.max(1, parseInt(index1Based, 10) || 1);
  if (style !== 'letter') return String(i);
  let n = i - 1, s = '';
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}

// SOCA outlines (dashed green perimeter around each custom-SOCA group) — on by default.
let socaOutlinesEnabled = (typeof localStorage !== 'undefined' && localStorage.getItem('ledcalc_soca_outlines') === 'false') ? false : true;
// SOCA diagonal label (rotated label overlay per group) — on by default.
// Distribution box / processor labels on the combined data canvas — on by default.
let dataUnitLabelsEnabled = (typeof localStorage !== 'undefined' && localStorage.getItem('ledcalc_data_unit_labels') === 'false') ? false : true;
function toggleDataUnitLabels() {
  dataUnitLabelsEnabled = !dataUnitLabelsEnabled;
  try { localStorage.setItem('ledcalc_data_unit_labels', String(dataUnitLabelsEnabled)); } catch(e) {}
  const btn = document.getElementById('combinedDataUnitLabelsBtn');
  if (btn) { btn.classList.toggle('active', dataUnitLabelsEnabled); btn.textContent = dataUnitLabelsEnabled ? 'On' : 'Off'; }
  if (typeof renderCombinedView === 'function') renderCombinedView();
}
function initDataUnitLabelButton() {
  const btn = document.getElementById('combinedDataUnitLabelsBtn');
  if (btn) { btn.classList.toggle('active', dataUnitLabelsEnabled); btn.textContent = dataUnitLabelsEnabled ? 'On' : 'Off'; }
}

let socaDiagonalLabelEnabled = (typeof localStorage !== 'undefined' && localStorage.getItem('ledcalc_soca_diagonal_label') === 'false') ? false : true;

function toggleSocaOutlines() {
  socaOutlinesEnabled = !socaOutlinesEnabled;
  try { localStorage.setItem('ledcalc_soca_outlines', String(socaOutlinesEnabled)); } catch(e) {}
  // Both power layouts carry this button and share the one preference, so keep the
  // pair in step the way toggleSocaDiagonalLabel() does for SOCA Label.
  ['socaOutlinesBtn', 'combinedSocaOutlinesBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.toggle('active', socaOutlinesEnabled); el.textContent = socaOutlinesEnabled ? 'On' : 'Off'; }
  });
  if (typeof generateLayout === 'function') generateLayout('power');
  if (typeof renderCombinedView === 'function') renderCombinedView();
}

function toggleSocaDiagonalLabel() {
  socaDiagonalLabelEnabled = !socaDiagonalLabelEnabled;
  try { localStorage.setItem('ledcalc_soca_diagonal_label', String(socaDiagonalLabelEnabled)); } catch(e) {}
  // Both power layouts carry this button and share the one preference, so keep the
  // pair in step the way setSocaLabelStyle() does for SOCA Naming.
  ['socaDiagonalLabelBtn', 'combinedSocaDiagonalLabelBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.toggle('active', socaDiagonalLabelEnabled); el.textContent = socaDiagonalLabelEnabled ? 'On' : 'Off'; }
  });
  if (typeof generateLayout === 'function') generateLayout('power');
  if (typeof renderCombinedView === 'function') renderCombinedView();
}

// Share Distro (per-screen) — when on, this screen shares one physical 3-phase distro with
// the other screens that also have it on: their loads combine into a single imbalance and
// SOCA numbers run continuously across them. Mirrors the current screen's data.sharedDistro
// (saved/loaded by multi-screen.js), like cb5HalfRowEnabled. Default off.
let shareDistroEnabled = false;

function toggleShareDistro() {
  shareDistroEnabled = !shareDistroEnabled;
  const btn = document.getElementById('shareDistroBtn');
  if (btn) { btn.classList.toggle('active', shareDistroEnabled); btn.textContent = shareDistroEnabled ? 'On' : 'Off'; }
  if (typeof screens !== 'undefined' && screens[currentScreenId] && screens[currentScreenId].data) {
    screens[currentScreenId].data.sharedDistro = shareDistroEnabled; // keep live so the group calc sees it
  }
  if (typeof calculate === 'function') calculate();
  if (typeof renderCombinedView === 'function') renderCombinedView();
}

function initSocaToggleButtons() {
  ['socaOutlinesBtn', 'combinedSocaOutlinesBtn'].forEach(id => {
    const ob = document.getElementById(id);
    if (ob) { ob.classList.toggle('active', socaOutlinesEnabled); ob.textContent = socaOutlinesEnabled ? 'On' : 'Off'; }
  });
  ['socaDiagonalLabelBtn', 'combinedSocaDiagonalLabelBtn'].forEach(id => {
    const lb = document.getElementById(id);
    if (lb) { lb.classList.toggle('active', socaDiagonalLabelEnabled); lb.textContent = socaDiagonalLabelEnabled ? 'On' : 'Off'; }
  });
  const sb = document.getElementById('shareDistroBtn');
  if (sb) { sb.classList.toggle('active', shareDistroEnabled); sb.textContent = shareDistroEnabled ? 'On' : 'Off'; }
}

// 3-phase load balancing — per-screen, like Share Distro above. 'aswired' (default)
// shows the leg-pair rotation as physically wired; 'balanced' re-circuits onto the
// lighter legs. Mirrors the current screen's data.phaseBalance (saved/loaded by
// multi-screen.js) so the Combined view can scope it to the selected screens.
// The per-leg amps in calculatedData depend on the mode, so the toggle re-runs calculate().
let phaseBalanceMode = 'aswired';
// Color-by-leg recolours power-canvas panels by leg-pair (visual only).
let colorByLegEnabled = (typeof localStorage !== 'undefined' && localStorage.getItem('ledcalc_color_by_leg') === 'true');

function setPhaseBalanceMode(mode) {
  phaseBalanceMode = (mode === 'balanced') ? 'balanced' : 'aswired';
  const btn = document.getElementById('phaseBalanceBtn');
  if (btn) { btn.classList.toggle('active', phaseBalanceMode === 'balanced'); btn.textContent = phaseBalanceMode === 'balanced' ? 'On' : 'Off'; }
  if (typeof screens !== 'undefined' && screens[currentScreenId] && screens[currentScreenId].data) {
    screens[currentScreenId].data.phaseBalance = (phaseBalanceMode === 'balanced'); // keep live so the combined view sees it
  }
  if (typeof calculate === 'function') calculate();
  if (typeof renderCombinedView === 'function') renderCombinedView();
}

// Single On/Off toggle: Off = as-wired, On = balanced.
function togglePhaseBalance() {
  setPhaseBalanceMode(phaseBalanceMode === 'balanced' ? 'aswired' : 'balanced');
}

function toggleColorByLeg() {
  colorByLegEnabled = !colorByLegEnabled;
  try { localStorage.setItem('ledcalc_color_by_leg', String(colorByLegEnabled)); } catch(e) {}
  const btn = document.getElementById('colorByLegBtn');
  if (btn) { btn.classList.toggle('active', colorByLegEnabled); btn.textContent = colorByLegEnabled ? 'On' : 'Off'; }
  if (typeof generateLayout === 'function') generateLayout('power');
}

function initPhaseBalanceButtons() {
  // #phaseBalanceBtn is per-screen now — loadScreenData() owns its state.
  const btn = document.getElementById('colorByLegBtn');
  if (btn) { btn.classList.toggle('active', colorByLegEnabled); btn.textContent = colorByLegEnabled ? 'On' : 'Off'; }
}

// Effective max panels per circuit: user override if set, else the auto-calculated
// value that calculate.js writes into the input's placeholder. Falls back to 6.
function getEffectivePanelsPerCircuit() {
  const el = document.getElementById('maxPanelsPerCircuit');
  if (!el) return 6;
  const userVal = parseInt(el.value, 10);
  if (userVal > 0) return userVal;
  const placeholder = parseInt(el.placeholder, 10);
  return (placeholder > 0) ? placeholder : 6;
}

// Inverse of formatSocaLabel — accepts "5" or "E" (case-insensitive) and
// returns a 1-based SOCA number, or null if the input is invalid / out of range.
function parseSocaInput(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toUpperCase();
  if (s === '') return null;
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return (n >= 1 && n <= 99) ? n : null;
  }
  if (/^[A-Z]+$/.test(s)) {
    let n = 0;
    for (let i = 0; i < s.length; i++) {
      n = n * 26 + (s.charCodeAt(i) - 64);
    }
    return (n >= 1 && n <= 99) ? n : null;
  }
  return null;
}

// Splits a selected block of panels into the circuits of one SOCA.
// Columns are cut into row bands of at most `ppc` panels, top band first, so a
// column taller than one circuit's budget spills into a later circuit instead of
// being rejected. Within a band, as many equal-height whole columns as fit share
// a circuit. byCol = Map<col, [panelKey]>, sortedCols = its keys in column order.
// Returns { circuits: [[panelKey, ...], ...] } in wiring order, or { error }
// when the block needs more than the 6 circuits a SOCA carries.
function planSocaCircuits(byCol, sortedCols, ppc) {
  const perCircuit = ppc > 0 ? ppc : 1;
  const rowOf = key => parseInt(key.split(',')[1], 10);

  // Band on the rows the block actually occupies, so a sparse selection bands
  // by its own rows rather than by the grid's.
  const rows = new Set();
  let tallest = 0;
  sortedCols.forEach(c => {
    const keys = byCol.get(c);
    keys.forEach(k => rows.add(rowOf(k)));
    if (keys.length > tallest) tallest = keys.length;
  });
  const sortedRows = [...rows].sort((a, b) => a - b);
  const bandHeight = Math.min(perCircuit, Math.max(1, tallest));

  const circuits = [];
  for (let start = 0; start < sortedRows.length; start += bandHeight) {
    const bandRows = new Set(sortedRows.slice(start, start + bandHeight));
    const bandCols = [];
    let bandTallest = 0;
    sortedCols.forEach(c => {
      const keys = byCol.get(c).filter(k => bandRows.has(rowOf(k)));
      if (keys.length === 0) return;
      bandCols.push(keys);
      if (keys.length > bandTallest) bandTallest = keys.length;
    });
    if (bandCols.length === 0) continue;
    const colsPerCircuit = Math.max(1, Math.floor(perCircuit / bandTallest));
    for (let i = 0; i < bandCols.length; i += colsPerCircuit) {
      let circuit = [];
      bandCols.slice(i, i + colsPerCircuit).forEach(keys => { circuit = circuit.concat(keys); });
      circuits.push(circuit);
    }
  }

  if (circuits.length > 6) {
    return { error: `This selection needs ${circuits.length} circuits, but a SOCA holds only 6. ` +
      `Reduce the selection or raise panels-per-circuit.` };
  }
  return { circuits };
}

// Monotonic dark-to-light ramp for SOCA groups. SOCA 1 = base color (darkest),
// each subsequent SOCA is ~14% lighter, capped at 0.70 to avoid washing out
// to white. 6 shades — repeats every 6 SOCAs.
const SOCA_SHADE_CYCLE = [0, 0.14, 0.28, 0.42, 0.56, 0.70];
function applySocaShade(baseColor, socaGroup) {
  const amount = SOCA_SHADE_CYCLE[socaGroup % SOCA_SHADE_CYCLE.length];
  return amount === 0 ? baseColor : lightenColor(baseColor, amount);
}

function hexToRgba(hex, alpha){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function getContrastColor(hex){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  const brightness=(r*299+g*587+b*114)/1000;
  return brightness<128?'#FFFFFF':'#000000';
}
function colorForIndex(i){
  let base=resistorColors[i%10];
  const cycle=Math.floor(i/10);
  const alpha=Math.max(0.4, 1 - cycle*0.2);
  // Use pastel colors for eco-friendly printing
  if (ecoPrintMode) {
    base = toPastelColor(base);
  }
  // Convert to greyscale for greyscale printing
  if (greyscalePrintMode) {
    base = toGreyscale(base);
    return { fill: base, text: '#000000', solid: base };
  }
  if (ecoPrintMode) {
    return { fill: base, text: '#000000', solid: base };
  }
  return { fill: hexToRgba(base, alpha), text: getContrastColor(base), solid: base };
}

// Resistor colour code for one digit: 0 black, 1 brown, 2 red, 3 orange, 4 yellow,
// 5 green, 6 blue, 7 violet, 8 grey, 9 white. resistorColors is offset by one -- it
// opens on brown and closes with the lifted #333333 black that keeps the band legible
// as a panel fill -- so a digit indexes it minus one, and zero takes true black. A
// taped cable and a card outline both want the real colour, not the lifted one.
function resistorDigitColor(d){
  return d === 0 ? '#000000' : resistorColors[d - 1];
}

// Resistor bands for a SOCA card, keyed on the SOCA number rather than a 10-colour
// cycle. 1-9 are a single band; 10 and up spell the number out digit by digit the way
// the crew tapes it -- 10 brown/black, 11 brown/brown, 12 brown/red. Wrapping at 10
// instead would print SOCA 11 the same brown as SOCA 1, and give SOCA 10 a bare black
// band, which reads as zero. i is the 0-based label index.
function socaCardBands(i){
  const n = i + 1;
  if (n < 10) return [resistorDigitColor(n)];
  return String(n).split('').map(function(d){ return resistorDigitColor(Number(d)); });
}

// ==================== MAILTO HELPER ====================
function openMailtoLink(url) {
  var a = document.createElement('a');
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ==================== MATH HELPERS ====================
function toMeters(v, units){ return units==='m' ? v : v*0.3048; }
function fromMeters(m, units){ return units==='m' ? m : m/0.3048; }

function approxAspectRatio(w,h){
  const ratio=w/h;
  const common=[{n:'16:9',v:16/9},{n:'4:3',v:4/3},{n:'3:2',v:3/2},{n:'2:1',v:2/1},{n:'21:9',v:21/9},{n:'1:1',v:1}];
  for(const c of common){ if(Math.abs(ratio-c.v)/c.v<0.02) return {label:c.n, value:ratio}; }
  let best={num:Math.round(ratio*10), den:10, diff:Math.abs(ratio-Math.round(ratio*10)/10)};
  for(let den=1; den<=20; den++){ const num=Math.round(ratio*den); const diff=Math.abs(ratio-(num/den)); if(diff<best.diff){ best={num,den,diff}; } }
  return {label:`${best.num}:${best.den}`, value:ratio};
}

// Standard electrician service sizes (amps). "Service needed" picks the smallest that
// covers the wall's per-leg demand, divided by `factor` (0.8 when the NEC "Derate" 80%
// toggle is on = continuous-load headroom, 1.0 when off). Infinity = exceeds 800 A.
const STANDARD_SERVICE_SIZES = [100, 200, 400, 600, 800];
function serviceAmpsNeeded(amps, factor) {
  if (!(amps > 0)) return 0;
  const required = amps / (factor > 0 ? factor : 1);
  return STANDARD_SERVICE_SIZES.find(s => s >= required) || Infinity;
}

// Formats serviceAmpsNeeded() output for display (0 -> null so the row can be hidden).
function serviceNeededLabel(amps, factor) {
  const svc = serviceAmpsNeeded(amps, factor);
  if (!svc) return null;
  return svc === Infinity ? '> 800 A (multiple services)' : `${svc} A`;
}

// ==================== DATA LINE FLOW ====================
// Order one data line's panels into physical cable-flow order, honoring the data
// start-direction. 'top'/'bottom' snake (toggle direction each column); 'all_top'/
// 'all_bottom' feed every column from the same end (no toggle). Used as the single
// source of truth so the data layout, cable canvas, gear list, and cable diagram all
// describe the same run. Reads {c,r} or {col,row} and returns the original objects.
function orderDataLineFlow(panels, startDir) {
  if(!panels || panels.length < 2) return panels ? panels.slice() : [];
  const byCol = new Map();
  panels.forEach(p => {
    const c = (p.c !== undefined) ? p.c : p.col;
    const r = (p.r !== undefined) ? p.r : p.row;
    if(!byCol.has(c)) byCol.set(c, []);
    byCol.get(c).push({ r, orig: p });
  });
  const cols = Array.from(byCol.keys()).sort((a, b) => a - b);
  const serpentine = (startDir === 'top' || startDir === 'bottom');
  let goingDown = (startDir === 'top' || startDir === 'all_top');
  const out = [];
  cols.forEach(c => {
    const rows = byCol.get(c).sort((a, b) => a.r - b.r);
    (goingDown ? rows : rows.slice().reverse()).forEach(o => out.push(o.orig));
    if(serpentine) goingDown = !goingDown;
  });
  return out;
}

// ==================== FILE SAVE HELPERS ====================
// One 3-tier save ladder for every export: File System Access "Save As" dialog
// (Chrome/Edge desktop) -> Web Share sheet, i.e. "Save to Files" (mobile) ->
// anchor download (Safari/Firefox desktop, which have no location-prompt API).
//
// Sharing one picker id lets Chrome remember a single folder for all BLINK
// exports across sessions; startIn reopens the last-used folder within a
// session, so exports land beside the project the user saved.
const BLINK_SAVE_PICKER_ID = 'blinkExport';
let _blinkLastSaveHandle = null;

function _blinkIsMobileDevice() {
  return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
    (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
}

function _blinkDownloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(function() {
    if(link.parentNode) document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

// Phase 1. MUST run while user activation is still live (directly in the click
// handler): showSaveFilePicker throws SecurityError once transient activation
// expires, which is why long exports pick the target BEFORE generating the file.
// Returns null when the user cancels, so callers can abort before doing work.
async function pickSaveTarget(fileName, opts) {
  opts = opts || {};
  if(!window.showSaveFilePicker) {
    return { kind: _blinkIsMobileDevice() ? 'share' : 'download' };
  }
  let accept = opts.accept;
  if(!accept) {
    accept = {};
    accept[opts.mimeType || 'application/octet-stream'] = ['.' + (String(fileName).split('.').pop() || 'bin')];
  }
  // `id` and `startIn` are mutually exclusive here on purpose: a directory the
  // browser remembered for an id takes precedence over startIn, so passing both
  // would let a stale remembered folder beat the project the user just opened.
  // A known location this session wins; otherwise fall back to the id, which is
  // what carries the last-used folder across sessions.
  // A stale handle can also make startIn throw, so the second attempt drops it.
  const attempts = _blinkLastSaveHandle ? [true, false] : [false];
  for(const useStartIn of attempts) {
    const pickerOpts = {
      suggestedName: fileName,
      types: [{ description: opts.description || 'File', accept: accept }]
    };
    if(useStartIn) pickerOpts.startIn = _blinkLastSaveHandle;
    else pickerOpts.id = BLINK_SAVE_PICKER_ID;
    try {
      const handle = await window.showSaveFilePicker(pickerOpts);
      return { kind: 'handle', handle: handle };
    } catch(e) {
      if(e.name === 'AbortError') return null;
      _blinkLastSaveHandle = null;
    }
  }
  return { kind: 'download' };
}

// Remember the folder a project lives in, so the next export's Save As dialog
// opens there instead of wherever the user last happened to save. Set when a
// project is opened from disk and after every successful save.
function rememberSaveLocation(handle) {
  if(handle) _blinkLastSaveHandle = handle;
}

// Phase 2. Safe after long async work — writing to an already-granted handle
// needs no user activation.
async function writeSaveTarget(target, blob, fileName, mimeType) {
  if(!target) return false;
  mimeType = mimeType || blob.type || 'application/octet-stream';
  if(target.kind === 'handle') {
    try {
      const writable = await target.handle.createWritable();
      await writable.write(blob);
      await writable.close();
      _blinkLastSaveHandle = target.handle;
      return true;
    } catch(e) {
      if(e.name !== 'AbortError') showAlert('Save failed: ' + e.message);
      return false;
    }
  }
  if(target.kind === 'share') {
    try {
      const file = new File([blob], fileName, { type: mimeType });
      if(navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return true;
      }
    } catch(e) {
      if(e.name === 'AbortError') return false;
    }
  }
  _blinkDownloadBlob(blob, fileName);
  return true;
}

// One-shot for cheap exports where the blob is already in hand.
async function saveBlobToDevice(blob, fileName, opts) {
  const target = await pickSaveTarget(fileName, opts);
  if(!target) return false;
  return writeSaveTarget(target, blob, fileName, (opts && opts.mimeType) || blob.type);
}
