// ==================== FREE-DRAW IN THE COMBINED VIEW ====================
// Drawn (free) screens on the Combined canvases. Combined lays every screen out in panel
// units, one per panel width; a drawn screen takes part in units of its main panel's
// width (a snap cell is freeUnitScale of one), so it sits at the same size as a grid wall
// of that panel, and draws its panels at their true sizes through the same helpers as
// the Draw tab. Hit-testing and the selection outline work on whole panels keyed "gx,gy", so
// Assign Circuit # / SOCA # / Data Port write the keys the Draw tab uses.

// A drawn screen's data as a Combined screen: its size in main-panel widths (freeCols x
// freeRows snap cells of freeUnitScale each), one unit's pixels for placing it from its
// Canvas position, plus its bumpers (4Ws included) so the structure canvas makes room
// above or below it
function freeCombinedData(data, allPanels) {
  const view = freeCellData(data, allPanels);
  // Its processor split, in cells as the cell grid is, so each part runs its own lines
  view.split = data.split;
  const main = allPanels[data.panelType] || allPanels[data.freePanels.length ? data.freePanels[0].type : ''];
  const scale = main ? data.freeCell_mm / (main.width_m * 1000) : 1;
  view.freeUnitScale = scale;
  view.freeCols = view.panelsWide;
  view.freeRows = view.panelsHigh;
  view.panelsWide = view.freeCols * scale;
  view.panelsHigh = view.freeRows * scale;
  if(view.freeCellPanel) view.freeCellPanel = Object.assign({}, view.freeCellPanel, {res_x: view.freeCellPanel.res_x / scale, res_y: view.freeCellPanel.res_y / scale});
  const position = freeBumperPosition(data.structureType || 'hanging', data.useBumpers !== false);
  view.bumpers = (position && data.freePanels.length)
    ? freeStructurePlan(data, allPanels, position, data.use4WayBumpers).bumpers.map(b => ({position, type: b.type}))
    : [];
  return view;
}

// A drawn screen's panels on a Combined canvas, [{key, x, y, w, h}], from the geometry the
// renderer recorded for it (e.freeMirror: drawn flipped left to right, the data rear view)
function freeCombinedPanelRects(e) {
  const allPanels = getAllPanels();
  const data = e.data;
  const cols = data.freeCols;
  const cellPx = e.panelWidth * data.freeUnitScale;
  return data.freePanels.map(fp => {
    const {cw, ch} = freeCells(allPanels[fp.type], data.freeCell_mm);
    const x0 = e.freeMirror ? cols - fp.gx - cw : fp.gx;
    const x = e.screenX + Math.round(x0 * cellPx), y = e.screenY + Math.round(fp.gy * cellPx);
    return {
      key: `${fp.gx},${fp.gy}`, x, y,
      w: e.screenX + Math.round((x0 + cw) * cellPx) - x,
      h: e.screenY + Math.round((fp.gy + ch) * cellPx) - y
    };
  });
}

// Screen name over a drawn screen, as the Combined power/data/structure canvases label theirs
function drawFreeCombinedName(ctx, screen, x, y) {
  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode) ? '#000' : '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(screen.name, x, y);
}

// Standard canvas: the two-tone panels with their names and the screen name over them.
// unitPx is Combined's panel size; the drawn screen's cells are freeUnitScale of it.
function drawFreeCombinedStandard(ctx, screen, data, sx, sy, unitPx, colors) {
  const allPanels = getAllPanels();
  const cellPx = unitPx * data.freeUnitScale;
  const wall = freePlacedPanels(data, allPanels);
  const tones = freeColorIndexes(data.freePanels, allPanels, data.freeCell_mm);
  const names = freePanelNames(data.freePanels, allPanels, data.freeCell_mm);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  data.freePanels.forEach((fp, i) => {
    const {cw, ch} = freeCells(allPanels[fp.type], data.freeCell_mm);
    const x = sx + Math.round(fp.gx * cellPx), y = sy + Math.round(fp.gy * cellPx);
    const w = sx + Math.round((fp.gx + cw) * cellPx) - x, h = sy + Math.round((fp.gy + ch) * cellPx) - y;
    ctx.fillStyle = colors[tones[i]];
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    if(Math.min(w, h) >= 15) {
      ctx.fillStyle = '#000000';
      ctx.font = `${Math.max(6, Math.min(11, Math.min(w, h) * 0.28))}px Arial`;
      ctx.fillText(names.get(`${fp.gx},${fp.gy}`), x + w / 2, y + h / 2);
    }
  });
  if(screen.name && wall.panels.length) {
    const pt = freeNamePoint(data, allPanels);
    const labelX = sx + pt.x * cellPx, labelY = sy + pt.y * cellPx;
    ctx.font = `bold ${Math.max(8, Math.min(14, unitPx * 0.35))}px Arial`;
    const printMode = ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode;
    ctx.fillStyle = printMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)';
    ctx.fillText(screen.name, labelX + 2, labelY + 2);
    ctx.fillText(screen.name, labelX - 1, labelY + 1);
    ctx.fillStyle = printMode ? '#000' : '#FFFF00';
    ctx.fillText(screen.name, labelX, labelY);
  }
}

