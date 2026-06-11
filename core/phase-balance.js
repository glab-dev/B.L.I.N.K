// ==================== 3-PHASE LOAD BALANCING ====================
// Computes the actual per-leg (X / Y / Z) amperage for a line-to-line
// (two-leg) circuit distribution, plus a greedy auto-balance recommendation.
//
// Wiring model: each circuit is a 208 V line-to-line load that bridges TWO of
// the three legs. A 6-circuit SOCA rotates its circuits across the three
// leg-pairs (XY / YZ / ZX). Because each leg touches two pairs, per-leg current
// is the PHASOR sum of the branch currents on those pairs — not a plain sum.
//
// Shared by core/calculate.js (totals + PDF data) and layouts/power.js (canvas
// colouring + legend) so the two paths can never drift.

// --- Editable distro wiring constant --------------------------------------
// Maps a circuit's position within its 6-circuit SOCA (0-5) to the leg-pair it
// bridges. Default = standard 3-pair rotation, 2 circuits per pair per SOCA.
// CHANGE HERE if your distro/SOCA is wired with a different rotation.
const SOCA_LEG_PAIRS = ['XY', 'YZ', 'ZX', 'XY', 'YZ', 'ZX'];

// Branch-voltage angles (degrees) for a balanced 3-phase system, resistive PF.
// Branch current is taken in phase with its line-to-line voltage.
const PHASE_LEG_PAIR_ANGLES = { XY: 30, YZ: -90, ZX: 150 };

// Assigns every active panel to a circuit number (0-based), column by column,
// honouring custom per-panel circuit overrides. Extracted verbatim from the
// power-layout renderer (STEP 1-3) so the canvas and the load calc agree.
// Returns { panelToCircuit: Map<"c,r", circuitNum>, circuitCounts: Map<circuitNum, panelCount> }.
function assignCircuits(pw, ph, panelsPerCircuit, deletedPanels, customCircuitAssignments) {
  const orderedPanels = [];
  for (let c = 0; c < pw; c++) {
    for (let r = 0; r < ph; r++) {
      const panelKey = `${c},${r}`;
      if (!deletedPanels.has(panelKey)) {
        orderedPanels.push({
          key: panelKey,
          isCustom: customCircuitAssignments.has(panelKey),
          customCircuit: customCircuitAssignments.has(panelKey) ? customCircuitAssignments.get(panelKey) - 1 : null
        });
      }
    }
  }

  const usedCustomCircuits = new Set();
  orderedPanels.forEach(p => { if (p.isCustom) usedCustomCircuits.add(p.customCircuit); });

  const panelToCircuit = new Map();
  let autoCircuitCounter = 0;
  let panelsInCurrentAutoCircuit = 0;

  orderedPanels.forEach(panel => {
    if (panel.isCustom) {
      panelToCircuit.set(panel.key, panel.customCircuit);
    } else {
      while (usedCustomCircuits.has(autoCircuitCounter)) autoCircuitCounter++;
      panelToCircuit.set(panel.key, autoCircuitCounter);
      panelsInCurrentAutoCircuit++;
      if (panelsInCurrentAutoCircuit >= panelsPerCircuit) {
        autoCircuitCounter++;
        panelsInCurrentAutoCircuit = 0;
        while (usedCustomCircuits.has(autoCircuitCounter)) autoCircuitCounter++;
      }
    }
  });

  const circuitCounts = new Map();
  panelToCircuit.forEach(circuitNum => {
    circuitCounts.set(circuitNum, (circuitCounts.get(circuitNum) || 0) + 1);
  });

  return { panelToCircuit, circuitCounts };
}

// Maps each active panel to its SOCA group index (0-based). Extracted from the
// power-layout renderer (STEP 4): an explicit per-panel SOCA override wins,
// otherwise the circuit's natural group (6 circuits per SOCA).
function assignSocas(panelToCircuit, customSocaAssignments) {
  const panelToSoca = new Map();
  panelToCircuit.forEach((circuitNum, panelKey) => {
    const explicit = customSocaAssignments.get(panelKey);
    const socaIdx = (typeof explicit === 'number' && explicit >= 1) ? (explicit - 1) : Math.floor(circuitNum / 6);
    panelToSoca.set(panelKey, socaIdx);
  });
  return panelToSoca;
}

