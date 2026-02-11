// ==================== MOBILE-SPECIFIC JAVASCRIPT ====================

// Mobile Menu Functions
function toggleMobileMenu() {
  const overlay = document.getElementById('mobileMenuOverlay');
  overlay.classList.toggle('active');
  document.body.style.overflow = overlay.classList.contains('active') ? 'hidden' : '';
}

function closeMobileMenu() {
  const overlay = document.getElementById('mobileMenuOverlay');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function reopenMenuIfNeeded() {
  if (modalOpenedFromMenu) {
    modalOpenedFromMenu = false;
    const overlay = document.getElementById('mobileMenuOverlay');
    // Add instant class to disable transitions
    overlay.classList.add('instant');
    // Reopen menu instantly
    toggleMobileMenu();
    // Remove instant class after menu is open (next frame)
    requestAnimationFrame(() => {
      overlay.classList.remove('instant');
    });
  }
}

// Hard refresh - clears all caches and reloads the app
function hardRefreshApp() {
  // Get the version we're updating to from the banner
  const banner = document.getElementById('updateBanner');
  const targetVersion = banner && banner.dataset.version;

  // Set dismissed version to target so banner won't reappear during refresh cycle
  if (targetVersion) {
    localStorage.setItem('dismissedUpdateVersion', targetVersion);
  }

  // Clear all caches before reload
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }

  // Force hard reload from server (bypasses cache)
  setTimeout(() => {
    window.location.reload(true);
  }, 100);
}

// Mobile View Switching
let currentMobileView = 'simple';
let currentAppMode = 'simple'; // Track complex vs simple mode
let currentMobileLayout = 'standard'; // Track which layout is showing in layouts view

// ==================== COMPLEX VIEW ACTIVATION ====================
// Shows the full complex mode: all config sections, layouts, and toggles.
function activateComplexView() {
  // Show full app - all sections visible
  const mainContainer = document.querySelector('.main-container');
  const resultsEl = document.getElementById('results');
  const specWarningEl = document.getElementById('specWarning');
  const screenTabsContainer = document.getElementById('screenTabsContainer');
  const powerSection = document.getElementById('powerSection');
  const structureSection = document.getElementById('structureSection');
  const dataDirectionRow = document.getElementById('dataDirectionRow');
  const dataTogglesRow = document.getElementById('dataTogglesRow');

  if(mainContainer) mainContainer.style.display = 'block';
  if(resultsEl) resultsEl.style.display = 'block';
  if(specWarningEl) specWarningEl.style.display = 'block';
  if(screenTabsContainer) screenTabsContainer.style.display = 'flex';
  // Show all config sections
  if(powerSection) powerSection.style.display = 'block';
  if(structureSection) structureSection.style.display = 'block';
  if(dataDirectionRow) dataDirectionRow.style.display = 'block';
  if(dataTogglesRow) dataTogglesRow.style.display = 'flex';
}

// ==================== SIMPLE VIEW ACTIVATION ====================
// Shows the simplified mode: config + specs only, no layouts or structure.
function activateSimpleView() {
  // Simple mode - show config, specs, canvas. No layouts, no cabling, no structure
  const mainContainer = document.querySelector('.main-container');
  const resultsEl = document.getElementById('results');
  const specWarningEl = document.getElementById('specWarning');
  const screenTabsContainer = document.getElementById('screenTabsContainer');
  const powerSection = document.getElementById('powerSection');
  const structureSection = document.getElementById('structureSection');
  const dataDirectionRow = document.getElementById('dataDirectionRow');
  const dataTogglesRow = document.getElementById('dataTogglesRow');

  if(mainContainer) mainContainer.style.display = 'block';
  if(resultsEl) resultsEl.style.display = 'block';
  if(specWarningEl) specWarningEl.style.display = 'block';
  if(screenTabsContainer) screenTabsContainer.style.display = 'flex';
  // Show power section
  if(powerSection) powerSection.style.display = 'block';
  // Hide structure
  if(structureSection) structureSection.style.display = 'none';
  // Simplify data section
  if(dataDirectionRow) dataDirectionRow.style.display = 'none';
  if(dataTogglesRow) dataTogglesRow.style.display = 'none';
  // No layouts in simple mode (standardContainer, powerContainer, dataContainer, structureContainer already hidden)
}

