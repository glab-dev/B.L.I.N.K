// ==================== FREE-DRAW IN THE COMBINED VIEW ====================
// Drawn (free) screens on the Combined canvases. Combined lays every screen out in grid
// units; a drawn screen takes part as its cell grid (freeCellData), one unit per snap
// cell, and draws its panels at their true sizes through the same helpers as the Draw
// tab. Hit-testing and the selection outline work on whole panels keyed "gx,gy", so
// Assign Circuit # / SOCA # / Data Port write the keys the Draw tab uses.

// A drawn screen's data as a Combined screen: its cell grid, plus its bumpers so the
// structure canvas makes room above or below it
function freeCombinedData(data, allPanels) {
  const view = freeCellData(data, allPanels);
  const position = freeBumperPosition(data.structureType || 'hanging', data.useBumpers !== false);
  view.bumpers = (position && data.freePanels.length)
    ? freeBumpers(data, allPanels, position).map(b => ({position, type: b.type}))
    : [];
  return view;
}

// A drawn screen's panels on a Combined canvas, [{key, x, y, w, h}], from the geometry the
// renderer recorded for it (e.freeMirror: drawn flipped left to right, the data rear view)
function freeCombinedPanelRects(e) {
  const allPanels = getAllPanels();
  const data = e.data;
  const cols = data.panelsWide;
  return data.freePanels.map(fp => {
    const {cw, ch} = freeCells(allPanels[fp.type], data.freeCell_mm);
    const x0 = e.freeMirror ? cols - fp.gx - cw : fp.gx;
    const x = e.screenX + Math.round(x0 * e.panelWidth), y = e.screenY + Math.round(fp.gy * e.panelWidth);
    return {
      key: `${fp.gx},${fp.gy}`, x, y,
      w: e.screenX + Math.round((x0 + cw) * e.panelWidth) - x,
      h: e.screenY + Math.round((fp.gy + ch) * e.panelWidth) - y
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

// Standard canvas: the two-tone panels with their names and the screen name over them
function drawFreeCombinedStandard(ctx, screen, data, sx, sy, cellPx, colors) {
  const allPanels = getAllPanels();
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
    const b = freeBounds(data.freePanels, allPanels, data.freeCell_mm);
    const labelX = sx + b.maxX * cellPx / 2, labelY = sy + b.maxY * cellPx / 2;
    ctx.font = `bold ${Math.max(8, Math.min(14, cellPx * 0.35))}px Arial`;
    const printMode = ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode;
    ctx.fillStyle = printMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)';
    ctx.fillText(screen.name, labelX + 2, labelY + 2);
    ctx.fillText(screen.name, labelX - 1, labelY + 1);
    ctx.fillStyle = printMode ? '#000' : '#FFFF00';
    ctx.fillText(screen.name, labelX, labelY);
  }
}

// Power canvas: circuits and SOCAs as the screen's own Power layout shows them
function drawFreeCombinedPower(ctx, screen, screenId, data, sx, sy, cellPx, groupPlan, holeBlocked) {
  const allPanels = getAllPanels();
  const plan = freeScreenCircuits(screenId, data, groupPlan);
  if(plan) {
    const labelMap = sharedDistroSocaLabelMap(screenId);
    drawFreePowerPanels(ctx, data, allPanels, {
      panelToCircuit: plan.panelToCircuit, panelToSoca: plan.panelToSoca,
      socaLabelIdx: idx => (labelMap && labelMap.has(idx)) ? labelMap.get(idx) : idx,
      customCircuit: plan.customCircuit,
      ox: sx, oy: sy, cellPx,
      labelSize: () => Math.max(7, Math.round(cellPx * 0.32)),
      holeBlocked
    });
  }
  drawFreeCombinedName(ctx, screen, sx + data.panelsWide * cellPx / 2, sy - 10);
}

// Data canvas: lines coloured by port with the screen's own view settings, the units they
// land on, and the endpoints for the Mains/Backups table
function drawFreeCombinedData(ctx, screen, screenId, data, sx, sy, cellPx, holeBlocked) {
  const allPanels = getAllPanels();
  const built = freeScreenDataGroups(data, allPanels);
  drawFreeCombinedName(ctx, screen, sx + data.panelsWide * cellPx / 2, sy - 10);
  if(!built) return [];
  const flip = !!data.dataFlip;
  const endpoints = computeDataLineEndpoints(built.groups, built.sortedDataLines, flip);
  drawFreeDataPanels(ctx, data, allPanels, {
    screenId, groups: built.groups, sortedDataLines: built.sortedDataLines, endpoints,
    ox: sx, oy: sy, cellPx, mirror: !!data.dataRearView, flip,
    showArrows: data.showArrows !== false,
    showLabels: !!data.dataLineLabels,
    redundancy: !!data.redundancy,
    numberSize: () => Math.max(7, Math.round(cellPx * 0.32)),
    arrowWidth: Math.max(1.5, cellPx * 0.075), headSize: Math.max(5, cellPx * 0.3)
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
        const x0 = data.dataRearView ? data.panelsWide - fp.gx - cw : fp.gx;
        for(let i = 0; i < cw; i++) for(let j = 0; j < ch; j++) cellToUnit.set(`${x0 + i},${fp.gy + j}`, unit);
      });
      drawSocaOverlay(ctx, {
        panelToCircuit: cellToUnit, panelToSoca: cellToUnit, deletedPanels: new Set(),
        panelWidth: cellPx,
        rowGeo: combinedRowGeometry(data, cellPx).geo,
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
  return endpoints;
}

// Structure canvas: the panels with the bumpers worked out from the drawn wall. `top` is
// where the screen's structure starts (its bumpers when they hang on top).
function drawFreeCombinedStructure(ctx, screen, data, sx, top, cellPx, bumperH) {
  const allPanels = getAllPanels();
  const position = freeBumperPosition(data.structureType || 'hanging', data.useBumpers !== false);
  const st = freeStructurePlan(data, allPanels, position);
  const panelTop = top + (st.position === 'top' && st.bumpers.length ? bumperH + 5 : 0);
  drawFreeStructure(ctx, data, allPanels, st, {
    ox: sx, oy: panelTop, cellPx, bumperH: bumperH + 5,
    numberSize: () => Math.max(6, Math.min(11, cellPx * 0.28))
  });
  drawFreeCombinedName(ctx, screen, sx + data.panelsWide * cellPx / 2, (st.position === 'top' && st.bumpers.length ? top : panelTop) - 15);
}