// Groups circuits by SOCA and computes per-circuit amps (circuit watts / volts).
// Returns a sorted array: [{ socaIdx, circuits: [{ circuit, amps }], totalAmps }].
// Counts panels per (SOCA, circuit) directly from the per-panel maps: circuit
// numbers can repeat across SOCAs (manual assignment numbers circuits within each
// SOCA), so keying on circuit alone would merge those SOCAs and inflate the counts.
// (circuitCounts is accepted for call-site symmetry but intentionally not used.)
function computeSocaBreakdown(circuitCounts, panelToCircuit, panelToSoca, perPanelW, voltage) {
  const Vll = voltage > 0 ? voltage : 208;

  const socaCircuits = new Map(); // socaIdx -> Map(circuit -> panelCount)
  panelToCircuit.forEach((circuitNum, panelKey) => {
    const s = panelToSoca.get(panelKey);
    const socaIdx = (typeof s === 'number') ? s : Math.floor(circuitNum / 6);
    if (!socaCircuits.has(socaIdx)) socaCircuits.set(socaIdx, new Map());
    const cm = socaCircuits.get(socaIdx);
    cm.set(circuitNum, (cm.get(circuitNum) || 0) + 1);
  });

  return [...socaCircuits.keys()].sort((a, b) => a - b).map(socaIdx => {
    const cm = socaCircuits.get(socaIdx);
    const circuits = [...cm.keys()].sort((a, b) => a - b).map(circuit => ({
      circuit,
      amps: (cm.get(circuit) * perPanelW) / Vll
    }));
    return { socaIdx, circuits, totalAmps: circuits.reduce((sum, c) => sum + c.amps, 0) };
  });
}

// "Balanced" re-circuiting (power-layout view only). Panels keep their grid
// position and circuits stay whole (no splitting). It keeps the full SOCAs exactly
// as wired (6 circuits = 2 per leg = already balanced) and only re-assigns the
// circuits in a NON-full SOCA to whichever leg is lightest — i.e. "cut a circuit on
// the heavy leg, use a circuit on the light leg instead." Circuits are numbered
// soca*6 + slot via the distro slot->leg map, so the renderer colours by slot and
// groups by soca. Returns a Map(panelKey -> circuitNumber). `slots` is
// resolveDistroWiring(voltage).slots.
function balanceCircuitsByLeg(pw, ph, maxPerCircuit, deletedPanels, slots) {
  const max = maxPerCircuit > 0 ? maxPerCircuit : 6;
  const out = new Map();
  const wiring = (slots && slots.length === 6) ? slots : ['XY', 'YZ', 'ZX', 'XY', 'YZ', 'ZX'];

  // Base circuits (clean column-major), then group their panels in order.
  const base = (typeof assignCircuits === 'function')
    ? assignCircuits(pw, ph, max, deletedPanels, new Map())
    : { panelToCircuit: new Map() };
  const circuitPanels = new Map(); // circuit -> [panelKey] (column-major order)
  for (let c = 0; c < pw; c++) {
    for (let r = 0; r < ph; r++) {
      const k = `${c},${r}`;
      if (deletedPanels.has(k)) continue;
      const ci = base.panelToCircuit.get(k);
      if (ci === undefined) continue;
      if (!circuitPanels.has(ci)) circuitPanels.set(ci, []);
      circuitPanels.get(ci).push(k);
    }
  }
  const circuits = [...circuitPanels.keys()].sort((a, b) => a - b)
    .map(ci => ({ panels: circuitPanels.get(ci), count: circuitPanels.get(ci).length }));

  // leg token -> its slot indices (e.g. grouped: XY->[0,1]); distinct tokens in order.
  const legSlots = {}; const tokens = [];
  wiring.forEach((t, i) => { if (!legSlots[t]) { legSlots[t] = []; tokens.push(t); } legSlots[t].push(i); });
  const load = {}; tokens.forEach(t => load[t] = 0);

  // Walk SOCAs of 6 circuits. Full SOCA -> slots 0..5 untouched. Partial SOCA ->
  // assign its circuits (biggest first) to the lightest leg that still has an open
  // slot in this SOCA, so the leftover load spreads across the legs.
  for (let s = 0; s * 6 < circuits.length; s++) {
    const socaCircuits = circuits.slice(s * 6, s * 6 + 6);
    if (socaCircuits.length === 6) {
      socaCircuits.forEach((circ, slot) => {
        circ.panels.forEach(k => out.set(k, s * 6 + slot));
        load[wiring[slot]] += circ.count;
      });
    } else {
      // First decide WHICH slots to use to spread the load (greedy: heaviest circuit
      // onto the lightest leg with an open slot)...
      const usedPerLeg = {}; tokens.forEach(t => usedPerLeg[t] = 0);
      const tmpLoad = {}; tokens.forEach(t => tmpLoad[t] = load[t]);
      const chosenSlots = [];
      [...socaCircuits].sort((a, b) => b.count - a.count).forEach(circ => {
        let L = null;
        tokens.forEach(t => {
          if (usedPerLeg[t] < legSlots[t].length && (L === null || tmpLoad[t] < tmpLoad[L])) L = t;
        });
        if (L === null) L = tokens[0];
        chosenSlots.push(legSlots[L][usedPerLeg[L]++]);
        tmpLoad[L] += circ.count;
      });
      // ...then lay those slots out in ascending order across the columns so the
      // resistor colours still go up left-to-right.
      chosenSlots.sort((a, b) => a - b);
      socaCircuits.forEach((circ, i) => {
        const slot = chosenSlots[i];
        circ.panels.forEach(k => out.set(k, s * 6 + slot));
        load[wiring[slot]] += circ.count;
      });
    }
  }
  return out;
}

