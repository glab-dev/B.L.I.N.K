// ==================== PDF EXPORT ====================
// PDF export modal, gear list email, multi-screen PDF generation.

var pdfLayoutCaptureMode = false; // Set true during pdfCaptureCanvases to raise canvas resolution cap

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

function confirmSendToJared() {
  var includeRP = document.getElementById('sendToJaredIncludeRP').checked;
  closeSendToJaredModal();
  sendGearListToJared(includeRP);
}

// Send Gear List Email
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
        openMailtoWithDownload(gearData.configName, text, inventoryContent, fileName);
      }
    });
  } else {
    // Desktop: mailto + optional RP file download
    openMailtoWithDownload(gearData.configName, text, inventoryContent, fileName);
  }
}

function openMailtoWithDownload(configName, text, inventoryContent, fileName) {
  var subject = encodeURIComponent('LED Gear List - ' + configName);
  var body = encodeURIComponent(text);
  var mailtoUrl = 'mailto:?subject=' + subject + '&body=' + body;
  if(mailtoUrl.length > 16000) {
    var truncNote = '\n\n(Gear list truncated due to email length limits - see full list in app)';
    var maxBodyLen = 14000 - subject.length;
    var truncBody = encodeURIComponent(text.substring(0, maxBodyLen) + truncNote);
    mailtoUrl = 'mailto:?subject=' + subject + '&body=' + truncBody;
  }
  var a = document.createElement('a');
  a.href = mailtoUrl;
  a.click();

  // Download the RP inventory text file only if content was generated
  if(inventoryContent) {
    var blob = new Blob([inventoryContent], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var dl = document.createElement('a');
    dl.href = url;
    dl.download = fileName;
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
    URL.revokeObjectURL(url);
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
 * Full-width dark green bar: left=title, center=project name, right=date [logo].
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

  // Right side: logo + date, or just date
  const rightStack = [];
  if (logoData && logoData.data) {
    rightStack.push({ image: logoData.data, fit: [60, 22], alignment: 'right', margin: [0, 3, 10, 0] });
  }
  rightStack.push({ text: dateStr, fontSize: 8, color: tc.headerText, alignment: 'right', margin: [0, logoData && logoData.data ? 1 : 7, 10, 7] });

  const rightCell = {
    stack: rightStack,
    fillColor: headerBg, border: [false, false, false, false],
    alignment: 'right'
  };

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
        fontSize: 8, bold: true, color: tc.headerBg,
        border: [false, false, false, false],
        margin: [0, 0, 0, 3],
        decoration: 'underline', decorationColor: tc.summaryAccent
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
  const ampsPhase     = phase === 3 ? ampsTotal / 1.732 : ampsTotal;
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
    ['Total Amps',    ampsTotal > 0   ? `${ampsTotal.toFixed(1)} A @ ${voltage}V` : null],
    ['Amps/Phase',    ampsPhase > 0   ? `${ampsPhase.toFixed(1)} A @ ${voltage}V` : null],
    ['Circuits',      circuits > 0    ? circuits : null],
    ['Max/Circuit',   maxPpc > 0      ? `${maxPpc} panels` : null],
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

    if (imgData && imgData.dataUrl && pw > 0 && ph > 0) {
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
  const ampsPhase     = phase === 3 ? ampsTotal / 1.732 : ampsTotal;
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
    ['Total Amps',    ampsTotal > 0   ? `${ampsTotal.toFixed(1)} A @ ${voltage}V` : null],
    ['Amps/Phase',    ampsPhase > 0   ? `${ampsPhase.toFixed(1)} A @ ${voltage}V` : null],
    ['Circuits',      circuits > 0    ? circuits : null],
    ['Max/Circuit',   maxPpc > 0      ? `${maxPpc} panels` : null],
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
function buildGearSection(title, items) {
  const validItems = (items || []).filter(function(i) {
    return i && i.item && (Number(i.qty) > 0 || (typeof i.qty === 'string' && i.qty !== '' && i.qty !== '0'));
  });
  if (validItems.length === 0) return null;

  const tc = PDF_TOKENS.colors;
  const headerBg = (typeof greyscalePrintMode !== 'undefined' && greyscalePrintMode) ? '#555'
    : (typeof ecoPrintMode !== 'undefined' && ecoPrintMode) ? '#6b7280'
    : tc.sectionHeaderBg;

  // pdfmake fillColor only works on table cells — use tables for header and body
  const bodyRows = validItems.map(function(i) {
    return [{
      columns: [
        { text: String(i.qty), fontSize: 8, color: tc.textItem, bold: true, width: 22 },
        { text: i.item, fontSize: 8, color: tc.textItem, width: '*' }
      ],
      columnGap: 4,
      margin: [4, 2, 4, 2]
    }];
  });

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
        table: { widths: ['*'], body: bodyRows.map(function(row) {
          return [{ stack: [row[0]], fillColor: tc.sectionBodyBg,
            border: [true, false, true, true],
            borderColor: [tc.sectionBorder, null, tc.sectionBorder, tc.sectionBorder],
            margin: [0, 0, 0, 0] }];
        }) },
        layout: { hLineWidth: function() { return 0; }, vLineWidth: function() { return 0; },
                  paddingLeft: function() { return 0; }, paddingRight: function() { return 0; },
                  paddingTop: function() { return 0; }, paddingBottom: function() { return 0; } }
      }
    ],
    margin: [0, 0, 0, 6]
  };
}

/**
 * Builds the 3-column gear list for one screen.
 * Column 1: Equipment, Rigging Hardware, Ground Support (or Floor Hardware)
 * Column 2: Data Cables (+ Proc→DistBox merged), Power Cables
 * Column 3: Signal Cables, Utility, Spares
 */
function buildGearListContent(gearData, screenIndex, contentWidth) {
  const sd  = gearData.screens[screenIndex];
  if (!sd) return { text: 'No gear data', fontSize: 8, color: '#999' };

  const eq  = sd.equipment    || {};
  const rig = sd.rigging      || {};
  const gs  = sd.groundSupport || {};
  const fh  = sd.floorHardware || {};
  const dc  = sd.dataCables   || {};
  const pc  = sd.powerCables  || {};
  const p2d = sd.processorToDistBox || {};

  // --- Column 1: Equipment, Rigging, Ground Support / Floor Hardware ---
  const eqItems = [];
  if (eq.isFirstScreenInGroup) {
    if (eq.processorCount > 0) eqItems.push({ qty: eq.processorCount, item: eq.processorName || 'Processor' });
    if (eq.distBoxCount > 0)   eqItems.push({ qty: eq.distBoxCount,   item: eq.distBoxName   || 'Dist Box' });
  }
  if (eq.activeFullPanels > 0) eqItems.push({ qty: eq.activeFullPanels, item: `${eq.panelBrand || ''} ${eq.panelName || ''}`.trim() });
  if (eq.activeHalfPanels > 0) eqItems.push({ qty: eq.activeHalfPanels, item: `${eq.panelBrand || ''} ${eq.halfPanelName || ''}`.trim() });

  const rigItems = [];
  if (rig.hasRigging) {
    if (rig.bumper1w > 0) rigItems.push({ qty: rig.bumper1w, item: '1W Bumpers' });
    if (rig.bumper2w > 0) rigItems.push({ qty: rig.bumper2w, item: '2W Bumpers' });
    if (rig.bumper4w > 0) rigItems.push({ qty: rig.bumper4w, item: '4W Bumpers' });
    if (rig.plates4way > 0) rigItems.push({ qty: rig.plates4way, item: '4W Connecting Plates' });
    if (rig.plates2way > 0) rigItems.push({ qty: rig.plates2way, item: '2W Connecting Plates' });
    if (rig.shackles > 0)   rigItems.push({ qty: rig.shackles,   item: '5/8" Shackles' });
    if (rig.cheeseye > 0)   rigItems.push({ qty: rig.cheeseye,   item: 'Cheeseye' });
  }

  const gsItems = [];
  if (gs.hasGS) {
    if (gs.rearTruss > 0)          gsItems.push({ qty: gs.rearTruss,          item: 'Rear Truss' });
    if (gs.baseTruss > 0)          gsItems.push({ qty: gs.baseTruss,          item: 'Base Truss' });
    if (gs.bridgeClamps > 0)       gsItems.push({ qty: gs.bridgeClamps,       item: 'Bridge Clamps' });
    if (gs.rearBridgeAdapters > 0) gsItems.push({ qty: gs.rearBridgeAdapters, item: 'Rear Bridge Adapter' });
    if (gs.sandbags > 0)           gsItems.push({ qty: gs.sandbags,           item: 'Sandbags' });
    if (gs.swivelCheeseboroughs > 0) gsItems.push({ qty: gs.swivelCheeseboroughs, item: 'Swivel Cheeseborough' });
    if (gs.pipes > 0)              gsItems.push({ qty: gs.pipes,              item: `Pipe${gs.pipeLengthStr || ''}` });
  }

  const fhItems = [];
  if (fh.hasFloorFrames) {
    if (fh.frame3x2 > 0) fhItems.push({ qty: fh.frame3x2, item: '3x2 Frame' });
    if (fh.frame2x2 > 0) fhItems.push({ qty: fh.frame2x2, item: '2x2 Frame' });
    if (fh.frame2x1 > 0) fhItems.push({ qty: fh.frame2x1, item: '2x1 Frame' });
    if (fh.frame1x1 > 0) fhItems.push({ qty: fh.frame1x1, item: '1x1 Frame' });
  }

  // --- Column 2: Data Cables (+ Proc→DistBox), Power Cables ---
  const dcItems = [];
  if (dc.jumperCount > 0) dcItems.push({ qty: dc.jumperCount, item: `Data Jumpers ${dc.dataJumperLen || ''}'`.trim() });
  if (dc.crossJumperLen && dc.crossJumperCount > 0) dcItems.push({ qty: dc.crossJumperCount, item: `Cross Jumpers ${dc.crossJumperLen}'` });
  if (dc.jumpersBuiltin && dc.cat5CouplerCount > 0) dcItems.push({ qty: dc.cat5CouplerCount, item: 'Cat5 Couplers' });
  const cat6Entries = Object.entries(dc.cat6ByLength || {}).sort(function(a, b) { return Number(a[0]) - Number(b[0]); });
  cat6Entries.forEach(function(e) {
    if (Number(e[1]) > 0) dcItems.push({ qty: e[1], item: `${e[0]}' Cat6` });
  });
  // Proc → Dist Box: merged with dashed separator
  if (p2d && p2d.count > 0) {
    dcItems.push({ qty: '— — —', item: 'Proc → Dist Box' });
    dcItems.push({ qty: p2d.count, item: p2d.cableType === 'Fiber'
      ? `Fiber OpticalCON ${p2d.cableLength || ''}'`.trim()
      : `CAT6A EtherCON ${p2d.cableLength || ''}'`.trim()
    });
  }

  const pcItems = [];
  if (pc.jumperCount > 0) pcItems.push({ qty: pc.jumperCount, item: `Power Jumpers ${pc.powerJumperLen || ''}'`.trim() });
  if (pc.socaSplays > 0)  pcItems.push({ qty: pc.socaSplays,  item: 'Soca Splays' });
  const socaEntries = Object.entries(pc.socaByLength || {}).sort(function(a, b) { return Number(a[0]) - Number(b[0]); });
  socaEntries.forEach(function(e) {
    if (Number(e[1]) > 0) pcItems.push({ qty: e[1], item: `Soca ${e[0]}'` });
  });
  if (pc.true1_25 > 0)    pcItems.push({ qty: pc.true1_25,    item: "True1 25'" });
  if (pc.true1_10 > 0)    pcItems.push({ qty: pc.true1_10,    item: "True1 10'" });
  if (pc.true1_5  > 0)    pcItems.push({ qty: pc.true1_5,     item: "True1 5'"  });
  if (pc.true1Twofer > 0) pcItems.push({ qty: pc.true1Twofer, item: 'True1 Twofer' });

  // --- Column 3: Signal Cables, Utility, Spares ---
  const sc = gearData.signalCables || {};
  const scItems = [];
  if (sc.serverFiberLine && sc.serverFiberLine.count > 0) scItems.push({ qty: sc.serverFiberLine.count, item: sc.serverFiberLine.label });
  Object.entries(sc.sdiByLength || {}).forEach(function(e) {
    if (Number(e[1]) > 0) scItems.push({ qty: e[1], item: `${e[0]}' ${sc.sdiType || 'SDI'}` });
  });
  Object.entries(sc.hdmi || {}).forEach(function(e) {
    if (Number(e[1]) > 0) scItems.push({ qty: e[1], item: `${e[0]}' HDMI` });
  });

  const u = gearData.utility || {};
  const utilItems = [];
  if (u.ug10  > 0) utilItems.push({ qty: u.ug10,      item: "10' Utility Grip" });
  if (u.ug25  > 0) utilItems.push({ qty: u.ug25,      item: "25' Utility Grip" });
  if (u.ug50  > 0) utilItems.push({ qty: u.ug50,      item: "50' Utility Grip" });
  if (u.ugTwofers > 0) utilItems.push({ qty: u.ugTwofers, item: 'Utility Twofers' });
  if (u.powerBars > 0) utilItems.push({ qty: u.powerBars, item: 'Power Bars' });

  const sp = gearData.spares || {};
  const spareItems = [];
  Object.entries(sp.panelsByType || {}).forEach(function(e) {
    if (Number(e[1]) > 0) spareItems.push({ qty: e[1], item: `${e[0]} (spare)` });
  });
  if (sp.shackles    > 0) spareItems.push({ qty: sp.shackles,    item: 'Shackles (spare)' });
  if (sp.cheeseyes   > 0) spareItems.push({ qty: sp.cheeseyes,   item: 'Cheeseyes (spare)' });
  if (sp.crossJumpers > 0 && sp.crossJumperLen) spareItems.push({ qty: sp.crossJumpers, item: `${sp.crossJumperLen}' Cross Jumpers (spare)` });
  if (sp.cat5Couplers > 0) spareItems.push({ qty: sp.cat5Couplers, item: 'Cat5 Couplers (spare)' });
  Object.entries(sp.cat6ByLength || {}).forEach(function(e) {
    if (Number(e[1]) > 0) spareItems.push({ qty: e[1], item: `${e[0]}' Cat6 (spare)` });
  });
  if (sp.socaSplays > 0)  spareItems.push({ qty: sp.socaSplays, item: 'Soca Splays (spare)' });
  if (sp.true1_25   > 0)  spareItems.push({ qty: sp.true1_25,   item: "25' True1 (spare)" });
  if (sp.true1_10   > 0)  spareItems.push({ qty: sp.true1_10,   item: "10' True1 (spare)" });
  if (sp.true1_5    > 0)  spareItems.push({ qty: sp.true1_5,    item: "5' True1 (spare)"  });
  if (sp.true1Twofer > 0) spareItems.push({ qty: sp.true1Twofer, item: 'True1 Twofers (spare)' });

  // Build column stacks (skip null sections)
  function col(sections) {
    const elements = sections.filter(Boolean);
    if (elements.length === 0) return { text: '', width: '*' };
    return { stack: elements, width: '*' };
  }

  const colW = Math.floor((contentWidth - 16) / 3); // 2 gaps of 8pt each

  const col1 = col([
    buildGearSection('EQUIPMENT',       eqItems),
    buildGearSection('RIGGING HARDWARE', rigItems),
    gs.hasGS ? buildGearSection('GROUND SUPPORT', gsItems) : null,
    fh.hasFloorFrames ? buildGearSection('FLOOR HARDWARE', fhItems) : null,
  ]);
  const col2 = col([
    buildGearSection('DATA CABLES',  dcItems),
    buildGearSection('POWER CABLES', pcItems),
  ]);
  const col3 = col([
    scItems.length > 0  ? buildGearSection('SIGNAL CABLES', scItems)  : null,
    utilItems.length > 0 ? buildGearSection('UTILITY',      utilItems) : null,
    spareItems.length > 0 ? buildGearSection('SPARES',      spareItems) : null,
  ]);

  return {
    columns: [
      Object.assign({}, col1, { width: colW }),
      { width: 8, text: '' },
      Object.assign({}, col2, { width: colW }),
      { width: 8, text: '' },
      Object.assign({}, col3, { width: colW }),
    ],
    columnGap: 0,
    margin: [0, 0, 0, 0]
  };
}

/**
 * Converts structure info lines (from buildStructureInfoLines) into a 4-column card layout
 * matching the hero page summary bar style. Each section (Pickup Weights, Connecting Plates,
 * Ground Support Hardware, Total Structure Weight) becomes one equal-width column card.
 * Handles any number of tables dynamically — wraps to additional rows if > 4.
 */
function buildStructureInfoPdf(screenId) {
  if (typeof buildStructureInfoLines !== 'function') return null;
  const lines = buildStructureInfoLines(screenId);
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
      decoration: 'underline', decorationColor: tc.summaryAccent,
      margin: [0, 0, 0, 4]
    };
    const itemEls = table.items.map(function(item) {
      if (item.bold) {
        return { text: item.text.trim(), fontSize: 8, bold: true, color: tc.headerBg, margin: [0, 4, 0, 0] };
      }
      return { text: item.text.trim(), fontSize: 8, color: tc.textSecondary, lineHeight: 1.3 };
    });
    return { stack: [titleEl].concat(itemEls), margin: [6, 6, 6, 6] };
  }

  // Wrap up to 4 table cards in a summary-bar-style 4-column row
  function buildRow(rowTables) {
    const padded = rowTables.slice();
    while (padded.length < 4) padded.push(null);
    const cells = padded.map(function(t) {
      return {
        stack: t ? [buildCard(t)] : [{ text: ' ', fontSize: 4 }],
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
      margin: [0, 6, 0, 4]
    };
  }

  // Group tables into rows of 4, return single block or stacked rows
  const blocks = [];
  for (let i = 0; i < tables.length; i += 4) {
    blocks.push(buildRow(tables.slice(i, i + 4)));
  }
  return blocks.length === 1 ? blocks[0] : { stack: blocks };
}

/**
 * Builds the complete COMPLEX MODE pdfmake document definition.
 * Structure per screen:
 *   Page 1 (Hero):        Header + screen label + expanded summary + standard grid
 *   Page 2 (Gear List):   Header + "GEAR LIST" label + 3-column gear list
 *   Page 3 (Power/Data):  Header + power grid + legend + data grid + legend
 *   Page 4 (Structure/Cabling): Header + structure grid + tables + cabling diagram
 *   (Pages 3+4 collapse to 1 page for wide/short walls)
 */
function buildComplexPdf(opts, canvasCache) {
  const format      = pdfPageFormat      || 'a4';
  const orientation = pdfPageOrientation || 'p';
  const dims        = pdfGetPageDimensions(format, orientation);
  const cw          = dims.contentWidth;
  const uh          = dims.usableHeight;
  const m           = PDF_TOKENS.layout;
  const tc          = PDF_TOKENS.colors;

  const screenIds = Object.keys(screens).sort(function(a, b) {
    return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
  });
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
    const imgData = canvasCache && canvasCache[key];
    if (!imgData || !imgData.dataUrl) return null;
    const aspect = imgData.aspectRatio || (ph / pw);
    let renderWidth = cw;
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

  // For multi-screen: summary page page-reference is 1-based index in final PDF.
  // We calculate page starts by counting pageBreak elements as we build.
  // Summary page itself = page 1; so all screen hero pages start at 2+.
  // We do a pre-pass to record approximate starts (1 summary + N pages per screen).
  if (screenIds.length > 1) {
    let pageAccum = 2; // page 1 = summary page; screen 1 hero = page 2
    screenIds.forEach(function(sid) {
      screenPageStarts[sid] = pageAccum;
      const scr = screens[sid];
      const pd = scr && scr.data ? scr.data : {};
      const pw2 = parseInt(pd.panelsWide) || 0;
      const ph2 = parseInt(pd.panelsHigh) || 0;
      const plan = buildComplexPagePlan(pw2, ph2,
        { specs: opts.specs !== false, gearList: opts.gearList !== false,
          standard: opts.standard !== false, power: opts.power !== false,
          data: opts.data !== false, structure: opts.structure !== false,
          cabling: opts.cabling !== false },
        format, orientation);
      pageAccum += plan.pageCount;
    });
  }

  // ===== MULTI-SCREEN SUMMARY PAGE =====
  if (screenIds.length > 1) {
    content.push(buildPdfHeader(configName, dateStr, logoData));
    content.push({ text: 'PROJECT SUMMARY', fontSize: 12, bold: true, color: tc.headerBg, margin: [0, 2, 0, 8] });

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

    // Per-screen summary cards
    content.push({ text: 'SCREENS', fontSize: 9, bold: true, color: tc.headerBg, margin: [0, 0, 0, 6] });

    const cardRows = [];
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

      cardRows.push([
        { text: scr.name || sid, bold: true, fontSize: 9, border: [false,false,false,true], borderColor: [null,null,null,tc.sectionBorder] },
        { text: `${pw2}×${ph2}  ${wFt}' × ${hFt}'`, fontSize: 8, color: tc.textMuted, border: [false,false,false,true], borderColor: [null,null,null,tc.sectionBorder] },
        { text: `${active} panels`, fontSize: 8, color: tc.textMuted, border: [false,false,false,true], borderColor: [null,null,null,tc.sectionBorder] },
        { text: `p. ${startPage}`, fontSize: 8, color: tc.textMuted, alignment: 'right', border: [false,false,false,true], borderColor: [null,null,null,tc.sectionBorder] },
      ]);
    });

    content.push({
      table: { widths: ['*', '*', 'auto', 'auto'], body: cardRows },
      layout: { hLineWidth: (i, node) => (i === node.table.body.length) ? 0 : 0.3, vLineWidth: () => 0,
                hLineColor: () => tc.sectionBorder,
                paddingLeft: () => 0, paddingRight: () => 6, paddingTop: () => 4, paddingBottom: () => 4 },
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

    // Determine adaptive layout collapse
    const collapseLayouts = canCollapseLayoutPages(pw, ph, format, orientation, null);

    // ===== PAGE 1: HERO =====
    if (opts.specs !== false || opts.standard !== false) {
      if (sIdx > 0 || screenIds.length > 1) content.push({ text: '', pageBreak: 'before' });
      content.push(buildPdfHeader(configName, dateStr, logoData));
      content.push({
        text: screen.name.toUpperCase(),
        fontSize: 11, bold: true, color: tc.headerBg,
        margin: [0, 2, 0, 6]
      });
      if (opts.specs !== false) {
        content.push(buildComplexSummaryBar(data, calcData, panelSpec, sd));
      }
      if (opts.standard !== false) {
        const usedAbove = m.headerBarH + 6 + m.screenLabelH + m.summaryBarHExp + 8;
        const remainH   = uh - usedAbove - m.resolutionLblH - 8;
        const img = gridImage(screenId + '_standard', pw, ph, remainH);
        if (img) content.push(img);
        if (resStr) content.push({ text: resStr, fontSize: 9, color: tc.textMuted, alignment: 'center', margin: [0, 0, 0, 0] });
      }
    }

    // ===== PAGE 2: GEAR LIST =====
    if (opts.gearList !== false && sd) {
      content.push({ text: '', pageBreak: 'before' });
      content.push(buildPdfHeader(configName, dateStr, logoData));
      content.push(sectionLabel(`${screen.name} — Gear List`));
      content.push(buildGearListContent(gearData, sIdx, cw));
    }

    // ===== PAGES 3 (& 4): POWER / DATA / STRUCTURE / CABLING =====
    const hasLayouts = opts.power !== false || opts.data !== false || opts.structure !== false || opts.cabling !== false;
    if (hasLayouts) {
      // Page 3: Power + Data layouts (always new page; collapse controls whether page 4 exists)
      content.push({ text: '', pageBreak: 'before' });
      content.push(buildPdfHeader(configName, dateStr, logoData));

      // Overhead per page: header + 2 labels + 2 after-label gaps + 2 image margins + safety buffer
      const layoutOverhead = m.headerBarH + m.afterHeaderGap + 2 * m.sectionLabelH + 2 * m.afterLabelGap + 2 * 4 + 20;
      const singlePageMaxH = collapseLayouts
        ? Math.floor((uh - m.headerBarH - 80) / 4)
        : Math.floor((uh - layoutOverhead) / 2);

      // Determine if power+data actually fit together (considering actual rendered heights)
      let powerFitsWithData = true;
      if (!collapseLayouts && opts.power !== false && opts.data !== false && pw > 0 && ph > 0) {
        const { renderHeight: powerH } = calculateGridScale(pw, ph, cw, singlePageMaxH);
        const { renderHeight: dataH  } = calculateGridScale(pw, ph, cw, singlePageMaxH);
        powerFitsWithData = (powerH + dataH + layoutOverhead) <= uh;
      }

      if (opts.power !== false) {
        content.push(sectionLabel('Power Layout'));
        const img = gridImage(screenId + '_power', pw, ph, singlePageMaxH);
        if (img) content.push(img);
      }

      if (opts.data !== false) {
        // If power and data don't both fit on the same page, start a new page with its own header
        if (!powerFitsWithData) {
          content.push({ text: '', pageBreak: 'before' });
          content.push(buildPdfHeader(configName, dateStr, logoData));
        }
        content.push(sectionLabel('Data Layout'));
        const img = gridImage(screenId + '_data', pw, ph, singlePageMaxH);
        if (img) content.push(img);
      }

      // Structure + Cabling (same page when collapsing, new page otherwise)
      if (opts.structure !== false || opts.cabling !== false) {
        if (!collapseLayouts) {
          content.push({ text: '', pageBreak: 'before' });
          content.push(buildPdfHeader(configName, dateStr, logoData));
        }

        if (opts.structure !== false) {
          content.push(sectionLabel('Structure Layout'));
          const img = gridImage(screenId + '_structure', pw, ph, singlePageMaxH);
          if (img) content.push(img);
          const structInfo = buildStructureInfoPdf(screenId, cw);
          if (structInfo) content.push(structInfo);
        }

        if (opts.cabling !== false) {
          content.push(sectionLabel('Cabling Layout'));
          const cabImg = canvasCache && canvasCache[screenId + '_cabling'];
          if (cabImg && cabImg.dataUrl) {
            // Cabling is typically very wide — fit to content width
            const cabH = Math.floor(cw * (cabImg.aspectRatio || 0.33));
            const cappedH = Math.min(cabH, singlePageMaxH * 1.5);
            content.push({
              image: cabImg.dataUrl,
              width: cw, height: cappedH,
              alignment: 'center',
              margin: [0, 0, 0, 4]
            });
          }
        }
      }
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
    addRow(pc.true1_25, "True1 25'");
    addRow(pc.true1_10, "True1 10'");
    addRow(pc.true1_5, "True1 5'");
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

function pdfCaptureCanvases() {
  const cache = {};
  const originalScreenId = currentScreenId;
  const screenIds = Object.keys(screens).sort((a, b) =>
    parseInt(a.split('_')[1]) - parseInt(b.split('_')[1])
  );

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
  pdfLayoutCaptureMode = true;
  void (document.getElementById('standardContainer') || document.body).offsetWidth; // force reflow

  screenIds.forEach(screenId => {
    switchToScreen(screenId);
    generateLayout('standard');
    generateLayout('power');
    generateLayout('data');
    generateStructureLayout();
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

    [
      { id: 'standardCanvas',     key: screenId + '_standard' },
      { id: 'powerCanvas',        key: screenId + '_power' },
      { id: 'dataCanvas',         key: screenId + '_data' },
      { id: 'structureCanvas',    key: screenId + '_structure' },
      { id: 'cableDiagramCanvas', key: screenId + '_cabling' }
    ].forEach(cap => {
      const canvas = document.getElementById(cap.id);
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const isPng = cap.id === 'cableDiagramCanvas';
        const useAspect = canvas.height / canvas.width;
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
      }
    });
  });

  // Restore layout container widths and capture mode flag
  pdfLayoutCaptureMode = false;
  layoutContainerIds.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.style.width = savedLayoutWidths[id] !== undefined ? savedLayoutWidths[id] : '';
  });

  switchToScreen(originalScreenId);
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
      if (u.ug10  > 0) uRows.push({ qty: u.ug10,      item: "10' Utility Grip" });
      if (u.ug25  > 0) uRows.push({ qty: u.ug25,      item: "25' Utility Grip" });
      if (u.ug50  > 0) uRows.push({ qty: u.ug50,      item: "50' Utility Grip" });
      if (u.ugTwofers > 0) uRows.push({ qty: u.ugTwofers, item: 'Utility Twofers' });
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
        if (count > 0) spRows.push({ qty: count, item: `${name} (spare)` });
      });
      if (sp.shackles    > 0) spRows.push({ qty: sp.shackles,    item: 'Shackles (spare)' });
      if (sp.cheeseyes   > 0) spRows.push({ qty: sp.cheeseyes,   item: 'Cheeseyes (spare)' });
      if (sp.crossJumpers > 0 && sp.crossJumperLen) spRows.push({ qty: sp.crossJumpers, item: `${sp.crossJumperLen}ft Cross Jumpers (spare)` });
      if (sp.cat5Couplers > 0) spRows.push({ qty: sp.cat5Couplers, item: 'Cat5 Couplers (spare)' });
      Object.entries(sp.cat6ByLength || {}).forEach(([len, count]) => {
        if (count > 0) spRows.push({ qty: count, item: `${len}' Cat6 (spare)` });
      });
      if (sp.socaSplays  > 0) spRows.push({ qty: sp.socaSplays,  item: 'Soca Splays (spare)' });
      if (sp.true1_25    > 0) spRows.push({ qty: sp.true1_25,    item: "25' True1 (spare)" });
      if (sp.true1_10    > 0) spRows.push({ qty: sp.true1_10,    item: "10' True1 (spare)" });
      if (sp.true1_5     > 0) spRows.push({ qty: sp.true1_5,     item: "5' True1 (spare)" });
      if (sp.true1Twofer > 0) spRows.push({ qty: sp.true1Twofer, item: 'True1 Twofers (spare)' });
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
      const ampsPerPhase = phase === 3 ? (totalPowerW / voltage) / 1.732 : totalPowerW / voltage;
      const maxPanelsPerCircuit = powerPerPanel > 0 ? Math.floor((voltage * breaker) / powerPerPanel) : 0;
      const powerRows = [
        specRow('Total Power:', `${(totalPowerW / 1000).toFixed(2)} kW`),
        specRow('Amps/Phase:', `${ampsPerPhase.toFixed(1)} A (${phase}\u03C6)`),
        specRow('Max/Circuit:', `${maxPanelsPerCircuit} panels`),
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

