// Per-view quick PDF export.
//
// Every layout/specs/gear view carries a small export button in the top-right of
// its container box. Tapping it produces a single-page PDF of just that view,
// for the screen you are currently on, through the same pdfmake pipeline the
// full report uses — so the page you get is the page the full report would have
// contained.
//
// The section mask is the mechanism: buildComplexPdf() gates every existing
// section on `opts.X !== false`, so setting everything false except one leaves
// exactly that section. Combined views use opt-in flags gated on `=== true`.

// view -> { mask, label }. `mask` is merged over an all-false base.
const VIEW_EXPORT_SPECS = {
  specs:      { mask: { specs: true },     label: 'Specs' },
  standard:   { mask: { standard: true },  label: 'Standard_Layout' },
  power:      { mask: { power: true },     label: 'Power_Layout' },
  data:       { mask: { data: true },      label: 'Data_Layout' },
  structure:  { mask: { structure: true }, label: 'Structure_Layout' },
  cabling:    { mask: { cabling: true },   label: 'Cabling_Layout' },
  // A screen's own gear list — no PROCESSORS / SIGNAL CABLES / UTILITY / SPARES,
  // which cover the whole rig rather than this one screen.
  gearList:   { mask: { gearList: true, gearShared: false }, label: 'Gear_List' },

  // Combined views span the whole selection, so they are not screen-scoped.
  combinedStandard:  { combined: true, mask: { combinedStandard: true },  label: 'Combined_Standard_Layout' },
  combinedPower:     { combined: true, mask: { combinedPower: true },     label: 'Combined_Power_Layout' },
  combinedData:      { combined: true, mask: { combinedData: true },      label: 'Combined_Data_Layout' },
  combinedStructure: { combined: true, mask: { combinedStructure: true }, label: 'Combined_Structure_Layout' },
  combinedCabling:   { combined: true, mask: { combinedCabling: true },   label: 'Combined_Cabling_Layout' },

  // The project summary page IS the combined specs page — it aggregates power,
  // weight and panel counts across screens and carries the arrangement diagram.
  combinedSpecs:     { combined: true, mask: { combined: true, summary: true }, label: 'Combined_Specs' },
  // Likewise the gear section already spans every screen in the list, with a
  // shared system column — that is the combined gear list.
  combinedGearList:  { combined: true, mask: { gearList: true }, label: 'Combined_Gear_List' }
};

function _viewExportBaseMask() {
  return {
    specs: false, gearList: false, standard: false, power: false,
    data: false, structure: false, cabling: false, combined: false,
    ecoFriendly: false, greyscale: false
  };
}

// The screens a combined export covers. Mirrors the fallback in
// pdfCaptureCombinedCanvases(): fewer than two selected means "all of them".
function _viewExportCombinedScreenIds() {
  const all = Object.keys(screens).sort(function(a, b) {
    return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
  });
  if (typeof combinedSelectedScreens === 'undefined' || combinedSelectedScreens.size < 2) return all;
  return all.filter(function(id) { return combinedSelectedScreens.has(id); });
}

function _viewExportFilename(view, spec, screenId) {
  const parts = [];
  const cfg = document.getElementById('configName')?.value?.trim();
  parts.push(cfg || 'LED_Wall');
  if (!spec.combined && typeof _exportAllScreenLabel === 'function') {
    parts.push(_exportAllScreenLabel(screenId || currentScreenId));
  }
  parts.push(spec.label);
  parts.push(new Date().toISOString().slice(0, 10));
  return parts.join('_').replace(/\s+/g, '_').replace(/[<>:"/\\|?*]/g, '_') + '.pdf';
}

function _viewExportShowOverlay(text) {
  const overlay = document.createElement('div');
  overlay.id = 'pdfExportOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(26,26,26,1);z-index:10000;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;font-family:-apple-system,Arial,sans-serif;';
  overlay.innerHTML = '<div style="font-size:24px;margin-bottom:20px;">Generating PDF...</div><div style="font-size:16px;color:#888;">' + text + '</div>';
  document.body.appendChild(overlay);
}

function _viewExportRemoveOverlay() {
  const el = document.getElementById('pdfExportOverlay');
  if (el) el.remove();
}

// Entry point for every per-view export button.
// screenIdOverride names the screen to export when the button lives inside a
// specific screen's box. The gear tab tracks its own active screen (gearActiveScreenId)
// separately from currentScreenId, so without it a gear list button can export a
// different screen than the one it sits in.
async function exportViewPdf(view, screenIdOverride) {
  const spec = VIEW_EXPORT_SPECS[view];
  if (!spec) { console.error('exportViewPdf: unknown view', view); return; }

  const screenId = (screenIdOverride && screens[screenIdOverride]) ? screenIdOverride : currentScreenId;

  if (!window.pdfMake || typeof _getSectionOnlyPdfBlob !== 'function') {
    showAlert('PDF export is still loading. Please try again in a moment.');
    return;
  }

  const opts = _viewExportBaseMask();
  Object.keys(spec.mask).forEach(function(k) { opts[k] = spec.mask[k]; });

  if (spec.combined) {
    const sids = _viewExportCombinedScreenIds();
    if (sids.length < 2) {
      showAlert('Combined views need at least two screens.', 'Nothing to export');
      return;
    }
    opts.screenIds = sids;
    // Only the combined specs page wants the project summary; the rest are one
    // page of their own.
    if (opts.summary !== true) opts.summary = false;
  } else {
    opts.screenIds = [screenId];
  }

  const fileName = _viewExportFilename(view, spec, screenId);

  // Capturing the layouts and building the document outlast the click's
  // transient user activation, so choose the destination before that starts.
  const target = await pickSaveTarget(fileName, {
    mimeType: 'application/pdf',
    description: 'PDF Document',
    accept: { 'application/pdf': ['.pdf'] }
  });
  if (!target) return;

  _viewExportShowOverlay(spec.label.replace(/_/g, ' '));

  // Let the overlay paint before the synchronous capture work starts.
  setTimeout(function() {
    try {
      _getSectionOnlyPdfBlob(opts, function(blob) {
        _viewExportRemoveOverlay();
        if (!blob) {
          showAlert('Could not build the PDF for this view. Please try again.');
          return;
        }
        writeSaveTarget(target, blob, fileName, 'application/pdf');
      });
    } catch (e) {
      _viewExportRemoveOverlay();
      console.error('exportViewPdf error:', e);
      showAlert('Could not build the PDF for this view. Please try again.');
    }
  }, 50);
}
