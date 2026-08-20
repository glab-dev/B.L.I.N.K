// ==================== DATA PORT PLAN ====================
// Works out which processor and distribution box every data line lands on.
//
// A data line IS a port — the number the user assigns via "Assign Data Port" is
// stored in customDataLineAssignments exactly as before. What this module adds is
// the processor and box that port belongs to, held in customDataDestinations
// ("col,row" -> { proc, box }).
//
// Numbering is GLOBAL per processor type, not per screen: two screens pinned to
// processor 1 / box 1 share one physical unit and must not be counted twice. The
// allocation mirrors sharedDistroLabelPlan() in core/calculate.js — explicit
// assignments claim their slots first, then auto lines fill the gaps, walking
// screens in tab order with a cursor that runs continuously across the group.
//
// Depends on: buildDataLineGroups (layouts/data.js), resolvePanelsPerDataLine and
// calculateAdjustedPixelCapacity (core/calculate.js), resolveProcessorTopology
// (specs/processor-topology.js), getAllPanels/getAllProcessors.

// The open screen's saved data lags the DOM — calculate() does not call
// saveCurrentScreenData() — so read the live inputs and globals for that one
// screen. Every other screen uses its saved data, which is correct because it is
// not being edited. Same problem sharedDistroLabelPlan() solves with liveOverride.
function liveScreenData(screenId) {
  const screen = screens[screenId];
  if(!screen || !screen.data) return null;
  if(typeof currentScreenId === 'undefined' || screenId !== currentScreenId) return screen.data;
  if(typeof document === 'undefined') return screen.data;

  const num = (id, fallback) => {
    const el = document.getElementById(id);
    if(!el) return fallback;
    const v = parseInt(el.value, 10);
    return isNaN(v) ? fallback : v;
  };
  const str = (id, fallback) => {
    const el = document.getElementById(id);
    return (el && el.value) ? el.value : fallback;
  };

  const live = Object.create(screen.data);
  live.panelsWide = num('panelsWide', screen.data.panelsWide);
  live.panelsHigh = num('panelsHigh', screen.data.panelsHigh);
  live.processor = str('processor', screen.data.processor);
  live.panelType = str('panelType', screen.data.panelType);
  live.frameRate = num('frameRate', screen.data.frameRate);
  live.bitDepth = num('bitDepth', screen.data.bitDepth);
  live.maxPanelsPerData = num('maxPanelsPerData', screen.data.maxPanelsPerData);
  live.dataStartDir = str('dataStartDir', screen.data.dataStartDir);
  if(typeof mx40ConnectionMode !== 'undefined') live.mx40ConnectionMode = mx40ConnectionMode;
  if(typeof deletedPanels !== 'undefined') live.deletedPanels = deletedPanels;
  if(typeof customDataLineAssignments !== 'undefined') live.customDataLineAssignments = customDataLineAssignments;
  if(typeof customDataDestinations !== 'undefined') live.customDataDestinations = customDataDestinations;
  return live;
}

// Per-screen data inputs, coerced out of saved data (Sets/Maps may arrive as
// arrays from JSON). Returns null when the screen has no usable grid.
function resolveScreenDataInputs(data) {
  if(!data) return null;
  const pw = data.panelsWide || 0, ph = data.panelsHigh || 0;
  if(pw <= 0 || ph <= 0) return null;

  const allPanels = (typeof getAllPanels === 'function') ? getAllPanels() : {};
  const allProcs = (typeof getAllProcessors === 'function') ? getAllProcessors() : {};
  const panelType = data.panelType || 'CB5_MKII';
  const panel = allPanels[panelType];
  if(!panel) return null;

  const toSet = v => v instanceof Set ? v : new Set(Array.isArray(v) ? v : (v && v[Symbol.iterator] ? [...v] : []));
  const toMap = v => v instanceof Map ? v : new Map(Array.isArray(v) ? v : (v && v.entries ? [...v.entries()] : []));

  const processorId = data.processor || 'Brompton_SX40';
  const hasCB5HalfRow = !!data.addCB5HalfRow && panelType === 'CB5_MKII';
  const deletedPanels = toSet(data.deletedPanels);

  const panelsPerDataLine = (typeof resolvePanelsPerDataLine === 'function')
    ? resolvePanelsPerDataLine({
        panel: panel,
        halfPanel: allPanels['CB5_MKII_HALF'],
        processor: allProcs[processorId],
        frameRate: data.frameRate || 60,
        bitDepth: data.bitDepth || 8,
        hasCB5HalfRow: hasCB5HalfRow,
        pw: pw, ph: ph,
        deletedCount: deletedPanels.size,
        userMax: parseInt(data.maxPanelsPerData) || 0
      })
    : 48;

  return {
    pw: pw,
    ph: hasCB5HalfRow ? ph + 1 : ph,
    panelsPerDataLine: panelsPerDataLine,
    startDir: data.dataStartDir || 'top',
    deletedPanels: deletedPanels,
    customDataLines: toMap(data.customDataLineAssignments),
    customDestinations: toMap(data.customDataDestinations),
    processorId: processorId,
    connectionMode: data.mx40ConnectionMode || 'direct'
  };
}

