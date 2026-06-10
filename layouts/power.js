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
  // Top band = column-marker bar only. SOCAs are shown via diagonal label overlay (see below).
  // Left band = row-marker column. Panel labels show SOCA.Circuit (e.g. "A.1").
  const colMarkerH  = _pdfMode ? Math.round((_isMultiScreen ? 28 : 18) * canvasScale) : 22;
  const rowMarkerW  = _pdfMode ? Math.round((_isMultiScreen ? 32 : 22) * canvasScale) : 28;
  const bracketBarH = 0;
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

  // STEP 1-3: Assign circuit numbers (column-major, honouring custom overrides)
  // via the shared helper so the canvas and the 3-phase load calc in
  // core/phase-balance.js use identical circuit numbering.
  const { panelToCircuit } = assignCircuits(pw, ph, panelsPerCircuit, deletedPanels, customCircuitAssignments);

  // STEP 4: Compute SOCA group per panel — explicit assignment (1-based) wins over derived
  const panelToSoca = new Map();
  panelToCircuit.forEach((circuitNum, panelKey) => {
    const explicit = customSocaAssignments.get(panelKey);
    const socaIdx = (typeof explicit === 'number' && explicit >= 1) ? (explicit - 1) : Math.floor(circuitNum / 6);
    panelToSoca.set(panelKey, socaIdx);
  });

  // 3-phase leg-pair colouring (optional "Color by Leg" view). Reads the
  // per-circuit leg-pair computed in core/calculate.js (calculatedData) so the
  // canvas colours match the load legend exactly.
  const _legColorOn = (typeof colorByLegEnabled !== 'undefined') && colorByLegEnabled;
  const _cd = (typeof screens !== 'undefined' && screens[currentScreenId]) ? screens[currentScreenId].calculatedData : null;
  const _pb = (_cd && _cd.phaseBalance) ? _cd.phaseBalance : null;
  const circuitToPair = new Map();
  if (_pb && _pb.perCircuit) _pb.perCircuit.forEach(e => circuitToPair.set(e.circuit, e.pair));
  const _legPairColor = (pair) => {
    const base = { XY: '#ff5277', YZ: '#36c5f0', ZX: '#ffd23f' }[pair] || '#cccccc';
    return greyscalePrintMode ? toGreyscale(base) : (ecoPrintMode ? toPastelColor(base) : base);
  };

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

      const legPair = circuitToPair.get(circuitNum);
      const fillColor = (_legColorOn && legPair) ? _legPairColor(legPair)
                                                 : applySocaShade(colors.solid, socaGroup);

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
      const _panelLabel = `${formatSocaLabel(socaGroup)}.${circuitNum+1}`;
      ctx.fillText((_legColorOn && legPair) ? `${_panelLabel}·${legPair}` : _panelLabel, x+panelWidth/2, y+currentPanelHeight/2);
    }
  }

  // SOCA diagonal labels (always) + outlines (only for custom assignments).
  // Toggles are read from globals defined in core/utils.js (default true, persisted).
  {
    const _outlinesOn   = (typeof socaOutlinesEnabled !== 'undefined') ? socaOutlinesEnabled : true;
    const _labelsOn     = (typeof socaDiagonalLabelEnabled !== 'undefined') ? socaDiagonalLabelEnabled : true;
    const _drawOutlines = _outlinesOn;
    if (_drawOutlines || _labelsOn) {
      // Group active panels by SOCA index. Works for both custom and default (circuit-grouped) cases.
      const socaPanels = new Map(); // socaIdx -> Set("c,r")
      if (typeof panelToCircuit !== 'undefined') {
        panelToCircuit.forEach((circuitNum, panelKey) => {
          if (deletedPanels.has(panelKey)) return;
          const socaIdx = panelToSoca.has(panelKey) ? panelToSoca.get(panelKey) : Math.floor(circuitNum / 6);
          if (!socaPanels.has(socaIdx)) socaPanels.set(socaIdx, new Set());
          socaPanels.get(socaIdx).add(panelKey);
        });
      }

      const _socaOutlinePalette = ['#ff10f0', '#39ff14', '#00aaff'].map(function(h){
        return greyscalePrintMode ? toGreyscale(h) : (ecoPrintMode ? toPastelColor(h) : h);
      });
      const socaColorIdx = new Map();
      if (_drawOutlines) {
        // Reverse lookup: panelKey -> socaIdx
        const cellToSoca = new Map();
        socaPanels.forEach((cellSet, idx) => cellSet.forEach(k => cellToSoca.set(k, idx)));

        // Build SOCA-to-SOCA adjacency (4-neighbor) for graph coloring.
        const socaAdj = new Map();
        socaPanels.forEach((_, idx) => socaAdj.set(idx, new Set()));
        cellToSoca.forEach((socaIdx, panelKey) => {
          const [c, r] = panelKey.split(',').map(Number);
          [[c,r-1],[c,r+1],[c-1,r],[c+1,r]].forEach(([nc, nr]) => {
            const nSoca = cellToSoca.get(`${nc},${nr}`);
            if (nSoca === undefined || nSoca === socaIdx) return;
            socaAdj.get(socaIdx).add(nSoca);
          });
        });

        // Greedy 3-color: order SOCAs by descending degree, assign lowest free color.
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
      }

      socaPanels.forEach((cellSet, socaIdx) => {
        // Collect (c,r) and find bounding box for label placement.
        let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
        cellSet.forEach(k => {
          const [cc, rr] = k.split(',').map(Number);
          if (cc < minC) minC = cc; if (cc > maxC) maxC = cc;
          if (rr < minR) minR = rr; if (rr > maxR) maxR = rr;
        });

        // ----- Outline: trace perimeter edges of the panel union (inset so adjacent SOCAs show side-by-side) -----
        if (_drawOutlines) {
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

          // Chain segments into continuous polylines so corner joins are mitered
          // by the canvas — drawing each segment as its own sub-path produces
          // visible micro-gaps at joints when scaled up for hi-res capture.
          const ptKey = (x, y) => x.toFixed(2) + ',' + y.toFixed(2);
          const endpointMap = new Map(); // key -> [segmentIndex, ...]
          segments.forEach((s, i) => {
            const k1 = ptKey(s[0], s[1]);
            const k2 = ptKey(s[2], s[3]);
            if (!endpointMap.has(k1)) endpointMap.set(k1, []);
            if (!endpointMap.has(k2)) endpointMap.set(k2, []);
            endpointMap.get(k1).push(i);
            endpointMap.get(k2).push(i);
          });
          const used = new Array(segments.length).fill(false);
          const polylines = [];
          for (let i = 0; i < segments.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            const s = segments[i];
            const points = [[s[0], s[1]], [s[2], s[3]]];
            // Extend forward (from points[last]) then backward (from points[0])
            for (let dir = 0; dir < 2; dir++) {
              while (true) {
                const tip = (dir === 0) ? points[points.length - 1] : points[0];
                const cands = endpointMap.get(ptKey(tip[0], tip[1])) || [];
                let next = -1;
                for (const idx of cands) { if (!used[idx]) { next = idx; break; } }
                if (next < 0) break;
                used[next] = true;
                const ns = segments[next];
                const startMatches = (Math.abs(ns[0] - tip[0]) < 0.01) && (Math.abs(ns[1] - tip[1]) < 0.01);
                const newPt = startMatches ? [ns[2], ns[3]] : [ns[0], ns[1]];
                if (dir === 0) points.push(newPt);
                else points.unshift(newPt);
              }
            }
            polylines.push(points);
          }

          ctx.save();
          ctx.strokeStyle = _socaOutlinePalette[socaColorIdx.get(socaIdx) || 0];
          ctx.lineWidth = _pdfMode ? Math.max(2, Math.round(2 * _markerScale)) : 2;
          ctx.setLineDash([]);
          ctx.lineCap = 'square';
          ctx.lineJoin = 'miter';
          ctx.miterLimit = 4;
          polylines.forEach(pts => {
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
            ctx.stroke();
          });
          ctx.restore();
        }

        // ----- Diagonal label, fitted inside the SOCA's own footprint -----
        if (_labelsOn) {
          // Largest solid rectangle of THIS SOCA's cells, so the label never
          // paints over a hole or a neighbouring SOCA — and, because every panel
          // belongs to one SOCA, multiple SOCA labels can never overlap.
          const gW = maxC - minC + 1, gH = maxR - minR + 1;
          const heights = new Array(gW).fill(0);
          let best = { area: 0, r0: minR, c0: minC, r1: minR, c1: minC };
          for (let r = 0; r < gH; r++) {
            for (let c = 0; c < gW; c++) {
              heights[c] = cellSet.has(`${minC + c},${minR + r}`) ? heights[c] + 1 : 0;
            }
            const stack = [];
            for (let c = 0; c <= gW; c++) {
              const h = c < gW ? heights[c] : 0;
              while (stack.length && heights[stack[stack.length - 1]] >= h) {
                const hh = heights[stack.pop()];
                const left = stack.length ? stack[stack.length - 1] + 1 : 0;
                const area = hh * (c - left);
                if (area > best.area) {
                  best = { area, r0: minR + r - hh + 1, c0: minC + left, r1: minR + r, c1: minC + c - 1 };
                }
              }
              stack.push(c);
            }
          }

          // Pixel bounds of the chosen rectangle (honour the CB5 half row).
          const topIsHalf = hasCB5HalfRow && best.r0 === originalPh;
          const botIsHalf = hasCB5HalfRow && best.r1 === originalPh;
          const rx = best.c0 * panelWidth + rowMarkerW;
          const ry = (topIsHalf ? originalPh * panelHeight : best.r0 * panelHeight) + topBandH;
          const rw = (best.c1 - best.c0 + 1) * panelWidth;
          const yBot = (botIsHalf ? originalPh * panelHeight + halfPanelHeight
                                  : (best.r1 + 1) * panelHeight) + topBandH;
          const rh = yBot - ry;

          const cx = rx + rw / 2, cy = ry + rh / 2;
          const diag = Math.sqrt(rw * rw + rh * rh);
          const cos = rw / diag, sin = rh / diag;   // label follows this rectangle's diagonal
          const labelText = `SOCA ${formatSocaLabel(socaIdx)}`;
          ctx.save();
          ctx.font = `bold 100px Arial`;
          const w100 = ctx.measureText(labelText).width; // text width at 100px font
          const margin = 0.9;
          // Rotated footprint must fit rw x rh on both axes (H ≈ em = 100 at 100px).
          const fX = (margin * rw) * 100 / (w100 * cos + 100 * sin);
          const fY = (margin * rh) * 100 / (w100 * sin + 100 * cos);
          const fontSize = Math.max(14, Math.min(120, Math.floor(Math.min(fX, fY))));
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = 'rgba(0,0,0,0.28)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.translate(cx, cy);
          ctx.rotate(-Math.atan2(rh, rw));
          ctx.fillText(labelText, 0, 0);
          ctx.restore();
        }
      });
    }
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

// Renders the 3-phase load-balancing legend below the power canvas. Reads the
// per-leg amps / imbalance / re-patch recommendation computed in
// core/calculate.js. Hidden when not 3-phase (phaseBalance is null).
function renderPhaseBalanceLegend() {
  const el = document.getElementById('phaseBalanceLegend');
  if (!el) return;
  const cd = (typeof screens !== 'undefined' && screens[currentScreenId]) ? screens[currentScreenId].calculatedData : null;
  const pb = (cd && cd.phaseBalance) ? cd.phaseBalance : null;
  if (!pb) { el.style.display = 'none'; el.innerHTML = ''; return; }

  const la = pb.legAmps;
  const legHtml = ['X', 'Y', 'Z'].map(k => {
    const isPeak = Math.abs(la[k] - pb.peakLeg) < 0.05;
    return `<div class="pbl-leg${isPeak ? ' pbl-leg-peak' : ''}"><span class="pbl-leg-name">${k}</span><span class="pbl-leg-amps">${la[k].toFixed(1)} A</span></div>`;
  }).join('');

  const imb = pb.imbalancePct;
  const imbClass = imb < 10 ? 'pbl-ok' : (imb < 20 ? 'pbl-warn' : 'pbl-bad');

  let recHtml = '';
  if (pb.recommendation && pb.recommendation.length) {
    const moves = pb.recommendation.map(r => `C${r.circuit + 1} ${r.fromPair}→${r.toPair}`).join(', ');
    recHtml = `<div class="pbl-rec">⚖ Rebalance: ${moves} <span class="pbl-rec-target">→ ${pb.balancedImbalancePct.toFixed(0)}% imbalance</span></div>`;
  }

  el.innerHTML =
    `<div class="pbl-head">3-Phase Load <span class="pbl-mode">${pb.mode === 'balanced' ? 'BALANCED' : 'AS-WIRED'}</span></div>` +
    `<div class="pbl-legs">${legHtml}</div>` +
    `<div class="pbl-imb ${imbClass}">Imbalance: ${imb.toFixed(0)}%</div>` +
    recHtml;
  el.style.display = 'block';
}
