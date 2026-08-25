// core/gear-data.js — Shared gear list data builder
// Single source of truth for gear list calculations.
// Consumed by: gear tab (nav/gear.js), PDF export, and email export (export/pdf.js)

// Cable lengths actually stocked, per type — these drive the spare rows offered in the
// combined gear list. Deliberately NOT the same list as STANDARD_CABLE_LENGTHS in
// nav/gear.js: that one sizes real cable runs, and changing it would move every
// calculated cable count in the app.
const SPARE_CAT6_LENGTHS = [10, 25, 50, 75, 100, 200, 300];
const SPARE_SOCA_LENGTHS = [25, 50, 75, 100];

// ==================== SPARE QUANTITY OVERRIDES ====================
// Spares are auto-calculated (panels 10%, cables/rigging 40%) but every line is
// editable in the Combined view gear list. Overrides live with the project — they
// are written into the .blinkled by config/save-load.js and applied below inside
// buildGearListData(), so every consumer (gear .txt, email body, PDF) inherits them.
// Keys: 'panel:<Brand Name>', 'cat6:<len>', or the spares field name itself.

let projectSpareOverrides = {};

const SPARE_OVERRIDE_MAX = 9999;

function validateSpareOverrides(parsed) {
  if(!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const safe = {};
  Object.keys(parsed).forEach(key => {
    if(typeof key !== 'string' || key.length > 200 || !isSafeKey(key)) return;
    const num = Number(parsed[key]);
    if(!isFinite(num) || num < 0) return;
    safe[key] = Math.min(Math.floor(num), SPARE_OVERRIDE_MAX);
  });
  return safe;
}

// Store an override. An empty/invalid value clears it, restoring the calculated quantity.
function setSpareOverride(key, value) {
  if(typeof key !== 'string' || !isSafeKey(key)) return;
  const num = Number(value);
  if(value === '' || value === null || value === undefined || !isFinite(num) || num < 0) {
    delete projectSpareOverrides[key];
    return;
  }
  projectSpareOverrides[key] = Math.min(Math.floor(num), SPARE_OVERRIDE_MAX);
}

// Returns the stored override for this key, or undefined when none is set.
function getSpareOverride(key) {
  return Object.prototype.hasOwnProperty.call(projectSpareOverrides, key)
    ? projectSpareOverrides[key]
    : undefined;
}

function resolveSpareOverride(key, calculated) {
  const override = getSpareOverride(key);
  return override === undefined ? calculated : override;
}

function getSpareOverridesForSave() {
  if(Object.keys(projectSpareOverrides).length === 0) return undefined;
  return projectSpareOverrides;
}

function loadProjectSpareOverrides(overrides) {
  projectSpareOverrides = validateSpareOverrides(overrides || {});
}

// Serpentine column-crossing count for data cabling.
// Panels with cables attached to them join columns with Cat5 couplers (one per crossing);
// panels without attached cables need a cross jumper at BOTH the top and the bottom of
// every crossing, so their cross jumper count is twice the crossing count.
function calcDataCrossJumpers(data, p, W, H) {
  let crossings = 0;
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
    const suggestedPPD = capacityBasedPPD;
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
      dataLineColumns.forEach((columns) => { if(columns.size > 1) crossings += (columns.size - 1); });
    }
  }
  return {
    crossings: crossings,
    crossJumperCount: p.jumpers_builtin ? crossings : crossings * 2
  };
}

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
        directMainPorts: 0, indirectMainPorts: 0,
        firstScreenId: sid, firstScreenName: sc.name
      };
    }
    processorGroups[procType].screens.push({ screenId: sid, mainPorts: dl, totalPixels: cd.totalPixels || 0 });
    processorGroups[procType].totalMainPorts += dl;
    processorGroups[procType].totalPixels += (cd.totalPixels || 0);
    if(sc.data.redundancy) processorGroups[procType].hasAnyRedundancy = true;
    if(sc.data.processorRedundancy) processorGroups[procType].hasAnyProcessorRedundancy = true;
    // Track ports per connection mode: a screen running direct plugs into the
    // processor while an indirect one goes through boxes, so one indirect screen
    // must not route the whole group through distribution boxes.
    if(sc.data.mx40ConnectionMode === 'indirect') {
      processorGroups[procType].hasAnyIndirectMode = true;
      processorGroups[procType].indirectMainPorts += dl;
    } else {
      processorGroups[procType].directMainPorts += dl;
    }
  });

  // Calculate processor and dist box counts per group.
  // Port/box topology comes from specs/processor-topology.js so the gear list, the
  // combined gear list and calculate() all read the same source.
  // Manual processor/box assignments raise the floor on these counts (explicit wins).
  const portPlan = (typeof buildDataPortPlan === 'function') ? buildDataPortPlan() : null;

  Object.keys(processorGroups).forEach(procType => {
    const group = processorGroups[procType];
    const planned = portPlan && (typeof dataPortGroupTotals === 'function')
      ? dataPortGroupTotals(portPlan, procType) : null;

    // Each connection mode is sized on its own ports. Screens running direct plug
    // into the processor; indirect ones go through distribution boxes. Sizing the
    // whole group on whichever mode appeared first let a single indirect screen
    // route every other screen through boxes.
    const directTopo = resolveProcessorTopology(procType, 'direct');
    const indirectTopo = resolveProcessorTopology(procType, 'indirect');

    const directCounts = group.directMainPorts > 0 ? computeProcessorAndBoxCounts({
      topology: directTopo,
      mainPorts: group.directMainPorts,
      totalPixels: group.totalPixels,
      hasRedundancy: group.hasAnyRedundancy,
      screenCount: group.screens.length
    }) : { processorCount: 0, distBoxCount: 0, distBoxName: '' };

    const indirectCounts = group.indirectMainPorts > 0 ? computeProcessorAndBoxCounts({
      topology: indirectTopo,
      mainPorts: group.indirectMainPorts,
      totalPixels: group.totalPixels,
      hasRedundancy: group.hasAnyRedundancy,
      screenCount: group.screens.length
    }) : { processorCount: 0, distBoxCount: 0, distBoxName: '' };

    const counts = {
      processorCount: Math.max(
        directCounts.processorCount + indirectCounts.processorCount,
        planned ? planned.procCount : 0
      ),
      distBoxCount: Math.max(
        directCounts.distBoxCount + indirectCounts.distBoxCount,
        planned ? planned.boxCount : 0
      ),
      distBoxName: indirectCounts.distBoxName || directCounts.distBoxName
    };
    let processorCount = counts.processorCount;
    if(group.hasAnyProcessorRedundancy && processorCount > 0) processorCount *= 2;
    group.processorCount = processorCount;
    group.distBoxCount = counts.distBoxCount;
    group.distBoxName = counts.distBoxName;
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
      halfPanelName: halfPanelObj ? halfPanelObj.name : 'CB5 MKII Half'
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
    const needsSC = ['CB5_MKII', 'CB5_MKII_HALF', 'MC7H', 'INFILED_AMT8_3'].includes(panelType) || (p.custom && p.needs_shackles);
    if(needsSC && isHanging && useBumpers) {
      if(panelType === 'INFILED_AMT8_3' || (p.custom && p.double_shackles)) {
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

    const crossJumpers = calcDataCrossJumpers(data, p, W, H);

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

    // Panels with built-in jumpers need a coupler everywhere an external cable meets
    // the chain: one per main line at its entry panel, one per backup line at the exit
    // panel it feeds from, plus one per serpentine crossing. The backup runs back down
    // the same chain, so crossings do not double.
    const couplerFeeds = dataLinesCount * (data.redundancy !== false ? 2 : 1);
    const cat5CouplerCount = jumpersBuiltin ? (crossJumpers.crossings + couplerFeeds) : 0;

    const dataCables = {
      dataJumperLen: dataJumperLen,
      jumpersBuiltin: jumpersBuiltin,
      jumperCount: (!jumpersBuiltin && dataJumperLen) ? activePanels : 0,
      crossJumperLen: dataCrossJumperLen,
      crossJumperCount: crossJumpers.crossJumperCount,
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
      processorToDistBox: processorToDistBox
    });
  });

  // === SYSTEM-WIDE: SIGNAL CABLES ===
  let signalCables = null;
  let signalCablesAuto = null;
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

    signalCablesAuto = {
      isHDCanvas: isHDCanvas,
      sdiType: sdiType,
      sdiByLength: sdiByLength,
      serverFiberLine: serverFiberLine,
      hdmi: { 25: 6, 10: 6, 6: 6 }
    };

    // SDI counts are derived but the HDMI counts are flat constants, so both are
    // user-overridable in the combined gear list. Same override map as the spares.
    const overriddenSdi = {};
    Object.entries(sdiByLength).forEach(([len, count]) => {
      overriddenSdi[len] = resolveSpareOverride('signal:sdi:' + len, count);
    });
    const overriddenHdmi = {};
    Object.entries(signalCablesAuto.hdmi).forEach(([len, count]) => {
      overriddenHdmi[len] = resolveSpareOverride('signal:hdmi:' + len, count);
    });

    signalCables = {
      isHDCanvas: isHDCanvas,
      sdiType: sdiType,
      sdiByLength: overriddenSdi,
      serverFiberLine: serverFiberLine
        ? { label: serverFiberLine.label, count: resolveSpareOverride('signal:fiber', serverFiberLine.count) }
        : null,
      hdmi: overriddenHdmi
    };
  }

  // === SYSTEM-WIDE: UTILITY ===
  // Flat constants rather than a calculation, so every line is user-overridable.
  const utilityAuto = screenDataList.length > 0 ? {
    ug10: 8, ug25: 6, ug50: 6,
    ugTwofers: 8, powerBars: 8
  } : null;
  const utility = utilityAuto ? {
    ug10:      resolveSpareOverride('util:ug10',      utilityAuto.ug10),
    ug25:      resolveSpareOverride('util:ug25',      utilityAuto.ug25),
    ug50:      resolveSpareOverride('util:ug50',      utilityAuto.ug50),
    ugTwofers: resolveSpareOverride('util:ugTwofers', utilityAuto.ugTwofers),
    powerBars: resolveSpareOverride('util:powerBars', utilityAuto.powerBars)
  } : null;

  // === COMBINED SPARES (panels 10%, cables/rigging 40%) ===
  let combinedSpares = null;
  let combinedSparesAuto = null;
  if(screenDataList.length > 0) {
    const sparePanel = (count) => count > 0 ? Math.ceil(count * 0.1) : 0;
    const spareCable = (count) => count > 0 ? Math.ceil(count * 0.4) : 0;

    const panelsByType = {}; // { 'Brand Name': totalCount }
    let totShackles = 0, totCheeseyes = 0;
    const totCrossJumpersByLen = {};
    let totCat5Couplers = 0;
    let totSocaSplays = 0, totTrue1_25 = 0, totTrue1_10 = 0, totTrue1_5 = 0, totTrue1Twofer = 0;
    const totCat6 = {};
    const totSoca = {};

    screenDataList.forEach(sd => {
      const eq = sd.equipment;
      const fullName = (eq.panelBrand + ' ' + eq.panelName).trim();
      if(eq.activeFullPanels > 0 && fullName) {
        panelsByType[fullName] = (panelsByType[fullName] || 0) + eq.activeFullPanels;
      }
      if(eq.activeHalfPanels > 0) {
        const halfName = (eq.panelBrand + ' ' + eq.halfPanelName).trim();
        panelsByType[halfName] = (panelsByType[halfName] || 0) + eq.activeHalfPanels;
      }
      totShackles += sd.rigging.shackles || 0;
      totCheeseyes += sd.rigging.cheeseye || 0;
      // Cross jumper length comes from the panel (data_cross_jumper_ft), so a project
      // running two panel types needs a spare row for each length, not one merged total.
      const cjLen = sd.dataCables.crossJumperLen;
      if(cjLen) totCrossJumpersByLen[cjLen] = (totCrossJumpersByLen[cjLen] || 0) + (sd.dataCables.crossJumperCount || 0);
      totCat5Couplers += sd.dataCables.cat5CouplerCount || 0;
      Object.entries(sd.dataCables.cat6ByLength || {}).forEach(([len, count]) => {
        totCat6[len] = (totCat6[len] || 0) + count;
      });
      Object.entries(sd.powerCables.socaByLength || {}).forEach(([len, count]) => {
        totSoca[len] = (totSoca[len] || 0) + count;
      });
      totSocaSplays += sd.powerCables.socaSplays || 0;
      totTrue1_25 += sd.powerCables.true1_25 || 0;
      totTrue1_10 += sd.powerCables.true1_10 || 0;
      totTrue1_5 += sd.powerCables.true1_5 || 0;
      totTrue1Twofer += sd.powerCables.true1Twofer || 0;
    });

    // Auto-calculated quantities, before any user override. Returned alongside the
    // resolved spares so the Combined view can show them as input placeholders.
    const autoPanelsByType = {};
    Object.entries(panelsByType).forEach(([name, count]) => {
      const spare = sparePanel(count);
      if(spare > 0) autoPanelsByType[name] = spare;
    });

    // Seed every stocked length at zero, then fold in what the rig actually uses, so
    // the combined gear list can offer a spare row for a length this rig doesn't run.
    // Zero rows carry no override and stay filtered out of the exports. A length the
    // rig does run still shows up even if it isn't stocked here, so nothing on the
    // actual cable list can go unspared.
    const byLengthSpares = (stocked, totals) => {
      const out = {};
      stocked.forEach(len => { out[len] = 0; });
      Object.entries(totals).forEach(([len, count]) => { out[len] = spareCable(count); });
      return out;
    };
    const autoCrossJumpers = {};
    Object.entries(totCrossJumpersByLen).forEach(([len, count]) => { autoCrossJumpers[len] = spareCable(count); });
    const autoCat6 = byLengthSpares(SPARE_CAT6_LENGTHS, totCat6);
    const autoSoca = byLengthSpares(SPARE_SOCA_LENGTHS, totSoca);

    combinedSparesAuto = {
      panelsByType: autoPanelsByType,
      shackles: spareCable(totShackles),
      cheeseyes: spareCable(totCheeseyes),
      crossJumpersByLength: autoCrossJumpers,
      cat5Couplers: spareCable(totCat5Couplers),
      cat6ByLength: autoCat6,
      socaByLength: autoSoca,
      socaSplays: spareCable(totSocaSplays),
      true1_50: 0,
      true1_25: spareCable(totTrue1_25),
      true1_10: spareCable(totTrue1_10),
      true1_5: spareCable(totTrue1_5),
      true1Twofer: spareCable(totTrue1Twofer)
    };

    // Apply per-item overrides. A resolved 0 drops the line from every export,
    // matching the `> 0` filters the export renderers already apply.
    const sparePanelsByType = {};
    Object.entries(autoPanelsByType).forEach(([name, spare]) => {
      const resolved = resolveSpareOverride('panel:' + name, spare);
      if(resolved > 0) sparePanelsByType[name] = resolved;
    });

    const resolveByLength = (prefix, autos) => {
      const out = {};
      Object.entries(autos).forEach(([len, spare]) => {
        out[len] = resolveSpareOverride(prefix + len, spare);
      });
      return out;
    };
    const spareCat6 = resolveByLength('cat6:', autoCat6);
    const spareSoca = resolveByLength('soca:', autoSoca);

    combinedSpares = {
      panelsByType: sparePanelsByType,
      shackles: resolveSpareOverride('shackles', combinedSparesAuto.shackles),
      cheeseyes: resolveSpareOverride('cheeseyes', combinedSparesAuto.cheeseyes),
      crossJumpersByLength: resolveByLength('crossJumpers:', autoCrossJumpers),
      cat5Couplers: resolveSpareOverride('cat5Couplers', combinedSparesAuto.cat5Couplers),
      cat6ByLength: spareCat6,
      socaByLength: spareSoca,
      socaSplays: resolveSpareOverride('socaSplays', combinedSparesAuto.socaSplays),
      true1_50: resolveSpareOverride('true1_50', combinedSparesAuto.true1_50),
      true1_25: resolveSpareOverride('true1_25', combinedSparesAuto.true1_25),
      true1_10: resolveSpareOverride('true1_10', combinedSparesAuto.true1_10),
      true1_5: resolveSpareOverride('true1_5', combinedSparesAuto.true1_5),
      true1Twofer: resolveSpareOverride('true1Twofer', combinedSparesAuto.true1Twofer)
    };
  }

  return {
    configName: configName,
    processorGroups: processorGroups,
    screens: screenDataList,
    signalCables: signalCables,
    signalCablesAuto: signalCablesAuto,
    utility: utility,
    utilityAuto: utilityAuto,
    spares: combinedSpares,
    sparesAuto: combinedSparesAuto
  };
}
