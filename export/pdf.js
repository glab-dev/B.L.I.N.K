// ==================== PDF EXPORT ====================
// PDF export modal, gear list email, multi-screen PDF generation.

var pdfLayoutCaptureMode = false; // Set true during pdfCaptureCanvases to raise canvas resolution cap
var _emailSendParams = null;

// PDF Export Options Modal Functions
let pdfExportOptions = {
  specs: true,
  gearList: true,
  standard: true,
  power: true,
  data: true,
  structure: true,
  cabling: true
};

function openPdfExportModal() {
  const modal = document.getElementById('pdfExportModal');
  if (modal) {
    // Always reset all checkboxes to ON by default
    document.getElementById('pdfExportSpecs').checked = true;
    document.getElementById('pdfExportGearList').checked = true;
    document.getElementById('pdfExportStandard').checked = true;
    document.getElementById('pdfExportPower').checked = true;
    document.getElementById('pdfExportData').checked = true;
    document.getElementById('pdfExportStructure').checked = true;
    // Eco Friendly and Greyscale default to OFF
    document.getElementById('pdfExportEcoFriendly').checked = false;
    document.getElementById('pdfExportGreyscale').checked = false;
    modal.classList.add('active');
  }
}

function closePdfExportModal() {
  const modal = document.getElementById('pdfExportModal');
  if (modal) {
    modal.classList.remove('active');
  }
  reopenMenuIfNeeded();
}


// ==================== SEND TO JARED MODAL ====================

function openSendToJaredModal() {
  document.getElementById('sendToJaredModal').classList.add('active');
}

function closeSendToJaredModal() {
  document.getElementById('sendToJaredModal').classList.remove('active');
  reopenMenuIfNeeded();
}

// ==================== EMAIL SEND CHOICE MODAL ====================

function openEmailSendModal(params) {
  _emailSendParams = params;
  var titleEl = document.getElementById('emailSendModalTitle');
  if(titleEl) titleEl.textContent = params.title || 'Send Email';
  document.getElementById('emailSendModal').classList.add('active');
}

function closeEmailSendModal() {
  document.getElementById('emailSendModal').classList.remove('active');
  _emailSendParams = null;
}

function confirmEmailSendMailApp() {
  if(!_emailSendParams) return;
  var p = _emailSendParams;
  var subject = encodeURIComponent(p.subject || '');
  var body = encodeURIComponent(p.body || '');
  var mailtoUrl = 'mailto:' + (p.to || '') + '?subject=' + subject + '&body=' + body;
  if(mailtoUrl.length > 16000) {
    var truncNote = '\n\n(Gear list truncated due to email length limits - see full list in app)';
    var maxBodyLen = 14000 - subject.length;
    mailtoUrl = 'mailto:' + (p.to || '') + '?subject=' + subject +
                '&body=' + encodeURIComponent((p.body || '').substring(0, maxBodyLen) + truncNote);
  }
  closeEmailSendModal();
  openMailtoLink(mailtoUrl);
  _downloadRpFile(p);
}

function confirmEmailSendGmail() {
  if(!_emailSendParams) return;
  var p = _emailSendParams;
  var to = encodeURIComponent(p.to || '');
  var su = encodeURIComponent(p.subject || '');
  var body = encodeURIComponent(p.body || '');
  var gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + to + '&su=' + su + '&body=' + body;
  closeEmailSendModal();
  window.open(gmailUrl, '_blank');
  _downloadRpFile(p);
}

function _downloadRpFile(p) {
  if(!p || !p.inventoryContent) return;
  var blob = new Blob([p.inventoryContent], { type: 'text/plain' });
  var url = URL.createObjectURL(blob);
  var dl = document.createElement('a');
  dl.href = url;
  dl.download = p.fileName || 'inventory.txt';
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
  URL.revokeObjectURL(url);
}

function confirmSendToJared() {
  var includeRP = document.getElementById('sendToJaredIncludeRP').checked;
  closeSendToJaredModal();
  sendGearListToJared(includeRP);
}

// Send Gear List Email
// Builds the plain-text gear list used in emails (for Export All .txt file).
function buildGearListText(gearData) {
  var nl = '\n';
  var line = function(label, value) {
    if(value === 0 || value === '' || value === null || value === undefined || value === '0') return '';
    if(typeof value === 'number') {
      var cleanLabel = label.replace(/:$/, '').trim();
      return ' - ' + value + ' x ' + cleanLabel + nl;
    }
    return ' - ' + label + ' ' + value + nl;
  };
  var hdr = function(title) { return nl + title.toUpperCase() + nl + '-'.repeat(title.length) + nl; };

  var text = 'LED GEAR LIST' + nl;
  text += 'Project: ' + gearData.configName + nl;
  text += '======================================' + nl;

  gearData.screens.forEach(function(sd) {
    var eq = sd.equipment;
    var rig = sd.rigging;
    var gs = sd.groundSupport;
    var fh = sd.floorHardware;
    var dc = sd.dataCables;
    var pc = sd.powerCables;
    var p2d = sd.processorToDistBox;

    text += nl + nl;
    text += sd.screenName.toUpperCase() + nl;
    text += '======================================' + nl;

    text += hdr('Equipment');
    if(eq.isFirstScreenInGroup && eq.processorCount > 0) {
      text += ' - Processor:' + nl;
      text += '     ' + eq.processorCount + ' x ' + eq.processorName + nl;
      if(eq.distBoxCount > 0) text += '     ' + eq.distBoxCount + ' x ' + eq.distBoxName + nl;
    } else if(eq.referencesScreenName) {
      text += ' - Processor: See ' + eq.referencesScreenName + nl;
    }
    text += ' - Panels:' + nl;
    text += '     ' + eq.activeFullPanels + ' x ' + eq.panelBrand + ' ' + eq.panelName + nl;
    if(eq.activeHalfPanels > 0) text += '     ' + eq.activeHalfPanels + ' x ' + eq.panelBrand + ' ' + eq.halfPanelName + nl;

    if(rig.hasRigging) {
      text += hdr('Rigging Hardware');
      text += line('1W Bumpers:', rig.bumper1w);
      text += line('2W Bumpers:', rig.bumper2w);
      text += line('4W Bumpers:', rig.bumper4w);
      text += line('4W Connecting Plates:', rig.plates4way);
      text += line('2W Connecting Plates:', rig.plates2way);
      text += line('5/8" Shackles:', rig.shackles);
      text += line('Cheeseye:', rig.cheeseye);
    }

    if(gs.hasGS) {
      text += hdr('Ground Support');
      text += line('Rear Truss:', gs.rearTruss);
      text += line('Base Truss:', gs.baseTruss);
      text += line('Bridge Clamps:', gs.bridgeClamps);
      text += line('Rear Bridge Adapter:', gs.rearBridgeAdapters);
      text += line('Sandbags:', gs.sandbags);
      text += line('Swivel Cheeseborough:', gs.swivelCheeseboroughs);
      if(gs.pipes > 0) text += line('Pipe' + gs.pipeLengthStr + ':', gs.pipes);
    }

    if(fh.hasFloorFrames) {
      text += hdr('Floor Hardware');
      if(fh.frame3x2 > 0) text += line('3x2 Frame:', fh.frame3x2);
      if(fh.frame2x2 > 0) text += line('2x2 Frame:', fh.frame2x2);
      if(fh.frame2x1 > 0) text += line('2x1 Frame:', fh.frame2x1);
      if(fh.frame1x1 > 0) text += line('1x1 Frame:', fh.frame1x1);
    }

    text += hdr('Data Cables');
    if(dc.jumperCount > 0) text += line('Jumpers ' + dc.dataJumperLen + "':", dc.jumperCount);
    if(dc.crossJumperLen && dc.crossJumperCount > 0) text += line('Cross Jumpers ' + dc.crossJumperLen + "':", dc.crossJumperCount);
    if(dc.jumpersBuiltin && dc.cat5CouplerCount > 0) text += line('Cat5 Couplers:', dc.cat5CouplerCount);
    var cat6Lengths = Object.entries(dc.cat6ByLength).sort(function(a, b) { return a[0] - b[0]; });
    for(var ci = 0; ci < cat6Lengths.length; ci++) {
      text += ' - ' + cat6Lengths[ci][1] + " x " + cat6Lengths[ci][0] + "' Cat6" + nl;
    }

    text += hdr('Power Cables');
    if(pc.jumperCount > 0) text += line('Jumpers ' + pc.powerJumperLen + "':", pc.jumperCount);
    text += line('Soca Splays:', pc.socaSplays);
    var socaLengths = Object.entries(pc.socaByLength).sort(function(a, b) { return a[0] - b[0]; });
    for(var si = 0; si < socaLengths.length; si++) {
      text += ' - ' + socaLengths[si][1] + " x " + socaLengths[si][0] + "' Soca" + nl;
    }
    text += line("25' True1:", pc.true1_25);
    text += line("10' True1:", pc.true1_10);
    text += line("5' True1:", pc.true1_5);
    text += line('True1 Twofer:', pc.true1Twofer);

    if(p2d.count > 0) {
      text += hdr('Processor to Dist Box');
      text += ' - ' + p2d.count + 'x ' + p2d.cableType + ' ' + p2d.cableLength + "'" + nl;
    }
  });

  var sig = gearData.signalCables;
  if(sig) {
    text += nl + nl;
    text += 'SIGNAL CABLES' + nl;
    text += '======================================' + nl;
    var sdiLengths = Object.keys(sig.sdiByLength).map(Number).sort(function(a, b) { return b - a; });
    for(var li = 0; li < sdiLengths.length; li++) {
      if(sig.sdiByLength[sdiLengths[li]] > 0) text += line(sdiLengths[li] + "' " + sig.sdiType + ':', sig.sdiByLength[sdiLengths[li]]);
    }
    if(sig.serverFiberLine) text += line(sig.serverFiberLine.label + ':', sig.serverFiberLine.count);
    text += line("25' HDMI:", sig.hdmi[25]);
    text += line("10' HDMI:", sig.hdmi[10]);
    text += line("6' HDMI:", sig.hdmi[6]);
  }

  var util = gearData.utility;
  if(util) {
    text += hdr('Utility');
    text += line("UG 10':", util.ug10);
    text += line("UG 25':", util.ug25);
    text += line("UG 50':", util.ug50);
    text += line('UG Twofers:', util.ugTwofers);
    text += line('Power Bars:', util.powerBars);
  }

  var sp = gearData.spares;
  if(sp) {
    text += nl + nl;
    text += 'SPARES' + nl;
    text += '======================================' + nl;
    var panelEntries = Object.entries(sp.panelsByType || {});
    for(var pi = 0; pi < panelEntries.length; pi++) {
      text += line(panelEntries[pi][0] + ':', panelEntries[pi][1]);
    }
    text += nl;
    if(sp.shackles) text += line('Shackles:', sp.shackles);
    if(sp.cheeseyes) text += line('Cheeseyes:', sp.cheeseyes);
    text += nl;
    if(sp.crossJumpers) text += line('Cross Jumpers ' + sp.crossJumperLen + "':", sp.crossJumpers);
    if(sp.cat5Couplers) text += line('Cat5 Couplers:', sp.cat5Couplers);
    if(sp.cat6ByLength) {
      var cat6Spare = Object.entries(sp.cat6ByLength).sort(function(a, b) { return Number(b[0]) - Number(a[0]); });
      for(var ki = 0; ki < cat6Spare.length; ki++) {
        if(cat6Spare[ki][1] > 0) text += line(cat6Spare[ki][0] + "' Cat6:", cat6Spare[ki][1]);
      }
    }
    text += nl;
    if(sp.socaSplays) text += line('Soca Splays:', sp.socaSplays);
    if(sp.true1_25) text += line("25' True1:", sp.true1_25);
    if(sp.true1_10) text += line("10' True1:", sp.true1_10);
    if(sp.true1_5) text += line("5' True1:", sp.true1_5);
    if(sp.true1Twofer) text += line('True1 Twofer:', sp.true1Twofer);
  }

  return text;
}

