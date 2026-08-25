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
  if(!inp || typeof buildDataLineGroups !== 'function') return { lines: [], explicit: new Map(), portFixed: new Set() };

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
  // Lines whose number the user typed into Assign Data Port. That number IS the port,
  // so it has to survive allocation even when Processor #/Box # were left on Auto.
  const portFixed = new Set();

  // A line's destination comes from any panel on it that carries one. Later panels
  // win, matching how a line only ever terminates in one place.
  (built.sortedDataLines || []).forEach((ln, gi) => {
    const group = built.groups[gi] || [];
    group.forEach(pt => {
      if(inp.customDataLines.has(pt.c + ',' + pt.r)) portFixed.add(ln + 1);
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

  return { lines: lines, explicit: explicit, portFixed: portFixed,
           processorId: inp.processorId, connectionMode: inp.connectionMode };
}

// Screen ids in tab order (numeric screen_N suffix), the same order renderScreenTabs
// shows and sharedDistroGroupIds() walks.
function dataPortScreenIds() {
  if(typeof screens === 'undefined') return [];
  const all = Object.keys(screens).filter(id => screens[id] && screens[id].data);
  const byTab = all.slice().sort((a, b) =>
    (parseInt(a.split('_')[1]) || 0) - (parseInt(b.split('_')[1]) || 0));

  // Selection order in the combined view wins: the first screen you select gets
  // port 1. combinedSelectedScreens is a Set, so it already iterates in the order
  // screens were added. With nothing selected, fall back to tab order.
  if(typeof combinedSelectedScreens === 'undefined' || combinedSelectedScreens.size === 0) return byTab;
  const selected = [...combinedSelectedScreens].filter(id => screens[id] && screens[id].data);
  if(!selected.length) return byTab;
  const seen = new Set(selected);
  return selected.concat(byTab.filter(id => !seen.has(id)));
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
          portFixed: liveOverride.portFixed || new Set(),
          processorId: data.processor || 'Brompton_SX40', connectionMode: data.mx40ConnectionMode || 'direct' }
      : screenDataLineDestinations(data);
    if(!info.lines.length) return;
    const procType = info.processorId;
    // Bucket by processor type AND connection mode: a screen running direct plugs
    // into the processor's own ports while an indirect one goes through boxes, so
    // they occupy different slot spaces. Grouping them together would let one
    // indirect screen drag every other screen onto distribution boxes.
    const indirect = info.connectionMode === 'indirect';
    const bucketKey = procType + '|' + (indirect ? 'indirect' : 'direct');
    if(!buckets.has(bucketKey)) buckets.set(bucketKey, { procType: procType, indirect: indirect, redundant: false, entries: [] });
    const bucket = buckets.get(bucketKey);
    // Any redundant screen makes the whole bucket redundant, matching the
    // hasAnyRedundancy OR in core/gear-data.js.
    if(data.redundancy) bucket.redundant = true;
    bucket.entries.push({ screenId: id, info: info });
  });

  buckets.forEach((bucket, bucketKey) => {
    const procType = bucket.procType;
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

    // slotKey -> Set of PHYSICAL ports already taken on that unit.
    // An explicitly assigned line keeps its own number as the port: if you patch
    // line 6 to XD A, it lands on XD A port 6. Auto lines fill whatever is left,
    // in packing order — three screens that each call their first line "1" cannot
    // all be port 1, so they take the next free ports instead.
    const occupancy = new Map();
    const slotKey = (proc, box) => proc + '|' + (box === null ? '-' : box);

    function portsOn(proc, box) {
      const k = slotKey(proc, box);
      if(!occupancy.has(k)) occupancy.set(k, new Set());
      return occupancy.get(k);
    }

    // Lowest free physical port on a unit, honouring odd-only when ports pair off.
    function nextFreePortOn(proc, box) {
      const used = portsOn(proc, box);
      for(let ordinal = 1; ordinal <= capacity; ordinal++) {
        const physical = physicalPort(ordinal);
        if(!used.has(physical)) return physical;
      }
      return physicalPort(capacity);
    }

    // --- Pass 1: explicit assignments claim their unit AND their port number ---
    // Only fully-specified destinations claim here; partial ones resolve in pass 2.
    const claimedPorts = new Map(); // "screenId|line" -> { proc, box, port }
    bucket.entries.forEach(entry => {
      entry.info.lines.forEach(line => {
        const dest = entry.info.explicit.get(line);
        if(!dest || dest.proc === null) return;
        if(usesDistBox && dest.box === null) return;
        const box = usesDistBox ? dest.box : null;
        // The line number IS the port number for an explicit assignment.
        const port = line;
        portsOn(dest.proc, box).add(port);
        claimedPorts.set(entry.screenId + '|' + line, { proc: dest.proc, box: box, port: port });
      });
    });

    // --- Pass 1b: a line whose PORT the user typed keeps that number even when
    // Processor #/Box # were left on Auto ---
    // The Assign Data Port dialog defaults both unit fields to Auto, so without this
    // the commonest assignment falls through to pass 2 and is silently renumbered —
    // the wall shows port 4 where the user asked for 9. Only the port is pinned here;
    // the unit still comes from the same proc/box walk pass 2 uses. Runs before pass 2
    // so auto lines route around the reserved port instead of stealing it.

    // First unit that still has room and has not already taken `port`, honouring a
    // half-specified destination (Processor # given, box left on Auto, or vice versa).
    function unitForFixedPort(port, pinProc, pinBox) {
      const boxes = [];
      if(!usesDistBox) boxes.push(null);
      else if(pinBox !== null) boxes.push(pinBox);
      // Step by 2 when boxes pair off, so mains never land on B or D.
      else for(let b = 1; b <= boxesPerProc; b += (pairedBoxes ? 2 : 1)) boxes.push(b);

      const firstProc = pinProc !== null ? pinProc : 1;
      const lastProc = pinProc !== null ? pinProc : 1000;
      for(let proc = firstProc; proc <= lastProc; proc++) {
        for(let i = 0; i < boxes.length; i++) {
          const used = portsOn(proc, boxes[i]);
          if(used.size < capacity && !used.has(port)) return { proc: proc, box: boxes[i] };
        }
      }
      // Everything the user pinned is full: the explicit assignment still wins and
      // overflows, the same rule pass 1 follows for a fully-specified destination.
      return { proc: firstProc, box: boxes[0] };
    }

    bucket.entries.forEach(entry => {
      const portFixed = entry.info.portFixed || new Set();
      entry.info.lines.forEach(line => {
        if(!portFixed.has(line)) return;
        const key = entry.screenId + '|' + line;
        if(claimedPorts.has(key)) return;
        // An even port is a loop-back once ports pair off, and an even box is a
        // loop-back box — leave those to the cursor rather than patching a main onto
        // a backup slot. dataPortLoopbackBlocker() refuses them at assignment time.
        if(pairedPorts && line % 2 === 0) return;
        const dest = entry.info.explicit.get(line);
        const pinProc = (dest && dest.proc !== null) ? dest.proc : null;
        const pinBox = (usesDistBox && dest && dest.box !== null) ? dest.box : null;
        if(pairedBoxes && pinBox !== null && pinBox % 2 === 0) return;
        const slot = unitForFixedPort(line, pinProc, pinBox);
        portsOn(slot.proc, slot.box).add(line);
        claimedPorts.set(key, { proc: slot.proc, box: slot.box, port: line });
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
        if(portsOn(curProc, curBox).size < capacity) {
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
          lineMap.set(line, { procType: procType, groupKey: bucketKey, proc: claimed.proc, box: claimed.box,
                              port: claimed.port, explicit: true,
                              backup: backupDestinationFor(topology, redundant, claimed.box, claimed.port) });
          return;
        }
        const dest = entry.info.explicit.get(line);
        const slot = nextUnitWithRoom();
        const proc = (dest && dest.proc !== null) ? dest.proc : slot.proc;
        const box = usesDistBox ? ((dest && dest.box !== null) ? dest.box : slot.box) : null;
        const port = nextFreePortOn(proc, box);
        portsOn(proc, box).add(port);
        lineMap.set(line, { procType: procType, groupKey: bucketKey, proc: proc, box: box,
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
    occupancy.forEach((usedSet, k) => {
      const used = usedSet.size;
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

    groups.set(bucketKey, {
      procType: procType,
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
  const targetGroupKey = procType + '|' + (dataPortBucketIsIndirect(procType) ? 'indirect' : 'direct');
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
      // Only count lines in the same connection mode — a direct screen's ports are
      // on the processor, not on this box.
      if(dest.groupKey !== targetGroupKey) return;
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

// Group a screen's panels by the unit (distribution box, or the processor when
// there is no box) their data line terminates on. Feeds the diagonal labels on
// the combined data canvas via drawSocaOverlay's labelFor hook.
// Returns { panelToUnit: Map(panelKey -> unitIdx), labels: Map(unitIdx -> string[]) },
// each label being the lines to stack: the processor model, then the box/index.
function buildDataUnitGroups(screenId, groups, sortedDataLines) {
  const panelToUnit = new Map();
  const labels = new Map();
  const indexByText = new Map();
  if(!groups || !sortedDataLines) return { panelToUnit, labels };

  sortedDataLines.forEach((ln, gi) => {
    const parts = dataLineDestinationParts(screenId, ln + 1);
    if(!parts || !parts.unit) return;
    let idx = indexByText.get(parts.unit);
    if(idx === undefined) {
      idx = indexByText.size;
      indexByText.set(parts.unit, idx);
      const code = parts.unitCode || parts.unit;
      labels.set(idx, parts.unitDetail ? [code, parts.unitDetail] : [code]);
    }
    (groups[gi] || []).forEach(pt => panelToUnit.set(pt.c + ',' + pt.r, idx));
  });

  return { panelToUnit, labels };
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
function dataPortHintFor(screenId, topology, current, panelKeys) {
  if(!current || current.proc === null) return '';
  if(topology.usesDistBox && current.box === null) return '';
  try {
    const data = liveScreenData(screenId);
    const procType = (data && data.processor) || 'Brompton_SX40';
    // The selection's own lines are being re-assigned, so they do not count as
    // occupying the unit.
    const own = data ? [...dataLinesForPanels(data, panelKeys)] : [];
    const avail = dataPortUnitAvailability(procType, current.proc, current.box, screenId, own);
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

// The data lines the given panels belong to, on one screen.
function dataLinesForPanels(data, panelKeys) {
  const out = new Set();
  const inp = resolveScreenDataInputs(data);
  if(!inp || typeof buildDataLineGroups !== 'function') return out;
  const built = buildDataLineGroups({
    pw: inp.pw, ph: inp.ph,
    panelsPerDataLine: inp.panelsPerDataLine,
    startDir: inp.startDir,
    deletedPanels: inp.deletedPanels,
    customDataLineAssignments: inp.customDataLines
  });
  const wanted = new Set(panelKeys || []);
  (built.sortedDataLines || []).forEach((ln, gi) => {
    const group = built.groups[gi] || [];
    if(group.some(pt => wanted.has(pt.c + ',' + pt.r))) out.add(ln + 1);
  });
  return out;
}

// Blocks only what the hardware genuinely forbids: a main on a loop-back box or
// port. Running out of ports on a unit is NOT blocked — an explicit assignment is
// authoritative and takes over, the same rule a manually assigned SOCA follows on
// the power side. Over-capacity is reported by buildDataPortPlan() as overflows[].
function dataPortAssignmentBlocker(screenId, panelKeys, topology, result) {
  if(result.proc === null) return null;
  if(topology.usesDistBox && result.box === null) return null;

  const data = liveScreenData(screenId);
  if(!data) return null;
  const procType = data.processor || 'Brompton_SX40';

  const redundant = dataPortBucketIsRedundant(procType);
  return dataPortLoopbackBlocker(procType, topology, redundant, result.box, result.port);
}

// Warns when the typed port number is already held by another data line on the same
// processor. Deliberately NOT a block: an explicit assignment stays authoritative,
// the same rule dataPortAssignmentBlocker() follows for a full unit. Only a typed
// assignment counts as a holder — an auto line yields its number without a fight.
// panelsByScreen = { screenId: [panelKey, ...] }: the lines being re-assigned right
// now, which never count as holders of their own number.
// Returns a message to confirm, or null when the number is free.
function dataPortDuplicateWarning(panelsByScreen, topology, result) {
  if(result.portCleared || result.port === null) return null;
  const screenIds = Object.keys(panelsByScreen || {});
  if(!screenIds.length) return null;

  const seed = liveScreenData(screenIds[0]);
  if(!seed) return null;
  const procType = seed.processor || 'Brompton_SX40';
  const targetGroupKey = procType + '|' + (dataPortBucketIsIndirect(procType) ? 'indirect' : 'direct');

  const own = new Set();
  screenIds.forEach(sid => {
    const d = liveScreenData(sid);
    if(!d) return;
    dataLinesForPanels(d, panelsByScreen[sid]).forEach(line => own.add(sid + '|' + line));
  });

  const unitLabel = (proc, box) => (topology.usesDistBox && box !== null)
    ? ((topology.distBoxName || 'Box') + ' ' + formatUnitLabel(box, topology.boxLabelStyle))
    : ('Processor ' + proc);

  const holders = [];
  try {
    buildDataPortPlan().perScreen.forEach((lineMap, sid) => {
      lineMap.forEach((dest, line) => {
        if(dest.groupKey !== targetGroupKey) return;
        if(dest.port !== result.port) return;
        // An auto line never owns its number — pass 1/1b claim explicit ports first
        // and the cursor routes around them, so only a typed assignment can collide.
        if(!dest.explicit) return;
        if(own.has(sid + '|' + line)) return;
        holders.push({ screenId: sid, line: line, proc: dest.proc, box: dest.box });
      });
    });
  } catch(err) {
    return null;
  }
  if(!holders.length) return null;

  const nameOf = sid => (screens[sid] ? screens[sid].name : sid);
  const who = holders.map(h => nameOf(h.screenId) + ' line ' + h.line
                               + ' on ' + unitLabel(h.proc, h.box)).join(', ');

  // A holder on a screen in the selection is a different outcome: a port number is a
  // line's identity within one screen, so two groups both assigned it merge into a
  // single data line rather than the second one moving to another unit.
  const sameScreen = holders.filter(h => panelsByScreen[h.screenId]);
  if(sameScreen.length) {
    return nameOf(sameScreen[0].screenId) + ' already uses port ' + result.port
      + ' for another data line.\n\nAssigning it here merges the two into one data line '
      + 'rather than creating a second port ' + result.port + '.\n\nAssign it anyway?';
  }

  // Pinning the same unit as a holder double-books one physical port; leaving the
  // unit on Auto just pushes this line onto the next one.
  const samePinnedUnit = result.proc !== null
    && (!topology.usesDistBox || result.box !== null)
    && holders.some(h => h.proc === result.proc && (!topology.usesDistBox || h.box === result.box));

  return 'Port ' + result.port + ' is already assigned to ' + who + '.\n\n'
    + (samePinnedUnit
        ? 'Two data lines cannot share one physical port.'
        : 'This line will keep port ' + result.port + ' and land on the next available unit, which adds one to the gear list.')
    + '\n\nAssign it anyway?';
}

// Explicit floors per processor TYPE, summed across its connection modes. Direct
// and indirect screens are separate signal paths, so their units add rather than
// overlap.
function dataPortGroupTotals(plan, procType) {
  let procCount = 0, boxCount = 0, distBoxName = '';
  plan.groups.forEach(g => {
    if(g.procType !== procType) return;
    procCount += g.procCount;
    boxCount += g.boxCount;
    if(!distBoxName && g.distBoxName) distBoxName = g.distBoxName;
  });
  return { procCount, boxCount, distBoxName };
}

// Map of a screen's true data line numbers to the physical port each one lands on.
// The data layout numbers its lines by port so the label on the wall matches the
// port it patches into, and so the colour ramp is consistent across screens.
function dataPortLineDisplayMap(screenId) {
  const out = new Map();
  try {
    const plan = cachedDataPortPlan();
    const lineMap = plan.perScreen.get(screenId);
    if(!lineMap) return out;
    lineMap.forEach((dest, line) => { if(dest && dest.port) out.set(line, dest.port); });
  } catch(err) { /* fall back to the raw line numbers */ }
  return out;
}

// The number a line is labelled with anywhere in the app: the processor port it
// lands on, falling back to its raw line number when the port plan can't resolve one.
// The data layout, cable diagram and gear list all name a line through this, so a
// line is called the same thing in all three.
function dataLineDisplayNumber(screenId, line) {
  const map = dataPortLineDisplayMap(screenId);
  return map.has(line) ? map.get(line) : line;
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
// unitCode/unitDetail carry the same text pre-split for the two-line canvas label:
// the processor model on top, the box and/or processor index underneath.
function dataLineDestinationParts(screenId, line) {
  try {
    const plan = cachedDataPortPlan();
    const lineMap = plan.perScreen.get(screenId);
    if(!lineMap) return null;
    const dest = lineMap.get(line);
    if(!dest) return null;
    const group = plan.groups.get(dest.groupKey);
    // The processor's model code identifies the unit on the drawing; the index is
    // only meaningful — and only shown — when more than one of that model is in the
    // rig. Totals come from dataPortGroupTotals() so a processor split across direct
    // and indirect screens still counts as one type.
    const code = shortProcessorCode(dest.procType);
    const totalProcs = dataPortGroupTotals(plan, dest.procType).procCount;
    const procIdx = totalProcs > 1 ? String(dest.proc) : '';
    const procTag = procIdx ? (code + ' ' + procIdx) : code;
    // The second line of the canvas label: the processor index and the box, whichever
    // of the two this rig actually needs.
    const detail = (boxTag) => [procIdx, boxTag].filter(Boolean).join(' ');

    if(group && group.usesDistBox && dest.box !== null) {
      const boxCode = shortDistBoxCode(group.distBoxName);
      const boxTag = boxCode + ' ' + formatUnitLabel(dest.box, group.boxLabelStyle);
      const main = { unit: procTag + ' ' + boxTag, port: dest.port,
                     unitCode: code, unitDetail: detail(boxTag) };
      if(dest.backup) {
        const backupBoxTag = boxCode + ' ' + formatUnitLabel(dest.backup.box, group.boxLabelStyle);
        main.backupUnit = procTag + ' ' + backupBoxTag;
        main.backupDetail = detail(backupBoxTag);
        main.backupPort = dest.backup.port;
      }
      return main;
    }
    const res = { unit: procTag, port: dest.port, unitCode: code, unitDetail: procIdx };
    if(dest.backup) { res.backupUnit = procTag; res.backupDetail = procIdx; res.backupPort = dest.backup.port; }
    return res;
  } catch(err) {
    return null;
  }
}

// Short model code for a processor type: the brand and any trailing words dropped,
// so "Brompton SX40" reads as SX40 and "NovaStar MX40 Pro" as MX40. The processor-side
// counterpart of shortDistBoxCode().
function shortProcessorCode(procType) {
  const all = (typeof getAllProcessors === 'function') ? getAllProcessors() : {};
  const pr = all[procType] || {};
  let name = pr.name || String(procType).replace(/_/g, ' ');
  const brand = pr.brand || String(procType).split('_')[0];
  if(brand && name.startsWith(brand + ' ')) name = name.substring(brand.length + 1);
  return name.split(/\s+/)[0] || String(procType);
}

// Column-friendly code for a box name: the leading letters only, so
// "CVT-10 Pro" reads as CVT and "XD" stays XD.
function shortDistBoxCode(name) {
  if(!name) return 'B';
  const letters = String(name).match(/^[A-Za-z]+/);
  return letters ? letters[0].toUpperCase() : 'B';
}

// Every physical unit the project's data lines actually land on, plus which screens
// reach each one. Pure derivation over the cached port plan — nothing is persisted.
//
// Numbering is already global per processor bucket (see buildDataPortPlan), so two
// screens pinned to processor 1 / box 1 resolve to ONE unit here, not two.
//
//   unitId = groupKey + '|' + proc + '|' + (box ?? '-')
//
// Box indices restart per processor, so a box's identity needs its processor too;
// procUnitId links a box back to the processor that feeds it.
function projectDataUnits() {
  const result = { procs: [], boxes: [], byScreen: new Map() };
  let plan;
  try { plan = cachedDataPortPlan(); } catch(err) { return result; }
  if(!plan || !plan.perScreen) return result;

  const procSeen = new Map();
  const boxSeen = new Map();

  plan.perScreen.forEach((lineMap, screenId) => {
    let reach = result.byScreen.get(screenId);
    if(!reach) {
      reach = { procUnitIds: new Set(), boxUnitIds: new Set() };
      result.byScreen.set(screenId, reach);
    }

    lineMap.forEach(dest => {
      const group = plan.groups.get(dest.groupKey);
      if(!group) return;

      // Same tag dataLineDestinationParts() prints, so the cable diagram names a unit
      // exactly as the data layout and the Mains/Backups tables do: the model, with an
      // index only once more than one of that model is in the rig.
      const code = shortProcessorCode(dest.procType);
      const totalProcs = dataPortGroupTotals(plan, dest.procType).procCount;
      const procTag = totalProcs > 1 ? (code + ' ' + dest.proc) : code;

      const procUnitId = dest.groupKey + '|' + dest.proc + '|-';
      if(!procSeen.has(procUnitId)) {
        const entry = { unitId: procUnitId, groupKey: dest.groupKey, procType: dest.procType,
                        proc: dest.proc, label: procTag };
        procSeen.set(procUnitId, entry);
        result.procs.push(entry);
      }
      reach.procUnitIds.add(procUnitId);

      // Backups land on their own box on a paired_boxes processor, so count them too
      const boxes = [];
      if(group.usesDistBox && dest.box !== null && dest.box !== undefined) boxes.push(dest.box);
      if(group.usesDistBox && dest.backup && dest.backup.box !== null && dest.backup.box !== undefined) {
        boxes.push(dest.backup.box);
      }
      boxes.forEach(box => {
        const boxUnitId = dest.groupKey + '|' + dest.proc + '|' + box;
        if(!boxSeen.has(boxUnitId)) {
          const entry = { unitId: boxUnitId, groupKey: dest.groupKey, procType: dest.procType,
                          proc: dest.proc, box: box, procUnitId: procUnitId,
                          label: shortDistBoxCode(group.distBoxName) + ' ' + formatUnitLabel(box, group.boxLabelStyle),
                          // Box indices restart on every processor, so "XD A" alone is
                          // ambiguous once a rig has more than one processor.
                          qualifiedLabel: procTag + ' ' + shortDistBoxCode(group.distBoxName) + ' ' + formatUnitLabel(box, group.boxLabelStyle),
                          // Same thing split for a two-line box label, so the combined
                          // lane can show both without overflowing a narrow box.
                          labelLines: [procTag, shortDistBoxCode(group.distBoxName) + ' ' + formatUnitLabel(box, group.boxLabelStyle)] };
          boxSeen.set(boxUnitId, entry);
          result.boxes.push(entry);
        }
        reach.boxUnitIds.add(boxUnitId);
      });
    });
  });

  // Stable draw order: by processor number, then box ordinal
  result.procs.sort((a, b) => a.proc - b.proc);
  result.boxes.sort((a, b) => (a.proc - b.proc) || (a.box - b.box));
  return result;
}