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
    // Unknown/custom processors fall back to one processor per screen when no ports
    // are needed; built-ins report zero.
    zeroPortsMeansZero: !!all[processorId] && !pr.custom
  };
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

  let processorCount = 0;
  let distBoxCount = 0;

  const byPixels = (t.pixelLimited && t.pixelsPerProcessor > 0 && totalPixels > 0)
    ? Math.ceil(totalPixels / t.pixelsPerProcessor) : 0;

  if(t.usesDistBox) {
    if(t.redundancyDoubles === 'boxes') {
      // Boxes are sized from the main lines, then duplicated for backup.
      const mainBoxes = mainPorts > 0 ? Math.ceil(mainPorts / t.distBoxPorts) : 0;
      distBoxCount = hasRedundancy ? mainBoxes * 2 : mainBoxes;
    } else {
      const totalPorts = hasRedundancy ? mainPorts * 2 : mainPorts;
      distBoxCount = totalPorts > 0 ? Math.ceil(totalPorts / t.distBoxPorts) : 0;
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

  return {
    processorCount: processorCount,
    distBoxCount: distBoxCount,
    // No boxes means no box name — callers test the name to decide whether to
    // show a "Distribution box:" row at all.
    distBoxName: distBoxCount > 0 ? t.distBoxName : ''
  };
}