function sendGearListToJared(includeRP) {
  generateGearList();

  const screenIds = Object.keys(screens);
  if(screenIds.length === 0) {
    showAlert('No screens to send. Please add at least one screen.');
    return;
  }

  // Build gear data from shared module
  const gearData = buildGearListData(screenIds);

  const nl = '\n';
  const line = (label, value) => {
    if(value === 0 || value === '' || value === null || value === undefined || value === '0') return '';
    // If value is a number, format as "countx label" — otherwise keep as "label value" for pre-formatted strings
    if(typeof value === 'number') {
      const cleanLabel = label.replace(/:$/, '').trim(); // Remove trailing colon
      return ` - ${value} x ${cleanLabel}${nl}`;
    }
    return ` - ${label} ${value}${nl}`;
  };
  const hdr = (title) => `${nl}${title.toUpperCase()}${nl}${'-'.repeat(title.length)}${nl}`;

  let text = `LED GEAR LIST${nl}`;
  text += `Project: ${gearData.configName}${nl}`;
  text += `======================================${nl}`;

  gearData.screens.forEach(sd => {
    const eq = sd.equipment;
    const rig = sd.rigging;
    const gs = sd.groundSupport;
    const fh = sd.floorHardware;
    const dc = sd.dataCables;
    const pc = sd.powerCables;
    const p2d = sd.processorToDistBox;

    // Screen header
    text += `${nl}${nl}`;
    text += `${sd.screenName.toUpperCase()}${nl}`;
    text += `======================================${nl}`;

    // Equipment
    text += hdr('Equipment');
    if(eq.isFirstScreenInGroup && eq.processorCount > 0) {
      text += ` - Processor:${nl}`;
      text += `     ${eq.processorCount} x ${eq.processorName}${nl}`;
      if(eq.distBoxCount > 0) text += `     ${eq.distBoxCount} x ${eq.distBoxName}${nl}`;
    } else if(eq.referencesScreenName) {
      text += ` - Processor: See ${eq.referencesScreenName}${nl}`;
    }
    text += ` - Panels:${nl}`;
    text += `     ${eq.activeFullPanels} x ${eq.panelBrand} ${eq.panelName}${nl}`;
    if(eq.activeHalfPanels > 0) text += `     ${eq.activeHalfPanels} x ${eq.panelBrand} ${eq.halfPanelName}${nl}`;

    // Rigging Hardware
    if(rig.hasRigging) {
      text += hdr('Rigging Hardware');
      text += line('1W Bumpers:', rig.bumper1w);
      text += line('2W Bumpers:', rig.bumper2w);
      text += line('4W Bumpers:', rig.bumper4w);
      text += line('4W Connecting Plates:', rig.plates4way);
      text += line('2W Connecting Plates:', rig.plates2way);
      text += line('5/8" Shackles:', rig.shackles);
      text += line('Cheeseye:', rig.cheeseye);
    }

    // Ground Support
    if(gs.hasGS) {
      text += hdr('Ground Support');
      text += line('Rear Truss:', gs.rearTruss);
      text += line('Base Truss:', gs.baseTruss);
      text += line('Bridge Clamps:', gs.bridgeClamps);
      text += line('Rear Bridge Adapter:', gs.rearBridgeAdapters);
      text += line('Sandbags:', gs.sandbags);
      text += line('Swivel Cheeseborough:', gs.swivelCheeseboroughs);
      if(gs.pipes > 0) text += line('Pipe' + gs.pipeLengthStr + ':', gs.pipes);
    }

    // Floor Hardware
    if(fh.hasFloorFrames) {
      text += hdr('Floor Hardware');
      if(fh.frame3x2 > 0) text += line('3x2 Frame:', fh.frame3x2);
      if(fh.frame2x2 > 0) text += line('2x2 Frame:', fh.frame2x2);
      if(fh.frame2x1 > 0) text += line('2x1 Frame:', fh.frame2x1);
      if(fh.frame1x1 > 0) text += line('1x1 Frame:', fh.frame1x1);
    }

    // Data Cables
    text += hdr('Data Cables');
    if(dc.jumperCount > 0) text += line(`Jumpers ${dc.dataJumperLen}':`, dc.jumperCount);
    if(dc.crossJumperLen && dc.crossJumperCount > 0) text += line(`Cross Jumpers ${dc.crossJumperLen}':`, dc.crossJumperCount);
    if(dc.jumpersBuiltin && dc.cat5CouplerCount > 0) text += line('Cat5 Couplers:', dc.cat5CouplerCount);
    const cat6Lengths = Object.entries(dc.cat6ByLength).sort((a,b) => a[0] - b[0]);
    for(const [len, count] of cat6Lengths) {
      text += ` - ${count} x ${len}' Cat6${nl}`;
    }

    // Power Cables
    text += hdr('Power Cables');
    if(pc.jumperCount > 0) text += line(`Jumpers ${pc.powerJumperLen}':`, pc.jumperCount);
    text += line('Soca Splays:', pc.socaSplays);
    const socaLengths = Object.entries(pc.socaByLength).sort((a,b) => a[0] - b[0]);
    for(const [len, count] of socaLengths) {
      text += ` - ${count} x ${len}' Soca${nl}`;
    }
    text += line("25' True1:", pc.true1_25);
    text += line("10' True1:", pc.true1_10);
    text += line("5' True1:", pc.true1_5);
    text += line('True1 Twofer:', pc.true1Twofer);

    // Processor -> Dist Box
    if(p2d.count > 0) {
      text += hdr('Processor to Dist Box');
      text += ` - ${p2d.count}x ${p2d.cableType} ${p2d.cableLength}'${nl}`;
    }

  });

  // System-wide: Signal Cables
  const sig = gearData.signalCables;
  if(sig) {
    text += `${nl}${nl}`;
    text += `SIGNAL CABLES${nl}`;
    text += `======================================${nl}`;
    for(const len of Object.keys(sig.sdiByLength).map(Number).sort((a,b) => b - a)) {
      if(sig.sdiByLength[len] > 0) text += line(`${len}' ${sig.sdiType}:`, sig.sdiByLength[len]);
    }
    if(sig.serverFiberLine) text += line(`${sig.serverFiberLine.label}:`, sig.serverFiberLine.count);
    text += line("25' HDMI:", sig.hdmi[25]);
    text += line("10' HDMI:", sig.hdmi[10]);
    text += line("6' HDMI:", sig.hdmi[6]);
  }

  // System-wide: Utility
  const util = gearData.utility;
  if(util) {
    text += hdr('Utility');
    text += line("UG 10':", util.ug10);
    text += line("UG 25':", util.ug25);
    text += line("UG 50':", util.ug50);
    text += line('UG Twofers:', util.ugTwofers);
    text += line('Power Bars:', util.powerBars);
  }

  // Combined Spares (panels 10%, cables/rigging 40%)
  const sp = gearData.spares;
  if(sp) {
    text += `${nl}${nl}`;
    text += `SPARES${nl}`;
    text += `======================================${nl}`;
    // Panels by type
    for(const [name, count] of Object.entries(sp.panelsByType || {})) {
      text += line(`${name}:`, count);
    }
    // Rigging
    text += nl;
    if(sp.shackles) text += line('Shackles:', sp.shackles);
    if(sp.cheeseyes) text += line('Cheeseyes:', sp.cheeseyes);
    // Data
    text += nl;
    if(sp.crossJumpers) text += line(`Cross Jumpers ${sp.crossJumperLen}':`, sp.crossJumpers);
    if(sp.cat5Couplers) text += line('Cat5 Couplers:', sp.cat5Couplers);
    if(sp.cat6ByLength) {
      for(const [len, count] of Object.entries(sp.cat6ByLength).sort((a,b) => Number(b[0]) - Number(a[0]))) {
        if(count > 0) text += line(`${len}' Cat6:`, count);
      }
    }
    // Power
    text += nl;
    if(sp.socaSplays) text += line('Soca Splays:', sp.socaSplays);
    if(sp.true1_25) text += line("25' True1:", sp.true1_25);
    if(sp.true1_10) text += line("10' True1:", sp.true1_10);
    if(sp.true1_5) text += line("5' True1:", sp.true1_5);
    if(sp.true1Twofer) text += line('True1 Twofer:', sp.true1Twofer);
  }

  // Build inventory file only if RP toggle is on
  var inventoryContent = includeRP ? buildGearInventoryContent(gearData) : null;
  var fileName = gearData.configName.replace(/[^a-zA-Z0-9 _-]/g, '') + '.txt';

  // Use Web Share API on mobile only (macOS Mail ignores the title/subject field)
  var isMobileDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
                       (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

  if(isMobileDevice && navigator.share && navigator.canShare) {
    var shareData = {
      title: 'LED Gear List - ' + gearData.configName,
      text: text
    };
    if(includeRP && inventoryContent) {
      var inventoryFile = new File([inventoryContent], fileName, { type: 'text/plain' });
      shareData.files = [inventoryFile];
      if(!navigator.canShare(shareData)) {
        // Fallback if file sharing not supported — share without file
        delete shareData.files;
      }
    }
    navigator.share(shareData).catch(function(err) {
      if(err.name !== 'AbortError') {
        openEmailSendModal({
          title: 'Send to Jared',
          to: '',
          subject: 'LED Gear List - ' + gearData.configName,
          body: text,
          inventoryContent: inventoryContent,
          fileName: fileName
        });
      }
    });
  } else {
    // Desktop: show email send choice modal
    openEmailSendModal({
      title: 'Send to Jared',
      to: '',
      subject: 'LED Gear List - ' + gearData.configName,
      body: text,
      inventoryContent: inventoryContent,
      fileName: fileName
    });
  }
}

// Build gear inventory content as tab-delimited string (matching Apex format)
function buildGearInventoryContent(gearData) {
  if(!gearData || !gearData.screens || gearData.screens.length === 0) return;

  // Helper: resolve code from user gear code mappings, with fallback description
  function gc(key, fallbackDesc) {
    var resolved = resolveGearCode(key);
    return { type: resolved.type || '', code: resolved.code || '', desc: resolved.desc || fallbackDesc };
  }

  // Dedup map for a category group
  function newGroup() { return new Map(); }
  function addToGroup(group, info, qty) {
    if(!qty || qty <= 0) return;
    var k = (info.code || '') + '|' + info.desc;
    if(group.has(k)) { group.get(k).qty += qty; }
    else { group.set(k, { type: info.type || '', code: info.code || '', desc: info.desc, qty: qty }); }
  }

  // Output builders
  var content = 'Type\tCode\tDescription\tQty\tRate\tPrice\tPackLevel\tWarehouse\tClient\n';
  function writeHeader(name) { content += 'H\t\t' + name + '\t0\t0.00\t0.00\t0\tY\tY\n'; }
  function writeSeparator() { content += 'C\t\t\t0\t0.00\t0.00\t0\tY\tY\n'; }
  function writeGroup(group) {
    group.forEach(function(item) {
      content += (item.type || '') + '\t' + item.code + '\t' + item.desc + '\t' + item.qty + '\t0.00\t0.00\t0\tY\tY\n';
    });
  }

  // Per-screen data
  gearData.screens.forEach(function(sd, screenIndex) {
    if(screenIndex > 0) writeSeparator();
    writeHeader(sd.screenName);

    var eq = sd.equipment;
    var rig = sd.rigging;
    var gs = sd.groundSupport;
    var fh = sd.floorHardware;
    var dc = sd.dataCables;
    var pc = sd.powerCables;
    var p2d = sd.processorToDistBox;
    var pt = eq.panelType;
    var categories = [];

    // Equipment
    var equipGroup = newGroup();
    if(eq.isFirstScreenInGroup && eq.processorCount > 0) {
      addToGroup(equipGroup, gc('proc.' + eq.processorType, eq.processorName), eq.processorCount);
      if(eq.distBoxCount > 0) addToGroup(equipGroup, gc('dist.' + eq.processorType, eq.distBoxName + ' Distribution Box'), eq.distBoxCount);
    }
    if(eq.activeFullPanels > 0) addToGroup(equipGroup, gc('panel.' + pt, eq.panelBrand + ' ' + eq.panelName), eq.activeFullPanels);
    if(eq.activeHalfPanels > 0) addToGroup(equipGroup, gc('panel.CB5_MKII_HALF', 'ROE CB5 MKII 600 x 600 Panel'), eq.activeHalfPanels);
    if(equipGroup.size > 0) categories.push(equipGroup);

    // Rigging
    var rigGroup = newGroup();
    if(rig.hasRigging) {
      if(rig.bumper1w > 0) addToGroup(rigGroup, gc('bumper.' + pt + '.1w', eq.panelName + ' Bumper 1W'), rig.bumper1w);
      if(rig.bumper2w > 0) addToGroup(rigGroup, gc('bumper.' + pt + '.2w', eq.panelName + ' Bumper 2W'), rig.bumper2w);
      if(rig.bumper4w > 0) addToGroup(rigGroup, gc('bumper.' + pt + '.4w', eq.panelName + ' Bumper 4W'), rig.bumper4w);
      if(rig.plates4way > 0) addToGroup(rigGroup, gc('rig.plate4way', '4-Way Fixed Connection Plate'), rig.plates4way);
      if(rig.plates2way > 0) addToGroup(rigGroup, gc('rig.plate2way', '2-Way Fixed Connection Plate'), rig.plates2way);
      if(rig.shackles > 0) addToGroup(rigGroup, gc('rig.shackle', 'Shackle'), rig.shackles);
      if(rig.cheeseye > 0) addToGroup(rigGroup, gc('rig.cheeseye', 'Cheeseye'), rig.cheeseye);
    }
    if(rigGroup.size > 0) categories.push(rigGroup);

    // Ground Support
    var gsGroup = newGroup();
    if(gs.hasGS) {
      if(gs.rearTruss > 0) addToGroup(gsGroup, gc('gs.rearTruss', 'Rear Ladder Truss'), gs.rearTruss);
      if(gs.baseTruss > 0) addToGroup(gsGroup, gc('gs.baseTruss.' + pt, 'Ground Support Base Bar'), gs.baseTruss);
      if(gs.bridgeClamps > 0) addToGroup(gsGroup, gc('gs.bridgeClamp', 'Rear Bridge Clamp'), gs.bridgeClamps);
      if(gs.rearBridgeAdapters > 0) addToGroup(gsGroup, gc('gs.rearBridgeAdapter', 'Rear Bridge Adapter'), gs.rearBridgeAdapters);
      if(gs.sandbags > 0) addToGroup(gsGroup, gc('gs.sandbag', 'Sandbag'), gs.sandbags);
      if(gs.swivelCheeseboroughs > 0) addToGroup(gsGroup, gc('gs.swivelCheeseborough', 'Swivel Cheeseborough'), gs.swivelCheeseboroughs);
      if(gs.pipes > 0) addToGroup(gsGroup, gc('gs.pipe', 'Pipe' + gs.pipeLengthStr), gs.pipes);
    }
    if(gsGroup.size > 0) categories.push(gsGroup);

    // Floor Hardware
    var floorGroup = newGroup();
    if(fh.hasFloorFrames) {
      if(fh.frame3x2 > 0) addToGroup(floorGroup, gc('floor.frame3x2', 'Floor Frame 3x2 (6 Panel)'), fh.frame3x2);
      if(fh.frame2x2 > 0) addToGroup(floorGroup, gc('floor.frame2x2', 'Floor Frame 2x2 (4 Panel)'), fh.frame2x2);
      if(fh.frame2x1 > 0) addToGroup(floorGroup, gc('floor.frame2x1', 'Floor Frame 2x1 (2 Panel)'), fh.frame2x1);
      if(fh.frame1x1 > 0) addToGroup(floorGroup, gc('floor.frame1x1', 'Floor Frame 1x1 (1 Panel)'), fh.frame1x1);
    }
    if(floorGroup.size > 0) categories.push(floorGroup);

    // Data Cables
    var dataGroup = newGroup();
    if(dc.jumperCount > 0) addToGroup(dataGroup, gc('data.jumper.' + parseFloat(dc.dataJumperLen), "Data Jumper " + dc.dataJumperLen), dc.jumperCount);
    if(dc.crossJumperCount > 0) addToGroup(dataGroup, gc('data.crossJumper.' + parseFloat(dc.crossJumperLen), "Data Cross Jumper " + dc.crossJumperLen), dc.crossJumperCount);
    if(dc.cat5CouplerCount > 0) addToGroup(dataGroup, gc('data.cat5Coupler', 'NE8FF EtherCON Coupler'), dc.cat5CouplerCount);
    Object.keys(dc.cat6ByLength).forEach(function(len) {
      var count = dc.cat6ByLength[len];
      if(count > 0) addToGroup(dataGroup, gc('data.cat6a.' + parseFloat(len), "CAT6A EtherCON Cable " + len + "'"), count);
    });
    if(p2d.count > 0) {
      if(p2d.cableType === 'Fiber') {
        addToGroup(dataGroup, gc('p2d.fiber.' + p2d.cableLength, "Fiber OpticalCON " + p2d.cableLength + "'"), p2d.count);
      } else {
        addToGroup(dataGroup, gc('data.cat6a.' + p2d.cableLength, "CAT6A EtherCON Cable " + p2d.cableLength + "'"), p2d.count);
      }
    }
    if(dataGroup.size > 0) categories.push(dataGroup);

    // Power Cables
    var powerGroup = newGroup();
    if(pc.jumperCount > 0) addToGroup(powerGroup, gc('power.jumper.' + parseFloat(pc.powerJumperLen), "Power Jumper " + pc.powerJumperLen), pc.jumperCount);
    if(pc.socaSplays > 0) addToGroup(powerGroup, gc('power.socaSplay', 'Soca Splay'), pc.socaSplays);
    Object.keys(pc.socaByLength).forEach(function(len) {
      var count = pc.socaByLength[len];
      if(count > 0) addToGroup(powerGroup, gc('power.soca.' + parseInt(len), "Soca Cable " + len + "'"), count);
    });
    if(pc.true1_25 > 0) addToGroup(powerGroup, gc('power.true1.25', "True1 25'"), pc.true1_25);
    if(pc.true1_10 > 0) addToGroup(powerGroup, gc('power.true1.10', "True1 10'"), pc.true1_10);
    if(pc.true1_5 > 0) addToGroup(powerGroup, gc('power.true1.5', "True1 5'"), pc.true1_5);
    if(pc.true1Twofer > 0) addToGroup(powerGroup, gc('power.true1Twofer', 'True1 Twofer'), pc.true1Twofer);
    if(powerGroup.size > 0) categories.push(powerGroup);

    // Write screen categories with separators between them
    for(var i = 0; i < categories.length; i++) {
      if(i > 0) writeSeparator();
      writeGroup(categories[i]);
    }
  });

  // Signal Cables (system-wide)
  var sig = gearData.signalCables;
  if(sig) {
    var sigGroup = newGroup();
    var is12G = !sig.isHDCanvas;
    Object.keys(sig.sdiByLength).forEach(function(len) {
      var count = sig.sdiByLength[len];
      if(count > 0) {
        var lengthNum = parseInt(len);
        if(is12G) addToGroup(sigGroup, gc('signal.sdi12g.' + lengthNum, "SDI 12G 4K BNC Cable " + len + "'"), count);
        else addToGroup(sigGroup, gc('signal.sdi3g.' + lengthNum, "HD-SDI BNC Video Cable " + len + "'"), count);
      }
    });
    if(sig.serverFiberLine && sig.serverFiberLine.count > 0) {
      var fiberLabel = sig.serverFiberLine.label;
      addToGroup(sigGroup, gc('signal.fiber.' + parseInt(fiberLabel), "Fiber OpticalCON " + fiberLabel), sig.serverFiberLine.count);
    }
    if(sig.hdmi[25] > 0) addToGroup(sigGroup, gc('signal.hdmi.25', "HDMI Cable 25'"), sig.hdmi[25]);
    if(sig.hdmi[10] > 0) addToGroup(sigGroup, gc('signal.hdmi.10', "HDMI Cable 10'"), sig.hdmi[10]);
    if(sig.hdmi[6] > 0) addToGroup(sigGroup, gc('signal.hdmi.6', "HDMI Cable 6'"), sig.hdmi[6]);
    if(sigGroup.size > 0) {
      writeSeparator();
      writeHeader('Signal Cables');
      writeGroup(sigGroup);
    }
  }

  // Utility (system-wide)
  var util = gearData.utility;
  if(util) {
    var utilGroup = newGroup();
    if(util.ug10 > 0) addToGroup(utilGroup, gc('util.ug.10', "Edison Power Cable 10'"), util.ug10);
    if(util.ug25 > 0) addToGroup(utilGroup, gc('util.ug.25', "Edison Power Cable 25'"), util.ug25);
    if(util.ug50 > 0) addToGroup(utilGroup, gc('util.ug.50', "Edison Power Cable 50'"), util.ug50);
    if(util.ugTwofers > 0) addToGroup(utilGroup, gc('util.ugTwofer', 'UG Twofer'), util.ugTwofers);
    if(util.powerBars > 0) addToGroup(utilGroup, gc('util.powerBar', 'Power Bar'), util.powerBars);
    if(utilGroup.size > 0) {
      writeSeparator();
      writeHeader('Utility');
      writeGroup(utilGroup);
    }
  }

  return content;
}

function confirmPdfExport() {
  // Save the options
  pdfExportOptions.specs = document.getElementById('pdfExportSpecs').checked;
  pdfExportOptions.gearList = document.getElementById('pdfExportGearList').checked;
  pdfExportOptions.standard = document.getElementById('pdfExportStandard').checked;
  pdfExportOptions.power = document.getElementById('pdfExportPower').checked;
  pdfExportOptions.data = document.getElementById('pdfExportData').checked;
  pdfExportOptions.structure = document.getElementById('pdfExportStructure').checked;

  closePdfExportModal();
  exportPDF();
}

// ==================== PDF GENERATION (pdfmake) ====================

// ==================== NEW LAYOUT ENGINE BUILDERS ====================
// These functions implement the redesigned PDF layout from BLINK_PDF_REDESIGN_PLAN.md.
// They use pdfmake column/table constructs to produce professional output.

/**
 * Builds the B.L.I.N.K. REPORT header bar for any page.
 * Full-width dark green bar: left=title, center=project name, right=[logo] date.
 * @param {string} configName - project name
 * @param {string} dateStr - formatted date string
 * @param {object|null} logoData - { data: 'data:image/...;base64,...' } or null
 * @param {number} contentWidth - usable content width in pt
 * @returns {object} pdfmake content element
 */
function buildPdfHeader(configName, dateStr, logoData) {
  const tc = PDF_TOKENS.colors;
  const headerBg = (typeof greyscalePrintMode !== 'undefined' && greyscalePrintMode) ? '#444'
    : (typeof ecoPrintMode !== 'undefined' && ecoPrintMode) ? '#4b5563'
    : tc.headerBg;

  const titleCell = {
    text: 'B.L.I.N.K. REPORT',
    bold: true, fontSize: 10, color: tc.headerText,
    fillColor: headerBg, border: [false, false, false, false],
    margin: [10, 7, 6, 7], noWrap: true
  };

  const nameCell = {
    text: configName || 'LED Wall',
    bold: true, fontSize: 11, color: tc.headerText,
    fillColor: headerBg, border: [false, false, false, false],
    margin: [0, 7, 0, 7], alignment: 'center'
  };

  // Right side: logo sits to the LEFT of the date, on the same row
  const dateText = {
    text: dateStr, fontSize: 8, color: tc.headerText,
    alignment: 'right', width: 'auto', margin: [0, 7, 10, 7]
  };

  const rightCell = {
    fillColor: headerBg, border: [false, false, false, false],
    alignment: 'right'
  };
  if (logoData && logoData.data) {
    rightCell.columns = [
      { image: logoData.data, fit: [56, 16], width: 'auto', margin: [0, 4, 8, 4] },
      dateText
    ];
    rightCell.columnGap = 0;
  } else {
    Object.assign(rightCell, dateText);
  }

  return {
    table: { widths: ['auto', '*', 'auto'], body: [[titleCell, nameCell, rightCell]] },
    layout: 'noBorders',
    margin: [0, 0, 0, 6]
  };
}

/**
 * Builds one column of the 4-column summary bar.
 * @param {string} label - PANEL, WALL, POWER, DATA
 * @param {Array<[string,string]>} rows - [label, value] pairs (falsy values are skipped)
 * @returns {object} pdfmake stack element
 */
function buildSummaryColumn(label, rows) {
  const tc = PDF_TOKENS.colors;
  const validRows = rows.filter(function(r) { return r[1] !== null && r[1] !== undefined && r[1] !== ''; });

  const bodyLines = validRows.map(function(r) {
    return {
      columns: [
        { text: r[0], fontSize: 7.5, color: tc.textMuted, width: '*', margin: [0, 0, 2, 0] },
        { text: String(r[1]), fontSize: 7.5, color: tc.textItem, bold: true, width: 'auto', alignment: 'right' }
      ],
      columnGap: 2,
      margin: [0, 1, 0, 1]
    };
  });

  return {
    stack: [
      {
        text: label,
        fontSize: 8, bold: true, color: '#000000',
        border: [false, false, false, false],
        margin: [0, 0, 0, 3],
        decoration: 'underline', decorationColor: '#000000'
      },
      ...bodyLines
    ],
    margin: [6, 6, 6, 6]
  };
}

/**
 * Wraps 4 summary columns in a light-background row with accents.
 * @param {Array} columns - 4 pdfmake stack elements (from buildSummaryColumn)
 * @returns {object} pdfmake columns element
 */
function buildSummaryBar(columns) {
  const tc = PDF_TOKENS.colors;
  const cells = columns.map(function(col) {
    return {
      stack: [col],
      fillColor: tc.summaryBg,
      border: [true, true, true, true],
      borderColor: [tc.sectionBorder, tc.sectionBorder, tc.sectionBorder, tc.sectionBorder]
    };
  });
  return {
    table: { widths: ['*', '*', '*', '*'], body: [cells] },
    layout: {
      hLineWidth: () => 0.5, vLineWidth: () => 0.5,
      hLineColor: () => tc.sectionBorder, vLineColor: () => tc.sectionBorder,
      paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0
    },
    margin: [0, 0, 0, 8]
  };
}

/**
 * Builds the SIMPLE MODE 4-column summary bar.
 * Condensed: Panel / Wall / Power / Data
 */
function buildSimpleSummaryBar(screenData, calcData, panelSpec) {
  const p = panelSpec || {};
  const data = screenData || {};
  const cd = calcData || {};
  const pw = parseInt(data.panelsWide) || 0;
  const ph = parseInt(data.panelsHigh) || 0;

  const panelWidthM  = p.width_m  || 0;
  const panelHeightM = p.height_m || 0;
  const wallWidthFt  = pw * panelWidthM * 3.28084;
  const wallHeightFt = ph * panelHeightM * 3.28084;
  const wallWidthM   = pw * panelWidthM;
  const wallHeightM  = ph * panelHeightM;

  const activePanels  = cd.activePanels || (pw * ph);
  const totalPixels   = pw * (p.res_x || 0) * ph * (p.res_y || 0);
  const estWeightLbs  = Math.ceil(activePanels * (p.weight_kg || 0) * 2.20462);

  const powerType     = data.powerType || 'max';
  const powerPerPanel = (powerType === 'max') ? (p.power_max_w || 0) : (p.power_avg_w || 0);
  const totalPowerW   = activePanels * powerPerPanel;
  const voltage       = parseInt(data.voltage) || 208;
  const breaker       = parseInt(data.breaker) || 20;
  const phase         = parseInt(data.phase) || 3;
  const ampsTotal     = voltage > 0 ? totalPowerW / voltage : 0;
  // 3-phase per-leg amps from the actual circuit distribution (core/phase-balance.js).
  // Falls back to the balanced √3 estimate when no phase-balance data is present.
  const phaseBal      = cd.phaseBalance || null;
  const ampsPhase     = phaseBal ? phaseBal.peakLeg : (phase === 3 ? ampsTotal / 1.732 : ampsTotal);
  // 3-phase "Total Amps" = per-leg line current P/(√3·V); 1-phase = P/V. Service needed
  // rounds that up to the next standard service, ÷0.8 when the NEC Derate toggle is on.
  const ampsService   = phase === 3 ? (voltage > 0 ? totalPowerW / (Math.sqrt(3) * voltage) : 0) : ampsTotal;
  const derateFactor  = data.derate ? 0.8 : 1.0;
  const sdt           = cd.sharedDistroTotal || null;
  const circuits      = cd.circuitsNeeded || 0;
  const maxPpc        = powerPerPanel > 0 ? Math.floor((voltage * breaker) / powerPerPanel) : 0;

  const panelPitchStr = p.pixel_pitch_mm ? `${p.pixel_pitch_mm} mm` : null;
  const panelSizeStr  = (panelWidthM > 0 && panelHeightM > 0)
    ? `${(panelWidthM * 3.28084).toFixed(2)}' × ${(panelHeightM * 3.28084).toFixed(2)}'`
    : null;
  const panelResStr   = (p.res_x && p.res_y) ? `${p.res_x} × ${p.res_y} px` : null;
  const panelWtStr    = p.weight_kg ? `${(p.weight_kg * 2.20462).toFixed(1)} lbs` : null;

  const wallDimStr    = (wallWidthFt > 0 && wallHeightFt > 0)
    ? `${wallWidthFt.toFixed(1)}' × ${wallHeightFt.toFixed(1)}'`
    : null;
  const wallMetStr    = (wallWidthM > 0 && wallHeightM > 0)
    ? `(${wallWidthM.toFixed(2)} × ${wallHeightM.toFixed(2)} m)`
    : null;
  const wallResStr    = (pw > 0 && ph > 0 && p.res_x && p.res_y)
    ? `${pw * p.res_x} × ${ph * p.res_y} px`
    : null;
  const totalPixStr   = totalPixels > 0 ? totalPixels.toLocaleString() + ' px' : null;
  const wallWtStr     = estWeightLbs > 0 ? `${estWeightLbs} lbs` : null;

  const colPanel = buildSummaryColumn('PANEL', [
    ['Model',        `${p.brand || ''} ${p.name || ''}`.trim() || null],
    ['Pixel Pitch',  panelPitchStr],
    ['Size',         panelSizeStr],
    ['Resolution',   panelResStr],
    ['Weight',       panelWtStr],
  ]);
  const colWall = buildSummaryColumn('WALL', [
    ['Dimensions',   wallDimStr],
    ['',             wallMetStr],
    [`${pw}×${ph} panels`, activePanels ? `${activePanels} active` : null],
    ['Resolution',   wallResStr],
    ['Total Pixels', totalPixStr],
    ['Weight',       wallWtStr],
  ]);
  const colPower = buildSummaryColumn('POWER (MAX)', [
    ['Total Power',   totalPowerW > 0 ? `${totalPowerW.toLocaleString()} W` : null],
    ['Total Amps',    ampsService > 0 ? `${ampsService.toFixed(1)} A @ ${voltage}V` : null],
    ['Service needed', serviceNeededLabel(ampsService, derateFactor)],
    ...(phaseBal
      ? [
          ['Leg X', `${phaseBal.legAmps.X.toFixed(1)} A`],
          ['Leg Y', `${phaseBal.legAmps.Y.toFixed(1)} A`],
          ['Leg Z', `${phaseBal.legAmps.Z.toFixed(1)} A`],
          ['Imbalance', `${phaseBal.imbalancePct.toFixed(0)}%`]
        ]
      : [
          ['Amps/Phase', ampsPhase > 0 ? `${ampsPhase.toFixed(1)} A @ ${voltage}V` : null]
        ]),
    ['Circuits',      circuits > 0    ? circuits : null],
    ['Max/Circuit',   maxPpc > 0      ? `${maxPpc} panels` : null],
    ...(sdt ? [
      [`Distro Total (${sdt.screenCount})`, `${Math.round(sdt.power).toLocaleString()} W`],
      ['Distro Amps', `${sdt.peakLeg.toFixed(1)} A @ ${voltage}V`],
      ['Distro Service', serviceNeededLabel(sdt.peakLeg, derateFactor)]
    ] : []),
  ]);
  const panelsPerDL  = cd.panelsPerDataLine || 0;
  const procSpec     = (getAllProcessors && data.processor) ? (getAllProcessors()[data.processor] || {}) : {};
  const pixPerPort   = procSpec.base_pixels_1g || 0;
  const colData = buildSummaryColumn('DATA', [
    ['Port Capacity', pixPerPort > 0 ? `${pixPerPort.toLocaleString()} px/port` : null],
    ['Max/Data Line', panelsPerDL > 0 ? `${panelsPerDL} panels` : null],
  ]);

  return buildSummaryBar([colPanel, colWall, colPower, colData]);
}

/**
 * Builds the complete SIMPLE MODE pdfmake document definition.
 * Single page: Header + 4-col summary + standard grid + resolution label.
 */
function buildSimplePdf(canvasCache) {
  const format      = pdfPageFormat      || 'a4';
  const orientation = pdfPageOrientation || 'p';
  const dims        = pdfGetPageDimensions(format, orientation);
  const cw          = dims.contentWidth;
  const uh          = dims.usableHeight;
  const m           = PDF_TOKENS.layout;

  const screenIds   = Object.keys(screens).sort(function(a, b) {
    return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
  });
  const allPanels   = getAllPanels();
  const configName  = document.getElementById('configName')?.value?.trim() || 'LED Wall';
  const dateStr     = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  const logoData    = (typeof projectLogo !== 'undefined') ? projectLogo : null;

  const content = [];

  // Iterate all screens — each gets its own page
  screenIds.forEach(function(screenId, sIdx) {
    const screen    = screens[screenId];
    if (!screen) return;
    const data      = screen.data          || {};
    const calcData  = screen.calculatedData || {};
    const panelSpec = allPanels[data.panelType] || {};
    const pw        = parseInt(data.panelsWide) || 0;
    const ph        = parseInt(data.panelsHigh) || 0;

    if (sIdx > 0) content.push({ text: '', pageBreak: 'before' });

    // 1. Header bar
    content.push(buildPdfHeader(configName, dateStr, logoData));

    // 2. Summary bar (simple / condensed)
    content.push(buildSimpleSummaryBar(data, calcData, panelSpec));

    // 3. Standard layout grid
    const imgKey  = screenId + '_standard';
    const imgData = canvasCache && canvasCache[imgKey];

    if (imgData && imgData.dataUrl && pw * ph > 1) {
      const usedAbove = m.headerBarH + 6 + m.summaryBarHExp + 8;
      const remainH   = uh - usedAbove - m.resolutionLblH - 8;
      const { renderWidth, renderHeight } = calculateGridScale(pw, ph, cw, remainH);

      content.push({
        image: imgData.dataUrl,
        width:  renderWidth,
        height: renderHeight,
        alignment: 'center',
        margin: [0, 0, 0, 4]
      });

      // Resolution label
      const resStr = `${pw * (panelSpec.res_x || 0)} × ${ph * (panelSpec.res_y || 0)} px`;
      content.push({
        text: resStr,
        fontSize: 9, color: PDF_TOKENS.colors.textMuted,
        alignment: 'center',
        margin: [0, 0, 0, 0]
      });
    }
  });

  const footerColors = PDF_TOKENS.colors;
  return {
    pageSize:        (format === 'letter') ? 'LETTER' : 'A4',
    pageOrientation: orientation === 'l' ? 'landscape' : 'portrait',
    pageMargins:     [m.pageMarginLeft, m.pageMarginTop, m.pageMarginRight, m.pageMarginBottom],
    content:         content,
    footer: function(currentPage, pageCount) {
      return { text: 'Page ' + currentPage + ' of ' + pageCount,
        fontSize: 8, color: footerColors.textFaint, alignment: 'center', margin: [0, 4, 0, 4] };
    },
    defaultStyle:    { font: 'Roboto', fontSize: 9, color: PDF_TOKENS.colors.textPrimary }
  };
}

/**
 * Builds the COMPLEX MODE 4-column summary bar (expanded fields).
 */
function buildComplexSummaryBar(screenData, calcData, panelSpec, gearScreenData) {
  const p   = panelSpec || {};
  const data = screenData || {};
  const cd   = calcData || {};
  const sd   = gearScreenData || {};
  const eq   = sd.equipment || {};
  const pw   = parseInt(data.panelsWide) || 0;
  const ph   = parseInt(data.panelsHigh) || 0;

  const panelWidthM  = p.width_m  || 0;
  const panelHeightM = p.height_m || 0;
  const wallWidthFt  = pw * panelWidthM * 3.28084;
  const wallHeightFt = ph * panelHeightM * 3.28084;
  const wallWidthM   = pw * panelWidthM;
  const wallHeightM  = ph * panelHeightM;

  const activePanels  = cd.activePanels || (pw * ph);
  const totalPixels   = pw * (p.res_x || 0) * ph * (p.res_y || 0);
  const panelWtKg     = p.weight_kg || 0;
  const panelWtLbs    = panelWtKg * 2.20462;
  const panelsTotalWtLbs = Math.ceil(activePanels * panelWtLbs);

  // Structure weight — read pre-computed fields from calculatedData (mirrors pdf-preview.js)
  const structureType = data.structureType || 'hanging';
  let structureWeightKg = 0;
  if (structureType === 'floor' && p.is_floor_panel && p.floor_frames) {
    const floorFrames = cd.floorFrames || {};
    structureWeightKg = floorFrames.totalWeightLbs ? floorFrames.totalWeightLbs / 2.20462 : (floorFrames.totalWeightKg || 0);
  } else {
    structureWeightKg += (cd.bumperWeightKg || 0);
    structureWeightKg += (cd.platesWeightKg || 0);
    if (structureType === 'ground') structureWeightKg += (cd.groundSupportWeightKg || 0);
  }
  const structWtLbs = Math.ceil(structureWeightKg * 2.20462);

  const totalWtLbs = panelsTotalWtLbs + structWtLbs;

  const powerType     = data.powerType || 'max';
  const powerPerPanel = (powerType === 'max') ? (p.power_max_w || 0) : (p.power_avg_w || 0);
  const totalPowerW   = activePanels * powerPerPanel;
  const voltage       = parseInt(data.voltage) || 208;
  const breaker       = parseInt(data.breaker) || 20;
  const phase         = parseInt(data.phase) || 3;
  const ampsTotal     = voltage > 0 ? totalPowerW / voltage : 0;
  // 3-phase per-leg amps from the actual circuit distribution (core/phase-balance.js).
  // Falls back to the balanced √3 estimate when no phase-balance data is present.
  const phaseBal      = cd.phaseBalance || null;
  const ampsPhase     = phaseBal ? phaseBal.peakLeg : (phase === 3 ? ampsTotal / 1.732 : ampsTotal);
  // 3-phase "Total Amps" = per-leg line current P/(√3·V); 1-phase = P/V. Service needed
  // rounds that up to the next standard service, ÷0.8 when the NEC Derate toggle is on.
  const ampsService   = phase === 3 ? (voltage > 0 ? totalPowerW / (Math.sqrt(3) * voltage) : 0) : ampsTotal;
  const derateFactor  = data.derate ? 0.8 : 1.0;
  const sdt           = cd.sharedDistroTotal || null;
  const circuits      = cd.circuitsNeeded || 0;
  const maxPpc        = powerPerPanel > 0 ? Math.floor((voltage * breaker) / powerPerPanel) : 0;

  const dataLines    = cd.dataLines    || 0;
  const panelsPerDL  = cd.panelsPerDataLine || 0;
  const portsNeeded  = cd.portsNeededFinal || cd.portsNeeded || 0;
  const procName     = eq.processorName || '';
  const procCount    = eq.processorCount || 0;

  const bumperWtStr = (p.bumper_1w_lbs || p.bumper_2w_lbs)
    ? [p.bumper_1w_lbs ? `1W=${Math.round(p.bumper_1w_lbs)} lbs` : null, p.bumper_2w_lbs ? `2W=${Math.round(p.bumper_2w_lbs)} lbs` : null].filter(Boolean).join(', ')
    : null;

  const colPanel = buildSummaryColumn('PANEL', [
    ['Model',         `${p.brand || ''} ${p.name || ''}`.trim() || null],
    ['Pixel Pitch',   p.pixel_pitch_mm ? `${p.pixel_pitch_mm} mm` : null],
    ['Size',          (panelWidthM > 0 && panelHeightM > 0) ? `${(panelWidthM*3.28084).toFixed(3)}' × ${(panelHeightM*3.28084).toFixed(3)}'` : null],
    ['',              (panelWidthM > 0 && panelHeightM > 0) ? `(${panelWidthM.toFixed(3)} × ${panelHeightM.toFixed(3)} m)` : null],
    ['Resolution',    (p.res_x && p.res_y) ? `${p.res_x} × ${p.res_y} px` : null],
    ['Weight',        panelWtLbs > 0 ? `${Math.round(panelWtLbs)} lbs (${Math.round(panelWtKg)} kg)` : null],
    ['Brightness',    p.brightness_nits ? `${p.brightness_nits} nits` : null],
    ['Power Max/Avg', (p.power_max_w && p.power_avg_w) ? `${p.power_max_w}W / ${p.power_avg_w}W` : null],
    ['Max Hanging',   p.max_hanging ? `${p.max_hanging} panels` : null],
    ['Max Stacking',  p.max_stacking ? `${p.max_stacking} panels` : null],
    ['Bumpers',        bumperWtStr],
  ]);

  const colWall = buildSummaryColumn('WALL', [
    ['Dimensions',    (wallWidthFt > 0 && wallHeightFt > 0) ? `${wallWidthFt.toFixed(1)}' × ${wallHeightFt.toFixed(1)}'` : null],
    ['',              (wallWidthM > 0 && wallHeightM > 0) ? `(${wallWidthM.toFixed(2)} × ${wallHeightM.toFixed(2)} m)` : null],
    [`${pw}×${ph} panels`, activePanels ? `${activePanels} active` : null],
    ['Resolution',    (pw > 0 && ph > 0 && p.res_x) ? `${pw * p.res_x} × ${ph * p.res_y} px` : null],
    ['Total Pixels',  totalPixels > 0 ? totalPixels.toLocaleString() + ' px' : null],
    ['Panels Weight', panelsTotalWtLbs > 0 ? `${panelsTotalWtLbs} lbs` : null],
    ['Structure Wt',  structWtLbs > 0 ? `${Math.ceil(structWtLbs)} lbs` : null],
    ['Total Weight',  totalWtLbs > 0 ? `${totalWtLbs} lbs` : null],
  ]);

  const colPower = buildSummaryColumn('POWER (MAX)', [
    ['Total Power',   totalPowerW > 0 ? `${totalPowerW.toLocaleString()} W` : null],
    ['Total Amps',    ampsService > 0 ? `${ampsService.toFixed(1)} A @ ${voltage}V` : null],
    ['Service needed', serviceNeededLabel(ampsService, derateFactor)],
    ...(phaseBal
      ? [
          ['Leg X', `${phaseBal.legAmps.X.toFixed(1)} A`],
          ['Leg Y', `${phaseBal.legAmps.Y.toFixed(1)} A`],
          ['Leg Z', `${phaseBal.legAmps.Z.toFixed(1)} A`],
          ['Imbalance', `${phaseBal.imbalancePct.toFixed(0)}%`]
        ]
      : [
          ['Amps/Phase', ampsPhase > 0 ? `${ampsPhase.toFixed(1)} A @ ${voltage}V` : null]
        ]),
    ['Circuits',      circuits > 0    ? circuits : null],
    ['Max/Circuit',   maxPpc > 0      ? `${maxPpc} panels` : null],
    ...(sdt ? [
      [`Distro Total (${sdt.screenCount})`, `${Math.round(sdt.power).toLocaleString()} W`],
      ['Distro Amps', `${sdt.peakLeg.toFixed(1)} A @ ${voltage}V`],
      ['Distro Service', serviceNeededLabel(sdt.peakLeg, derateFactor)]
    ] : []),
  ]);

  const procSpec    = (getAllProcessors && data.processor) ? (getAllProcessors()[data.processor] || {}) : {};
  const pixPerPort  = procSpec.base_pixels_1g || 0;

  const colData = buildSummaryColumn('DATA', [
    ['Processor',     (procName && procCount > 0) ? `${procCount} × ${procName}` : (procName || null)],
    ['Data Lines',    dataLines > 0  ? dataLines  : null],
    ['Ports Needed',  portsNeeded > 0 ? portsNeeded : null],
    ['Port Capacity', pixPerPort > 0  ? `${pixPerPort.toLocaleString()} px` : null],
    ['Max/Data Line', panelsPerDL > 0 ? `${panelsPerDL} panels` : null],
    ['Frame Rate',    data.frameRate  ? `${data.frameRate} Hz` : null],
    ['Bit Depth',     data.bitDepth   ? `${data.bitDepth}-bit`  : null],
    ['Redundancy',    data.redundancy ? 'Yes' : 'No'],
  ]);

  return buildSummaryBar([colPanel, colWall, colPower, colData]);
}

/**
 * Builds a single gear section (header bar + item rows) for use in the 3-column gear list.
 * Returns null if there are no items.
 * @param {string} title - section header text
 * @param {Array<{qty: number|string, item: string}>} items
 * @returns {object|null} pdfmake element or null
 */
// bodyColumns splits the item list across N side-by-side columns under a single header
// bar. Defaults to 1, so every existing caller renders exactly as before; the combined
// gear list passes 2 for SPARES in landscape, where the short page cannot fit it in one.
function buildGearSection(title, items, bodyColumns) {
  const validItems = (items || []).filter(function(i) {
    return i && i.item && (Number(i.qty) > 0 || (typeof i.qty === 'string' && i.qty !== '' && i.qty !== '0'));
  });
  if (validItems.length === 0) return null;

  const tc = PDF_TOKENS.colors;
  const headerBg = (typeof greyscalePrintMode !== 'undefined' && greyscalePrintMode) ? '#555'
    : (typeof ecoPrintMode !== 'undefined' && ecoPrintMode) ? '#6b7280'
    : tc.sectionHeaderBg;

  const nCols = Math.max(1, bodyColumns || 1);
  const perCol = Math.ceil(validItems.length / nCols);

  // One item's qty + name. Blank pads the final short column so its fill still runs.
  function itemCell(i) {
    if (!i) return { text: ' ', fontSize: 8, margin: [4, 2, 4, 2] };
    return {
      columns: [
        { text: String(i.qty), fontSize: 8, color: tc.textItem, bold: true, width: 22 },
        { text: i.item, fontSize: 8, color: tc.textItem, width: '*' }
      ],
      columnGap: 4,
      margin: [4, 2, 4, 2]
    };
  }

  // pdfmake fillColor only works on table cells — use tables for header and body.
  // Column-major: reading order runs down column 1, then down column 2.
  const bodyRows = [];
  for (let r = 0; r < perCol; r++) {
    const row = [];
    for (let c = 0; c < nCols; c++) row.push(itemCell(validItems[c * perCol + r]));
    bodyRows.push(row);
  }

  return {
    stack: [
      // Header bar — table so fillColor renders
      {
        table: { widths: ['*'], body: [[{
          text: title.toUpperCase(),
          fontSize: 8.5, bold: true, color: tc.headerText,
          fillColor: headerBg,
          border: [false, false, false, false],
          margin: [6, 4, 6, 4]
        }]] },
        layout: { hLineWidth: function() { return 0; }, vLineWidth: function() { return 0; },
                  paddingLeft: function() { return 0; }, paddingRight: function() { return 0; },
                  paddingTop: function() { return 0; }, paddingBottom: function() { return 0; } }
      },
      // Body — table so fillColor renders on each row
      {
        table: { widths: new Array(nCols).fill('*'), body: bodyRows.map(function(row) {
          return row.map(function(cell) {
            return { stack: [cell], fillColor: tc.sectionBodyBg,
              border: [true, false, true, true],
              borderColor: [tc.sectionBorder, null, tc.sectionBorder, tc.sectionBorder],
              margin: [0, 0, 0, 0] };
          });
        }) },
        layout: { hLineWidth: function() { return 0; }, vLineWidth: function() { return 0; },
                  paddingLeft: function() { return 0; }, paddingRight: function() { return 0; },
                  paddingTop: function() { return 0; }, paddingBottom: function() { return 0; } }
      }
    ],
    margin: [0, 0, 0, 6]
  };
}

// Structure info lines for a screen. pdfCaptureCanvases() collects these per
// screen while that screen is open; prefer those. The live call is the fallback
// for paths that build a PDF without a capture pass, where the only screen that
// can be described is the open one anyway.
function _structureInfoLinesFor(screenId, canvasCache) {
  const cached = canvasCache && canvasCache[screenId + '_structureInfo'];
  if (cached) return cached;
  // No capture pass filled the cache — the combined pages are built from the
  // combined canvas cache, which holds images only. Stand the globals up for the
  // screen instead of reading whichever one happens to be open.
  if (typeof structureInfoLinesForScreen === 'function') return structureInfoLinesForScreen(screenId);
  if (typeof buildStructureInfoLines !== 'function') return null;
  return buildStructureInfoLines(screenId);
}

/**
 * Converts structure info lines (from buildStructureInfoLines) into a 4-column card layout
 * matching the hero page summary bar style. Each section (Pickup Weights, Connecting Plates,
 * Ground Support Hardware, Total Structure Weight) becomes one equal-width column card.
 * Handles any number of tables dynamically — wraps to additional rows if > 4.
 */
function buildStructureInfoPdf(screenId, canvasCache, perRowOverride) {
  const lines = _structureInfoLinesFor(screenId, canvasCache);
  if (!lines || lines.length === 0) return null;

  const tc = PDF_TOKENS.colors;

  // Parse flat line array into table objects {title, items[]}
  const tables = [];
  let current = null;
  lines.forEach(function(l) {
    if (l.header) {
      if (current) tables.push(current);
      current = { title: l.text, items: [] };
    } else if (current) {
      if (!l.text) return; // skip blank spacer lines
      current.items.push(l);
    }
  });
  if (current) tables.push(current);
  if (tables.length === 0) return null;

  // Build one column card for a single table
  function buildCard(table) {
    const titleEl = {
      text: table.title,
      fontSize: 9, bold: true, color: '#000000',
      decoration: 'underline', decorationColor: '#000000',
      margin: [0, 0, 0, 4]
    };
    const itemEls = table.items.map(function(item) {
      if (item.bold) {
        return { text: item.text.trim(), fontSize: 8, bold: true, color: '#000000', margin: [0, 4, 0, 0] };
      }
      return { text: item.text.trim(), fontSize: 8, color: tc.textSecondary, lineHeight: 1.3 };
    });
    return { stack: [titleEl].concat(itemEls), margin: [6, 6, 6, 6] };
  }

  // Wrap up to N table cards in a summary-bar-style row
  const perRow = perRowOverride || pdfCurrentCardsPerRow();
  function buildRow(rowTables) {
    const padded = rowTables.slice();
    while (padded.length < perRow) padded.push(null);
    const cells = padded.map(function(t) {
      return {
        stack: t ? [buildCard(t)] : [{ text: ' ', fontSize: 4 }],
        fillColor: tc.summaryBg,
        border: [true, true, true, true],
        borderColor: [tc.sectionBorder, tc.sectionBorder, tc.sectionBorder, tc.sectionBorder]
      };
    });
    return {
      table: { widths: new Array(perRow).fill('*'), body: [cells] },
      layout: {
        hLineWidth: () => 0.5, vLineWidth: () => 0.5,
        hLineColor: () => tc.sectionBorder, vLineColor: () => tc.sectionBorder,
        paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0
      },
      margin: [0, 6, 0, 4]
    };
  }

  // Group tables into rows, return single block or stacked rows
  const blocks = [];
  for (let i = 0; i < tables.length; i += perRow) {
    blocks.push(buildRow(tables.slice(i, i + perRow)));
  }
  return blocks.length === 1 ? blocks[0] : { stack: blocks };
}

/**
 * Builds the complete COMPLEX MODE pdfmake document definition. Identical in portrait
 * and landscape — only the page dimensions differ.
 * Structure per screen:
 *   Hero:      Header + screen label + expanded summary + standard grid
 *   Power:     Header + power grid + SOCA circuit table
 *   Data:      Header + data grid + data-line map table
 *   Structure: Header + structure grid + structure info tables
 *   Cabling:   Header + cabling diagram
 * Then one combined gear-list page for the whole document.
 */
// Order screens the way the Combined view lays them out — left to right, then top to bottom —
// so the whole document walks the rig in physical order: summary table, per-screen pages and
// gear list columns all follow this one list. Falls back to tab order when the project has no
// arrangement (see getCombinedArrangement in nav/combined.js).
function pdfScreenOrder() {
  const byTab = Object.keys(screens).sort(function(a, b) {
    return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
  });
  const arrangement = (typeof getCombinedArrangement === 'function') ? getCombinedArrangement() : null;
  if (!arrangement || !arrangement.items.length) return byTab;

  const geom = {};
  arrangement.items.forEach(function(it, i) { geom[it.screenId] = { x: it.x, y: it.y, i: i }; });
  const tabRank = {};
  byTab.forEach(function(sid, i) { tabRank[sid] = i; });

  return byTab.slice().sort(function(a, b) {
    const ga = geom[a], gb = geom[b];
    if (!ga && !gb) return tabRank[a] - tabRank[b];
    if (!ga) return 1;
    if (!gb) return -1;
    if (ga.x !== gb.x) return ga.x - gb.x;
    if (ga.y !== gb.y) return ga.y - gb.y;
    return ga.i - gb.i;
  });
}

function buildComplexPdf(opts, canvasCache) {
  const format      = pdfPageFormat      || 'a4';
  const orientation = pdfPageOrientation || 'p';
  const dims        = pdfGetPageDimensions(format, orientation);
  const cw          = dims.contentWidth;
  const uh          = dims.usableHeight;
  const m           = PDF_TOKENS.layout;
  const tc          = PDF_TOKENS.colors;

  // opts.screenIds narrows the report to specific screens (per-view quick export).
  // Absent = every screen, which is what every existing caller relies on.
  const screenIds = (opts.screenIds && opts.screenIds.length) ? opts.screenIds : pdfScreenOrder();
  const gearData    = buildGearListData(screenIds);
  const allPanels   = getAllPanels();
  const configName  = document.getElementById('configName')?.value?.trim() || 'LED Wall';
  const dateStr     = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  const logoData    = (typeof projectLogo !== 'undefined') ? projectLogo : null;

  const content = [];
  // Track page starts so summary cards can show correct page references
  const screenPageStarts = {};


  function sectionLabel(text) {
    return {
      text: text.toUpperCase(),
      fontSize: 10, bold: true, color: '#000000',
      margin: [0, 0, 0, 6]
    };
  }

  function gridImage(key, pw, ph, maxH) {
    if (!pw || !ph || pw * ph <= 1) return null;
    const imgData = canvasCache && canvasCache[key];
    if (!imgData || !imgData.dataUrl) return null;
    const aspect = imgData.aspectRatio || (ph / pw);
    const pointsPerPanel = cw / 10; // walls ~10+ panels wide fill the width; smaller walls scale down proportionally
    let renderWidth = Math.min(cw, pw * pointsPerPanel);
    let renderHeight = Math.round(renderWidth * aspect);
    if (renderHeight > maxH) {
      renderHeight = maxH;
      renderWidth = Math.round(renderHeight / aspect);
    }
    return {
      image: imgData.dataUrl,
      width: renderWidth, height: renderHeight,
      alignment: 'center',
      margin: [0, 0, 0, 4]
    };
  }

  function escXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildCombinedDiagram(sids) {
    const _grey = (typeof greyscalePrintMode !== 'undefined' && greyscalePrintMode);
    const _eco  = (typeof ecoPrintMode !== 'undefined' && ecoPrintMode);

    const EDGE_PAD  = 4;
    const BOX_H_MAX = 140;
    const FALLBACK_GAP_UNITS = 0.5;

    // Approximate Helvetica advance widths (fraction of an em). There is no way to measure
    // text inside the SVG, so labels under narrow screens are sized from this estimate —
    // without it a wide label like "360x840 px" spills over its neighbours.
    function textWidth(str, fontSize, bold) {
      var total = 0;
      for (var i = 0; i < str.length; i++) {
        var ch = str[i];
        if (ch === ' ')                  total += 0.278;
        else if (ch === '\xd7')          total += 0.584;
        else if (ch >= '0' && ch <= '9') total += 0.556;
        else if (ch >= 'A' && ch <= 'Z') total += bold ? 0.72 : 0.68;
        else                             total += bold ? 0.58 : 0.53;
      }
      return total * fontSize;
    }

    // Shrink a label until it fits its box, down to a floor that stays legible in print
    function fitLabel(str, maxFont, minFont, maxW, bold) {
      var size = maxFont;
      var w = textWidth(str, size, bold);
      if (w > maxW && w > 0) {
        size = Math.max(minFont, maxFont * (maxW / w));
        w = textWidth(str, size, bold);
      }
      return { size: size, width: w };
    }

    // Merge a screen's appearance (name, checkerboard colours, dead panels) onto the geometry
    // supplied by the caller. Geometry is in panel units — 1 unit = one panel width.
    function describe(screenId, geom) {
      const scr = screens[screenId];
      const d   = (scr && scr.data) || {};
      const dp  = d.deletedPanels;
      const deletedSet = dp instanceof Set ? dp : (dp ? new Set(dp) : new Set());
      return {
        name:   (scr && scr.name)   || screenId,
        color:  (scr && scr.color)  || '#888888',
        color2: (scr && scr.color2) || null,
        pw: geom.pw, ph: geom.ph,
        heightRatio: geom.heightRatio,
        halfRow: geom.halfRow,
        x: geom.x, y: geom.y, w: geom.w, h: geom.h,
        deletedPanels: deletedSet
      };
    }

    // Geometry comes from the Combined view so the PDF renders the arrangement the user
    // actually built — screen order, manual drag offsets and vertical stacking all carry
    // through. Falls back to a plain left-to-right row if that module isn't available.
    const arrangement = (typeof getCombinedArrangement === 'function') ? getCombinedArrangement() : null;
    var items;
    if (arrangement && arrangement.items.length) {
      items = arrangement.items.map(function(it) { return describe(it.screenId, it); });
    } else {
      var rowX = 0;
      items = sids.map(function(sid) {
        const d  = (screens[sid] && screens[sid].data) || {};
        const pw = parseInt(d.panelsWide) || 1;
        const ph = parseInt(d.panelsHigh) || 1;
        const pt = d.panelType || 'CB5_MKII';
        const hr = (typeof getPanelHeightRatio === 'function') ? getPanelHeightRatio(pt) : 1;
        const half = !!(d.addCB5HalfRow && pt === 'CB5_MKII');
        const geom = {
          pw: pw, ph: ph, heightRatio: hr, halfRow: half,
          x: rowX, y: 0, w: pw, h: ph * hr + (half ? 1 : 0)
        };
        rowX += geom.w + FALLBACK_GAP_UNITS;
        return describe(sid, geom);
      });
    }

    const minX = items.reduce(function(m, it) { return Math.min(m, it.x); }, Infinity);
    const maxX = items.reduce(function(m, it) { return Math.max(m, it.x + it.w); }, -Infinity);
    const minY = items.reduce(function(m, it) { return Math.min(m, it.y); }, Infinity);
    const maxY = items.reduce(function(m, it) { return Math.max(m, it.y + it.h); }, -Infinity);

    const bboxW = Math.max(maxX - minX, 0.001);
    const bboxH = Math.max(maxY - minY, 0.001);

    // BOX_H_MAX caps the drawn height so a tall arrangement can never push the summary page
    // onto a second page — the "p. N" references on this page assume the summary is one page.
    const scale   = Math.min(cw / bboxW, BOX_H_MAX / bboxH);
    const diagW   = bboxW * scale;
    const diagH   = bboxH * scale;
    const startX  = (cw - diagW) / 2;
    // Every label now sits on its screen, so the bands that used to be reserved above and
    // below the boxes are given back to the diagram instead (see BOX_H_MAX).
    const diagTop = EDGE_PAD;
    const SVG_H   = diagTop + diagH + EDGE_PAD;

    var parts = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + cw + '" height="' + SVG_H.toFixed(2) + '">',
      '<rect x="0" y="0" width="' + cw + '" height="' + SVG_H.toFixed(2) + '" fill="#f5f5f0"/>'
    ];

    // Row boundaries in panel units — full rows are heightRatio tall, the CB5 half row is 1.
    // The half row is keyed as row index ph, matching renderStandardLayout().
    function rowCountOf(it) { return it.ph + (it.halfRow ? 1 : 0); }
    function rowEdge(it, r) {
      return (r <= it.ph) ? (r * it.heightRatio) : (it.ph * it.heightRatio + (r - it.ph));
    }
    function cellCenterY(it, by, bh, r) {
      return by + ((rowEdge(it, r) + rowEdge(it, r + 1)) / 2 / it.h) * bh;
    }

    // Resolve every drawn rect up front so boxes can be painted in one pass and labels in a
    // second — otherwise a screen stacked over another paints out its neighbour's label.
    var placed = items.map(function(it) {
      return {
        it: it,
        bx: startX + (it.x - minX) * scale,
        by: diagTop + (it.y - minY) * scale,
        bw: it.w * scale,
        bh: it.h * scale
      };
    });

    placed.forEach(function(pl) {
      var it = pl.it, bx = pl.bx, by = pl.by, bw = pl.bw, bh = pl.bh;
      var rowCount = rowCountOf(it);
      var panelW = bw / it.pw;

      // Same checkerboard the app paints in renderCombinedStandardLayout(): screen colour
      // for even panels, colour2 (or a 30% darkened primary) for odd, each panel outlined in
      // black. Deleted panels are skipped entirely so the page shows through, exactly as the
      // app leaves them empty.
      var primary   = it.color || '#808080';
      var secondary = it.color2 || (typeof darkenColor === 'function' ? darkenColor(primary, 30) : primary);
      if (_eco && typeof toPastelColor === 'function') {
        primary = toPastelColor(primary); secondary = toPastelColor(secondary);
      }
      if (_grey && typeof toGreyscale === 'function') {
        primary = toGreyscale(primary); secondary = toGreyscale(secondary);
      }

      // Panel numbers only when they actually fit, mirroring the app's size guard
      var numFont  = Math.max(4.5, Math.min(9, panelW * 0.28));
      var widest   = it.pw + '.' + rowCount;
      var rowH     = (rowEdge(it, 1) / it.h) * bh;
      var showNums = textWidth(widest, numFont, false) <= panelW * 0.85 && rowH >= numFont * 1.25;

      for (var r = 0; r < rowCount; r++) {
        for (var c = 0; c < it.pw; c++) {
          if (it.deletedPanels.has(c + ',' + r)) continue;
          var cx1 = bx + (c / it.pw) * bw;
          var cx2 = bx + ((c + 1) / it.pw) * bw;
          var cy1 = by + (rowEdge(it, r) / it.h) * bh;
          var cy2 = by + (rowEdge(it, r + 1) / it.h) * bh;
          parts.push('<rect x="' + cx1.toFixed(2) + '" y="' + cy1.toFixed(2) +
            '" width="' + (cx2 - cx1).toFixed(2) + '" height="' + (cy2 - cy1).toFixed(2) +
            '" fill="' + ((c + r) % 2 === 0 ? primary : secondary) +
            '" stroke="#000000" stroke-width="0.6"/>');
          if (showNums) {
            parts.push('<text x="' + ((cx1 + cx2) / 2).toFixed(1) + '" y="' +
              ((cy1 + cy2) / 2 + numFont * 0.36).toFixed(1) + '" font-size="' + numFont.toFixed(2) +
              '" fill="#000000" text-anchor="middle" font-family="Helvetica">' +
              (c + 1) + '.' + (r + 1) + '</text>');
          }
        }
      }
    });

    // Second pass: every label goes on top of every box, so a stacked screen can never
    // hide a neighbour's name. The name sits ON its screen, styled like the app's
    // combined-view label (bold, yellow with a dark outline; inverted for print modes).
    placed.forEach(function(pl) {
      var it = pl.it, bx = pl.bx, by = pl.by, bw = pl.bw, bh = pl.bh;
      var rowCount = rowCountOf(it);
      var midX = bx + bw / 2;

      // Centre the name on the live panels, so it never floats over a deleted gap
      var nameX = midX, nameY = by + bh / 2;
      var sumX = 0, sumY = 0, live = 0;
      for (var lr = 0; lr < rowCount; lr++) {
        for (var lc = 0; lc < it.pw; lc++) {
          if (it.deletedPanels.has(lc + ',' + lr)) continue;
          sumX += bx + ((lc + 0.5) / it.pw) * bw;
          sumY += cellCenterY(it, by, bh, lr);
          live++;
        }
      }
      if (live > 0) {
        nameX = sumX / live;
        nameY = sumY / live;
        // If the centroid lands on a deleted cell, snap to the nearest live panel centre
        var ccol = Math.floor(((nameX - bx) / bw) * it.pw);
        var cyu  = ((nameY - by) / bh) * it.h;
        var crow = (cyu < it.ph * it.heightRatio) ? Math.floor(cyu / it.heightRatio) : it.ph;
        if (it.deletedPanels.has(ccol + ',' + crow)) {
          var best = Infinity;
          for (var sr = 0; sr < rowCount; sr++) {
            for (var sc = 0; sc < it.pw; sc++) {
              if (it.deletedPanels.has(sc + ',' + sr)) continue;
              var pcx = bx + ((sc + 0.5) / it.pw) * bw;
              var pcy = cellCenterY(it, by, bh, sr);
              var dd  = (pcx - nameX) * (pcx - nameX) + (pcy - nameY) * (pcy - nameY);
              if (dd < best) { best = dd; nameX = pcx; nameY = pcy; }
            }
          }
        }
      }

      var nameFit  = fitLabel(it.name, 9, 5, bw * 0.92, true);
      var haloFill = (_grey || _eco) ? '#ffffff' : '#000000';
      var textFill = (_grey || _eco) ? '#000000' : '#FFFF00';

      // No dominant-baseline: offset the baseline by half the cap height instead, which
      // every SVG renderer handles the same way.
      var nameBase = nameY + nameFit.size * 0.36;
      var attrs = 'x="' + nameX.toFixed(1) + '" y="' + nameBase.toFixed(1) +
        '" font-size="' + nameFit.size.toFixed(2) + '" text-anchor="middle" font-family="Helvetica-Bold"';
      parts.push('<text ' + attrs + ' fill="none" stroke="' + haloFill + '" stroke-width="' +
        (nameFit.size * 0.32).toFixed(2) + '" stroke-linejoin="round">' + escXml(it.name) + '</text>');
      parts.push('<text ' + attrs + ' fill="' + textFill + '">' + escXml(it.name) + '</text>');
    });

    parts.push('</svg>');

    return { svg: parts.join(''), width: cw, height: SVG_H, margin: [0, 0, 0, 12] };
  }

  // opts.summary === false suppresses the project summary page (combined-view
  // quick exports want a single page). Absent = today's behaviour.
  const showSummary = opts.summary !== false && screenIds.length > 1;

  // For multi-screen: summary page page-reference is 1-based index in final PDF.
  // We calculate page starts by counting pageBreak elements as we build.
  // Summary page itself = page 1; so all screen hero pages start at 2+.
  // We do a pre-pass to record approximate starts (1 summary + N pages per screen).
  if (showSummary) {
    let pageAccum = 2; // page 1 = summary page; screen 1 hero = page 2
    screenIds.forEach(function(sid) {
      screenPageStarts[sid] = pageAccum;
      const scr = screens[sid];
      const pd = scr && scr.data ? scr.data : {};
      const pw2 = parseInt(pd.panelsWide) || 0;
      const ph2 = parseInt(pd.panelsHigh) || 0;
      const plan = buildComplexPagePlan(pw2, ph2,
        { specs: opts.specs !== false,
          standard: opts.standard !== false, power: opts.power !== false,
          data: opts.data !== false, structure: opts.structure !== false,
          cabling: opts.cabling !== false });
      pageAccum += plan.pageCount;
    });
  }

  // ===== MULTI-SCREEN SUMMARY PAGE =====
  if (showSummary) {
    content.push(buildPdfHeader(configName, dateStr, logoData));
    content.push({ text: 'PROJECT SUMMARY', fontSize: 12, bold: true, color: '#000000', margin: [0, 2, 0, 8] });

    // Aggregate stats
    let totalPowerW = 0;
    let totalWeightLbs = 0;
    const panelTypeCounts = {};

    screenIds.forEach(function(sid) {
      const scr = screens[sid];
      const d   = (scr && scr.data)           || {};
      const cd  = (scr && scr.calculatedData)  || {};
      const p   = allPanels[d.panelType]        || {};
      const active = cd.activePanels || (parseInt(d.panelsWide) || 0) * (parseInt(d.panelsHigh) || 0);
      const pwType = d.powerType || 'max';
      const ppp = (pwType === 'max') ? (p.power_max_w || 0) : (p.power_avg_w || 0);
      totalPowerW   += active * ppp;
      totalWeightLbs += Math.ceil(active * (p.weight_kg || 0) * 2.20462);
      const panelKey = `${p.brand || ''} ${p.name || d.panelType || ''}`.trim();
      panelTypeCounts[panelKey] = (panelTypeCounts[panelKey] || 0) + active;
    });

    const panelKeys   = Object.keys(panelTypeCounts);
    const panelSummary = panelKeys.length === 1
      ? `${Object.values(panelTypeCounts)[0]} × ${panelKeys[0]}`
      : panelKeys.map(function(k) { return `${panelTypeCounts[k]} × ${k}`; }).join(', ');

    const summaryItems = [
      ['Screens',       screenIds.length],
      ['Total Power',   totalPowerW > 0 ? `${totalPowerW.toLocaleString()} W` : '—'],
      ['Total Weight',  totalWeightLbs > 0 ? `${totalWeightLbs} lbs` : '—'],
      ['Panels',        panelSummary || '—'],
    ];

    const aggRows = summaryItems.map(function(r) {
      return [
        { text: r[0], bold: true, fontSize: 8, color: tc.textMuted, border: [false,false,false,false] },
        { text: String(r[1]), fontSize: 8, border: [false,false,false,false] }
      ];
    });
    content.push({
      table: { widths: [80, '*'], body: aggRows },
      layout: { hLineWidth: () => 0.3, vLineWidth: () => 0, hLineColor: () => tc.sectionBorder,
                paddingLeft: () => 0, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 },
      margin: [0, 0, 0, 12]
    });

    // Combined view diagram
    if (opts.combined && screenIds.length > 1) {
      content.push(sectionLabel('Combined View'));
      content.push(buildCombinedDiagram(screenIds));
    }

    // Per-screen summary cards
    content.push({ text: 'SCREENS', fontSize: 9, bold: true, color: '#000000', margin: [0, 0, 0, 6] });

    const borderBottom = [false, false, false, true];
    const borderNone   = [false, false, false, false];
    const bColor = [null, null, null, tc.sectionBorder];

    const cardRows = [];
    // Header row
    cardRows.push([
      { text: 'SCREEN',       fontSize: 7, bold: true, color: tc.textMuted, border: borderBottom, borderColor: bColor },
      { text: 'PANELS',       fontSize: 7, bold: true, color: tc.textMuted, border: borderBottom, borderColor: bColor },
      { text: 'DIMENSIONS',   fontSize: 7, bold: true, color: tc.textMuted, border: borderBottom, borderColor: bColor },
      { text: 'RESOLUTION',   fontSize: 7, bold: true, color: tc.textMuted, border: borderBottom, borderColor: bColor },
      { text: 'TOTAL PANELS', fontSize: 7, bold: true, color: tc.textMuted, border: borderBottom, borderColor: bColor },
      { text: 'PAGE',         fontSize: 7, bold: true, color: tc.textMuted, alignment: 'right', border: borderBottom, borderColor: bColor },
    ]);

    screenIds.forEach(function(sid) {
      const scr = screens[sid];
      const d   = (scr && scr.data)           || {};
      const cd  = (scr && scr.calculatedData)  || {};
      const p   = allPanels[d.panelType]        || {};
      const pw2 = parseInt(d.panelsWide) || 0;
      const ph2 = parseInt(d.panelsHigh) || 0;
      const active = cd.activePanels || (pw2 * ph2);
      const wFt = (pw2 * (p.width_m  || 0) * 3.28084).toFixed(1);
      const hFt = (ph2 * (p.height_m || 0) * 3.28084).toFixed(1);
      const startPage = screenPageStarts[sid] || '—';
      // Pixel resolution moved here off the combined diagram
      const resTxt = (p.res_x && p.res_y) ? `${pw2 * p.res_x}×${ph2 * p.res_y} px` : '—';

      cardRows.push([
        { text: scr.name || sid,        bold: true, fontSize: 9, border: borderBottom, borderColor: bColor },
        { text: `${pw2}×${ph2}`,        fontSize: 8, color: tc.textMuted, border: borderBottom, borderColor: bColor },
        { text: `${wFt}' × ${hFt}'`,   fontSize: 8, color: tc.textMuted, border: borderBottom, borderColor: bColor },
        { text: resTxt,                 fontSize: 8, color: tc.textMuted, border: borderBottom, borderColor: bColor },
        { text: `${active} panels`,     fontSize: 8, color: tc.textMuted, border: borderBottom, borderColor: bColor },
        { text: `p. ${startPage}`,      fontSize: 8, color: tc.textMuted, alignment: 'right', border: borderBottom, borderColor: bColor },
      ]);
    });

    content.push({
      // Name pinned left and page pinned right; the four data columns share the slack
      // equally so they spread evenly instead of DIMENSIONS absorbing all of it.
      table: { widths: ['auto', '*', '*', '*', '*', 'auto'], body: cardRows },
      layout: { hLineWidth: (i, node) => (i === node.table.body.length) ? 0 : 0.3, vLineWidth: () => 0,
                hLineColor: () => tc.sectionBorder,
                paddingLeft: () => 0, paddingRight: () => 12, paddingTop: () => 4, paddingBottom: () => 4 },
      margin: [0, 0, 0, 0]
    });
  }

  screenIds.forEach(function(screenId, sIdx) {
    const screen    = screens[screenId];
    if (!screen) return;
    const data      = screen.data          || {};
    const calcData  = screen.calculatedData || {};
    const panelSpec = allPanels[data.panelType] || {};
    const pw        = parseInt(data.panelsWide) || 0;
    const ph        = parseInt(data.panelsHigh) || 0;
    const sd        = gearData.screens[sIdx];
    const resStr    = (pw > 0 && ph > 0 && panelSpec.res_x && panelSpec.res_y)
      ? `${pw * panelSpec.res_x} × ${ph * panelSpec.res_y} px` : '';


    // ===== PAGE 1: HERO =====
    if (opts.specs !== false || opts.standard !== false) {
      if (sIdx > 0 || screenIds.length > 1) content.push({ text: '', pageBreak: 'before' });
      content.push(buildPdfHeader(configName, dateStr, logoData));
      content.push({
        text: screen.name.toUpperCase(),
        fontSize: 11, bold: true, color: '#000000',
        margin: [0, 2, 0, 6]
      });
      if (opts.specs !== false) {
        content.push(buildComplexSummaryBar(data, calcData, panelSpec, sd));
      }
      if (opts.standard !== false) {
        // The canvas has this page to itself, so let it use what the summary bar leaves.
        // It used to also be capped at a third of the page, left over from when three
        // images shared one — which on the shorter landscape page left it tiny.
        // summaryBarHExp (100) is the token but the expanded bar measures ~140pt with a
        // full PANEL column, so budget 160 rather than push the image off the page.
        const SUMMARY_BAR_MAX_H = 160;
        const usedAbove = m.headerBarH + 6 + m.screenLabelH + SUMMARY_BAR_MAX_H + 8;
        const remainH   = uh - usedAbove - m.resolutionLblH - 28;
        const img = gridImage(screenId + '_standard', pw, ph, remainH);
        if (img) content.push(img);
        if (resStr) content.push({ text: resStr, fontSize: 9, color: tc.textMuted, alignment: 'center', margin: [0, 0, 0, 0] });
      }
    }

    // ===== PAGES 2 (& 3): POWER / DATA / STRUCTURE / CABLING =====
    const hasLayouts = opts.power !== false || opts.data !== false || opts.structure !== false || opts.cabling !== false;
    if (hasLayouts && pw * ph > 1) {
      // Per-layout table heights + page geometry, used to decide paging.
      const hdrH = m.headerBarH + m.afterHeaderGap;
      const lblH = m.sectionLabelH + m.afterLabelGap;
      const estSocaH    = estSocaTableHeight(screenId);
      const estDataMapH = estDataMapHeight(screenId);
      const estStructH  = estStructureInfoHeight(screenId, canvasCache);

      // One-per-page image cap: fill the page minus the section label and the layout's own
      // table. The reserve covers the image's own 4pt bottom margin plus slack for rounding
      // in the table estimates — without it a tall wall sized the image to the exact
      // remaining space and nudged its table onto the next page.
      const fillImgH = (tableH) => Math.max(140, uh - hdrH - lblH - (tableH || 0) - 28);

      // Every enabled layout gets its own page, in both orientations. Packing several
      // layouts onto one page is what separated a section label from its image and
      // pushed tall walls' tables onto a page with no report header.
      if (opts.power !== false) {
        if (content.length > 0) content.push({ text: '', pageBreak: 'before' });
        content.push(buildPdfHeader(configName, dateStr, logoData));
        content.push(sectionLabel('Power Layout'));
        // Cap the WHOLE image, column-marker band included. This used to divide the cap by
        // (1 - socaBarFraction) so the panel grid alone filled the space, which made the
        // image taller than the budget it was measured against. Portrait absorbed the few
        // points in its reserve; landscape, where the band is a bigger share of a shorter
        // page, ran the SOCA table onto the next page.
        const powerMaxH = fillImgH(estSocaH);
        const img = gridImage(screenId + '_power', pw, ph, powerMaxH);
        if (img) content.push(img);
        const sMap = buildSocaCircuitTable(screenId);
        if (sMap) content.push(sMap);
      }

      if (opts.data !== false) {
        if (content.length > 0) content.push({ text: '', pageBreak: 'before' });
        content.push(buildPdfHeader(configName, dateStr, logoData));
        content.push(sectionLabel('Data Layout'));
        const dataBaseH = fillImgH(estDataMapH);
        const img = gridImage(screenId + '_data', pw, ph, dataBaseH);
        if (img) content.push(img);
        const dMap = buildDataLineMapTable(screenId);
        if (dMap) content.push(dMap);
      }

      if (opts.structure !== false || opts.cabling !== false) {
        if (content.length > 0) content.push({ text: '', pageBreak: 'before' });
        content.push(buildPdfHeader(configName, dateStr, logoData));

        if (opts.structure !== false) {
          content.push(sectionLabel('Structure Layout'));
          const structBaseH = fillImgH(estStructH);
          const img = gridImage(screenId + '_structure', pw, ph, structBaseH);
          if (img) content.push(img);
          const structInfo = buildStructureInfoPdf(screenId, canvasCache);
          if (structInfo) content.push(structInfo);
        }

        if (opts.cabling !== false) {
          // Cabling always starts its own page, exactly like Data above. This used to be
          // decided by estimating the structure section's height; when the estimate ran low
          // the label stayed on the structure page while pdfmake flowed the image onto the
          // next one — which, being an automatic break, got no report header. Only skip the
          // break when structure is off, because the enclosing structure/cabling block
          // already opened a fresh page in that case.
          if (opts.structure !== false) {
            content.push({ text: '', pageBreak: 'before' });
            content.push(buildPdfHeader(configName, dateStr, logoData));
          }
          content.push(sectionLabel('Cabling Layout'));
          const cabImg = canvasCache && canvasCache[screenId + '_cabling'];
          if (cabImg && cabImg.dataUrl) {
            // Cabling — use fit to maintain aspect ratio.
            // Multi-screen: smaller images allow more room on structure page; single-screen has its own page.
            // Bounded by the page budget so the short landscape page cannot overflow.
            const cabFitH = Math.min(screenIds.length > 1 ? 380 : 440, fillImgH(0));
            content.push({
              image: cabImg.dataUrl,
              fit: [cw, cabFitH],
              alignment: 'center',
              margin: [0, 0, 0, 4]
            });
          }
        }
      }
    }

  });

  // ===== COMBINED GEAR LIST PAGE (last page) =====
  if (opts.gearList !== false) {
    const gearScreenIds = screenIds.filter(function(sid) {
      const d = (screens[sid] && screens[sid].data) || {};
      return (parseInt(d.panelsWide) || 0) * (parseInt(d.panelsHigh) || 0) > 1;
    });

    if (gearScreenIds.length > 0) {
      if (content.length > 0) content.push({ text: '', pageBreak: 'before' });
      content.push(buildPdfHeader(configName, dateStr, logoData));
      content.push(sectionLabel('Gear List — All Screens'));

      const numCols = gearScreenIds.length;
      const colGap = 8;

      // One entry per screen: { name, sections: { TITLE -> node } }. Assembled into a
      // table below so each section type occupies one row and its headings line up
      // across screens, instead of every column stacking to its own heights.
      var screenCols = [];

      // Processors and dist boxes belong to the rig (one set per shared-distro group), not
      // to whichever screen happens to be first, so they collect into their own shared
      // column below. Same-named entries from different groups merge into one line.
      var procItems = [];
      function addProcItem(qty, item) {
        const hit = procItems.find(function(p) { return p.item === item; });
        if (hit) hit.qty += qty; else procItems.push({ qty: qty, item: item });
      }

      gearScreenIds.forEach(function(sid, ci) {
        const scr = screens[sid];
        const sIdx = screenIds.indexOf(sid);
        const sd = gearData.screens[sIdx] || {};
        const eq  = sd.equipment          || {};
        const rig = sd.rigging            || {};
        const gs  = sd.groundSupport      || {};
        const fh  = sd.floorHardware      || {};
        const dc  = sd.dataCables         || {};
        const pc  = sd.powerCables        || {};
        const p2d = sd.processorToDistBox || {};

        const eqItems = [];
        if (eq.isFirstScreenInGroup) {
          if (eq.processorCount > 0) addProcItem(eq.processorCount, eq.processorName || 'Processor');
          if (eq.distBoxCount   > 0) addProcItem(eq.distBoxCount,   eq.distBoxName   || 'Dist Box');
        }
        if (eq.activeFullPanels > 0) eqItems.push({ qty: eq.activeFullPanels, item: ((eq.panelBrand || '') + ' ' + (eq.panelName || '')).trim() });
        if (eq.activeHalfPanels > 0) eqItems.push({ qty: eq.activeHalfPanels, item: ((eq.panelBrand || '') + ' ' + (eq.halfPanelName || '')).trim() });

        const rigItems = [];
        if (rig.hasRigging) {
          if (rig.bumper1w   > 0) rigItems.push({ qty: rig.bumper1w,   item: '1W Bumpers' });
          if (rig.bumper2w   > 0) rigItems.push({ qty: rig.bumper2w,   item: '2W Bumpers' });
          if (rig.bumper4w   > 0) rigItems.push({ qty: rig.bumper4w,   item: '4W Bumpers' });
          if (rig.plates4way > 0) rigItems.push({ qty: rig.plates4way, item: '4W Connecting Plates' });
          if (rig.plates2way > 0) rigItems.push({ qty: rig.plates2way, item: '2W Connecting Plates' });
          if (rig.shackles   > 0) rigItems.push({ qty: rig.shackles,   item: '5/8" Shackles' });
          if (rig.cheeseye   > 0) rigItems.push({ qty: rig.cheeseye,   item: 'Cheeseye' });
        }

        const gsItems = [];
        if (gs.hasGS) {
          if (gs.rearTruss          > 0) gsItems.push({ qty: gs.rearTruss,          item: 'Rear Truss' });
          if (gs.baseTruss          > 0) gsItems.push({ qty: gs.baseTruss,          item: 'Base Truss' });
          if (gs.bridgeClamps       > 0) gsItems.push({ qty: gs.bridgeClamps,       item: 'Bridge Clamps' });
          if (gs.rearBridgeAdapters > 0) gsItems.push({ qty: gs.rearBridgeAdapters, item: 'Rear Bridge Adapter' });
          if (gs.sandbags           > 0) gsItems.push({ qty: gs.sandbags,           item: 'Sandbags' });
          if (gs.swivelCheeseboroughs > 0) gsItems.push({ qty: gs.swivelCheeseboroughs, item: 'Swivel Cheeseborough' });
          if (gs.pipes              > 0) gsItems.push({ qty: gs.pipes,              item: 'Pipe' + (gs.pipeLengthStr || '') });
        }

        const fhItems = [];
        if (fh.hasFloorFrames) {
          if (fh.frame3x2 > 0) fhItems.push({ qty: fh.frame3x2, item: '3x2 Frame' });
          if (fh.frame2x2 > 0) fhItems.push({ qty: fh.frame2x2, item: '2x2 Frame' });
          if (fh.frame2x1 > 0) fhItems.push({ qty: fh.frame2x1, item: '2x1 Frame' });
          if (fh.frame1x1 > 0) fhItems.push({ qty: fh.frame1x1, item: '1x1 Frame' });
        }

        const dcItems = [];
        if (dc.jumperCount > 0) dcItems.push({ qty: dc.jumperCount, item: ('Data Jumpers ' + (dc.dataJumperLen || '') + "'").trim() });
        if (dc.crossJumperLen && dc.crossJumperCount > 0) dcItems.push({ qty: dc.crossJumperCount, item: "Cross Jumpers " + dc.crossJumperLen + "'" });
        if (dc.jumpersBuiltin && dc.cat5CouplerCount > 0) dcItems.push({ qty: dc.cat5CouplerCount, item: 'Cat5 Couplers' });
        Object.entries(dc.cat6ByLength || {}).sort(function(a, b) { return Number(a[0]) - Number(b[0]); }).forEach(function(e) {
          if (Number(e[1]) > 0) dcItems.push({ qty: e[1], item: e[0] + "' Cat6" });
        });
        if (p2d && p2d.count > 0) {
          dcItems.push({ qty: '— — —', item: 'Proc → Dist Box' });
          dcItems.push({ qty: p2d.count, item: p2d.cableType === 'Fiber'
            ? ('Fiber OpticalCON ' + (p2d.cableLength || '') + "'").trim()
            : ('CAT6A EtherCON ' + (p2d.cableLength || '') + "'").trim() });
        }

        const pcItems = [];
        if (pc.jumperCount  > 0) pcItems.push({ qty: pc.jumperCount,  item: ('Power Jumpers ' + (pc.powerJumperLen || '') + "'").trim() });
        if (pc.socaSplays   > 0) pcItems.push({ qty: pc.socaSplays,   item: 'Soca Splays' });
        Object.entries(pc.socaByLength || {}).sort(function(a, b) { return Number(a[0]) - Number(b[0]); }).forEach(function(e) {
          if (Number(e[1]) > 0) pcItems.push({ qty: e[1], item: 'Soca ' + e[0] + "'" });
        });
        if (pc.true1_25    > 0) pcItems.push({ qty: pc.true1_25,    item: "25' True1" });
        if (pc.true1_10    > 0) pcItems.push({ qty: pc.true1_10,    item: "10' True1" });
        if (pc.true1_5     > 0) pcItems.push({ qty: pc.true1_5,     item: "5' True1"  });
        if (pc.true1Twofer > 0) pcItems.push({ qty: pc.true1Twofer, item: 'True1 Twofer' });

        screenCols.push({
          name: (scr && scr.name) ? scr.name.toUpperCase() : sid,
          sections: {
            'EQUIPMENT':        buildGearSection('EQUIPMENT', eqItems),
            'RIGGING HARDWARE': buildGearSection('RIGGING HARDWARE', rigItems),
            'GROUND SUPPORT':   gs.hasGS          ? buildGearSection('GROUND SUPPORT', gsItems)  : null,
            'FLOOR HARDWARE':   fh.hasFloorFrames ? buildGearSection('FLOOR HARDWARE', fhItems)  : null,
            'DATA CABLES':      buildGearSection('DATA CABLES',  dcItems),
            'POWER CABLES':     buildGearSection('POWER CABLES', pcItems),
          },
          counts: {
            'EQUIPMENT':        eqItems.length,
            'RIGGING HARDWARE': rigItems.length,
            'GROUND SUPPORT':   gs.hasGS          ? gsItems.length : 0,
            'FLOOR HARDWARE':   fh.hasFloorFrames ? fhItems.length : 0,
            'DATA CABLES':      dcItems.length,
            'POWER CABLES':     pcItems.length,
          }
        });
      });

      // Row 0 = screen names, then one row per section type that any screen has. A screen
      // without that section gets an empty cell, so the next heading still lines up.
      const GEAR_SECTION_ORDER = ['EQUIPMENT', 'RIGGING HARDWARE', 'GROUND SUPPORT',
                                  'FLOOR HARDWARE', 'DATA CABLES', 'POWER CABLES'];
      const gearBody = [ screenCols.map(function(c) {
        return { text: c.name, fontSize: 9, bold: true, margin: [0, 0, colGap, 4] };
      }) ];
      var perScreenH = 18; // the screen-name row
      GEAR_SECTION_ORDER.forEach(function(title) {
        if (!screenCols.some(function(c) { return c.sections[title]; })) return;
        gearBody.push(screenCols.map(function(c) {
          const sec = c.sections[title];
          // colGap lives in the cell's right margin — pdfmake table cells have no gutter.
          return sec ? { stack: [sec], margin: [0, 0, colGap, 6] } : { text: '' };
        }));
        // A table row is as tall as its tallest cell; +6 for the cell's own bottom margin.
        perScreenH += screenCols.reduce(function(mx, c) {
          return Math.max(mx, estGearSectionHeight(c.counts[title], 1));
        }, 0) + 6;
      });

      content.push({
        table: { widths: new Array(numCols).fill('*'), body: gearBody },
        layout: {
          hLineWidth: function() { return 0; }, vLineWidth: function() { return 0; },
          paddingLeft: function() { return 0; }, paddingRight: function() { return 0; },
          paddingTop: function() { return 0; }, paddingBottom: function() { return 0; }
        },
        margin: [0, 0, 0, 12]
      });

      // Shared: Signal Cables, Utility, Spares (appear once for the whole rig)
      const sc = gearData.signalCables || {};
      const scItems = [];
      if (sc.serverFiberLine && sc.serverFiberLine.count > 0) scItems.push({ qty: sc.serverFiberLine.count, item: sc.serverFiberLine.label });
      Object.entries(sc.sdiByLength || {}).forEach(function(e) {
        if (Number(e[1]) > 0) scItems.push({ qty: e[1], item: e[0] + "' " + (sc.sdiType || 'SDI') });
      });
      Object.entries(sc.hdmi || {}).forEach(function(e) {
        if (Number(e[1]) > 0) scItems.push({ qty: e[1], item: e[0] + "' HDMI" });
      });

      const u = gearData.utility || {};
      const utilItems = [];
      if (u.ug10     > 0) utilItems.push({ qty: u.ug10,     item: "10' UG" });
      if (u.ug25     > 0) utilItems.push({ qty: u.ug25,     item: "25' UG" });
      if (u.ug50     > 0) utilItems.push({ qty: u.ug50,     item: "50' UG" });
      if (u.ugTwofers > 0) utilItems.push({ qty: u.ugTwofers, item: 'UG Twofers' });
      if (u.powerBars > 0) utilItems.push({ qty: u.powerBars, item: 'Power Bars' });

      const sp = gearData.spares || {};
      const spareItems = [];
      Object.entries(sp.panelsByType || {}).forEach(function(e) {
        if (Number(e[1]) > 0) spareItems.push({ qty: e[1], item: e[0] });
      });
      if (sp.shackles    > 0) spareItems.push({ qty: sp.shackles,    item: 'Shackles' });
      if (sp.cheeseyes   > 0) spareItems.push({ qty: sp.cheeseyes,   item: 'Cheeseyes' });
      if (sp.crossJumpers > 0 && sp.crossJumperLen) spareItems.push({ qty: sp.crossJumpers, item: sp.crossJumperLen + "' Cross Jumpers" });
      if (sp.cat5Couplers > 0) spareItems.push({ qty: sp.cat5Couplers, item: 'Cat5 Couplers' });
      Object.entries(sp.cat6ByLength || {}).forEach(function(e) {
        if (Number(e[1]) > 0) spareItems.push({ qty: e[1], item: e[0] + "' Cat6" });
      });
      if (sp.socaSplays  > 0) spareItems.push({ qty: sp.socaSplays,  item: 'Soca Splays' });
      if (sp.true1_25    > 0) spareItems.push({ qty: sp.true1_25,    item: "25' True1" });
      if (sp.true1_10    > 0) spareItems.push({ qty: sp.true1_10,    item: "10' True1" });
      if (sp.true1_5     > 0) spareItems.push({ qty: sp.true1_5,     item: "5' True1"  });
      if (sp.true1Twofer > 0) spareItems.push({ qty: sp.true1Twofer, item: 'True1 Twofer' });

      // Spares is much the longest of the three, and landscape has ~250pt less usable
      // height than portrait, so it ran off the page there. Split it over two columns
      // inside its own third of the row — one SPARES heading spanning both.
      const spareCols = orientation === 'l' ? 2 : 1;
      // w = how many column units the section takes, so a two-column SPARES keeps the
      // per-item width it had before PROCESSORS was added to this row.
      // opts.gearShared === false drops PROCESSORS / SIGNAL CABLES / UTILITY / SPARES.
      // A single screen's own gear list export wants only what belongs to that screen —
      // these four cover the whole rig, so they would misrepresent a one-screen sheet.
      const sharedSections = opts.gearShared === false ? [] : [
        procItems.length  > 0 ? { node: buildGearSection('PROCESSORS',    procItems), w: 1 } : null,
        scItems.length    > 0 ? { node: buildGearSection('SIGNAL CABLES', scItems),   w: 1 } : null,
        utilItems.length  > 0 ? { node: buildGearSection('UTILITY',       utilItems), w: 1 } : null,
        spareItems.length > 0 ? { node: buildGearSection('SPARES',        spareItems, spareCols), w: spareCols } : null,
      ].filter(Boolean);

      if (sharedSections.length > 0) {
        // If the shared row cannot follow the per-screen table on this page, start a fresh
        // one explicitly. Letting pdfmake break here instead would produce a page with no
        // report header, because headers are pushed into the content per page.
        const sharedH = Math.max(
          estGearSectionHeight(procItems.length, 1),
          estGearSectionHeight(scItems.length, 1),
          estGearSectionHeight(utilItems.length, 1),
          estGearSectionHeight(spareItems.length, spareCols)
        );
        const gearHdrH = m.headerBarH + m.afterHeaderGap + m.sectionLabelH + m.afterLabelGap;
        if (gearHdrH + perScreenH + 12 + sharedH > uh) {
          content.push({ text: '', pageBreak: 'before' });
          content.push(buildPdfHeader(configName, dateStr, logoData));
          content.push(sectionLabel('Gear List — Shared'));
        }

        const sharedUnits = sharedSections.reduce(function(t, sec) { return t + sec.w; }, 0);
        const sharedColW = Math.floor((cw - 8 * (sharedSections.length - 1)) / sharedUnits);
        const sharedCols = [];
        sharedSections.forEach(function(sec, i) {
          if (i > 0) sharedCols.push({ width: 8, text: '' });
          sharedCols.push({ stack: [sec.node], width: sharedColW * sec.w });
        });
        content.push({ columns: sharedCols, columnGap: 0 });
      }
    }
  }

  // ===== COMBINED-VIEW LAYOUT PAGES =====
  // Opt-in only (=== true, not !== false): every existing caller leaves these
  // undefined, so the report they get today is unchanged.

  // The per-screen tables the combined view shows below its canvas in the app.
  // Each screen contributes a name heading plus its own card table, reusing the
  // same builders the per-screen layout pages use — so a screen's SOCA card reads
  // identically whether you find it on its own page or on the combined one.
  function combinedInfoStack(kind, sids) {
    // Power and structure run three screens across, with each screen's cards
    // stacked inside its own block — a card at a third of the page is still wide
    // enough for "2W #1: 265 lbs", and three screens to a row costs a third of the
    // height that stacking them did. The data map keeps one screen per row: its
    // Mains/Backups pair is already two cards wide.
    const perRow = (kind === 'data') ? 1 : 3;

    const blocks = [];
    sids.forEach(function(sid) {
      let node = null, h = 0;
      if (kind === 'data')           { node = buildDataLineMapTable(sid);                     h = estDataMapHeight(sid); }
      else if (kind === 'power')     { node = buildSocaCircuitTable(sid, 1);                  h = estSocaTableHeight(sid, 1); }
      else if (kind === 'structure') { node = buildStructureInfoPdf(sid, canvasCache, 1);     h = estStructureInfoHeight(sid, canvasCache, 1); }
      if (!node) return;
      const sc = screens[sid];
      blocks.push({ name: ((sc && sc.name) ? sc.name : sid).toUpperCase(), node: node, h: h });
    });
    if (!blocks.length) return null;

    function heading(text) {
      return { text: text, fontSize: 8, bold: true, color: tc.textMuted, margin: [0, 6, 0, 2] };
    }

    const stack = [];
    let est = 0;
    if (perRow === 1) {
      blocks.forEach(function(b) {
        stack.push(heading(b.name));
        stack.push(b.node);
        est += b.h + 16; // + heading and its margins
      });
    } else {
      for (let i = 0; i < blocks.length; i += perRow) {
        const row = blocks.slice(i, i + perRow);
        const cells = [];
        for (let k = 0; k < perRow; k++) {
          const b = row[k];
          cells.push(b
            ? { width: '*', stack: [heading(b.name), b.node] }
            : { width: '*', text: '' });
        }
        stack.push({ columns: cells, columnGap: 10 });
        // A row is as tall as its tallest screen.
        est += row.reduce(function(mx, b) { return Math.max(mx, b.h); }, 0) + 18;
      }
    }
    return { stack: stack, est: est };
  }

  [
    { flag: opts.combinedStandard,  key: 'combined_standard',  title: 'Standard Layout (Combined)' },
    { flag: opts.combinedPower,     key: 'combined_power',     title: 'Power Layout (Combined)',     tables: 'power' },
    { flag: opts.combinedData,      key: 'combined_data',      title: 'Data Layout (Combined)',      tables: 'data' },
    { flag: opts.combinedStructure, key: 'combined_structure', title: 'Structure Layout (Combined)', tables: 'structure' },
    { flag: opts.combinedCabling,   key: 'combined_cabling',   title: 'Cabling Layout (Combined)' }
  ].filter(function(cp) { return cp.flag === true; }).forEach(function(cp) {
    const img = canvasCache && canvasCache[cp.key];
    if (!img || !img.dataUrl) return;

    if (content.length > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(buildPdfHeader(configName, dateStr, logoData));
    content.push(sectionLabel(cp.title));

    const info = cp.tables ? combinedInfoStack(cp.tables, screenIds) : null;

    // Fill the page width, then shrink to fit whatever height is left under the
    // report header and the section label. A page carrying tables hands them exactly
    // the height they need and keeps the rest for the layout, so the whole view fits
    // on one page. MIN_LAYOUT_H is the floor — past it the layout stops being
    // readable, and the tables spill to a second page below rather than shrink it
    // further.
    const overhead = m.headerBarH + m.afterHeaderGap + m.sectionLabelH + m.afterLabelGap + 12;
    const tablesH = info ? info.est : 0;
    const MIN_LAYOUT_H = 150;
    const maxH = Math.max(MIN_LAYOUT_H, uh - overhead - tablesH);
    const aspect = img.aspectRatio || 1;
    let renderWidth = cw;
    let renderHeight = Math.round(renderWidth * aspect);
    if (renderHeight > maxH) {
      renderHeight = maxH;
      renderWidth = Math.round(renderHeight / aspect);
    }
    content.push({
      image: img.dataUrl,
      width: renderWidth, height: renderHeight,
      alignment: 'center',
      margin: [0, 0, 0, 4]
    });

    if (info) {
      // Break explicitly when the tables can't share the page. Letting pdfmake
      // break here instead would produce a page with no report header, because
      // headers are pushed into the content per page.
      if (overhead + renderHeight + tablesH > uh) {
        content.push({ text: '', pageBreak: 'before' });
        content.push(buildPdfHeader(configName, dateStr, logoData));
        content.push(sectionLabel(cp.title));
      }
      content.push({ stack: info.stack });
    }
  });

  return {
    pageSize:        (format === 'letter') ? 'LETTER' : 'A4',
    pageOrientation: orientation === 'l' ? 'landscape' : 'portrait',
    pageMargins:     [m.pageMarginLeft, m.pageMarginTop, m.pageMarginRight, m.pageMarginBottom],
    content:         content,
    footer: function(currentPage, pageCount) {
      return { text: 'Page ' + currentPage + ' of ' + pageCount,
        fontSize: 8, color: tc.textFaint, alignment: 'center', margin: [0, 4, 0, 4] };
    },
    defaultStyle:    { font: 'Roboto', fontSize: 9, color: tc.textPrimary }
  };
}

// ==================== END NEW LAYOUT ENGINE BUILDERS ====================

function getPdfColors() {
  if (typeof greyscalePrintMode !== 'undefined' && greyscalePrintMode) {
    return { accent: '#555', headerBg: '#555', headerText: '#fff', rowAlt: '#f0f0f0', text: '#333', bannerText: '#fff' };
  }
  if (typeof ecoPrintMode !== 'undefined' && ecoPrintMode) {
    return { accent: '#6b7280', headerBg: '#6b7280', headerText: '#fff', rowAlt: '#f5f5f5', text: '#333', bannerText: '#fff' };
  }
  return { accent: '#10b981', headerBg: '#10b981', headerText: '#fff', rowAlt: '#f0fdf4', text: '#111', bannerText: '#111' };
}

function pdfSectionBar(text, colors) {
  return {
    table: {
      widths: [3, '*'],
      body: [[
        { text: '', fillColor: colors.accent, border: [false, false, false, false] },
        { text: text.toUpperCase(), bold: true, fontSize: 10, color: colors.text,
          margin: [6, 3, 0, 3], border: [false, false, false, false] }
      ]]
    },
    layout: 'noBorders',
    margin: [0, 8, 0, 4]
  };
}

function pdfBuildGearRows(sd) {
  const rows = [];
  if (!sd) return rows;
  const eq = sd.equipment;
  const rig = sd.rigging;
  const gs = sd.groundSupport;
  const fh = sd.floorHardware;
  const dc = sd.dataCables;
  const pc = sd.powerCables;
  const p2d = sd.processorToDistBox;

  function addRow(qty, item) {
    const n = Number(qty);
    if (!qty || isNaN(n) || n <= 0) return;
    rows.push({ qty: String(Math.ceil(n)), item: String(item) });
  }
  function addHeader(title) {
    rows.push({ qty: '', item: title, isHeader: true });
  }

  if (eq) {
    addHeader('EQUIPMENT');
    if (eq.isFirstScreenInGroup && eq.processorCount > 0) {
      addRow(eq.processorCount, eq.processorName);
      if (eq.distBoxCount > 0) addRow(eq.distBoxCount, eq.distBoxName);
    }
    addRow(eq.activeFullPanels, `${eq.panelBrand} ${eq.panelName}`);
    if (eq.activeHalfPanels > 0) addRow(eq.activeHalfPanels, `${eq.panelBrand} ${eq.halfPanelName}`);
  }

  if (rig && rig.hasRigging) {
    addHeader('RIGGING');
    addRow(rig.bumper1w, '1W Bumpers');
    addRow(rig.bumper2w, '2W Bumpers');
    addRow(rig.bumper4w, '4W Bumpers');
    addRow(rig.plates4way, '4W Connecting Plates');
    addRow(rig.plates2way, '2W Connecting Plates');
    addRow(rig.shackles, '5/8" Shackles');
    addRow(rig.cheeseye, 'Cheeseye');
  }

  if (gs && gs.hasGS) {
    addHeader('GROUND SUPPORT');
    addRow(gs.rearTruss, 'Rear Truss');
    addRow(gs.baseTruss, 'Base Truss');
    addRow(gs.bridgeClamps, 'Bridge Clamps');
    addRow(gs.rearBridgeAdapters, 'Rear Bridge Adapter');
    addRow(gs.sandbags, 'Sandbags');
    addRow(gs.swivelCheeseboroughs, 'Swivel Cheeseborough');
    if (gs.pipes > 0) addRow(gs.pipes, `Pipe${gs.pipeLengthStr || ''}`);
  }

  if (fh && fh.hasFloorFrames) {
    addHeader('FLOOR HARDWARE');
    addRow(fh.frame3x2, '3x2 Frame');
    addRow(fh.frame2x2, '2x2 Frame');
    addRow(fh.frame2x1, '2x1 Frame');
    addRow(fh.frame1x1, '1x1 Frame');
  }

  if (dc) {
    addHeader('DATA CABLES');
    addRow(dc.jumperCount, `Jumpers ${dc.dataJumperLen}'`);
    if (dc.crossJumperLen && dc.crossJumperCount > 0) addRow(dc.crossJumperCount, `Cross Jumpers ${dc.crossJumperLen}'`);
    if (dc.jumpersBuiltin && dc.cat5CouplerCount > 0) addRow(dc.cat5CouplerCount, 'Cat5 Couplers');
    const cat6Lengths = Object.entries(dc.cat6ByLength || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
    for (const [len, count] of cat6Lengths) {
      if (count > 0) addRow(count, `${len}' Cat6`);
    }
    if (p2d && p2d.count > 0) {
      addRow(p2d.count, p2d.cableType === 'Fiber'
        ? `Fiber OpticalCON ${p2d.cableLength}'`
        : `CAT6A EtherCON ${p2d.cableLength}'`);
    }
  }

  if (pc) {
    addHeader('POWER CABLES');
    addRow(pc.jumperCount, `Jumpers ${pc.powerJumperLen}'`);
    addRow(pc.socaSplays, 'Soca Splays');
    const socaLengths = Object.entries(pc.socaByLength || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
    for (const [len, count] of socaLengths) {
      if (count > 0) addRow(count, `Soca ${len}'`);
    }
    addRow(pc.true1_25, "25' True1");
    addRow(pc.true1_10, "10' True1");
    addRow(pc.true1_5, "5' True1");
    addRow(pc.true1Twofer, 'True1 Twofer');
  }

  return rows;
}

function pdfBuildGearTable(rows, colors) {
  if (!rows || rows.length === 0) return { text: 'No gear data', fontSize: 8, color: '#999' };

  const body = [[
    { text: 'QTY', bold: true, fillColor: colors.headerBg, color: colors.headerText, fontSize: 8, alignment: 'center' },
    { text: 'ITEM', bold: true, fillColor: colors.headerBg, color: colors.headerText, fontSize: 8 }
  ]];

  let dataRowIndex = 0;
  rows.forEach(row => {
    if (row.isHeader) {
      body.push([
        { text: '', border: [false, false, false, false], margin: [0, 3, 0, 0] },
        { text: row.item, bold: true, fontSize: 7, color: '#777',
          margin: [0, 3, 0, 0], border: [false, false, false, false] }
      ]);
    } else {
      const fill = (dataRowIndex % 2 === 0) ? colors.rowAlt : '#fff';
      dataRowIndex++;
      body.push([
        { text: row.qty, alignment: 'center', fontSize: 8, fillColor: fill },
        { text: row.item, fontSize: 8, fillColor: fill }
      ]);
    }
  });

  return {
    table: { headerRows: 1, widths: [25, '*'], body: body },
    layout: {
      hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0.5 : 0.3,
      vLineWidth: () => 0,
      hLineColor: () => '#ddd',
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 2,
      paddingBottom: () => 2
    }
  };
}

// Builds the data line / backup start-panel mapping table for the PDF. Styled to
// match the structure info cards (grey-filled boxed cards, underlined bold title,
// item lines). Reads per-screen endpoints stashed by renderDataLayout().
function buildDataLineMapTable(screenId) {
  const screen = screens[screenId];
  const endpoints = screen && screen.calculatedData && screen.calculatedData.dataLineEndpoints;
  if (!endpoints || endpoints.length === 0) return null;
  const redundancy = !!(screen.data && screen.data.redundancy);
  const tc = PDF_TOKENS.colors;
  const fmt = (p) => p ? (p.c + 1) + '.' + (p.r + 1) : '—';

  // One card = underlined title + a four-column table:
  // data line, panel, the processor/distribution box it lands on, and the port.
  function buildCard(title, rows) {
    const titleEl = {
      text: title,
      fontSize: 9, bold: true, color: '#000000',
      decoration: 'underline', decorationColor: '#000000',
      margin: [0, 0, 0, 4]
    };
    const head = ['Line', 'Panel', 'Unit', 'Port'].map(h => ({
      text: h, fontSize: 6, color: tc.textSecondary, bold: false
    }));
    const body = [head].concat(rows.map(function(r) {
      return [
        { text: r.line, fontSize: 8, bold: true, color: '#000000' },
        { text: r.panel, fontSize: 8, color: tc.textSecondary },
        { text: r.unit || '\u2014', fontSize: 8, color: tc.textSecondary },
        { text: (r.port === null || r.port === undefined) ? '\u2014' : String(r.port),
          fontSize: 8, bold: true, color: '#000000' }
      ];
    }));
    const table = {
      table: { widths: ['auto', 'auto', 'auto', 'auto'], body: body },
      layout: {
        hLineWidth: (i) => (i === 1 ? 0.5 : 0),
        vLineWidth: () => 0,
        hLineColor: () => tc.sectionBorder,
        paddingLeft: (i) => (i === 0 ? 0 : 5),
        paddingRight: () => 0,
        paddingTop: () => 1.5,
        paddingBottom: () => 1.5
      }
    };
    return { stack: [titleEl, table], margin: [6, 6, 6, 6] };
  }

  // Destination parts per main line, so the printed map matches the app's map.
  const partsFor = (line) => {
    return (typeof dataLineDestinationParts === 'function')
      ? dataLineDestinationParts(screenId, line) : null;
  };

  const lineDisplay = (typeof dataPortLineDisplayMap === 'function')
    ? dataPortLineDisplayMap(screenId) : new Map();
  const shownLine = (line) => lineDisplay.has(line) ? lineDisplay.get(line) : line;

  const cards = [ buildCard('Mains', endpoints.map(ep => {
    const d = partsFor(ep.line);
    return { line: String(shownLine(ep.line)), panel: fmt(ep.main),
             unit: d ? d.unit : '', port: d ? d.port : null };
  })) ];
  if (redundancy) {
    cards.push(buildCard('Backups', endpoints.map(ep => {
      const d = partsFor(ep.line);
      return { line: shownLine(ep.line) + 'B', panel: fmt(ep.backup),
               unit: d ? d.backupUnit : '', port: d ? d.backupPort : null };
    })));
  }
  const perRow = pdfCurrentCardsPerRow();
  while (cards.length < perRow) cards.push(null);

  const cells = cards.map(function(c) {
    return {
      stack: c ? [c] : [{ text: ' ', fontSize: 4 }],
      fillColor: tc.summaryBg,
      border: [true, true, true, true],
      borderColor: [tc.sectionBorder, tc.sectionBorder, tc.sectionBorder, tc.sectionBorder]
    };
  });
  return {
    table: { widths: new Array(perRow).fill('*'), body: [cells] },
    layout: {
      hLineWidth: () => 0.5, vLineWidth: () => 0.5,
      hLineColor: () => tc.sectionBorder, vLineColor: () => tc.sectionBorder,
      paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0
    },
    margin: [0, 6, 0, 4]
  };
}

// Builds the SOCA circuit-load table for the PDF power layout. Styled to match
// buildDataLineMapTable / the structure info cards: one grey boxed card per SOCA
// listing each circuit's amps and the SOCA total, packed 4 cards per row. Reads
// the per-screen breakdown stashed in calculatedData by calculate().
function buildSocaCircuitTable(screenId, perRowOverride) {
  const screen = screens[screenId];
  const cd = screen && screen.calculatedData;
  const sb = cd && cd.socaBreakdown;
  if (!sb || !sb.length) return null;
  const tc = PDF_TOKENS.colors;

  // Share Distro: continuous SOCA numbering across the group (calculatedData.socaLabelMap).
  const labelMap = (cd && Array.isArray(cd.socaLabelMap)) ? new Map(cd.socaLabelMap) : null;
  const socaLabelIdx = idx => (labelMap && labelMap.has(idx)) ? labelMap.get(idx) : idx;
  const fmtLabel = idx => (typeof formatSocaLabel === 'function') ? formatSocaLabel(idx) : (idx + 1);

  // One card = underlined "SOCA N" title + circuit "N.x  amps" lines + a bold total.
  function buildCard(soca) {
    const label = fmtLabel(socaLabelIdx(soca.socaIdx));
    const titleEl = {
      text: 'SOCA ' + label,
      fontSize: 9, bold: true, color: '#000000',
      decoration: 'underline', decorationColor: '#000000',
      margin: [0, 0, 0, 4]
    };
    const circuitEls = soca.circuits.map(function(c) {
      return {
        text: [
          { text: label + '.' + ((c.circuit % 6) + 1), bold: true, color: '#000000' },
          { text: '   ' + c.amps.toFixed(1) + ' A', color: tc.textSecondary }
        ],
        fontSize: 8, lineHeight: 1.3
      };
    });
    const totalEl = {
      text: [
        { text: 'Total', bold: true, color: '#000000' },
        { text: '   ' + soca.totalAmps.toFixed(1) + ' A', bold: true, color: '#000000' }
      ],
      fontSize: 8, lineHeight: 1.3, margin: [0, 2, 0, 0]
    };
    return { stack: [titleEl].concat(circuitEls).concat([totalEl]), margin: [6, 6, 6, 6] };
  }

  // Pack N cards per row (width-aware, so a card is the same size in landscape as in
  // portrait); pad the last row with blanks to keep equal widths. perRowOverride lets
  // the combined page pack 2 across instead of leaving half a row of empty cells.
  const perRow = perRowOverride || pdfCurrentCardsPerRow();
  const body = [];
  for (let r = 0; r < sb.length; r += perRow) {
    const row = [];
    for (let k = 0; k < perRow; k++) {
      const soca = sb[r + k];
      row.push({
        stack: soca ? [buildCard(soca)] : [{ text: ' ', fontSize: 4 }],
        fillColor: tc.summaryBg,
        border: [true, true, true, true],
        borderColor: [tc.sectionBorder, tc.sectionBorder, tc.sectionBorder, tc.sectionBorder]
      });
    }
    body.push(row);
  }

  return {
    table: { widths: new Array(perRow).fill('*'), body: body },
    layout: {
      hLineWidth: () => 0.5, vLineWidth: () => 0.5,
      hLineColor: () => tc.sectionBorder, vLineColor: () => tc.sectionBorder,
      paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0
    },
    margin: [0, 6, 0, 4]
  };
}

// Height (pt) of one card in the PDF's grey card tables (SOCA circuits, data
// map, structure info). All three share a shape: an outer 6pt card margin, an
// underlined 9pt title with a 4pt bottom margin, then one 8pt/1.3 line per item.
// These feed the layout image-height budget, so they must never read LOW — an
// under-estimate is what pushes a table onto the following page.
function estCardHeight(itemLines) {
  const TITLE_H = 9 * 1.3 + 4;  // title text + its bottom margin
  const LINE_H  = 8 * 1.3;      // one item row
  const CARD_PAD = 6 + 6;       // card margin top + bottom
  return TITLE_H + Math.max(0, itemLines) * LINE_H + CARD_PAD;
}
// Per-row table chrome: the row table's own margin [0,6,0,4] plus its 0.5pt borders.
const EST_ROW_CHROME = 11;

// Height (pt) of one gear-list section: the coloured header bar, then one row per item
// (or per row of items when split across columns), plus the section's bottom margin.
// Calibrated against measured output — a section header runs 18pt and an item row 13pt,
// the odd row going to 15pt when a long name wraps.
function estGearSectionHeight(itemCount, bodyColumns) {
  const HEADER_H = 18;
  const ROW_H    = 13;
  const cols = Math.max(1, bodyColumns || 1);
  if (!itemCount) return 0;
  return HEADER_H + Math.ceil(itemCount / cols) * ROW_H + 6;
}

// Cards per row for those tables at the page size currently selected in the preview.
function pdfCurrentCardsPerRow() {
  const dims = pdfGetPageDimensions(
    (typeof pdfPageFormat !== 'undefined' && pdfPageFormat) || 'a4',
    (typeof pdfPageOrientation !== 'undefined' && pdfPageOrientation) || 'p'
  );
  return pdfCardsPerRow(dims.contentWidth);
}

// Height (pt) of the SOCA circuit table — used to decide PDF page layout.
function estSocaTableHeight(screenId, perRowOverride) {
  const cd = screens[screenId] && screens[screenId].calculatedData;
  const sb = cd && cd.socaBreakdown;
  if (!sb || !sb.length) return 0;
  const rows = Math.ceil(sb.length / (perRowOverride || pdfCurrentCardsPerRow()));
  const maxCircuits = sb.reduce((mx, s) => Math.max(mx, (s.circuits || []).length), 0);
  // +1 line for the bold "Total" row, +2 for its top margin.
  const cardH = estCardHeight(maxCircuits + 1) + 2;
  return Math.ceil(rows * cardH + EST_ROW_CHROME);
}

// Height (pt) of the data-line map table — used to decide PDF page layout.
function estDataMapHeight(screenId) {
  const cd = screens[screenId] && screens[screenId].calculatedData;
  const eps = cd && cd.dataLineEndpoints;
  if (!eps || !eps.length) return 0;
  // +1 for the Line/Panel/Unit/Port header row, +3pt for the table's own row
  // padding. This budget must never read LOW or the table spills onto the next page.
  return Math.ceil(estCardHeight(eps.length + 1) + EST_ROW_CHROME + 3);
}

// Height (pt) of the structure info cards. Mirrors buildStructureInfoPdf: the flat
// line list is split into tables at each header, packed N per row, one row table each.
function estStructureInfoHeight(screenId, canvasCache, perRowOverride) {
  const lines = _structureInfoLinesFor(screenId, canvasCache);
  if (!lines || !lines.length) return 0;
  const tables = [];
  let current = null;
  lines.forEach(function(l) {
    if (l.header) { if (current) tables.push(current); current = { items: 0, bold: 0 }; }
    else if (current && l.text) { current.items++; if (l.bold) current.bold++; }
  });
  if (current) tables.push(current);
  if (!tables.length) return 0;
  let h = 0;
  const perRow = perRowOverride || pdfCurrentCardsPerRow();
  for (let i = 0; i < tables.length; i += perRow) {
    const row = tables.slice(i, i + perRow);
    // Row height is the tallest card in it; bold items carry an extra 4pt top margin.
    h += row.reduce(function(mx, t) {
      return Math.max(mx, estCardHeight(t.items) + t.bold * 4);
    }, 0) + EST_ROW_CHROME;
  }
  return Math.ceil(h);
}

// Capture the combined-view canvases into the same { dataUrl, aspectRatio }
// cache shape pdfCaptureCanvases() produces, keyed combined_<layout>.
//
// Unlike the per-screen pass this cannot switch screens — the combined canvases
// are drawn by renderCombinedView() from the whole selection at once, so the
// save/restore below has to cover everything that render touches: the selection,
// the two data-label toggles, and each screen's own dataLineLabels all have to be
// put back or the on-screen view is left altered.
// callback(cache)
function pdfCaptureCombinedCanvases(callback) {
  var restoreState = null;
  try {
    if (typeof screens === 'undefined') { callback({}); return; }
    var screenIds = Object.keys(screens).sort(function(a, b) {
      return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
    });
    if (screenIds.length < 2) { callback({}); return; }
    if (typeof renderCombinedView !== 'function' || typeof combinedSelectedScreens === 'undefined') {
      callback({}); return;
    }

    var savedSet = null;
    if (combinedSelectedScreens.size < 2) {
      savedSet = new Set(combinedSelectedScreens);
      combinedSelectedScreens.clear();
      screenIds.forEach(function(id) { combinedSelectedScreens.add(id); });
    }
    var selectedIds = Array.from(combinedSelectedScreens);

    var combinedContainer = document.getElementById('combinedContainer');
    var savedCombinedDisplay = combinedContainer ? combinedContainer.style.display : null;
    if (combinedContainer) combinedContainer.style.display = 'block';

    var savedUnitLabels = (typeof dataUnitLabelsEnabled !== 'undefined') ? dataUnitLabelsEnabled : true;
    var savedLineLabelsGlobal = (typeof dataLineLabelsEnabled !== 'undefined') ? dataLineLabelsEnabled : false;
    var savedLineLabelsByScreen = {};
    selectedIds.forEach(function(id) {
      var d = screens[id] && screens[id].data;
      if (d) savedLineLabelsByScreen[id] = d.dataLineLabels;
    });

    restoreState = function() {
      if (typeof dataUnitLabelsEnabled !== 'undefined') dataUnitLabelsEnabled = savedUnitLabels;
      if (typeof dataLineLabelsEnabled !== 'undefined') dataLineLabelsEnabled = savedLineLabelsGlobal;
      Object.keys(savedLineLabelsByScreen).forEach(function(id) {
        var d = screens[id] && screens[id].data;
        if (d) d.dataLineLabels = savedLineLabelsByScreen[id];
      });
      if (savedSet) {
        combinedSelectedScreens.clear();
        savedSet.forEach(function(id) { combinedSelectedScreens.add(id); });
      }
      if (combinedContainer && savedCombinedDisplay !== null) combinedContainer.style.display = savedCombinedDisplay;
      if (combinedSelectedScreens.size > 0) {
        try { renderCombinedView(); } catch(e) {}
      }
    };

    // The combined canvases paint a dark surround in the app, which reads as a
    // black box on the white PDF page. pdfWhiteBgMode is the existing print
    // rendering — white ground, dark labels — and covers all five canvases,
    // including the cable diagram (renderCombinedView draws that one too).
    var savedWhiteBg = (typeof pdfWhiteBgMode !== 'undefined') ? pdfWhiteBgMode : false;
    if (typeof pdfWhiteBgMode !== 'undefined') pdfWhiteBgMode = true;
    try { renderCombinedView(); } catch(e) { console.error('renderCombinedView failed:', e); }
    if (typeof pdfWhiteBgMode !== 'undefined') pdfWhiteBgMode = savedWhiteBg;

    var _isMobile = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
      (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

    var cache = {};
    [
      { id: 'combinedStandardCanvas',     key: 'combined_standard' },
      { id: 'combinedPowerCanvas',        key: 'combined_power' },
      { id: 'combinedDataCanvas',         key: 'combined_data' },
      { id: 'combinedStructureCanvas',    key: 'combined_structure' },
      { id: 'combinedCableDiagramCanvas', key: 'combined_cabling', png: true }
    ].forEach(function(cap) {
      var canvas = document.getElementById(cap.id);
      if (!(canvas && canvas.width > 0 && canvas.height > 0)) return;
      var useAspect = canvas.height / canvas.width;
      if (_isMobile) {
        cache[cap.key] = {
          dataUrl: cap.png ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.92),
          aspectRatio: useAspect
        };
      } else {
        var hiRes = document.createElement('canvas');
        hiRes.width  = canvas.width  * 2;
        hiRes.height = canvas.height * 2;
        hiRes.getContext('2d').drawImage(canvas, 0, 0, hiRes.width, hiRes.height);
        cache[cap.key] = {
          dataUrl: cap.png ? hiRes.toDataURL('image/png') : hiRes.toDataURL('image/jpeg', 0.92),
          aspectRatio: useAspect
        };
        hiRes.width = hiRes.height = 0;
      }
    });

    restoreState();
    callback(cache);
  } catch(e) {
    console.error('pdfCaptureCombinedCanvases error:', e);
    if (restoreState) { try { restoreState(); } catch(e2) {} }
    callback({});
  }
}

// captureOpts (optional) narrows the work for a single-view quick export:
//   { screenIds: [...], canvasIds: [...] }
// Omitted = every screen and all five canvases, which is what the full report
// and Export All rely on.
function pdfCaptureCanvases(captureOpts) {
  captureOpts = captureOpts || {};
  const cache = {};
  // On phones/tablets, capture layout images at 1x instead of 2x to keep peak
  // memory low enough for Export All to survive (see the per-canvas branch below).
  const _pdfCaptureIsMobile = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
    (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  const originalScreenId = currentScreenId;
  const allScreenIds = Object.keys(screens).sort((a, b) =>
    parseInt(a.split('_')[1]) - parseInt(b.split('_')[1])
  );
  const screenIds = (captureOpts.screenIds && captureOpts.screenIds.length)
    ? allScreenIds.filter(id => captureOpts.screenIds.indexOf(id) !== -1)
    : allScreenIds;
  const wantCanvas = (id) => !captureOpts.canvasIds || captureOpts.canvasIds.indexOf(id) !== -1;

  // captureOpts.dataLabels forces the data layout's line labels for this pass
  // ('on' | 'off') so Export All can capture both variants. switchToScreen()
  // reloads dataLineLabelsEnabled from each screen's saved value, so the
  // per-screen values have to move with the global — the global alone would be
  // overwritten on the first switch. Unit labels are deliberately left alone:
  // they only affect the combined data canvas and persist to localStorage.
  let restoreDataLabels = null;
  if (captureOpts.dataLabels === 'on' || captureOpts.dataLabels === 'off') {
    const wantLabels = (captureOpts.dataLabels === 'on');
    const savedLineGlobal = (typeof dataLineLabelsEnabled !== 'undefined') ? dataLineLabelsEnabled : false;
    const savedLineByScreen = {};
    allScreenIds.forEach(function(id) {
      const d = screens[id] && screens[id].data;
      if (d) { savedLineByScreen[id] = d.dataLineLabels; d.dataLineLabels = wantLabels; }
    });
    if (typeof dataLineLabelsEnabled !== 'undefined') dataLineLabelsEnabled = wantLabels;
    restoreDataLabels = function() {
      if (typeof dataLineLabelsEnabled !== 'undefined') dataLineLabelsEnabled = savedLineGlobal;
      Object.keys(savedLineByScreen).forEach(function(id) {
        const d = screens[id] && screens[id].data;
        if (d) d.dataLineLabels = savedLineByScreen[id];
      });
      const btn = document.getElementById('dataLineLabelsBtn');
      if (btn) { btn.classList.toggle('active', savedLineGlobal); btn.textContent = savedLineGlobal ? 'On' : 'Off'; }
    };
  }

  const mainContainer = document.querySelector('.main-container');
  const mainWasHidden = mainContainer && mainContainer.style.display === 'none';
  if (mainContainer) mainContainer.style.display = 'block';

  // gearListContainer is the parent of cableDiagramContainer — must be visible so clientWidth > 0
  const containerIds = ['standardContainer', 'powerContainer', 'dataContainer', 'structureContainer', 'gearListContainer', 'cableDiagramContainer'];
  const savedDisplay = {};
  containerIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) { savedDisplay[id] = el.style.display; el.style.display = 'block'; }
  });
  if (mainContainer) void mainContainer.offsetWidth;

  // Set layout containers to 4000px so generateLayout renders at maxSize (80px panels)
  // instead of being limited by the 800px canvas cap. Normal rendering is unaffected.
  const layoutContainerIds = ['standardContainer', 'powerContainer', 'dataContainer', 'structureContainer'];
  const savedLayoutWidths = {};
  layoutContainerIds.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) { savedLayoutWidths[id] = el.style.width; el.style.width = '4000px'; }
  });
  pdfMultiScreenCapture = screenIds.length > 1;
  pdfLayoutCaptureMode = true;
  void (document.getElementById('standardContainer') || document.body).offsetWidth; // force reflow

  // Stash expected max layout height (pt) so layouts can compute markerFont consistently.
  // gridImage caps tall layouts at this height — without it, height-capped canvases would
  // get scaled down by pdfmake, shrinking their markers relative to width-fit canvases.
  try {
    const _fmt = pdfPageFormat || 'a4';
    const _orient = pdfPageOrientation || 'p';
    const _dims = pdfGetPageDimensions(_fmt, _orient);
    const _m = PDF_TOKENS.layout;
    const _layoutOverhead = _m.headerBarH + _m.afterHeaderGap + 2 * _m.sectionLabelH + 2 * _m.afterLabelGap + 2 * 4 + 20;
    window._pdfLayoutMaxHeightPt = Math.floor((_dims.usableHeight - _layoutOverhead) / 3);
  } catch(e) {
    window._pdfLayoutMaxHeightPt = 230;
  }

  screenIds.forEach(screenId => {
    switchToScreen(screenId);
    generateLayout('standard');
    generateLayout('power');
    generateLayout('data');
    generateStructureLayout();
    if (wantCanvas('cableDiagramCanvas')) {
      const cableContainer = document.getElementById('cableDiagramContainer');
      const savedCableWidth = cableContainer ? cableContainer.style.width : null;
      if (cableContainer) {
        cableContainer.style.width = '1400px';
        void cableContainer.offsetWidth; // force reflow so clientWidth updates before renderCableDiagram reads it
      }
      cableDiagramPdfMode = true;
      if (typeof renderCableDiagram === 'function') renderCableDiagram(screenId);
      cableDiagramPdfMode = false;
      if (cableContainer && savedCableWidth !== null) cableContainer.style.width = savedCableWidth;
      else if (cableContainer) cableContainer.style.width = '';
    }

    [
      { id: 'standardCanvas',     key: screenId + '_standard' },
      { id: 'powerCanvas',        key: screenId + '_power' },
      { id: 'dataCanvas',         key: screenId + '_data' },
      { id: 'structureCanvas',    key: screenId + '_structure' },
      { id: 'cableDiagramCanvas', key: screenId + '_cabling' }
    ].filter(cap => wantCanvas(cap.id)).forEach(cap => {
      const canvas = document.getElementById(cap.id);
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const isPng = cap.id === 'cableDiagramCanvas';
        const useAspect = canvas.height / canvas.width;
        if (_pdfCaptureIsMobile) {
          // Mobile: export the source canvas at 1x. The 2x upscale below creates
          // very large canvases that exhaust memory during Export All (5 per
          // screen × all screens). Images are slightly softer but every section
          // and screen is still present. Desktop keeps 2x for crisp text.
          cache[cap.key] = {
            dataUrl: isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.92),
            aspectRatio: useAspect
          };
        } else {
          // Render at 2x resolution to prevent blurry text in PDF
          const scale = 2;
          const hiRes = document.createElement('canvas');
          hiRes.width  = canvas.width  * scale;
          hiRes.height = canvas.height * scale;
          const ctx = hiRes.getContext('2d');
          ctx.drawImage(canvas, 0, 0, hiRes.width, hiRes.height);
          cache[cap.key] = {
            dataUrl: isPng ? hiRes.toDataURL('image/png') : hiRes.toDataURL('image/jpeg', 0.92),
            aspectRatio: useAspect
          };
          // Release the temporary 2x canvas immediately so it doesn't linger until GC.
          hiRes.width = hiRes.height = 0;
        }
      }
    });
    // Structure info has to be collected HERE, inside the per-screen switch.
    // buildStructureInfoLines() takes a screenId but its helpers read the live
    // panelType/bumperDistribution inputs and the global bumpers array, all of
    // which only ever describe the screen that is currently open — so calling it
    // later, at build time, returns the open screen's weights for every screen.
    if (typeof buildStructureInfoLines === 'function') {
      cache[screenId + '_structureInfo'] = buildStructureInfoLines(screenId);
    }

    // Store SOCA bar fraction for power image so pdf.js can equalize grid height with data
    if (typeof _pdfPowerSocaFraction !== 'undefined' && cache[screenId + '_power']) {
      cache[screenId + '_power'].socaBarFraction = _pdfPowerSocaFraction;
    }
  });

  // Restore layout container widths and capture mode flags
  pdfLayoutCaptureMode = false;
  pdfMultiScreenCapture = false;
  try { delete window._pdfLayoutMaxHeightPt; } catch(e) { window._pdfLayoutMaxHeightPt = undefined; }
  layoutContainerIds.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.style.width = savedLayoutWidths[id] !== undefined ? savedLayoutWidths[id] : '';
  });

  switchToScreen(originalScreenId);
  if (restoreDataLabels) restoreDataLabels();
  containerIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && savedDisplay[id] !== undefined) el.style.display = savedDisplay[id];
  });
  if (mainWasHidden && mainContainer) mainContainer.style.display = 'none';

  return cache;
}