// Switch between Complex, Simple, and Combined app modes
function switchAppMode(mode) {
  currentAppMode = mode;

  // Update toggle button states
  document.querySelectorAll('.nav-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // Switch to the appropriate view
  if(mode === 'complex') {
    switchMobileView('complex');
  } else if(mode === 'simple') {
    switchMobileView('simple');
  } else if(mode === 'combined') {
    switchMobileView('combined');
  } else if(mode === 'gear') {
    switchMobileView('gear');
  } else if(mode === 'raster') {
    switchMobileView('raster');
  }
}

function switchMobileView(view) {
  currentMobileView = view;

  // Update all toggle buttons - match by data-mode or data-view
  document.querySelectorAll('.nav-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === view || btn.dataset.view === view);
  });

  // Get all containers
  const mainContainer = document.querySelector('.main-container');
  const resultsEl = document.getElementById('results');
  const specWarningEl = document.getElementById('specWarning');
  const screenTabsContainer = document.getElementById('screenTabsContainer');
  const layoutsTogglesContainer = document.getElementById('layoutsTogglesContainer');
  const canvasContainer = document.getElementById('canvasContainer');
  const canvasTabsEl = document.getElementById('canvasTabsContainer');
  const combinedContainer = document.getElementById('combinedContainer');
  const gearListContainer = document.getElementById('gearListContainer');
  const rasterScreenTableContainer = document.getElementById('rasterScreenTableContainer');

  // Layout containers
  const standardContainer = document.getElementById('standardContainer');
  const powerContainer = document.getElementById('powerContainer');
  const dataContainer = document.getElementById('dataContainer');
  const structureContainer = document.getElementById('structureContainer');

  // Config sections (for simple mode hiding)
  const powerSection = document.getElementById('powerSection');
  const structureSection = document.getElementById('structureSection');
  const dataDirectionRow = document.getElementById('dataDirectionRow');
  const dataTogglesRow = document.getElementById('dataTogglesRow');

  // Hide all first
  if(mainContainer) mainContainer.style.display = 'none';
  if(resultsEl) resultsEl.style.display = 'none';
  if(specWarningEl) specWarningEl.style.display = 'none';
  if(screenTabsContainer) screenTabsContainer.style.display = 'none';
  if(layoutsTogglesContainer) layoutsTogglesContainer.style.display = 'none';
  if(standardContainer) standardContainer.style.display = 'none';
  if(powerContainer) powerContainer.style.display = 'none';
  if(dataContainer) dataContainer.style.display = 'none';
  if(structureContainer) structureContainer.style.display = 'none';
  if(canvasContainer) canvasContainer.style.display = 'none';
  if(canvasTabsEl) canvasTabsEl.style.display = 'none';
  if(combinedContainer) combinedContainer.style.display = 'none';
  if(gearListContainer) gearListContainer.style.display = 'none';
  if(rasterScreenTableContainer) rasterScreenTableContainer.style.display = 'none';

  switch(view) {
    case 'complex':
      activateComplexView();
      break;

    case 'simple':
      activateSimpleView();
      break;

    case 'combined':
      activateCombinedView();
      break;

    case 'gear':
      activateGearView();
      break;

    case 'canvas':
      activateCanvasView();
      break;

    case 'raster':
      activateRasterView();
      break;
  }

  // Trigger recalculation to ensure canvases render
  if(typeof calculate === 'function') {
    calculate();
  }
}

// Track collapsed state of layout containers
const collapsedLayouts = new Set();

// Toggle collapse/expand state of a layout container
function toggleLayoutCollapse(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Find the .layout-content child directly instead of relying on ID map
  const content = container.querySelector('.layout-content');
  const btn = container.querySelector('.layout-collapse-btn');

  if (!content) return;

  if (collapsedLayouts.has(containerId)) {
    // Expand
    collapsedLayouts.delete(containerId);
    content.classList.remove('collapsed');
    container.classList.remove('collapsed');
    if (btn) btn.classList.remove('collapsed');
  } else {
    // Collapse
    collapsedLayouts.add(containerId);
    content.classList.add('collapsed');
    container.classList.add('collapsed');
    if (btn) btn.classList.add('collapsed');
  }
}

