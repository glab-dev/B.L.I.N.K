// ==================== POWER LAYOUT RENDERER ====================
// Renders the power (circuit/SOCA grouping) layout view.
// Called by generateLayout() dispatcher in index.html.

function renderPowerLayout(params) {
  const {pw, ph, panelWidth, panelHeight, hasCB5HalfRow, originalPh, halfPanelHeight, canvas, ctx, panelsPerCircuit} = params;

  const socaLabelHeight = 60;
  canvas.height += socaLabelHeight;
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

      // Determine which SOCA group this circuit belongs to
      const socaGroup = Math.floor(circuitNum / 6);
      const colorIndex = circuitNum % 6;
      const colors = colorForIndex(colorIndex);

      // Lighten the color based on SOCA group (10% lighter for each SOCA)
      const lightenPercent = socaGroup * 0.15; // 15% lighter per SOCA group
      const fillColor = lightenColor(colors.solid, lightenPercent);

      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, panelWidth, currentPanelHeight);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, panelWidth, currentPanelHeight);

      // Always use black text (no black panels in power layout)
      ctx.fillStyle = '#000000';

      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${c+1}.${r+1}`, x+panelWidth/2, y+currentPanelHeight/2);
    }
  }

  // Draw SOCA labels
  // Find the actual max circuit number used (including custom assignments)
  let maxCircuitNum = 0;
  panelToCircuit.forEach(circuitNum => {
    if(circuitNum > maxCircuitNum) maxCircuitNum = circuitNum;
  });
  const totalCircuits = maxCircuitNum + 1;
  const socaGroups = Math.ceil(totalCircuits / 6);

  // Build a map of circuit number -> panels with that circuit
  const circuitPanelMap = new Map();
  for(let c=0; c<pw; c++){
    for(let r=0; r<ph; r++){
      const panelKey = `${c},${r}`;
      if(deletedPanels.has(panelKey)) continue;

      const circuitNum = panelToCircuit.get(panelKey);
      if(circuitNum !== undefined) {
        if(!circuitPanelMap.has(circuitNum)) {
          circuitPanelMap.set(circuitNum, []);
        }
        circuitPanelMap.get(circuitNum).push({
          c: c,
          r: r,
          x: c * panelWidth
        });
      }
    }
  }

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for(let s = 0; s < socaGroups; s++){
    const startCircuit = s * 6;
    const endCircuit = Math.min((s + 1) * 6 - 1, totalCircuits - 1);

    // Find the leftmost and rightmost panels in this SOCA group
    let minX = Infinity;
    let maxX = -Infinity;

    for(let circuit = startCircuit; circuit <= endCircuit; circuit++) {
      if(circuitPanelMap.has(circuit)) {
        const panels = circuitPanelMap.get(circuit);
        panels.forEach(p => {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
        });
      }
    }

    // If no panels found, skip this SOCA
    if(minX === Infinity) continue;

    const lineY = 35;
    const startX = minX;
    const endX = maxX + panelWidth;
    const midX = (startX + endX) / 2;

    // Draw horizontal line across the top
    ctx.beginPath();
    ctx.moveTo(startX, lineY);
    ctx.lineTo(endX, lineY);
    ctx.stroke();

    // Draw vertical ticks at the ends
    ctx.beginPath();
    ctx.moveTo(startX, lineY - 8);
    ctx.lineTo(startX, lineY + 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(endX, lineY - 8);
    ctx.lineTo(endX, lineY + 8);
    ctx.stroke();

    // Draw SOCA label above the line
    ctx.fillText(`SOCA ${s + 1}`, midX, lineY - 20);

    // Draw circuit range below the line
    ctx.font = '12px Arial';
    const circuitRange = startCircuit === endCircuit ?
      `Circuit ${startCircuit + 1}` :
      `Circuits ${startCircuit + 1}-${endCircuit + 1}`;
    ctx.fillText(circuitRange, midX, lineY + 20);
    ctx.font = 'bold 16px Arial';
  }
}