// Power canvas: circuits and SOCAs as the screen's own Power layout shows them
function drawFreeCombinedPower(ctx, screen, screenId, data, sx, sy, unitPx, groupPlan, holeBlocked) {
  const allPanels = getAllPanels();
  const cellPx = unitPx * data.freeUnitScale;
  const plan = freeScreenCircuits(screenId, data, groupPlan);
  if(plan) {
    const labelMap = sharedDistroSocaLabelMap(screenId);
    drawFreePowerPanels(ctx, data, allPanels, {
      panelToCircuit: plan.panelToCircuit, panelToSoca: plan.panelToSoca,
      socaLabelIdx: idx => (labelMap && labelMap.has(idx)) ? labelMap.get(idx) : idx,
      ox: sx, oy: sy, cellPx,
      labelSize: () => Math.max(7, Math.round(unitPx * 0.32)),
      holeBlocked
    });
  }
  drawFreeCombinedName(ctx, screen, sx + data.freeCols * cellPx / 2, sy - 10);
}

// Data canvas: lines coloured by port with the screen's own view settings, the units they
// land on, and the endpoints for the Mains/Backups table
function drawFreeCombinedData(ctx, screen, screenId, data, sx, sy, unitPx, holeBlocked) {
  const allPanels = getAllPanels();
  const cellPx = unitPx * data.freeUnitScale;
  const built = freeScreenDataGroups(data, allPanels);
  if(!built) {
    drawFreeCombinedName(ctx, screen, sx + data.freeCols * cellPx / 2, sy - 10);
    return [];
  }
  const flip = !!data.dataFlip;
  const endpoints = computeDataLineEndpoints(built.groups, built.sortedDataLines, flip);
  // Panel names at the grid's size, shrunk until the widest fits a panel width
  let numberFontSize = Math.max(7, Math.round(unitPx * 0.32));
  const widest = built.groups.reduce((w, g) => g.reduce((ww, pt) => ww.length >= pt.label.length ? ww : pt.label, w), '');
  ctx.save();
  ctx.font = `${numberFontSize}px Arial`;
  while(numberFontSize > 5 && ctx.measureText(widest).width > unitPx * 0.85) {
    numberFontSize -= 1;
    ctx.font = `${numberFontSize}px Arial`;
  }
  ctx.restore();
  drawFreeDataPanels(ctx, data, allPanels, {
    screenId, groups: built.groups, sortedDataLines: built.sortedDataLines, endpoints,
    ox: sx, oy: sy, cellPx, mirror: !!data.dataRearView, flip,
    showArrows: data.showArrows !== false,
    showLabels: !!data.dataLineLabels,
    redundancy: !!data.redundancy,
    numberSize: () => numberFontSize,
    arrowWidth: Math.max(1.5, unitPx * 0.075), headSize: Math.max(5, unitPx * 0.3)
  });

  // Distribution box / processor labels across the screen, as on grid screens
  if(typeof dataUnitLabelsEnabled === 'undefined' || dataUnitLabelsEnabled) {
    const units = buildDataUnitGroups(screenId, built.groups, built.sortedDataLines);
    if(units.panelToUnit.size) {
      const cellToUnit = new Map();
      data.freePanels.forEach(fp => {
        const unit = units.panelToUnit.get(`${fp.gx},${fp.gy}`);
        if(unit === undefined) return;
        const {cw, ch} = freeCells(allPanels[fp.type], data.freeCell_mm);
        const x0 = data.dataRearView ? data.freeCols - fp.gx - cw : fp.gx;
        for(let i = 0; i < cw; i++) for(let j = 0; j < ch; j++) cellToUnit.set(`${x0 + i},${fp.gy + j}`, unit);
      });
      drawSocaOverlay(ctx, {
        panelToCircuit: cellToUnit, panelToSoca: cellToUnit, deletedPanels: new Set(),
        panelWidth: cellPx,
        rowGeo: cb5RowGeometry(data.freeRows, {top: 0, bottom: 0}, cellPx, cellPx),
        offsetX: sx, offsetY: sy,
        outlineLineWidth: 1.5,
        socaLabelIdx: i => i,
        drawOutlines: false,
        drawLabels: true,
        labelFor: idx => units.labels.get(idx) || '',
        labelColor: '#10b981',
        labelDiagonal: false,
        holeBlocked
      });
    }
  }

  // A split screen: where it splits, and which canvas / processor each part goes to
  drawSplitPartMarkers(ctx, screenId, {
    offsetX: sx, offsetY: sy, panelWidth: cellPx, unitWidth: unitPx,
    rowGeo: cb5RowGeometry(data.freeRows, {top: 0, bottom: 0}, cellPx, cellPx), fontSize: numberFontSize
  });
  drawFreeCombinedName(ctx, screen, sx + data.freeCols * cellPx / 2, sy - 10);
  return endpoints;
}

