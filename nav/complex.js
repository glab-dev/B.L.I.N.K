// ==================== COMPLEX VIEW ACTIVATION ====================
// Shows the full complex mode: all config sections, layouts, and toggles.
// Called by switchMobileView() in the navigation dispatcher.

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
