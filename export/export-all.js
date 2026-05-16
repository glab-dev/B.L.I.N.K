// ==================== EXPORT ALL (ZIP) ====================
// Packages PDF, Canvas PNG/JPEG, Resolume XML, Gear List, Test Pattern
// (PNG + MP4 if initialized), and per-section hi-res PNG screenshots into
// a single ZIP file organized by folder.

function _exportAllScreenLabel(screenId) {
  var n = parseInt((screenId || '').split('_')[1], 10);
  return isNaN(n) ? screenId : ('Screen' + n);
}

function _captureHtmlElementBlobAsync(elementId, opts) {
  return new Promise(function(resolve) {
    try {
      captureHtmlElementBlob(elementId, function(blob) { resolve(blob); }, opts);
    } catch(e) { resolve(null); }
  });
}

// Sequentially captures all per-section screenshots and adds them to the zip.
// Runs as one task (not parallel) so screen-switching state is consistent.
async function _captureAllScreenshotsToZip(zip, name) {
  var allScreenIds = Object.keys(screens).sort(function(a, b) {
    return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
  });
  var originalScreenId = currentScreenId;

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
          if(r.jpegBlob) zip.file('canvas/' + base + '.jpg', r.jpegBlob);
        });
        resolve();
      });
    } catch(e) { resolve(); }
  });

  // 1. Per-screen layout PNGs [power/data/structure] — single render pass internally
  await new Promise(function(resolve) {
    try {
      captureLayoutScreenshotBlobs(function(results) {
        (results || []).forEach(function(r) {
          if(!r || !r.blob) return;
          zip.file(r.layout + '/' + name + '_' + _exportAllScreenLabel(r.screenId) + '_' + r.layout + '.png', r.blob);
        });
        resolve();
      });
    } catch(e) { resolve(); }
  });

  // 2. Per-screen structure-tables PNG [html2canvas] — sequential
  for(var i = 0; i < allScreenIds.length; i++) {
    var sid = allScreenIds[i];
    if(typeof switchToScreen === 'function') switchToScreen(sid);
    var stBlob = await _captureHtmlElementBlobAsync('structureInfoPanel', { backgroundColor: null });
    if(stBlob) zip.file('structure/' + name + '_' + _exportAllScreenLabel(sid) + '_structure_tables.png', stBlob);
  }
  if(typeof switchToScreen === 'function') switchToScreen(originalScreenId);

  // 3. Specs PNG [project-wide] — rasterized from the real PDF for pixel parity
  await new Promise(function(resolve) {
    try {
      getSpecsPdfPagePngBlobs(function(pages) {
        (pages || []).forEach(function(p, idx) {
          if(!p || !p.blob) return;
          var suffix = (pages.length > 1) ? ('_p' + (idx + 1)) : '';
          zip.file('specs/' + name + '_specs' + suffix + '.png', p.blob);
        });
        resolve();
      });
    } catch(e) { resolve(); }
  });

  // 4. Gear list PNG [project-wide] — rasterized from the real PDF for pixel parity
  await new Promise(function(resolve) {
    try {
      getGearListPdfPagePngBlobs(function(pages) {
        (pages || []).forEach(function(p, idx) {
          if(!p || !p.blob) return;
          var suffix = (pages.length > 1) ? ('_p' + (idx + 1)) : '';
          zip.file('gear/' + name + '_gear' + suffix + '.png', p.blob);
        });
        resolve();
      });
    } catch(e) { resolve(); }
  });

  // 5. Combined power/data/structure PNGs [multi-screen only]
  if(allScreenIds.length > 1) {
    await new Promise(function(resolve) {
      try {
        captureCombinedLayoutBlobs(function(results) {
          (results || []).forEach(function(r) {
            if(!r || !r.blob) return;
            zip.file('combined/' + name + '_combined_' + r.layout + '.png', r.blob);
          });
          resolve();
        });
      } catch(e) { resolve(); }
    });
  }
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
  var name = (inputName.trim() || 'BLINK_Export').replace(/[<>:"/\\|?*]/g, '_');
  var dateStr = new Date().toISOString().slice(0, 10);

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

    // Per-section screenshots run sequentially after parallel exports finish, so
    // screen-switching state stays consistent and doesn't fight the PDF capture.
    try {
      await _captureAllScreenshotsToZip(zip, name);
    } catch(e) {
      console.error('Export All screenshot capture error:', e);
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
    var el = document.getElementById('exportAllOverlay');
    if(el) el.remove();
  }
}
