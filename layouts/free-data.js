// ==================== FREE-DRAW DATA ====================
// Data lines for drawn (free) screens. Like power, the grid data walk (buildDataLineGroups)
// runs on the snap-cell grid: only a panel's top-left cell is live, so lines, Assign Data
// Port and the data port plan all work on the panel keys ("gx,gy"). Lines fill by panel
// count like grid screens, sized off the panel with the most pixels so a full line can't
// go over the port whichever sizes it picks up.

let freeDataState = null;          // last calculateFreeData() result, read by the canvas

// Panels per data line: port capacity over the biggest panel's pixels, capped at 500 like
// grid screens. With nothing drawn yet it is sized off `emptyWallPixels`, the panel about
// to be drawn.
function freeSuggestedPanelsPerData(list, allPanels, capacity, emptyWallPixels) {
  const px = list.length ? Math.max(...list.map(fp => allPanels[fp.type].res_x * allPanels[fp.type].res_y)) : emptyWallPixels;
  return Math.min(500, Math.max(1, Math.floor(capacity / Math.max(1, px || 0))));
}

// resolveScreenDataInputs() for a drawn screen: the cell grid, with lines sized off its
// own panels.
function freeScreenDataInputs(data) {
  const allPanels = getAllPanels();
  if(!data.freePanels.length || !data.freePanels.every(fp => allPanels[fp.type])) return null;
  const grid = freeCellGrid(data, allPanels, 'max');
  const processorId = data.processor || 'Brompton_SX40';
  const proc = getAllProcessors()[processorId];
  const capacity = proc ? calculateAdjustedPixelCapacity(proc, data.frameRate || 60, data.bitDepth || 8) : 0;
  const userMax = parseInt(data.maxPanelsPerData) || 0;
  const toMap = v => v instanceof Map ? v : new Map(Array.isArray(v) ? v : (v && v.entries ? [...v.entries()] : []));
  return {
    pw: grid.cols, ph: grid.rows,
    panelsPerDataLine: userMax > 0 ? userMax : freeSuggestedPanelsPerData(data.freePanels, allPanels, capacity),
    startDir: data.dataStartDir || 'top',
    deletedPanels: grid.deleted,
    customDataLines: toMap(data.customDataLineAssignments),
    customDestinations: toMap(data.customDataDestinations),
    processorId: processorId,
    connectionMode: data.mx40ConnectionMode || 'direct'
  };
}

// "column.row" name for each drawn panel, like the grid's panel numbers. Its column counts
// the left edges of the panels beside it (those sharing any of its rows) up to its own,
// and its row the top edges of the panels above and below it, so a row of small panels
// under big ones numbers 1, 2, 3… instead of skipping.
function freePanelNames(list, allPanels, cellMm) {
  const boxes = list.map(fp => Object.assign({key: `${fp.gx},${fp.gy}`, gx: fp.gx, gy: fp.gy}, freeCells(allPanels[fp.type], cellMm)));
  const rank = (values, own) => new Set(values.filter(v => v <= own)).size;
  return new Map(boxes.map(a => {
    const beside = boxes.filter(b => b.gy < a.gy + a.ch && a.gy < b.gy + b.ch).map(b => b.gx);
    const aboveBelow = boxes.filter(b => b.gx < a.gx + a.cw && a.gx < b.gx + b.cw).map(b => b.gy);
    return [a.key, `${rank(beside, a.gx)}.${rank(aboveBelow, a.gy)}`];
  }));
}

// Data lines for the current free screen from the live data settings and the custom
// data line Map.
function calculateFreeData(data, allPanels) {
  const proc = getAllProcessors()[document.getElementById('processor').value];
  const frameRate = parseInt(document.getElementById('frameRate').value) || 60;
  const bitDepth = parseInt(document.getElementById('bitDepth').value) || 8;
  const capacity = proc ? calculateAdjustedPixelCapacity(proc, frameRate, bitDepth) : 0;
  const picked = allPanels[document.getElementById('panelType').value];
  const suggested = freeSuggestedPanelsPerData(data.freePanels, allPanels, capacity, picked ? picked.res_x * picked.res_y : 0);
  const userMax = parseInt(document.getElementById('maxPanelsPerData').value);
  const panelsPerDataLine = userMax > 0 ? userMax : suggested;
  const maxInput = document.getElementById('maxPanelsPerData');
  if(maxInput) maxInput.placeholder = suggested.toString();
  const startDirEl = document.getElementById('dataStartDir');
  const startDir = startDirEl ? startDirEl.value : 'top';

  const {cols, rows, deleted} = freeCellGrid(data, allPanels, 'max');
  const built = buildDataLineGroups({
    pw: cols, ph: rows, panelsPerDataLine, startDir,
    deletedPanels: deleted, customDataLineAssignments
  });
  // Named points, so the data line table lists panels the way the canvas numbers them
  const names = freePanelNames(data.freePanels, allPanels, data.freeCell_mm);
  built.groups.forEach(g => g.forEach(pt => { pt.label = names.get(`${pt.c},${pt.r}`); }));
  freeDataState = {
    groups: built.groups, sortedDataLines: built.sortedDataLines,
    panelsPerDataLine, suggested, capacity, frameRate, bitDepth, startDir,
    dataLines: built.sortedDataLines.length
  };
  return freeDataState;
}

