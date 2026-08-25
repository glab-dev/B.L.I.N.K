// ==================== EXPORT ALL (ZIP) ====================
// Packages PDF, Canvas PNG/JPEG, Resolume XML, Gear List, Test Pattern
// (PNG + MP4 if initialized), and one PDF page per screen per layout view into
// a single ZIP file organized by folder.

// Filename label for a screen — the user's screen name, sanitized for the ZIP.
// Falls back to Screen{N} when the screen has no name. Screen names are editable
// and can collide, so a duplicated name gets the screen number appended (JSZip
// would otherwise silently overwrite the first file).
function _exportAllScreenLabel(screenId) {
  var n = parseInt((screenId || '').split('_')[1], 10);
  var fallback = isNaN(n) ? screenId : ('Screen' + n);
  var screen = (typeof screens !== 'undefined') ? screens[screenId] : null;
  var raw = (screen && typeof screen.name === 'string') ? screen.name.trim() : '';
  var label = (raw ? raw : fallback).replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');

  if(raw && typeof screens !== 'undefined') {
    var collides = Object.keys(screens).some(function(sid) {
      if(sid === screenId) return false;
      var other = screens[sid];
      var otherRaw = (other && typeof other.name === 'string') ? other.name.trim() : '';
      if(!otherRaw) return false;
      return otherRaw.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_') === label;
    });
    if(collides && !isNaN(n)) label += '_S' + n;
  }
  return label;
}

// Yields a macrotask between heavy capture phases so the browser can run GC and
// reclaim the canvases/blobs from the previous step before the next allocates —
// reduces peak memory and helps Export All survive on mobile.
function _yieldToBrowser(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms || 60); });
}

