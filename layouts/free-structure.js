// ==================== FREE-DRAW STRUCTURE ====================
// Bumpers for drawn (free) screens, worked out from the drawn panels. A hung wall takes
// bumpers on top of every panel with nothing above it; a ground-stacked wall under every
// panel with nothing below it. Side-by-side edge panels are paired from the left as grid
// columns are: a 2W carries two panels and a 1W the odd one left over. A bumper picks up
// its own weight plus the panels hanging from it (or stacked on it): every panel whose
// middle sits over it, nearest bumper first.

let freeStructureState = null;     // last calculateFreeStructure() result, read by the canvas
let freeStructureView = null;      // {cellPx, top, bumperH, fourWayH, fourWayGap} of the last Structure layout drawn

const FREE_BUMPER_COLORS = { '1w': '#2196F3', '2w': '#4CAF50', '4w': '#FF6B35' };

// A bumper's colour as the grid structure layout draws it: bottom 2Ws are orange
function freeBumperColor(type, position) {
  return type === '2w' && position === 'bottom' ? '#FF9800' : FREE_BUMPER_COLORS[type];
}

// The panels a bumper can sit on: those with nothing beyond them on `position` in their
// columns (the first live panel down a grid column, past any knocked-out ones), by the row
// that edge sits on (gy -> [{gx, cw, type}] left to right)
function freeEdgeLevels(data, allPanels, position) {
  const cellMm = data.freeCell_mm;
  const levels = new Map();
  const spans = data.freePanels.map(fp => Object.assign({gx: fp.gx, gy: fp.gy}, freeCells(allPanels[fp.type], cellMm)));
  data.freePanels.forEach(fp => {
    const {cw, ch} = freeCells(allPanels[fp.type], cellMm);
    const beyond = spans.some(o => o.gx < fp.gx + cw && fp.gx < o.gx + o.cw && (position === 'top' ? o.gy + o.ch <= fp.gy : o.gy >= fp.gy + ch));
    if(beyond) return;
    const gy = position === 'top' ? fp.gy : fp.gy + ch;
    if(!levels.has(gy)) levels.set(gy, []);
    levels.get(gy).push({gx: fp.gx, cw, type: fp.type});
  });
  levels.forEach(edge => edge.sort((a, b) => a.gx - b.gx));
  return levels;
}

// A drawn wall's edge panels left to right, whatever row each edge sits on: one per column,
// as a grid wall has one column top (or bottom) per column. [{gx, cw, type, gy}]
function freeEdgePanels(data, allPanels, position) {
  const edge = [];
  freeEdgeLevels(data, allPanels, position).forEach((list, gy) => list.forEach(p => edge.push(Object.assign({gy}, p))));
  return edge.sort((a, b) => a.gx - b.gx);
}

// The row a 2W on two edge panels sits on: the deeper of their two tops, as a grid wall's
// 2W drops to the deeper of its two columns, or the lower of their two bottoms
function freePairLevel(a, b) {
  return Math.max(a.gy, b.gy);
}

// Bumpers along one edge of a drawn wall: [{type, gx, cw, gy, panelType, firstCw}], gx/cw
// in cells, gy the row the panels it carries start (top) or end (bottom) on, and firstCw
// the width of its first panel (where a ground stack's ladder goes)
function freeBumpers(data, allPanels, position) {
  // Each run of edge panels side by side is paired from its left end, as grid columns are
  // across the whole wall: two panels to a 2W, even where a notch puts them on two rows
  const edge = freeEdgePanels(data, allPanels, position);
  const bumpers = [];
  for(let i = 0; i < edge.length; i++) {
    const run = [edge[i]];
    while(i + 1 < edge.length && edge[i + 1].gx === run[run.length - 1].gx + run[run.length - 1].cw) run.push(edge[++i]);
    for(let j = 0; j < run.length; j += 2) {
      const pair = run[j + 1];
      bumpers.push({type: pair ? '2w' : '1w', gx: run[j].gx, cw: run[j].cw + (pair ? pair.cw : 0),
        gy: pair ? freePairLevel(run[j], pair) : run[j].gy, panelType: run[j].type, firstCw: run[j].cw});
    }
  }
  return bumpers.sort((a, b) => a.gx - b.gx || a.gy - b.gy);
}

// Hand-edited bumpers from a file: 1W / 2W on whole cells, 4W from one 2W's centre to
// another's (so on half cells), each with its own id
function sanitizeFreeBumpers(list, allPanels) {
  if(!Array.isArray(list)) return null;
  const n = v => Number.isInteger(v) && v >= 0;
  const half = v => Number.isInteger(v * 2) && v >= 0;
  const fourWay = list.filter(b => b && n(b.id) && b.type === '4w' && half(b.gx) && n(b.gy) &&
      half(b.cw) && b.cw > 0 && allPanels[b.panelType])
    .map(b => ({id: b.id, type: b.type, gx: b.gx, cw: b.cw, gy: b.gy, panelType: b.panelType}));
  return list.filter(b => b && n(b.id) && (b.type === '1w' || b.type === '2w') && n(b.gx) && n(b.gy) &&
      n(b.cw) && b.cw > 0 && n(b.firstCw) && b.firstCw > 0 && allPanels[b.panelType])
    .map(b => ({id: b.id, type: b.type, gx: b.gx, cw: b.cw, gy: b.gy, panelType: b.panelType, firstCw: b.firstCw, ladderRight: b.ladderRight === true}))
    .concat(fourWay);
}

