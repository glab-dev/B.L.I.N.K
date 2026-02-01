// ==================== UPDATE CHECK ====================
// Checks version.json for newer versions and shows an update banner.
// Depends on: APP_VERSION (declared inline in index.html).

// Check for updates on app load
async function checkForUpdates() {
  try {
    // Fetch version.json with cache-busting
    const response = await fetch('version.json?_=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) {
      console.log('Version check: Could not fetch version.json');
      return;
    }

    const data = await response.json();
    const latestVersion = data.version;

    console.log('Version check: Current=' + APP_VERSION + ', Latest=' + latestVersion);

    if (latestVersion && latestVersion !== APP_VERSION) {
      showUpdateBanner(latestVersion);
    } else if (latestVersion === APP_VERSION) {
      // App is up to date - clear any dismissed version tracking
      localStorage.removeItem('dismissedUpdateVersion');
    }
  } catch (e) {
    console.log('Version check failed:', e.message);
  }
}

// Show update available banner
function showUpdateBanner(newVersion) {
  // Check if user already dismissed this specific version
  const dismissedVersion = localStorage.getItem('dismissedUpdateVersion');
  if (dismissedVersion === newVersion) {
    console.log('Version check: Update banner already dismissed for v' + newVersion);
    return;
  }

  const banner = document.getElementById('updateBanner');
  const versionText = document.getElementById('updateVersionText');
  if (banner && versionText) {
    versionText.textContent = 'v' + newVersion + ' available';
    banner.classList.add('visible');
    // Store the version being shown so we can track dismissal
    banner.dataset.version = newVersion;

    // Also highlight the refresh button in the menu
    const refreshBtn = document.querySelector('.mobile-menu-refresh');
    if (refreshBtn) {
      refreshBtn.classList.add('update-available');
    }
  }
}

// Hide update banner
function hideUpdateBanner() {
  const banner = document.getElementById('updateBanner');
  if (banner) {
    // Remember that user dismissed this version
    if (banner.dataset.version) {
      localStorage.setItem('dismissedUpdateVersion', banner.dataset.version);
      console.log('Update banner dismissed for v' + banner.dataset.version);
    }
    banner.classList.remove('visible');
  }
}