// Each line's panels in flow order for cable runs and the canvas overlay, keyed by 0-based
// line. col/row are the panel's centre in cells less half a cell, so the grid's
// "(col + 0.5) × cell" lands on the middle of a panel of any size.
function freeDataLinePanelOrdering(data, allPanels) {
  const inp = freeScreenDataInputs(data);
  if(!inp) return {};
  const built = buildDataLineGroups({
    pw: inp.pw, ph: inp.ph, panelsPerDataLine: inp.panelsPerDataLine, startDir: inp.startDir,
    deletedPanels: inp.deletedPanels, customDataLineAssignments: inp.customDataLines
  });
  const size = new Map(data.freePanels.map(fp => [`${fp.gx},${fp.gy}`, freeCells(allPanels[fp.type], data.freeCell_mm)]));
  const names = freePanelNames(data.freePanels, allPanels, data.freeCell_mm);
  const out = {};
  built.sortedDataLines.forEach((ln, gi) => {
    out[ln] = built.groups[gi].map(pt => {
      const {cw, ch} = size.get(`${pt.c},${pt.r}`);
      return {col: pt.c + cw / 2 - 0.5, row: pt.r + ch / 2 - 0.5, cw, ch, key: `${pt.c},${pt.r}`, label: names.get(`${pt.c},${pt.r}`)};
    });
  });
  return out;
}

// Two panels from freeDataLinePanelOrdering() share an edge
function freePanelsTouch(a, b) {
  const dx = Math.abs(a.col - b.col), dy = Math.abs(a.row - b.row);
  const w = (a.cw + b.cw) / 2, h = (a.ch + b.ch) / 2;
  return (Math.abs(dx - w) < 0.01 && dy < h - 0.01) || (Math.abs(dy - h) < 0.01 && dx < w - 0.01);
}

// Data cross jumpers and Cat5 couplers for a drawn wall: calcDataCrossJumpers() for
// panels of any size. Every step along a line to a touching panel in another column is a
// crossing. Panels with their cables attached join a crossing in the top half of the wall
// with a coupler, and take one where a main line starts or a backup line ends up there.
function freeDataCrossJumpers(data, p, ordering, rows) {
  const redundancy = data.redundancy !== false;
  const inTopHalf = pt => pt.row + 0.5 < rows / 2;
  let crossings = 0, topCrossings = 0, feedCouplers = 0;
  Object.values(ordering).forEach(pts => {
    for(let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const sameColumn = Math.abs(a.col - b.col) < (a.cw + b.cw) / 2 - 0.01;
      if(sameColumn || !freePanelsTouch(a, b)) continue;
      crossings++;
      if(inTopHalf(a)) topCrossings++;
    }
    if(inTopHalf(pts[0])) feedCouplers++;
    if(redundancy && inTopHalf(pts[pts.length - 1])) feedCouplers++;
  });
  return {
    crossJumperCount: p.jumpers_builtin ? (crossings - topCrossings) : crossings,
    cat5CouplerCount: p.jumpers_builtin ? (topCrossings + feedCouplers) : 0
  };
}

