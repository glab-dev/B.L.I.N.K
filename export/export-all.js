// ==================== EXPORT ALL (ZIP) ====================
// Packages PDF, Canvas PNG/JPEG, Resolume XML, Gear List, and Test Pattern
// (PNG + MP4 if initialized) into a single ZIP file.

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

    // PDF (always full/complex version)
    tasks.push(new Promise(function(resolve) {
      try {
        getPdfBlobForExportAll(function(blob) {
          if(blob) zip.file(name + '.pdf', blob);
          resolve();
        });
      } catch(e) { resolve(); }
    }));

    // Canvas PNG + JPEG
    tasks.push(new Promise(function(resolve) {
      try {
        getCanvasExportBlobs(function(pngBlob, jpegBlob, sizeLabel) {
          if(pngBlob && sizeLabel) zip.file(name + '_canvas_' + sizeLabel + '.png', pngBlob);
          if(jpegBlob && sizeLabel) zip.file(name + '_canvas_' + sizeLabel + '.jpg', jpegBlob);
          resolve();
        });
      } catch(e) { resolve(); }
    }));

    // Resolume XML (sync)
    try {
      var xmlBlob = getResolumeXmlBlob();
      if(xmlBlob) zip.file(name + '_resolume.xml', xmlBlob);
    } catch(e) {}

    // Gear list .txt (plain-text email format — same as Send to Jared)
    try {
      var screenIds = Object.keys(screens).sort(function(a, b) {
        return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
      });
      var gearData = buildGearListData(screenIds);
      var gearContent = buildGearListText(gearData);
      if(gearContent) zip.file(name + '_gear.txt', new Blob([gearContent], { type: 'text/plain' }));
    } catch(e) {}

    // Test pattern PNG + MP4 (only if test pattern has been initialized)
    if(typeof _tpInitialized !== 'undefined' && _tpInitialized) {
      var tpCanvas = document.getElementById('tpCanvas');
      var tpW = tpCanvas ? tpCanvas.width : 0;
      var tpH = tpCanvas ? tpCanvas.height : 0;
      var tpDims = tpW + 'x' + tpH;

      tasks.push(new Promise(function(resolve) {
        try {
          getTestPatternPngBlob(function(blob) {
            if(blob) zip.file(name + '_TP_' + tpDims + '.png', blob);
            resolve();
          });
        } catch(e) { resolve(); }
      }));

      tasks.push(new Promise(function(resolve) {
        try {
          getTestPatternMp4Blob(function(blob) {
            if(blob) zip.file(name + '_TP_' + tpDims + '.mp4', blob);
            resolve();
          });
        } catch(e) { resolve(); }
      }));
    }

    await Promise.all(tasks);

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
