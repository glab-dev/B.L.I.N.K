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
    deletedPanels: freeDataDeleted(data, grid.deleted),
    customDataLines: freeDataPathAssignments(toMap(data.customDataLineAssignments), freeActivePaths(data)),
    customDestinations: toMap(data.customDataDestinations),
    processorId: processorId,
    connectionMode: data.mx40ConnectionMode || 'direct'
  };
}

// ==================== DRAWN DATA PATHS ====================
// A drawn screen's data runs one of two ways, picked on its Data layout
// (interact/free-data-path.js), and has no data lines until one is picked:
//   data.freeDataMode = 'auto'    the grid's automatic lines (and any Assign Data Line numbers)
//                     = 'manual'  only the lines drawn by hand, Tessera-style:
//   data.freeDataPaths = [{line, panels: ["gx,gy", ...]}]   line 1-based, panels in cable order

// The drawn paths in force: Manual's only
function freeActivePaths(data) {
  return data.freeDataMode === 'manual' ? (data.freeDataPaths || []) : [];
}

// The cells the data lines skip: the cell grid's own (`deleted`), plus every panel when no
// distribution is picked yet, or every panel on no drawn path in Manual
function freeDataDeleted(data, deleted) {
  if(data.freeDataMode === 'auto') return deleted;
  const onPath = new Set(freeActivePaths(data).flatMap(p => p.panels));
  const out = new Set(deleted);
  data.freePanels.forEach(fp => { if(!onPath.has(`${fp.gx},${fp.gy}`)) out.add(`${fp.gx},${fp.gy}`); });
  return out;
}

// The custom data line map with every drawn path's panels on its line (a path wins)
function freeDataPathAssignments(custom, paths) {
  const out = new Map(custom instanceof Map ? custom : (Array.isArray(custom) ? custom : []));
  (paths || []).forEach(path => path.panels.forEach(key => out.set(key, path.line)));
  return out;
}

// Puts each drawn path's panels at the front of its line, in the order they were drawn.
// The line is the group holding the path's first panel, so it works on a split screen too.
function applyFreeDataPaths(built, paths) {
  (paths || []).forEach(path => {
    const order = new Map(path.panels.map((key, i) => [key, i]));
    const gi = built.groups.findIndex(g => g.some(pt => order.has(`${pt.c},${pt.r}`)));
    if(gi < 0) return;
    const g = built.groups[gi];
    const drawn = g.filter(pt => order.has(`${pt.c},${pt.r}`)).sort((a, b) => order.get(`${a.c},${a.r}`) - order.get(`${b.c},${b.r}`));
    built.groups[gi] = drawn.concat(g.filter(pt => !order.has(`${pt.c},${pt.r}`)));
  });
  return built;
}

