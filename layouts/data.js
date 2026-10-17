// ==================== DATA LAYOUT RENDERER ====================
// Renders the data (port/line grouping) layout view with serpentine arrows.
// Called by generateLayout() dispatcher in index.html.
//
// Split into param-driven pieces so the Combined view (nav/combined.js) can draw
// the exact same layout for each screen instead of forking the logic — the same
// pattern drawSocaOverlay() uses for the power layout (layouts/power.js).

// ==================== SPLIT SCREENS ====================
// A screen split across processors (data.split, see nav/canvas.js) never runs a data line
// over the split: each part is a separate processor input, so its lines are worked out on
// that part alone and start fresh. The parts are then stitched back with their line
// numbers carrying on (part 1 lines 1..n, part 2 from n+1) so every line stays unique on
// the screen; the data plan starts each part on its own processor.

// The parts of a split screen as sub-grids, in part order (across, then down)
function splitDataParts(split) {
  const sum = arr => arr.reduce((a, b) => a + b, 0);
  return split.parts.map((part, k) => {
    const ci = k % split.cols.length, ri = Math.floor(k / split.cols.length);
    return { k: k, c0: sum(split.cols.slice(0, ci)), r0: sum(split.rows.slice(0, ri)),
             pw: split.cols[ci], ph: split.rows[ri] };
  });
}

// A "c,r"-keyed Set or Map narrowed to one part, keys moved to the part's own origin
function narrowToSplitPart(coll, part) {
  const move = key => {
    const [c, r] = String(key).split(',').map(Number);
    const pc = c - part.c0, pr = r - part.r0;
    return (pc >= 0 && pc < part.pw && pr >= 0 && pr < part.ph) ? `${pc},${pr}` : null;
  };
  if(coll instanceof Map) {
    const out = new Map();
    coll.forEach((v, key) => { const nk = move(key); if(nk) out.set(nk, v); });
    return out;
  }
  const out = new Set();
  (coll || []).forEach(key => { const nk = move(key); if(nk) out.add(nk); });
  return out;
}

// buildDataLineGroups for a split screen: each part on its own, then stitched back
function buildSplitDataLineGroups(o) {
  const groups = [], sortedDataLines = [], usedCustomDataLines = new Set(), panelToDataLine = new Map();
  const lineOrder = [];
  let offset = 0;
  splitDataParts(o.split).forEach(part => {
    const sub = buildDataLineGroups(Object.assign({}, o, {
      split: null, pw: part.pw, ph: part.ph,
      deletedPanels: narrowToSplitPart(o.deletedPanels, part),
      customDataLineAssignments: narrowToSplitPart(o.customDataLineAssignments, part)
    }));
    sub.sortedDataLines.forEach((ln, gi) => {
      groups.push(sub.groups[gi].map(pt => ({c: pt.c + part.c0, r: pt.r + part.r0})));
      sortedDataLines.push(ln + offset);
    });
    sub.usedCustomDataLines.forEach(ln => usedCustomDataLines.add(ln + offset));
    sub.lineOrder.forEach(ln => lineOrder.push(ln + offset));
    sub.panelToDataLine.forEach((ln, key) => {
      const [c, r] = key.split(',').map(Number);
      panelToDataLine.set(`${c + part.c0},${r + part.r0}`, ln + offset);
    });
    if(sub.sortedDataLines.length) offset += Math.max(...sub.sortedDataLines) + 1;
  });
  return {groups, sortedDataLines, usedCustomDataLines, panelToDataLine, lineOrder};
}