// One screen's MAIN data lines: the 1-based line numbers actually in use, plus the
// explicit { proc, box } each line carries (taken from any assigned panel on it).
// Backup lines are not modelled here — redundancy is handled downstream, unchanged.
function screenDataLineDestinations(data) {
  const inp = resolveScreenDataInputs(data);
  if(!inp || typeof buildDataLineGroups !== 'function') return { lines: [], explicit: new Map() };

  const built = buildDataLineGroups({
    pw: inp.pw,
    ph: inp.ph,
    panelsPerDataLine: inp.panelsPerDataLine,
    startDir: inp.startDir,
    deletedPanels: inp.deletedPanels,
    customDataLineAssignments: inp.customDataLines
  });

  const lines = (built.sortedDataLines || []).map(ln => ln + 1);
  const explicit = new Map();

  // A line's destination comes from any panel on it that carries one. Later panels
  // win, matching how a line only ever terminates in one place.
  (built.sortedDataLines || []).forEach((ln, gi) => {
    const group = built.groups[gi] || [];
    group.forEach(pt => {
      const dest = inp.customDestinations.get(pt.c + ',' + pt.r);
      if(!dest) return;
      const proc = (typeof dest.proc === 'number' && dest.proc >= 1) ? dest.proc : null;
      const box = (typeof dest.box === 'number' && dest.box >= 1) ? dest.box : null;
      if(proc === null && box === null) return;
      const prev = explicit.get(ln + 1) || { proc: null, box: null };
      explicit.set(ln + 1, {
        proc: proc !== null ? proc : prev.proc,
        box: box !== null ? box : prev.box
      });
    });
  });

  return { lines: lines, explicit: explicit, processorId: inp.processorId, connectionMode: inp.connectionMode };
}

// Screen ids in tab order (numeric screen_N suffix), the same order renderScreenTabs
// shows and sharedDistroGroupIds() walks.
function dataPortScreenIds() {
  if(typeof screens === 'undefined') return [];
  return Object.keys(screens)
    .filter(id => screens[id] && screens[id].data)
    .sort((a, b) => (parseInt(a.split('_')[1]) || 0) - (parseInt(b.split('_')[1]) || 0));
}