function buildPdfDocDefinition(opts, canvasCache) {
  const colors = getPdfColors();
  const screenIds = Object.keys(screens).sort((a, b) =>
    parseInt(a.split('_')[1]) - parseInt(b.split('_')[1])
  );
  const gearData = buildGearListData(screenIds);
  const allPanelsData = getAllPanels();

  const isLandscape = pdfPageOrientation === 'l';
  const isLetter = pdfPageFormat === 'letter';
  // Content width in points: A4=595pt, Letter=612pt, landscape swaps; margins 28pt each side
  const pageWidthPt = isLandscape ? (isLetter ? 792 : 842) : (isLetter ? 612 : 595);
  const pageHeightPt = isLandscape ? (isLetter ? 612 : 595) : (isLetter ? 792 : 842);
  const contentWidth = pageWidthPt - 56;
  const usableHeightPt = pageHeightPt - 56;

  const configName = document.getElementById('configName')?.value?.trim() || 'LED Wall';
  const dateStr = new Date().toLocaleDateString();
  const content = [];

  // --- TITLE BLOCK (compact single-row: logo | config name | date) ---
  content.push({
    table: { widths: ['auto', '*', 'auto'], body: [[
      {
        text: 'B.L.I.N.K. LED REPORT',
        bold: true, fontSize: 11, color: colors.bannerText,
        fillColor: colors.accent,
        border: [false, false, false, false],
        margin: [10, 7, 14, 7]
      },
      {
        text: configName,
        bold: true, fontSize: 14,
        color: colors.bannerText,
        fillColor: colors.accent,
        border: [false, false, false, false],
        margin: [0, 7, 0, 7], alignment: 'center'
      },
      {
        text: dateStr,
        bold: false, fontSize: 9, color: colors.bannerText,
        fillColor: colors.accent,
        border: [false, false, false, false],
        margin: [14, 7, 10, 7], alignment: 'right'
      }
    ]] },
    layout: 'noBorders',
    margin: [0, 0, 0, 8]
  });

  // Shared specRow helper (used in all spec sections below)
  function specRow(label, value) {
    if (value === undefined || value === null || value === '') return null;
    return [
      { text: label, bold: true, fontSize: 8, color: '#374151', border: [false, false, false, false] },
      { text: String(value), fontSize: 8, border: [false, false, false, false] }
    ];
  }
  function specTable(rows) {
    return {
      table: { widths: [72, '*'], body: rows },
      layout: {
        hLineWidth: (i) => (i === 0 || i === rows.length) ? 0 : 0.3,
        hLineColor: () => '#e5e7eb',
        vLineWidth: () => 0,
        paddingLeft: () => 0,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3
      },
      margin: [0, 0, 0, 6]
    };
  }

  // --- SYSTEM GEAR STACK (Signal Cables, Utility, Spares) — built once, placed in col3 of first screen ---
  const sysStack = [];
  if (opts.gearList) {
    if (gearData.signalCables) {
      const sc = gearData.signalCables;
      const scRows = [];
      if (sc.serverFiberLine) scRows.push({ qty: sc.serverFiberLine.count, item: sc.serverFiberLine.label });
      Object.entries(sc.sdiByLength || {}).forEach(([len, count]) => {
        if (count > 0) scRows.push({ qty: count, item: `${len}' ${sc.sdiType}` });
      });
      if (sc.hdmi) {
        Object.entries(sc.hdmi).forEach(([len, count]) => {
          if (count > 0) scRows.push({ qty: count, item: `${len}' HDMI` });
        });
      }
      if (scRows.length > 0) {
        sysStack.push(pdfSectionBar('Signal Cables', colors));
        sysStack.push(pdfBuildGearTable(scRows, colors));
      }
    }
    if (gearData.utility) {
      const u = gearData.utility;
      const uRows = [];
      if (u.ug10  > 0) uRows.push({ qty: u.ug10,      item: "10' UG" });
      if (u.ug25  > 0) uRows.push({ qty: u.ug25,      item: "25' UG" });
      if (u.ug50  > 0) uRows.push({ qty: u.ug50,      item: "50' UG" });
      if (u.ugTwofers > 0) uRows.push({ qty: u.ugTwofers, item: 'UG Twofers' });
      if (u.powerBars > 0) uRows.push({ qty: u.powerBars,  item: 'Power Bars' });
      if (uRows.length > 0) {
        sysStack.push(pdfSectionBar('Utility', colors));
        sysStack.push(pdfBuildGearTable(uRows, colors));
      }
    }
    if (gearData.spares) {
      const sp = gearData.spares;
      const spRows = [];
      Object.entries(sp.panelsByType || {}).forEach(([name, count]) => {
        if (count > 0) spRows.push({ qty: count, item: name });
      });
      if (sp.shackles    > 0) spRows.push({ qty: sp.shackles,    item: 'Shackles' });
      if (sp.cheeseyes   > 0) spRows.push({ qty: sp.cheeseyes,   item: 'Cheeseyes' });
      if (sp.crossJumpers > 0 && sp.crossJumperLen) spRows.push({ qty: sp.crossJumpers, item: `${sp.crossJumperLen}ft Cross Jumpers` });
      if (sp.cat5Couplers > 0) spRows.push({ qty: sp.cat5Couplers, item: 'Cat5 Couplers' });
      Object.entries(sp.cat6ByLength || {}).forEach(([len, count]) => {
        if (count > 0) spRows.push({ qty: count, item: `${len}' Cat6` });
      });
      if (sp.socaSplays  > 0) spRows.push({ qty: sp.socaSplays,  item: 'Soca Splays' });
      if (sp.true1_25    > 0) spRows.push({ qty: sp.true1_25,    item: "25' True1" });
      if (sp.true1_10    > 0) spRows.push({ qty: sp.true1_10,    item: "10' True1" });
      if (sp.true1_5     > 0) spRows.push({ qty: sp.true1_5,     item: "5' True1" });
      if (sp.true1Twofer > 0) spRows.push({ qty: sp.true1Twofer, item: 'True1 Twofers' });
      if (spRows.length > 0) {
        sysStack.push(pdfSectionBar('Spares', colors));
        sysStack.push(pdfBuildGearTable(spRows, colors));
      }
    }
  }

  // --- PER-SCREEN PAGES ---
  screenIds.forEach((screenId, sIdx) => {
    const screen = screens[screenId];
    if (!screen) return;

    // Screen header — first screen follows title block on page 1; each subsequent screen starts on a new page
    const screenContent = [];
    if (sIdx > 0) screenContent.push({ text: '', pageBreak: 'before' });
    screenContent.push({
      table: { widths: ['*'], body: [[{
        text: screen.name.toUpperCase(),
        bold: true, fontSize: 11, color: colors.bannerText,
        fillColor: colors.accent,
        border: [false, false, false, false],
        margin: [8, 6, 8, 6]
      }]] },
      layout: 'noBorders',
      margin: [0, 0, 0, 10]
    });

    const specsStack = [];
    const gearStack = [];

    // --- SPECS ---
    const data = screen.data || {};
    const calcData = screen.calculatedData || {};
    const panelType = data.panelType || 'CB5_MKII';
    const p = allPanelsData[panelType];
    const pw = parseInt(data.panelsWide) || 0;
    const ph = parseInt(data.panelsHigh) || 0;
    const sd = gearData.screens[sIdx];

    if (opts.specs && p && pw > 0 && ph > 0) {
      const panelWidthMm = (p.width_m || 0) * 1000;
      const panelHeightMm = (p.height_m || 0) * 1000;
      const wallWidthMm = pw * panelWidthMm;
      const wallHeightMm = ph * panelHeightMm;
      const activePanels = calcData.activePanels || (pw * ph);
      const estWeightLbs = Math.ceil(activePanels * (p.weight_kg || 0) * 2.20462);

      // Wall section
      const wallRows = [
        specRow('Dimensions:', `${(wallWidthMm / 304.8).toFixed(2)}' × ${(wallHeightMm / 304.8).toFixed(2)}'`),
        specRow('Resolution:', `${pw * p.res_x} × ${ph * p.res_y} px`),
        specRow('Grid:', `${pw} × ${ph} panels`),
        specRow('Active Panels:', activePanels),
        estWeightLbs > 0 ? specRow('Est. Weight:', `${estWeightLbs} lbs`) : null,
        p.brightness_nits ? specRow('Brightness:', `${p.brightness_nits} nits`) : null,
      ].filter(Boolean);
      if (wallRows.length > 0) {
        specsStack.push(pdfSectionBar('Wall', colors));
        specsStack.push(specTable(wallRows));
      }

      // Panel section
      const panelRows = [
        specRow('Model:', `${p.brand || ''} ${p.name || panelType}`.trim()),
        specRow('Pixel Pitch:', `${p.pixel_pitch_mm} mm`),
        specRow('Panel Size:', `${(p.width_m * 3.28084).toFixed(3)}' × ${(p.height_m * 3.28084).toFixed(3)}'`),
        specRow('Panel Res:', `${p.res_x} × ${p.res_y}`),
        specRow('Panel Power:', `${p.power_max_w}W max / ${p.power_avg_w}W avg`),
      ].filter(Boolean);
      if (panelRows.length > 0) {
        specsStack.push(pdfSectionBar('Panel', colors));
        specsStack.push(specTable(panelRows));
      }

      // Power section
      const powerType = data.powerType || 'max';
      const powerPerPanel = powerType === 'max' ? (p.power_max_w || 0) : (p.power_avg_w || 0);
      const totalPowerW = activePanels * powerPerPanel;
      const voltage = parseInt(data.voltage) || 208;
      const breaker = parseInt(data.breaker) || 20;
      const phase = parseInt(data.phase) || 3;
      const phaseBal = calcData.phaseBalance || null;
      const ampsPerPhase = phaseBal ? phaseBal.peakLeg : (phase === 3 ? (totalPowerW / voltage) / 1.732 : totalPowerW / voltage);
      const ampsService = phase === 3 ? (voltage > 0 ? totalPowerW / (Math.sqrt(3) * voltage) : 0) : (voltage > 0 ? totalPowerW / voltage : 0);
      const svcLabel = serviceNeededLabel(ampsService, data.derate ? 0.8 : 1.0);
      const sdt = calcData.sharedDistroTotal || null;
      const maxPanelsPerCircuit = powerPerPanel > 0 ? Math.floor((voltage * breaker) / powerPerPanel) : 0;
      const powerRows = [
        specRow('Total Power:', `${(totalPowerW / 1000).toFixed(2)} kW`),
        ...(phaseBal
          ? [
              specRow('Leg X:', `${phaseBal.legAmps.X.toFixed(1)} A`),
              specRow('Leg Y:', `${phaseBal.legAmps.Y.toFixed(1)} A`),
              specRow('Leg Z:', `${phaseBal.legAmps.Z.toFixed(1)} A`),
              specRow('Imbalance:', `${phaseBal.imbalancePct.toFixed(0)}%`)
            ]
          : [
              specRow('Amps/Phase:', `${ampsPerPhase.toFixed(1)} A (${phase}\u03C6)`)
            ]),
        ...(svcLabel ? [specRow('Service needed:', svcLabel)] : []),
        specRow('Max/Circuit:', `${maxPanelsPerCircuit} panels`),
        ...(sdt ? [
          specRow(`Distro Total (${sdt.screenCount}):`, `${Math.round(sdt.power).toLocaleString()} W`),
          specRow('Distro Amps:', `${sdt.peakLeg.toFixed(1)} A`),
          specRow('Distro Legs:', `${sdt.legAmps.X.toFixed(0)}/${sdt.legAmps.Y.toFixed(0)}/${sdt.legAmps.Z.toFixed(0)} A`),
          specRow('Distro Imbalance:', `${sdt.imbalancePct.toFixed(0)}%`),
          specRow('Distro Service:', serviceNeededLabel(sdt.peakLeg, data.derate ? 0.8 : 1.0) || '—')
        ] : []),
      ].filter(Boolean);
      if (powerRows.length > 0) {
        specsStack.push(pdfSectionBar('Power', colors));
        specsStack.push(specTable(powerRows));
      }

      // Signal/Data section
      const eq = sd ? sd.equipment : null;
      const dc = sd ? sd.dataCables : null;
      const dataLines = calcData.dataLines || 0;
      const signalRows = [
        eq && eq.processorName ? specRow('Processor:', `${eq.processorName}${eq.processorCount > 0 ? ' \u00D7 ' + eq.processorCount : ''}`) : null,
        dataLines > 0 ? specRow('Data Lines:', dataLines) : null,
        dc && dc.dataJumperLen ? specRow('Data Jumpers:', `${dc.jumperCount} \u00D7 ${dc.dataJumperLen}ft`) : null,
        dc && dc.crossJumperLen && dc.crossJumperCount > 0 ? specRow('Cross Jumpers:', `${dc.crossJumperCount} \u00D7 ${dc.crossJumperLen}ft`) : null,
      ].filter(Boolean);
      if (signalRows.length > 0) {
        specsStack.push(pdfSectionBar('Signal', colors));
        specsStack.push(specTable(signalRows));
      }
    }

    // --- GEAR LIST ---
    if (opts.gearList && sd) {
      const rows = pdfBuildGearRows(sd);
      if (rows.length > 0) {
        gearStack.push(pdfSectionBar('Gear List', colors));
        gearStack.push(pdfBuildGearTable(rows, colors));
      }
    }

    // Assemble this screen's specs + gear columns (+ system gear as col3 on first screen)
    if (specsStack.length > 0 || gearStack.length > 0) {
      const useThreeCols = sIdx === 0 && sysStack.length > 0 && screenIds.length === 1;
      const sysColW = Math.floor(contentWidth * 0.22);
      screenContent.push({
        columns: useThreeCols
          ? [
              specsStack.length > 0 ? { width: Math.floor(contentWidth * 0.35), stack: specsStack } : { width: Math.floor(contentWidth * 0.35), text: '' },
              { width: 8, text: '' },
              gearStack.length > 0 ? { width: '*', stack: gearStack } : { width: '*', text: '' },
              { width: 8, text: '' },
              { width: sysColW, stack: sysStack }
            ]
          : [
              specsStack.length > 0 ? { width: '45%', stack: specsStack } : { width: '45%', text: '' },
              { width: 10, text: '' },
              gearStack.length > 0 ? { width: '*', stack: gearStack } : { width: '*', text: '' }
            ]
      });
    }

    // --- LAYOUT DIAGRAMS (each on its own page) ---
    const maxImgW = Math.floor(contentWidth * 0.55);
    const maxImgH = 220;
    const cablingImgW = contentWidth;
    const diagrams = [
      { key: screenId + '_standard',  title: 'Standard Layout',  enabled: opts.standard },
      { key: screenId + '_power',     title: 'Power Layout',     enabled: opts.power },
      { key: screenId + '_data',      title: 'Data Layout',      enabled: opts.data },
      { key: screenId + '_structure', title: 'Structure Layout', enabled: opts.structure },
      { key: screenId + '_cabling',   title: 'Cabling Layout',   enabled: opts.cabling }
    ];

    let prevDiagramKey = null;
    let prevImgData = null;
    diagrams.forEach(d => {
      if (!d.enabled || !canvasCache[d.key]) return;
      const imgData = canvasCache[d.key];
      const isCabling = d.key.endsWith('_cabling');
      // Cabling follows structure on the same page — only when combined height fits the page
      let skipPageBreak = false;
      if (isCabling && prevDiagramKey && prevDiagramKey.endsWith('_structure') && prevImgData) {
        const structImgH = Math.min(maxImgW * prevImgData.aspectRatio, maxImgH);
        const cabImgH = cablingImgW * imgData.aspectRatio;
        skipPageBreak = (structImgH + cabImgH + 80) <= usableHeightPt;
      }
      if (!skipPageBreak) screenContent.push({ text: '', pageBreak: 'before' });
      prevDiagramKey = d.key;
      prevImgData = imgData;
      screenContent.push(pdfSectionBar(d.title, colors));
      let cabRenderW = cablingImgW;
      if (isCabling && skipPageBreak && prevImgData) {
        const structImgH = Math.min(maxImgW * prevImgData.aspectRatio, maxImgH);
        // 80pt covers section bars, margins, and spacing around both images
        const availH = usableHeightPt - structImgH - 80;
        const naturalCabH = cablingImgW * imgData.aspectRatio;
        if (naturalCabH > availH && imgData.aspectRatio > 0) {
          cabRenderW = Math.floor(availH / imgData.aspectRatio);
        }
      }
      screenContent.push({
        image: imgData.dataUrl,
        ...(isCabling ? { width: cabRenderW } : { fit: [maxImgW, maxImgH] }),
        alignment: 'center',
        margin: [0, 8, 0, 4]
      });
    });

    screenContent.forEach(el => content.push(el));
  });

  // Multi-screen: append system gear after all screen pages (flows on same page as last gear list)
  if (screenIds.length > 1 && sysStack.length > 0) {
    sysStack.forEach(el => content.push(el));
  }

  return {
    pageSize: isLetter ? 'LETTER' : 'A4',
    pageOrientation: isLandscape ? 'landscape' : 'portrait',
    pageMargins: [28, 28, 28, 16],
    content: content,
    defaultStyle: { font: 'Roboto', fontSize: 9, color: '#111' },
    styles: {
      docTitle:   { fontSize: 18, bold: true, color: '#111' },
      timestamp:  { fontSize: 8, color: '#888', margin: [0, 10, 0, 0] },
      configName: { fontSize: 11, color: '#555' }
    }
  };
}

