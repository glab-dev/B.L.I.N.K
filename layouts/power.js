// ==================== POWER LAYOUT RENDERER ====================
// Renders the power (circuit/SOCA grouping) layout view.
// Called by generateLayout() dispatcher in index.html.

function renderPowerLayout(params) {
  const {pw, ph, panelWidth, panelHeight, hasCB5HalfRow, originalPh, halfPanelHeight, canvas, ctx, panelsPerCircuit} = params;

  const _pdfMode = typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode;
  const _isMultiScreen = typeof pdfMultiScreenCapture !== 'undefined' && pdfMultiScreenCapture;
  const pdfContentPt = 539;
  const canvasScale = _pdfMode ? canvas.width / pdfContentPt : 1;
  const socaLabelHeight = _pdfMode ? Math.round((_isMultiScreen ? 95 : 50) * canvasScale) : 60;
  canvas.height += socaLabelHeight;
  if (_pdfMode) { try { window._pdfPowerSocaFraction = socaLabelHeight / canvas.height; } catch(e) {} }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fill label area with white background (for PDF export - JPEG doesn't support transparency)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, socaLabelHeight);

  // Draw black border at bottom of SOCA label area (ensures visibility across all browsers)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, socaLabelHeight);
  ctx.lineTo(canvas.width, socaLabelHeight);
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
      const x = c * panelWidth;
      const y = (isHalfPanelRow ? (originalPh * panelHeight) : (r * panelHeight)) + socaLabelHeight;

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
      ctx.font = (_pdf ? '13px Arial' : '11px Arial');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${c+1}.${r+1}`, x+panelWidth/2, y+currentPanelHeight/2);
    }
  }

  // Draw SOCA labels — iterate unique SOCA groups (explicit or derived)
  // Build a map of socaIdx -> { minX, maxX, circuits: Set }
  const socaInfoMap = new Map();
  for(let c=0; c<pw; c++){
    for(let r=0; r<ph; r++){
      const panelKey = `${c},${r}`;
      if(deletedPanels.has(panelKey)) continue;
      const circuitNum = panelToCircuit.get(panelKey);
      if(circuitNum === undefined) continue;
      const socaIdx = panelToSoca.has(panelKey) ? panelToSoca.get(panelKey) : Math.floor(circuitNum / 6);
      const x = c * panelWidth;
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
    const sorted = [...circuitsSet].sort((a,b) => a - b).map(c => c + 1); // 1-based
    if(sorted.length === 0) return '';
    if(sorted.length === 1) return `Circuit ${sorted[0]}`;
    // Contiguous?
    const contiguous = sorted.every((v, i) => i === 0 || v === sorted[i-1] + 1);
    if(contiguous) return `Circuits ${sorted[0]}-${sorted[sorted.length-1]}`;
    if(sorted.length <= 3) return `Circuits ${sorted.join(', ')}`;
    return `Circuits ${sorted.slice(0,3).join(', ')}…`;
  }

  const socaFontLg = _pdfMode ? Math.round((_isMultiScreen ? 28 : 16) * canvasScale) : 16;
  const socaFontSm = _pdfMode ? Math.round((_isMultiScreen ? 26 : 11) * canvasScale) : 12;
  const lineY = Math.round(socaLabelHeight * 0.50);
  const tickH = _pdfMode ? Math.round(8 * canvasScale) : Math.round(socaLabelHeight * 0.13);

  // Pre-pass: find a uniform font size that fits every SOCA's span.
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
    ctx.moveTo(startX, lineY);
    ctx.lineTo(endX, lineY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(startX, lineY - tickH);
    ctx.lineTo(startX, lineY + tickH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(endX, lineY - tickH);
    ctx.lineTo(endX, lineY + tickH);
    ctx.stroke();

    ctx.font = `bold ${lgSize}px Arial`;
    ctx.fillText(`SOCA ${formatSocaLabel(socaIdx)}`, midX, lineY - Math.round(socaLabelHeight * 0.22));

    ctx.font = `${smSize}px Arial`;
    ctx.fillText(buildCircuitRangeLabel(info.circuits), midX, lineY + Math.round(socaLabelHeight * 0.22));
  });
}