// Sequentially captures all per-section screenshots and adds them to the zip.
// Runs as one task (not parallel) so screen-switching state is consistent.
async function _captureAllScreenshotsToZip(zip, name) {
  // 0. Per-canvas-tab PNG/JPEG → canvas/
  await new Promise(function(resolve) {
    try {
      getAllCanvasesExportBlobs(function(results) {
        (results || []).forEach(function(r) {
          if(!r) return;
          var safeName = (r.name || r.canvasId || 'canvas').replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
          var label = r.sizeLabel || '';
          var base = name + '_' + safeName + (label ? ('_' + label) : '');
          if(r.pngBlob)  zip.file('canvas/' + base + '.png', r.pngBlob);
        });
        resolve();
      });
    } catch(e) { resolve(); }
  });
  await _yieldToBrowser();

  // 0a. Per-canvas-tab header/footer band composite → title block/ (only tabs with the band enabled)
  if(typeof getTitleBlockBlobsForCanvases === 'function') {
    await new Promise(function(resolve) {
      try {
        getTitleBlockBlobsForCanvases(function(results) {
          (results || []).forEach(function(r) {
            if(!r || !r.blob) return;
            var safeName = (r.name || r.canvasId || 'canvas').replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
            zip.file('title block/' + name + '_' + safeName + '_titleblock.png', r.blob);
          });
          resolve();
        });
      } catch(e) { resolve(); }
    });
    await _yieldToBrowser();
  }

  // 0b. Per-screen native-resolution PNGs → screens/ (each screen as drawn in the canvas view, at its exact pixel resolution)
  await new Promise(function(resolve) {
    try {
      getScreenNativeResBlobs(function(results) {
        (results || []).forEach(function(r) {
          if(!r || !r.blob) return;
          var safeName = (r.name || r.screenId || 'screen').replace(/[<>:"/\\|?*]/g, '_');
          zip.file('screens/' + safeName + '_' + r.w + 'x' + r.h + '.png', r.blob);
        });
        resolve();
      });
    } catch(e) { resolve(); }
  });
  await _yieldToBrowser();

  await _addSectionPdfsToZip(zip, name);
}

// Build one section-masked PDF blob from an already-captured canvas cache.
// The mask is merged over the same all-false base the per-view export buttons
// use, so a ZIP page and the matching quick-export page are the same page.
function _sectionPdfBlob(mask, screenIds, cache) {
  return new Promise(function(resolve) {
    try {
      var opts = (typeof _viewExportBaseMask === 'function') ? _viewExportBaseMask() : {
        specs: false, gearList: false, standard: false, power: false, data: false,
        structure: false, cabling: false, combined: false, ecoFriendly: false, greyscale: false
      };
      Object.keys(mask).forEach(function(k) { opts[k] = mask[k]; });
      opts.screenIds = screenIds;
      opts.summary = false;   // no cover page in front of a single-view file
      _buildSectionPdfFromCache(opts, cache, function(blob) { resolve(blob); });
    } catch(e) { resolve(null); }
  });
}

// Per-screen and combined layout pages, as PDFs rather than PNGs. Every file is
// the page the full report would have contained for that view — same pdfmake
// pipeline, same tables under the image (SOCA on power, line map on data,
// structure info on structure).
//
// Two capture passes fill the whole project's image cache — data line labels on,
// then off — and every per-screen PDF is built from those, so the expensive
// screen-switching render runs twice for the project instead of once per file.
async function _addSectionPdfsToZip(zip, name) {
  var screenIds = Object.keys(screens).sort(function(a, b) {
    return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
  });
  if(screenIds.length === 0) return;

  if(typeof saveCurrentScreenData === 'function') saveCurrentScreenData();
  if(typeof ecoPrintMode !== 'undefined') ecoPrintMode = false;
  if(typeof greyscalePrintMode !== 'undefined') greyscalePrintMode = false;

  // Pass A — power / structure / cabling, plus the data canvas with its labels on.
  var cache = pdfCaptureCanvases({
    canvasIds: ['powerCanvas', 'dataCanvas', 'structureCanvas', 'cableDiagramCanvas'],
    dataLabels: 'on'
  });

  var sections = [
    { mask: { specs: true },     folder: 'specs',     suffix: 'specs' },
    { mask: { power: true },     folder: 'power',     suffix: 'power' },
    { mask: { data: true },      folder: 'data',      suffix: 'data_labeled' },
    { mask: { structure: true }, folder: 'structure', suffix: 'structure' },
    { mask: { cabling: true },   folder: 'cable',     suffix: 'cable' }
  ];
  for(var si = 0; si < screenIds.length; si++) {
    var label = _exportAllScreenLabel(screenIds[si]);
    for(var ci = 0; ci < sections.length; ci++) {
      var sec = sections[ci];
      var blob = await _sectionPdfBlob(sec.mask, [screenIds[si]], cache);
      if(blob) zip.file(sec.folder + '/' + name + '_' + label + '_' + sec.suffix + '.pdf', blob);
    }
    await _yieldToBrowser();
  }

  // Gear list — project-wide, one PDF, the page the report ends with.
  var gearBlob = await _sectionPdfBlob({ gearList: true }, screenIds, {});
  if(gearBlob) zip.file('gear/' + name + '_gear.pdf', gearBlob);
  cache = null;
  await _yieldToBrowser();

  // Pass B — the data canvas again with the line labels off (arrows only).
  var noLabelCache = pdfCaptureCanvases({ canvasIds: ['dataCanvas'], dataLabels: 'off' });
  for(var sj = 0; sj < screenIds.length; sj++) {
    var dBlob = await _sectionPdfBlob({ data: true }, [screenIds[sj]], noLabelCache);
    if(dBlob) zip.file('data/' + name + '_' + _exportAllScreenLabel(screenIds[sj]) + '_data_nolabels.pdf', dBlob);
    await _yieldToBrowser();
  }
  noLabelCache = null;

  // Combined views — one capture of the combined canvases, one PDF per view from
  // it. The label split is per-screen only, so the combined data page keeps
  // whatever label state the user left the view in.
  if(screenIds.length > 1 && typeof pdfCaptureCombinedCanvases === 'function') {
    var combinedIds = (typeof _viewExportCombinedScreenIds === 'function')
      ? _viewExportCombinedScreenIds() : screenIds;
    var combinedCache = await new Promise(function(resolve) {
      try { pdfCaptureCombinedCanvases(function(c) { resolve(c || {}); }); }
      catch(e) { resolve({}); }
    });
    var combinedSecs = [
      { mask: { combinedStandard: true },  suffix: 'standard' },
      { mask: { combinedPower: true },     suffix: 'power' },
      { mask: { combinedData: true },      suffix: 'data' },
      { mask: { combinedStructure: true }, suffix: 'structure' },
      { mask: { combinedCabling: true },   suffix: 'cable' }
    ];
    for(var k = 0; k < combinedSecs.length; k++) {
      var cBlob = await _sectionPdfBlob(combinedSecs[k].mask, combinedIds, combinedCache);
      if(cBlob) zip.file('combined/' + name + '_combined_' + combinedSecs[k].suffix + '.pdf', cBlob);
      await _yieldToBrowser();
    }
  }

  // Put the on-screen layouts back the way the capture passes found them.
  try { if(typeof generateLayout === 'function') { generateLayout('standard'); generateLayout('power'); generateLayout('data'); } } catch(e) {}
  try { if(typeof generateStructureLayout === 'function') generateStructureLayout(); } catch(e) {}
}

async function exportAll() {
  if(typeof JSZip === 'undefined') {
    showAlert('ZIP library not loaded. Please refresh the page.');
    return;
  }

  // Prompt user for the export name — defaults to current config name
  var defaultName = ((document.getElementById('configName') || {}).value || '').trim() || 'BLINK_Export';
  var inputName = await showPrompt('Name your export files:', defaultName, 'Export All');
  if(inputName === null) return; // user cancelled
  var displayName = inputName.trim() || 'BLINK_Export';
  var name = displayName.replace(/[<>:"/\\|?*]/g, '_');
  var dateStr = new Date().toISOString().slice(0, 10);

  // Apply the typed name to the project-name field so it labels the PDF headers,
  // specs/gear pages, and gear text. Restored in the finally block below.
  var cfgEl = document.getElementById('configName');
  var prevCfgName = cfgEl ? cfgEl.value : null;
  if(cfgEl) cfgEl.value = displayName;

  var overlay = document.createElement('div');
  overlay.id = 'exportAllOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:Roboto Condensed,sans-serif;font-size:18px;gap:12px;';
  overlay.innerHTML = '<div>Building export package\u2026</div>';
  document.body.appendChild(overlay);

  try {
    var zip = new JSZip();
    var tasks = [];

    // PDF (always full/complex version) — stays at ZIP root, plus page 1 (cover
    // / project summary) rendered as {name}_preliminary.png alongside it.
    tasks.push(new Promise(function(resolve) {
      try {
        getPdfBlobForExportAll(function(blob) {
          if(!blob) { resolve(); return; }
          zip.file(name + '.pdf', blob);
          try {
            renderPdfBlobToPngBlobs(blob, { scale: 2, startPage: 1, endPage: 1 }, function(pages) {
              if(pages && pages[0] && pages[0].blob) {
                zip.file(name + '_preliminary.png', pages[0].blob);
              }
              resolve();
            });
          } catch(e) { resolve(); }
        });
      } catch(e) { resolve(); }
    }));

    // Canvas PNG + JPEG (every canvas tab) → canvas/
    // Runs in the sequential phase below to avoid racing with the PDF capture's
    // screen-visibility mutations.

    // Resolume XML → resolume/
    try {
      var xmlBlob = getResolumeXmlBlob();
      if(xmlBlob) zip.file('resolume/' + name + '_resolume.xml', xmlBlob);
    } catch(e) {}

    // Gear list .txt → gear/ (plain-text email format — same as Send to Jared)
    try {
      var screenIds = Object.keys(screens).sort(function(a, b) {
        return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
      });
      var gearData = buildGearListData(screenIds);
      var gearContent = buildGearListText(gearData);
      if(gearContent) zip.file('gear/' + name + '_gear.txt', new Blob([gearContent], { type: 'text/plain' }));
    } catch(e) {}

    // Test pattern PNG + MP4 → test pattern/ (only if test pattern has been initialized)
    if(typeof _tpInitialized !== 'undefined' && _tpInitialized) {
      var tpCanvas = document.getElementById('tpCanvas');
      var tpW = tpCanvas ? tpCanvas.width : 0;
      var tpH = tpCanvas ? tpCanvas.height : 0;
      var tpDims = tpW + 'x' + tpH;

      tasks.push(new Promise(function(resolve) {
        try {
          getTestPatternPngBlob(function(blob) {
            if(blob) zip.file('test pattern/' + name + '_TP_' + tpDims + '.png', blob);
            resolve();
          });
        } catch(e) { resolve(); }
      }));

      tasks.push(new Promise(function(resolve) {
        try {
          getTestPatternMp4Blob(function(blob) {
            if(blob) zip.file('test pattern/' + name + '_TP_' + tpDims + '.mp4', blob);
            resolve();
          });
        } catch(e) { resolve(); }
      }));
    }

    await Promise.all(tasks);

    // Per-section captures run sequentially after the parallel exports finish, so
    // screen-switching state stays consistent and doesn't fight the PDF capture.
    try {
      await _captureAllScreenshotsToZip(zip, name);
    } catch(e) {
      console.error('Export All section capture error:', e);
    }

    var zipBlob = await zip.generateAsync({ type: 'blob' });
    var url = URL.createObjectURL(zipBlob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name + '_' + dateStr + '.zip';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

  } catch(err) {
    showAlert('Export failed: ' + err.message);
    console.error('Export All error:', err);
  } finally {
    if(cfgEl) cfgEl.value = prevCfgName;
    var el = document.getElementById('exportAllOverlay');
    if(el) el.remove();
  }
}
