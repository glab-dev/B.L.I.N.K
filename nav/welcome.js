// ==================== WELCOME PAGE ====================
// Shows/hides the welcome page and configures bottom nav per selected mode.
// Uses History API so the browser back button returns to the welcome page.

function showWelcomePage() {
  isWelcomePageVisible = true;

  var welcomePage = document.getElementById('welcomePage');
  var header = document.querySelector('.mobile-header');
  var bottomNav = document.querySelector('.bottom-nav');
  var updateBanner = document.getElementById('updateBanner');

  if(welcomePage) welcomePage.style.display = 'flex';
  if(header) header.style.display = 'none';
  if(bottomNav) bottomNav.style.display = 'none';
  if(updateBanner) updateBanner.classList.remove('visible');

  // Hide all app content containers
  var ids = ['results', 'specWarning', 'screenTabsContainer', 'layoutsTogglesContainer',
    'canvasContainer', 'canvasTabsContainer', 'combinedContainer', 'gearListContainer',
    'standardContainer', 'powerContainer', 'dataContainer', 'structureContainer'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if(el) el.style.display = 'none';
  });

  var mainContainer = document.querySelector('.main-container');
  if(mainContainer) mainContainer.style.display = 'none';

  var desktopHeader = document.querySelector('.page-header');
  if(desktopHeader) desktopHeader.style.display = 'none';

  document.body.style.overflow = 'hidden';

  // Set version number
  var versionEl = document.getElementById('welcomeVersionNumber');
  if(versionEl && typeof APP_VERSION !== 'undefined') {
    versionEl.textContent = 'v' + APP_VERSION;
  }
}

function hideWelcomePage() {
  isWelcomePageVisible = false;

  var welcomePage = document.getElementById('welcomePage');
  var header = document.querySelector('.mobile-header');
  var bottomNav = document.querySelector('.bottom-nav');

  if(welcomePage) welcomePage.style.display = 'none';
  if(header) header.style.display = 'flex';
  if(bottomNav) bottomNav.style.display = 'flex';

  document.body.style.overflow = '';
}

function configureBottomNavForMode(mode) {
  var complexGroups = document.querySelectorAll('.nav-complex-group');
  var simpleGroups = document.querySelectorAll('.nav-simple-group');

  if(mode === 'simple') {
    complexGroups.forEach(function(g) { g.style.display = 'none'; });
    simpleGroups.forEach(function(g) { g.style.display = 'flex'; });
  } else if(mode === 'complex') {
    complexGroups.forEach(function(g) { g.style.display = 'flex'; });
    simpleGroups.forEach(function(g) { g.style.display = 'none'; });
  }
}

function enterSimpleMode() {
  // Push history state so back button returns to welcome page
  history.pushState({ view: 'app', mode: 'simple' }, '', '');
  hideWelcomePage();
  configureBottomNavForMode('simple');
  switchAppMode('simple');
}

function enterComplexMode() {
  // Push history state so back button returns to welcome page
  history.pushState({ view: 'app', mode: 'complex' }, '', '');
  hideWelcomePage();
  configureBottomNavForMode('complex');
  switchAppMode('complex');
}

function openHelpModal() {
  var modal = document.getElementById('helpModal');
  if(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeHelpModal() {
  var modal = document.getElementById('helpModal');
  if(modal) {
    modal.classList.remove('active');
    if(!isWelcomePageVisible) {
      document.body.style.overflow = '';
    }
  }
}

function switchHelpTab(tab) {
  document.querySelectorAll('.help-tab-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  var simpleContent = document.getElementById('helpSimpleContent');
  var complexContent = document.getElementById('helpComplexContent');
  if(simpleContent) simpleContent.style.display = tab === 'simple' ? 'block' : 'none';
  if(complexContent) complexContent.style.display = tab === 'complex' ? 'block' : 'none';
}

// Browser back button support — return to welcome page
window.addEventListener('popstate', function(e) {
  // If we're in the app (not on welcome page), go back to welcome
  if(!isWelcomePageVisible) {
    showWelcomePage();
  }
});
