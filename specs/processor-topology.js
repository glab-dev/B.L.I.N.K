// ==================== PROCESSOR TOPOLOGY ====================
// Single source of truth for how a processor's data ports are laid out: how many
// ports it has, whether those ports live on a distribution box (Brompton XD,
// NovaStar CVT-10 Pro, or a custom box), and how many processors/boxes a given
// port count needs.
//
// Replaces the distribution-box if/else chains previously duplicated in
// core/calculate.js and core/gear-data.js.
// Depends on: getAllProcessors() (specs/custom-processors.js)

// Resolve one processor id + connection mode into its port topology.
// connectionMode: 'direct' | 'indirect' — only meaningful when supportsDirect
// AND usesDistBox are both true (NovaStar MX40 Pro, custom dual-mode processors).
function resolveProcessorTopology(processorId, connectionMode) {
  const all = (typeof getAllProcessors === 'function') ? getAllProcessors() : (typeof processors !== 'undefined' ? processors : {});
  const pr = all[processorId] || {};

  const supportsDirect = pr.supports_direct !== false;
  const canUseBox = !!pr.uses_distribution_box;
  // A dual-mode processor only routes through its box in indirect mode. A processor
  // that has no direct mode always uses its box.
  const usesDistBox = canUseBox && (!supportsDirect || connectionMode !== 'direct');

  const portsPerProcessor = pr.output_ports || 8;
  const distBoxPorts = pr.distribution_box_ports || 10;
  // Custom processors have no boxes_per_processor field; the previous gear-list code
  // used their output_ports for this, so keep that as the fallback.
  const boxesPerProcessor = pr.boxes_per_processor || pr.output_ports || 4;

  return {
    id: processorId,
    name: pr.name || processorId,
    isCustom: !!pr.custom,
    isKnown: !!all[processorId],
    supportsDirect: supportsDirect,
    canUseDistBox: canUseBox,
    usesDistBox: usesDistBox,
    distBoxName: usesDistBox ? (pr.distribution_box_name || '') : '',
    distBoxPorts: distBoxPorts,
    boxesPerProcessor: boxesPerProcessor,
    portsPerProcessor: portsPerProcessor,
    processorsFrom: pr.processors_from || 'ports',
    pixelsPerProcessor: pr.total_pixels || 0,
    pixelLimited: !!pr.pixel_limited,
    // SX40 doubles its XD count for redundancy; every other processor doubles the
    // port count first and derives boxes from that. The two round differently
    // (2*ceil(p/10) vs ceil(2p/10)), so the distinction is preserved deliberately.
    redundancyDoubles: pr.redundancy_doubles || 'ports',
    // How backup lines pair up, derived from the same fact redundancyDoubles
    // encodes so there is one source of truth:
    //   'paired_boxes' — whole boxes pair (SX40: XD A backs up to B, C to D), so
    //                    mains only ever sit on odd box indices.
    //   'paired_ports' — ports pair within a unit (S8: 1-2, 3-4, 5-6, 7-8), so a
    //                    main on an odd port backs up to the port after it.
    // CVT boxes are assumed to follow 'paired_ports' pending hardware confirmation.
    backupMode: (pr.redundancy_doubles === 'boxes') ? 'paired_boxes' : 'paired_ports',
    // Distribution boxes may be lettered on the hardware (XD A-D) or numbered.
    boxLabelStyle: pr.box_label_style || 'number',
    // Unknown/custom processors fall back to one processor per screen when no ports
    // are needed; built-ins report zero.
    zeroPortsMeansZero: !!all[processorId] && !pr.custom
  };
}

// Main ports usable on one unit. With redundancy on a 'paired_ports' processor
// half the ports are loop-backs, so only every other one can take a main.
function mainPortsPerUnit(topology, hasRedundancy) {
  const capacity = Math.max(1, topology.usesDistBox ? topology.distBoxPorts : topology.portsPerProcessor);
  if(hasRedundancy && topology.backupMode === 'paired_ports') return Math.max(1, Math.floor(capacity / 2));
  return capacity;
}

