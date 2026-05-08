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

// Update hint text based on mobile vs desktop
function updateLayoutHints() {
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isMobile = window.innerWidth <= 768;

  // Standard layout hint
  const standardHint = document.getElementById('standardLayoutHint');
  if(standardHint) {
    if(isTouchDevice || isMobile) {
      standardHint.textContent = 'Tap to select • Tap again for options • Drag to multi-select';
    } else {
      standardHint.textContent = 'Click to select • Right-click for options • Drag to multi-select';
    }
  }

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

// SOCA outlines (dashed green perimeter around each custom-SOCA group) — on by default.
let socaOutlinesEnabled = (typeof localStorage !== 'undefined' && localStorage.getItem('ledcalc_soca_outlines') === 'false') ? false : true;
// SOCA diagonal label (rotated label overlay per group) — on by default.
let socaDiagonalLabelEnabled = (typeof localStorage !== 'undefined' && localStorage.getItem('ledcalc_soca_diagonal_label') === 'false') ? false : true;

function toggleSocaOutlines() {
  socaOutlinesEnabled = !socaOutlinesEnabled;
  try { localStorage.setItem('ledcalc_soca_outlines', String(socaOutlinesEnabled)); } catch(e) {}
  const btn = document.getElementById('socaOutlinesBtn');
  if (btn) { btn.classList.toggle('active', socaOutlinesEnabled); btn.textContent = socaOutlinesEnabled ? 'On' : 'Off'; }
  if (typeof generateLayout === 'function') generateLayout('power');
}

function toggleSocaDiagonalLabel() {
  socaDiagonalLabelEnabled = !socaDiagonalLabelEnabled;
  try { localStorage.setItem('ledcalc_soca_diagonal_label', String(socaDiagonalLabelEnabled)); } catch(e) {}
  const btn = document.getElementById('socaDiagonalLabelBtn');
  if (btn) { btn.classList.toggle('active', socaDiagonalLabelEnabled); btn.textContent = socaDiagonalLabelEnabled ? 'On' : 'Off'; }
  if (typeof generateLayout === 'function') generateLayout('power');
}

function initSocaToggleButtons() {
  const ob = document.getElementById('socaOutlinesBtn');
  if (ob) { ob.classList.toggle('active', socaOutlinesEnabled); ob.textContent = socaOutlinesEnabled ? 'On' : 'Off'; }
  const lb = document.getElementById('socaDiagonalLabelBtn');
  if (lb) { lb.classList.toggle('active', socaDiagonalLabelEnabled); lb.textContent = socaDiagonalLabelEnabled ? 'On' : 'Off'; }
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