// ==================== DATA LINE GROUPING ====================
// Walks the wall in serpentine order and groups panels into data lines.
// Pure: takes the per-screen deletedPanels Set / customDataLineAssignments Map as
// params rather than reading the current-screen globals. Pass o.split for a split screen.
function buildDataLineGroups(o) {
  if(o.split) return buildSplitDataLineGroups(o);
  const {pw, ph, panelsPerDataLine, startDir, deletedPanels, customDataLineAssignments} = o;

  // Build data path based on start direction (matching calculateActualDataLines logic)
  const serp = [];

  if(startDir === 'all_top') {
    // All columns start at top (going down)
    for(let c=0; c<pw; c++){
      for(let r=0; r<ph; r++) {
        const panelKey = `${c},${r}`;
        if(!deletedPanels.has(panelKey)) {
          serp.push({c, r});
        }
      }
    }
  } else if(startDir === 'all_bottom') {
    // All columns start at bottom (going up)
    for(let c=0; c<pw; c++){
      for(let r=ph-1; r>=0; r--) {
        const panelKey = `${c},${r}`;
        if(!deletedPanels.has(panelKey)) {
          serp.push({c, r});
        }
      }
    }
  } else {
    // Serpentine pattern (for 'top' and 'bottom')
    // Build serpentine path that respects data line boundaries
    const startFromTop = (startDir==='top');

    let panelsInCurrentDataLine = 0;
    let currentDataLine = 0;
    let currentColumn = 0;
    let serpentineGoingDown = startFromTop; // Initial direction
    let lastDataLineEndedAtBoundary = true; // First data line starts fresh

    while(currentColumn < pw) {
      // A fully-deleted column has no panels to traverse. Advance past it WITHOUT
      // toggling serpentine direction — toggling on a gap flips the next column's
      // arrows the wrong way (the down/up snake skips a beat across the deletion).
      let columnHasPanels = false;
      for(let r=0; r<ph; r++) {
        if(!deletedPanels.has(`${currentColumn},${r}`)) { columnHasPanels = true; break; }
      }
      if(!columnHasPanels) { currentColumn++; continue; }

      // Count non-deleted, non-custom panels in this column
      let panelsInColumn = 0;
      for(let r=0; r<ph; r++) {
        const panelKey = `${currentColumn},${r}`;
        if(!deletedPanels.has(panelKey) && !customDataLineAssignments.has(panelKey)) {
          panelsInColumn++;
        }
      }

      // Check if adding this entire column would exceed the data line limit
      if(panelsInCurrentDataLine > 0 && panelsInCurrentDataLine + panelsInColumn > panelsPerDataLine) {
        // This column will cause a split - need to add partial column
        const panelsWeCanAdd = panelsPerDataLine - panelsInCurrentDataLine;

        // Track the actual row position where we stopped (not just the count)
        let lastRowProcessed = -1;

        if(panelsWeCanAdd > 0) {
          // Add partial column to current data line
          if(serpentineGoingDown) {
            // Going down - add from top
            let added = 0;
            for(let r=0; r<ph && added<panelsWeCanAdd; r++) {
              const panelKey = `${currentColumn},${r}`;
              if(!deletedPanels.has(panelKey)) {
                serp.push({c: currentColumn, r: r});
                added++;
                lastRowProcessed = r;
              }
            }
            // Data line ends mid-column, not at boundary
            lastDataLineEndedAtBoundary = false;
          } else {
            // Going up - add from bottom
            let added = 0;
            for(let r=ph-1; r>=0 && added<panelsWeCanAdd; r--) {
              const panelKey = `${currentColumn},${r}`;
              if(!deletedPanels.has(panelKey)) {
                serp.push({c: currentColumn, r: r});
                added++;
                lastRowProcessed = r;
              }
            }
            // Data line ends mid-column, not at boundary
            lastDataLineEndedAtBoundary = false;
          }
        }

        // Start new data line
        currentDataLine++;
        panelsInCurrentDataLine = 0;

        // If previous data line ended mid-column, continue serpentine in same direction
        // If it ended at boundary, start fresh serpentine
        if(!lastDataLineEndedAtBoundary) {
          // Continue in same column, same direction
          // Don't toggle direction, don't move to next column yet
          // The remaining panels in this column will be added in next iteration
          // But we need to continue adding panels from this column
          const remainingPanels = panelsInColumn - panelsWeCanAdd;

          if(serpentineGoingDown) {
            // Continue going down from where we left off (next row after lastRowProcessed)
            let added = 0;
            for(let r=lastRowProcessed+1; r<ph && added<Math.min(remainingPanels, panelsPerDataLine); r++) {
              const panelKey = `${currentColumn},${r}`;
              if(!deletedPanels.has(panelKey)) {
                serp.push({c: currentColumn, r: r});
                panelsInCurrentDataLine++;
                added++;
              }
            }
          } else {
            // Continue going up from where we left off (previous row before lastRowProcessed)
            let added = 0;
            for(let r=lastRowProcessed-1; r>=0 && added<Math.min(remainingPanels, panelsPerDataLine); r--) {
              const panelKey = `${currentColumn},${r}`;
              if(!deletedPanels.has(panelKey)) {
                serp.push({c: currentColumn, r: r});
                panelsInCurrentDataLine++;
                added++;
              }
            }
          }

          // Check if we finished this column
          if(panelsInCurrentDataLine >= remainingPanels) {
            // Finished column, move to next and toggle direction
            currentColumn++;
            serpentineGoingDown = !serpentineGoingDown;

            // Check if this column ended at a boundary
            if(serpentineGoingDown) {
              // Was going up, now going down - ended at top (boundary)
              lastDataLineEndedAtBoundary = true;
            } else {
              // Was going down, now going up - ended at bottom (boundary)
              lastDataLineEndedAtBoundary = true;
            }
          }
          // If we didn't finish the column, we'll continue it in the next data line iteration
          continue;
        } else {
          // Previous data line ended at boundary - start fresh serpentine
          // Reset direction based on start preference
          serpentineGoingDown = startFromTop;
          // Don't increment column - we still need to process this column
        }
      } else {
        // Entire column fits in current data line
        if(serpentineGoingDown) {
          // Going down
          for(let r=0; r<ph; r++) {
            const panelKey = `${currentColumn},${r}`;
            if(!deletedPanels.has(panelKey)) {
              serp.push({c: currentColumn, r: r});
              panelsInCurrentDataLine++;
            }
          }
          // Ended at bottom of column - this is a boundary
          lastDataLineEndedAtBoundary = true;
        } else {
          // Going up
          for(let r=ph-1; r>=0; r--) {
            const panelKey = `${currentColumn},${r}`;
            if(!deletedPanels.has(panelKey)) {
              serp.push({c: currentColumn, r: r});
              panelsInCurrentDataLine++;
            }
          }
          // Ended at top of column - this is a boundary
          lastDataLineEndedAtBoundary = true;
        }

        // Move to next column and toggle direction
        currentColumn++;
        serpentineGoingDown = !serpentineGoingDown;
      }
    }
  }

  // Group into data lines with support for custom assignments
  // Build ordered list of all panels
  const orderedDataPanels = [];
  serp.forEach(panel => {
    const panelKey = `${panel.c},${panel.r}`;
    orderedDataPanels.push({
      c: panel.c,
      r: panel.r,
      key: panelKey,
      isCustom: customDataLineAssignments.has(panelKey),
      customDataLine: customDataLineAssignments.has(panelKey) ? customDataLineAssignments.get(panelKey) - 1 : null
    });
  });

  // Collect all custom data line numbers in use
  const usedCustomDataLines = new Set();
  orderedDataPanels.forEach(p => {
    if(p.isCustom) {
      usedCustomDataLines.add(p.customDataLine);
    }
  });

  // Assign data line numbers
  const panelToDataLine = new Map();
  let autoDataLineCounter = 0;
  let panelsInCurrentAutoDataLine = 0;

  // Special handling for all_top and all_bottom - each column is its own data line
  if(startDir === 'all_top' || startDir === 'all_bottom') {
    let currentColumn = -1;
    let columnDataLine = 0;

    orderedDataPanels.forEach(panel => {
      if(panel.isCustom) {
        // Keep custom assignment
        panelToDataLine.set(panel.key, panel.customDataLine);
      } else {
        // Check if we've moved to a new column
        if(panel.c !== currentColumn) {
          // Moving to new column - get next available data line
          if(currentColumn >= 0) {
            // Not the first column, so increment
            columnDataLine++;
          }
          currentColumn = panel.c;

          // Find next available data line number (skip over custom assignments)
          while(usedCustomDataLines.has(columnDataLine)) {
            columnDataLine++;
          }
        }

        // All panels in this column use the same data line
        panelToDataLine.set(panel.key, columnDataLine);
      }
    });
  } else {
    // Normal serpentine: split by panelsPerDataLine
    orderedDataPanels.forEach(panel => {
      if(panel.isCustom) {
        // Keep custom assignment
        panelToDataLine.set(panel.key, panel.customDataLine);
      } else {
        // Find next available data line number (skip over custom assignments)
        while(usedCustomDataLines.has(autoDataLineCounter)) {
          autoDataLineCounter++;
        }

        // Auto-assign to current data line
        panelToDataLine.set(panel.key, autoDataLineCounter);
        panelsInCurrentAutoDataLine++;

        // Move to next data line when we reach the limit
        if(panelsInCurrentAutoDataLine >= panelsPerDataLine) {
          autoDataLineCounter++;
          panelsInCurrentAutoDataLine = 0;

          // Skip over any custom data lines
          while(usedCustomDataLines.has(autoDataLineCounter)) {
            autoDataLineCounter++;
          }
        }
      }
    });
  }

  // Build groups based on data line assignments
  const dataLineGroups = new Map();
  orderedDataPanels.forEach(panel => {
    const dataLine = panelToDataLine.get(panel.key);
    if(!dataLineGroups.has(dataLine)) {
      dataLineGroups.set(dataLine, []);
    }
    dataLineGroups.get(dataLine).push({c: panel.c, r: panel.r});
  });

  // Convert to array sorted by data line number
  const groups = [];
  const sortedDataLines = Array.from(dataLineGroups.keys()).sort((a, b) => a - b);
  sortedDataLines.forEach(dataLine => {
    groups.push(dataLineGroups.get(dataLine));
  });

  // Re-order CUSTOM circuits into a clean serpentine that obeys the data start
  // direction (auto lines keep their serp-derived order untouched). This makes
  // irregular custom shapes (e.g. goal-post strips) start at the correct end and
  // flow continuously instead of entering at the bottom or fragmenting.
  for(let gi=0; gi<groups.length; gi++){
    if(usedCustomDataLines.has(sortedDataLines[gi])) {
      groups[gi] = orderDataLineFlow(groups[gi], startDir);
    }
  }

  // Lines in the order the walk reaches them — the order they run along the wall,
  // whatever numbers custom assignments gave them
  const lineOrder = Array.from(dataLineGroups.keys());

  return {groups, sortedDataLines, usedCustomDataLines, panelToDataLine, lineOrder};
}