// The whole rig's data port plan.
// liveOverride = { screenId, lines, explicit } lets the open screen supply its live
// grouping, since its saved data can lag the DOM (same trick sharedDistroLabelPlan
// uses).
//
// Returns:
//   perScreen: Map<screenId, Map<lineNumber, { procType, proc, box, port }>>
//   groups:    Map<procType, { procCount, boxCount, distBoxName, usesDistBox }>
//   conflicts: [{ procType, proc, box, port, a:{screenId,line}, b:{screenId,line} }]
//   overflows: [{ procType, proc, box, capacity, assigned }]
function buildDataPortPlan(liveOverride) {
  const perScreen = new Map();
  const groups = new Map();
  const conflicts = [];
  const overflows = [];

  // Bucket screens by processor type, exactly as core/gear-data.js does.
  const buckets = new Map();
  dataPortScreenIds().forEach(id => {
    const data = liveScreenData(id) || screens[id].data;
    const info = (liveOverride && liveOverride.screenId === id)
      ? { lines: liveOverride.lines || [], explicit: liveOverride.explicit || new Map(),
          processorId: data.processor || 'Brompton_SX40', connectionMode: data.mx40ConnectionMode || 'direct' }
      : screenDataLineDestinations(data);
    if(!info.lines.length) return;
    const procType = info.processorId;
    if(!buckets.has(procType)) buckets.set(procType, { indirect: false, redundant: false, entries: [] });
    const bucket = buckets.get(procType);
    if(info.connectionMode === 'indirect') bucket.indirect = true;
    // Any redundant screen makes the whole bucket redundant, matching the
    // hasAnyRedundancy OR in core/gear-data.js.
    if(data.redundancy) bucket.redundant = true;
    bucket.entries.push({ screenId: id, info: info });
  });

  buckets.forEach((bucket, procType) => {
    const topology = resolveProcessorTopology(procType, bucket.indirect ? 'indirect' : 'direct');
    const usesDistBox = topology.usesDistBox;
    const redundant = bucket.redundant;
    const pairedBoxes = redundant && topology.backupMode === 'paired_boxes';
    const pairedPorts = redundant && topology.backupMode === 'paired_ports';
    // Usable MAIN capacity. With paired ports half of them are loop-backs, so only
    // every other port can take a main; with paired boxes the whole box pairs off
    // instead and its port count is untouched.
    const capacity = Math.max(1, mainPortsPerUnit(topology, redundant));
    const boxesPerProc = Math.max(1, usesDistBox ? topology.boxesPerProcessor : 1);

    // Physical port for the Nth main on a unit: 1,3,5... when ports pair off.
    const physicalPort = (ordinal) => pairedPorts ? (ordinal * 2 - 1) : ordinal;
    // Main-box ordinal for a box index: with paired boxes, mains sit on the odd
    // indices (A,C = 1,3), so index 3 is the SECOND main box. Counts must report
    // ordinals, not raw indices, or the explicit floor downstream inflates.
    const boxOrdinal = (boxIdx) => pairedBoxes ? Math.ceil(boxIdx / 2) : boxIdx;

    // slotKey -> count of lines landing on that unit. The PHYSICAL port a line
    // occupies is its position on the unit (1..capacity), derived here — it is not
    // the screen-local data line number, which only labels the line within its own
    // wall. Three screens that each call their first line "1" still share one box,
    // taking physical ports 1, 2 and 3.
    const occupancy = new Map();
    const slotKey = (proc, box) => proc + '|' + (box === null ? '-' : box);

    function place(proc, box, screenId, line) {
      const k = slotKey(proc, box);
      const used = occupancy.get(k) || 0;
      occupancy.set(k, used + 1);
      return physicalPort(used + 1); // physical port on this unit
    }

    // --- Pass 1: explicit assignments claim their unit first, in tab order ---
    // Only fully-specified destinations claim here; partial ones resolve in pass 2.
    const claimedPorts = new Map(); // "screenId|line" -> { proc, box, port }
    bucket.entries.forEach(entry => {
      entry.info.lines.forEach(line => {
        const dest = entry.info.explicit.get(line);
        if(!dest || dest.proc === null) return;
        if(usesDistBox && dest.box === null) return;
        const box = usesDistBox ? dest.box : null;
        claimedPorts.set(entry.screenId + '|' + line,
                         { proc: dest.proc, box: box, port: place(dest.proc, box, entry.screenId, line) });
      });
    });

    // --- Pass 2: auto lines fill the remaining capacity, cursor running
    // continuously across the whole bucket ---
    let curProc = 1, curBox = usesDistBox ? 1 : null;
    function advance() {
      if(usesDistBox) {
        // Step by 2 when boxes pair off, so mains never land on B or D.
        curBox += pairedBoxes ? 2 : 1;
        if(curBox > boxesPerProc) { curBox = 1; curProc++; }
      } else {
        curProc++;
      }
    }
    function nextUnitWithRoom() {
      for(let guard = 0; guard < 100000; guard++) {
        if((occupancy.get(slotKey(curProc, curBox)) || 0) < capacity) {
          return { proc: curProc, box: curBox };
        }
        advance();
      }
      return { proc: curProc, box: curBox };
    }

    bucket.entries.forEach(entry => {
      const lineMap = new Map();
      entry.info.lines.forEach(line => {
        const claimed = claimedPorts.get(entry.screenId + '|' + line);
        if(claimed) {
          lineMap.set(line, { procType: procType, proc: claimed.proc, box: claimed.box,
                              port: claimed.port, explicit: true,
                              backup: backupDestinationFor(topology, redundant, claimed.box, claimed.port) });
          return;
        }
        const dest = entry.info.explicit.get(line);
        const slot = nextUnitWithRoom();
        const proc = (dest && dest.proc !== null) ? dest.proc : slot.proc;
        const box = usesDistBox ? ((dest && dest.box !== null) ? dest.box : slot.box) : null;
        const port = place(proc, box, entry.screenId, line);
        lineMap.set(line, { procType: procType, proc: proc, box: box,
                            port: port, explicit: false,
                            backup: backupDestinationFor(topology, redundant, box, port) });
      });
      perScreen.set(entry.screenId, lineMap);
    });

    // --- Counts: highest unit index actually referenced ---
    // Using the max index rather than a sum is what makes two screens pinned to the
    // same processor/box share one physical unit instead of doubling it.
    // Highest index wins on both axes: a line pinned to "XD box 5" means five boxes
    // exist on that processor, not one. Box indices restart per processor, so the
    // rig total is the per-processor maximum summed over the processors in use.
    let procCount = 0;
    const maxBoxPerProc = new Map();
    occupancy.forEach((used, k) => {
      if(!used) return;
      const parts = k.split('|');
      const proc = parseInt(parts[0]) || 0;
      const box = parts[1] === '-' ? null : (parseInt(parts[1]) || 0);
      if(proc > procCount) procCount = proc;
      if(usesDistBox && box !== null) {
        const ord = boxOrdinal(box);
        if(ord > (maxBoxPerProc.get(proc) || 0)) maxBoxPerProc.set(proc, ord);
      }
      if(used > capacity) {
        overflows.push({ procType: procType, proc: proc, box: box,
                         capacity: capacity, assigned: used });
      }
    });
    let boxCount = 0;
    maxBoxPerProc.forEach(maxBox => { boxCount += maxBox; });

    groups.set(procType, {
      procCount: procCount,
      boxCount: usesDistBox ? boxCount : 0,
      distBoxName: usesDistBox ? topology.distBoxName : '',
      usesDistBox: usesDistBox,
      boxLabelStyle: topology.boxLabelStyle,
      redundant: redundant
    });
  });

  return { perScreen: perScreen, groups: groups, conflicts: conflicts, overflows: overflows };
}

