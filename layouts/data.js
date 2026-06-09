// ==================== DATA LAYOUT RENDERER ====================
// Renders the data (port/line grouping) layout view with serpentine arrows.
// Called by generateLayout() dispatcher in index.html.

function renderDataLayout(params) {
  const {pw, ph, panelWidth, panelHeight, hasCB5HalfRow, originalPh, halfPanelHeight, canvas, ctx, panelsPerDataLine, startDir, showArrows} = params;

  // Rear view = mirror the draw x-coordinate horizontally (visual only; data
  // assignments are unchanged). Labels stay upright and arrows mirror because
  // their points inherit the mirrored x.
  const _rearView = (typeof dataRearViewEnabled !== 'undefined') && dataRearViewEnabled;
  const drawX = (c) => (_rearView ? (pw - 1 - c) : c) * panelWidth;

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

  // ---- Data line start endpoints ----
  // First = first panel in flow order; last = the other end. The main cable feeds
  // the start of the flow and the backup the opposite end — so when Flip reverses
  // the flow direction, main/backup swap ends too.
  // Stash per-screen so the in-app table and PDF table use the exact same mapping as drawn.
  const _flip = (typeof dataFlipEnabled !== 'undefined') && dataFlipEnabled;
  const dataLineEndpoints = sortedDataLines.map((ln, gi) => {
    const first = groups[gi][0];
    const last = groups[gi][groups[gi].length - 1];
    return {
      line: ln + 1,
      main: _flip ? last : first,
      backup: _flip ? first : last
    };
  });
  if (typeof screens !== 'undefined' && screens[currentScreenId]) {
    if (!screens[currentScreenId].calculatedData) screens[currentScreenId].calculatedData = {};
    screens[currentScreenId].calculatedData.dataLineEndpoints = dataLineEndpoints;
  }

  // When the overlay toggle is on, map each start panel to its label ("N" main / "NB" backup).
  const showLineLabels = (typeof dataLineLabelsEnabled !== 'undefined') && dataLineLabelsEnabled;
  const _redundancy = !!(screens[currentScreenId] && screens[currentScreenId].data && screens[currentScreenId].data.redundancy);
  const MAIN_LABEL_COLOR = '#10b981';   // app green (--primary)
  const BACKUP_LABEL_COLOR = '#d946ef'; // magenta (same tone family)
  const lineLabelMap = new Map();
  if (showLineLabels) {
    dataLineEndpoints.forEach(ep => {
      const mKey = ep.main ? `${ep.main.c},${ep.main.r}` : null;
      const bKey = (_redundancy && ep.backup) ? `${ep.backup.c},${ep.backup.r}` : null;
      if (mKey && bKey && mKey === bKey) {
        lineLabelMap.set(mKey, { text: `${ep.line}/${ep.line}B`, color: MAIN_LABEL_COLOR }); // single-panel line shares the panel
      } else {
        if (mKey) lineLabelMap.set(mKey, { text: `${ep.line}`, color: MAIN_LABEL_COLOR });
        if (bKey) lineLabelMap.set(bKey, { text: `${ep.line}B`, color: BACKUP_LABEL_COLOR });
      }
    });
  }

  // Draw all panels first (including deleted)
  for(let c=0;c<pw;c++){
    for(let r=0;r<ph;r++){
      const panelKey = `${c},${r}`;

      // Determine if this row is the half panel row
      const isHalfPanelRow = hasCB5HalfRow && r === originalPh;
      const currentPanelHeight = isHalfPanelRow ? halfPanelHeight : panelHeight;
      const x = drawX(c);
      const y = isHalfPanelRow ? (originalPh * panelHeight) : (r * panelHeight);

      // Check if panel is deleted
      if(deletedPanels.has(panelKey)) {
        ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
        ctx.fillRect(x,y,panelWidth,currentPanelHeight);
        ctx.strokeStyle = (ecoPrintMode || greyscalePrintMode) ? '#cccccc' : '#333333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x,y,panelWidth,currentPanelHeight);
        ctx.setLineDash([]);
      }
    }
  }

  // Draw active panels with data grouping
  const groupPoints = [];
  const bigLabelDraws = []; // deferred so start-labels render ON TOP of the arrows
  for(let gi=0; gi<groups.length; gi++){
    const dataLineNum = sortedDataLines[gi]; // Use actual data line number for color
    const colors=colorForIndex(dataLineNum);
    groupPoints[gi] = [];
    for(let idx=0; idx<groups[gi].length; idx++){
      const pnt = groups[gi][idx];

      // Determine if this row is the half panel row
      const isHalfPanelRow = hasCB5HalfRow && pnt.r === originalPh;
      const currentPanelHeight = isHalfPanelRow ? halfPanelHeight : panelHeight;
      const x = drawX(pnt.c);
      const y = isHalfPanelRow ? (originalPh * panelHeight) : (pnt.r * panelHeight);

      ctx.fillStyle=colors.fill;
      ctx.fillRect(x,y,panelWidth,currentPanelHeight);
      ctx.strokeStyle='#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x,y,panelWidth,currentPanelHeight);

      const _bigLabel = lineLabelMap.get(`${pnt.c},${pnt.r}`);
      if (_bigLabel) {
        // Defer the big start-label so it draws ON TOP of the arrows (see pass below)
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
            const arrowPts = dataFlipEnabled ? [...columnPoints].reverse() : columnPoints;
            drawArrowPath(ctx, arrowPts, '#000000');
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

          // Adjacent means: same column (any row), or adjacent columns at top/bottom boundary
          const isAdjacent = (colDiff === 0) || // same column
                             (colDiff === 1 && (prev.r === 0 || prev.r === ph-1 || curr.r === 0 || curr.r === ph-1)); // adjacent column at boundary

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
          const arrowPts = dataFlipEnabled ? [...segment].reverse() : segment;
          drawArrowPath(ctx, arrowPts, '#000000');
        });
      }
    }
  }

  // Draw deferred data-line start labels ON TOP of the arrows (comic style, outlined)
  bigLabelDraws.forEach(function(bl){
    ctx.save();
    let _fs = Math.floor(bl.h * 0.5);
    ctx.font = `bold ${_fs}px Arial`;
    while (_fs > 8 && ctx.measureText(bl.label).width > panelWidth * 0.85) {
      _fs -= 1;
      ctx.font = `bold ${_fs}px Arial`;
    }
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2.5, _fs * 0.18);
    ctx.strokeStyle = '#000000';
    ctx.strokeText(bl.label, bl.cx, bl.cy);
    ctx.fillStyle = bl.color;
    ctx.fillText(bl.label, bl.cx, bl.cy);
    ctx.restore();
  });
}