// Structure canvas: the panels with the bumpers worked out from the drawn wall, 4Ws in
// their own band. `top` is where the screen's structure starts (its bumpers when they hang
// on top).
function drawFreeCombinedStructure(ctx, screen, data, sx, top, unitPx, bumperH, fourWayH, fourWayGap) {
  const allPanels = getAllPanels();
  const cellPx = unitPx * data.freeUnitScale;
  const position = freeBumperPosition(data.structureType || 'hanging', data.useBumpers !== false);
  const st = freeStructurePlan(data, allPanels, position, data.use4WayBumpers);
  const panelTop = top + (st.position === 'top' && st.bumpers.length ? bumperH + 5 : 0) +
    (st.position === 'top' && st.counts['4w'] ? fourWayH + fourWayGap : 0);
  drawFreeStructure(ctx, data, allPanels, st, {ox: sx, oy: panelTop, cellPx, bumperH, gap: 5, fourWayH, fourWayGap, flat: true});
  drawFreeCombinedName(ctx, screen, sx + data.freeCols * cellPx / 2, (st.position === 'top' && st.bumpers.length ? top : panelTop) - 15);
}

// One drawn screen's entry in calculateCombinedCabling() (nav/combined-cable-diagram.js):
// its cell grid with the data lines and circuits worked out from the drawn panels. Line
// ends sit at panel centres in cells (see freeDataLinePanelOrdering).
function freeCombinedCablingScreen(screenId, screen) {
  const allPanels = getAllPanels();
  const data = screen.data;
  if(!data.freePanels.length) return null;
  const view = freeCellData(data, allPanels);
  const cellFt = (data.freeCell_mm / 1000) * 3.28084;
  const ordering = freeDataLinePanelOrdering(data, allPanels);
  const entryPoints = {}, exitPoints = {};
  Object.keys(ordering).forEach(ln => {
    entryPoints[ln] = ordering[ln][0];
    exitPoints[ln] = ordering[ln][ordering[ln].length - 1];
  });
  const inp = freeScreenDataInputs(data);

  // SOCA runs over every cell a panel covers, labelled as on the power canvas
  const plan = freeScreenCircuits(screenId, data, null);
  const cellToCircuit = new Map(), cellToSoca = new Map();
  data.freePanels.forEach(fp => {
    const key = `${fp.gx},${fp.gy}`;
    const {cw, ch} = freeCells(allPanels[fp.type], data.freeCell_mm);
    for(let i = 0; i < cw; i++) for(let j = 0; j < ch; j++) {
      cellToCircuit.set(`${fp.gx + i},${fp.gy + j}`, plan.panelToCircuit.get(key));
      cellToSoca.set(`${fp.gx + i},${fp.gy + j}`, plan.panelToSoca.get(key));
    }
  });
  const socaSpans = computeSocaSpans(cellToCircuit, cellToSoca);
  const labelMap = sharedDistroSocaLabelMap(screenId);
  socaSpans.forEach(sp => { sp.labelIdx = (labelMap && labelMap.has(sp.socaIdx)) ? labelMap.get(sp.socaIdx) : sp.socaIdx; });

  return {
    screenId,
    screenName: screen.name || screenId,
    screenColor: screen.color || '#888',
    panelType: data.panelType, pw: view.panelsWide, ph: view.panelsHigh, effectivePh: view.panelsHigh, hasCB5HalfRow: false,
    panelWidthFt: cellFt, panelHeightFt: cellFt,
    wallWidthFt: Math.round(view.panelsWide * cellFt * 10) / 10,
    wallHeightFt: Math.round(view.panelsHigh * cellFt * 10) / 10,
    activePanelCount: data.freePanels.length,
    screenPixels: data.freePanels.reduce((sum, fp) => sum + allPanels[fp.type].res_x * allPanels[fp.type].res_y, 0),
    dataLines: Object.keys(ordering).length, entryPoints, exitPoints,
    panelsPerDataLine: inp ? inp.panelsPerDataLine : 0,
    circuitsNeeded: new Set(plan.panelToCircuit.values()).size,
    socaCount: new Set(plan.panelToSoca.values()).size,
    columnsPerCircuit: 1, socaSpans,
    deletedPanelsSet: view.deletedPanels
  };
}