// Which physical ports on one unit are free, and who holds the rest.
// Used before writing an assignment so the user is told "ports 1-6 are already
// used by Screen A, 7-10 are free" instead of silently overflowing the unit.
// excludeScreenId/excludeLines let a re-assignment ignore its own current lines.
function dataPortUnitAvailability(procType, proc, box, excludeScreenId, excludeLines) {
  const plan = buildDataPortPlan();
  const topology = resolveProcessorTopology(procType, dataPortBucketIsIndirect(procType) ? 'indirect' : 'direct');
  const usesDistBox = topology.usesDistBox;
  const redundant = dataPortBucketIsRedundant(procType);
  // Free MAIN ports only — offering a loop-back port as available would let the
  // user patch a main onto a backup.
  const capacity = Math.max(1, mainPortsPerUnit(topology, redundant));
  const pairedPorts = redundant && topology.backupMode === 'paired_ports';

  const skip = new Set((excludeLines || []).map(l => String(l)));
  const holders = new Map(); // port -> screenId
  let used = 0;

  plan.perScreen.forEach((lineMap, screenId) => {
    lineMap.forEach((dest, line) => {
      if(dest.procType !== procType) return;
      if(dest.proc !== proc) return;
      if(usesDistBox && dest.box !== box) return;
      if(screenId === excludeScreenId && skip.has(String(line))) return;
      used++;
      holders.set(dest.port, screenId);
    });
  });

  const freePorts = [];
  for(let i = 1; i <= capacity; i++) {
    const physical = pairedPorts ? (i * 2 - 1) : i;
    if(!holders.has(physical)) freePorts.push(physical);
  }

  return {
    capacity: capacity,
    used: used,
    freePorts: freePorts,
    holders: holders,
    unitLabel: usesDistBox
      ? ((topology.distBoxName || 'Box') + ' ' + formatUnitLabel(box, topology.boxLabelStyle))
      : ('Processor ' + proc)
  };
}

// True when any screen using this processor type has redundancy on — the same
// rule core/gear-data.js applies when grouping.
function dataPortBucketIsRedundant(procType) {
  return dataPortScreenIds().some(id => {
    const d = liveScreenData(id) || screens[id].data;
    return (d.processor || 'Brompton_SX40') === procType && !!d.redundancy;
  });
}