// ==================== ARROW DRAWING ====================

function drawArrowPath(ctx, points, colorHex){
  ctx.save();
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for(let i=1;i<points.length;i++){
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  const end = points[points.length-1];
  const prev = points[points.length-2];
  const angle = Math.atan2(end.y - prev.y, end.x - prev.x);
  drawVArrowhead(ctx, end.x, end.y, angle, colorHex);
  ctx.restore();
}

// ==================== DATA LINE MAPPING TABLE ====================
// Renders the always-visible list of data line / backup start panels below the
// data canvas, using the per-screen endpoints stashed by renderDataLayout().
function renderDataLineMap() {
  const host = document.getElementById('dataLineMap');
  if(!host) return;
  host.textContent = '';

  const screen = screens[currentScreenId];
  const endpoints = screen && screen.calculatedData && screen.calculatedData.dataLineEndpoints;
  if(!endpoints || endpoints.length === 0) return;
  const redundancy = !!(screen.data && screen.data.redundancy);

  const fmt = (p) => p ? `${p.c+1}.${p.r+1}` : '—';

  // Build a comic-style card matching the structure info boxes
  function buildBox(variant, title, rows) {
    const box = document.createElement('div');
    box.className = `structure-info-box ${variant}`;
    const h = document.createElement('div');
    h.className = `structure-info-title ${variant}`;
    h.textContent = title;
    box.appendChild(h);
    rows.forEach(function(row) {
      const r = document.createElement('div');
      r.className = 'weight-row';
      const lab = document.createElement('span');
      lab.className = 'weight-label';
      lab.textContent = row.label;
      const val = document.createElement('span');
      val.className = 'weight-value';
      val.textContent = row.panel;
      r.appendChild(lab);
      r.appendChild(val);
      box.appendChild(r);
    });
    return box;
  }

  host.appendChild(buildBox('mains', 'Mains', endpoints.map(function(ep){
    return { label: `${ep.line}`, panel: fmt(ep.main) };
  })));

  if(redundancy) {
    host.appendChild(buildBox('backups', 'Backups', endpoints.map(function(ep){
      return { label: `${ep.line}B`, panel: fmt(ep.backup) };
    })));
  }
}
