// ==================== DATA LAYOUT RENDERER ====================
// Renders the data (port/line grouping) layout view with serpentine arrows.
// Called by generateLayout() dispatcher in index.html.
//
// Split into param-driven pieces so the Combined view (nav/combined.js) can draw
// the exact same layout for each screen instead of forking the logic — the same
// pattern drawSocaOverlay() uses for the power layout (layouts/power.js).

// ==================== DATA LINE GROUPING ====================
// Walks the wall in serpentine order and groups panels into data lines.
// Pure: takes the per-screen deletedPanels Set / customDataLineAssignments Map as
// params rather than reading the current-screen globals.
function buildDataLineGroups(o) {
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

  return {groups, sortedDataLines, usedCustomDataLines, panelToDataLine};
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
    pw, ph, panelWidth, panelHeight, halfPanelHeight, hasCB5HalfRow, originalPh,
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
  const drawY = (r) => offsetY + ((hasCB5HalfRow && r === originalPh) ? (originalPh * panelHeight) : (r * panelHeight));
  const rowHeight = (r) => (hasCB5HalfRow && r === originalPh) ? halfPanelHeight : panelHeight;

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
                             (colDiff === 1 && (rowDiff === 0 || prev.r === 0 || prev.r === ph-1 || curr.r === 0 || curr.r === ph-1)); // adjacent column at turn

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
  const {pw, ph, panelWidth, panelHeight, hasCB5HalfRow, originalPh, halfPanelHeight, canvas, ctx, panelsPerDataLine, startDir, showArrows, fontSize} = params;

  const {groups, sortedDataLines} = buildDataLineGroups({
    pw, ph, panelsPerDataLine, startDir,
    deletedPanels, customDataLineAssignments
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
    pw, ph, panelWidth, panelHeight, halfPanelHeight, hasCB5HalfRow, originalPh,
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