// The drawn panel at a point of the cable diagrams' cell grid (cells less half a cell, the
// convention freeDataLinePanelOrdering() uses), or the nearest one when the point is in a
// gap: {i, boxes} with boxes every panel's {gx, gy, cw, ch}
function freeCablePanelAt(data, c, r) {
  const allPanels = getAllPanels();
  const boxes = data.freePanels.map(fp => Object.assign({gx: fp.gx, gy: fp.gy}, freeCells(allPanels[fp.type], data.freeCell_mm)));
  const x = c + 0.5, y = r + 0.5;
  let i = -1, best = Infinity;
  boxes.forEach((b, k) => {
    const dx = Math.max(b.gx - x, 0, x - (b.gx + b.cw)), dy = Math.max(b.gy - y, 0, y - (b.gy + b.ch));
    if(dx * dx + dy * dy < best) { best = dx * dx + dy * dy; i = k; }
  });
  return {i, boxes};
}

// A panel's centre in the cable diagrams' convention
function freeCablePanelCentre(b) {
  return {col: b.gx + b.cw / 2 - 0.5, row: b.gy + b.ch / 2 - 0.5};
}

// A cable's route across a drawn wall, as findCableGridPath() (nav/combined-cable-diagram.js)
// routes one across a grid wall's live panels: from the panel at one point to the panel at
// another through panels side by side, trying down, up, right then left as the grid does,
// so a wall of one panel size takes the grid's route. Turns are right angles inside the
// panels; the points are panel centres and turns in the same convention.
function freeCablePath(data, c0, r0, c1, r1) {
  const {i: from, boxes} = freeCablePanelAt(data, c0, r0);
  const to = freeCablePanelAt(data, c1, r1).i;
  if(from < 0 || to < 0) return null;
  const occ = new Map();
  boxes.forEach((b, k) => { for(let x = 0; x < b.cw; x++) for(let y = 0; y < b.ch; y++) occ.set(`${b.gx + x},${b.gy + y}`, k); });
  const neighbours = b => {
    const out = [];
    const add = key => { const k = occ.get(key); if(k !== undefined && !out.includes(k)) out.push(k); };
    for(let x = 0; x < b.cw; x++) add(`${b.gx + x},${b.gy + b.ch}`);
    for(let x = 0; x < b.cw; x++) add(`${b.gx + x},${b.gy - 1}`);
    for(let y = 0; y < b.ch; y++) add(`${b.gx + b.cw},${b.gy + y}`);
    for(let y = 0; y < b.ch; y++) add(`${b.gx - 1},${b.gy + y}`);
    return out;
  };
  const parent = new Map([[from, null]]);
  const queue = [from];
  while(queue.length && !parent.has(to)) {
    const cur = queue.shift();
    neighbours(boxes[cur]).forEach(k => { if(!parent.has(k)) { parent.set(k, cur); queue.push(k); } });
  }
  if(!parent.has(to)) return null;
  const chain = [];
  for(let k = to; k !== null; k = parent.get(k)) chain.unshift(k);

  // Panel centres, with a turn inside both panels wherever two sit off-centre
  const pts = [freeCablePanelCentre(boxes[chain[0]])];
  for(let n = 1; n < chain.length; n++) {
    const a = boxes[chain[n - 1]], b = boxes[chain[n]];
    const pa = pts[pts.length - 1], pb = freeCablePanelCentre(b);
    if(pa.col !== pb.col && pa.row !== pb.row) {
      if(b.gy === a.gy + a.ch || b.gy + b.ch === a.gy) {
        const col = Math.min(Math.max(pa.col, Math.max(a.gx, b.gx)), Math.min(a.gx + a.cw, b.gx + b.cw) - 1);
        if(col !== pa.col) pts.push({col, row: pa.row});
        pts.push({col, row: pb.row});
      } else {
        const row = Math.min(Math.max(pa.row, Math.max(a.gy, b.gy)), Math.min(a.gy + a.ch, b.gy + b.ch) - 1);
        if(row !== pa.row) pts.push({col: pa.col, row});
        pts.push({col: pb.col, row});
      }
    }
    pts.push(pb);
  }
  // Drop repeats and the points along a straight run, as the grid route does
  const path = pts.filter((p, n) => n === 0 || p.col !== pts[n - 1].col || p.row !== pts[n - 1].row);
  return path.filter((p, n) => n === 0 || n === path.length - 1 ||
    !((path[n - 1].col === p.col && p.col === path[n + 1].col) || (path[n - 1].row === p.row && p.row === path[n + 1].row)));
}
