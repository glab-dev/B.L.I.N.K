// ==================== POWER LAYOUT RENDERER ====================
// Renders the power (circuit/SOCA grouping) layout view.
// Called by generateLayout() dispatcher in index.html.

function renderPowerLayout(params) {
  const {pw, ph, panelWidth, panelHeight, hasCB5HalfRow, originalPh, halfPanelHeight, canvas, ctx, panelsPerCircuit} = params;

  const _pdfMode = typeof pdfLayoutCaptureMode !== 'undefined' && pdfLayoutCaptureMode;
  const _isMultiScreen = typeof pdfMultiScreenCapture !== 'undefined' && pdfMultiScreenCapture;
  const pdfContentPt = 539;
  const canvasScale = _pdfMode ? canvas.width / pdfContentPt : 1;
  // Top row carries column-number markers; left column carries row-number markers.
  // Panel labels now show SOCA.Circuit (e.g. "A.1"), so col/row info lives on the edges.
  const colLabelHeight = _pdfMode ? Math.round((_isMultiScreen ? 50 : 28) * canvasScale) : 28;
  const rowLabelWidth  = _pdfMode ? Math.round((_isMultiScreen ? 50 : 28) * canvasScale) : 28;
  canvas.height += colLabelHeight;
  canvas.width  += rowLabelWidth;
  if (_pdfMode) {
    try {
      window._pdfPowerSocaFraction = colLabelHeight / canvas.height;
      window._pdfPowerRowFraction  = rowLabelWidth / canvas.width;
    } catch(e) {}
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fill marker areas with white (JPEG doesn't support transparency)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, colLabelHeight);
  ctx.fillRect(0, 0, rowLabelWidth, canvas.height);

  // Border lines separating marker bands from the panel grid
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, colLabelHeight);
  ctx.lineTo(canvas.width, colLabelHeight);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rowLabelWidth, 0);
  ctx.lineTo(rowLabelWidth, canvas.height);
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
      const x = c * panelWidth + rowLabelWidth;
      const y = (isHalfPanelRow ? (originalPh * panelHeight) : (r * panelHeight)) + colLabelHeight;

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
      ctx.fillText(`${formatSocaLabel(socaGroup)}.${circuitNum+1}`, x+panelWidth/2, y+currentPanelHeight/2);
    }
  }

  // Column number markers along top, row number markers along left side
  const markerFont = _pdfMode ? Math.round((_isMultiScreen ? 22 : 14) * canvasScale) : 13;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${markerFont}px Arial`;

  for(let c = 0; c < pw; c++) {
    const cx = c * panelWidth + rowLabelWidth + panelWidth / 2;
    ctx.fillText(`${c+1}`, cx, colLabelHeight / 2);
  }

  for(let r = 0; r < ph; r++) {
    const isHalfPanelRow = hasCB5HalfRow && r === originalPh;
    const rowH = isHalfPanelRow ? halfPanelHeight : panelHeight;
    const rowY = (isHalfPanelRow ? (originalPh * panelHeight) : (r * panelHeight)) + colLabelHeight;
    ctx.fillText(`${r+1}`, rowLabelWidth / 2, rowY + rowH / 2);
  }
}