// ==================== DATA LINE ENDPOINTS ====================
// First = first panel in flow order; last = the other end. The main cable feeds
// the start of the flow and the backup the opposite end — so when Flip reverses
// the flow direction, main/backup swap ends too.
function computeDataLineEndpoints(groups, sortedDataLines, flip) {
  return sortedDataLines.map((ln, gi) => {
    const first = groups[gi][0];
    const last = groups[gi][groups[gi].length - 1];
    return {
      line: ln + 1,
      main: flip ? last : first,
      backup: flip ? first : last
    };
  });
}

// ==================== DATA OVERLAY DRAWING ====================
// Draws the panels, flow arrows and data-line start labels for one wall.
// Works in cell coordinates offset by offsetX/offsetY, so the Complex canvas
// (offset 0,0) and each screen on the Combined canvas share this one path.
function drawDataOverlay(ctx, o) {
  const {
    groups, sortedDataLines, endpoints, deletedPanels, startDir,
    pw, ph, panelWidth, rowGeo,
    offsetX, offsetY, rearView, flip, showArrows, showLabels, redundancy,
    panelFontSize, arrowLineWidth, arrowHeadSize, lightDeletedPanels
  } = o;
  // Optional Map(trueLine -> displayed number). The data layout numbers lines by
  // the port they land on; without it the raw line numbers are used.
  const _lineDisplay = (o.lineDisplay instanceof Map) ? o.lineDisplay : null;
  const _shown = (line) => (_lineDisplay && _lineDisplay.has(line)) ? _lineDisplay.get(line) : line;

  // Rear view = mirror the draw x-coordinate horizontally (visual only; data
  // assignments are unchanged). Labels stay upright and arrows mirror because
  // their points inherit the mirrored x.
  const drawX = (c) => (rearView ? (pw - 1 - c) : c) * panelWidth + offsetX;
  const drawY = (r) => offsetY + rowGeo.y(r);
  const rowHeight = (r) => rowGeo.h(r);

  ctx.font = `${panelFontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // When the overlay toggle is on, map each start panel to its label ("N" main / "NB" backup).
  // Print modes (eco/greyscale PDF) convert label colors like the panel fills do.
  const _printColor = (h) => (typeof greyscalePrintMode !== 'undefined' && greyscalePrintMode) ? toGreyscale(h)
                   : ((typeof ecoPrintMode !== 'undefined' && ecoPrintMode) ? toPastelColor(h) : h);
  const MAIN_LABEL_COLOR = _printColor('#10b981');   // app green (--primary)
  const BACKUP_LABEL_COLOR = _printColor('#d27fc7'); // muted magenta (same tone family)
  const lineLabelMap = new Map();
  if (showLabels) {
    endpoints.forEach(ep => {
      const mKey = ep.main ? `${ep.main.c},${ep.main.r}` : null;
      const bKey = (redundancy && ep.backup) ? `${ep.backup.c},${ep.backup.r}` : null;
      const shown = _shown(ep.line);
      if (mKey && bKey && mKey === bKey) {
        lineLabelMap.set(mKey, { text: `${shown}/${shown}B`, color: MAIN_LABEL_COLOR }); // single-panel line shares the panel
      } else {
        if (mKey) lineLabelMap.set(mKey, { text: `${shown}`, color: MAIN_LABEL_COLOR });
        if (bKey) lineLabelMap.set(bKey, { text: `${shown}B`, color: BACKUP_LABEL_COLOR });
      }
    });
  }

  // Draw all panels first (including deleted)
  for(let c=0;c<pw;c++){
    for(let r=0;r<ph;r++){
      const panelKey = `${c},${r}`;

      // Check if panel is deleted
      if(deletedPanels.has(panelKey)) {
        const x = drawX(c);
        const y = drawY(r);
        ctx.fillStyle = lightDeletedPanels ? '#ffffff' : '#1a1a1a';
        ctx.fillRect(x,y,panelWidth,rowHeight(r));
        ctx.strokeStyle = lightDeletedPanels ? '#cccccc' : '#333333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x,y,panelWidth,rowHeight(r));
        ctx.setLineDash([]);
      }
    }
  }

  // Draw active panels with data grouping
  const groupPoints = [];
  const bigLabelDraws = []; // deferred so all labels share one uniform font size and render ON TOP OF the arrows
  for(let gi=0; gi<groups.length; gi++){
    // Colour follows the displayed number, so the same port reads the same colour
    // on every screen sharing that unit.
    const dataLineNum = _shown(sortedDataLines[gi] + 1) - 1;
    const colors=colorForIndex(dataLineNum);
    groupPoints[gi] = [];
    for(let idx=0; idx<groups[gi].length; idx++){
      const pnt = groups[gi][idx];

      const currentPanelHeight = rowHeight(pnt.r);
      const x = drawX(pnt.c);
      const y = drawY(pnt.r);

      ctx.fillStyle=colors.fill;
      ctx.fillRect(x,y,panelWidth,currentPanelHeight);
      ctx.strokeStyle='#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x,y,panelWidth,currentPanelHeight);

      const _bigLabel = lineLabelMap.get(`${pnt.c},${pnt.r}`);
      if (_bigLabel) {
        // Defer the big start-label so all labels can share one uniform font size,
        // drawn below (under the arrows, so the lines/arrows stay visible)
        bigLabelDraws.push({ label: _bigLabel.text, color: _bigLabel.color, cx: x + panelWidth/2, cy: y + currentPanelHeight/2, h: currentPanelHeight });
      } else {
        // Use white text only for data line 9 (black resistor color), black text for all others
        ctx.fillStyle = (dataLineNum % 10 === 9) ? '#FFFFFF' : '#000000';
        // Show panel number as column.row (matching standard layout)
        ctx.fillText(`${pnt.c+1}.${pnt.r+1}`, x+panelWidth/2, y+currentPanelHeight/2);
      }
      groupPoints[gi].push({x:x+panelWidth/2, y:y+currentPanelHeight/2, color: colors.solid});
    }
  }

  if(showArrows){
    const arrowOpts = { lineWidth: arrowLineWidth, headSize: arrowHeadSize, hideArrowhead: showLabels };
    if(startDir === 'all_top' || startDir === 'all_bottom') {
      // For all_top and all_bottom, draw one arrow per column
      // Group points by column
      for(let gi=0; gi<groupPoints.length; gi++){
        const pts = groupPoints[gi];
        if(pts.length<2) continue;

        // Group points by column
        const columnGroups = new Map();
        groups[gi].forEach((pnt, idx) => {
          if(!columnGroups.has(pnt.c)) {
            columnGroups.set(pnt.c, []);
          }
          columnGroups.get(pnt.c).push(pts[idx]);
        });

        // Draw arrow for each column
        columnGroups.forEach((columnPoints) => {
          if(columnPoints.length >= 2) {
            const arrowPts = flip ? [...columnPoints].reverse() : columnPoints;
            drawArrowPath(ctx, arrowPts, '#000000', arrowOpts);
          }
        });
      }
    } else {
      // For serpentine patterns, only draw arrows between ADJACENT panels in same data line
      // Build segments of continuous adjacent panels
      // Top-most / bottom-most live row of each column — a serpentine turn happens
      // at a column's effective end, which moves when edge panels are deleted.
      const colTop = [], colBottom = [];
      for(let c=0; c<pw; c++){
        for(let r=0; r<ph; r++){
          if(deletedPanels.has(`${c},${r}`)) continue;
          if(colTop[c] === undefined) colTop[c] = r;
          colBottom[c] = r;
        }
      }
      for(let gi=0; gi<groupPoints.length; gi++){
        const pts = groupPoints[gi];
        const grp = groups[gi];
        if(pts.length<2) continue;

        // Build segments - break when panels are not adjacent
        const segments = [];
        let currentSegment = [pts[0]];

        for(let i=1; i<pts.length; i++){
          const prev = grp[i-1];
          const curr = grp[i];

          // Check if current panel is adjacent to previous (within same column or adjacent columns)
          const colDiff = Math.abs(curr.c - prev.c);
          const rowDiff = Math.abs(curr.r - prev.r);

          // Adjacent means: same column (any row), or adjacent columns at a serpentine
          // turn. A turn is a same-row horizontal step (rowDiff===0) — this catches turns
          // at a column's effective bottom (e.g. a 2-row strip turning at row 1, where the
          // rows below are deleted), not just the full-grid top/bottom boundary.
          const isAdjacent = (colDiff === 0) || // same column
                             (colDiff === 1 && (rowDiff === 0 || prev.r === 0 || prev.r === ph-1 || curr.r === 0 || curr.r === ph-1 ||
                               (prev.r === colTop[prev.c] && curr.r === colTop[curr.c]) ||
                               (prev.r === colBottom[prev.c] && curr.r === colBottom[curr.c]))); // adjacent column at turn

          if(isAdjacent) {
            currentSegment.push(pts[i]);
          } else {
            // Not adjacent - finish current segment and start new one
            if(currentSegment.length >= 2) {
              segments.push(currentSegment);
            }
            currentSegment = [pts[i]];
          }
        }

        // Add final segment
        if(currentSegment.length >= 2) {
          segments.push(currentSegment);
        }

        // Draw each segment
        segments.forEach(segment => {
          const arrowPts = flip ? [...segment].reverse() : segment;
          drawArrowPath(ctx, arrowPts, '#000000', arrowOpts);
        });
      }
    }
  }

  // Draw the deferred data-line start labels ON TOP of the lines so they stay
  // readable (the end arrowheads are hidden while labels are on — see
  // drawArrowPath). All labels share one uniform font size: base it on the
  // smallest labelled panel (so none overflow vertically), shrink to fit the
  // widest label horizontally, then apply that single size to every label.
  if (bigLabelDraws.length) {
    ctx.save();
    const _minLabelH = Math.min.apply(null, bigLabelDraws.map(function(b){ return b.h; }));
    let _fs = Math.floor(_minLabelH * 0.5);
    ctx.font = `bold ${_fs}px Arial`;
    let _widest = bigLabelDraws[0].label;
    bigLabelDraws.forEach(function(b){
      if (ctx.measureText(b.label).width > ctx.measureText(_widest).width) _widest = b.label;
    });
    while (_fs > 8 && ctx.measureText(_widest).width > panelWidth * 0.85) {
      _fs -= 1;
      ctx.font = `bold ${_fs}px Arial`;
    }
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2.5, _fs * 0.18);
    bigLabelDraws.forEach(function(bl){
      ctx.strokeStyle = '#000000';
      ctx.strokeText(bl.label, bl.cx, bl.cy);
      ctx.fillStyle = bl.color;
      ctx.fillText(bl.label, bl.cx, bl.cy);
    });
    ctx.restore();
  }
}

function renderDataLayout(params) {
  const {pw, ph, panelWidth, rowGeo, canvas, ctx, panelsPerDataLine, startDir, showArrows, fontSize} = params;

  const {groups, sortedDataLines} = buildDataLineGroups({
    pw, ph, panelsPerDataLine, startDir,
    deletedPanels, customDataLineAssignments,
    split: (typeof screens !== 'undefined' && screens[currentScreenId]) ? screens[currentScreenId].data.split : null
  });

  const _flip = (typeof dataFlipEnabled !== 'undefined') && dataFlipEnabled;
  const dataLineEndpoints = computeDataLineEndpoints(groups, sortedDataLines, _flip);

  // Stash per-screen so the in-app table and PDF table use the exact same mapping as drawn.
  if (typeof screens !== 'undefined' && screens[currentScreenId]) {
    if (!screens[currentScreenId].calculatedData) screens[currentScreenId].calculatedData = {};
    screens[currentScreenId].calculatedData.dataLineEndpoints = dataLineEndpoints;
  }

  drawDataOverlay(ctx, {
    groups, sortedDataLines, endpoints: dataLineEndpoints,
    lineDisplay: (typeof dataPortLineDisplayMap === 'function') ? dataPortLineDisplayMap(currentScreenId) : null,
    deletedPanels,
    pw, ph, panelWidth, rowGeo,
    offsetX: 0, offsetY: 0,
    startDir,
    rearView: (typeof dataRearViewEnabled !== 'undefined') && dataRearViewEnabled,
    flip: _flip,
    showArrows,
    showLabels: (typeof dataLineLabelsEnabled !== 'undefined') && dataLineLabelsEnabled,
    redundancy: !!(screens[currentScreenId] && screens[currentScreenId].data && screens[currentScreenId].data.redundancy),
    panelFontSize: fontSize,
    arrowLineWidth: 3,
    arrowHeadSize: 12,
    lightDeletedPanels: (ecoPrintMode || greyscalePrintMode)
  });

  drawSplitPartMarkers(ctx, currentScreenId, { offsetX: 0, offsetY: 0, panelWidth, rowGeo, fontSize });
}

// ==================== SPLIT PART MARKERS ====================
// A split screen's data layout shows where it splits — a dashed line between the parts —
// and, over each part, the canvas and processor that part goes to ("Canvas 2 · SX40 2").
// The processor is the one the data plan put the part's first line on.
function drawSplitPartMarkers(ctx, screenId, o) {
  const screen = screens[screenId];
  const split = screen && screen.data.split;
  if(!split) return;
  const {offsetX, offsetY, panelWidth, rowGeo} = o;
  const fontSize = Math.max(10, o.fontSize || 12);
  const isPrint = (typeof pdfWhiteBgMode !== 'undefined' && pdfWhiteBgMode) ||
    (typeof ecoPrintMode !== 'undefined' && ecoPrintMode) || (typeof greyscalePrintMode !== 'undefined' && greyscalePrintMode);

  // Which processor each part's lines landed on
  const procLabels = {};
  if(typeof screenDataLineDestinations === 'function' && typeof cachedDataPortPlan === 'function') {
    const data = (typeof liveScreenData === 'function' ? liveScreenData(screenId) : null) || screen.data;
    const info = screenDataLineDestinations(data);
    const lineMap = cachedDataPortPlan().perScreen.get(screenId);
    const units = (typeof projectDataUnits === 'function') ? projectDataUnits().procs : [];
    (info.partOf || new Map()).forEach((part, line) => {
      if(procLabels[part] !== undefined) return;
      const dest = lineMap && lineMap.get(line);
      const unit = dest && units.find(u => u.unitId === dest.groupKey + '|' + dest.proc + '|-');
      procLabels[part] = unit ? unit.label : '';
    });
  }

  ctx.save();
  const totalCols = split.cols.reduce((a, b) => a + b, 0);
  ctx.strokeStyle = isPrint ? '#000000' : '#FFD700';
  ctx.lineWidth = Math.max(2, panelWidth * 0.06);
  ctx.setLineDash([Math.max(4, panelWidth * 0.25), Math.max(3, panelWidth * 0.15)]);
  let acc = 0;
  split.cols.slice(0, -1).forEach(n => {
    acc += n;
    const x = offsetX + acc * panelWidth;
    ctx.beginPath(); ctx.moveTo(x, offsetY); ctx.lineTo(x, offsetY + rowGeo.height); ctx.stroke();
  });
  acc = 0;
  split.rows.slice(0, -1).forEach(n => {
    acc += n;
    const y = offsetY + rowGeo.y(acc);
    ctx.beginPath(); ctx.moveTo(offsetX, y); ctx.lineTo(offsetX + totalCols * panelWidth, y); ctx.stroke();
  });
  ctx.setLineDash([]);

  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  splitDataParts(split).forEach(part => {
    const canvas = canvases[split.parts[part.k].canvasId];
    const text = [canvas ? canvas.name : '', procLabels[part.k] || ''].filter(Boolean).join(' · ');
    if(!text) return;
    const pad = 3;
    const x = offsetX + part.c0 * panelWidth + pad;
    const y = offsetY + rowGeo.y(part.r0) + pad;
    const w = ctx.measureText(text).width + pad * 2;
    ctx.fillStyle = isPrint ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)';
    ctx.fillRect(x, y, w, fontSize + pad * 2);
    ctx.fillStyle = isPrint ? '#000000' : '#FFD700';
    ctx.fillText(text, x + pad, y + pad);
  });
  ctx.restore();
}

// ==================== ARROW DRAWING ====================

function drawArrowPath(ctx, points, colorHex, opts){
  const lineWidth = (opts && opts.lineWidth) || 3;
  const headSize = (opts && opts.headSize) || 12;
  // Hide the end arrowhead when data labels are on — it overlaps the big start/B
  // labels and clutters the look. The connecting line still shows the flow.
  const hideArrowhead = opts ? !!opts.hideArrowhead
    : ((typeof dataLineLabelsEnabled !== 'undefined') && dataLineLabelsEnabled);

  ctx.save();
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for(let i=1;i<points.length;i++){
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  if(!hideArrowhead){
    const end = points[points.length-1];
    const prev = points[points.length-2];
    const angle = Math.atan2(end.y - prev.y, end.x - prev.x);
    drawVArrowhead(ctx, end.x, end.y, angle, colorHex, headSize, lineWidth);
  }
  ctx.restore();
}

// ==================== DATA LINE MAPPING TABLE ====================
// Renders the always-visible list of data line / backup start panels below the
// data canvas, using the per-screen endpoints stashed by renderDataLayout().
// Build a comic-style card matching the structure info boxes.
// Shared with the combined view's per-screen map (nav/combined.js).
// Rows are { line, panel, unit, port } and render as four columns: data line
// number, panel, the processor or distribution box it lands on, and the port on
// that unit. Uses its own .dlm-* classes — .weight-row is shared with the
// structure view and the plates table.
function buildDataLineMapBox(variant, title, rows) {
  const box = document.createElement('div');
  box.className = `structure-info-box ${variant}`;
  const h = document.createElement('div');
  h.className = `structure-info-title ${variant}`;
  h.textContent = title;
  box.appendChild(h);

  const head = document.createElement('div');
  head.className = 'dlm-row dlm-head';
  ['Line', 'Panel', 'Unit', 'Port'].forEach(function(label) {
    const c = document.createElement('span');
    c.textContent = label;
    head.appendChild(c);
  });
  box.appendChild(head);

  rows.forEach(function(row) {
    const r = document.createElement('div');
    r.className = 'dlm-row';
    [
      { text: row.line, cls: 'dlm-line' },
      { text: row.panel, cls: 'dlm-panel' },
      { text: row.unit || '\u2014', cls: 'dlm-unit' },
      { text: (row.port === null || row.port === undefined) ? '\u2014' : row.port, cls: 'dlm-port' }
    ].forEach(function(cell) {
      const c = document.createElement('span');
      c.className = cell.cls;
      c.textContent = cell.text;
      r.appendChild(c);
    });
    box.appendChild(r);
  });
  return box;
}

// Formats a data line endpoint panel as "column.row".
function formatDataLinePanel(p) {
  return p ? `${p.c+1}.${p.r+1}` : '—';
}

function renderDataLineMap() {
  const host = document.getElementById('dataLineMap');
  if(!host) return;
  host.textContent = '';

  const screen = screens[currentScreenId];
  const endpoints = screen && screen.calculatedData && screen.calculatedData.dataLineEndpoints;
  if(!endpoints || endpoints.length === 0) return;
  const redundancy = !!(screen.data && screen.data.redundancy);

  // Destination (processor / distribution box / physical port) for each main line.
  const partsFor = function(line) {
    return (typeof dataLineDestinationParts === 'function')
      ? dataLineDestinationParts(currentScreenId, line) : null;
  };

  const shownLine = function(line) {
    if(typeof dataPortLineDisplayMap !== 'function') return line;
    const m = dataPortLineDisplayMap(currentScreenId);
    return m.has(line) ? m.get(line) : line;
  };

  host.appendChild(buildDataLineMapBox('mains', 'Mains', endpoints.map(function(ep){
    const d = partsFor(ep.line);
    return { line: `${shownLine(ep.line)}`, panel: formatDataLinePanel(ep.main),
             unit: d ? d.unit : '', port: d ? d.port : null };
  })));

  if(redundancy) {
    host.appendChild(buildDataLineMapBox('backups', 'Backups', endpoints.map(function(ep){
      const d = partsFor(ep.line);
      return { line: `${shownLine(ep.line)}B`, panel: formatDataLinePanel(ep.backup),
               unit: d ? d.backupUnit : '', port: d ? d.backupPort : null };
    })));
  }
}