// Floor frames for a floor-standing drawn wall of floor panels, laid as calculateFloorFrames()
// (layouts/structure.js) lays them on a grid wall: on the lattice of the wall's main panel,
// so every panel must be that panel on it. {frames: [{type, name, gx, gy, cw, ch}] in cells,
// counts, totalWeightLbs, totalWeightKg}, or null when the wall takes none.
function freeFloorFrames(data, allPanels, structureType) {
  const main = allPanels[data.panelType];
  if(structureType !== 'floor' || !main || !main.is_floor_panel || !main.floor_frames || !data.freePanels.length) return null;
  const {cw, ch} = freeCells(main, data.freeCell_mm);
  if(!data.freePanels.every(fp => fp.type === data.panelType && fp.gx % cw === 0 && fp.gy % ch === 0)) return null;
  const b = freeBounds(data.freePanels, allPanels, data.freeCell_mm);
  const pw = b.maxX / cw, ph = b.maxY / ch;
  const live = new Set(data.freePanels.map(fp => `${fp.gx / cw},${fp.gy / ch}`));
  const missing = new Set();
  for(let c = 0; c < pw; c++) for(let r = 0; r < ph; r++) if(!live.has(`${c},${r}`)) missing.add(`${c},${r}`);
  const frames = calculateFloorFrames(pw, ph, missing);
  const counts = getFloorFrameCounts(frames);
  const totalWeightLbs = Object.keys(counts).reduce((sum, t) => sum + (main.floor_frames[t] ? counts[t] * main.floor_frames[t].weight_lbs : 0), 0);
  return {
    frames: frames.map(f => ({type: f.type, name: f.name, gx: f.col * cw, gy: f.row * ch, cw: f.width * cw, ch: f.height * ch})),
    counts, totalWeightLbs, totalWeightKg: totalWeightLbs / KG_TO_LBS
  };
}

// The edge a drawn wall's bumpers go on: the top when it hangs, the bottom when it is
// ground stacked, none on the floor or with bumpers off
function freeBumperPosition(structureType, useBumpers) {
  if(!useBumpers) return null;
  return structureType === 'hanging' ? 'top' : (structureType === 'ground' ? 'bottom' : null);
}

// Bumpers for the current free screen, from the live structure settings
function calculateFreeStructure(data, allPanels) {
  const structureType = document.getElementById('structureType').value;
  const position = freeBumperPosition(structureType, showTopBumper || showBottomBumper);
  freeStructureState = freeStructurePlan(data, allPanels, position, use4WayBumpersEnabled);
  freeStructureState.floorFrames = freeFloorFrames(data, allPanels, structureType);
  // In manual mode the wall's bumpers are its own to edit (interact/free-bumpers.js): the
  // ones drawn on this edge are copied the first time
  if(manualBumperMode && position && !(Array.isArray(data.freeBumpers) && data.freeBumpersPosition === position)) {
    data.freeBumpers = freeStructureState.bumpers.slice()
      .sort((a, b) => a.gy - b.gy || a.gx - b.gx)
      .map((b, i) => b.type === '4w'
        ? {id: i + 1, type: b.type, gx: b.gx, cw: b.cw, gy: b.gy, panelType: b.panelType}
        : {id: i + 1, type: b.type, gx: b.gx, cw: b.cw, gy: b.gy, panelType: b.panelType, firstCw: b.firstCw});
    data.freeBumpersPosition = position;
    freeStructureState = Object.assign(freeStructurePlan(data, allPanels, position, use4WayBumpersEnabled), {floorFrames: freeStructureState.floorFrames});
  }
  return freeStructureState;
}

