// ==================== STANDARD LAYOUT RENDERER ====================
// Renders the standard (panel numbering) layout view.
// Called by generateLayout() dispatcher in index.html.

function renderStandardLayout(params) {
  const {pw, ph, panelWidth, panelHeight, hasCB5HalfRow, originalPh, halfPanelHeight, canvas, ctx, fontSize} = params;

  currentCanvas = canvas;
  currentPw = pw;
  currentPh = ph;

  for(let c=0;c<pw;c++){
    for(let r=0;r<ph;r++){
      const panelKey = `${c},${r}`;

      // Determine if this row is the half panel row (last row when hasCB5HalfRow)
      const isHalfPanelRow = hasCB5HalfRow && r === originalPh;
      const currentPanelHeight = isHalfPanelRow ? halfPanelHeight : panelHeight;
      // Calculate Y position: full panels use panelHeight, half panel row starts after all full panels
      const y = isHalfPanelRow ? (originalPh * panelHeight) : (r * panelHeight);
      const x = c * panelWidth;

      // Skip deleted panels
      if(deletedPanels.has(panelKey)) {
        ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a'; // White for eco print, dark otherwise
        ctx.fillRect(x, y, panelWidth, currentPanelHeight);
        ctx.strokeStyle = (ecoPrintMode || greyscalePrintMode) ? '#cccccc' : '#333333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x, y, panelWidth, currentPanelHeight);
        ctx.setLineDash([]);
        continue;
      }

      const fillColor = getStandardColorForPanel(c, r);
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, panelWidth, currentPanelHeight);

      // Highlight selected panels
      if(selectedPanels.has(panelKey)) {
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 4;
        ctx.strokeRect(x+2, y+2, panelWidth-4, currentPanelHeight-4);
      }

      // Show indicators for custom assignments
      if(customCircuitAssignments.has(panelKey)) {
        ctx.fillStyle = '#FFD700'; // Gold indicator for circuit
        ctx.fillRect(x+panelWidth-10, y+2, 8, 8);
      }
      if(customDataLineAssignments.has(panelKey)) {
        ctx.fillStyle = '#00CED1'; // Cyan indicator for data line
        ctx.fillRect(x+2, y+currentPanelHeight-10, 8, 8);
      }

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, panelWidth, currentPanelHeight);
      ctx.fillStyle = '#000000'; // Always use black text (no black panels in standard layout)
      ctx.fillText(`${c+1}.${r+1}`, x+panelWidth/2, y+currentPanelHeight/2);
    }
  }
}
