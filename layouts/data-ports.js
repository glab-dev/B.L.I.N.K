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
    const data = screens[id].data;
    const info = (liveOverride && liveOverride.screenId === id)
      ? { lines: liveOverride.lines || [], explicit: liveOverride.explicit || new Map(),
          processorId: data.processor || 'Brompton_SX40', connectionMode: data.mx40ConnectionMode || 'direct' }
      : screenDataLineDestinations(data);
    if(!info.lines.length) return;
    const procType = info.processorId;
    if(!buckets.has(procType)) buckets.set(procType, { indirect: false, entries: [] });
    const bucket = buckets.get(procType);
    if(info.connectionMode === 'indirect') bucket.indirect = true;
    bucket.entries.push({ screenId: id, info: info });
  });

  buckets.forEach((bucket, procType) => {
    const topology = resolveProcessorTopology(procType, bucket.indirect ? 'indirect' : 'direct');
    const usesDistBox = topology.usesDistBox;
    const capacity = Math.max(1, usesDistBox ? topology.distBoxPorts : topology.portsPerProcessor);
    const boxesPerProc = Math.max(1, usesDistBox ? topology.boxesPerProcessor : 1);

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
      return used + 1; // physical port on this unit
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
        curBox++;
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
                              port: claimed.port, explicit: true });
          return;
        }
        const dest = entry.info.explicit.get(line);
        const slot = nextUnitWithRoom();
        const proc = (dest && dest.proc !== null) ? dest.proc : slot.proc;
        const box = usesDistBox ? ((dest && dest.box !== null) ? dest.box : slot.box) : null;
        lineMap.set(line, { procType: procType, proc: proc, box: box,
                            port: place(proc, box, entry.screenId, line), explicit: false });
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
        if(box > (maxBoxPerProc.get(proc) || 0)) maxBoxPerProc.set(proc, box);
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
      usesDistBox: usesDistBox
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
  const capacity = Math.max(1, usesDistBox ? topology.distBoxPorts : topology.portsPerProcessor);

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
  for(let p = 1; p <= capacity; p++) {
    if(!holders.has(p)) freePorts.push(p);
  }

  return {
    capacity: capacity,
    used: used,
    freePorts: freePorts,
    holders: holders,
    unitLabel: usesDistBox ? ((topology.distBoxName || 'Box') + ' ' + box) : ('Processor ' + proc)
  };
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

// Format a destination for display: "P1·XD2·7", or "P1·7" with no box.
function formatDataPortLabel(dest, distBoxName) {
  if(!dest) return '';
  const box = (dest.box !== null && dest.box !== undefined)
    ? '·' + (distBoxName ? distBoxName.replace(/[^A-Za-z0-9]/g, '') : 'B') + dest.box
    : '';
  return 'P' + dest.proc + box + '·' + dest.port;
}