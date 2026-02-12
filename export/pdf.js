// ==================== PDF EXPORT ====================
// PDF export modal, gear list email, multi-screen PDF generation.

// PDF Export Options Modal Functions
let pdfExportOptions = {
  specs: true,
  gearList: true,
  standard: true,
  power: true,
  data: true,
  structure: true
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
}


// ==================== SEND TO JARED MODAL ====================

function openSendToJaredModal() {
  document.getElementById('sendToJaredModal').classList.add('active');
}

function closeSendToJaredModal() {
  document.getElementById('sendToJaredModal').classList.remove('active');
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
      return ` - ${value}x ${cleanLabel}${nl}`;
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
    const sp = sd.spares;

    // Screen header
    text += `${nl}${nl}`;
    text += `${sd.screenName.toUpperCase()}${nl}`;
    text += `======================================${nl}`;

    // Equipment
    text += hdr('Equipment');
    if(eq.isFirstScreenInGroup && eq.processorCount > 0) {
      text += line('Processor:', `${eq.processorCount}x ${eq.processorName}`);
      if(eq.distBoxCount > 0) text += line(`${eq.distBoxName}:`, eq.distBoxCount);
    } else if(eq.referencesScreenName) {
      text += ` - Processor: See ${eq.referencesScreenName}${nl}`;
    }
    text += ` - Panels: ${eq.activeFullPanels} x ${eq.panelBrand} ${eq.panelName}${nl}`;
    if(eq.activeHalfPanels > 0) text += ` - Half Panels: ${eq.activeHalfPanels} x ${eq.panelBrand} ${eq.halfPanelName}${nl}`;

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
      text += ` - ${count}x ${len}' Cat6${nl}`;
    }

    // Power Cables
    text += hdr('Power Cables');
    if(pc.jumperCount > 0) text += line(`Jumpers ${pc.powerJumperLen}':`, pc.jumperCount);
    text += line('Soca Splays:', pc.socaSplays);
    const socaLengths = Object.entries(pc.socaByLength).sort((a,b) => a[0] - b[0]);
    for(const [len, count] of socaLengths) {
      text += ` - ${count}x ${len}' Soca${nl}`;
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

    // Spares
    text += hdr('Spares');
    text += ` - Spare Soca Splays:${nl}`;
    text += ` - Spare Panel Count:${nl}`;
    if(sp.dataJumpers) text += ` - Spare Data Jumpers ${sp.dataJumperLen}':${nl}`;
    if(sp.crossJumpers) text += ` - Spare Data Cross Jumpers ${sp.crossJumperLen}':${nl}`;
    if(sp.cat5Couplers) text += ` - Spare Cat5 Couplers:${nl}`;
    if(sp.powerJumpers) text += ` - Spare Power Jumpers ${sp.powerJumperLen}':${nl}`;
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

function exportPDF(){
  try {
    // Save current screen data first to ensure all toggle states are persisted
    saveCurrentScreenData();

    // Reset print modes first to ensure clean state
    ecoPrintMode = false;
    greyscalePrintMode = false;

    // Enable eco-friendly printing mode if checkbox is checked (lighter colors, white backgrounds)
    const ecoFriendlyCheckbox = document.getElementById('pdfExportEcoFriendly');
    if (ecoFriendlyCheckbox && ecoFriendlyCheckbox.checked) {
      ecoPrintMode = true;
    }

    // Enable greyscale printing mode if checkbox is checked
    const greyscaleCheckbox = document.getElementById('pdfExportGreyscale');
    if (greyscaleCheckbox && greyscaleCheckbox.checked) {
      greyscalePrintMode = true;
    }

    if(!window.jspdf || !window.html2canvas){
      showAlert('PDF export libraries not loaded. Please check your internet connection and refresh the page.');
      ecoPrintMode = false; // Reset on error
      greyscalePrintMode = false;
      return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let yOffset = margin;
    
    // Save current screen so we can restore it later
    const originalScreenId = currentScreenId;
    
    // Create and show loading overlay to hide screen switching
    const overlay = document.createElement('div');
    overlay.id = 'pdfExportOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(26, 26, 26, 1.0);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
    `;
    overlay.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 20px;">Generating PDF...</div>
      <div id="pdfProgress" style="font-size: 16px; color: #888;">Preparing...</div>
      <div style="width: 200px; height: 4px; background: #2a2a2a; border-radius: 2px; margin-top: 20px; overflow: hidden;">
        <div id="pdfProgressBar" style="width: 0%; height: 100%; background: #4CAF50; transition: width 0.3s;"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    
    function updateProgress(text, percent) {
      const progressText = document.getElementById('pdfProgress');
      const progressBar = document.getElementById('pdfProgressBar');
      if(progressText) progressText.textContent = text;
      if(progressBar) progressBar.style.width = percent + '%';
    }
    
    function removeOverlay() {
      const overlay = document.getElementById('pdfExportOverlay');
      if(overlay) overlay.remove();
      // Reset print modes and re-render with normal colors
      if (ecoPrintMode || greyscalePrintMode) {
        ecoPrintMode = false;
        greyscalePrintMode = false;
        generateLayout('standard');
        generateLayout('power');
        generateLayout('data');
        generateStructureLayout();
      }
    }
    
    function checkPageBreak(heightNeeded) {
      if (yOffset + heightNeeded > pageHeight - margin) {
        pdf.addPage();
        yOffset = margin;
        return true;
      }
      return false;
    }
    
    // Title page
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('B.L.I.N.K. Report', margin, yOffset);
    
    // Add timestamp to the right of the title
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(100, 100, 100);
    const timestamp = new Date().toLocaleString();
    const timestampText = `Generated: ${timestamp}`;
    const timestampWidth = pdf.getTextWidth(timestampText);
    pdf.text(timestampText, pageWidth - margin - timestampWidth, yOffset);
    yOffset += 10;
    
    // Get all screen IDs sorted
    const screenIds = Object.keys(screens).sort((a, b) => {
      const numA = parseInt(a.split('_')[1]);
      const numB = parseInt(b.split('_')[1]);
      return numA - numB;
    });
    
    // ========== GEAR LIST DATA (shared with gear tab and email export) ==========
    const gearData = buildGearListData(screenIds);
    const processorGroups = gearData.processorGroups;
    
    // Add summary of all screens (count only, no names)
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Total Screens: ${screenIds.length}`, margin, yOffset);
    yOffset += 10;
    
    // Process each screen
    let screenIndex = 0;
    
    function processNextScreen() {
      if(screenIndex >= screenIds.length) {
        // All screens processed — add gear list as final page(s) if enabled
        if(pdfExportOptions.gearList) {
          addGearListPages();
        } else {
          finalizePDF();
        }
        return;
      }

      const screenId = screenIds[screenIndex];
      const screen = screens[screenId];

      updateProgress(`Processing screen ${screenIndex + 1} of ${screenIds.length}: ${screen.name}`,
        Math.round((screenIndex / screenIds.length) * 80));

      // Switch to this screen to load its data
      switchToScreen(screenId);

      // Wait for calculate to complete, then capture
      setTimeout(() => {
        // Add page break before each screen (except first)
        if(screenIndex > 0) {
          pdf.addPage();
          yOffset = margin;
        }

        // ========== PAGE 1: Screen header + Two columns (Specs left, Gear List right) ==========

        // Screen header
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Screen ${screenIndex + 1}: ${screen.name}`, margin, yOffset);
        yOffset += 8;

        // Two-column layout setup
        const col1X = margin;
        const col2X = pageWidth / 2 + 2;
        const colWidth = (pageWidth - 2 * margin - 4) / 2;
        const lineHeight = 3.5;
        let col1Y = yOffset;
        let col2Y = yOffset;

        // ========== LEFT COLUMN: SPECS (from screen data) ==========
        const allPanels = getAllPanels();
        const allProcessors = getAllProcessors();
        const data = screen.data;
        const calcData = screen.calculatedData || {};
        const panelType = data.panelType || 'CB5_MKII';
        const p = allPanels[panelType];
        const pw = parseInt(data.panelsWide) || 0;
        const ph = parseInt(data.panelsHigh) || 0;
        const pr = allProcessors[data.processor] || allProcessors['Brompton_SX40'];

        function addSpecLine(label, value) {
          if(value === undefined || value === null || value === '') return;
          pdf.setFontSize(8);
          pdf.setFont(undefined, 'bold');
          pdf.text(label, col1X, col1Y);
          const labelWidth = pdf.getTextWidth(label);
          pdf.setFont(undefined, 'normal');
          pdf.text(' ' + String(value), col1X + labelWidth, col1Y);
          col1Y += lineHeight;
        }

        function addSpecHeader(title) {
          col1Y += 2;
          pdf.setFontSize(9);
          pdf.setFont(undefined, 'bold');
          pdf.text(title, col1X, col1Y);
          const textWidth = pdf.getTextWidth(title);
          pdf.line(col1X, col1Y + 0.5, col1X + textWidth, col1Y + 0.5);
          pdf.setFont(undefined, 'normal');
          col1Y += 4.5;
        }

        // Calculate wall dimensions
        if(p && pw > 0 && ph > 0) {
          const wallResX = pw * p.res_x;
          const wallResY = ph * p.res_y;
          // Panel dimensions are stored in meters (width_m, height_m)
          const panelWidthMm = (p.width_m || 0) * 1000;
          const panelHeightMm = (p.height_m || 0) * 1000;
          const wallWidthMm = pw * panelWidthMm;
          const wallHeightMm = ph * panelHeightMm;
          const wallWidthFt = wallWidthMm > 0 ? (wallWidthMm / 304.8).toFixed(2) : '0';
          const wallHeightFt = wallHeightMm > 0 ? (wallHeightMm / 304.8).toFixed(2) : '0';
          const wallWidthM = wallWidthMm > 0 ? (wallWidthMm / 1000).toFixed(2) : '0';
          const wallHeightM = wallHeightMm > 0 ? (wallHeightMm / 1000).toFixed(2) : '0';
          const activePanels = calcData.activePanels || (pw * ph);
          const totalPixels = wallResX * wallResY;
          const exportUseConnectingPlates = (panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF') && data.connectionMethod === 'plates';

          // Use stored panel-only weight (already calculated without bumpers)
          const panelOnlyWeightKg = calcData.panelWeightOnlyKg || (activePanels * getPanelWeight(panelType, exportUseConnectingPlates));
          const panelOnlyWeightLbs = Math.ceil(panelOnlyWeightKg * 2.20462);

          // Calculate power (stored as power_max_w, power_avg_w in panels object)
          const powerType = data.powerType || 'max';
          const powerPerPanel = powerType === 'max' ? (p.power_max_w || 0) : (p.power_avg_w || 0);
          const totalPowerW = activePanels * powerPerPanel;
          const voltage = parseInt(data.voltage) || 208;
          const breaker = parseInt(data.breaker) || 20;
          const phase = parseInt(data.phase) || 3;
          const ampsSingle = voltage > 0 ? totalPowerW / voltage : 0;
          const ampsPerPhase = phase === 3 ? ampsSingle / 1.732 : ampsSingle;

          // Calculate max panels per circuit
          const derate = 1.0;
          const circuitW = voltage * breaker * derate;
          const maxPanelsPerCircuit = powerPerPanel > 0 ? Math.floor(circuitW / powerPerPanel) : 0;

          // Panel dimensions for display
          const panelWidthFt = (p.width_m * 3.28084).toFixed(3);
          const panelHeightFt = (p.height_m * 3.28084).toFixed(3);
          const panelWidthM = p.width_m.toFixed(3);
          const panelHeightM = p.height_m.toFixed(3);
          const exportPanelWeightKg = getPanelWeight(panelType, exportUseConnectingPlates);
          const panelWeightLbs = Math.ceil(exportPanelWeightKg * 2.20462);

          // Only add specs if enabled in export options
          if(pdfExportOptions.specs) {
          // PANEL section
          addSpecHeader('PANEL');
          addSpecLine('Panel:', `${p.brand || ''} ${p.name || panelType}`);
          addSpecLine('Pixel Pitch:', `${p.pixel_pitch_mm} mm`);
          addSpecLine('Panel Size:', `${panelWidthFt}' × ${panelHeightFt}' (${panelWidthM} × ${panelHeightM} m)`);
          addSpecLine('Panel Res:', `${p.res_x} × ${p.res_y}`);

          // Show complex details if any layout or gear list option is selected (indicates complex/combined mode export)
          const showComplexDetails = pdfExportOptions.standard || pdfExportOptions.power || pdfExportOptions.data || pdfExportOptions.structure || pdfExportOptions.gearList;
          if(showComplexDetails) {
            // Complex mode: show additional panel specs
            if(p.brightness_nits) addSpecLine('Brightness:', `${p.brightness_nits} nits`);
            if(exportPanelWeightKg) addSpecLine('Weight/Panel:', `${panelWeightLbs} lbs (${Math.ceil(exportPanelWeightKg)} kg)`);
            addSpecLine('Panel Power:', `${p.power_max_w} W / ${p.power_avg_w} W (Max/Avg)`);
            if(p.max_hanging !== null && p.max_hanging !== undefined) addSpecLine('Max Hanging:', `${p.max_hanging} panels`);
            if(p.max_stacking !== null && p.max_stacking !== undefined) addSpecLine('Max Stacking:', `${p.max_stacking} panels`);
            if(p.bumper_1w_lbs !== null && p.bumper_1w_lbs !== undefined) {
              addSpecLine('Bumper Weights:', `1W=${Math.ceil(p.bumper_1w_lbs)} lbs, 2W=${Math.ceil(p.bumper_2w_lbs)} lbs`);
            }
          } else {
            // Simple mode: just weight per panel
            if(exportPanelWeightKg) addSpecLine('Weight/Panel:', `${panelWeightLbs} lbs (${Math.ceil(exportPanelWeightKg)} kg)`);
          }

          // WALL section
          addSpecHeader('WALL');
          addSpecLine('Dimensions:', `${wallWidthFt}' × ${wallHeightFt}' (${pw} × ${ph} panels)`);
          addSpecLine('Total Panels:', activePanels.toString());
          addSpecLine('Resolution:', `${wallResX} × ${wallResY} px`);
          addSpecLine('Total Pixels:', totalPixels.toLocaleString() + ' px');

          // Weight display depends on mode
          if(showComplexDetails) {
            // Complex mode: show total weight with breakdown
            // Structure = Bumpers + Connecting Plates + Ground Support Hardware (or Floor Frames for floor mode)
            const structureType = data.structureType || 'hanging';
            let structureWeightKg = 0;

            if(structureType === 'floor' && p && p.is_floor_panel && p.floor_frames) {
              // Floor mode: Structure = Floor Frames
              const floorFrames = calcData.floorFrames || {};
              if(floorFrames.totalWeightLbs) {
                structureWeightKg = floorFrames.totalWeightLbs / 2.20462;
              } else if(floorFrames.totalWeightKg) {
                structureWeightKg = floorFrames.totalWeightKg;
              }
            } else {
              // Hanging or Ground Stack: Structure = Bumpers + Plates + Ground Support
              const bumperWeightKg = calcData.bumperWeightKg || 0;
              structureWeightKg += bumperWeightKg;

              // Add connecting plates weight
              const platesWeightKg = calcData.platesWeightKg || 0;
              structureWeightKg += platesWeightKg;

              // Add ground support hardware weight for ground stack mode
              if(structureType === 'ground') {
                const groundSupportWeightKg = calcData.groundSupportWeightKg || 0;
                structureWeightKg += groundSupportWeightKg;
              }
            }

            const totalWeightKg = panelOnlyWeightKg + structureWeightKg;
            const totalWeightLbs = Math.ceil(totalWeightKg * 2.20462);

            addSpecLine('Total Weight:', `${totalWeightLbs} lbs (${Math.ceil(totalWeightKg)} kg)`);
            if(structureWeightKg > 0 || structureType === 'floor') {
              addSpecLine('  Panels:', `${panelOnlyWeightLbs} lbs (${Math.ceil(panelOnlyWeightKg)} kg)`);
              const structureWeightLbs = Math.ceil(structureWeightKg * 2.20462);
              addSpecLine('  Structure:', `${structureWeightLbs} lbs (${Math.ceil(structureWeightKg)} kg)`);
            }
          } else {
            // Simple mode: show panel-only weight
            addSpecLine('Wall Weight:', `${panelOnlyWeightLbs} lbs (${Math.ceil(panelOnlyWeightKg)} kg)`);
          }

          // POWER section
          const powerHeader = powerType === 'max' ? 'POWER (MAX)' : 'POWER (AVG)';
          addSpecHeader(powerHeader);
          addSpecLine('Total Power:', totalPowerW.toLocaleString() + ' W');
          addSpecLine('Total Amps:', `${ampsSingle.toFixed(2)} A @ ${voltage}V`);
          if(phase === 3) {
            addSpecLine('Amps/Phase:', `${ampsPerPhase.toFixed(2)} A @ ${voltage}V`);
          }
          const circuitsNeeded = calcData.circuitsNeeded || 0;
          addSpecLine('Circuits:', circuitsNeeded.toString());
          addSpecLine('Max Panels/Circuit:', maxPanelsPerCircuit.toString());

          // DATA section
          addSpecHeader('DATA');
          const portCapacity = pr.base_pixels_1g || 0;
          const maxPanelsPerData = calcData.panelsPerDataLine || 0;

          if(showComplexDetails) {
            // Complex mode: show all data specs
            let processorName = pr.name || data.processor;
            // For PDF, just use plain text without HTML tags
            addSpecLine('Processor:', processorName);
            const dataLines = calcData.dataLines || 0;
            const portsNeeded = calcData.portsNeededFinal || calcData.portsNeeded || 0;
            addSpecLine('Data Lines:', dataLines.toString());
            addSpecLine('Ports Needed:', portsNeeded.toString());
            addSpecLine('Port Capacity:', portCapacity.toLocaleString() + ' px');
            addSpecLine('Max Panels/Data:', maxPanelsPerData.toString());
            const frameRate = data.frameRate || '60';
            const bitDepth = data.bitDepth || '8';
            addSpecLine('Frame Rate:', frameRate + ' Hz');
            addSpecLine('Bit Depth:', bitDepth + '-bit');
            const redundancy = data.redundancy ? 'Yes' : 'No';
            addSpecLine('Redundancy:', redundancy);
          } else {
            // Simple mode: only show port capacity and max panels per data line
            addSpecLine('Port Capacity:', portCapacity.toLocaleString() + ' px');
            addSpecLine('Max Panels/Data:', maxPanelsPerData.toString());
          }
          } // End of pdfExportOptions.specs check
        }

        // Include layouts if any layout option is selected
        const includeAnyLayout = pdfExportOptions.standard || pdfExportOptions.power || pdfExportOptions.data || pdfExportOptions.structure;
        if(includeAnyLayout) {
          // Force show main container first (parent of layout containers)
          // This is critical when exporting from Combined view where mainContainer is hidden
          const mainContainer = document.querySelector('.main-container');
          const mainContainerWasHidden = mainContainer && mainContainer.style.display === 'none';
          if(mainContainer) mainContainer.style.display = 'block';

          // Force show all layout containers before capturing
          const standardContainer = document.getElementById('standardContainer');
          const powerContainer = document.getElementById('powerContainer');
          const dataContainer = document.getElementById('dataContainer');
          const structureContainer = document.getElementById('structureContainer');

          if(standardContainer) standardContainer.style.display = 'block';
          if(powerContainer) powerContainer.style.display = 'block';
          if(dataContainer) dataContainer.style.display = 'block';
          if(structureContainer) structureContainer.style.display = 'block';

          // Force a browser reflow to ensure containers have proper width
          if(mainContainer) void mainContainer.offsetWidth;
          if(standardContainer) void standardContainer.offsetWidth;
          if(powerContainer) void powerContainer.offsetWidth;
          if(dataContainer) void dataContainer.offsetWidth;
          if(structureContainer) void structureContainer.offsetWidth;

          // Explicitly regenerate all layouts for this screen
          generateLayout('standard');
          generateLayout('power');
          generateLayout('data');
          generateStructureLayout();

          // Wait a bit for layouts to render, then capture them
          setTimeout(() => {
            addScreenLayouts(screenId, screen.name);
          }, 150);
        } else {
          // No layouts selected: skip layouts, move to next screen
          screenIndex++;
          setTimeout(processNextScreen, 50);
        }
      }, 50);
    }

    // Add gear list content to a column (inline version for page 1)
    // Consumes pre-built screen data from buildGearListData()
    function addGearListToColumn(sd, colX, startY, colWidth, lineHeight) {
      let colY = startY;
      if(!sd) return colY;

      const eq = sd.equipment;
      const rig = sd.rigging;
      const gs = sd.groundSupport;
      const fh = sd.floorHardware;
      const dc = sd.dataCables;
      const pc = sd.powerCables;
      const p2d = sd.processorToDistBox;
      const sp = sd.spares;

      function addGearLine(label, value) {
        if(value === '0' || value === '' || value === null || value === undefined) return;
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text(label, colX, colY);
        const labelWidth = pdf.getTextWidth(label);
        pdf.text(String(value), colX + labelWidth + 1, colY);
        colY += lineHeight;
      }

      function addGearHeader(title) {
        colY += 1.5;
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.text(title, colX, colY);
        colY += 4;
      }

      // Equipment
      addGearHeader('Equipment');
      if(eq.isFirstScreenInGroup && eq.processorCount > 0) {
        addGearLine('Processor:', `${eq.processorCount}x ${eq.processorName}`);
        if(eq.distBoxCount > 0) {
          addGearLine(`${eq.distBoxName}:`, eq.distBoxCount.toString());
        }
      } else if(eq.referencesScreenName) {
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Processor: See ${eq.referencesScreenName}`, colX, colY);
        colY += lineHeight;
      }
      // Panel display — brand + half split when CB5 half row exists
      if(eq.activeHalfPanels > 0) {
        addGearLine(`${eq.panelBrand} ${eq.panelName}:`, eq.activeFullPanels.toString());
        addGearLine(`${eq.panelBrand} ${eq.halfPanelName}:`, eq.activeHalfPanels.toString());
      } else {
        addGearLine('Panel Count:', eq.activePanels.toString());
      }

      // Rigging (hide section if empty)
      if(rig.hasRigging) {
        addGearHeader('Rigging Hardware');
        addGearLine('1W Bumpers:', rig.bumper1w.toString());
        addGearLine('2W Bumpers:', rig.bumper2w.toString());
        addGearLine('4W Bumpers:', rig.bumper4w.toString());
        addGearLine('4W Connecting Plates:', rig.plates4way.toString());
        addGearLine('2W Connecting Plates:', rig.plates2way.toString());
        if(rig.shackles > 0) addGearLine('5/8" Shackles:', rig.shackles.toString());
        if(rig.cheeseye > 0) addGearLine('Cheeseye:', rig.cheeseye.toString());
      }

      // Ground Support (hide section if empty)
      if(gs.hasGS) {
        addGearHeader('Ground Support');
        addGearLine('Rear Truss:', gs.rearTruss.toString());
        addGearLine('Base Truss:', gs.baseTruss.toString());
        addGearLine('Bridge Clamps:', gs.bridgeClamps.toString());
        addGearLine('Rear Bridge Adapter:', gs.rearBridgeAdapters.toString());
        addGearLine('Sandbags:', gs.sandbags.toString());
        addGearLine('Swivel Cheeseborough:', gs.swivelCheeseboroughs.toString());
        addGearLine('Pipe' + gs.pipeLengthStr + ':', gs.pipes.toString());
      }

      // Floor Hardware (hide if empty)
      if(fh.hasFloorFrames) {
        addGearHeader('Floor Hardware');
        if(fh.frame3x2 > 0) addGearLine('3×2 Frame:', fh.frame3x2.toString());
        if(fh.frame2x2 > 0) addGearLine('2×2 Frame:', fh.frame2x2.toString());
        if(fh.frame2x1 > 0) addGearLine('2×1 Frame:', fh.frame2x1.toString());
        if(fh.frame1x1 > 0) addGearLine('1×1 Frame:', fh.frame1x1.toString());
      }

      // Data Cables
      addGearHeader('Data Cables');
      if(dc.jumperCount > 0) {
        addGearLine(`Data Jumpers ${dc.dataJumperLen}:`, dc.jumperCount.toString());
      }
      if(dc.crossJumperCount > 0 && dc.crossJumperLen) {
        addGearLine(`Data Cross Jumpers ${dc.crossJumperLen}:`, dc.crossJumperCount.toString());
      }
      if(dc.cat5CouplerCount > 0) {
        addGearLine('Cat5 Couplers:', dc.cat5CouplerCount.toString());
      }
      // Dynamic cat6 lengths — only show lengths that exist
      const cat6Lengths = Object.keys(dc.cat6ByLength).map(Number).sort((a, b) => b - a);
      cat6Lengths.forEach(len => {
        addGearLine(`${len}' Cat6:`, dc.cat6ByLength[len].toString());
      });

      // Power Cables
      addGearHeader('Power Cables');
      if(pc.jumperCount > 0) {
        addGearLine(`Power Jumpers ${pc.powerJumperLen}:`, pc.jumperCount.toString());
      }
      addGearLine('Soca Splays:', pc.socaSplays.toString());
      // Dynamic soca lengths — only show lengths that exist
      const socaLengths = Object.keys(pc.socaByLength).map(Number).sort((a, b) => b - a);
      socaLengths.forEach(len => {
        addGearLine(`${len}' Soca:`, pc.socaByLength[len].toString());
      });
      addGearLine("25' True1:", pc.true1_25.toString());
      addGearLine("10' True1:", pc.true1_10.toString());
      addGearLine("5' True1:", pc.true1_5.toString());
      if(pc.true1Twofer > 0) addGearLine('True1 Twofer:', pc.true1Twofer.toString());

      // Processor → Dist Box
      if(p2d.count > 0) {
        addGearHeader('Processor → Dist Box');
        addGearLine(`${p2d.cableType} ${p2d.cableLength}':`, p2d.count.toString());
      }

      // Spares
      addGearHeader('SPARES');
      if(sp.socaSplays) addGearLine('Spare Soca Splays:', '');
      if(sp.panelCount) addGearLine('Spare Panel Count:', '');
      if(sp.dataJumpers) addGearLine(`Spare Data Jumpers ${sp.dataJumperLen}:`, '');
      if(sp.crossJumpers) addGearLine(`Spare Data Cross Jumpers ${sp.crossJumperLen}:`, '');
      if(sp.cat5Couplers) addGearLine('Spare Cat5 Couplers:', '');
      if(sp.powerJumpers) addGearLine(`Spare Power Jumpers ${sp.powerJumperLen}:`, '');
      if(sp.soca) addGearLine('Spare Soca:', '');
      if(sp.data) addGearLine('Spare Data:', '');
      if(sp.fiber) addGearLine('Spare Fiber:', '');
      return colY;
    }

    function addGearListPages() {
      updateProgress('Adding gear list...', 85);
      pdf.addPage();
      yOffset = margin;

      // Page title
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Gear List', margin, yOffset);
      yOffset += 10;

      const lineHeight = 3.5;
      const colX = margin;
      const colWidth = pageWidth - 2 * margin;

      // Per-screen gear
      gearData.screens.forEach((sd) => {
        // Check if we need a new page
        if(yOffset > pageHeight - margin - 40) {
          pdf.addPage();
          yOffset = margin;
        }

        // Screen header
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(sd.screenName, colX, yOffset);
        const headerWidth = pdf.getTextWidth(sd.screenName);
        pdf.setDrawColor(0, 0, 0);
        pdf.line(colX, yOffset + 1, colX + headerWidth, yOffset + 1);
        yOffset += 6;

        // Render per-screen gear (returns final Y position)
        yOffset = addGearListToColumn(sd, colX, yOffset, colWidth, lineHeight);
        yOffset += 6; // spacing between screens
      });

      // System-wide: Signal Cables
      const pdfSig = gearData.signalCables;
      if(pdfSig) {
        if(yOffset > pageHeight - margin - 40) {
          pdf.addPage();
          yOffset = margin;
        }

        // System header
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('System', colX, yOffset);
        const sysWidth = pdf.getTextWidth('System');
        pdf.setDrawColor(0, 0, 0);
        pdf.line(colX, yOffset + 1, colX + sysWidth, yOffset + 1);
        yOffset += 6;

        yOffset += 1.5;
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.text('Signal Cables', colX, yOffset);
        yOffset += 4;

        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        if(pdfSig.serverFiberLine) {
          pdf.text(`${pdfSig.serverFiberLine.label}: ${pdfSig.serverFiberLine.count}`, colX, yOffset);
          yOffset += lineHeight;
        }
        const sdiLengths = Object.keys(pdfSig.sdiByLength).map(Number).sort((a, b) => b - a);
        sdiLengths.forEach(len => {
          if(pdfSig.sdiByLength[len] > 0) {
            pdf.text(`${len}' ${pdfSig.sdiType}: ${pdfSig.sdiByLength[len]}`, colX, yOffset);
            yOffset += lineHeight;
          }
        });
        pdf.text(`25' HDMI: ${pdfSig.hdmi[25]}`, colX, yOffset); yOffset += lineHeight;
        pdf.text(`10' HDMI: ${pdfSig.hdmi[10]}`, colX, yOffset); yOffset += lineHeight;
        pdf.text(`6' HDMI: ${pdfSig.hdmi[6]}`, colX, yOffset); yOffset += lineHeight;
        yOffset += 3;
      }

      // System-wide: Utility
      const pdfUtil = gearData.utility;
      if(pdfUtil) {
        if(yOffset > pageHeight - margin - 30) {
          pdf.addPage();
          yOffset = margin;
        }
        yOffset += 1.5;
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.text('Utility', colX, yOffset);
        yOffset += 4;

        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text(`UG 10': ${pdfUtil.ug10}`, colX, yOffset); yOffset += lineHeight;
        pdf.text(`UG 25': ${pdfUtil.ug25}`, colX, yOffset); yOffset += lineHeight;
        pdf.text(`UG 50': ${pdfUtil.ug50}`, colX, yOffset); yOffset += lineHeight;
        pdf.text(`UG Twofers: ${pdfUtil.ugTwofers}`, colX, yOffset); yOffset += lineHeight;
        pdf.text(`Power Bars: ${pdfUtil.powerBars}`, colX, yOffset); yOffset += lineHeight;
      }

      finalizePDF();
    }

    function addScreenLayouts(screenId, screenName) {
      // Build layouts array based on export options
      const layouts = [];
      if(pdfExportOptions.standard) {
        layouts.push({ containerId: 'standardContainer', canvasId: 'standardCanvas', title: 'Standard Layout' });
      }
      if(pdfExportOptions.power) {
        layouts.push({ containerId: 'powerContainer', canvasId: 'powerCanvas', title: 'Power Layout' });
      }
      if(pdfExportOptions.data) {
        layouts.push({ containerId: 'dataContainer', canvasId: 'dataCanvas', title: 'Data Layout' });
      }

      // Only add a new page if we have layouts to add
      if(layouts.length > 0) {
        pdf.addPage();
        yOffset = margin;
      }
      
      let layoutIndex = 0;
      
      function addNextLayout() {
        if(layoutIndex >= layouts.length) {
          // All main layouts done, now add Structure View page if enabled
          if(pdfExportOptions.structure) {
            addStructureViewPage(screenId, screenName, function() {
              // After structure view, move to next screen (gear list is already on page 1)
              screenIndex++;
              processNextScreen();
            });
          } else {
            // Skip structure view, move to next screen
            screenIndex++;
            processNextScreen();
          }
          return;
        }
        
        const layout = layouts[layoutIndex];
        const container = document.getElementById(layout.containerId);
        const canvas = document.getElementById(layout.canvasId);
        
        if(container && container.style.display !== 'none' && canvas && canvas.width > 0) {
          // Use print-friendly colors when in print mode
          const canvasImg = getCanvasDataURLForPDF(canvas);

          // Fixed WIDTH for all layouts, height scales proportionally
          const fixedWidth = 114; // mm - same width for all layouts
          const maxHeight = 70;   // mm - maximum height cap

          // Calculate height maintaining aspect ratio
          const aspectRatio = canvas.height / canvas.width;
          let imgWidth = fixedWidth;
          let imgHeight = fixedWidth * aspectRatio;

          // Cap height if too tall (for very vertical layouts)
          if(imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = maxHeight / aspectRatio;
          }

          // Check if we need a new page
          const neededHeight = imgHeight + 14;
          if(yOffset + neededHeight > pageHeight - margin) {
            pdf.addPage();
            yOffset = margin;
          }

          // Add layout title
          pdf.setFontSize(11);
          pdf.setTextColor(0, 0, 0);
          pdf.text(layout.title, margin, yOffset);
          yOffset += 6;

          // Add layout image - width is consistent, height varies by aspect ratio
          pdf.addImage(canvasImg, 'JPEG', margin, yOffset, imgWidth, imgHeight);
          yOffset += imgHeight + 4;

          yOffset += 4;
        }
        
        layoutIndex++;
        setTimeout(addNextLayout, 10);
      }
      
      addNextLayout();
    }
    
    // Add dedicated Structure View page
    function addStructureViewPage(screenId, screenName, callback) {
      const container = document.getElementById('structureContainer');
      const canvas = document.getElementById('structureCanvas');
      
      if(!container || container.style.display === 'none' || !canvas || canvas.width === 0) {
        // No structure view, skip to callback
        if(callback) setTimeout(callback, 10);
        return;
      }
      
      try {
        // Start new page for Structure View
        pdf.addPage();
        yOffset = margin;
        
        // Page title
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Structure Layout', margin, yOffset);
        yOffset += 8;
        
        // Add structure canvas image - use print-friendly colors when in print mode
        const canvasImg = getCanvasDataURLForPDF(canvas);
        const fixedWidth = 160; // Wider for structure view page
        const maxHeight = 80;

        const aspectRatio = canvas.height / canvas.width;
        let imgWidth = fixedWidth;
        let imgHeight = fixedWidth * aspectRatio;

        if(imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = maxHeight / aspectRatio;
        }

        pdf.addImage(canvasImg, 'JPEG', margin, yOffset, imgWidth, imgHeight);
        yOffset += imgHeight + 8;
        
        // Now add the structure info in a clean 2-column layout below
        const hasPickupWeights = bumpers.length > 0;
        const panelType = document.getElementById('panelType').value;
        const useConnectingPlates = shouldUseConnectingPlates(panelType);
        const platesBox = document.getElementById('structurePlatesBox');
        const hasConnectingPlates = useConnectingPlates && platesBox && platesBox.style.display !== 'none';
        const isGroundStacking = showBottomBumper;
        const {pw, ph} = getEffectivePanelCountsForLayout();
        
        // Column positions for structure info
        const col1X = margin;
        const col2X = margin + 95; // Second column starts 95mm from margin
        const colLabelX = 2;
        const colValueX = 48;
        
        let col1Y = yOffset;
        let col2Y = yOffset;
        
        const wtUnit = displayWeightUnit === 'lbs' ? 'lbs' : 'kg';
        
        // ========== COLUMN 1 ==========
        
        // Pickup Weights
        let pickupWeightKg = 0;
        if(hasPickupWeights) {
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'bold');
          pdf.text('Pickup Weights', col1X, col1Y);
          col1Y += 5;
          
          const topBumpers = bumpers.filter(b => b.position === 'top');
          const bottomBumpers = bumpers.filter(b => b.position === 'bottom');
          
          // Helper function to check if a 2W bumper is under a 4W bumper
          function is2wUnder4wPdf(bumper2w, position) {
            const fourWayBumpers = bumpers.filter(b => b.type === '4w' && b.position === position);
            for(const b4w of fourWayBumpers) {
              const col4wStart = b4w.startCol - 1;
              const col4wEnd = b4w.endCol;
              if(bumper2w.startCol >= col4wStart && bumper2w.endCol <= col4wEnd) {
                return true;
              }
            }
            return false;
          }
          
          pdf.setFontSize(9);
          pdf.setFont(undefined, 'normal');
          
          // Top bumpers (skip 2W under 4W)
          if(topBumpers.length > 0) {
            const sortedTop = [...topBumpers].sort((a, b) => {
              const order = { '4w': 0, '2w': 1, '1w': 2 };
              return order[a.type] - order[b.type];
            });
            const counts = { '4w': 0, '2w': 0, '1w': 0 };
            sortedTop.forEach((bumper) => {
              // Skip 2W bumpers under 4W bumpers
              if(bumper.type === '2w' && is2wUnder4wPdf(bumper, 'top')) {
                return;
              }
              counts[bumper.type]++;
              const weight = calculateBumperPickupWeight(bumper);
              pickupWeightKg += weight.kg;
              const label = bumper.type === '4w' ? '4W' : bumper.type === '2w' ? '2W' : '1W';
              const weightDisplay = displayWeightUnit === 'lbs' ? Math.ceil(weight.lbs) : Math.ceil(weight.kg);
              pdf.text(`${label} #${counts[bumper.type]}`, col1X + colLabelX, col1Y);
              pdf.text(`${weightDisplay} ${wtUnit}`, col1X + colValueX, col1Y, { align: 'right' });
              col1Y += 3.5;
            });
          }

          // Bottom bumpers (skip 2W under 4W)
          if(bottomBumpers.length > 0) {
            const sortedBottom = [...bottomBumpers].sort((a, b) => {
              const order = { '4w': 0, '2w': 1, '1w': 2 };
              return order[a.type] - order[b.type];
            });
            const counts = { '4w': 0, '2w': 0, '1w': 0 };
            sortedBottom.forEach((bumper) => {
              // Skip 2W bumpers under 4W bumpers
              if(bumper.type === '2w' && is2wUnder4wPdf(bumper, 'bottom')) {
                return;
              }
              counts[bumper.type]++;
              const weight = calculateBumperPickupWeight(bumper);
              pickupWeightKg += weight.kg;
              const label = bumper.type === '4w' ? '4W' : bumper.type === '2w' ? '2W' : '1W';
              const weightDisplay = displayWeightUnit === 'lbs' ? Math.ceil(weight.lbs) : Math.ceil(weight.kg);
              pdf.text(`${label} #${counts[bumper.type]}`, col1X + colLabelX, col1Y);
              pdf.text(`${weightDisplay} ${wtUnit}`, col1X + colValueX, col1Y, { align: 'right' });
              col1Y += 3.5;
            });
          }

          // Total line
          pdf.setDrawColor(100, 100, 100);
          pdf.line(col1X + colLabelX, col1Y, col1X + colValueX, col1Y);
          col1Y += 3;
          pdf.setFont(undefined, 'bold');
          pdf.text('Total', col1X + colLabelX, col1Y);
          const totalPickupDisplay = displayWeightUnit === 'lbs' ? Math.ceil(pickupWeightKg * KG_TO_LBS) : Math.ceil(pickupWeightKg);
          pdf.text(`${totalPickupDisplay} ${wtUnit}`, col1X + colValueX, col1Y, { align: 'right' });
          pdf.setFont(undefined, 'normal');
          col1Y += 6;
        }
        
        // Ground Support Hardware (in column 1, below pickup weights)
        let groundSupportWeightKg = 0;
        if(isGroundStacking && pw > 0 && ph > 0) {
          const hardware = calculateGroundSupportHardware(pw, ph);
          
          if(hardware.totalRearTruss > 0 || hardware.totalBridgeClamps > 0 || hardware.totalBaseTruss > 0) {
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            pdf.text('Ground Support Hardware', col1X, col1Y);
            col1Y += 5;
            
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'normal');
            
            if(hardware.totalRearTruss > 0) {
              pdf.text('Rear Truss', col1X + colLabelX, col1Y);
              pdf.text(hardware.totalRearTruss.toString(), col1X + colValueX, col1Y, { align: 'right' });
              col1Y += 3.5;
            }
            if(hardware.totalBaseTruss > 0) {
              pdf.text('Base Truss', col1X + colLabelX, col1Y);
              pdf.text(hardware.totalBaseTruss.toString(), col1X + colValueX, col1Y, { align: 'right' });
              col1Y += 3.5;
            }
            if(hardware.totalBridgeClamps > 0) {
              pdf.text('Bridge Clamps', col1X + colLabelX, col1Y);
              pdf.text(hardware.totalBridgeClamps.toString(), col1X + colValueX, col1Y, { align: 'right' });
              col1Y += 3.5;
            }
            if(hardware.totalRearBridgeClampAdapters > 0) {
              pdf.text('Rear Bridge Clamp Adapter', col1X + colLabelX, col1Y);
              pdf.text(hardware.totalRearBridgeClampAdapters.toString(), col1X + colValueX, col1Y, { align: 'right' });
              col1Y += 3.5;
            }
            if(hardware.totalPipes > 0) {
              const uniqueLengths = [...new Set(hardware.pipeInfo.map(p => p.pipeLengthFt))];
              const pipeLengthStr = uniqueLengths.map(l => l + 'ft').join(', ');
              pdf.text('Pipe (' + pipeLengthStr + ')', col1X + colLabelX, col1Y);
              pdf.text(hardware.totalPipes.toString(), col1X + colValueX, col1Y, { align: 'right' });
              col1Y += 3.5;
            }
            if(hardware.totalSwivelCheeseboroughs > 0) {
              pdf.text('Swivel Cheeseborough', col1X + colLabelX, col1Y);
              pdf.text(hardware.totalSwivelCheeseboroughs.toString(), col1X + colValueX, col1Y, { align: 'right' });
              col1Y += 3.5;
            }
            if(hardware.totalSandbags > 0) {
              pdf.text('Sandbags (25lb)', col1X + colLabelX, col1Y);
              pdf.text(hardware.totalSandbags.toString(), col1X + colValueX, col1Y, { align: 'right' });
              col1Y += 3.5;
            }
            
            // Total weight
            pdf.setDrawColor(100, 100, 100);
            pdf.line(col1X + colLabelX, col1Y, col1X + colValueX, col1Y);
            col1Y += 3;
            pdf.setFont(undefined, 'bold');
            pdf.text('Total Weight', col1X + colLabelX, col1Y);
            groundSupportWeightKg = hardware.totalWeightKg;
            const gsWeightDisplay = displayWeightUnit === 'lbs' ? Math.ceil(hardware.totalWeightLbs) : Math.ceil(hardware.totalWeightKg);
            pdf.text(`${gsWeightDisplay} ${wtUnit}`, col1X + colValueX, col1Y, { align: 'right' });
            pdf.setFont(undefined, 'normal');
            col1Y += 6;
          }
        }

        // Floor Frames (in column 1, below ground support)
        let floorFramesWeightKg = 0;
        const structureType = document.getElementById('structureType').value;
        const allPanelsForFloor = getAllPanels();
        const pFloor = allPanelsForFloor[panelType];

        if(structureType === 'floor' && pFloor && pFloor.is_floor_panel && pFloor.floor_frames && pw > 0 && ph > 0) {
          const frames = calculateFloorFrames(pw, ph, deletedPanels);
          const frameCounts = getFloorFrameCounts(frames);

          if(frameCounts.frame_1x1 > 0 || frameCounts.frame_2x1 > 0 || frameCounts.frame_2x2 > 0 || frameCounts.frame_3x2 > 0) {
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            pdf.text('Floor Frames', col1X, col1Y);
            col1Y += 5;

            pdf.setFontSize(9);
            pdf.setFont(undefined, 'normal');

            let totalWeightLbs = 0;

            if(frameCounts.frame_3x2 > 0) {
              pdf.text('3×2 Frame', col1X + colLabelX, col1Y);
              pdf.text(frameCounts.frame_3x2.toString(), col1X + colValueX, col1Y, { align: 'right' });
              col1Y += 3.5;
              if(pFloor.floor_frames.frame_3x2) totalWeightLbs += frameCounts.frame_3x2 * pFloor.floor_frames.frame_3x2.weight_lbs;
            }
            if(frameCounts.frame_2x2 > 0) {
              pdf.text('2×2 Frame', col1X + colLabelX, col1Y);
              pdf.text(frameCounts.frame_2x2.toString(), col1X + colValueX, col1Y, { align: 'right' });
              col1Y += 3.5;
              if(pFloor.floor_frames.frame_2x2) totalWeightLbs += frameCounts.frame_2x2 * pFloor.floor_frames.frame_2x2.weight_lbs;
            }
            if(frameCounts.frame_2x1 > 0) {
              pdf.text('2×1 Frame', col1X + colLabelX, col1Y);
              pdf.text(frameCounts.frame_2x1.toString(), col1X + colValueX, col1Y, { align: 'right' });
              col1Y += 3.5;
              if(pFloor.floor_frames.frame_2x1) totalWeightLbs += frameCounts.frame_2x1 * pFloor.floor_frames.frame_2x1.weight_lbs;
            }
            if(frameCounts.frame_1x1 > 0) {
              pdf.text('1×1 Frame', col1X + colLabelX, col1Y);
              pdf.text(frameCounts.frame_1x1.toString(), col1X + colValueX, col1Y, { align: 'right' });
              col1Y += 3.5;
              if(pFloor.floor_frames.frame_1x1) totalWeightLbs += frameCounts.frame_1x1 * pFloor.floor_frames.frame_1x1.weight_lbs;
            }

            floorFramesWeightKg = totalWeightLbs / KG_TO_LBS;

            // Total weight
            pdf.setDrawColor(100, 100, 100);
            pdf.line(col1X + colLabelX, col1Y, col1X + colValueX, col1Y);
            col1Y += 3;
            pdf.setFont(undefined, 'bold');
            pdf.text('Total Weight', col1X + colLabelX, col1Y);
            const floorWeightDisplay = displayWeightUnit === 'lbs' ? Math.ceil(totalWeightLbs) : Math.ceil(floorFramesWeightKg);
            pdf.text(`${floorWeightDisplay} ${wtUnit}`, col1X + colValueX, col1Y, { align: 'right' });
            pdf.setFont(undefined, 'normal');
            col1Y += 6;
          }
        }

        // ========== COLUMN 2 ==========

        // Connecting Plates
        let platesWeightKg = 0;
        if(hasConnectingPlates && pw > 0 && ph > 0) {
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'bold');
          pdf.text('Connecting Plates', col2X, col2Y);
          col2Y += 5;
          
          const plates = calculateConnectingPlates(pw, ph, PLATE_WEIGHTS.plate2wayKg, PLATE_WEIGHTS.plate4wayKg);
          platesWeightKg = plates.totalPlateWeight;
          
          pdf.setFontSize(9);
          pdf.setFont(undefined, 'normal');
          
          if(plates.total2way > 0) {
            pdf.text('2-Way (yellow)', col2X + colLabelX, col2Y);
            pdf.text(plates.total2way.toString(), col2X + colValueX, col2Y, { align: 'right' });
            col2Y += 3.5;
          }
          if(plates.total4way > 0) {
            pdf.text('4-Way (red)', col2X + colLabelX, col2Y);
            pdf.text(plates.total4way.toString(), col2X + colValueX, col2Y, { align: 'right' });
            col2Y += 3.5;
          }
          
          pdf.setDrawColor(100, 100, 100);
          pdf.line(col2X + colLabelX, col2Y, col2X + colValueX, col2Y);
          col2Y += 3;
          pdf.setFont(undefined, 'bold');
          pdf.text('Total Weight', col2X + colLabelX, col2Y);
          const platesWeightDisplay = displayWeightUnit === 'lbs' ? Math.ceil(platesWeightKg * KG_TO_LBS) : Math.ceil(platesWeightKg);
          pdf.text(`${platesWeightDisplay} ${wtUnit}`, col2X + colValueX, col2Y, { align: 'right' });
          pdf.setFont(undefined, 'normal');
          col2Y += 6;
        }
        
        // Calculate bumper hardware weight (the actual weight of bumper hardware, not load being supported)
        const bumperHardwareWeightKg = calculateTotalBumperWeight(pw, ph);

        // Total Structure Weight (in column 2, below connecting plates)
        const totalStructureWeightKg = bumperHardwareWeightKg + platesWeightKg + groundSupportWeightKg + floorFramesWeightKg;
        const isFloorMode = structureType === 'floor';
        if(totalStructureWeightKg > 0 || isFloorMode) {
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'bold');
          pdf.text('Total Structure Weight', col2X, col2Y);
          col2Y += 5;

          pdf.setFontSize(9);
          pdf.setFont(undefined, 'normal');

          if(bumperHardwareWeightKg > 0 && !isFloorMode) {
            pdf.text('Bumpers', col2X + colLabelX, col2Y);
            const bumperDisplay = displayWeightUnit === 'lbs' ? Math.ceil(bumperHardwareWeightKg * KG_TO_LBS) : Math.ceil(bumperHardwareWeightKg);
            pdf.text(`${bumperDisplay} ${wtUnit}`, col2X + colValueX, col2Y, { align: 'right' });
            col2Y += 3.5;
          }
          if(platesWeightKg > 0) {
            pdf.text('Connecting Plates', col2X + colLabelX, col2Y);
            const platesDisplay = displayWeightUnit === 'lbs' ? Math.ceil(platesWeightKg * KG_TO_LBS) : Math.ceil(platesWeightKg);
            pdf.text(`${platesDisplay} ${wtUnit}`, col2X + colValueX, col2Y, { align: 'right' });
            col2Y += 3.5;
          }
          if(groundSupportWeightKg > 0) {
            pdf.text('Ground Support', col2X + colLabelX, col2Y);
            const gsDisplay = displayWeightUnit === 'lbs' ? Math.ceil(groundSupportWeightKg * KG_TO_LBS) : Math.ceil(groundSupportWeightKg);
            pdf.text(`${gsDisplay} ${wtUnit}`, col2X + colValueX, col2Y, { align: 'right' });
            col2Y += 3.5;
          }
          if(floorFramesWeightKg > 0) {
            pdf.text('Floor Frames', col2X + colLabelX, col2Y);
            const floorDisplay = displayWeightUnit === 'lbs' ? Math.ceil(floorFramesWeightKg * KG_TO_LBS) : Math.ceil(floorFramesWeightKg);
            pdf.text(`${floorDisplay} ${wtUnit}`, col2X + colValueX, col2Y, { align: 'right' });
            col2Y += 3.5;
          }

          pdf.setDrawColor(100, 100, 100);
          pdf.line(col2X + colLabelX, col2Y, col2X + colValueX, col2Y);
          col2Y += 3;
          pdf.setFont(undefined, 'bold');
          pdf.text('Total', col2X + colLabelX, col2Y);
          const totalDisplay = displayWeightUnit === 'lbs' ? Math.ceil(totalStructureWeightKg * KG_TO_LBS) : Math.ceil(totalStructureWeightKg);
          pdf.text(`${totalDisplay} ${wtUnit}`, col2X + colValueX, col2Y, { align: 'right' });
          pdf.setFont(undefined, 'normal');
          col2Y += 4;
        }
        
        yOffset = Math.max(col1Y, col2Y) + 4;
        
      } catch(err) {
        console.error('Error adding structure view page:', err);
      }
      
      if(callback) setTimeout(callback, 10);
    }
    
    function finalizePDF() {
      updateProgress('Saving PDF...', 95);

      // Restore original screen
      switchToScreen(originalScreenId);

      // Restore the original app mode view (this ensures containers are properly hidden/shown)
      // This is critical when exporting from Combined view to restore proper container visibility
      if(typeof switchMobileView === 'function' && typeof currentAppMode !== 'undefined') {
        switchMobileView(currentAppMode);
      }

      setTimeout(() => {
        updateProgress('Saving PDF...', 100);

        // Save the PDF
        const date = new Date().toISOString().slice(0,10);
        const configName = document.getElementById('configName').value.trim().replace(/[<>:"/\\|?*]/g, '_');
        const filename = configName
          ? `${configName}_${date}.pdf`
          : `LED_Wall_Calculator_${date}.pdf`;

        // Use blob approach for better iOS compatibility
        const pdfBlob = pdf.output('blob');

        // Download function
        function downloadPDF() {
          const blobUrl = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }, 100);

          setTimeout(removeOverlay, 100);
        }

        // Check if we're on a mobile device (touch-enabled and small screen or mobile user agent)
        const isMobileDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) &&
                               (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

        // Try native share API only on mobile (iOS/Android - allows "Save to Files")
        // Desktop browsers may support Share API but direct download is better UX
        if(isMobileDevice && navigator.share && navigator.canShare) {
          const file = new File([pdfBlob], filename, { type: 'application/pdf' });
          if(navigator.canShare({ files: [file] })) {
            // Only pass files - do NOT include title/text as they create separate text files
            navigator.share({
              files: [file]
            }).then(() => {
              removeOverlay();
            }).catch((err) => {
              // User cancelled or share failed - fall back to download
              console.log('Share cancelled or failed:', err);
              downloadPDF();
            });
            return;
          }
        }

        // Desktop or Share API not available - use direct download
        downloadPDF();
      }, 150);
    }
    
    // Start processing
    processNextScreen();
    
  } catch(err) {
    console.error('PDF export error:', err);
    showAlert('Error exporting PDF: ' + err.message);
    // Make sure to remove overlay and reset print modes on error
    const overlay = document.getElementById('pdfExportOverlay');
    if(overlay) overlay.remove();
    if (ecoPrintMode || greyscalePrintMode) {
      ecoPrintMode = false;
      greyscalePrintMode = false;
      generateLayout('standard');
      generateLayout('power');
      generateLayout('data');
      generateStructureLayout();
    }
  }
}
