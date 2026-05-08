// ==================== POWER LAYOUT RENDERER ====================
// Renders the power (circuit/SOCA grouping) layout view.
// Called by generateLayout() dispatcher in index.html.

function renderPowerLayout(params) {
  const {pw, ph, panelWidth, panelHeight, hasCB5HalfRow, originalPh, halfPanelHeight, canvas, ctx, panelsPerCircuit} = params;

  const _pdfMode = typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode;
  const _isMultiScreen = typeof pdfMultiScreenCapture !== 'undefined' && pdfMultiScreenCapture;
  const pdfContentPt = 539;
  const canvasScale = _pdfMode ? canvas.width / pdfContentPt : 1;

  // Hide SOCA brackets when any custom assignment is present — they can render incorrectly
  // for non-contiguous SOCA spans, and panels themselves carry SOCA info via in-panel labels.
  const hasCustoms = (typeof customCircuitAssignments !== 'undefined' && customCircuitAssignments.size > 0) ||
                     (typeof customSocaAssignments !== 'undefined' && customSocaAssignments.size > 0);

  // Top band = bracket bar (only when no customs) + column-marker bar.
  // Left band = row-marker column. Panel labels show SOCA.Circuit (e.g. "A.1").
  const colMarkerH  = _pdfMode ? Math.round((_isMultiScreen ? 28 : 18) * canvasScale) : 22;
  const rowMarkerW  = _pdfMode ? Math.round((_isMultiScreen ? 32 : 22) * canvasScale) : 28;
  const bracketBarH = hasCustoms ? 0 : (_pdfMode ? Math.round(26 * canvasScale) : 60);
  const topBandH    = bracketBarH + colMarkerH;

  canvas.height += topBandH;
  canvas.width  += rowMarkerW;
  // Anchor PDF font sizes to actual PDF points regardless of width-fit vs height-cap.
  const _expectedMaxHpt = (typeof window !== 'undefined' && window._pdfLayoutMaxHeightPt) || 230;
  const _markerScale = _pdfMode ? Math.max(canvas.width / pdfContentPt, canvas.height / _expectedMaxHpt) : 1;
  if (_pdfMode) {
    try {
      window._pdfPowerSocaFraction = topBandH / canvas.height;
      window._pdfPowerRowFraction  = rowMarkerW / canvas.width;
    } catch(e) {}
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fill marker areas with white (JPEG doesn't support transparency)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, topBandH);
  ctx.fillRect(0, 0, rowMarkerW, canvas.height);

  // Border lines separating marker bands from the panel grid
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, topBandH);
  ctx.lineTo(canvas.width, topBandH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rowMarkerW, 0);
  ctx.lineTo(rowMarkerW, canvas.height);
  ctx.stroke();

  // Build column-by-column circuit assignments
  const columnCircuits = []; // Array of circuit segments per column
  let globalCircuitIndex = 0;

  for(let c=0; c<pw; c++){
    const columnPanels = [];

    // Collect active panels in this column from top to bottom
    for(let r=0; r<ph; r++){
      const panelKey = `${c},${r}`;
      if(!deletedPanels.has(panelKey)) {
        columnPanels.push({c, r, key: panelKey});
      }
    }

    // Split column into circuit segments based on panelsPerCircuit
    let circuitSegments = [];
    for(let i=0; i<columnPanels.length; i += panelsPerCircuit){
      const segment = columnPanels.slice(i, i + panelsPerCircuit);
      if(segment.length > 0) {
        circuitSegments.push({
          circuitNum: globalCircuitIndex++,
          panels: segment
        });
      }
    }

    columnCircuits.push(circuitSegments);
  }

  // Flatten all circuits for SOCA grouping
  const allCircuits = [];
  columnCircuits.forEach(col => {
    col.forEach(seg => {
      allCircuits.push(seg);
    });
  });

  // STEP 1: Build list of all panels in order (column by column, top to bottom)
  const orderedPanels = [];
  for(let c=0; c<pw; c++){
    for(let r=0; r<ph; r++){
      const panelKey = `${c},${r}`;
      if(!deletedPanels.has(panelKey)) {
        orderedPanels.push({
          key: panelKey,
          col: c,
          row: r,
          isCustom: customCircuitAssignments.has(panelKey),
          customCircuit: customCircuitAssignments.has(panelKey) ? customCircuitAssignments.get(panelKey) - 1 : null
        });
      }
    }
  }

  // STEP 2: Collect all custom circuit numbers that are in use
  const usedCustomCircuits = new Set();
  orderedPanels.forEach(p => {
    if(p.isCustom) {
      usedCustomCircuits.add(p.customCircuit);
    }
  });

  // STEP 3: Assign circuit numbers
  const panelToCircuit = new Map();
  let autoCircuitCounter = 0;
  let panelsInCurrentAutoCircuit = 0;

  orderedPanels.forEach(panel => {
    if(panel.isCustom) {
      // Keep custom assignment
      panelToCircuit.set(panel.key, panel.customCircuit);
    } else {
      // Find next available circuit number (skip over custom assignments)
      while(usedCustomCircuits.has(autoCircuitCounter)) {
        autoCircuitCounter++;
      }

      // Auto-assign to current circuit
      panelToCircuit.set(panel.key, autoCircuitCounter);
      panelsInCurrentAutoCircuit++;

      // Move to next circuit when we reach the limit
      if(panelsInCurrentAutoCircuit >= panelsPerCircuit) {
        autoCircuitCounter++;
        panelsInCurrentAutoCircuit = 0;

        // Skip over any custom circuits
        while(usedCustomCircuits.has(autoCircuitCounter)) {
          autoCircuitCounter++;
        }
      }
    }
  });

  // STEP 4: Compute SOCA group per panel — explicit assignment (1-based) wins over derived
  const panelToSoca = new Map();
  panelToCircuit.forEach((circuitNum, panelKey) => {
    const explicit = customSocaAssignments.get(panelKey);
    const socaIdx = (typeof explicit === 'number' && explicit >= 1) ? (explicit - 1) : Math.floor(circuitNum / 6);
    panelToSoca.set(panelKey, socaIdx);
  });

  // Draw all panels
  for(let c=0; c<pw; c++){
    for(let r=0; r<ph; r++){
      const panelKey = `${c},${r}`;

      // Determine if this row is the half panel row
      const isHalfPanelRow = hasCB5HalfRow && r === originalPh;
      const currentPanelHeight = isHalfPanelRow ? halfPanelHeight : panelHeight;
      const x = c * panelWidth + rowMarkerW;
      const y = (isHalfPanelRow ? (originalPh * panelHeight) : (r * panelHeight)) + topBandH;

      // Check if panel is deleted
      if(deletedPanels.has(panelKey)) {
        ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
        ctx.fillRect(x, y, panelWidth, currentPanelHeight);
        ctx.strokeStyle = (ecoPrintMode || greyscalePrintMode) ? '#cccccc' : '#333333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x, y, panelWidth, currentPanelHeight);
        ctx.setLineDash([]);
        continue;
      }

      // Get circuit number for this panel
      const circuitNum = panelToCircuit.get(panelKey);
      if(circuitNum === undefined) continue;

      // SOCA group: explicit assignment wins over derived
      const socaGroup = panelToSoca.has(panelKey) ? panelToSoca.get(panelKey) : Math.floor(circuitNum / 6);
      const colorIndex = circuitNum % 6;
      const colors = colorForIndex(colorIndex);

      const fillColor = applySocaShade(colors.solid, socaGroup);

      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, panelWidth, currentPanelHeight);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, panelWidth, currentPanelHeight);

      // Always use black text (no black panels in power layout)
      ctx.fillStyle = '#000000';

      const _pdf = typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode;
      ctx.font = (_pdf ? `${Math.max(10, Math.floor(panelWidth * 0.25))}px Arial` : '11px Arial');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${formatSocaLabel(socaGroup)}.${circuitNum+1}`, x+panelWidth/2, y+currentPanelHeight/2);
    }
  }

  // SOCA outlines + diagonal labels — only when custom assignments are in play.
  // Toggles are read from globals defined in core/utils.js (default true, persisted).
  if (hasCustoms) {
    const _outlinesOn = (typeof socaOutlinesEnabled !== 'undefined') ? socaOutlinesEnabled : true;
    const _labelsOn   = (typeof socaDiagonalLabelEnabled !== 'undefined') ? socaDiagonalLabelEnabled : true;
    if (_outlinesOn || _labelsOn) {
      // Group active panels by SOCA index.
      const socaPanels = new Map(); // socaIdx -> Set("c,r")
      panelToSoca.forEach((socaIdx, panelKey) => {
        if (deletedPanels.has(panelKey)) return;
        if (!socaPanels.has(socaIdx)) socaPanels.set(socaIdx, new Set());
        socaPanels.get(socaIdx).add(panelKey);
      });

      // Build SOCA-to-SOCA adjacency (4-neighbor) for graph coloring.
      const socaAdj = new Map(); // socaIdx -> Set(neighborSocaIdx)
      socaPanels.forEach((_, idx) => socaAdj.set(idx, new Set()));
      panelToSoca.forEach((socaIdx, panelKey) => {
        if (deletedPanels.has(panelKey)) return;
        const [c, r] = panelKey.split(',').map(Number);
        [[c,r-1],[c,r+1],[c-1,r],[c+1,r]].forEach(([nc, nr]) => {
          const nKey = `${nc},${nr}`;
          if (deletedPanels.has(nKey)) return;
          const nSoca = panelToSoca.get(nKey);
          if (nSoca === undefined || nSoca === socaIdx) return;
          socaAdj.get(socaIdx).add(nSoca);
        });
      });

      // Greedy 4-color: order SOCAs by descending degree, assign lowest free color.
      const _socaOutlinePalette = ['#ff10f0', '#39ff14', '#00aaff'];
      const socaColorIdx = new Map();
      const orderedSocas = [...socaPanels.keys()].sort((a, b) => {
        const da = socaAdj.get(b).size - socaAdj.get(a).size;
        return da !== 0 ? da : a - b;
      });
      orderedSocas.forEach(idx => {
        const used = new Set();
        socaAdj.get(idx).forEach(n => {
          if (socaColorIdx.has(n)) used.add(socaColorIdx.get(n));
        });
        let pick = 0;
        while (used.has(pick)) pick++;
        socaColorIdx.set(idx, pick % _socaOutlinePalette.length);
      });

      socaPanels.forEach((cellSet, socaIdx) => {
        // Collect (c,r) and find bounding box for label placement.
        let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
        cellSet.forEach(k => {
          const [cc, rr] = k.split(',').map(Number);
          if (cc < minC) minC = cc; if (cc > maxC) maxC = cc;
          if (rr < minR) minR = rr; if (rr > maxR) maxR = rr;
        });

        // ----- Outline: trace perimeter edges of the panel union (inset so adjacent SOCAs show side-by-side) -----
        if (_outlinesOn) {
          const inset = _pdfMode ? Math.max(2, Math.round(2 * _markerScale)) : 2;
          const segments = []; // [x1,y1,x2,y2]
          cellSet.forEach(k => {
            const [c, r] = k.split(',').map(Number);
            const isHalfRow = hasCB5HalfRow && r === originalPh;
            const ph_ = isHalfRow ? halfPanelHeight : panelHeight;
            const x = c * panelWidth + rowMarkerW;
            const y = (isHalfRow ? (originalPh * panelHeight) : (r * panelHeight)) + topBandH;
            const hasTop   = cellSet.has(`${c},${r-1}`);
            const hasBot   = cellSet.has(`${c},${r+1}`);
            const hasLeft  = cellSet.has(`${c-1},${r}`);
            const hasRight = cellSet.has(`${c+1},${r}`);
            if (!hasTop)   segments.push([x + (hasLeft?0:inset), y + inset,         x + panelWidth - (hasRight?0:inset), y + inset]);
            if (!hasBot)   segments.push([x + (hasLeft?0:inset), y + ph_ - inset,   x + panelWidth - (hasRight?0:inset), y + ph_ - inset]);
            if (!hasLeft)  segments.push([x + inset,             y + (hasTop?0:inset), x + inset,                          y + ph_ - (hasBot?0:inset)]);
            if (!hasRight) segments.push([x + panelWidth - inset, y + (hasTop?0:inset), x + panelWidth - inset,            y + ph_ - (hasBot?0:inset)]);
          });
          ctx.save();
          ctx.strokeStyle = _socaOutlinePalette[socaColorIdx.get(socaIdx) || 0];
          ctx.lineWidth = _pdfMode ? Math.max(2, Math.round(2 * _markerScale)) : 2;
          ctx.setLineDash([]);
          ctx.lineCap = 'butt';
          ctx.beginPath();
          segments.forEach(s => { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); });
          ctx.stroke();
          ctx.restore();
        }

        // ----- Diagonal label centered over the SOCA's bounding box -----
        if (_labelsOn) {
          const bx = minC * panelWidth + rowMarkerW;
          const by = minR * panelHeight + topBandH;
          const bw = (maxC - minC + 1) * panelWidth;
          const bh = (maxR - minR + 1) * panelHeight;
          const cx = bx + bw / 2;
          const cy = by + bh / 2;
          const diag = Math.sqrt(bw * bw + bh * bh);
          const labelText = `SOCA ${formatSocaLabel(socaIdx)}`;
          ctx.save();
          ctx.font = `bold 100px Arial`;
          const measured = ctx.measureText(labelText).width;
          const targetWidth = diag * 0.6;
          let fontSize = Math.max(14, Math.min(120, Math.floor(100 * targetWidth / measured)));
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = 'rgba(0,0,0,0.28)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.translate(cx, cy);
          ctx.rotate(-Math.PI / 4);
          ctx.fillText(labelText, 0, 0);
          ctx.restore();
        }
      });
    }
  }

  // SOCA brackets — drawn only when no custom assignments are in play.
  if (!hasCustoms) {
    const socaInfoMap = new Map();
    for(let c=0; c<pw; c++){
      for(let r=0; r<ph; r++){
        const panelKey = `${c},${r}`;
        if(deletedPanels.has(panelKey)) continue;
        const circuitNum = panelToCircuit.get(panelKey);
        if(circuitNum === undefined) continue;
        const socaIdx = panelToSoca.has(panelKey) ? panelToSoca.get(panelKey) : Math.floor(circuitNum / 6);
        const x = c * panelWidth + rowMarkerW;
        let info = socaInfoMap.get(socaIdx);
        if(!info) {
          info = { minX: Infinity, maxX: -Infinity, circuits: new Set() };
          socaInfoMap.set(socaIdx, info);
        }
        if(x < info.minX) info.minX = x;
        if(x > info.maxX) info.maxX = x;
        info.circuits.add(circuitNum);
      }
    }
    const uniqueSocas = [...socaInfoMap.keys()].sort((a,b) => a - b);

    function buildCircuitRangeLabel(circuitsSet) {
      const sorted = [...circuitsSet].sort((a,b) => a - b).map(c => c + 1);
      if(sorted.length === 0) return '';
      if(sorted.length === 1) return `Circuit ${sorted[0]}`;
      const contiguous = sorted.every((v, i) => i === 0 || v === sorted[i-1] + 1);
      if(contiguous) return `Circuits ${sorted[0]}-${sorted[sorted.length-1]}`;
      if(sorted.length <= 3) return `Circuits ${sorted.join(', ')}`;
      return `Circuits ${sorted.slice(0,3).join(', ')}…`;
    }

    const socaFontLg = _pdfMode ? Math.round(11 * _markerScale) : 16;
    const socaFontSm = _pdfMode ? Math.round(8 * _markerScale) : 12;
    const lineY = Math.round(bracketBarH * 0.50);
    const tickH = _pdfMode ? Math.round(8 * canvasScale) : Math.round(bracketBarH * 0.13);

    let lgSize = socaFontLg;
    let smSize = socaFontSm;
    uniqueSocas.forEach(socaIdx => {
      const info = socaInfoMap.get(socaIdx);
      const span = (info.maxX + panelWidth) - info.minX - 4;
      ctx.font = `bold ${lgSize}px Arial`;
      const socaW = ctx.measureText(`SOCA ${formatSocaLabel(socaIdx)}`).width;
      if(socaW > span) lgSize = Math.max(8, Math.floor(lgSize * span / socaW));
      ctx.font = `${smSize}px Arial`;
      const rangeW = ctx.measureText(buildCircuitRangeLabel(info.circuits)).width;
      if(rangeW > span) smSize = Math.max(7, Math.floor(smSize * span / rangeW));
    });

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    uniqueSocas.forEach(socaIdx => {
      const info = socaInfoMap.get(socaIdx);
      const startX = info.minX;
      const endX = info.maxX + panelWidth;
      const midX = (startX + endX) / 2;

      ctx.beginPath();
      ctx.moveTo(startX, lineY); ctx.lineTo(endX, lineY); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(startX, lineY - tickH); ctx.lineTo(startX, lineY + tickH); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(endX, lineY - tickH); ctx.lineTo(endX, lineY + tickH); ctx.stroke();

      ctx.font = `bold ${lgSize}px Arial`;
      ctx.fillText(`SOCA ${formatSocaLabel(socaIdx)}`, midX, lineY - Math.round(bracketBarH * 0.22));
      ctx.font = `${smSize}px Arial`;
      ctx.fillText(buildCircuitRangeLabel(info.circuits), midX, lineY + Math.round(bracketBarH * 0.22));
    });
  }

  // Column number markers (always shown, positioned just above panel grid).
  // _markerScale is computed near the top so SOCA bracket fonts can also use it.
  const markerFont = _pdfMode ? Math.round(7 * _markerScale) : 11;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${markerFont}px Arial`;

  for(let c = 0; c < pw; c++) {
    const cx = c * panelWidth + rowMarkerW + panelWidth / 2;
    ctx.fillText(`${c+1}`, cx, bracketBarH + colMarkerH / 2);
  }

  for(let r = 0; r < ph; r++) {
    const isHalfPanelRow = hasCB5HalfRow && r === originalPh;
    const rowH = isHalfPanelRow ? halfPanelHeight : panelHeight;
    const rowY = (isHalfPanelRow ? (originalPh * panelHeight) : (r * panelHeight)) + topBandH;
    ctx.fillText(`${r+1}`, rowMarkerW / 2, rowY + rowH / 2);
  }
}