/**
 * Mobile complex mode: generates and downloads the full complex PDF directly,
 * bypassing the print preview UI entirely. All elements enabled.
 */
function exportComplexMobileDirect() {
  if (!window.pdfMake) {
    showAlert('PDF library not loaded. Please check your internet connection and refresh the page.');
    return;
  }

  saveCurrentScreenData();

  // Eco/greyscale default to off on mobile direct export
  ecoPrintMode = false;
  greyscalePrintMode = false;

  const overlay = document.createElement('div');
  overlay.id = 'pdfExportOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(26,26,26,1);z-index:10000;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;font-family:-apple-system,Arial,sans-serif;';
  overlay.innerHTML = '<div style="font-size:24px;margin-bottom:20px;">Generating PDF...</div><div id="pdfProgress" style="font-size:16px;color:#888;">Capturing layouts\u2026</div>';
  document.body.appendChild(overlay);

  function setStatus(msg) {
    const el = document.getElementById('pdfProgress');
    if (el) el.textContent = msg;
  }
  function removeOverlay() {
    const el = document.getElementById('pdfExportOverlay');
    if (el) el.remove();
  }

  const canvasCache = pdfCaptureCanvases();

  // Restore normal colors after capture
  ecoPrintMode = false;
  greyscalePrintMode = false;
  generateLayout('standard');
  generateLayout('power');
  generateLayout('data');
  generateStructureLayout();
  if (typeof switchMobileView === 'function' && typeof currentAppMode !== 'undefined') {
    switchMobileView(currentAppMode);
  }

  setStatus('Building PDF\u2026');

  // All elements enabled for mobile direct export
  const opts = {
    specs: true, gearList: true, standard: true,
    power: true, data: true, structure: true, cabling: true,
    ecoFriendly: false, greyscale: false
  };

  const docDef = buildComplexPdf(opts, canvasCache);

  setStatus('Saving\u2026');

  const configName = (document.getElementById('configName')?.value?.trim() || 'LED_Wall').replace(/[<>:"/\\|?*]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${configName}_LED_Report_${dateStr}.pdf`;

  if (navigator.share && navigator.canShare) {
    pdfMake.createPdf(docDef).getBlob(function(blob) {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file] }).then(removeOverlay).catch(function() {
          pdfMake.createPdf(docDef).download(filename, removeOverlay);
        });
      } else {
        pdfMake.createPdf(docDef).download(filename, removeOverlay);
      }
    });
  } else {
    pdfMake.createPdf(docDef).download(filename, removeOverlay);
  }
}