// Drawn paths from a file: lines 1-based, panel keys "gx,gy", each panel on one path only
function sanitizeFreeDataPaths(paths) {
  if(!Array.isArray(paths)) return [];
  const seen = new Set();
  return paths.filter(p => p && Number.isInteger(p.line) && p.line >= 1 && Array.isArray(p.panels))
    .map(p => ({line: p.line, panels: p.panels.filter(k => typeof k === 'string' && /^\d+,\d+$/.test(k) && !seen.has(k) && seen.add(k))}))
    .filter(p => p.panels.length);
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

  // A split screen runs each part's lines on that part alone (layouts/data.js)
  const {cols, rows, deleted} = freeCellGrid(data, allPanels, 'max');
  const built = applyFreeDataPaths(buildDataLineGroups({
    pw: cols, ph: rows, panelsPerDataLine, startDir,
    deletedPanels: freeDataDeleted(data, deleted), customDataLineAssignments: freeDataPathAssignments(customDataLineAssignments, freeActivePaths(data)),
    split: data.split
  }), freeActivePaths(data));
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

// Data lines of any drawn screen from its saved data, each panel named for the line table
function freeScreenDataGroups(data, allPanels) {
  const inp = freeScreenDataInputs(data);
  if(!inp) return null;
  const built = applyFreeDataPaths(buildDataLineGroups({
    pw: inp.pw, ph: inp.ph, panelsPerDataLine: inp.panelsPerDataLine, startDir: inp.startDir,
    deletedPanels: inp.deletedPanels, customDataLineAssignments: inp.customDataLines,
    split: data.split
  }), freeActivePaths(data));
  const names = freePanelNames(data.freePanels, allPanels, data.freeCell_mm);
  built.groups.forEach(g => g.forEach(pt => { pt.label = names.get(`${pt.c},${pt.r}`); }));
  return built;
}

// Each line's panels in flow order for cable runs and the canvas overlay, keyed by 0-based
// line. col/row are the panel's centre in cells less half a cell, so the grid's
// "(col + 0.5) × cell" lands on the middle of a panel of any size.
function freeDataLinePanelOrdering(data, allPanels) {
  const built = freeScreenDataGroups(data, allPanels);
  if(!built) return {};
  const size = new Map(data.freePanels.map(fp => [`${fp.gx},${fp.gy}`, freeCells(allPanels[fp.type], data.freeCell_mm)]));
  const out = {};
  built.sortedDataLines.forEach((ln, gi) => {
    out[ln] = built.groups[gi].map(pt => {
      const {cw, ch} = size.get(`${pt.c},${pt.r}`);
      return {col: pt.c + cw / 2 - 0.5, row: pt.r + ch / 2 - 0.5, cw, ch, key: `${pt.c},${pt.r}`, label: pt.label};
    });
  });
  return out;
}

// Whether a data line's arrow runs on between two of its panels in a row ({key, cw, ch}),
// as on grid screens: touching panels, a jump within a column, and a serpentine turn into
// the next column at both columns' top or bottom, even where they end at different
// heights. A hand-drawn (Manual) line joins every panel in the order it was drawn.
function freeArrowJoiner(data, allPanels) {
  if(data.freeDataMode === 'manual') return () => true;
  const colTop = new Map(), colBottom = new Map();
  data.freePanels.forEach(fp => {
    const {cw, ch} = freeCells(allPanels[fp.type], data.freeCell_mm);
    for(let x = fp.gx; x < fp.gx + cw; x++) {
      colTop.set(x, Math.min(colTop.has(x) ? colTop.get(x) : Infinity, fp.gy));
      colBottom.set(x, Math.max(colBottom.has(x) ? colBottom.get(x) : -Infinity, fp.gy + ch - 1));
    }
  });
  const at = p => { const [gx, gy] = p.key.split(',').map(Number); return {gx, gy, cw: p.cw, ch: p.ch}; };
  const allAt = (p, test) => { for(let x = p.gx; x < p.gx + p.cw; x++) if(!test(x)) return false; return true; };
  const atTop = p => allAt(p, x => colTop.get(x) === p.gy);
  const atBottom = p => allAt(p, x => colBottom.get(x) === p.gy + p.ch - 1);
  return (pa, pb) => {
    if(freePanelsTouch(pa, pb)) return true;
    const a = at(pa), b = at(pb);
    if(a.gx < b.gx + b.cw && b.gx < a.gx + a.cw) return true;
    const beside = a.gx + a.cw === b.gx || b.gx + b.cw === a.gx;
    return beside && ((atTop(a) && atTop(b)) || (atBottom(a) && atBottom(b)));
  };
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

// Draws a drawn screen's data lines: every panel at its true size from (ox, oy) at cellPx
// a snap cell, coloured by the port its line lands on, with flow arrows between touching
// panels and the line's start label. Shared by the Draw tab and the Combined view.
// o: {screenId, groups, sortedDataLines, endpoints, ox, oy, cellPx, mirror, flip, showArrows,
//     showLabels, redundancy, sel, numberSize(w, h), arrowWidth, headSize}
function drawFreeDataPanels(ctx, data, allPanels, o) {
  const b = freeBounds(data.freePanels, allPanels, data.freeCell_mm);
  const rect = (gx, gy, cells) => {
    const x0 = o.mirror ? b.maxX - gx - cells.cw : gx;
    const x = o.ox + Math.round(x0 * o.cellPx), y = o.oy + Math.round(gy * o.cellPx);
    return {x, y, w: o.ox + Math.round((x0 + cells.cw) * o.cellPx) - x, h: o.oy + Math.round((gy + cells.ch) * o.cellPx) - y};
  };
  const lineDisplay = dataPortLineDisplayMap(o.screenId);
  const linePorts = dataPortLinePortMap(o.screenId);
  const unassigned = dataPortUnassignedLines(o.screenId);
  const shown = line => lineDisplay.has(line) ? lineDisplay.get(line) : line;
  const NO_PORT_COLORS = { fill: '#3a3a3a', text: '#bbbbbb', solid: '#777777' };
  const printColor = h => greyscalePrintMode ? toGreyscale(h) : (ecoPrintMode ? toPastelColor(h) : h);

  const startLabels = new Map();
  if(o.showLabels) {
    o.endpoints.forEach(ep => {
      const mKey = `${ep.main.c},${ep.main.r}`;
      const bKey = o.redundancy ? `${ep.backup.c},${ep.backup.r}` : null;
      if(bKey === mKey) {
        startLabels.set(mKey, {text: `${shown(ep.line)}/${shown(ep.line)}B`, color: printColor('#10b981')});
      } else {
        startLabels.set(mKey, {text: `${shown(ep.line)}`, color: printColor('#10b981')});
        if(bKey) startLabels.set(bKey, {text: `${shown(ep.line)}B`, color: printColor('#d27fc7')});
      }
    });
  }

  const size = new Map(data.freePanels.map(fp => [`${fp.gx},${fp.gy}`, freeCells(allPanels[fp.type], data.freeCell_mm)]));
  const joins = freeArrowJoiner(data, allPanels);
  // Every panel's outline first, so panels on no data line (nothing picked yet, or not yet
  // drawn in Manual) still show the wall
  const print = ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode;
  data.freePanels.forEach(fp => {
    const r = rect(fp.gx, fp.gy, size.get(`${fp.gx},${fp.gy}`));
    ctx.fillStyle = print ? '#ffffff' : '#242424';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = print ? '#000000' : '#666666';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  });
  const labelDraws = [];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  o.groups.forEach((group, gi) => {
    const line = o.sortedDataLines[gi] + 1;
    const noPort = unassigned.has(line);
    const colorNum = (linePorts.has(line) ? linePorts.get(line) : shown(line)) - 1;
    const colors = noPort ? NO_PORT_COLORS : colorForIndex(colorNum);
    const pts = [];
    group.forEach(pt => {
      const key = `${pt.c},${pt.r}`;
      const r = rect(pt.c, pt.r, size.get(key));
      ctx.fillStyle = colors.fill;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = noPort ? colors.solid : '#000000';
      ctx.lineWidth = 2;
      if(noPort) ctx.setLineDash([4, 3]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      if(noPort) ctx.setLineDash([]);
      if(o.sel && o.sel.has(key)) {
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      }
      const big = startLabels.get(key);
      if(big) {
        labelDraws.push({label: big.text, color: big.color, cx: r.x + r.w / 2, cy: r.y + r.h / 2, h: r.h, w: r.w});
      } else {
        const label = `${shown(line)}`;
        let fs = o.numberSize(r.w, r.h);
        ctx.font = `${fs}px Arial`;
        while(fs > 6 && ctx.measureText(label).width > r.w - 4) { fs--; ctx.font = `${fs}px Arial`; }
        ctx.fillStyle = noPort ? colors.text : ((colorNum % 10 === 9) ? '#FFFFFF' : '#000000');
        ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
      }
      const {cw, ch} = size.get(key);
      pts.push({x: r.x + r.w / 2, y: r.y + r.h / 2, col: pt.c + cw / 2 - 0.5, row: pt.r + ch / 2 - 0.5, cw, ch, key});
    });

    // Arrows join panels the cable runs between (freeArrowJoiner); any other jump starts
    // a new arrow
    if(o.showArrows && pts.length > 1) {
      const opts = {lineWidth: o.arrowWidth, headSize: o.headSize, hideArrowhead: o.showLabels};
      let seg = [pts[0]];
      const flush = () => { if(seg.length > 1) drawArrowPath(ctx, o.flip ? seg.slice().reverse() : seg, '#000000', opts); };
      for(let i = 1; i < pts.length; i++) {
        if(joins(pts[i - 1], pts[i])) {
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
}

// Data layout for a free screen, from the live data settings
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
  const endpoints = computeDataLineEndpoints(st.groups, st.sortedDataLines, flip);
  screens[currentScreenId].calculatedData.dataLineEndpoints = endpoints;
  drawFreeDataPanels(ctx, data, allPanels, {
    screenId: currentScreenId, groups: st.groups, sortedDataLines: st.sortedDataLines, endpoints,
    ox: 0, oy: 0, cellPx, mirror: rearView, flip,
    showArrows: showArrowsEnabled,
    showLabels: (typeof dataLineLabelsEnabled !== 'undefined') && dataLineLabelsEnabled,
    redundancy: !!data.redundancy,
    sel: pdf ? null : freeLayerSel.dataCanvas,
    numberSize: (w, h) => Math.max(10, Math.floor(Math.min(w, h) * (pdf ? 0.25 : 0.22))),
    arrowWidth: 3, headSize: 12
  });
  if(!pdf) drawFreeDataPathCues(ctx, data, allPanels);
  // Where a split screen splits, and each part's canvas and processor (layouts/data.js)
  drawSplitPartMarkers(ctx, currentScreenId, {
    offsetX: 0, offsetY: 0, panelWidth: cellPx,
    rowGeo: cb5RowGeometry(b.maxY, {top: 0, bottom: 0}, cellPx, cellPx), fontSize: 12
  });

  drawFreeLayerBox(ctx, 'dataCanvas');
  setupFreeLayerInteractivity();
}