// True when any screen using this processor type is in indirect mode — the same
// rule core/gear-data.js applies when grouping.
function dataPortBucketIsIndirect(procType) {
  return dataPortScreenIds().some(id => {
    const d = screens[id].data;
    return (d.processor || 'Brompton_SX40') === procType && d.mx40ConnectionMode === 'indirect';
  });
}

// Compact "1-6, 9" style summary of a port list.
function formatPortRanges(ports) {
  if(!ports || !ports.length) return 'none';
  const sorted = ports.slice().sort((a, b) => a - b);
  const out = [];
  let start = sorted[0], prev = sorted[0];
  for(let i = 1; i <= sorted.length; i++) {
    if(i < sorted.length && sorted[i] === prev + 1) { prev = sorted[i]; continue; }
    out.push(start === prev ? String(start) : (start + '-' + prev));
    if(i < sorted.length) { start = sorted[i]; prev = sorted[i]; }
  }
  return out.join(', ');
}

// Availability line shown under the Port # field, e.g.
// "XD 1: ports 1-6 used by Screen A. Free: 7-10."
function dataPortHintFor(screenId, topology, current) {
  if(!current || current.proc === null) return '';
  if(topology.usesDistBox && current.box === null) return '';
  try {
    const procType = (screens[screenId] && screens[screenId].data.processor) || 'Brompton_SX40';
    const avail = dataPortUnitAvailability(procType, current.proc, current.box, screenId, []);
    const names = new Set();
    avail.holders.forEach(sid => { if(screens[sid]) names.add(screens[sid].name); });
    const who = names.size ? (' used by ' + [...names].join(', ')) : '';
    return avail.unitLabel + ': ' + avail.used + '/' + avail.capacity + ' ports' + who
         + '. Free: ' + formatPortRanges(avail.freePorts) + '.';
  } catch(err) {
    return '';
  }
}

// Turn the dialog's raw Processor/Box strings into numbers, accepting either a
// letter or a number exactly as the SOCA input does. Blank means "auto", so the
// blank check must come BEFORE parseSocaInput() — it returns null for both blank
// and invalid.
// Returns { proc, box } or { error } .
function resolveDataPortInput(result, topology) {
  let proc = null, box = null;
  if(result.procRaw !== '') {
    proc = parseSocaInput(result.procRaw);
    if(proc === null) return { error: 'Please enter a valid processor (1-99 or A-Z)' };
  }
  if(topology.usesDistBox && result.boxRaw !== '') {
    box = parseSocaInput(result.boxRaw);
    if(box === null) {
      return { error: 'Please enter a valid ' + (topology.distBoxName || 'box') + ' (1-99 or A-Z)' };
    }
  }
  return { proc: proc, box: box };
}

// Reject an assignment that would put a MAIN on a loop-back unit or port.
// Returns a message, or null when the target is a legitimate main slot.
function dataPortLoopbackBlocker(procType, topology, redundant, box, port) {
  if(!redundant) return null;
  const boxName = topology.distBoxName || 'Box';
  const style = topology.boxLabelStyle;

  if(topology.backupMode === 'paired_boxes' && box !== null && box % 2 === 0) {
    return boxName + ' ' + formatUnitLabel(box, style) + ' is the loop-back for '
      + boxName + ' ' + formatUnitLabel(box - 1, style)
      + '.\n\nWith redundancy on, mains go on ' + boxName + ' '
      + formatUnitLabel(1, style) + ' and ' + formatUnitLabel(3, style)
      + ' — their backups land on ' + formatUnitLabel(2, style) + ' and '
      + formatUnitLabel(4, style) + ' automatically.';
  }

  if(topology.backupMode === 'paired_ports' && port !== null && port % 2 === 0) {
    return 'Port ' + port + ' is the loop-back for port ' + (port - 1)
      + '.\n\nWith redundancy on, ports pair up (1-2, 3-4, 5-6...), so mains go on '
      + 'the odd port and the backup follows on the next one.';
  }

  return null;
}