// Bumpers (each pickup labelled "2W #1" and so on), their pickup weights, the column-height
// warnings and, on a ground-stacked wall, the ground support for a drawn wall with its
// bumpers on `position`. use4Way adds the 4-way layer on panels that take it.
function freeStructurePlan(data, allPanels, position, use4Way) {
  if(!data.freePanels.length) return {position: null, bumpers: [], counts: {'1w': 0, '2w': 0, '4w': 0}, bumperWeightKg: 0, warnings: [], groundSupport: null, ladders: [], plates: null};

  const cellMm = data.freeCell_mm;
  const mainType = allPanels[data.panelType] ? data.panelType : data.freePanels[0].type;
  const main = allPanels[mainType];
  const isCB5 = mainType === 'CB5_MKII' || mainType === 'CB5_MKII_HALF';
  // Bumpers edited by hand (interact/free-bumpers.js) stand in for the automatic ones on
  // the edge they were edited on
  const custom = position && Array.isArray(data.freeBumpers) && data.freeBumpersPosition === position;
  const bumpers = !position ? [] : custom
    ? data.freeBumpers.filter(b => b.type !== '4w').map(b => ({id: b.id, type: b.type, gx: b.gx, cw: b.cw, gy: b.gy, panelType: b.panelType, firstCw: b.firstCw, ladderRight: !!b.ladderRight}))
    : freeBumpers(data, allPanels, position);
  bumpers.forEach(b => {
    b.ownKg = (allPanels[b.panelType]['bumper_' + b.type + '_lbs'] || 0) * LBS_TO_KG;
    b.loadKg = b.ownKg;
  });

  // Each panel loads the nearest bumper level over its middle, shared by overlap width
  data.freePanels.forEach(fp => {
    const p = allPanels[fp.type];
    const {cw, ch} = freeCells(p, cellMm);
    const mid = fp.gx + cw / 2;
    const side = bumpers.filter(b => position === 'top' ? b.gy <= fp.gy : b.gy >= fp.gy + ch);
    const over = b => b.gx < mid + cw / 2 && mid - cw / 2 < b.gx + b.cw;
    let reach = side.filter(over);
    // A panel above the 2W of its column (dropped to the deeper column it pairs with) is
    // carried by that 2W
    if(!reach.length) reach = bumpers.filter(over).slice(0, 1);
    // A panel with no bumper over it (one taken off by hand) hangs off the nearest one, as
    // a grid column left without a bumper does
    if(!reach.length && side.length) {
      const dist = b => Math.abs(b.gx + b.cw / 2 - mid);
      const near = Math.min(...side.map(dist));
      reach = side.filter(b => dist(b) === near).slice(0, 1);
    }
    if(!reach.length) return;
    const nearest = position === 'top' ? Math.max(...reach.map(b => b.gy)) : Math.min(...reach.map(b => b.gy));
    const level = reach.filter(b => b.gy === nearest);
    const overlap = b => Math.min(b.gx + b.cw, fp.gx + cw) - Math.max(b.gx, fp.gx);
    const total = level.reduce((s, b) => s + Math.max(0, overlap(b)), 0);
    const kg = getPanelWeight(fp.type, shouldUseConnectingPlates(fp.type));
    level.forEach(b => { b.loadKg += total > 0 ? kg * Math.max(0, overlap(b)) / total : kg / level.length; });
  });

  // 4-way bumpers (CB5, or custom panels that take them) join each two touching 2Ws of a
  // hung wall, paired from the left as grid columns are, centre to centre, over the higher
  // of the two when a notch drops one. The 4W is then the pickup: it carries both 2Ws with
  // their panels, and the 2Ws are no longer pickups. A ground-stacked wall takes none.
  // Hand-placed 4Ws carry the 2Ws whose middles they span, as a grid 4W carries the 2Ws
  // within its columns.
  const joined = bumpers.slice();
  const takes4w = position === 'top' && (isCB5 || (main.custom && main.supports_4w_bumpers));
  if(custom && takes4w) {
    data.freeBumpers.filter(f => f.type === '4w').forEach(f => {
      const under = joined.filter(b => b.type === '2w' && !b.under4w &&
        b.gx + b.cw / 2 >= f.gx - 0.001 && b.gx + b.cw / 2 <= f.gx + f.cw + 0.001);
      const ownKg = (allPanels[f.panelType].bumper_4w_lbs || 0) * LBS_TO_KG;
      bumpers.push({id: f.id, type: '4w', gx: f.gx, cw: f.cw, gy: f.gy, panelType: f.panelType, ownKg,
        loadKg: ownKg + under.reduce((s, b) => s + b.loadKg, 0)});
      under.forEach(b => { b.under4w = true; });
    });
  } else if(!custom && use4Way && takes4w) {
    const twos = joined.filter(b => b.type === '2w').sort((a, b) => a.gx - b.gx);
    for(let i = 0; i + 1 < twos.length; i++) {
      const a = twos[i], b = twos[i + 1];
      if(a.gx + a.cw !== b.gx) continue;
      const ownKg = (allPanels[a.panelType].bumper_4w_lbs || 0) * LBS_TO_KG;
      bumpers.push({type: '4w', gx: a.gx + a.cw / 2, cw: (b.gx + b.cw / 2) - (a.gx + a.cw / 2), gy: Math.min(a.gy, b.gy),
        panelType: a.panelType, ownKg, loadKg: ownKg + a.loadKg + b.loadKg});
      a.under4w = b.under4w = true;
      i++;
    }
  }

  // Listed 4W, 2W, 1W and left to right within each, as the grid Pickup Weights box lists
  // them; only pickups are numbered, every bumper is counted for the gear list
  const order = {'4w': 0, '2w': 1, '1w': 2};
  bumpers.sort((a, b) => order[a.type] - order[b.type] || a.gx - b.gx || a.gy - b.gy);
  const counts = {'1w': 0, '2w': 0, '4w': 0}, numbered = {'1w': 0, '2w': 0, '4w': 0};
  let bumperWeightKg = 0;
  bumpers.forEach(b => {
    counts[b.type]++;
    bumperWeightKg += b.ownKg;
    if(!b.under4w) b.label = `${b.type.toUpperCase()} #${++numbered[b.type]}`;
  });

  const occ = freeOccupancy(data.freePanels, allPanels, cellMm);
  // The row a column's own edge is on, at cell x: a 2W dropped to its pair's row sits below
  // the top of its shallower column (or past the bottom of its shorter one)
  const edgePanels = position ? freeEdgePanels(data, allPanels, position) : [];
  const edgeAt = (x, fallback) => {
    const own = edgePanels.find(p => x >= p.gx && x < p.gx + p.cw);
    return own ? own.gy : fallback;
  };
  // A column's height in main-panel heights, from a bottom bumper's level up
  const stackPanels = (x, gy) => {
    let run = 0;
    for(let y = gy - 1; occ.has(`${x},${y}`); y--) run++;
    return run * cellMm / 1000 / main.height_m;
  };

  // Column height against the main panel's hanging / stacking limit, in its panel heights
  const warnings = [];
  const limit = position === 'top' ? main.max_hanging : (position === 'bottom' ? main.max_stacking : null);
  if(limit && main.height_m) {
    const names = freePanelNames(data.freePanels, allPanels, cellMm);
    joined.forEach(b => {
      let tallest = 0;
      for(let x = b.gx; x < b.gx + b.cw; x++) {
        let run = 0;
        const step = position === 'top' ? 1 : -1;
        const from = edgeAt(x, b.gy);
        for(let y = position === 'top' ? from : from - 1; occ.has(`${x},${y}`); y += step) run++;
        tallest = Math.max(tallest, run);
      }
      const high = tallest * cellMm / 1000 / main.height_m;
      if(high > limit + 0.001) {
        const owner = occ.get(`${b.gx},${position === 'top' ? b.gy : b.gy - 1}`);
        const where = owner ? `The column at panel ${names.get(owner)}` : 'A column';
        warnings.push(`${where} is ${+high.toFixed(1)} ${main.name} panels high; max ${position === 'top' ? 'hanging' : 'stacking'} is ${limit}.`);
      }
    });
  }

  // Ground support, as calculateGroundSupportHardware() (structure/weight.js) works it out
  // on grid screens: a ladder up the left column of every bottom bumper, a rear truss per two
  // panel heights (one per panel with CB5 air frames, which take no truss or clamps), a
  // bridge clamp at every second panel up, a second base and pipe on a column over eight
  // panels, and sandbags from each bumper's pickup weight
  let groundSupport = null;
  const ladders = [];
  const cb5Air = isCB5 && connectionMethod === 'airframe';
  if(position === 'bottom' && bumpers.length && main.height_m) {
    const w = GROUND_SUPPORT_WEIGHTS;
    groundSupport = {totalRearTruss: 0, totalBridgeClamps: 0, totalBaseTruss: 0, totalPipes: 0,
      totalSwivelCheeseboroughs: 0, totalSandbags: 0, totalRearBridgeClampAdapters: 0,
      totalWeightLbs: 0, totalWeightKg: 0, pipeInfo: []};
    bumpers.forEach(b => {
      groundSupport.totalSandbags += Math.ceil((b.loadKg * KG_TO_LBS / 25) * 1.25);
      // The ladder goes up the bumper's first panel, or its second when moved there
      const lx = b.ladderRight && b.cw > b.firstCw ? b.gx + b.firstCw : b.gx;
      const lcw = b.ladderRight && b.cw > b.firstCw ? b.cw - b.firstCw : b.firstCw;
      const panels = stackPanels(lx, edgeAt(lx, b.gy));
      ladders.push({gx: lx, gy: edgeAt(lx, b.gy), panels, cw: lcw});
      const numTruss = Math.floor(panels / 2 + 0.001);
      if(!cb5Air) {
        groundSupport.totalRearTruss += numTruss;
        groundSupport.totalBridgeClamps += numTruss;
      }
      if(panels > 8.001) {
        groundSupport.totalBaseTruss++;
        groundSupport.totalPipes++;
        groundSupport.totalSwivelCheeseboroughs += 2;
        groundSupport.pipeInfo.push({column: lx, rearTrussCount: numTruss, pipeLengthFt: Math.floor(Math.sqrt(6.56 * 6.56 + Math.pow(numTruss * 3.28, 2)))});
      }
    });
    groundSupport.totalBaseTruss += ladders.length;
    if(mainType === 'DM2_6' || (main.custom && main.needs_bridge_adapters)) {
      groundSupport.totalRearBridgeClampAdapters = groundSupport.totalBridgeClamps;
    }
    groundSupport.totalWeightLbs = groundSupport.totalRearTruss * w.rearTruss + groundSupport.totalBaseTruss * w.baseTruss +
      groundSupport.totalBridgeClamps * w.bridgeClamp + groundSupport.totalRearBridgeClampAdapters * w.rearBridgeClampAdapter +
      groundSupport.totalPipes * w.pipe + groundSupport.totalSwivelCheeseboroughs * w.swivelCheeseborough +
      groundSupport.totalSandbags * w.sandbag;
    groundSupport.totalWeightKg = groundSupport.totalWeightLbs / KG_TO_LBS;
  }

  // Connecting plates, by the rule enumerateConnectingPlates() (structure/plates.js) uses on
  // grid screens, applied at every drawn panel corner: 3 or 4 occupied cells round a corner
  // take a 4-way; two side by side a 2-way (a 4-way where a bumper rests on them); two
  // stacked a 2-way on the open side; a lone corner a 2-way only where a bumper ends
  let plates = null;
  if(shouldUseConnectingPlates(mainType)) {
    const edge = new Set();
    if(position) data.freePanels.forEach(fp => {
      const {cw, ch} = freeCells(allPanels[fp.type], cellMm);
      const edgeY = position === 'top' ? fp.gy - 1 : fp.gy + ch;
      for(let x = 0; x < cw; x++) if(occ.has(`${fp.gx + x},${edgeY}`)) return;
      // Only its column's top (bottom) panel, where the column has a bumper (one taken off by
      // hand leaves none), as on a grid wall, also when a notch drops the column's 2W below it
      const level = position === 'top' ? fp.gy : fp.gy + ch;
      if(edgePanels.some(p => p.gx === fp.gx && p.gy === level) &&
        bumpers.some(b => b.type !== '4w' && b.gx < fp.gx + cw && fp.gx < b.gx + b.cw)) edge.add(`${fp.gx},${fp.gy}`);
    });
    const byKey = new Map(data.freePanels.map(fp => [`${fp.gx},${fp.gy}`, Object.assign({}, fp, freeCells(allPanels[fp.type], cellMm))]));
    const restsTop = (key, vr) => position === 'top' && edge.has(key) && byKey.get(key).gy === vr;
    const restsBottom = (key, vr) => position === 'bottom' && edge.has(key) && byKey.get(key).gy + byKey.get(key).ch === vr;
    const corners = new Set();
    byKey.forEach(p => [[0, 0], [p.cw, 0], [0, p.ch], [p.cw, p.ch]].forEach(([dx, dy]) => corners.add(`${p.gx + dx},${p.gy + dy}`)));
    const marks = [];
    corners.forEach(v => {
      const [vc, vr] = v.split(',').map(Number);
      const TL = occ.get(`${vc - 1},${vr - 1}`), TR = occ.get(`${vc},${vr - 1}`);
      const BL = occ.get(`${vc - 1},${vr}`), BR = occ.get(`${vc},${vr}`);
      const n = [TL, TR, BL, BR].filter(Boolean).length;
      if(n >= 3) {
        marks.push({kind: '4way', vc, vr});
      } else if(n === 2) {
        if(TR && BR) marks.push({kind: '2way', vc, vr, place: 'vLeft'});
        else if(TL && BL) marks.push({kind: '2way', vc, vr, place: 'vRight'});
        else if(BL && BR) marks.push(restsTop(BL, vr) || restsTop(BR, vr) ? {kind: '4way', vc, vr} : {kind: '2way', vc, vr, place: 'hTop'});
        else if(TL && TR) marks.push(restsBottom(TL, vr) || restsBottom(TR, vr) ? {kind: '4way', vc, vr} : {kind: '2way', vc, vr, place: 'hBottom'});
      } else if(n === 1) {
        if(BR && restsTop(BR, vr)) marks.push({kind: '2way', vc, vr, place: 'endTopLeft'});
        else if(BL && restsTop(BL, vr)) marks.push({kind: '2way', vc, vr, place: 'endTopRight'});
        else if(TR && restsBottom(TR, vr)) marks.push({kind: '2way', vc, vr, place: 'endBottomLeft'});
        else if(TL && restsBottom(TL, vr)) marks.push({kind: '2way', vc, vr, place: 'endBottomRight'});
      }
    });
    const total4way = marks.filter(m => m.kind === '4way').length;
    const total2way = marks.length - total4way;
    plates = {marks, total2way, total4way, totalPlateWeight: total2way * PLATE_WEIGHTS.plate2wayKg + total4way * PLATE_WEIGHTS.plate4wayKg};
  }

  return {position, bumpers, counts, bumperWeightKg, warnings: [...new Set(warnings)], groundSupport, ladders, cb5Air, plates, takes4w,
    mainHeightCells: main.height_m * 1000 / cellMm};
}