// Per-leg line-current magnitudes from the watts on each leg-pair (delta load).
// P = { XY, YZ, ZX } watts. Returns { X, Y, Z } amps.
function legAmpsFromPairWatts(P, Vll) {
  const toRad = d => d * Math.PI / 180;
  const branch = {};
  ['XY', 'YZ', 'ZX'].forEach(k => {
    const mag = (P[k] || 0) / Vll;            // branch current magnitude
    const a = toRad(PHASE_LEG_PAIR_ANGLES[k]);
    branch[k] = { re: mag * Math.cos(a), im: mag * Math.sin(a) };
  });
  const sub = (a, b) => ({ re: a.re - b.re, im: a.im - b.im });
  const mag = z => Math.sqrt(z.re * z.re + z.im * z.im);
  // Kirchhoff at each delta node.
  return {
    X: mag(sub(branch.XY, branch.ZX)),
    Y: mag(sub(branch.YZ, branch.XY)),
    Z: mag(sub(branch.ZX, branch.YZ))
  };
}

// Main entry. circuitCounts: Map<circuitNum, panelCount>; perPanelW: watts per
// panel; voltage: circuit volts; mode: 'aswired' | 'balanced'; wiring:
// { type:'single'|'pair', slots:[6 tokens] } (defaults to the two-leg SOCA
// rotation). 'single' = 120 V line-to-neutral (each circuit on one leg, per-leg
// amps are a plain sum); 'pair' = 208 V line-to-line (two legs, phasor sum).
// Returns per-leg amps, imbalance %, per-circuit token, and a re-patch
// recommendation (how to reach the greedy-balanced wiring from as-wired).
function computePhaseBalance(circuitCounts, perPanelW, voltage, mode, wiring) {
  const Vll = voltage > 0 ? voltage : 208;
  const w = (wiring && Array.isArray(wiring.slots) && wiring.slots.length)
    ? wiring : { type: 'pair', slots: SOCA_LEG_PAIRS };
  const isSingle = w.type === 'single';
  const groups = isSingle ? ['X', 'Y', 'Z'] : ['XY', 'YZ', 'ZX'];
  const slots = w.slots;

  const circuits = [...circuitCounts.keys()].sort((a, b) => a - b)
    .map(num => ({ num, watts: circuitCounts.get(num) * perPanelW }));

  // As-wired: token follows the distro rotation by circuit position.
  const aswired = new Map();
  circuits.forEach(c => { aswired.set(c.num, slots[c.num % slots.length]); });

  // Balanced: greedy — heaviest circuit first onto the lightest group.
  const balanced = new Map();
  const greedyWatts = {};
  groups.forEach(g => { greedyWatts[g] = 0; });
  [...circuits].sort((a, b) => b.watts - a.watts).forEach(c => {
    let lightest = groups[0];
    groups.forEach(g => { if (greedyWatts[g] < greedyWatts[lightest]) lightest = g; });
    balanced.set(c.num, lightest);
    greedyWatts[lightest] += c.watts;
  });

  const normMode = (mode === 'balanced') ? 'balanced' : 'aswired';
  const active = (normMode === 'balanced') ? balanced : aswired;

  const imbalanceOf = (assignment) => {
    let legs;
    if (isSingle) {
      // Line-to-neutral: each circuit's full load sits on its one leg.
      const lw = { X: 0, Y: 0, Z: 0 };
      circuits.forEach(c => { const g = assignment.get(c.num); if (lw[g] !== undefined) lw[g] += c.watts; });
      legs = { X: lw.X / Vll, Y: lw.Y / Vll, Z: lw.Z / Vll };
    } else {
      // Line-to-line: phasor sum of the branch currents on each leg.
      const pw = { XY: 0, YZ: 0, ZX: 0 };
      circuits.forEach(c => { const g = assignment.get(c.num); if (pw[g] !== undefined) pw[g] += c.watts; });
      legs = legAmpsFromPairWatts(pw, Vll);
    }
    const arr = [legs.X, legs.Y, legs.Z];
    const peak = Math.max(...arr), min = Math.min(...arr);
    return { legAmps: legs, peakLeg: peak, imbalancePct: peak > 0 ? ((peak - min) / peak) * 100 : 0 };
  };

  const activeStats = imbalanceOf(active);
  const balancedStats = imbalanceOf(balanced);

  // Recommendation: circuits whose leg-pair would change going as-wired -> balanced.
  const recommendation = [];
  if (normMode !== 'balanced') {
    circuits.forEach(c => {
      const from = aswired.get(c.num), to = balanced.get(c.num);
      if (from !== to) recommendation.push({ circuit: c.num, fromPair: from, toPair: to });
    });
  }

  const perCircuit = circuits.map(c => ({
    circuit: c.num,
    pair: active.get(c.num),
    amps: c.watts / Vll
  }));

  return {
    mode: normMode,
    voltage: Vll,
    wiringType: w.type,
    legAmps: activeStats.legAmps,
    peakLeg: activeStats.peakLeg,
    imbalancePct: activeStats.imbalancePct,
    balancedImbalancePct: balancedStats.imbalancePct,
    perCircuit,
    recommendation
  };
}
