// ==================== STRUCTURE LAYOUT + FLOOR FRAME HELPERS ====================
// Structure view rendering (bumpers, plates, ladders, floor frames).
// Also contains floor frame calculation helpers used by calculate() and other views.

// Floor frame calculation for floor panels (like BM4)
// Returns array of frame objects with position, size, and type
function calculateFloorFrames(pw, ph, deletedPanelsSet) {
  const frames = [];

  // Create a grid to track which panels are covered
  // true = panel exists and needs frame, false = no panel or already covered
  const needsCoverage = [];
  for(let r = 0; r < ph; r++) {
    needsCoverage[r] = [];
    for(let c = 0; c < pw; c++) {
      const panelKey = `${c},${r}`;
      needsCoverage[r][c] = !deletedPanelsSet.has(panelKey);
    }
  }

  // Frame definitions: [width, height, type name]
  // Order matters - try larger frames first
  const frameTypes = [
    { w: 3, h: 2, type: 'frame_3x2', name: '3x2' },
    { w: 2, h: 3, type: 'frame_3x2', name: '3x2' }, // rotated 3x2
    { w: 2, h: 2, type: 'frame_2x2', name: '2x2' },
    { w: 2, h: 1, type: 'frame_2x1', name: '2x1' },
    { w: 1, h: 2, type: 'frame_2x1', name: '2x1' }, // rotated 2x1
    { w: 1, h: 1, type: 'frame_1x1', name: '1x1' }
  ];

  // Helper to check if a frame can fit at position
  function canPlaceFrame(startC, startR, frameW, frameH) {
    if(startC + frameW > pw || startR + frameH > ph) return false;
    for(let r = startR; r < startR + frameH; r++) {
      for(let c = startC; c < startC + frameW; c++) {
        if(!needsCoverage[r][c]) return false;
      }
    }
    return true;
  }

  // Helper to mark panels as covered
  function markCovered(startC, startR, frameW, frameH) {
    for(let r = startR; r < startR + frameH; r++) {
      for(let c = startC; c < startC + frameW; c++) {
        needsCoverage[r][c] = false;
      }
    }
  }

  // Greedy algorithm: scan grid and place largest possible frame at each uncovered position
  for(let r = 0; r < ph; r++) {
    for(let c = 0; c < pw; c++) {
      if(!needsCoverage[r][c]) continue;

      // Try each frame type from largest to smallest
      for(const frameType of frameTypes) {
        if(canPlaceFrame(c, r, frameType.w, frameType.h)) {
          frames.push({
            col: c,
            row: r,
            width: frameType.w,
            height: frameType.h,
            type: frameType.type,
            name: frameType.name
          });
          markCovered(c, r, frameType.w, frameType.h);
          break;
        }
      }
    }
  }

  return frames;
}

// Get frame counts from calculated frames
function getFloorFrameCounts(frames) {
  const counts = {
    frame_1x1: 0,
    frame_2x1: 0,
    frame_2x2: 0,
    frame_3x2: 0
  };

  frames.forEach(frame => {
    counts[frame.type]++;
  });

  return counts;
}