// Draws a drawn wall's structure: white panels at their true sizes (with their names when
// o.numberSize is given), from (ox, oy) at cellPx a snap cell, and every bumper (bumperH
// tall, o.gap off the panel edge) on the edge it carries. o.weights labels each bumper with
// its type and pickup weight as the grid Structure layout does; without it, the type alone
// as the Combined view does. 4Ws are drawn (o.fourWayH tall, o.fourWayGap beyond their 2Ws)
// when o.fourWayH is given, and the connecting plates and ground support (ladders, bridge
// clamps and the ladder bases in the bumpers) when o.groundSupport is set. o.flat lines every
// bumper up along the wall's top (bottom) edge, as the Combined view draws a grid wall's
// even where a notch drops them. Shared by the Draw tab and the Combined view.
function drawFreeStructure(ctx, data, allPanels, st, o) {
  const toX = g => o.ox + Math.round(g * o.cellPx);
  const toY = g => o.oy + Math.round(g * o.cellPx);
  const names = freePanelNames(data.freePanels, allPanels, data.freeCell_mm);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // The gaps, dashed as the grid Structure layout outlines knocked-out panels
  if(o.groundSupport) freeHoleRects(data, allPanels).forEach(hr => {
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(toX(hr.gx), toY(hr.gy), toX(hr.gx + hr.cw) - toX(hr.gx), toY(hr.gy + hr.ch) - toY(hr.gy));
    ctx.setLineDash([]);
  });
  data.freePanels.forEach(fp => {
    const {cw, ch} = freeCells(allPanels[fp.type], data.freeCell_mm);
    const x = toX(fp.gx), y = toY(fp.gy), w = toX(fp.gx + cw) - x, h = toY(fp.gy + ch) - y;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    if(!o.numberSize) return;
    const label = names.get(`${fp.gx},${fp.gy}`);
    let fs = o.numberSize(w, h);
    ctx.font = `${fs}px Arial`;
    while(fs > 6 && ctx.measureText(label).width > w - 4) { fs--; ctx.font = `${fs}px Arial`; }
    if(fs >= 6) {
      ctx.fillStyle = '#000000';
      ctx.fillText(label, x + w / 2, y + h / 2);
    }
  });

  // Connecting plates, drawn as the grid structure layout draws them: red 4-way squares on
  // the corner, gold 2-ways inset along the seam they join
  if(o.groundSupport && st.plates) st.plates.marks.forEach(m => {
    const vx = toX(m.vc), vy = toY(m.vr);
    let x, y, w, h;
    if(m.kind === '4way') {
      ctx.fillStyle = '#FF4444';
      ctx.fillRect(vx - 4, vy - 4, 8, 8);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(vx - 4, vy - 4, 8, 8);
      return;
    }
    if(m.place === 'vLeft') { x = vx + 2; y = vy - 6; w = 4; h = 12; }
    else if(m.place === 'vRight') { x = vx - 6; y = vy - 6; w = 4; h = 12; }
    else if(m.place === 'hTop') { x = vx - 6; y = vy + 2; w = 12; h = 4; }
    else if(m.place === 'hBottom') { x = vx - 6; y = vy - 6; w = 12; h = 4; }
    else {
      const onLeft = m.place === 'endTopLeft' || m.place === 'endBottomLeft';
      x = onLeft ? vx + 2 : vx - 6; y = vy - 6; w = 4; h = 12;
    }
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  });

  // Ground support up each ladder column, as on grid screens: cyan rear-truss ladders from
  // the bottom up (two panel heights each, one with CB5 air frames) and a purple bridge
  // clamp at every second panel up
  const mainH = st.mainHeightCells * o.cellPx;
  const ladderSpan = st.cb5Air ? 1 : 2;
  if(o.groundSupport) st.ladders.forEach(l => {
    const cx = (toX(l.gx) + toX(l.gx + l.cw)) / 2;
    const bottom = toY(l.gy);
    for(let i = 0; i < Math.floor(l.panels / ladderSpan + 0.001); i++) {
      const ladderX = cx - 4;
      const ladderTopY = bottom - (i + 1) * ladderSpan * mainH + 4;
      const ladderHeight = ladderSpan * mainH - 8;
      ctx.fillStyle = '#00CED1';
      ctx.beginPath();
      ctx.roundRect(ladderX, ladderTopY, 8, ladderHeight, 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = '#008B8B';
      ctx.lineWidth = 1;
      for(let y = ladderTopY + mainH / 2; y < ladderTopY + ladderHeight - 5; y += mainH / 2) {
        ctx.beginPath();
        ctx.moveTo(ladderX + 1, y);
        ctx.lineTo(ladderX + 7, y);
        ctx.stroke();
      }
    }
    if(st.cb5Air) return;
    ctx.fillStyle = '#9932CC';
    for(let k = 2; k <= l.panels + 0.001; k += 2) {
      ctx.beginPath();
      ctx.arc(cx, bottom - (k - 0.5) * mainH, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  // Bumpers sit on the panel edge they carry, 4Ws beyond their 2Ws
  const pdf = typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode;
  const wall = freeBounds(data.freePanels, allPanels, data.freeCell_mm);
  st.bumpers.forEach(bp => {
    if(bp.type === '4w' && !o.fourWayH) return;
    const h = bp.type === '4w' ? o.fourWayH : o.bumperH;
    const out = bp.type === '4w' ? o.bumperH + o.fourWayGap : 0;
    const x = toX(bp.gx), w = toX(bp.gx + bp.cw) - x;
    const row = o.flat && wall ? (st.position === 'top' ? wall.minY : wall.maxY) : bp.gy;
    const y = st.position === 'top' ? toY(row) - o.gap - out - h : toY(row) + o.gap + out;
    const color = freeBumperColor(bp.type, st.position);
    ctx.fillStyle = greyscalePrintMode ? toGreyscale(color) : (ecoPrintMode ? toPastelColor(color) : color);
    ctx.fillRect(x, y, w, h);
    // Dark blue ladder base inside each bottom bumper, under its ladder column
    if(o.groundSupport && st.position === 'bottom' && bp.type !== '4w') {
      const right = bp.ladderRight && bp.cw > bp.firstCw;
      const lx = right ? toX(bp.gx + bp.firstCw) : x;
      const unitW = (right ? toX(bp.gx + bp.cw) : toX(bp.gx + bp.firstCw)) - lx;
      ctx.fillStyle = '#00008B';
      ctx.beginPath();
      ctx.roundRect(lx + unitW * 0.075, y + (h - 10) / 2, unitW * 0.85, 10, 3);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Where it is drawn, for picking it in manual mode, and its selection / hover outline
    bp.rect = {x, y, w, h};
    if(o.groundSupport && !pdf && manualBumperMode && bp.id) {
      if(selectedBumpers.has(bp.id)) {
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
      } else if(freeBumperHoverId === bp.id) {
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.setLineDash([]);
      }
    }
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    const type = bp.type.toUpperCase();
    if(!o.weights) {
      ctx.fillStyle = (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode) ? '#000000' : '#FFFFFF';
      ctx.font = 'bold 11px Arial';
      ctx.fillText(type, x + w / 2, y + h / 2);
      return;
    }
    ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#000000' : '#FFFFFF';
    const weight = `${displayWeightUnit === 'lbs' ? Math.ceil(bp.loadKg * KG_TO_LBS) : Math.ceil(bp.loadKg)}${displayWeightUnit}`;
    const fontLg = Math.max(pdf ? 12 : 10, Math.floor(h * 0.28));
    const fontSm = Math.max(pdf ? 11 : 9, Math.floor(h * 0.22));
    const offset = Math.max(6, Math.floor(h * 0.18));
    if(h < 25) {
      ctx.font = `bold ${fontSm}px Arial`;
      ctx.fillText(weight, x + w / 2, y + h / 2);
    } else {
      ctx.font = `bold ${fontLg}px Arial`;
      ctx.fillText(type, x + w / 2, y + h / 2 - offset);
      ctx.font = `${fontSm}px Arial`;
      ctx.fillText(weight, x + w / 2, y + h / 2 + offset);
    }
  });
}

// Structure layout for a free screen: the panels at their true sizes with every bumper
// drawn on its edge, the pickup weights beside them and any column-height warning.
function renderFreeStructureLayout() {
  const data = screens[currentScreenId].data;
  const allPanels = getAllPanels();
  const canvas = document.getElementById('structureCanvas');
  const container = document.getElementById('structureContainer');
  const ctx = canvas.getContext('2d');
  const isSimpleMode = typeof currentAppMode !== 'undefined' && currentAppMode === 'simple';
  if(!isSimpleMode) {
    container.style.display = 'block';
  }
  const st = freeStructureState;
  const b = freeBounds(data.freePanels, allPanels, data.freeCell_mm);
  if(!st || !b) {
    canvas.width = 0;
    canvas.height = 0;
    return;
  }

  const containerWidth = container.clientWidth - 32; // Account for padding
  const pdf = typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode;
  const maxCanvasWidth = pdf ? Math.min(containerWidth, 4000) : Math.min(containerWidth, 800);
  const {cellPx, unitPx} = freeLayoutSize(data, allPanels, b.maxX, maxCanvasWidth, pdf);
  const bumperH = Math.max(30, unitPx * 0.8);
  const fourWayH = Math.max(15, unitPx * 0.4);
  const fourWayGap = 5;
  // The 4W band also stays open to place 4Ws in by hand, as the grid layout keeps it
  const band = st.position ? bumperH + (st.counts['4w'] || (manualBumperMode && st.takes4w) ? fourWayH + fourWayGap : 0) : 0;
  const top = st.position === 'top' ? band : 0;
  canvas.width = Math.round(b.maxX * cellPx);
  canvas.height = Math.round(b.maxY * cellPx) + band;
  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawFreeStructure(ctx, data, allPanels, st, {
    ox: 0, oy: top, cellPx, bumperH, gap: 0, weights: true, fourWayH, fourWayGap, groundSupport: true,
    numberSize: (w, h) => Math.max(10, Math.floor(Math.min(w, h) * (pdf ? 0.25 : 0.22)))
  });
  // Floor frames, outlined and labelled as the grid structure layout draws them
  if(st.floorFrames) st.floorFrames.frames.forEach(f => {
    const frameLineWidth = 4;
    const frameX = Math.round(f.gx * cellPx), frameY = top + Math.round(f.gy * cellPx);
    const frameW = Math.round((f.gx + f.cw) * cellPx) - frameX, frameH = top + Math.round((f.gy + f.ch) * cellPx) - frameY;
    const color = floorFrameColors[f.type] || '#ffffff';
    ctx.strokeStyle = color;
    ctx.lineWidth = frameLineWidth;
    ctx.strokeRect(frameX + frameLineWidth / 2, frameY + frameLineWidth / 2, frameW - frameLineWidth, frameH - frameLineWidth);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(frameX + 1, frameY + 1, frameW - 2, frameH - 2);
    ctx.strokeRect(frameX + frameLineWidth + 1, frameY + frameLineWidth + 1, frameW - frameLineWidth * 2 - 2, frameH - frameLineWidth * 2 - 2);
    const labelFontSize = Math.max(12, Math.floor(unitPx * 0.3));
    ctx.font = `bold ${labelFontSize}px Arial`;
    const bgWidth = ctx.measureText(f.name).width + 8, bgHeight = labelFontSize + 8;
    const labelX = frameX + frameW / 2, labelY = frameY + frameH / 2;
    ctx.fillStyle = color;
    ctx.fillRect(labelX - bgWidth / 2, labelY - bgHeight / 2, bgWidth, bgHeight);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(labelX - bgWidth / 2, labelY - bgHeight / 2, bgWidth, bgHeight);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.name, labelX, labelY);
  });

  // Where the wall sits on the canvas, for editing bumpers by hand (interact/free-bumpers.js)
  freeStructureView = {cellPx, top, bumperH, fourWayH, fourWayGap};
  setupFreeBumperInteractivity();

  // Center-of-wall mark: thin red vertical line over the bumper band, as on grid screens
  const centerX = Math.round(canvas.width / 2);
  const wallBottom = top + Math.round(b.maxY * cellPx);
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if(st.position === 'top') {
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, top);
  } else if(st.position === 'bottom') {
    ctx.moveTo(centerX, wallBottom);
    ctx.lineTo(centerX, canvas.height);
  } else {
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, Math.min(bumperH, wallBottom));
  }
  ctx.stroke();

  const warnEl = document.getElementById('structureHeightWarning');
  if(warnEl) {
    warnEl.textContent = st.warnings.join(' ');
    warnEl.style.display = st.warnings.length ? 'block' : 'none';
  }

  // Pickup weights, in the box the grid structure layout uses
  const infoPanel = document.getElementById('structureInfoPanel');
  const weightsBox = document.getElementById('structureWeightsBox');
  const weightsContent = document.getElementById('structureWeightsContent');
  if(infoPanel && weightsBox && weightsContent) {
    weightsContent.textContent = '';
    const isFloor = document.getElementById('structureType').value === 'floor';
    infoPanel.style.display = (st.bumpers.length || st.plates || st.groundSupport || isFloor) ? 'grid' : 'none';
    weightsBox.style.display = st.bumpers.length ? 'block' : 'none';
    const wtUnit = getWeightUnitLabel();
    const shown = kg => displayWeightUnit === 'lbs' ? Math.ceil(kg * KG_TO_LBS) : Math.ceil(kg);
    const row = (label, value, color, total) => {
      const r = document.createElement('div');
      r.className = 'weight-row';
      if(total) r.style.cssText = 'border-top: 1px solid #4a9eff; margin-top: 6px; padding-top: 6px;';
      const l = document.createElement('span');
      l.className = 'weight-label';
      l.style.color = color;
      l.textContent = label;
      const v = document.createElement('span');
      v.className = 'weight-value';
      if(total) v.style.color = '#4a9eff';
      v.textContent = `${value} ${wtUnit}`;
      r.appendChild(l);
      r.appendChild(v);
      weightsContent.appendChild(r);
    };
    const pickups = st.bumpers.filter(bp => !bp.under4w);
    pickups.forEach(bp => row(bp.label, shown(bp.loadKg), freeBumperColor(bp.type, st.position), false));
    if(pickups.length) row('Total', shown(pickups.reduce((s, bp) => s + bp.loadKg, 0)), '#fff', true);
  }

  // Connecting plates, in the box the grid structure layout uses
  const platesBox = document.getElementById('structurePlatesBox');
  const platesContent = document.getElementById('structurePlatesContent');
  if(platesBox && platesContent) {
    platesContent.textContent = '';
    platesBox.style.display = st.plates ? 'block' : 'none';
    if(st.plates) {
      const kgShown = displayWeightUnit === 'lbs' ? Math.ceil(st.plates.totalPlateWeight * KG_TO_LBS) : Math.ceil(st.plates.totalPlateWeight);
      [['2-Way (yellow)', st.plates.total2way], ['4-Way (red)', st.plates.total4way], ['Total Weight', `${kgShown} ${getWeightUnitLabel()}`]].forEach(([label, value], i) => {
        const r = document.createElement('div');
        r.className = i === 2 ? 'plates-row plates-total' : 'plates-row';
        const l = document.createElement('span');
        l.className = 'plates-label';
        if(i === 2) l.style.color = '#fff';
        l.textContent = label;
        const v = document.createElement('span');
        v.className = 'plates-value';
        if(i === 2) v.style.color = '#6fc276';
        v.textContent = value;
        r.appendChild(l);
        r.appendChild(v);
        platesContent.appendChild(r);
      });
    }
  }

  // Ground support hardware, in the box the grid structure layout uses
  const gsBox = document.getElementById('structureGroundSupportBox');
  const gsContent = document.getElementById('structureGroundSupportContent');
  if(gsBox && gsContent) {
    gsContent.textContent = '';
    const gs = st.groundSupport;
    gsBox.style.display = gs ? 'block' : 'none';
    if(gs) {
      const line = (label, value, total) => {
        const r = document.createElement('div');
        r.className = total ? 'plates-row plates-total' : 'plates-row';
        if(total) r.style.cssText = 'border-top: 1px solid #00CED1; margin-top: 6px; padding-top: 6px;';
        const l = document.createElement('span');
        l.className = 'plates-label';
        l.style.color = '#ffffff';
        l.textContent = label;
        const v = document.createElement('span');
        v.className = 'plates-value';
        if(total) v.style.color = '#00CED1';
        v.textContent = value;
        r.appendChild(l);
        r.appendChild(v);
        gsContent.appendChild(r);
      };
      if(gs.totalRearTruss > 0) line('Rear Truss', gs.totalRearTruss);
      if(gs.totalBaseTruss > 0) line('Base Truss', gs.totalBaseTruss);
      if(gs.totalBridgeClamps > 0) line('Bridge Clamps', gs.totalBridgeClamps);
      if(gs.totalRearBridgeClampAdapters > 0) line('Rear Bridge Clamp Adapter', gs.totalRearBridgeClampAdapters);
      if(gs.totalPipes > 0) line(`Pipe (${[...new Set(gs.pipeInfo.map(pi => pi.pipeLengthFt))].map(l => l + 'ft').join(', ')})`, gs.totalPipes);
      if(gs.totalSwivelCheeseboroughs > 0) line('Swivel Cheeseborough', gs.totalSwivelCheeseboroughs);
      line('Sandbags (25lb)', gs.totalSandbags);
      const shownGs = displayWeightUnit === 'lbs' ? Math.ceil(gs.totalWeightLbs) : Math.ceil(gs.totalWeightKg);
      line('Total Weight', `${shownGs} ${getWeightUnitLabel()}`, true);
    }
  }

  // Floor frames and the total structure weight, in the boxes the grid structure layout uses
  const shownKg = kg => displayWeightUnit === 'lbs' ? Math.ceil(kg * KG_TO_LBS) : Math.ceil(kg);
  const boxRow = (content, rowClass, labelClass, valueClass, label, labelColor, value, valueColor, border) => {
    const r = document.createElement('div');
    r.className = rowClass;
    if(border) r.style.cssText = `border-top: 1px solid ${border}; margin-top: 6px; padding-top: 6px;`;
    const l = document.createElement('span');
    l.className = labelClass;
    l.style.color = labelColor;
    l.textContent = label;
    const v = document.createElement('span');
    v.className = valueClass;
    if(valueColor) v.style.color = valueColor;
    v.textContent = value;
    r.appendChild(l);
    r.appendChild(v);
    content.appendChild(r);
    return {l, v};
  };
  const ffBox = document.getElementById('structureFloorFramesBox');
  const ffContent = document.getElementById('structureFloorFramesContent');
  const ff = st.floorFrames;
  if(ffBox && ffContent) {
    ffContent.textContent = '';
    ffBox.style.display = ff ? 'block' : 'none';
    if(ff) {
      [['frame_3x2', '3×2 Frame'], ['frame_2x2', '2×2 Frame'], ['frame_2x1', '2×1 Frame'], ['frame_1x1', '1×1 Frame']].forEach(([t, label]) => {
        if(ff.counts[t] > 0) boxRow(ffContent, 'plates-row', 'plates-label', 'plates-value', label, floorFrameColors[t], ff.counts[t]);
      });
      boxRow(ffContent, 'plates-row plates-total', 'plates-label', 'plates-value', 'Total Weight', '#fff',
        `${shownKg(ff.totalWeightKg)} ${getWeightUnitLabel()}`, '#4ecdc4', '#4ecdc4');
    }
  }
  const twBox = document.getElementById('structureTotalWeightBox');
  const twContent = document.getElementById('structureTotalWeightContent');
  if(twBox && twContent) {
    twContent.textContent = '';
    const isFloorMode = document.getElementById('structureType').value === 'floor';
    const parts = [
      ['Bumpers', '#4a9eff', isFloorMode ? 0 : st.bumperWeightKg],
      ['Connecting Plates', '#6fc276', st.plates ? st.plates.totalPlateWeight : 0],
      ['Ground Support', '#00CED1', st.groundSupport ? st.groundSupport.totalWeightKg : 0],
      ['Floor Frames', '#4ecdc4', ff ? ff.totalWeightKg : 0]
    ];
    const totalKg = parts.reduce((sum, p) => sum + p[2], 0);
    const show = totalKg > 0 || st.bumpers.length > 0 || isFloorMode;
    twBox.style.display = show ? 'block' : 'none';
    if(show) {
      parts.forEach(([label, color, kg]) => { if(kg > 0) boxRow(twContent, 'weight-row', 'weight-label', 'weight-value', label, color, `${shownKg(kg)} ${getWeightUnitLabel()}`); });
      const total = boxRow(twContent, 'weight-row', 'weight-label', 'weight-value', 'TOTAL', '#fff', `${shownKg(totalKg)} ${getWeightUnitLabel()}`, '#FFD700', '#FFD700');
      total.l.style.fontWeight = 'bold';
      total.v.style.fontWeight = 'bold';
    }
  }
}