// Returns an explanatory message when an assignment cannot fit the target unit,
// or null when it is fine. panelKeys is the selection being assigned.
function dataPortAssignmentBlocker(screenId, panelKeys, topology, result) {
  if(result.proc === null) return null;
  if(topology.usesDistBox && result.box === null) return null;

  const data = liveScreenData(screenId);
  if(!data) return null;
  const procType = data.processor || 'Brompton_SX40';

  // How many distinct data lines is this selection about to put on the unit?
  const info = screenDataLineDestinations(data);
  const lines = new Set();
  if(result.port !== null) {
    lines.add(result.port);
  } else {
    const built = info.lines;
    built.forEach(l => lines.add(l));
  }

  const redundant = dataPortBucketIsRedundant(procType);
  const loopback = dataPortLoopbackBlocker(procType, topology, redundant, result.box, result.port);
  if(loopback) return loopback;

  const avail = dataPortUnitAvailability(procType, result.proc, result.box, screenId, [...lines]);
  if(lines.size <= avail.freePorts.length) return null;

  const names = new Set();
  avail.holders.forEach(sid => { if(screens[sid]) names.add(screens[sid].name); });
  const who = names.size ? (' by ' + [...names].join(', ')) : '';
  const usedPorts = formatPortRanges([...avail.holders.keys()]);

  return avail.unitLabel + ' has only ' + avail.freePorts.length + ' free port(s) but this assignment needs '
       + lines.size + '.\n\nPorts ' + usedPorts + ' are already in use' + who
       + '.\nFree: ' + formatPortRanges(avail.freePorts) + '.\n\nPick another unit, or free up ports first.';
}

// Cached plan, rebuilt whenever a calculate() cycle invalidates it. buildDataPortPlan()
// walks every screen's serpentine, so the per-line lookups below must not each
// trigger a fresh build.
let _dataPortPlanCache = null;
function invalidateDataPortPlan() { _dataPortPlanCache = null; }
function cachedDataPortPlan() {
  if(!_dataPortPlanCache) _dataPortPlanCache = buildDataPortPlan();
  return _dataPortPlanCache;
}

// Destination split into its parts for tabular display:
// { unit: 'XD1' | 'P2', port: 3 }, or null when unresolved.
function dataLineDestinationParts(screenId, line) {
  try {
    const plan = cachedDataPortPlan();
    const lineMap = plan.perScreen.get(screenId);
    if(!lineMap) return null;
    const dest = lineMap.get(line);
    if(!dest) return null;
    const group = plan.groups.get(dest.procType);
    if(group && group.usesDistBox && dest.box !== null) {
      const label = formatUnitLabel(dest.box, group.boxLabelStyle);
      const main = { unit: shortDistBoxCode(group.distBoxName) + ' ' + label, port: dest.port };
      if(dest.backup) {
        main.backupUnit = shortDistBoxCode(group.distBoxName) + ' ' + formatUnitLabel(dest.backup.box, group.boxLabelStyle);
        main.backupPort = dest.backup.port;
      }
      return main;
    }
    const res = { unit: 'P' + dest.proc, port: dest.port };
    if(dest.backup) { res.backupUnit = 'P' + dest.proc; res.backupPort = dest.backup.port; }
    return res;
  } catch(err) {
    return null;
  }
}

// Column-friendly code for a box name: the leading letters only, so
// "CVT-10 Pro" reads as CVT and "XD" stays XD.
function shortDistBoxCode(name) {
  if(!name) return 'B';
  const letters = String(name).match(/^[A-Za-z]+/);
  return letters ? letters[0].toUpperCase() : 'B';
}

// Short destination for one screen's data line, e.g. "XD1 p3" or "P2 p7".
// Returns '' when the line has no resolvable destination.
function dataLineDestinationLabel(screenId, line) {
  try {
    const plan = cachedDataPortPlan();
    const lineMap = plan.perScreen.get(screenId);
    if(!lineMap) return '';
    const dest = lineMap.get(line);
    if(!dest) return '';
    const group = plan.groups.get(dest.procType);
    if(group && group.usesDistBox && dest.box !== null) {
      const name = (group.distBoxName || 'Box').replace(/[^A-Za-z0-9]/g, '');
      return name + dest.box + ' p' + dest.port;
    }
    return 'P' + dest.proc + ' p' + dest.port;
  } catch(err) {
    return '';
  }
}

// Format a destination for display: "P1·XD2·7", or "P1·7" with no box.
function formatDataPortLabel(dest, distBoxName) {
  if(!dest) return '';
  const box = (dest.box !== null && dest.box !== undefined)
    ? '·' + (distBoxName ? distBoxName.replace(/[^A-Za-z0-9]/g, '') : 'B') + dest.box
    : '';
  return 'P' + dest.proc + box + '·' + dest.port;
}