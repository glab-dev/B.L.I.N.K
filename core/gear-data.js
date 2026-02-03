// core/gear-data.js — Shared gear list data builder
// Single source of truth for gear list calculations.
// Consumed by: gear tab (nav/gear.js), PDF export, and email export (export/pdf.js)

function buildGearListData(screenIds) {
  if(!screenIds || screenIds.length === 0) return { configName: '', processorGroups: {}, screens: [] };

  const configName = (typeof document !== 'undefined' && document.getElementById('configName'))
    ? (document.getElementById('configName').value.trim() || 'LED Wall Config')
    : 'LED Wall Config';

  const allPanelsObj = getAllPanels();

  // === PROCESSOR GROUPS ===
  const processorGroups = {};
  screenIds.forEach(sid => {
    const sc = screens[sid];
    if(!sc || !sc.data) return;
    const procType = sc.data.processor || 'Brompton_SX40';
    const cd = sc.calculatedData || {};
    const dl = cd.dataLines || 0;
    if(!processorGroups[procType]) {
      processorGroups[procType] = {
        screens: [], totalMainPorts: 0, totalPixels: 0,
        hasAnyRedundancy: false, hasAnyProcessorRedundancy: false, hasAnyIndirectMode: false,
        firstScreenId: sid, firstScreenName: sc.name
      };
    }
    processorGroups[procType].screens.push({ screenId: sid, mainPorts: dl, totalPixels: cd.totalPixels || 0 });
    processorGroups[procType].totalMainPorts += dl;
    processorGroups[procType].totalPixels += (cd.totalPixels || 0);
    if(sc.data.redundancy) processorGroups[procType].hasAnyRedundancy = true;
    if(sc.data.processorRedundancy) processorGroups[procType].hasAnyProcessorRedundancy = true;
    if(sc.data.mx40ConnectionMode === 'indirect') processorGroups[procType].hasAnyIndirectMode = true;
  });

  // Calculate processor and dist box counts per group
  Object.keys(processorGroups).forEach(procType => {
    const group = processorGroups[procType];
    const totalMainPorts = group.totalMainPorts;
    const hasRedundancy = group.hasAnyRedundancy;
    const hasProcessorRedundancy = group.hasAnyProcessorRedundancy;
    let processorCount = 0, distBoxCount = 0, distBoxName = '';

    if(procType === 'Brompton_SX40') {
      const mainXDs = totalMainPorts > 0 ? Math.ceil(totalMainPorts / 10) : 0;
      distBoxCount = hasRedundancy ? mainXDs * 2 : mainXDs;
      processorCount = distBoxCount > 0 ? Math.ceil(distBoxCount / 4) : 0;
      distBoxName = 'XD';
    } else if(procType === 'Brompton_S8') {
      const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
      processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 8) : 0;
    } else if(procType === 'Brompton_M2') {
      const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
      processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 4) : 0;
    } else if(procType === 'Brompton_S4') {
      const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
      processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 4) : 0;
    } else if(procType === 'NovaStar_MX40_Pro') {
      const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
      const processorsByPixels = group.totalPixels > 0 ? Math.ceil(group.totalPixels / 9000000) : 0;
      if(group.hasAnyIndirectMode) {
        distBoxCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 10) : 0;
        distBoxName = 'CVT-10 Pro';
        processorCount = Math.max(processorsByPixels, Math.ceil(distBoxCount / 4));
      } else {
        const processorsByPorts = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 20) : 0;
        processorCount = Math.max(processorsByPixels, processorsByPorts);
      }
    } else {
      const totalPortsNeeded = hasRedundancy ? totalMainPorts * 2 : totalMainPorts;
      processorCount = totalPortsNeeded > 0 ? Math.ceil(totalPortsNeeded / 8) : group.screens.length;
    }
    if(hasProcessorRedundancy && processorCount > 0) processorCount *= 2;
    group.processorCount = processorCount;
    group.distBoxCount = distBoxCount;
    group.distBoxName = distBoxName;
  });

  // Server → Processor cable is system-wide (one connection: main + backup = 2 cables)
  // Use the longest serverToProcessor value across all screens
  let serverCableLength = 0;
  screenIds.forEach(screenId => {
    const screen = screens[screenId];
    if(!screen || !screen.data) return;
    const cablingCheck = (typeof calculateCabling === 'function') ? calculateCabling(screenId) : null;
    if(cablingCheck && cablingCheck.serverCable) {
      const len = cablingCheck.serverCable.lengthFt || 0;
      if(len > serverCableLength) serverCableLength = len;
    }
  });

  // === PER-SCREEN DATA ===
  const screenDataList = [];

  screenIds.forEach(screenId => {
    const screen = screens[screenId];
    if(!screen || !screen.data) return;
    const data = screen.data;
    const calcData = screen.calculatedData || {};
    const W = parseInt(data.panelsWide) || 0;
    const H = parseInt(data.panelsHigh) || 0;
    if(W === 0 || H === 0) return;

    const panelType = data.panelType || 'CB5_MKII';
    const p = allPanelsObj[panelType];
    if(!p) return;

    const processorType = data.processor || 'Brompton_SX40';
    const processorGroup = processorGroups[processorType] || null;
    const isFirstScreenInGroup = processorGroup && processorGroup.firstScreenId === screenId;

    // --- EQUIPMENT ---
    const hasCB5HalfRow = data.addCB5HalfRow && panelType === 'CB5_MKII';
    const activePanels = calcData.activePanels || calcData.panelCount || 0;
    const activeHalfPanels = hasCB5HalfRow ? W : 0;
    const activeFullPanels = activePanels - activeHalfPanels;
    const halfPanelObj = allPanelsObj['CB5_MKII_HALF'];

    const equipment = {
      processorType: processorType,
      processorCount: (isFirstScreenInGroup && processorGroup) ? processorGroup.processorCount : 0,
      processorName: calcData.processorName || '',
      distBoxCount: (isFirstScreenInGroup && processorGroup) ? processorGroup.distBoxCount : 0,
      distBoxName: (isFirstScreenInGroup && processorGroup) ? processorGroup.distBoxName : '',
      isFirstScreenInGroup: isFirstScreenInGroup,
      referencesScreenName: (!isFirstScreenInGroup && processorGroup && processorGroup.firstScreenName) ? processorGroup.firstScreenName : null,
      panelType: panelType,
      activePanels: activePanels,
      activeFullPanels: activeFullPanels,
      activeHalfPanels: activeHalfPanels,
      panelBrand: p.brand || '',
      panelName: p.name || '',
      halfPanelName: halfPanelObj ? halfPanelObj.name : 'CB5 MKII Half Panel'
    };

    // --- RIGGING ---
    const bumper1wCount = calcData.bumper1wCount || 0;
    const bumper2wCount = calcData.bumper2wCount || 0;
    const bumper4wCount = calcData.bumper4wCount || 0;
    const plates2way = calcData.plates2way || 0;
    const plates4way = calcData.plates4way || 0;
    const useBumpers = data.useBumpers !== false;
    const isHanging = (data.structureType || 'hanging') === 'hanging';

    let shackleCount = 0;
    let cheeseyeCount = 0;
    const needsSC = ['CB5_MKII', 'CB5_MKII_HALF', 'MC7H', 'INFILED_AMT8_3'].includes(panelType);
    if(needsSC && isHanging && useBumpers) {
      if(panelType === 'INFILED_AMT8_3') {
        shackleCount = bumper1wCount + (bumper2wCount * 2);
        cheeseyeCount = bumper1wCount + (bumper2wCount * 2);
      } else {
        shackleCount = bumper1wCount + bumper2wCount;
        cheeseyeCount = bumper1wCount + bumper2wCount;
      }
    }

    const hasRigging = bumper1wCount > 0 || bumper2wCount > 0 || bumper4wCount > 0 || plates4way > 0 || plates2way > 0;
    const rigging = {
      bumper1w: bumper1wCount,
      bumper2w: bumper2wCount,
      bumper4w: bumper4wCount,
      plates2way: plates2way,
      plates4way: plates4way,
      shackles: shackleCount,
      cheeseye: cheeseyeCount,
      hasRigging: hasRigging
    };

    // --- GROUND SUPPORT ---
    const gs = calcData.groundSupport || { totalRearTruss: 0, totalBaseTruss: 0, totalBridgeClamps: 0, totalRearBridgeClampAdapters: 0, totalSandbags: 0, totalSwivelCheeseboroughs: 0, totalPipes: 0, pipeInfo: [] };
    let pipeLengthStr = '';
    if(gs.totalPipes > 0 && gs.pipeInfo && gs.pipeInfo.length > 0) {
      const uniqueLengths = [...new Set(gs.pipeInfo.map(pi => pi.pipeLengthFt))];
      pipeLengthStr = ' (' + uniqueLengths.map(l => l + 'ft').join(', ') + ')';
    }
    const hasGS = gs.totalRearTruss > 0 || gs.totalBaseTruss > 0 || gs.totalBridgeClamps > 0 || gs.totalSandbags > 0 || gs.totalPipes > 0 || gs.totalSwivelCheeseboroughs > 0 || gs.totalRearBridgeClampAdapters > 0;
    const groundSupport = {
      rearTruss: gs.totalRearTruss,
      baseTruss: gs.totalBaseTruss,
      bridgeClamps: gs.totalBridgeClamps,
      rearBridgeAdapters: gs.totalRearBridgeClampAdapters,
      sandbags: gs.totalSandbags,
      swivelCheeseboroughs: gs.totalSwivelCheeseboroughs,
      pipes: gs.totalPipes,
      pipeLengthStr: pipeLengthStr,
      hasGS: hasGS
    };

    // --- FLOOR HARDWARE ---
    const ff = calcData.floorFrames || { frame_1x1: 0, frame_2x1: 0, frame_2x2: 0, frame_3x2: 0 };
    const hasFloorFrames = ff.frame_1x1 > 0 || ff.frame_2x1 > 0 || ff.frame_2x2 > 0 || ff.frame_3x2 > 0;
    const floorHardware = {
      frame3x2: ff.frame_3x2 || 0,
      frame2x2: ff.frame_2x2 || 0,
      frame2x1: ff.frame_2x1 || 0,
      frame1x1: ff.frame_1x1 || 0,
      hasFloorFrames: hasFloorFrames
    };

    // --- DATA CROSS JUMPER COUNT (serpentine replay) ---
    const dataJumperLen = p.data_jumper_ft || '';
    const dataCrossJumperLen = p.data_cross_jumper_ft || '';
    const powerJumperLen = p.power_jumper_ft || '';
    const jumpersBuiltin = p.jumpers_builtin || false;
    const dataLinesCount = calcData.dataLines || 0;

    let dataCrossJumperCount = 0;
    if(W > 0 && H > 0) {
      const pr = processors[data.processor] || processors['Brompton_SX40'];
      const portCapacity = pr ? pr.base_pixels_1g : 525000;
      const frameRate = parseInt(data.frameRate) || 60;
      const bitDepth = parseInt(data.bitDepth) || 8;
      let adjustedCapacity = portCapacity;
      if(frameRate > 60) adjustedCapacity = Math.floor(portCapacity * (60 / frameRate));
      if(bitDepth > 8) adjustedCapacity = Math.floor(adjustedCapacity * (8 / bitDepth));
      const pixelsPerPanel = p.res_x * p.res_y;
      let capacityBasedPPD = Math.max(1, Math.floor(adjustedCapacity / pixelsPerPanel));
      capacityBasedPPD = Math.min(capacityBasedPPD, 500);
      const panelSpecificLimit = p.max_panels_per_data || null;
      const suggestedPPD = panelSpecificLimit ? Math.min(capacityBasedPPD, panelSpecificLimit) : capacityBasedPPD;
      const userMaxPPD = parseInt(data.maxPanelsPerData) || 0;
      const panelsPerDataLine = userMaxPPD > 0 ? userMaxPPD : suggestedPPD;

      const startDir = data.dataStartDir || 'top';
      const deletedPanelsData = data.deletedPanels;
      const customDataLines = data.customDataLineAssignments;
      const hasCustomDataLines = customDataLines && customDataLines.size > 0;

      if(startDir !== 'all_top' && startDir !== 'all_bottom') {
        const dataLineColumns = new Map();
        const usedCustomDataLines = new Set();
        if(hasCustomDataLines) {
          for(let c = 0; c < W; c++) {
            for(let r = 0; r < H; r++) {
              const pk = `${c},${r}`;
              const isDeleted = deletedPanelsData && deletedPanelsData.has && deletedPanelsData.has(pk);
              if(!isDeleted && customDataLines.has(pk)) usedCustomDataLines.add(customDataLines.get(pk) - 1);
            }
          }
        }
        let autoCounter = 0, panelsInCurrent = 0;
        while(usedCustomDataLines.has(autoCounter)) autoCounter++;
        let goingDown = (startDir === 'top');
        for(let c = 0; c < W; c++) {
          const rows = goingDown ? Array.from({length: H}, (_, i) => i) : Array.from({length: H}, (_, i) => H - 1 - i);
          for(const r of rows) {
            const pk = `${c},${r}`;
            if(deletedPanelsData && deletedPanelsData.has && deletedPanelsData.has(pk)) continue;
            let dl;
            if(hasCustomDataLines && customDataLines.has(pk)) {
              dl = customDataLines.get(pk) - 1;
            } else {
              while(usedCustomDataLines.has(autoCounter)) autoCounter++;
              dl = autoCounter;
              panelsInCurrent++;
              if(panelsInCurrent >= panelsPerDataLine) { autoCounter++; panelsInCurrent = 0; while(usedCustomDataLines.has(autoCounter)) autoCounter++; }
            }
            if(!dataLineColumns.has(dl)) dataLineColumns.set(dl, new Set());
            dataLineColumns.get(dl).add(c);
          }
          goingDown = !goingDown;
        }
        dataLineColumns.forEach((columns) => { if(columns.size > 1) dataCrossJumperCount += (columns.size - 1); });
      }
    }

    // --- CABLING (from calculateCabling) ---
    const cabling = (typeof calculateCabling === 'function') ? calculateCabling(screenId) : null;

    // Data cables grouped by length
    const cat6ByLength = {};
    const cableDetail = [];
    const knockoutDetail = [];
    if(cabling) {
      const allDataCables = cabling.dataCables || [];
      const knockoutCables = cabling.knockoutBridgeCables || [];
      allDataCables.forEach(c => { cat6ByLength[c.roundedFt] = (cat6ByLength[c.roundedFt] || 0) + 1; });
      knockoutCables.forEach(c => { cat6ByLength[c.roundedFt] = (cat6ByLength[c.roundedFt] || 0) + 1; });
      // Detail for expandable sections
      const primaryCables = allDataCables.filter(c => !c.backup);
      primaryCables.forEach(c => { cableDetail.push({ lineIndex: c.lineIndex, lengthFt: c.lengthFt, roundedFt: c.roundedFt }); });
      knockoutCables.forEach((c, idx) => { knockoutDetail.push({ index: idx, fromPanel: c.fromPanel, toPanel: c.toPanel, lengthFt: c.lengthFt, roundedFt: c.roundedFt }); });
    }

    const cat5CouplerCount = jumpersBuiltin ? (dataCrossJumperCount + dataLinesCount) : 0;

    const dataCables = {
      dataJumperLen: dataJumperLen,
      jumpersBuiltin: jumpersBuiltin,
      jumperCount: (!jumpersBuiltin && dataJumperLen) ? activePanels : 0,
      crossJumperLen: dataCrossJumperLen,
      crossJumperCount: dataCrossJumperCount,
      cat5CouplerCount: cat5CouplerCount,
      cat6ByLength: cat6ByLength,
      cableDetail: cableDetail,
      knockoutDetail: knockoutDetail
    };

    // --- POWER CABLES ---
    const socaCount = calcData.socaCount || 0;
    const circuitsNeeded = calcData.circuitsNeeded || 0;
    const columnsPerCircuit = calcData.columnsPerCircuit || 1;

    const socaByLength = {};
    const socaDetail = [];
    if(cabling && cabling.socaCables && cabling.socaCables.length > 0) {
      cabling.socaCables.forEach(s => {
        socaByLength[s.roundedFt] = (socaByLength[s.roundedFt] || 0) + 1;
        socaDetail.push({ index: s.index, lengthFt: s.lengthFt, roundedFt: s.roundedFt });
      });
    }

    const powerCables = {
      powerJumperLen: powerJumperLen,
      jumperCount: (!jumpersBuiltin && powerJumperLen) ? activePanels : 0,
      socaSplays: socaCount,
      socaByLength: socaByLength,
      socaDetail: socaDetail,
      true1_25: socaCount,
      true1_10: socaCount,
      true1_5: socaCount * 2,
      true1Twofer: columnsPerCircuit > 1 ? (circuitsNeeded * columnsPerCircuit) : 0
    };

    // --- PROCESSOR → DIST BOX ---
    let processorToDistBox = { count: 0, cableType: '', cableLength: 0 };
    if(cabling && cabling.distBoxCables && cabling.distBoxCables.length > 0) {
      const mainBoxCables = cabling.distBoxCables.filter(c => c.label === 'main');
      processorToDistBox = {
        count: cabling.distBoxCables.length,
        cableType: mainBoxCables[0]?.type === 'fiber' ? 'Fiber' : 'Cat6A',
        cableLength: mainBoxCables[0]?.roundedFt || 0
      };
    }

    // (Signal cables and utility are now computed at the system level — see below)

    // --- SPARES ---
    const spares = {
      socaSplays: true,
      panelCount: true,
      dataJumpers: !jumpersBuiltin && !!dataJumperLen,
      dataJumperLen: dataJumperLen,
      crossJumpers: !!dataCrossJumperLen,
      crossJumperLen: dataCrossJumperLen,
      cat5Couplers: jumpersBuiltin,
      powerJumpers: !jumpersBuiltin && !!powerJumperLen,
      powerJumperLen: powerJumperLen,
      soca: true,
      data: true,
      fiber: true
    };

    screenDataList.push({
      screenId: screenId,
      screenName: screen.name,
      screenColor: screen.color,
      equipment: equipment,
      rigging: rigging,
      groundSupport: groundSupport,
      floorHardware: floorHardware,
      dataCables: dataCables,
      powerCables: powerCables,
      processorToDistBox: processorToDistBox,
      spares: spares
    });
  });

  // === SYSTEM-WIDE: SIGNAL CABLES ===
  let signalCables = null;
  if(screenDataList.length > 0) {
    // Determine SDI type: use 4K/12G if ANY screen has 4K+ canvas
    let isHDCanvas = true;
    screenIds.forEach(sid => {
      const sc = screens[sid];
      if(!sc || !sc.data) return;
      const canvasSize = sc.data.canvasSize || '4K_UHD';
      const isHD = canvasSize === 'HD' || (canvasSize === 'custom' &&
        (parseInt(sc.data.customCanvasWidth) || 1920) <= 1920 &&
        (parseInt(sc.data.customCanvasHeight) || 1080) <= 1080);
      if(!isHD) isHDCanvas = false;
    });
    const sdiType = isHDCanvas ? '3G SDI' : '12G SDI';

    // Sum ALL processor counts across all groups
    let totalProcessors = 0;
    Object.keys(processorGroups).forEach(procType => {
      totalProcessors += processorGroups[procType].processorCount || 0;
    });
    const sdiPerProcessor = totalProcessors * 2;

    const sdiByLength = {};
    if(isHDCanvas) {
      sdiByLength[100] = sdiPerProcessor;
      sdiByLength[50] = sdiPerProcessor;
      sdiByLength[25] = sdiPerProcessor;
      sdiByLength[10] = 6;
      sdiByLength[3] = 6;
    } else {
      sdiByLength[100] = sdiPerProcessor;
      sdiByLength[50] = sdiPerProcessor;
      sdiByLength[25] = sdiPerProcessor;
    }

    // Server → Processor cable: single run + backup (2 cables total)
    let serverFiberLine = null;
    if(serverCableLength > 0) {
      if(serverCableLength > 300) {
        const fiberLen = Math.max(500, Math.ceil(serverCableLength / 100) * 100);
        serverFiberLine = { label: fiberLen + "' Fiber", count: 2 };
      } else {
        const sdiLen = roundUpToStandard(serverCableLength);
        sdiByLength[sdiLen] = (sdiByLength[sdiLen] || 0) + 2;
      }
    }

    signalCables = {
      isHDCanvas: isHDCanvas,
      sdiType: sdiType,
      sdiByLength: sdiByLength,
      serverFiberLine: serverFiberLine,
      hdmi: { 25: 6, 10: 6, 6: 6 }
    };
  }

  // === SYSTEM-WIDE: UTILITY ===
  const utility = screenDataList.length > 0 ? {
    ug10: 8, ug25: 6, ug50: 6,
    ugTwofers: 8, powerBars: 8
  } : null;

  return {
    configName: configName,
    processorGroups: processorGroups,
    screens: screenDataList,
    signalCables: signalCables,
    utility: utility
  };
}
