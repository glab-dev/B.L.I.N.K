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


// Send Gear List Email
function sendGearListToJared() {
  generateGearList();

  const screenIds = Object.keys(screens);
  if(screenIds.length === 0) {
    showAlert('No screens to send. Please add at least one screen.');
    return;
  }

  const configName = document.getElementById('configName').value.trim() || 'LED Wall Config';
  const nl = '\n';
  const line = (label, value) => { if(value === 0 || value === '' || value === null || value === undefined || value === '0') return ''; return ` - ${label} ${value}${nl}`; };
  const hdr = (title) => `${nl}${title.toUpperCase()}${nl}${'-'.repeat(title.length)}${nl}`;

  let text = `LED GEAR LIST${nl}`;
  text += `Project: ${configName}${nl}`;
  text += `======================================${nl}`;

  // Build processor groups (same as generateGearList)
  const processorGroups = {};
  screenIds.forEach(sid => {
    const s = screens[sid];
    const pt = s.data.processor || 'Brompton_SX40';
    if(!processorGroups[pt]) processorGroups[pt] = { screens: [], firstScreenId: sid, firstScreenName: s.name, processorCount: 0, distBoxCount: 0, distBoxName: '' };
    processorGroups[pt].screens.push(sid);
  });
  for(const pt in processorGroups) {
    const grp = processorGroups[pt];
    let totalPanels = 0;
    grp.screens.forEach(sid => { totalPanels += (screens[sid].calculatedData || {}).activePanels || 0; });
    const pr = processors[pt] || processors['Brompton_SX40'];
    if(pr) {
      const portsPerProc = pr.ports || 1;
      const maxPixPerPort = pr.base_pixels_1g || 525000;
      const firstData = screens[grp.screens[0]].data;
      const firstPanel = {...panels, ...customPanels}[firstData.panelType || 'CB5_MKII'];
      if(firstPanel) {
        const ppp = Math.max(1, Math.floor(maxPixPerPort / (firstPanel.res_x * firstPanel.res_y)));
        const portsNeeded = Math.ceil(totalPanels / ppp);
        grp.processorCount = Math.ceil(portsNeeded / portsPerProc);
        grp.distBoxCount = pr.uses_distbox ? Math.ceil(portsNeeded / (pr.distbox_ports || 4)) : 0;
        grp.distBoxName = pr.distbox_name || 'Dist Box';
      }
    }
  }

  let isFirstScreen = true;
  screenIds.forEach(screenId => {
    const screen = screens[screenId];
    const data = screen.data;
    const calcData = screen.calculatedData || {};
    const W = data.panelsWide;
    const H = data.panelsHigh;
    if(W === 0 || H === 0) return;

    const panelType = data.panelType || 'CB5_MKII';
    const allPanelsObj = {...panels, ...customPanels};
    const p = allPanelsObj[panelType];
    if(!p) return;

    const processorType = data.processor || 'Brompton_SX40';
    const processorGroup = processorGroups[processorType] || null;
    const isFirstScreenInGroup = processorGroup && processorGroup.firstScreenId === screenId;

    const hasCB5HalfRow = data.addCB5HalfRow && panelType === 'CB5_MKII';
    const activePanels = calcData.activePanels || calcData.panelCount || 0;
    const activeHalfPanels = hasCB5HalfRow ? W : 0;
    const activeFullPanels = activePanels - activeHalfPanels;

    const bumper1wCount = calcData.bumper1wCount || 0;
    const bumper2wCount = calcData.bumper2wCount || 0;
    const bumper4wCount = calcData.bumper4wCount || 0;
    const plates2way = calcData.plates2way || 0;
    const plates4way = calcData.plates4way || 0;
    const useBumpers = data.useBumpers !== false;
    const socaCount = calcData.socaCount || 0;
    const circuitsNeeded = calcData.circuitsNeeded || 0;
    const columnsPerCircuit = calcData.columnsPerCircuit || 1;
    const dataJumperLen = p.data_jumper_ft || '';
    const dataCrossJumperLen = p.data_cross_jumper_ft || '';
    const powerJumperLen = p.power_jumper_ft || '';
    const jumpersBuiltin = p.jumpers_builtin || false;
    const dataLinesCount = calcData.dataLines || 0;

    // Screen header
    text += `${nl}${nl}`;
    text += `${screen.name.toUpperCase()}${nl}`;
    text += `======================================${nl}`;

    // Equipment
    text += hdr('Equipment');
    if(isFirstScreenInGroup && processorGroup && processorGroup.processorCount > 0) {
      text += line('Processor:', `${processorGroup.processorCount}x ${calcData.processorName || ''}`);
      if(processorGroup.distBoxCount > 0) text += line(`${processorGroup.distBoxName}:`, processorGroup.distBoxCount);
    } else if(processorGroup && processorGroup.firstScreenId !== screenId) {
      text += ` - Processor: See ${processorGroup.firstScreenName}${nl}`;
    }
    text += ` - Panels: ${activeFullPanels} x ${p.brand} ${p.name}${nl}`;
    if(activeHalfPanels > 0) text += ` - Half Panels: ${activeHalfPanels} x ${p.brand} CB5 MKII Half Panel${nl}`;

    // Rigging Hardware
    const hasRigging = bumper1wCount > 0 || bumper2wCount > 0 || bumper4wCount > 0 || plates4way > 0 || plates2way > 0;
    if(hasRigging) {
      text += hdr('Rigging Hardware');
      text += line('1W Bumpers:', bumper1wCount);
      text += line('2W Bumpers:', bumper2wCount);
      text += line('4W Bumpers:', bumper4wCount);
      text += line('4W Connecting Plates:', plates4way);
      text += line('2W Connecting Plates:', plates2way);
      const needsSC = ['CB5_MKII', 'CB5_MKII_HALF', 'MC7H', 'INFILED_AMT8_3'].includes(panelType);
      const isHanging = (data.structureType || 'hanging') === 'hanging';
      if(needsSC && isHanging && useBumpers) {
        let shackleCount = 0;
        if(panelType === 'INFILED_AMT8_3') shackleCount = bumper1wCount + (bumper2wCount * 2);
        else shackleCount = bumper1wCount + bumper2wCount;
        text += line('5/8" Shackles:', shackleCount);
        text += line('Cheeseye:', shackleCount);
      }
    }

    // Ground Support
    const gs = calcData.groundSupport || {};
    const hasGS = gs.totalRearTruss > 0 || gs.totalBaseTruss > 0 || gs.totalBridgeClamps > 0 || gs.totalSandbags > 0 || gs.totalPipes > 0 || gs.totalSwivelCheeseboroughs > 0 || gs.totalRearBridgeClampAdapters > 0;
    if(hasGS) {
      text += hdr('Ground Support');
      text += line('Rear Truss:', gs.totalRearTruss);
      text += line('Base Truss:', gs.totalBaseTruss);
      text += line('Bridge Clamps:', gs.totalBridgeClamps);
      text += line('Rear Bridge Adapter:', gs.totalRearBridgeClampAdapters);
      text += line('Sandbags:', gs.totalSandbags);
      text += line('Swivel Cheeseborough:', gs.totalSwivelCheeseboroughs);
      if(gs.totalPipes > 0) {
        let pipeStr = '';
        if(gs.pipeInfo && gs.pipeInfo.length > 0) {
          const uLen = [...new Set(gs.pipeInfo.map(pi => pi.pipeLengthFt))];
          pipeStr = ' (' + uLen.map(l => l + 'ft').join(', ') + ')';
        }
        text += line('Pipe' + pipeStr + ':', gs.totalPipes);
      }
    }

    // Floor Hardware
    if(calcData.floorFrames) {
      const ff = calcData.floorFrames;
      if(ff.frame_1x1 > 0 || ff.frame_2x1 > 0 || ff.frame_2x2 > 0 || ff.frame_3x2 > 0) {
        text += hdr('Floor Hardware');
        if(ff.frame_3x2 > 0) text += line('3x2 Frame:', ff.frame_3x2);
        if(ff.frame_2x2 > 0) text += line('2x2 Frame:', ff.frame_2x2);
        if(ff.frame_2x1 > 0) text += line('2x1 Frame:', ff.frame_2x1);
        if(ff.frame_1x1 > 0) text += line('1x1 Frame:', ff.frame_1x1);
      }
    }

    // Data Cables
    text += hdr('Data Cables');
    if(!jumpersBuiltin && dataJumperLen) text += line(`Jumpers ${dataJumperLen}':`, activePanels);
    if(dataCrossJumperLen) text += line(`Cross Jumpers ${dataCrossJumperLen}':`, '');
    if(jumpersBuiltin) text += line('Cat5 Couplers:', dataLinesCount);
    const cabling = calculateCabling(screenId);
    if(cabling) {
      const allDataCables = cabling.dataCables || [];
      const knockoutCables = cabling.knockoutBridgeCables || [];
      if(allDataCables.length > 0 || knockoutCables.length > 0) {
        const allDataByLength = {};
        allDataCables.forEach(c => { allDataByLength[c.roundedFt] = (allDataByLength[c.roundedFt] || 0) + 1; });
        knockoutCables.forEach(c => { allDataByLength[c.roundedFt] = (allDataByLength[c.roundedFt] || 0) + 1; });
        for(const [len, count] of Object.entries(allDataByLength).sort((a,b) => a[0] - b[0])) {
          text += ` - ${count}x ${len}' Cat6${nl}`;
        }
      }
    }

    // Power Cables
    text += hdr('Power Cables');
    if(!jumpersBuiltin && powerJumperLen) text += line(`Jumpers ${powerJumperLen}':`, activePanels);
    text += line('Soca Splays:', socaCount);
    if(cabling && cabling.socaCables.length > 0) {
      const socaByLength = {};
      cabling.socaCables.forEach(s => { socaByLength[s.roundedFt] = (socaByLength[s.roundedFt] || 0) + 1; });
      for(const [len, count] of Object.entries(socaByLength).sort((a,b) => a[0] - b[0])) {
        text += ` - ${count}x ${len}' Soca${nl}`;
      }
    }
    text += line("25' True1:", socaCount);
    text += line("10' True1:", socaCount);
    text += line("5' True1:", socaCount * 2);
    if(columnsPerCircuit > 1) text += line('True1 Twofer:', circuitsNeeded * columnsPerCircuit);

    // Processor -> Dist Box
    if(cabling && cabling.distBoxCables.length > 0) {
      text += hdr('Processor to Dist Box');
      const mainBoxCables = cabling.distBoxCables.filter(c => c.label === 'main');
      const boxCableType = mainBoxCables[0]?.type || 'cat6a';
      const boxCableRounded = mainBoxCables[0]?.roundedFt || 0;
      text += ` - ${cabling.distBoxCables.length}x ${boxCableType === 'fiber' ? 'Fiber' : 'Cat6A'} ${boxCableRounded}'${nl}`;
    }

    // Signal Cables (first screen only)
    if(isFirstScreen) {
      text += hdr('Signal Cables');
      const procCount = processorGroup ? processorGroup.processorCount : 0;
      const sdiPerProcessor = procCount * 2;
      const canvasSize = data.canvasSize || '4K_UHD';
      const isHDCanvas = canvasSize === 'HD' || (canvasSize === 'custom' &&
        (parseInt(data.customCanvasWidth) || 1920) <= 1920 &&
        (parseInt(data.customCanvasHeight) || 1080) <= 1080);
      const sdiType = isHDCanvas ? '3G SDI' : '12G SDI';
      const sdiCounts = {};
      if(isHDCanvas) {
        sdiCounts[100] = sdiPerProcessor; sdiCounts[50] = sdiPerProcessor;
        sdiCounts[25] = sdiPerProcessor; sdiCounts[10] = 6; sdiCounts[3] = 6;
      } else {
        sdiCounts[100] = sdiPerProcessor; sdiCounts[50] = sdiPerProcessor; sdiCounts[25] = sdiPerProcessor;
      }
      if(cabling && cabling.serverCable) {
        const serverLen = cabling.serverCable.lengthFt || 0;
        if(serverLen > 0 && serverLen <= 300) {
          const sdiLen = roundUpToStandard(serverLen);
          sdiCounts[sdiLen] = (sdiCounts[sdiLen] || 0) + 2;
        }
      }
      for(const len of Object.keys(sdiCounts).map(Number).sort((a,b) => b - a)) {
        if(sdiCounts[len] > 0) text += line(`${len}' ${sdiType}:`, sdiCounts[len]);
      }
      text += line("25' HDMI:", 6);
      text += line("10' HDMI:", 6);
      text += line("6' HDMI:", 6);
    }

    // Utility (first screen only)
    if(isFirstScreen) {
      text += hdr('Utility');
      text += line("UG 10':", 8);
      text += line("UG 25':", 6);
      text += line("UG 50':", 6);
      text += line('UG Twofers:', 8);
      text += line('Power Bars:', 8);
    }

    // Spares
    text += hdr('Spares');
    text += ` - Spare Soca Splays:${nl}`;
    text += ` - Spare Panel Count:${nl}`;
    if(!jumpersBuiltin && dataJumperLen) text += ` - Spare Data Jumpers ${dataJumperLen}':${nl}`;
    if(jumpersBuiltin) text += ` - Spare Cat5 Couplers:${nl}`;
    if(!jumpersBuiltin && powerJumperLen) text += ` - Spare Power Jumpers ${powerJumperLen}':${nl}`;

    isFirstScreen = false;
  });

  const email = 'JYoung@apexsound.com';
  const subject = encodeURIComponent(`LED Gear List - ${configName}`);
  const encodedBody = encodeURIComponent(text);

  let mailtoUrl = `mailto:${email}?subject=${subject}&body=${encodedBody}`;
  if(mailtoUrl.length > 16000) {
    const truncNote = '\n\n(Gear list truncated due to email length limits - see full list in app)';
    const maxBodyLen = 14000 - subject.length - email.length;
    const truncBody = encodeURIComponent(text.substring(0, maxBodyLen) + truncNote);
    mailtoUrl = `mailto:${email}?subject=${subject}&body=${truncBody}`;
  }

  window.location.href = mailtoUrl;
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
      <div style="width: 200px; height: 4px; background: #333; border-radius: 2px; margin-top: 20px; overflow: hidden;">
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
    pdf.text('LED Wall Calculator Report', margin, yOffset);
    
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
    
    // ========== CALCULATE PROCESSOR GROUPS ACROSS ALL SCREENS ==========
    // Group screens by processor type and calculate combined totals
    const processorGroups = {}; // { processorType: { screens: [], totalMainPorts: 0, hasAnyRedundancy: false, firstScreenId: null } }
    
    screenIds.forEach(screenId => {
      const screen = screens[screenId];
      if(!screen || !screen.data) return;
      
      const processorType = screen.data.processor || 'Brompton_SX40';
      const calcData = screen.calculatedData || {};
      const dataLines = calcData.dataLines || 0;
      const hasRedundancy = screen.data.redundancy || false;
      const hasProcessorRedundancy = screen.data.processorRedundancy || false;
      const isIndirectMode = screen.data.mx40ConnectionMode === 'indirect';

      if(!processorGroups[processorType]) {
        processorGroups[processorType] = {
          screens: [],
          totalMainPorts: 0,
          totalPixels: 0,
          hasAnyRedundancy: false,
          hasAnyProcessorRedundancy: false,
          hasAnyIndirectMode: false,
          firstScreenId: screenId,
          firstScreenName: screen.name
        };
      }

      const screenPixels = calcData.totalPixels || 0;

      processorGroups[processorType].screens.push({
        screenId: screenId,
        screenName: screen.name,
        mainPorts: dataLines,
        hasRedundancy: hasRedundancy,
        totalPixels: screenPixels
      });
      processorGroups[processorType].totalMainPorts += dataLines;
      processorGroups[processorType].totalPixels += screenPixels;
      if(hasRedundancy) {
        processorGroups[processorType].hasAnyRedundancy = true;
      }
      if(hasProcessorRedundancy) {
        processorGroups[processorType].hasAnyProcessorRedundancy = true;
      }
      if(isIndirectMode) {
        processorGroups[processorType].hasAnyIndirectMode = true;
      }
    });
    
    // Calculate processor and distribution box counts for each group
    // IMPORTANT: For redundancy, we double the distribution box count (not the port count)
    // because each XD/distro box is dedicated to either main OR backup - can't mix
    // For processor redundancy, we double the processor count at the end
    Object.keys(processorGroups).forEach(processorType => {
      const group = processorGroups[processorType];
      const totalMainPorts = group.totalMainPorts;
      const hasRedundancy = group.hasAnyRedundancy;
      const hasProcessorRedundancy = group.hasAnyProcessorRedundancy;
      
      let processorCount = 0;
      let distBoxCount = 0;
      let distBoxName = '';
      
      if(processorType === 'Brompton_SX40') {
        // SX40: Each XD has 10 ports, each SX40 supports 4 XDs
        // Calculate XDs needed for main lines first
        const mainXDs = totalMainPorts > 0 ? Math.ceil(totalMainPorts / 10) : 0;
        // If redundancy, double the XD count (separate XDs for backup)
        distBoxCount = hasRedundancy ? mainXDs * 2 : mainXDs;
        processorCount = distBoxCount > 0 ? Math.ceil(distBoxCount / 4) : 0;
        distBoxName = 'XD';
      } else if(processorType === 'Brompton_S8') {
        // S8: 8 ports per processor
        const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
        processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 8) : 0;
        distBoxCount = 0;
      } else if(processorType === 'Brompton_M2') {
        // M2: 4 ports per processor
        const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
        processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 4) : 0;
        distBoxCount = 0;
      } else if(processorType === 'Brompton_S4') {
        // S4: 4 ports per processor
        const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
        processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 4) : 0;
        distBoxCount = 0;
      } else if(processorType === 'NovaStar_MX40_Pro') {
        // MX40 Pro logic:
        // Direct mode: 20 ports per processor
        // Indirect mode: 10 ports per CVT box, 4 CVTs per processor max
        const groupTotalPixels = group.totalPixels || 0;
        const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
        const processorsByPixels = groupTotalPixels > 0 ? Math.ceil(groupTotalPixels / 9000000) : 0;

        if(group.hasAnyIndirectMode) {
          // Indirect mode: CVT boxes needed
          distBoxCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 10) : 0;
          distBoxName = 'CVT-10 Pro';
          // Processor count: max of pixels needed OR CVT boxes needed (4 CVTs per processor)
          const processorsByCVTs = Math.ceil(distBoxCount / 4);
          processorCount = Math.max(processorsByPixels, processorsByCVTs);
        } else {
          // Direct mode: no CVT boxes, processor count based on ports AND pixels
          const processorsByPorts = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 20) : 0;
          processorCount = Math.max(processorsByPixels, processorsByPorts);
        }
      } else {
        // Default/custom processor - use per-screen calculation
        const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
        processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 8) : group.screens.length;
        distBoxCount = 0;
      }
      
      // If processor redundancy is enabled, double the processor count
      if(hasProcessorRedundancy && processorCount > 0) {
        processorCount *= 2;
      }
      
      group.processorCount = processorCount;
      group.distBoxCount = distBoxCount;
      group.distBoxName = distBoxName;
      // Store for display purposes
      group.totalPorts = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
    });
    
    console.log('Processor groups calculated:', processorGroups);
    
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
        // All screens processed, finalize PDF (canvas view removed to reduce file size)
        finalizePDF();
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
          const maxPanelsPerData = p.max_panels_per_data || calcData.panelsPerDataLine || 0;

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

        // ========== RIGHT COLUMN: GEAR LIST ==========
        if(pdfExportOptions.gearList) {
          addGearListToColumn(screenId, screen.name, col2X, col2Y, colWidth, lineHeight, processorGroups);
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
    function addGearListToColumn(screenId, screenName, colX, startY, colWidth, lineHeight, processorGroups) {
      let colY = startY;

      const screen = screens[screenId];
      if(!screen || !screen.data) return;

      const allPanels = getAllPanels();
      const data = screen.data;
      const calcData = screen.calculatedData || {};
      const panelType = data.panelType || 'CB5_MKII';
      const p = allPanels[panelType];
      const pw = parseInt(data.panelsWide) || 0;
      const ph = parseInt(data.panelsHigh) || 0;
      const isFirstScreen = (screenIndex === 0);

      // Check if canvas is 4K (need 12G SDI cables)
      const canvasSize = data.canvasSize || '4K_UHD';
      const is4KCanvas = (canvasSize === '4K_UHD' || canvasSize === '4K_DCI');

      // Equipment data
      const processorType = data.processor || 'Brompton_SX40';
      const processorGroup = processorGroups[processorType] || null;
      const isFirstScreenInGroup = processorGroup && processorGroup.firstScreenId === screenId;
      const processorName = calcData.processorName || '';
      const activePanels = calcData.activePanels || calcData.panelCount || 0;

      // Rigging
      const bumper1wCount = calcData.bumper1wCount || 0;
      const bumper2wCount = calcData.bumper2wCount || 0;
      const bumper4wCount = calcData.bumper4wCount || 0;
      const plates2way = calcData.plates2way || 0;
      const plates4way = calcData.plates4way || 0;
      const useBumpers = data.useBumpers !== false;

      // Ground Support
      const groundSupport = calcData.groundSupport || {
        totalRearTruss: 0,
        totalBaseTruss: 0,
        totalBridgeClamps: 0,
        totalRearBridgeClampAdapters: 0,
        totalSandbags: 0,
        totalSwivelCheeseboroughs: 0,
        totalPipes: 0,
        pipeInfo: []
      };

      // Power
      const socaCount = calcData.socaCount || 0;
      const circuitsNeeded = calcData.circuitsNeeded || 0;
      const columnsPerCircuit = calcData.columnsPerCircuit || 1;

      // Data cross jumpers calculation
      let dataCrossJumperCount = 0;
      if(pw > 0 && ph > 0) {
        const pr = processors[data.processor] || processors['Brompton_SX40'];
        const portCapacity = pr ? pr.base_pixels_1g : 525000;
        const frameRate = parseInt(data.frameRate) || 60;
        const bitDepth = parseInt(data.bitDepth) || 8;

        let adjustedCapacity = portCapacity;
        if(frameRate > 60) adjustedCapacity = Math.floor(portCapacity * (60 / frameRate));
        if(bitDepth > 8) adjustedCapacity = Math.floor(adjustedCapacity * (8 / bitDepth));

        const pixelsPerPanel = p ? (p.res_x * p.res_y) : 1;
        let capacityBasedPanelsPerData = Math.max(1, Math.floor(adjustedCapacity / pixelsPerPanel));
        // Cap at 500 panels per port (Brompton Tessera hardware limit)
        capacityBasedPanelsPerData = Math.min(capacityBasedPanelsPerData, 500);
        const panelSpecificDataLimit = p ? p.max_panels_per_data : null;
        const suggestedPanelsPerData = panelSpecificDataLimit
          ? Math.min(capacityBasedPanelsPerData, panelSpecificDataLimit)
          : capacityBasedPanelsPerData;
        const userMaxPanelsPerData = parseInt(data.maxPanelsPerData) || 0;
        const panelsPerDataLine = userMaxPanelsPerData > 0 ? userMaxPanelsPerData : suggestedPanelsPerData;

        const startDir = data.dataStartDir || 'top';
        const customDataLines = data.customDataLineAssignments;
        const hasCustomDataLines = customDataLines && customDataLines.size > 0;
        const deletedPanels = data.deletedPanels;

        if(startDir !== 'all_top' && startDir !== 'all_bottom') {
          const dataLineColumns = new Map();
          const usedCustomDataLines = new Set();
          if(hasCustomDataLines) {
            for(let c = 0; c < pw; c++) {
              for(let r = 0; r < ph; r++) {
                const panelKey = `${c},${r}`;
                const isDeleted = deletedPanels && deletedPanels.has && deletedPanels.has(panelKey);
                if(!isDeleted && customDataLines.has(panelKey)) {
                  usedCustomDataLines.add(customDataLines.get(panelKey) - 1);
                }
              }
            }
          }

          let autoDataLineCounter = 0;
          let panelsInCurrentAutoDataLine = 0;
          while(usedCustomDataLines.has(autoDataLineCounter)) autoDataLineCounter++;

          let serpentineGoingDown = (startDir === 'top');
          for(let c = 0; c < pw; c++) {
            const rows = serpentineGoingDown
              ? Array.from({length: ph}, (_, i) => i)
              : Array.from({length: ph}, (_, i) => ph - 1 - i);

            for(const r of rows) {
              const panelKey = `${c},${r}`;
              if(deletedPanels && deletedPanels.has && deletedPanels.has(panelKey)) continue;

              let dataLine;
              if(hasCustomDataLines && customDataLines.has(panelKey)) {
                dataLine = customDataLines.get(panelKey) - 1;
              } else {
                while(usedCustomDataLines.has(autoDataLineCounter)) autoDataLineCounter++;
                dataLine = autoDataLineCounter;
                panelsInCurrentAutoDataLine++;
                if(panelsInCurrentAutoDataLine >= panelsPerDataLine) {
                  autoDataLineCounter++;
                  panelsInCurrentAutoDataLine = 0;
                  while(usedCustomDataLines.has(autoDataLineCounter)) autoDataLineCounter++;
                }
              }

              if(!dataLineColumns.has(dataLine)) dataLineColumns.set(dataLine, new Set());
              dataLineColumns.get(dataLine).add(c);
            }
            serpentineGoingDown = !serpentineGoingDown;
          }

          dataLineColumns.forEach((columns, dataLine) => {
            if(columns.size > 1) dataCrossJumperCount += (columns.size - 1);
          });
        }
      }

      // Pipe length string
      let pipeLengthStr = '';
      if(groundSupport.totalPipes > 0 && groundSupport.pipeInfo && groundSupport.pipeInfo.length > 0) {
        const uniqueLengths = [...new Set(groundSupport.pipeInfo.map(pi => pi.pipeLengthFt))];
        pipeLengthStr = ' (' + uniqueLengths.map(l => l + 'ft').join(', ') + ')';
      }

      // Computed cable lengths from calculateCabling
      const computedCabling = (typeof calculateCabling === 'function') ? calculateCabling(screenId) : null;
      const computedSocaByLength = {};
      const computedDataByLength = {};
      if(computedCabling) {
        // Group SOCA cables by rounded length
        (computedCabling.socaCables || []).forEach(s => {
          computedSocaByLength[s.roundedFt] = (computedSocaByLength[s.roundedFt] || 0) + 1;
        });
        // Group data cables (primary + knockout) by rounded length
        const primaryData = (computedCabling.dataCables || []).filter(c => !c.backup);
        const knockoutData = computedCabling.knockoutBridgeCables || [];
        primaryData.forEach(c => { computedDataByLength[c.roundedFt] = (computedDataByLength[c.roundedFt] || 0) + 1; });
        knockoutData.forEach(c => { computedDataByLength[c.roundedFt] = (computedDataByLength[c.roundedFt] || 0) + 1; });
      }

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

      // Gear List Title
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text('Gear List', colX, colY);
      colY += 5;

      // Equipment
      addGearHeader('Equipment');
      if(isFirstScreenInGroup && processorGroup && processorGroup.processorCount > 0) {
        addGearLine('Processor:', `${processorGroup.processorCount}x ${processorName}`);
        if(processorGroup.distBoxCount > 0) {
          addGearLine(`${processorGroup.distBoxName}:`, processorGroup.distBoxCount.toString());
        }
      } else if(processorGroup && processorGroup.firstScreenName) {
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Processor: See ${processorGroup.firstScreenName}`, colX, colY);
        colY += lineHeight;
      }
      addGearLine('Panel Count:', activePanels.toString());

      // Rigging
      addGearHeader('Rigging Hardware');
      addGearLine('1W Bumpers:', bumper1wCount.toString());
      addGearLine('2W Bumpers:', bumper2wCount.toString());
      addGearLine('4W Bumpers:', bumper4wCount.toString());
      addGearLine('4W Connecting Plates:', plates4way.toString());
      addGearLine('2W Connecting Plates:', plates2way.toString());

      // 5/8" Shackles and Cheeseye
      const needsShacklesAndCheeseye = ['CB5_MKII', 'CB5_MKII_HALF', 'MC7H', 'INFILED_AMT8_3'].includes(panelType);
      const isHanging = data.structureType === 'hanging';
      if(needsShacklesAndCheeseye && isHanging && useBumpers) {
        let shackleCount = 0;
        let cheeseyeCount = 0;
        if(panelType === 'INFILED_AMT8_3') {
          shackleCount = bumper1wCount + (bumper2wCount * 2);
          cheeseyeCount = bumper1wCount + (bumper2wCount * 2);
        } else {
          shackleCount = bumper1wCount + bumper2wCount;
          cheeseyeCount = bumper1wCount + bumper2wCount;
        }
        if(shackleCount > 0) addGearLine('5/8" Shackles:', shackleCount.toString());
        if(cheeseyeCount > 0) addGearLine('Cheeseye:', cheeseyeCount.toString());
      }

      // Ground Support
      addGearHeader('Ground Support');
      addGearLine('Rear Truss:', groundSupport.totalRearTruss.toString());
      addGearLine('Base Truss:', groundSupport.totalBaseTruss.toString());
      addGearLine('Bridge Clamps:', groundSupport.totalBridgeClamps.toString());
      addGearLine('Rear Bridge Adapter:', groundSupport.totalRearBridgeClampAdapters.toString());
      addGearLine('Sandbags:', groundSupport.totalSandbags.toString());
      addGearLine('Swivel Cheeseborough:', groundSupport.totalSwivelCheeseboroughs.toString());
      addGearLine('Pipe' + pipeLengthStr + ':', groundSupport.totalPipes.toString());

      // Floor Hardware - calculate fresh since it might not be in calculatedData yet
      const structureType = data.structureType || 'hanging';
      if(structureType === 'floor' && p && p.is_floor_panel && p.floor_frames && pw > 0 && ph > 0) {
        const deletedPanelsSet = data.deletedPanels || new Set();
        const frames = calculateFloorFrames(pw, ph, deletedPanelsSet);
        const frameCounts = getFloorFrameCounts(frames);
        const hasFloorFrames = frameCounts.frame_1x1 > 0 || frameCounts.frame_2x1 > 0 ||
                               frameCounts.frame_2x2 > 0 || frameCounts.frame_3x2 > 0;
        if(hasFloorFrames) {
          addGearHeader('Floor Hardware');
          if(frameCounts.frame_3x2 > 0) addGearLine('3×2 Frame:', frameCounts.frame_3x2.toString());
          if(frameCounts.frame_2x2 > 0) addGearLine('2×2 Frame:', frameCounts.frame_2x2.toString());
          if(frameCounts.frame_2x1 > 0) addGearLine('2×1 Frame:', frameCounts.frame_2x1.toString());
          if(frameCounts.frame_1x1 > 0) addGearLine('1×1 Frame:', frameCounts.frame_1x1.toString());
        }
      }

      // Data Cables
      addGearHeader('Data Cables');
      const dataJumperLen = p && p.data_jumper_ft ? p.data_jumper_ft : '';
      const dataCrossJumperLen = p && p.data_cross_jumper_ft ? p.data_cross_jumper_ft : '';
      const jumpersBuiltin = p && p.jumpers_builtin;

      if(!jumpersBuiltin && dataJumperLen) {
        addGearLine(`Data Jumpers ${dataJumperLen}:`, activePanels.toString());
      }
      if(dataCrossJumperLen && dataCrossJumperCount > 0) {
        addGearLine(`Data Cross Jumpers ${dataCrossJumperLen}:`, dataCrossJumperCount.toString());
      }
      if(jumpersBuiltin) {
        const dataLinesCount = calcData.dataLines || 0;
        const totalCat5Couplers = dataCrossJumperCount + dataLinesCount;
        if(totalCat5Couplers > 0) addGearLine('Cat5 Couplers:', totalCat5Couplers.toString());
      }
      addGearLine("200' Cat6:", (computedDataByLength[200] || '').toString());
      addGearLine("100' Cat6:", (computedDataByLength[100] || '').toString());
      addGearLine("75' Cat6:", (computedDataByLength[75] || '').toString());
      addGearLine("50' Cat6:", (computedDataByLength[50] || '').toString());
      addGearLine("25' Cat6:", (computedDataByLength[25] || '').toString());
      addGearLine("10' Cat6:", (computedDataByLength[10] || '').toString());
      addGearLine("5' Cat6:", (computedDataByLength[5] || '').toString());

      // Power Cables
      addGearHeader('Power Cables');
      const powerJumperLen = p && p.power_jumper_ft ? p.power_jumper_ft : '';
      if(!jumpersBuiltin && powerJumperLen) {
        addGearLine(`Power Jumpers ${powerJumperLen}:`, activePanels.toString());
      }
      addGearLine('Soca Splays:', socaCount.toString());
      addGearLine("100' Soca:", (computedSocaByLength[100] || '').toString());
      addGearLine("75' Soca:", (computedSocaByLength[75] || '').toString());
      addGearLine("50' Soca:", (computedSocaByLength[50] || '').toString());
      addGearLine("25' Soca:", (computedSocaByLength[25] || '').toString());
      addGearLine("50' True1:", '');
      addGearLine("25' True1:", socaCount.toString());
      addGearLine("10' True1:", socaCount.toString());
      addGearLine("5' True1:", (socaCount * 2).toString());
      addGearLine("3' True1:", '');
      addGearLine('True1 Twofer:', columnsPerCircuit > 1 ? (circuitsNeeded * columnsPerCircuit).toString() : '');

      // Processor to Dist Box cables (computed)
      if(computedCabling && computedCabling.distBoxCables && computedCabling.distBoxCables.length > 0) {
        addGearHeader('Processor → Dist Box');
        const boxType = computedCabling.distBoxCables[0]?.type === 'fiber' ? 'Fiber' : 'Cat6A';
        const boxLen = computedCabling.distBoxCables[0]?.roundedFt || 0;
        addGearLine(`${boxType} ${boxLen}':`, computedCabling.distBoxCables.length.toString());
      }

      // Server to Processor cable (computed)
      if(computedCabling && computedCabling.serverCable) {
        addGearHeader('Server → Processor');
        addGearLine('Cable:', `${computedCabling.serverCable.lengthFt}'`);
      }

      // Signal Cables (only on first screen)
      if(isFirstScreen) {
        addGearHeader('Signal Cables');
        addGearLine("500' Fiber Opticon:", '');
        addGearLine('Fiber 4ch Opticon Splay:', '');
        const processorCount = processorGroup ? processorGroup.processorCount : 0;
        const sdiPerProcessor = processorCount * 2;
        if(is4KCanvas) {
          addGearLine("100' 12G SDI:", sdiPerProcessor.toString());
          addGearLine("75' 12G SDI:", '');
          addGearLine("50' 12G SDI:", sdiPerProcessor.toString());
          addGearLine("25' 12G SDI:", sdiPerProcessor.toString());
        } else {
          addGearLine("100' SDI:", sdiPerProcessor.toString());
          addGearLine("75' SDI:", '');
          addGearLine("50' SDI:", sdiPerProcessor.toString());
          addGearLine("25' SDI:", sdiPerProcessor.toString());
          addGearLine("10' SDI:", '6');
          addGearLine("3' SDI:", '6');
        }
        addGearLine("25' HDMI:", '6');
        addGearLine("10' HDMI:", '6');
        addGearLine("6' HDMI:", '6');
      }

      // Utility (only on first screen)
      if(isFirstScreen) {
        addGearHeader('Utility');
        addGearLine("UG 10':", '8');
        addGearLine("UG 25':", '6');
        addGearLine("UG 50':", '6');
        addGearLine('UG Twofers:', '8');
        addGearLine('Power Bars:', '8');
      }

      // Spares
      addGearHeader('SPARES');
      addGearLine('Spare Soca Splays:', '');
      addGearLine('Spare Panel Count:', '');
      if(!jumpersBuiltin && dataJumperLen) {
        addGearLine(`Spare Data Jumpers ${dataJumperLen}:`, '');
      }
      if(dataCrossJumperLen) {
        addGearLine(`Spare Data Cross Jumpers ${dataCrossJumperLen}:`, '');
      }
      if(jumpersBuiltin) {
        addGearLine('Spare Cat5 Couplers:', '');
      }
      if(!jumpersBuiltin && powerJumperLen) {
        addGearLine(`Spare Power Jumpers ${powerJumperLen}:`, '');
      }
      addGearLine('Spare Soca:', '');
      addGearLine('Spare Data:', '');
      addGearLine('Spare Fiber:', '');
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
    
    // Add gear list page for a screen
    function addGearListPage(screenId, screenName, processorGroups, callback) {
      console.log('addGearListPage called:', screenId, screenName);
      try {
        // Start new page for gear list
        pdf.addPage();
        yOffset = margin;
        
        // Title
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Gear List - ${screenName}`, margin, yOffset);
        yOffset += 10;
        
        console.log('Title added, yOffset:', yOffset);
        
        // Get screen data directly
        const screen = screens[screenId];
        if(!screen || !screen.data) {
          console.error('No screen data found for:', screenId);
          if(callback) setTimeout(callback, 10);
          return;
        }
        
        const allPanels = getAllPanels();
        const data = screen.data;
        const calcData = screen.calculatedData || {};
        console.log('Screen data:', data);
        console.log('Calculated data:', calcData);

        const panelType = data.panelType || 'CB5_MKII';
        const p = allPanels[panelType];

        const pw = parseInt(data.panelsWide) || 0;
        const ph = parseInt(data.panelsHigh) || 0;
        
        // Check if this is the first screen (for SDI/HDMI/UG which only appear once)
        const isFirstScreen = (screenIndex === 0);
        
        // Check if canvas is 4K (need 12G SDI cables)
        const canvasSize = data.canvasSize || '4K_UHD';
        const is4KCanvas = (canvasSize === '4K_UHD' || canvasSize === '4K_DCI');
        
        // ========== PROCESSOR GROUP INFO FOR THIS SCREEN ==========
        const processorType = data.processor || 'Brompton_SX40';
        const processorGroup = processorGroups[processorType] || null;
        const isFirstScreenInGroup = processorGroup && processorGroup.firstScreenId === screenId;
        
        // ========== READ FROM CALCULATED DATA ==========
        
        // Equipment - use combined processor group data instead of per-screen
        const processorName = calcData.processorName || '';
        const activePanels = calcData.activePanels || calcData.panelCount || 0;
        
        // Rigging Hardware - read from calculatedData (set by calculate())
        const bumper1wCount = calcData.bumper1wCount || 0;
        const bumper2wCount = calcData.bumper2wCount || 0;
        const bumper4wCount = calcData.bumper4wCount || 0;
        
        // Connecting Plates - read from calculatedData (set by updateStructurePlatesDisplay())
        const plates2way = calcData.plates2way || 0;
        const plates4way = calcData.plates4way || 0;
        
        // Ground Support - read from calculatedData (set by updateGroundSupportDisplay())
        const groundSupport = calcData.groundSupport || {
          totalRearTruss: 0,
          totalBaseTruss: 0,
          totalBridgeClamps: 0,
          totalRearBridgeClampAdapters: 0,
          totalSandbags: 0,
          totalSwivelCheeseboroughs: 0,
          totalPipes: 0,
          pipeInfo: []
        };
        
        // Power - read from calculatedData (set by calculate())
        const socaCount = calcData.socaCount || 0;
        const circuitsNeeded = calcData.circuitsNeeded || 0;
        const columnsPerCircuit = calcData.columnsPerCircuit || 1;
        
        // ========== CALCULATE DATA CROSS JUMPERS ==========
        // Count column transitions for each data line
        let dataCrossJumperCount = 0;
        
        if(pw > 0 && ph > 0) {
          // Get data calculation parameters from screen data
          const pr = processors[data.processor] || processors['Brompton_SX40'];
          const portCapacity = pr ? pr.base_pixels_1g : 525000;
          const frameRate = parseInt(data.frameRate) || 60;
          const bitDepth = parseInt(data.bitDepth) || 8;
          
          // Calculate adjusted port capacity
          let adjustedCapacity = portCapacity;
          if(frameRate > 60) {
            adjustedCapacity = Math.floor(portCapacity * (60 / frameRate));
          }
          if(bitDepth > 8) {
            adjustedCapacity = Math.floor(adjustedCapacity * (8 / bitDepth));
          }
          
          // Calculate panels per data line
          const pixelsPerPanel = p ? (p.res_x * p.res_y) : 1;
          let capacityBasedPanelsPerData = Math.max(1, Math.floor(adjustedCapacity / pixelsPerPanel));
          // Cap at 500 panels per port (Brompton Tessera hardware limit)
          capacityBasedPanelsPerData = Math.min(capacityBasedPanelsPerData, 500);
          const panelSpecificDataLimit = p ? p.max_panels_per_data : null;
          const suggestedPanelsPerData = panelSpecificDataLimit
            ? Math.min(capacityBasedPanelsPerData, panelSpecificDataLimit)
            : capacityBasedPanelsPerData;
          const userMaxPanelsPerData = parseInt(data.maxPanelsPerData) || 0;
          const panelsPerDataLine = userMaxPanelsPerData > 0 ? userMaxPanelsPerData : suggestedPanelsPerData;
          
          const startDir = data.dataStartDir || 'top';
          const customDataLines = data.customDataLineAssignments;
          const hasCustomDataLines = customDataLines && customDataLines.size > 0;
          const deletedPanels = data.deletedPanels;
          
          if(startDir === 'all_top' || startDir === 'all_bottom') {
            // Each column is its own data line - no cross jumpers needed
            dataCrossJumperCount = 0;
          } else {
            // Serpentine layout - need to track which columns each data line spans
            // Build a map of data line -> set of columns it spans
            const dataLineColumns = new Map(); // dataLineNumber -> Set of column numbers
            
            // Collect custom data line numbers in use
            const usedCustomDataLines = new Set();
            if(hasCustomDataLines) {
              for(let c = 0; c < pw; c++) {
                for(let r = 0; r < ph; r++) {
                  const panelKey = `${c},${r}`;
                  const isDeleted = deletedPanels && deletedPanels.has && deletedPanels.has(panelKey);
                  if(!isDeleted && customDataLines.has(panelKey)) {
                    usedCustomDataLines.add(customDataLines.get(panelKey) - 1);
                  }
                }
              }
            }
            
            let autoDataLineCounter = 0;
            let panelsInCurrentAutoDataLine = 0;
            
            // Skip initial custom data lines
            while(usedCustomDataLines.has(autoDataLineCounter)) {
              autoDataLineCounter++;
            }
            
            // Build serpentine path and track columns per data line
            let serpentineGoingDown = (startDir === 'top');
            for(let c = 0; c < pw; c++) {
              const rows = serpentineGoingDown 
                ? Array.from({length: ph}, (_, i) => i) 
                : Array.from({length: ph}, (_, i) => ph - 1 - i);
              
              for(const r of rows) {
                const panelKey = `${c},${r}`;
                if(deletedPanels && deletedPanels.has && deletedPanels.has(panelKey)) continue;
                
                let dataLine;
                if(hasCustomDataLines && customDataLines.has(panelKey)) {
                  dataLine = customDataLines.get(panelKey) - 1;
                } else {
                  // Find next available data line number
                  while(usedCustomDataLines.has(autoDataLineCounter)) {
                    autoDataLineCounter++;
                  }
                  
                  dataLine = autoDataLineCounter;
                  panelsInCurrentAutoDataLine++;
                  
                  // Move to next data line when we reach the limit
                  if(panelsInCurrentAutoDataLine >= panelsPerDataLine) {
                    autoDataLineCounter++;
                    panelsInCurrentAutoDataLine = 0;
                    
                    while(usedCustomDataLines.has(autoDataLineCounter)) {
                      autoDataLineCounter++;
                    }
                  }
                }
                
                // Track which column this data line spans
                if(!dataLineColumns.has(dataLine)) {
                  dataLineColumns.set(dataLine, new Set());
                }
                dataLineColumns.get(dataLine).add(c);
              }
              
              serpentineGoingDown = !serpentineGoingDown;
            }
            
            // Count cross jumpers: for each data line, count (columns spanned - 1)
            dataLineColumns.forEach((columns, dataLine) => {
              const columnCount = columns.size;
              if(columnCount > 1) {
                dataCrossJumperCount += (columnCount - 1);
              }
            });
          }
        }
        
        // Pipe length string
        let pipeLengthStr = '';
        if(groundSupport.totalPipes > 0 && groundSupport.pipeInfo && groundSupport.pipeInfo.length > 0) {
          const uniqueLengths = [...new Set(groundSupport.pipeInfo.map(pi => pi.pipeLengthFt))];
          pipeLengthStr = ' (' + uniqueLengths.map(l => l + 'ft').join(', ') + ')';
        }

        // Computed cable lengths from calculateCabling
        const computedCabling2 = (typeof calculateCabling === 'function') ? calculateCabling(screenId) : null;
        const computedSocaByLength2 = {};
        const computedDataByLength2 = {};
        if(computedCabling2) {
          (computedCabling2.socaCables || []).forEach(s => {
            computedSocaByLength2[s.roundedFt] = (computedSocaByLength2[s.roundedFt] || 0) + 1;
          });
          const primaryData2 = (computedCabling2.dataCables || []).filter(c => !c.backup);
          const knockoutData2 = computedCabling2.knockoutBridgeCables || [];
          primaryData2.forEach(c => { computedDataByLength2[c.roundedFt] = (computedDataByLength2[c.roundedFt] || 0) + 1; });
          knockoutData2.forEach(c => { computedDataByLength2[c.roundedFt] = (computedDataByLength2[c.roundedFt] || 0) + 1; });
        }

        // === TWO-COLUMN LAYOUT SETUP ===
        const colWidth = 90; // Width of each column in mm
        const col1X = margin;
        const col2X = margin + colWidth + 5; // 5mm gap between columns
        const lineHeight = 4.5;
        const labelValueGap = 2; // Gap between label and value (closer)
        const sectionGap = 2;
        
        let currentCol = 1;
        let col1Y = yOffset;
        let col2Y = yOffset;
        const startY = yOffset;
        
        function getCurrentY() {
          return currentCol === 1 ? col1Y : col2Y;
        }
        
        function setCurrentY(y) {
          if(currentCol === 1) col1Y = y;
          else col2Y = y;
        }
        
        function getLabelX() {
          return currentCol === 1 ? col1X : col2X;
        }
        
        function addLine(label, value) {
          // Skip items with value 0 or empty
          if(value === '0' || value === '' || value === null || value === undefined) {
            return;
          }
          const y = getCurrentY();
          if(y > pageHeight - margin - 10) {
            // Column overflow - would need new page, but we're designing to fit
            return;
          }
          pdf.setFontSize(9);
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(0, 0, 0);
          const labelX = getLabelX();
          pdf.text(label, labelX, y);
          // Value right after label with small gap
          const labelWidth = pdf.getTextWidth(label);
          pdf.text(String(value), labelX + labelWidth + labelValueGap, y);
          setCurrentY(y + lineHeight);
        }
        
        function addSectionHeader(title) {
          const y = getCurrentY();
          if(y > pageHeight - margin - 15) {
            return;
          }
          setCurrentY(y + sectionGap);
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text(title, getLabelX(), getCurrentY());
          setCurrentY(getCurrentY() + 5);
        }
        
        function switchToColumn2() {
          currentCol = 2;
          col2Y = startY; // Start at same Y as column 1
        }
        
        console.log('Gear List Debug:', {
          panelType, pw, ph, activePanels,
          bumper1wCount, bumper2wCount, bumper4wCount,
          plates2way, plates4way,
          processorName, processorGroup, isFirstScreenInGroup,
          isFirstScreen, is4KCanvas
        });
        
        // ========== COLUMN 1 ==========
        
        // === EQUIPMENT SECTION ===
        addSectionHeader('Equipment');

        // Processor and Distribution Box - show combined totals on first screen of each processor group
        if(isFirstScreenInGroup && processorGroup) {
          const groupProcessorCount = processorGroup.processorCount || 0;
          const groupDistBoxCount = processorGroup.distBoxCount || 0;
          const distBoxName = processorGroup.distBoxName || 'Distribution Box';

          // Show processor count with name
          if(groupProcessorCount > 0) {
            addLine('Processor:', `${groupProcessorCount}x ${processorName}`);
          }

          // Show distribution box count with name (XD, CVT, etc.)
          if(groupDistBoxCount > 0) {
            addLine(`${distBoxName}:`, groupDistBoxCount.toString());
          }
        } else if(processorGroup && processorGroup.firstScreenName) {
          // This screen is tied to another screen's processor - show reference
          addLine('Processor:', `See ${processorGroup.firstScreenName}`);
        }

        addLine('Panel Count:', activePanels.toString());
        
        // === RIGGING SECTION ===
        addSectionHeader('Rigging Hardware');
        addLine('1W Bumpers:', bumper1wCount.toString());
        addLine('2W Bumpers:', bumper2wCount.toString());
        addLine('4W Bumpers:', bumper4wCount.toString());
        addLine('4W Connecting Plates:', plates4way.toString());
        addLine('2W Connecting Plates:', plates2way.toString());
        
        // 5/8" Shackles and Cheeseye - only for CB5, CB5 Half, MC7, and AMT 8.3 (hanging only)
        const needsShacklesAndCheeseye = ['CB5_MKII', 'CB5_MKII_HALF', 'MC7H', 'INFILED_AMT8_3'].includes(panelType);
        const isHanging = data.structureType === 'hanging';
        
        if(needsShacklesAndCheeseye && isHanging && useBumpers) {
          let shackleCount = 0;
          let cheeseyeCount = 0;
          
          if(panelType === 'INFILED_AMT8_3') {
            // AMT 8.3: 1 per 1W bumper, 2 per 2W bumper
            shackleCount = bumper1wCount + (bumper2wCount * 2);
            cheeseyeCount = bumper1wCount + (bumper2wCount * 2);
          } else {
            // CB5, CB5 Half, MC7: 1 per 1W bumper, 1 per 2W bumper
            shackleCount = bumper1wCount + bumper2wCount;
            cheeseyeCount = bumper1wCount + bumper2wCount;
          }
          
          if(shackleCount > 0) {
            addLine('5/8" Shackles:', shackleCount.toString());
          }
          if(cheeseyeCount > 0) {
            addLine('Cheeseye:', cheeseyeCount.toString());
          }
        }
        
        // === GROUND SUPPORT SECTION ===
        addSectionHeader('Ground Support');
        addLine('Rear Truss:', groundSupport.totalRearTruss.toString());
        addLine('Base Truss:', groundSupport.totalBaseTruss.toString());
        addLine('Bridge Clamps:', groundSupport.totalBridgeClamps.toString());
        addLine('Rear Bridge Adapter:', groundSupport.totalRearBridgeClampAdapters.toString());
        addLine('Sandbags:', groundSupport.totalSandbags.toString());
        addLine('Swivel Cheeseborough:', groundSupport.totalSwivelCheeseboroughs.toString());
        addLine('Pipe' + pipeLengthStr + ':', groundSupport.totalPipes.toString());

        // === FLOOR HARDWARE SECTION ===
        const floorFrames = calcData.floorFrames || {
          frame_1x1: 0,
          frame_2x1: 0,
          frame_2x2: 0,
          frame_3x2: 0,
          totalWeightLbs: 0
        };
        const hasFloorFrames = floorFrames.frame_1x1 > 0 || floorFrames.frame_2x1 > 0 ||
                               floorFrames.frame_2x2 > 0 || floorFrames.frame_3x2 > 0;
        if(hasFloorFrames) {
          addSectionHeader('Floor Hardware');
          if(floorFrames.frame_3x2 > 0) addLine('3×2 Frame:', floorFrames.frame_3x2.toString());
          if(floorFrames.frame_2x2 > 0) addLine('2×2 Frame:', floorFrames.frame_2x2.toString());
          if(floorFrames.frame_2x1 > 0) addLine('2×1 Frame:', floorFrames.frame_2x1.toString());
          if(floorFrames.frame_1x1 > 0) addLine('1×1 Frame:', floorFrames.frame_1x1.toString());
        }

        // === DATA CABLES SECTION (now includes Cat6) ===
        addSectionHeader('Data Cables');
        // Get cable lengths from panel specs
        const dataJumperLen = p && p.data_jumper_ft ? p.data_jumper_ft : '';
        const dataCrossJumperLen = p && p.data_cross_jumper_ft ? p.data_cross_jumper_ft : '';
        const jumpersBuiltin = p && p.jumpers_builtin;
        
        // Only show data jumpers if not built-in to panel
        if(!jumpersBuiltin && dataJumperLen) {
          addLine(`Data Jumpers ${dataJumperLen}:`, activePanels.toString());
        }
        if(dataCrossJumperLen && dataCrossJumperCount > 0) {
          addLine(`Data Cross Jumpers ${dataCrossJumperLen}:`, dataCrossJumperCount.toString());
        }
        // Cat5 Couplers - needed for CB5, CB5 Half, MC7 panels
        // Count = data cross jumpers (column transitions) + data lines (one per line to connect to distro)
        if(jumpersBuiltin) {
          const dataLinesCount = calcData.dataLines || 0;
          const totalCat5Couplers = dataCrossJumperCount + dataLinesCount;
          if(totalCat5Couplers > 0) {
            addLine('Cat5 Couplers:', totalCat5Couplers.toString());
          }
        }
        addLine("200' Cat6:", (computedDataByLength2[200] || '').toString());
        addLine("100' Cat6:", (computedDataByLength2[100] || '').toString());
        addLine("75' Cat6:", (computedDataByLength2[75] || '').toString());
        addLine("50' Cat6:", (computedDataByLength2[50] || '').toString());
        addLine("25' Cat6:", (computedDataByLength2[25] || '').toString());
        addLine("10' Cat6:", (computedDataByLength2[10] || '').toString());
        addLine("5' Cat6:", (computedDataByLength2[5] || '').toString());
        
        // === POWER CABLES SECTION ===
        addSectionHeader('Power Cables');
        // Get power jumper length from panel specs
        const powerJumperLen = p && p.power_jumper_ft ? p.power_jumper_ft : '';
        
        // Only show power jumpers if not built-in to panel
        if(!jumpersBuiltin && powerJumperLen) {
          addLine(`Power Jumpers ${powerJumperLen}:`, activePanels.toString());
        }
        addLine('Soca Splays:', socaCount.toString());
        addLine("100' Soca:", (computedSocaByLength2[100] || '').toString());
        addLine("75' Soca:", (computedSocaByLength2[75] || '').toString());
        addLine("50' Soca:", (computedSocaByLength2[50] || '').toString());
        addLine("25' Soca:", (computedSocaByLength2[25] || '').toString());
        addLine("50' True1:", '');
        addLine("25' True1:", socaCount.toString());
        addLine("10' True1:", socaCount.toString());
        addLine("5' True1:", (socaCount * 2).toString());
        addLine("3' True1:", '');
        addLine('True1 Twofer:', columnsPerCircuit > 1 ? (circuitsNeeded * columnsPerCircuit).toString() : '');

        // Processor to Dist Box cables (computed)
        if(computedCabling2 && computedCabling2.distBoxCables && computedCabling2.distBoxCables.length > 0) {
          addSectionHeader('Processor → Dist Box');
          const boxType2 = computedCabling2.distBoxCables[0]?.type === 'fiber' ? 'Fiber' : 'Cat6A';
          const boxLen2 = computedCabling2.distBoxCables[0]?.roundedFt || 0;
          addLine(`${boxType2} ${boxLen2}':`, computedCabling2.distBoxCables.length.toString());
        }

        // Server to Processor cable (computed)
        if(computedCabling2 && computedCabling2.serverCable) {
          addSectionHeader('Server → Processor');
          addLine('Cable:', `${computedCabling2.serverCable.lengthFt}'`);
        }

        // ========== COLUMN 2 ==========
        switchToColumn2();

        // === SIGNAL CABLES SECTION (only on first screen) ===
        if(isFirstScreen) {
          addSectionHeader('Signal Cables');
          addLine("500' Fiber Opticon:", '');
          addLine('Fiber 4ch Opticon Splay:', '');
          
          const processorCount = processorGroup ? processorGroup.processorCount : 0;
          const sdiPerProcessor = processorCount * 2;
          if(is4KCanvas) {
            // 4K canvas needs 12G SDI cables (25ft or longer only)
            addLine("100' 12G SDI:", sdiPerProcessor.toString());
            addLine("75' 12G SDI:", '');
            addLine("50' 12G SDI:", sdiPerProcessor.toString());
            addLine("25' 12G SDI:", sdiPerProcessor.toString());
          } else {
            // HD canvas uses regular SDI
            addLine("100' SDI:", sdiPerProcessor.toString());
            addLine("75' SDI:", '');
            addLine("50' SDI:", sdiPerProcessor.toString());
            addLine("25' SDI:", sdiPerProcessor.toString());
            addLine("10' SDI:", '6');
            addLine("3' SDI:", '6');
          }
          
          // HDMI
          addLine("25' HDMI:", '6');
          addLine("10' HDMI:", '6');
          addLine("6' HDMI:", '6');
        }
        
        // === UTILITY SECTION (only on first screen) ===
        if(isFirstScreen) {
          addSectionHeader('Utility');
          addLine("UG 10':", '8');
          addLine("UG 25':", '6');
          addLine("UG 50':", '6');
          addLine('UG Twofers:', '8');
          addLine('Power Bars:', '8');
        }
        
        // === SPARES SECTION ===
        addSectionHeader('SPARES');
        addLine('Spare Soca Splays:', '');
        addLine('Spare Panel Count:', '');
        // Only show spare jumpers if not built-in to panel
        if(!jumpersBuiltin && dataJumperLen) {
          addLine(`Spare Data Jumpers ${dataJumperLen}:`, '');
        }
        if(dataCrossJumperLen) {
          addLine(`Spare Data Cross Jumpers ${dataCrossJumperLen}:`, '');
        }
        // Spare Cat5 couplers only for panels with built-in jumpers
        if(jumpersBuiltin) {
          addLine('Spare Cat5 Couplers:', '');
        }
        if(!jumpersBuiltin && powerJumperLen) {
          addLine(`Spare Power Jumpers ${powerJumperLen}:`, '');
        }
        addLine('Spare Soca:', '');
        addLine('Spare Data:', '');
        addLine('Spare Fiber:', '');
        
        // Set final yOffset to the max of both columns
        yOffset = Math.max(col1Y, col2Y);
        
        console.log('Gear list completed, final yOffset:', yOffset);
        
      } catch(e) {
        console.error('Error generating gear list:', e);
        console.error('Stack trace:', e.stack);
      }
      
      // Call callback when done
      console.log('Calling gear list callback');
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
        const configName = document.getElementById('configName').value.trim();
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