// Data layout for a free screen: every panel at its true size, coloured by the port its
// line lands on, with flow arrows between touching panels and the line's start label.
function renderFreeDataLayout() {
  const data = screens[currentScreenId].data;
  const allPanels = getAllPanels();
  const canvas = document.getElementById('dataCanvas');
  const container = document.getElementById('dataContainer');
  const ctx = canvas.getContext('2d');
  const isSimpleMode = typeof currentAppMode !== 'undefined' && currentAppMode === 'simple';
  if(!isSimpleMode) {
    container.style.display = 'block';
  }
  const st = freeDataState;
  const b = freeBounds(data.freePanels, allPanels, data.freeCell_mm);
  if(!st || !b) {
    canvas.width = 0;
    canvas.height = 0;
    return;
  }

  const containerWidth = container.clientWidth - 32; // Account for padding
  const pdf = typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode;
  const maxCanvasWidth = pdf ? Math.min(containerWidth, 4000) : Math.min(containerWidth, 800);
  const cellM = data.freeCell_mm / 1000;
  const pxPerM = Math.max(30, Math.min(80, Math.floor(maxCanvasWidth / (b.maxX * cellM))));
  const cellPx = pxPerM * cellM;
  canvas.width = Math.round(b.maxX * cellPx);
  canvas.height = Math.round(b.maxY * cellPx);
  const rearView = (typeof dataRearViewEnabled !== 'undefined') && dataRearViewEnabled;
  freeLayerView.dataCanvas = {cellPx, cols: b.maxX, mirror: rearView};

  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const flip = (typeof dataFlipEnabled !== 'undefined') && dataFlipEnabled;
  const showLabels = (typeof dataLineLabelsEnabled !== 'undefined') && dataLineLabelsEnabled;
  const redundancy = !!data.redundancy;
  const endpoints = computeDataLineEndpoints(st.groups, st.sortedDataLines, flip);
  screens[currentScreenId].calculatedData.dataLineEndpoints = endpoints;

  const lineDisplay = dataPortLineDisplayMap(currentScreenId);
  const linePorts = dataPortLinePortMap(currentScreenId);
  const unassigned = dataPortUnassignedLines(currentScreenId);
  const shown = line => lineDisplay.has(line) ? lineDisplay.get(line) : line;
  const NO_PORT_COLORS = { fill: '#3a3a3a', text: '#bbbbbb', solid: '#777777' };
  const printColor = h => greyscalePrintMode ? toGreyscale(h) : (ecoPrintMode ? toPastelColor(h) : h);

  const startLabels = new Map();
  if(showLabels) {
    endpoints.forEach(ep => {
      const mKey = `${ep.main.c},${ep.main.r}`;
      const bKey = redundancy ? `${ep.backup.c},${ep.backup.r}` : null;
      if(bKey === mKey) {
        startLabels.set(mKey, {text: `${shown(ep.line)}/${shown(ep.line)}B`, color: printColor('#10b981')});
      } else {
        startLabels.set(mKey, {text: `${shown(ep.line)}`, color: printColor('#10b981')});
        if(bKey) startLabels.set(bKey, {text: `${shown(ep.line)}B`, color: printColor('#d27fc7')});
      }
    });
  }

  const size = new Map(data.freePanels.map(fp => [`${fp.gx},${fp.gy}`, freeCells(allPanels[fp.type], data.freeCell_mm)]));
  const sel = freeLayerSel.dataCanvas;
  const labelDraws = [];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  st.groups.forEach((group, gi) => {
    const line = st.sortedDataLines[gi] + 1;
    const noPort = unassigned.has(line);
    const colorNum = (linePorts.has(line) ? linePorts.get(line) : shown(line)) - 1;
    const colors = noPort ? NO_PORT_COLORS : colorForIndex(colorNum);
    const pts = [];
    group.forEach(pt => {
      const key = `${pt.c},${pt.r}`;
      const r = freeLayerRect('dataCanvas', pt.c, pt.r, size.get(key));
      ctx.fillStyle = colors.fill;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = noPort ? colors.solid : '#000000';
      ctx.lineWidth = 2;
      if(noPort) ctx.setLineDash([4, 3]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      if(noPort) ctx.setLineDash([]);
      if(sel.has(key)) {
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      }
      const big = startLabels.get(key);
      if(big) {
        labelDraws.push({label: big.text, color: big.color, cx: r.x + r.w / 2, cy: r.y + r.h / 2, h: r.h, w: r.w});
      } else {
        const label = `${shown(line)}`;
        let fs = Math.max(10, Math.floor(Math.min(r.w, r.h) * (pdf ? 0.25 : 0.22)));
        ctx.font = `${fs}px Arial`;
        while(fs > 6 && ctx.measureText(label).width > r.w - 4) { fs--; ctx.font = `${fs}px Arial`; }
        ctx.fillStyle = noPort ? colors.text : ((colorNum % 10 === 9) ? '#FFFFFF' : '#000000');
        ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
      }
      const {cw, ch} = size.get(key);
      pts.push({x: r.x + r.w / 2, y: r.y + r.h / 2, col: pt.c + cw / 2 - 0.5, row: pt.r + ch / 2 - 0.5, cw, ch});
    });

    // Arrows run between touching panels; a jump across a gap starts a new arrow
    if(showArrowsEnabled && pts.length > 1) {
      const opts = {lineWidth: 3, headSize: 12, hideArrowhead: showLabels};
      let seg = [pts[0]];
      const flush = () => { if(seg.length > 1) drawArrowPath(ctx, flip ? seg.slice().reverse() : seg, '#000000', opts); };
      for(let i = 1; i < pts.length; i++) {
        if(freePanelsTouch(pts[i - 1], pts[i])) {
          seg.push(pts[i]);
        } else {
          flush();
          seg = [pts[i]];
        }
      }
      flush();
    }
  });

  // Start labels on top of the arrows, one size for all, like the grid data layout
  if(labelDraws.length) {
    ctx.save();
    let fs = Math.floor(Math.min(...labelDraws.map(l => l.h)) * 0.5);
    const narrowest = Math.min(...labelDraws.map(l => l.w));
    ctx.font = `bold ${fs}px Arial`;
    const widest = Math.max(...labelDraws.map(l => ctx.measureText(l.label).width));
    if(widest > narrowest * 0.85) {
      fs = Math.max(8, Math.floor(fs * narrowest * 0.85 / widest));
      ctx.font = `bold ${fs}px Arial`;
    }
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2.5, fs * 0.18);
    labelDraws.forEach(l => {
      ctx.strokeStyle = '#000000';
      ctx.strokeText(l.label, l.cx, l.cy);
      ctx.fillStyle = l.color;
      ctx.fillText(l.label, l.cx, l.cy);
    });
    ctx.restore();
  }

  drawFreeLayerBox(ctx, 'dataCanvas');
  setupFreeLayerInteractivity();
}
