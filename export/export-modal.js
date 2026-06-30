// ==================== CONSOLIDATED EXPORT MODAL ====================
// Thin UI layer that gathers every export option into one modal. It drives the
// existing export functions unchanged — it adds NO new export logic.

function openExportModal() {
  const modal = document.getElementById('exportModal');
  if(!modal) return;
  if(typeof modalReturnTo !== 'undefined') modalReturnTo = null;  // top-level: no parent to return to
  exportShowHub();          // always reset to the hub so we never reopen mid-drill-down
  modal.classList.add('active');
}

// Used by the export actions (Download, Export All, etc.): hide the modal and
// let the export proceed to the app — don't reopen the menu over a download.
function closeExportModal() {
  const modal = document.getElementById('exportModal');
  if(modal) modal.classList.remove('active');
  // Clear the menu flag so it can't leak into a later modal's close
  // (which would wrongly reopen the hamburger menu).
  if(typeof modalOpenedFromMenu !== 'undefined') modalOpenedFromMenu = false;
}

// Used by the header X: the user is dismissing the modal, so return to wherever
// it was opened from — the hamburger menu (or a parent modal, if nested).
function dismissExportModal() {
  const modal = document.getElementById('exportModal');
  if(modal) modal.classList.remove('active');
  reopenMenuIfNeeded();
}

// Re-show the export modal on whatever sub-page was active (used as the
// return target when a child modal — print preview, outline, Send to Jared — closes).
function reopenExportModal() {
  const modal = document.getElementById('exportModal');
  if(modal) modal.classList.add('active');
}

// -------------------- NAVIGATION (hub <-> sub-pages) --------------------

function exportShowHub() {
  const pages = document.querySelectorAll('#exportModal .exp-page');
  for(let i = 0; i < pages.length; i++) {
    pages[i].style.display = (pages[i].id === 'exportHub') ? 'block' : 'none';
  }
  const title = document.getElementById('exportModalTitle');
  if(title) title.textContent = 'Export';
  const back = document.getElementById('exportBackBtn');
  if(back) back.style.display = 'none';
}

function exportShowPage(page, title) {
  const targetId = { canvas: 'exportPageCanvas', tp: 'exportPageTp', gear: 'exportPageGear' }[page];
  if(!targetId) return;
  const pages = document.querySelectorAll('#exportModal .exp-page');
  for(let i = 0; i < pages.length; i++) {
    pages[i].style.display = (pages[i].id === targetId) ? 'block' : 'none';
  }
  const titleEl = document.getElementById('exportModalTitle');
  if(titleEl) titleEl.textContent = title || 'Export';
  const back = document.getElementById('exportBackBtn');
  if(back) back.style.display = '';
}

// A canvas is "set up" when it has rendered content (width > 0) and at least one
// screen has panel dimensions. This is independent of the current view, so a
// loaded project that already has a canvas isn't nagged to visit the Canvas page.
function _exportCanvasReady() {
  const canvas = document.getElementById('canvasView');
  if(!canvas || canvas.width === 0) return false;
  if(typeof screens !== 'object' || !screens) return false;
  return Object.values(screens).some(function(s) {
    return s && s.data && ((s.data.panelsWide > 0) || (s.data.panelsHigh > 0));
  });
}

// Test pattern exports are only meaningful once the test pattern tool is initialized.
function _exportTpReady() {
  return (typeof _tpInitialized !== 'undefined' && _tpInitialized);
}

// -------------------- DOCUMENT --------------------