// Boxes on one processor that can carry mains. With redundancy on a
// 'paired_boxes' processor, half of them are loop-backs (B and D of A-D).
function mainBoxesPerProcessor(topology, hasRedundancy) {
  const boxes = Math.max(1, topology.boxesPerProcessor);
  if(hasRedundancy && topology.backupMode === 'paired_boxes') return Math.max(1, Math.floor(boxes / 2));
  return boxes;
}

// The unit a main's loop-back lands on: the next box for 'paired_boxes', the next
// port on the same unit for 'paired_ports'. Returns null when redundancy is off.
function backupDestinationFor(topology, hasRedundancy, box, port) {
  if(!hasRedundancy) return null;
  if(topology.backupMode === 'paired_boxes') {
    return { box: (box === null || box === undefined) ? null : box + 1, port: port };
  }
  return { box: (box === null || box === undefined) ? null : box, port: port + 1 };
}

// How many processors and distribution boxes a given main-port count needs.
// mainPorts is the MAIN data line count only — redundancy doubling is applied here
// exactly as the previous per-processor branches did, and processorRedundancy
// doubles the processor count last.
function computeProcessorAndBoxCounts(o) {
  const t = o.topology;
  const mainPorts = o.mainPorts || 0;
  const totalPixels = o.totalPixels || 0;
  const hasRedundancy = !!o.hasRedundancy;
  const screenCount = o.screenCount || 0;
  // Highest unit index the user assigned by hand, from buildDataPortPlan(). These
  // are MAIN-line figures and act as a floor before any redundancy doubling, so a
  // manual "XD box 3" guarantees at least three XDs. Explicit wins, exactly as a
  // manually assigned SOCA does on the power side.
  const explicitBoxes = o.explicitBoxes || 0;
  const explicitProcs = o.explicitProcs || 0;

  let processorCount = 0;
  let distBoxCount = 0;

  const byPixels = (t.pixelLimited && t.pixelsPerProcessor > 0 && totalPixels > 0)
    ? Math.ceil(totalPixels / t.pixelsPerProcessor) : 0;

  if(t.usesDistBox) {
    if(t.redundancyDoubles === 'boxes') {
      // Boxes are sized from the main lines, then duplicated for backup.
      let mainBoxes = mainPorts > 0 ? Math.ceil(mainPorts / t.distBoxPorts) : 0;
      if(explicitBoxes > mainBoxes) mainBoxes = explicitBoxes;
      distBoxCount = hasRedundancy ? mainBoxes * 2 : mainBoxes;
    } else {
      // Backup shares this processor's box budget rather than duplicating boxes, so
      // the manual floor applies to the MAIN box count and never gets doubled.
      const totalPorts = hasRedundancy ? mainPorts * 2 : mainPorts;
      distBoxCount = totalPorts > 0 ? Math.ceil(totalPorts / t.distBoxPorts) : 0;
      if(explicitBoxes > distBoxCount) distBoxCount = explicitBoxes;
    }

    const totalPorts = hasRedundancy ? mainPorts * 2 : mainPorts;
    if(t.processorsFrom === 'boxes') {
      processorCount = distBoxCount > 0 ? Math.ceil(distBoxCount / t.boxesPerProcessor) : 0;
    } else {
      processorCount = totalPorts > 0
        ? Math.ceil(totalPorts / t.portsPerProcessor)
        : (t.zeroPortsMeansZero ? 0 : screenCount);
    }
    if(byPixels > 0) processorCount = Math.max(byPixels, processorCount);
  } else {
    const totalPorts = hasRedundancy ? mainPorts * 2 : mainPorts;
    processorCount = totalPorts > 0
      ? Math.ceil(totalPorts / t.portsPerProcessor)
      : (t.zeroPortsMeansZero ? 0 : screenCount);
    if(byPixels > 0) processorCount = Math.max(byPixels, processorCount);
  }

  if(explicitProcs > processorCount) processorCount = explicitProcs;

  return {
    processorCount: processorCount,
    distBoxCount: distBoxCount,
    // No boxes means no box name — callers test the name to decide whether to
    // show a "Distribution box:" row at all.
    distBoxName: distBoxCount > 0 ? t.distBoxName : ''
  };
}