function exportPDF() {
  try {
    if (!window.pdfMake) {
      showAlert('PDF library not loaded. Please check your internet connection and refresh the page.');
      return;
    }

    saveCurrentScreenData();

    // Read eco/greyscale from export modal checkboxes
    const ecoEl = document.getElementById('pdfExportEcoFriendly');
    const greyEl = document.getElementById('pdfExportGreyscale');
    ecoPrintMode = ecoEl ? ecoEl.checked : false;
    greyscalePrintMode = greyEl ? greyEl.checked : false;

    // Loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'pdfExportOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(26,26,26,1);z-index:10000;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;font-family:-apple-system,Arial,sans-serif;';
    overlay.innerHTML = '<div style="font-size:24px;margin-bottom:20px;">Generating PDF...</div><div id="pdfProgress" style="font-size:16px;color:#888;">Preparing...</div><div style="width:200px;height:4px;background:#2a2a2a;border-radius:2px;margin-top:20px;overflow:hidden;"><div id="pdfProgressBar" style="width:0%;height:100%;background:#10b981;transition:width 0.3s;"></div></div>';
    document.body.appendChild(overlay);

    function updateProgress(text, pct) {
      const t = document.getElementById('pdfProgress');
      const b = document.getElementById('pdfProgressBar');
      if (t) t.textContent = text;
      if (b) b.style.width = pct + '%';
    }

    function removeOverlay() {
      const el = document.getElementById('pdfExportOverlay');
      if (el) el.remove();
    }

    updateProgress('Capturing layouts...', 20);
    const canvasCache = pdfCaptureCanvases();

    // Restore normal colors after capture
    ecoPrintMode = false;
    greyscalePrintMode = false;
    generateLayout('standard');
    generateLayout('power');
    generateLayout('data');
    generateStructureLayout();
    if (typeof switchMobileView === 'function' && typeof currentAppMode !== 'undefined') {
      switchMobileView(currentAppMode);
    }

    updateProgress('Building document...', 60);
    const opts = {
      specs:      pdfExportOptions.specs,
      gearList:   pdfExportOptions.gearList,
      standard:   pdfExportOptions.standard,
      power:      pdfExportOptions.power,
      data:       pdfExportOptions.data,
      structure:  pdfExportOptions.structure,
      cabling:    pdfExportOptions.cabling,
      ecoFriendly: ecoEl ? ecoEl.checked : false,
      greyscale:   greyEl ? greyEl.checked : false
    };

    // Re-apply colors for doc generation
    ecoPrintMode = opts.ecoFriendly;
    greyscalePrintMode = opts.greyscale;
    // Simple mode: single-page redesigned layout (header + 4-col summary + grid)
    // Complex mode: handled by exportFromPreview() which calls buildComplexPdf()
    const isSimpleMode = typeof currentAppMode !== 'undefined' && currentAppMode === 'simple';
    const docDef = isSimpleMode
      ? buildSimplePdf(canvasCache)
      : buildPdfDocDefinition(opts, canvasCache);
    ecoPrintMode = false;
    greyscalePrintMode = false;

    updateProgress('Rendering PDF...', 85);

    const dateStr = new Date().toISOString().slice(0, 10);
    const cfgName = (document.getElementById('configName')?.value?.trim() || 'LED_Wall').replace(/[<>:"/\\|?*]/g, '_');
    const filename = `${cfgName}_${dateStr}.pdf`;

    const isMobile = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
      (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent));

    updateProgress('Saving...', 95);

    if (isMobile && navigator.share && navigator.canShare) {
      pdfMake.createPdf(docDef).getBlob(function(blob) {
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file] }).then(removeOverlay).catch(() => {
            pdfMake.createPdf(docDef).download(filename, removeOverlay);
          });
        } else {
          pdfMake.createPdf(docDef).download(filename, removeOverlay);
        }
      });
    } else {
      pdfMake.createPdf(docDef).download(filename, removeOverlay);
    }

  } catch (err) {
    console.error('PDF export error:', err);
    showAlert('Error exporting PDF: ' + err.message);
    ecoPrintMode = false;
    greyscalePrintMode = false;
    const overlay = document.getElementById('pdfExportOverlay');
    if (overlay) overlay.remove();
  }
}

// Returns full PDF as a Blob (for Export All). Mirrors exportFromPreview() exactly.
function getPdfBlobForExportAll(callback) {
  if (!window.pdfMake) { callback(null); return; }
  try {
    saveCurrentScreenData();
    ecoPrintMode = false;
    greyscalePrintMode = false;

    var canvasCache = pdfCaptureCanvases();

    // Restore normal colors and regenerate layouts (same as exportFromPreview)
    ecoPrintMode = false;
    greyscalePrintMode = false;
    generateLayout('standard');
    generateLayout('power');
    generateLayout('data');
    generateStructureLayout();
    if (typeof switchMobileView === 'function' && typeof currentAppMode !== 'undefined') {
      switchMobileView(currentAppMode);
    }

    var opts = { specs: true, gearList: true, standard: true, power: true, data: true, structure: true, cabling: true, combined: true, ecoFriendly: false, greyscale: false };
    var docDef = buildComplexPdf(opts, canvasCache);
    ecoPrintMode = false;
    greyscalePrintMode = false;

    pdfMake.createPdf(docDef).getBlob(callback);
  } catch(e) {
    console.error('getPdfBlobForExportAll error:', e);
    callback(null);
  }
}