function exportModalPdfReport() {
  // Mirrors the #btnExportPDF handler in config/dom-setup.js: mobile exports
  // directly (simple vs complex), desktop opens the print preview.
  const isMobileDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
    (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  const isSimpleMode = (typeof currentAppMode !== 'undefined' && currentAppMode === 'simple');
  if(isMobileDevice) {
    closeExportModal();
    if(isSimpleMode) { exportPDF(); } else { exportComplexMobileDirect(); }
  } else {
    // Open the print preview as a child so its X returns here, not the menu.
    openSubModal('exportModal', reopenExportModal, openPrintPreview);
  }
}

function exportModalEverything() {
  closeExportModal();
  exportAll();
}

// -------------------- CANVAS IMAGE --------------------

let _exportScope = 'full';   // full | screens | outline | titleblock
let _exportFormat = 'png';   // png | jpeg

function _expSelectInGroup(btn) {
  const btns = btn.parentNode.querySelectorAll('.toggle-btn');
  for(let i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  btn.classList.add('active');
}

function setExportScope(scope, btn) {
  _exportScope = scope;
  _expSelectInGroup(btn);
}

function setExportFormat(fmt, btn) {
  _exportFormat = fmt;
  _expSelectInGroup(btn);
}

async function runExportCanvasImage() {
  const fmtSelect = document.getElementById('canvasExportFormat');
  if(!fmtSelect) return;
  if(!(await _exportEnsureCanvasReady())) return;
  const imgFmt = (_exportFormat === 'jpeg') ? 'jpeg' : 'png';
  // Scope drives the value exportCanvas() routes on; PNG/JPEG applies to all three
  // scopes (full → format directly, screens/titleblock → format override arg).
  fmtSelect.value = (_exportScope === 'full') ? imgFmt : _exportScope;
  closeExportModal();
  exportCanvas(imgFmt);
}

// Screen outline is its own feature (opens the outline options modal). Make that
// modal's Cancel/X return to the export modal.
async function runExportOutline() {
  const fmtSelect = document.getElementById('canvasExportFormat');
  if(!fmtSelect) return;
  if(!(await _exportEnsureCanvasReady())) return;
  fmtSelect.value = 'outline';
  openSubModal('exportModal', reopenExportModal, exportCanvas);
}

async function runExportResolume() {
  const fmtSelect = document.getElementById('canvasExportFormat');
  if(!fmtSelect) return;
  if(!(await _exportEnsureCanvasReady())) return;
  fmtSelect.value = 'resolume';
  closeExportModal();
  exportCanvas();
}

// If the canvas isn't rendered/visible, offer to open the Canvas page (where it
// gets set up) instead of exporting. Returns true only when it's safe to export.
async function _exportEnsureCanvasReady() {
  if(_exportCanvasReady()) return true;
  const go = await showConfirm(
    "You haven't set up your canvas yet. Open the Canvas page to position your screens and pick a size, then export.",
    'Canvas not ready', 'Go to Canvas');
  if(go) { closeExportModal(); if(typeof switchMobileView === 'function') switchMobileView('canvas'); }
  return false;
}

// -------------------- TEST PATTERN --------------------

async function runExportTpPng() {
  if(!(await _exportEnsureTpReady())) return;
  closeExportModal();
  exportTestPatternPng();
}

async function runExportTpMp4() {
  if(!(await _exportEnsureTpReady())) return;
  const fpsInput = document.getElementById('exportTpFps');
  if(fpsInput) {
    const fps = parseFloat(fpsInput.value);
    if(fps > 0) {
      if(typeof tpSweepFps !== 'undefined') tpSweepFps = fps;
      const tpFpsEl = document.getElementById('tpSweepFps');
      if(tpFpsEl) tpFpsEl.value = fpsInput.value;  // exact option string (e.g. "59.94")
    }
  }
  closeExportModal();
  exportTestPatternVideo();
}

// If the test pattern tool hasn't been opened yet, offer to open it instead of
// exporting. Returns true only when it's safe to export.
async function _exportEnsureTpReady() {
  if(_exportTpReady()) return true;
  const go = await showConfirm(
    "You haven't built a test pattern yet. Open the Test Pattern tool to set one up, then export.",
    'Test Pattern not ready', 'Open Test Pattern');
  if(go) { closeExportModal(); if(typeof enterTestPatternMode === 'function') enterTestPatternMode(); }
  return false;
}

// -------------------- GEAR LIST --------------------

function runExportGearTxt() {
  // Same gear text the Export All zip and Send to Jared email use.
  try {
    const screenIds = Object.keys(screens).sort(function(a, b) {
      return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
    });
    if(screenIds.length === 0) { showAlert('No screens to export.'); return; }
    const gearData = buildGearListData(screenIds);
    const gearContent = buildGearListText(gearData);
    if(!gearContent) { showAlert('No gear list to export.'); return; }
    const nameEl = document.getElementById('configName');
    let base = (nameEl && nameEl.value.trim()) ? nameEl.value.trim() : 'LED_Gear_List';
    base = base.replace(/[<>:"/\\|?*]/g, '_');
    const blob = new Blob([gearContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = base + '_gear.txt';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  } catch(e) {
    showAlert('Failed to export gear list.');
  }
  closeExportModal();
}

function runExportSendToJared() {
  // Send to Jared opens its own modal — make its Cancel/X return here.
  openSubModal('exportModal', reopenExportModal, openSendToJaredModal);
}