// Structure View generation
function generateStructureLayout(){
  const allPanels = getAllPanels();
  const p=allPanels[document.getElementById('panelType').value];
  if(!p || !p.width_m || !p.height_m){ return; }

  const {pw, ph} = getEffectivePanelCountsForLayout();

  const canvas = document.getElementById('structureCanvas');
  const ctx = canvas.getContext('2d');

  // Calculate dynamic panel size based on container width
  const structContainer = document.getElementById('structureContainer');
  // Only show structure container in complex mode (not simple mode)
  const isSimpleMode = typeof currentAppMode !== 'undefined' && currentAppMode === 'simple';
  if(!isSimpleMode) {
    structContainer.style.display = 'block';
  }
  const structContainerWidth = structContainer.clientWidth - 32; // Account for padding
  const maxStructCanvasWidth = Math.min(structContainerWidth, 800); // Cap at 800px max
  const minStructSize = 30; // Minimum panel size
  const maxStructSize = 80; // Maximum panel size
  const calculatedStructSize = Math.floor(maxStructCanvasWidth / pw);
  const size = Math.max(minStructSize, Math.min(maxStructSize, calculatedStructSize));

  // Get panel type and calculate height ratio for CB5_MKII full panels
  const panelType = document.getElementById('panelType').value;
  const heightRatio = getPanelHeightRatio(panelType);
  const panelWidth = size;
  const panelHeight = size * heightRatio;

  // Check if CB5 half panel row is enabled - last row should be square
  const hasCB5HalfRow = cb5HalfRowEnabled && panelType === 'CB5_MKII';
  const originalPh = hasCB5HalfRow ? ph - 1 : ph;
  const halfPanelHeight = size; // Half panels are square

  const bumperHeight = Math.max(30, size * 0.8); // Scale bumper height with panel size
  const fourWayHeight = Math.max(15, size * 0.4); // Scale 4-way height with panel size
  const fourWayGap = 5; // Gap between 2W and 4W bumpers

  // Check if 4-way bumpers are enabled
  const use4Way = use4WayBumpersEnabled;
  const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';
  const has4WayBumpers = use4Way && isCB5;

  // Calculate canvas height - add space for bumpers and 4-way bumpers
  // Account for half panel row if enabled
  let canvasHeight = hasCB5HalfRow ? (originalPh * panelHeight + halfPanelHeight) : (ph * panelHeight);
  if(showTopBumper) {
    canvasHeight += bumperHeight;
    if(has4WayBumpers) canvasHeight += fourWayHeight + fourWayGap;
  }
  if(showBottomBumper) {
    canvasHeight += bumperHeight;
    if(has4WayBumpers) canvasHeight += fourWayHeight + fourWayGap;
  }

  canvas.width = pw * panelWidth;
  canvas.height = canvasHeight;

  // Update global panelSize for consistent sizing across all functions
  panelSize = size;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fill entire canvas with dark background (same as deleted panels)
  ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#ffffff' : '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const fontSize = Math.max(10, Math.floor(size * 0.22));
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Y offset for panels - leave space for top bumper and 4-way if enabled
  let panelYOffset = 0;
  if(showTopBumper) {
    panelYOffset += bumperHeight;
    if(has4WayBumpers) panelYOffset += fourWayHeight + fourWayGap;
  }

  // Draw all panels with black outline and labels
  for(let c=0;c<pw;c++){
    for(let r=0;r<ph;r++){
      const panelKey = `${c},${r}`;

      // Determine if this row is the half panel row
      const isHalfPanelRow = hasCB5HalfRow && r === originalPh;
      const currentPanelHeight = isHalfPanelRow ? halfPanelHeight : panelHeight;
      const x = c * panelWidth;
      const y = panelYOffset + (isHalfPanelRow ? (originalPh * panelHeight) : (r * panelHeight));

      // Skip deleted panels - they'll show the dark background
      if(deletedPanels.has(panelKey)) {
        // Draw dashed outline for deleted panels
        ctx.strokeStyle='#333333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x, y, panelWidth, currentPanelHeight);
        ctx.setLineDash([]);
        continue;
      }

      // White background for panels
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, panelWidth, currentPanelHeight);

      // Black outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, panelWidth, currentPanelHeight);

      // Black label
      ctx.fillStyle = '#000000';
      ctx.fillText(`${c+1}.${r+1}`, x+panelWidth/2, y+currentPanelHeight/2);
    }
  }

  // Draw floor frames if this is a floor configuration
  const structureType = document.getElementById('structureType').value;
  if(structureType === 'floor' && p.is_floor_panel && p.floor_frames) {
    const frames = calculateFloorFrames(pw, ph, deletedPanels);
    const frameLineWidth = 4;

    // Draw each frame's outline
    frames.forEach(frame => {
      const frameX = frame.col * panelWidth;
      const frameY = panelYOffset + frame.row * panelHeight;
      const frameW = frame.width * panelWidth;
      const frameH = frame.height * panelHeight;

      // Get color for this frame type
      const color = floorFrameColors[frame.type] || '#ffffff';

      // Draw thick colored outline
      ctx.strokeStyle = color;
      ctx.lineWidth = frameLineWidth;
      ctx.strokeRect(frameX + frameLineWidth/2, frameY + frameLineWidth/2,
                     frameW - frameLineWidth, frameH - frameLineWidth);

      // Draw black outline around the colored one for visibility
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(frameX + 1, frameY + 1, frameW - 2, frameH - 2);
      ctx.strokeRect(frameX + frameLineWidth + 1, frameY + frameLineWidth + 1,
                     frameW - frameLineWidth * 2 - 2, frameH - frameLineWidth * 2 - 2);

      // Draw frame label in center
      const labelX = frameX + frameW / 2;
      const labelY = frameY + frameH / 2;
      const labelFontSize = Math.max(12, Math.floor(size * 0.3));

      // Draw label background
      ctx.font = `bold ${labelFontSize}px Arial`;
      const labelText = frame.name;
      const textMetrics = ctx.measureText(labelText);
      const labelPadding = 4;
      const bgWidth = textMetrics.width + labelPadding * 2;
      const bgHeight = labelFontSize + labelPadding * 2;

      ctx.fillStyle = color;
      ctx.fillRect(labelX - bgWidth/2, labelY - bgHeight/2, bgWidth, bgHeight);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(labelX - bgWidth/2, labelY - bgHeight/2, bgWidth, bgHeight);

      // Draw label text
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, labelX, labelY);
    });

    // Reset text alignment
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }

  // Draw connecting plates if enabled (reusing panelType from above)
  const useConnectingPlates = shouldUseConnectingPlates(panelType);

  if(useConnectingPlates) {
    const plateThickness = 4; // Thickness of plate indicator
    const plateLength = 12; // Length of 2-way plate indicator
    const plate4WaySize = 8; // Size of 4-way plate square

    // Determine if hanging (top bumpers) or ground stacking (bottom bumpers)
    const isHanging = showTopBumper;
    const isGroundStacking = showBottomBumper;

    // Draw 2-way plates (yellow) at perimeter intersections only

    // LEFT EDGE - vertical 2-way plates at panel joints
    for(let r = 0; r < ph - 1; r++) {
      const panelKey = `0,${r}`;
      const belowKey = `0,${r+1}`;
      if(!deletedPanels.has(panelKey) && !deletedPanels.has(belowKey)) {
        const x = 2; // Left edge
        const y = panelYOffset + (r + 1) * panelHeight - plateLength/2; // At the joint between panels

        ctx.fillStyle = '#FFD700'; // Gold/yellow for 2-way
        ctx.fillRect(x, y, plateThickness, plateLength);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, plateThickness, plateLength);
      }
    }

    // RIGHT EDGE - vertical 2-way plates at panel joints
    for(let r = 0; r < ph - 1; r++) {
      const panelKey = `${pw-1},${r}`;
      const belowKey = `${pw-1},${r+1}`;
      if(!deletedPanels.has(panelKey) && !deletedPanels.has(belowKey)) {
        const x = pw * panelWidth - plateThickness - 2; // Right edge
        const y = panelYOffset + (r + 1) * panelHeight - plateLength/2; // At the joint between panels

        ctx.fillStyle = '#FFD700'; // Gold/yellow for 2-way
        ctx.fillRect(x, y, plateThickness, plateLength);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, plateThickness, plateLength);
      }
    }

    // TOP EDGE (if ground stacking) - horizontal 2-way plates at panel joints
    if(isGroundStacking) {
      for(let c = 0; c < pw - 1; c++) {
        const panelKey = `${c},0`;
        const rightKey = `${c+1},0`;
        if(!deletedPanels.has(panelKey) && !deletedPanels.has(rightKey)) {
          const x = (c + 1) * panelWidth - plateLength/2; // At the joint between panels
          const y = panelYOffset + 2; // Top edge of panels

          ctx.fillStyle = '#FFD700'; // Gold/yellow for 2-way
          ctx.fillRect(x, y, plateLength, plateThickness);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, plateLength, plateThickness);
        }
      }
    }

    // BOTTOM EDGE (if hanging) - horizontal 2-way plates at panel joints
    if(isHanging) {
      for(let c = 0; c < pw - 1; c++) {
        const panelKey = `${c},${ph-1}`;
        const rightKey = `${c+1},${ph-1}`;
        if(!deletedPanels.has(panelKey) && !deletedPanels.has(rightKey)) {
          const x = (c + 1) * panelWidth - plateLength/2; // At the joint between panels
          const y = panelYOffset + ph * panelHeight - plateThickness - 2; // Bottom edge of panels

          ctx.fillStyle = '#FFD700'; // Gold/yellow for 2-way
          ctx.fillRect(x, y, plateLength, plateThickness);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, plateLength, plateThickness);
        }
      }
    }

    // CORNER 2-way plates connecting to bumpers
    // TOP-LEFT CORNER (if hanging)
    if(isHanging) {
      const topLeftKey = `0,0`;
      if(!deletedPanels.has(topLeftKey)) {
        // Horizontal plate at top-left
        const x = 2;
        const y = panelYOffset - plateThickness - 2;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x, y, plateLength, plateThickness);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, plateLength, plateThickness);
      }
    }

    // TOP-RIGHT CORNER (if hanging)
    if(isHanging) {
      const topRightKey = `${pw-1},0`;
      if(!deletedPanels.has(topRightKey)) {
        // Horizontal plate at top-right
        const x = pw * panelWidth - plateLength - 2;
        const y = panelYOffset - plateThickness - 2;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x, y, plateLength, plateThickness);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, plateLength, plateThickness);
      }
    }

    // BOTTOM-LEFT CORNER (if ground stacking)
    if(isGroundStacking) {
      const bottomLeftKey = `0,${ph-1}`;
      if(!deletedPanels.has(bottomLeftKey)) {
        // Horizontal plate at bottom-left
        const x = 2;
        const y = panelYOffset + ph * panelHeight + 2;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x, y, plateLength, plateThickness);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, plateLength, plateThickness);
      }
    }

    // BOTTOM-RIGHT CORNER (if ground stacking)
    if(isGroundStacking) {
      const bottomRightKey = `${pw-1},${ph-1}`;
      if(!deletedPanels.has(bottomRightKey)) {
        // Horizontal plate at bottom-right
        const x = pw * panelWidth - plateLength - 2;
        const y = panelYOffset + ph * panelHeight + 2;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x, y, plateLength, plateThickness);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, plateLength, plateThickness);
      }
    }

    // VERTICAL PLATES at edges where panels meet bumpers
    // TOP-LEFT vertical (if hanging)
    if(isHanging) {
      const topLeftKey = `0,0`;
      if(!deletedPanels.has(topLeftKey)) {
        const x = 2;
        const y = panelYOffset - plateLength/2 - 2;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x, y, plateThickness, plateLength);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, plateThickness, plateLength);
      }
    }

    // TOP-RIGHT vertical (if hanging)
    if(isHanging) {
      const topRightKey = `${pw-1},0`;
      if(!deletedPanels.has(topRightKey)) {
        const x = pw * panelWidth - plateThickness - 2;
        const y = panelYOffset - plateLength/2 - 2;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x, y, plateThickness, plateLength);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, plateThickness, plateLength);
      }
    }

    // BOTTOM-LEFT vertical (if ground stacking)
    if(isGroundStacking) {
      const bottomLeftKey = `0,${ph-1}`;
      if(!deletedPanels.has(bottomLeftKey)) {
        const x = 2;
        const y = panelYOffset + ph * panelHeight - plateLength/2 + 2;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x, y, plateThickness, plateLength);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, plateThickness, plateLength);
      }
    }

    // BOTTOM-RIGHT vertical (if ground stacking)
    if(isGroundStacking) {
      const bottomRightKey = `${pw-1},${ph-1}`;
      if(!deletedPanels.has(bottomRightKey)) {
        const x = pw * panelWidth - plateThickness - 2;
        const y = panelYOffset + ph * panelHeight - plateLength/2 + 2;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x, y, plateThickness, plateLength);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, plateThickness, plateLength);
      }
    }

    // Draw 4-way plates (red) at interior panel intersections
    for(let c = 0; c < pw - 1; c++) {
      for(let r = 0; r < ph - 1; r++) {
        const topLeft = `${c},${r}`;
        const topRight = `${c+1},${r}`;
        const bottomLeft = `${c},${r+1}`;
        const bottomRight = `${c+1},${r+1}`;

        // Only draw if all 4 panels exist (not deleted)
        if(!deletedPanels.has(topLeft) && !deletedPanels.has(topRight) &&
           !deletedPanels.has(bottomLeft) && !deletedPanels.has(bottomRight)) {
          const x = (c + 1) * panelWidth - plate4WaySize/2;
          const y = panelYOffset + (r + 1) * panelHeight - plate4WaySize/2;

          ctx.fillStyle = '#FF4444'; // Red for 4-way
          ctx.fillRect(x, y, plate4WaySize, plate4WaySize);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, plate4WaySize, plate4WaySize);
        }
      }
    }

    // Draw 4-way plates (red) connecting panels to TOP BUMPERS (if hanging)
    // Align with interior panel intersections (columns between panels)
    // Show for any panel type that has bumpers (CB5 with 4-way, or DM2.6, etc.)
    if(isHanging && (showTopBumper)) {
      for(let c = 0; c < pw - 1; c++) {
        const topLeftKey = `${c},0`;
        const topRightKey = `${c+1},0`;
        if(!deletedPanels.has(topLeftKey) && !deletedPanels.has(topRightKey)) {
          const x = (c + 1) * panelWidth - plate4WaySize/2; // Align with interior intersections
          const y = panelYOffset - plate4WaySize/2; // Between bumper and panel

          ctx.fillStyle = '#FF4444'; // Red for 4-way
          ctx.fillRect(x, y, plate4WaySize, plate4WaySize);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, plate4WaySize, plate4WaySize);
        }
      }
    }

    // Draw 4-way plates (red) connecting panels to BOTTOM BUMPERS (if ground stacking)
    // Align with interior panel intersections (columns between panels)
    // Show for any panel type that has bumpers (CB5 with 4-way, or DM2.6, etc.)
    if(isGroundStacking && (showBottomBumper)) {
      for(let c = 0; c < pw - 1; c++) {
        const bottomLeftKey = `${c},${ph-1}`;
        const bottomRightKey = `${c+1},${ph-1}`;
        if(!deletedPanels.has(bottomLeftKey) && !deletedPanels.has(bottomRightKey)) {
          const x = (c + 1) * panelWidth - plate4WaySize/2; // Align with interior intersections
          const y = panelYOffset + ph * panelHeight - plate4WaySize/2; // Between panel and bumper

          ctx.fillStyle = '#FF4444'; // Red for 4-way
          ctx.fillRect(x, y, plate4WaySize, plate4WaySize);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, plate4WaySize, plate4WaySize);
        }
      }
    }
  }

  // Initialize bumpers if not already done and not previously customized
  // Check bumpersInitialized flag from current screen data to respect user's bumper customizations
  const currentScreenData = screens[currentScreenId]?.data;
  const bumpersAlreadyInitialized = currentScreenData?.bumpersInitialized || false;
  if(bumpers.length === 0 && (showTopBumper || showBottomBumper) && !bumpersAlreadyInitialized) {
    initializeBumpers();
  }

  // Draw ground support hardware (bridge clamps and ladders) if ground stacking
  const isGroundStacking = showBottomBumper;
  // Track which bumpers have ladders (for drawing ladder bases)
  const bumpersWithLadders = new Set();

  // Check if CB5 panels with air frames - they don't need bridge clamps or rear truss
  const isCB5WithAirframes = (panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF') && connectionMethod === 'airframe';

  if(isGroundStacking) {
    const bridgeClampSize = 14; // Size of bridge clamp indicator
    const ladderWidth = 8; // Width of ladder piece
    const ladderHeightPanels = isCB5WithAirframes ? 1 : 2; // CB5 with airframes: 1 panel per ladder section, others: 2 panels

    // Get columns that have bottom bumpers (ladders are bound to bumpers)
    const columnsWithBumpers = new Set();
    const bumperToColumnMap = new Map(); // Map bumper id to its ladder column

    bumpers.filter(b => b.position === 'bottom').forEach(bumper => {
      // For bottom bumpers, get the columns they cover
      const cols = getBumperColumns(bumper);
      if(cols.length > 0) {
        // Check if bumper has a custom ladder column setting
        let ladderCol;
        if(bumper.type === '2w' && bumper.ladderColumn === 'right') {
          // Use the right (second) column
          ladderCol = cols[1] !== undefined ? cols[1] : cols[0];
        } else {
          // Default: use the left (first) column
          ladderCol = cols[0];
        }
        columnsWithBumpers.add(ladderCol);
        bumperToColumnMap.set(bumper.id, ladderCol);
        bumpersWithLadders.add(bumper.id);
      }
    });

    // Draw REAR LADDER (cyan) - only in columns with bumpers, centered horizontally
    // For CB5 with airframes: ladders extend full height (1 panel sections)
    // For others: Each ladder is 2 panels high, stacked from BOTTOM up
    ctx.fillStyle = '#00CED1'; // Cyan for ladder pieces

    columnsWithBumpers.forEach(c => {
      // Find the topmost and bottommost non-deleted panel in this column
      let topRow = -1;
      let bottomRow = -1;

      for(let r = 0; r < ph; r++) {
        const panelKey = `${c},${r}`;
        if(!deletedPanels.has(panelKey)) {
          if(topRow === -1) topRow = r;
          bottomRow = r;
        }
      }

      // Draw ladders if there are panels in this column
      if(topRow !== -1 && bottomRow !== -1) {
        const totalPanelsInColumn = bottomRow - topRow + 1;
        // For CB5 with airframes: draw full height ladder
        // For others: Only complete 2-panel sections get ladders (from bottom)
        const numLadders = isCB5WithAirframes ? totalPanelsInColumn : Math.floor(totalPanelsInColumn / ladderHeightPanels);

        // Draw each ladder piece from bottom to top
        for(let ladderIndex = 0; ladderIndex < numLadders; ladderIndex++) {
          // Calculate which rows this ladder covers (from bottom)
          const ladderBottomRow = bottomRow - (ladderIndex * ladderHeightPanels);
          const ladderTopRow = ladderBottomRow - ladderHeightPanels + 1;

          // Skip if ladder would be above the topmost panel
          if(ladderTopRow < topRow) continue;

          const ladderX = c * panelWidth + panelWidth/2 - ladderWidth/2; // Centered in column
          const ladderTopY = panelYOffset + ladderTopRow * panelHeight + 4;
          const ladderHeight = ladderHeightPanels * panelHeight - 8;

          // Draw ladder as a rounded rectangle
          ctx.fillStyle = '#00CED1'; // Cyan
          ctx.beginPath();
          ctx.roundRect(ladderX, ladderTopY, ladderWidth, ladderHeight, 2);
          ctx.fill();

          // Black outline
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Draw ladder rungs
          ctx.strokeStyle = '#008B8B'; // Darker cyan for rungs
          ctx.lineWidth = 1;
          const rungSpacing = panelHeight / 2;
          for(let y = ladderTopY + rungSpacing; y < ladderTopY + ladderHeight - 5; y += rungSpacing) {
            ctx.beginPath();
            ctx.moveTo(ladderX + 1, y);
            ctx.lineTo(ladderX + ladderWidth - 1, y);
            ctx.stroke();
          }
        }
      }
    });

    // Draw BRIDGE CLAMPS (purple) - only on columns with ladders (bound to bumpers)
    // Skip for CB5 with airframes - they don't need bridge clamps
    if(!isCB5WithAirframes) {
      // In center of panels, every 2nd row from bottom (2nd, 4th, 6th, etc.)
      ctx.fillStyle = '#9932CC'; // Purple for bridge clamps
      columnsWithBumpers.forEach(c => {
        // Start from 2nd row from bottom (index ph-2), then every 2nd row going up
        for(let r = ph - 2; r >= 0; r -= 2) {
          const panelKey = `${c},${r}`;
          if(!deletedPanels.has(panelKey)) {
            // Draw bridge clamp as a filled circle at center of panel
            ctx.beginPath();
            ctx.arc(c * panelWidth + panelWidth/2, panelYOffset + r * panelHeight + panelHeight/2, bridgeClampSize/2, 0, Math.PI * 2);
            ctx.fill();

            // Black outline
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      });
    }
  }

  // Draw all bumpers and store their positions for interaction
  // Pass bumpersWithLadders so we can draw ladder bases inside bumpers
  drawAllBumpers(ctx, pw, ph, panelWidth, panelHeight, bumperHeight, fourWayHeight, fourWayGap, panelYOffset, bumpersWithLadders);

  // Update pickup weight summary
  updatePickupWeightSummary();

  // Setup interactivity for bumpers
  setupStructureCanvasInteractivity();
}
