// ==================== SIMPLE VIEW ACTIVATION ====================
// Shows the simplified mode: config + specs only, no layouts or structure.
// Called by switchMobileView() in the navigation dispatcher.

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
