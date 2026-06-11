// ==================== DISTRO WIRING ====================
// Lets the user define how each of their SOCA's 6 circuits is wired to the
// three legs (X/Y/Z), separately for 120 V circuits (single-leg: hot+neutral)
// and 208 V circuits (two-leg: hot-hot, no neutral). Drives the per-leg amp
// math in core/phase-balance.js — the active column is chosen by the
// power-section Voltage (<=150 V -> 120 V single-leg, else 208 V two-leg).
// Stored in localStorage; an empty cell falls back to the standard rotation.

const STORAGE_KEY_DISTRO_WIRING = 'ledcalc_distro_wiring';

// Standard rotations (2 circuits per leg / per leg-pair).
const DISTRO_DEFAULT_120 = ['X', 'Y', 'Z', 'X', 'Y', 'Z'];
const DISTRO_DEFAULT_208 = ['XY', 'YZ', 'ZX', 'XY', 'YZ', 'ZX'];

// User config: per-column array of 6 cells (empty string = use the default).
let distroWiring = { v120: ['', '', '', '', '', ''], v208: ['', '', '', '', '', ''] };

// Keep only the leg letters X/Y/Z (uppercased), max 3 chars.
function sanitizeLegInput(s) {
  return String(s == null ? '' : s).toUpperCase().replace(/[^XYZ]/g, '').slice(0, 3);
}

function validateDistroWiring(parsed) {
  const cleanCol = arr => {
    const out = ['', '', '', '', '', ''];
    if (Array.isArray(arr)) {
      for (let i = 0; i < 6; i++) out[i] = sanitizeLegInput(arr[i]);
    }
    return out;
  };
  const safe = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  return { v120: cleanCol(safe.v120), v208: cleanCol(safe.v208) };
}

function loadDistroWiring() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_DISTRO_WIRING);
    if (data) distroWiring = validateDistroWiring(JSON.parse(data));
  } catch (err) {
    console.warn('Failed to load distro wiring:', err);
    distroWiring = { v120: ['', '', '', '', '', ''], v208: ['', '', '', '', '', ''] };
  }
}

function persistDistroWiring() {
  try {
    localStorage.setItem(STORAGE_KEY_DISTRO_WIRING, JSON.stringify(distroWiring));
  } catch (err) {
    console.warn('Failed to save distro wiring:', err);
  }
}

// Canonicalise a typed cell into a leg token for the math.
// single -> first valid leg ('X'/'Y'/'Z'); pair -> the two distinct legs
// canonicalised to 'XY'/'YZ'/'ZX'. Returns null when not resolvable.
function canonicalLegToken(cell, type) {
  const letters = sanitizeLegInput(cell);
  if (type === 'single') {
    return letters.length >= 1 ? letters[0] : null;
  }
  const legs = [];
  for (const ch of letters) if (!legs.includes(ch)) legs.push(ch);
  if (legs.length < 2) return null;
  const a = legs[0], b = legs[1];
  const has = (x, y) => (a === x || b === x) && (a === y || b === y);
  if (has('X', 'Y')) return 'XY';
  if (has('Y', 'Z')) return 'YZ';
  if (has('X', 'Z')) return 'ZX';
  return null;
}

// Resolve the active wiring for the given voltage into { type, slots[6] }.
function resolveDistroWiring(voltage) {
  const single = !(voltage > 150);              // <=150 V -> single-leg (120 V)
  const type = single ? 'single' : 'pair';
  const cells = single ? distroWiring.v120 : distroWiring.v208;
  const defaults = single ? DISTRO_DEFAULT_120 : DISTRO_DEFAULT_208;
  const slots = [];
  for (let i = 0; i < 6; i++) {
    slots.push(canonicalLegToken(cells[i], type) || defaults[i]);
  }
  return { type, slots };
}

// ==================== MODAL ====================

function openDistroWiringModal() {
  loadDistroWiring();
  for (let i = 0; i < 6; i++) {
    const a = document.getElementById('distroW120_' + i);
    const b = document.getElementById('distroW208_' + i);
    if (a) a.value = distroWiring.v120[i] || '';
    if (b) b.value = distroWiring.v208[i] || '';
  }
  const modal = document.getElementById('distroWiringModal');
  if (modal) modal.classList.add('active');
  // Hide welcome page scrollbar if the modal is opened from there.
  const welcomePage = document.querySelector('.welcome-page');
  if (welcomePage && welcomePage.style.display !== 'none') {
    welcomePage.style.overflowY = 'hidden';
  }
}

function closeDistroWiringModal() {
  handleModalClose('distroWiringModal');
}

function saveDistroWiring() {
  const v120 = [], v208 = [];
  for (let i = 0; i < 6; i++) {
    const a = document.getElementById('distroW120_' + i);
    const b = document.getElementById('distroW208_' + i);
    v120.push(sanitizeLegInput(a ? a.value : ''));
    v208.push(sanitizeLegInput(b ? b.value : ''));
  }
  distroWiring = { v120, v208 };
  persistDistroWiring();
  closeDistroWiringModal();
  if (typeof calculate === 'function') calculate();
}

function resetDistroWiring() {
  for (let i = 0; i < 6; i++) {
    const a = document.getElementById('distroW120_' + i);
    const b = document.getElementById('distroW208_' + i);
    if (a) a.value = '';
    if (b) b.value = '';
  }
}

// Load saved wiring at startup so calculate() has it on first render.
loadDistroWiring();