// Switch between layouts within the Layouts view
function showMobileLayout(layout) {
  currentMobileLayout = layout;

  // Update toggle buttons
  document.querySelectorAll('.layouts-toggle-container .toggle-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById('layoutToggle' + layout.charAt(0).toUpperCase() + layout.slice(1));
  if(activeBtn) activeBtn.classList.add('active');

  // Hide all layout containers
  const standardContainer = document.getElementById('standardContainer');
  const powerContainer = document.getElementById('powerContainer');
  const dataContainer = document.getElementById('dataContainer');
  const structureContainer = document.getElementById('structureContainer');

  if(standardContainer) standardContainer.style.display = 'none';
  if(powerContainer) powerContainer.style.display = 'none';
  if(dataContainer) dataContainer.style.display = 'none';
  if(structureContainer) structureContainer.style.display = 'none';

  // Show the selected layout
  switch(layout) {
    case 'standard':
      if(standardContainer) standardContainer.style.display = 'block';
      break;
    case 'power':
      if(powerContainer) powerContainer.style.display = 'block';
      break;
    case 'data':
      if(dataContainer) dataContainer.style.display = 'block';
      break;
    case 'structure':
      if(structureContainer) structureContainer.style.display = 'block';
      break;
  }

  // Regenerate the layout
  if(typeof generateLayout === 'function') {
    generateLayout(layout);
  }
}

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show install button
  const installBtn = document.getElementById('installPwaBtn');
  if(installBtn) installBtn.style.display = 'block';
});

function installPwa() {
  if(deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if(choiceResult.outcome === 'accepted') {
        console.log('User accepted PWA install');
      }
      deferredPrompt = null;
      const installBtn = document.getElementById('installPwaBtn');
      if(installBtn) installBtn.style.display = 'none';
    });
  }
}

// Unregister any existing service workers (cleanup from previous versions)
// Service workers were causing update issues, so we've removed them
if('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      reg.unregister().then(() => console.log('SW unregistered'));
    });
  });
  // Also clear any old caches
  if('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        if(name.startsWith('led-calc-mobile-')) {
          caches.delete(name);
        }
      });
    });
  }
}

// Collapsible Sections - runs after page fully loads
function initMobileUI() {
  console.log('Initializing mobile UI...');

  // Add section-content wrapper to all section boxes that don't have one
  document.querySelectorAll('.section-box').forEach(box => {
    const title = box.querySelector('.section-title');
    if(title && !box.querySelector('.section-content')) {
      // Wrap non-title children in section-content
      const children = Array.from(box.children).filter(child => !child.classList.contains('section-title'));
      if(children.length > 0) {
        const content = document.createElement('div');
        content.className = 'section-content';
        children.forEach(child => content.appendChild(child));
        box.appendChild(content);
      }
    }

    // Add click/touch handler for collapsing
    if(title) {
      title.addEventListener('click', function(e) {
        e.stopPropagation();
        box.classList.toggle('collapsed');
      });
    }
  });

  // Show welcome page on load, or fall back to simple view
  if(typeof isWelcomePageVisible !== 'undefined' && isWelcomePageVisible) {
    showWelcomePage();
  } else {
    switchMobileView('simple');
    if(typeof calculate === 'function') {
      setTimeout(calculate, 100);
    }
  }

  // Setup Combined canvas handlers for panel selection and screen dragging
  if(typeof setupCombinedCanvasHandlers === 'function') {
    setupCombinedCanvasHandlers();
  }
  if(typeof setupCombinedDragHandlers === 'function') {
    setupCombinedDragHandlers();
  }

  // Check for updates after UI loads
  setTimeout(checkForUpdates, 500);

  console.log('Mobile UI initialized');
}

// Run initialization when DOM is ready
if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileUI);
} else {
  // DOM already loaded, run now
  initMobileUI();
}
