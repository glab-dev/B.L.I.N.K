// ==================== STRUCTURE DRAWING & INTERACTIVITY ====================
// Bumper rendering, structure canvas interaction, drag/drop, toggle bumpers.
// Depends on globals: bumpers, showTopBumper, showBottomBumper, panelSize,
// currentPanelWidth, currentPanelHeight, structureDraggingBumper, etc.

// Draw all bumpers from the bumpers array
function drawAllBumpers(ctx, pw, ph, panelWidth, panelHeight, bumperHeight, fourWayHeight, fourWayGap, panelYOffset, bumpersWithLadders = new Set()) {
  const use4Way = use4WayBumpersEnabled;
  const panelType = document.getElementById('panelType').value;
  const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';

  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw each bumper
  bumpers.forEach(bumper => {
    let x, y, width, height;
    let label = '';
    let fillColor = '';

    if(bumper.type === '4w') {
      // 4-way bumper - spans from center of one 2W to center of next 2W
      // startCol and endCol are already the column positions (centers of 2W bumpers)
      const col1 = bumper.startCol;
      const col2 = bumper.endCol;

      x = col1 * panelWidth;  // Start at column 1, 5, 9... (centers of 2W bumpers)
      width = (col2 - col1) * panelWidth;  // Width of 2 columns
      height = fourWayHeight;

      if(bumper.position === 'top') {
        // 4W bumpers stay at top (they connect to the 2W bumpers which drop down)
        y = 0;
      } else {
        y = panelYOffset + (ph * panelHeight) + bumperHeight + fourWayGap;
      }

      fillColor = greyscalePrintMode ? toGreyscale('#FF6B35') : (ecoPrintMode ? toPastelColor('#FF6B35') : '#FF6B35'); // Orange
      label = '4W';

    } else if(bumper.type === '2w') {
      // 2-way bumper - spans 2 columns
      const col = bumper.startCol;
      x = col * panelWidth;
      width = panelWidth * 2; // Span 2 columns
      height = bumperHeight;

      if(bumper.position === 'top') {
        // For hanging bumpers, drop down to the first non-deleted row
        // Check both columns covered by this 2W bumpers
        const row1 = getFirstNonDeletedRow(col, ph);
        const row2 = getFirstNonDeletedRow(col + 1, ph);
        const maxRow = Math.max(row1, row2); // Use the deeper one so bumper sits on both

        const baseY = use4Way && isCB5 ? (fourWayHeight + fourWayGap) : 0;
        y = baseY + (maxRow * panelHeight); // Drop down by the number of deleted rows
      } else {
        y = panelYOffset + (ph * panelHeight);
      }

      fillColor = greyscalePrintMode ? toGreyscale('#4CAF50') : (ecoPrintMode ? toPastelColor('#4CAF50') : '#4CAF50'); // Green for top, orange for bottom
      if(bumper.position === 'bottom') {
        fillColor = greyscalePrintMode ? toGreyscale('#FF9800') : (ecoPrintMode ? toPastelColor('#FF9800') : '#FF9800');
      }
      label = '2W';

    } else if(bumper.type === '1w') {
      // 1-way bumper - spans 1 column
      const col = bumper.startCol;
      x = col * panelWidth;
      width = panelWidth; // Span 1 column
      height = bumperHeight;

      if(bumper.position === 'top') {
        // For hanging bumpers, drop down to the first non-deleted row
        const firstRow = getFirstNonDeletedRow(col, ph);

        const baseY = use4Way && isCB5 ? (fourWayHeight + fourWayGap) : 0;
        y = baseY + (firstRow * panelHeight); // Drop down by the number of deleted rows
      } else {
        y = panelYOffset + (ph * panelHeight);
      }

      fillColor = greyscalePrintMode ? toGreyscale('#2196F3') : (ecoPrintMode ? toPastelColor('#2196F3') : '#2196F3'); // Blue for 1W
      label = '1W';
    }

    // Store position for interaction
    bumper.x = x;
    bumper.y = y;
    bumper.width = width;
    bumper.height = height;

    // Draw bumper
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, width, height);

    // Draw LADDER BASE (dark blue) inside bumpers that have ladders
    // Only for bottom bumpers (ground support)
    // Position under the column where the ladder is (respects ladderColumn setting)
    if(bumper.position === 'bottom' && bumpersWithLadders.has(bumper.id)) {
      const ladderBaseWidth = panelWidth * 0.85; // Slightly less than panel width
      const ladderBaseHeight = 10; // Height of ladder base

      // Determine which column the ladder is in
      let ladderColOffset = 0; // Default: first column (left)
      if(bumper.type === '2w' && bumper.ladderColumn === 'right') {
        ladderColOffset = panelWidth; // Move to second column (right)
      }

      // Position under the correct column
      const ladderBaseX = x + ladderColOffset + (panelWidth - ladderBaseWidth) / 2;
      const ladderBaseY = y + (height - ladderBaseHeight) / 2; // Centered vertically in bumper
      
      // Draw ladder base rectangle
      ctx.fillStyle = '#00008B'; // Dark blue
      ctx.beginPath();
      ctx.roundRect(ladderBaseX, ladderBaseY, ladderBaseWidth, ladderBaseHeight, 3);
      ctx.fill();
      
      // Black outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    // Check if bumper is selected (manual mode uses selectedBumpers set)
    const isBumperSelected = (manualBumperMode && selectedBumpers.has(bumper.id)) || 
                              (selectedBumper && selectedBumper.id === bumper.id);
    
    // Add selection highlight
    if(isBumperSelected) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
    }
    
    // Add hover highlight (only in manual mode)
    if(manualBumperMode && hoveredBumper && hoveredBumper.id === bumper.id && !isBumperSelected) {
      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
      ctx.setLineDash([]);
    }
    
    // Draw border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Calculate weight at center point of this bumper
    const pickupWeight = calculateBumperPickupWeight(bumper);

    // Draw label with weight
    ctx.fillStyle = (ecoPrintMode || greyscalePrintMode) ? '#000000' : '#FFFFFF';

    // For small bumpers (especially 4W on mobile), only show weight
    // Check if height is too small for both label and weight
    const isMobile = window.innerWidth <= 768;
    const isSmallBumper = height < 25;

    if(isSmallBumper || (isMobile && bumper.type === '4w')) {
      // Only show weight (centered)
      ctx.font = 'bold 9px Arial';
      const weightValue = displayWeightUnit === 'lbs' ? Math.ceil(pickupWeight.lbs) : Math.ceil(pickupWeight.kg);
      const weightText = `${weightValue}${displayWeightUnit}`;
      ctx.fillText(weightText, x + width/2, y + height/2);
    } else {
      // Show both label and weight
      ctx.font = 'bold 10px Arial';
      ctx.fillText(label, x + width/2, y + height/2 - 6);

      // Draw weight below label using selected unit
      ctx.font = '9px Arial';
      const weightValue = displayWeightUnit === 'lbs' ? Math.ceil(pickupWeight.lbs) : Math.ceil(pickupWeight.kg);
      const weightText = `${weightValue}${displayWeightUnit}`;
      ctx.fillText(weightText, x + width/2, y + height/2 + 6);
    }
  });
}

// Calculate the weight at the center pickup point of a bumper
function calculateBumperPickupWeight(bumper) {
  const panelType = document.getElementById('panelType').value;
  const allPanels = getAllPanels();
  const p = allPanels[panelType];
  const ph = parseInt(document.getElementById('panelsHigh').value) || 0;
  const pw = parseInt(document.getElementById('panelsWide').value) || 0;

  if(!p) return { kg: 0, lbs: 0 };

  // Get correct panel weight based on connection method (air frame vs connecting plates)
  const useConnectingPlates = shouldUseConnectingPlates(panelType);
  const panelWeightKg = getPanelWeight(panelType, useConnectingPlates);

  // Check if CB5 half panel row is enabled
  const hasCB5HalfRow = cb5HalfRowEnabled && panelType === 'CB5_MKII';
  const halfPanelWeightKg = hasCB5HalfRow ? getPanelWeight('CB5_MKII_HALF', useConnectingPlates) : 0;

  let totalPanelWeightKg = 0;
  let bumperWeightLbs = 0;
  
  // Get bumper weights in lbs
  const bumper1wLbs = p.bumper_1w_lbs || 0;
  const bumper2wLbs = p.bumper_2w_lbs || 0;
  const bumper4wLbs = p.bumper_4w_lbs || 0;
  
  // First, get the columns this bumper directly covers
  let directColumns = [];
  
  // Calculate panel weight based on bumper type
  if(bumper.type === '4w') {
    // 4W bumper is the pickup point - it picks up 4 columns of panels + the 4W bar itself
    // The 2W bumpers underneath are structural only, not added to pickup weight
    // bumper.startCol = center of first 2W (e.g., 1 for first 4W)
    // bumper.endCol = center of second 2W (e.g., 3 for first 4W)
    // First 2W covers columns (startCol-1) to startCol
    // Second 2W covers columns (endCol-1) to endCol
    // So we need columns: (startCol-1) to endCol (inclusive)
    const colStart = bumper.startCol - 1; // e.g., 0 for first 4W
    const colEnd = bumper.endCol;         // e.g., 3 for first 4W (not 4!)
    
    console.log(`4W Bumper: startCol=${bumper.startCol}, endCol=${bumper.endCol}, calculating columns ${colStart} to ${colEnd}`);
    
    let panelCount = 0;
    for(let c = colStart; c <= colEnd; c++) {
      if(c >= 0) {
        directColumns.push(c);
        for(let r = 0; r < ph; r++) {
          const panelKey = `${c},${r}`;
          if(!deletedPanels.has(panelKey)) {
            totalPanelWeightKg += panelWeightKg;
            panelCount++;
          }
        }
      }
    }
    
    console.log(`4W Bumper picked up ${panelCount} panels at ${panelWeightKg}kg each = ${totalPanelWeightKg}kg panel weight`);

    // Add half panel row weight if enabled (4 half panels for 4W bumper)
    if(hasCB5HalfRow) {
      totalPanelWeightKg += 4 * halfPanelWeightKg;
    }

    // Add 4W hanging bar weight + 2x 2W bumpers (structural, part of the pickup assembly)
    bumperWeightLbs = bumper4wLbs + (2 * bumper2wLbs);
    console.log(`4W Bumper weight: ${bumper4wLbs}lbs + 2x ${bumper2wLbs}lbs = ${bumperWeightLbs}lbs total`);

  } else if(bumper.type === '2w') {
    // 2W bumper picks up 2 columns + itself
    const colStart = bumper.startCol;
    const colEnd = bumper.endCol;
    
    directColumns.push(colStart, colEnd);
    
    // For hanging bumpers, we need to calculate from the row the bumper is sitting on
    // (which accounts for dropped position due to deleted top panels)
    let startRow = 0;
    if(bumper.position === 'top') {
      // Find the first non-deleted row for both columns - bumper sits on the deeper one
      const row1 = getFirstNonDeletedRow(colStart, ph);
      const row2 = getFirstNonDeletedRow(colEnd, ph);
      startRow = Math.max(row1, row2);
    }
    
    for(let c = colStart; c <= colEnd; c++) {
      for(let r = startRow; r < ph; r++) {
        const panelKey = `${c},${r}`;
        if(!deletedPanels.has(panelKey)) {
          totalPanelWeightKg += panelWeightKg;
        }
      }
    }

    // Add half panel row weight if enabled (2 half panels for 2W bumper)
    if(hasCB5HalfRow) {
      totalPanelWeightKg += 2 * halfPanelWeightKg;
    }

    bumperWeightLbs = bumper2wLbs;

  } else if(bumper.type === '1w') {
    // 1W bumper picks up 1 column + itself
    const col = bumper.startCol;
    
    directColumns.push(col);
    
    // For hanging bumpers, calculate from the row the bumper is sitting on
    let startRow = 0;
    if(bumper.position === 'top') {
      startRow = getFirstNonDeletedRow(col, ph);
    }
    
    for(let r = startRow; r < ph; r++) {
      const panelKey = `${col},${r}`;
      if(!deletedPanels.has(panelKey)) {
        totalPanelWeightKg += panelWeightKg;
      }
    }

    // Add half panel row weight if enabled (1 half panel for 1W bumper)
    if(hasCB5HalfRow) {
      totalPanelWeightKg += halfPanelWeightKg;
    }

    bumperWeightLbs = bumper1wLbs;
  }

  // Now add weight from any orphaned columns that should transfer to this bumper
  const orphanedWeight = getOrphanedColumnWeightForBumper(bumper, pw, ph, panelWeightKg);
  totalPanelWeightKg += orphanedWeight;
  
  const panelWeightLbs = totalPanelWeightKg * 2.20462;
  const totalLbs = panelWeightLbs + bumperWeightLbs;
  const totalKg = totalLbs * 0.453592;
  
  return {
    kg: totalKg,
    lbs: totalLbs,
    panelWeight: totalPanelWeightKg,
    bumperWeight: bumperWeightLbs / 2.20462
  };
}

// Get the first non-deleted row for a column (for top bumpers)
function getFirstNonDeletedRow(column, ph) {
  for(let r = 0; r < ph; r++) {
    const panelKey = `${column},${r}`;
    if(!deletedPanels.has(panelKey)) {
      return r;
    }
  }
  return 0; // If all deleted, return 0
}

// Get the last non-deleted row for a column (for bottom bumpers)
function getLastNonDeletedRow(column, ph) {
  for(let r = ph - 1; r >= 0; r--) {
    const panelKey = `${column},${r}`;
    if(!deletedPanels.has(panelKey)) {
      return r;
    }
  }
  return ph - 1; // If all deleted, return last row
}

// Check if a column should have a bottom bumper (last row panel must exist)
function shouldHaveBottomBumper(column, ph) {
  const lastRow = ph - 1;
  const panelKey = `${column},${lastRow}`;
  return !deletedPanels.has(panelKey);
}

// Get which columns a bumper directly covers
function getBumperColumns(bumper) {
  if(bumper.type === '4w') {
    const colStart = bumper.startCol - 1;
    const colEnd = bumper.endCol;
    const cols = [];
    for(let c = colStart; c <= colEnd; c++) {
      if(c >= 0) cols.push(c);
    }
    return cols;
  } else if(bumper.type === '2w') {
    return [bumper.startCol, bumper.endCol];
  } else if(bumper.type === '1w') {
    return [bumper.startCol];
  }
  return [];
}

// Find all columns that have no bumper covering them (orphaned columns)
function getOrphanedColumns(pw, position) {
  const coveredColumns = new Set();
  
  // Get all columns covered by existing bumpers of the same position
  bumpers.filter(b => b.position === position).forEach(b => {
    getBumperColumns(b).forEach(col => coveredColumns.add(col));
  });
  
  // Find columns that are not covered
  const orphaned = [];
  for(let c = 0; c < pw; c++) {
    if(!coveredColumns.has(c)) {
      orphaned.push(c);
    }
  }
  
  return orphaned;
}

// Find the nearest bumper to a given column
function findNearestBumper(column, position) {
  const samePosiBumpers = bumpers.filter(b => b.position === position && (b.type === '1w' || b.type === '2w'));
  
  if(samePosiBumpers.length === 0) return null;
  
  let nearestBumper = null;
  let nearestDistance = Infinity;
  
  samePosiBumpers.forEach(b => {
    const bumperCols = getBumperColumns(b);
    // Find minimum distance from column to any column covered by this bumper
    bumperCols.forEach(bc => {
      const dist = Math.abs(column - bc);
      if(dist < nearestDistance) {
        nearestDistance = dist;
        nearestBumper = b;
      }
    });
  });
  
  return nearestBumper;
}

// Calculate weight from orphaned columns that should transfer to a specific bumper
function getOrphanedColumnWeightForBumper(bumper, pw, ph, panelWeightKg) {
  // Only calculate for 1w and 2w bumpers (4w bumpers pick up via their 2w sub-bumpers)
  if(bumper.type === '4w') return 0;

  // Check if CB5 half panel row is enabled
  const panelType = document.getElementById('panelType').value;
  const hasCB5HalfRow = cb5HalfRowEnabled && panelType === 'CB5_MKII';
  const useConnectingPlates = shouldUseConnectingPlates(panelType);
  const halfPanelWeightKg = hasCB5HalfRow ? getPanelWeight('CB5_MKII_HALF', useConnectingPlates) : 0;

  const orphanedCols = getOrphanedColumns(pw, bumper.position);
  let additionalWeightKg = 0;

  orphanedCols.forEach(col => {
    // Find which bumper this orphaned column should transfer its weight to
    const nearestBumper = findNearestBumper(col, bumper.position);

    // If this bumper is the nearest one to this orphaned column, add the weight
    if(nearestBumper && nearestBumper.id === bumper.id) {
      // Calculate weight of panels in this orphaned column
      let startRow = 0;
      if(bumper.position === 'top') {
        startRow = getFirstNonDeletedRow(col, ph);
      }

      for(let r = startRow; r < ph; r++) {
        const panelKey = `${col},${r}`;
        if(!deletedPanels.has(panelKey)) {
          additionalWeightKg += panelWeightKg;
        }
      }

      // Add half panel weight for this orphaned column if enabled
      if(hasCB5HalfRow) {
        additionalWeightKg += halfPanelWeightKg;
      }

      console.log(`Orphaned column ${col} weight (${additionalWeightKg.toFixed(2)}kg) transferred to ${bumper.type} bumper #${bumper.id}`);
    }
  });

  return additionalWeightKg;
}

function drawBumpersAdaptive(ctx, pw, ph, size, bumperHeight, yBase, type) {
  const oneWColumn = type === 'top' ? topBumper1wColumn : bottomBumper1wColumn;
  
  // Determine if we need a 1w bumper
  const needsOneW = pw % 2 === 1;
  
  ctx.font = 'bold 12px Arial';
  
  if(!needsOneW) {
    // Even number of panels - just draw 2w bumpers
    for(let c = 0; c < pw; c += 2) {
      // Skip if this is a bottom bumper and either column has bottom row deleted
      if(type === 'bottom') {
        const hasBottomC = shouldHaveBottomBumper(c, ph);
        const hasBottomC1 = (c + 1 < pw) ? shouldHaveBottomBumper(c + 1, ph) : false;
        if(!hasBottomC || !hasBottomC1) {
          continue; // Skip this 2W bumper if either column has bottom row deleted
        }
      }
      
      // Find the appropriate Y position for this bumper pair
      let yOffset;
      if(type === 'top') {
        // Top bumpers: start at yBase, move down with deleted panels at the top
        const row1 = getFirstNonDeletedRow(c, ph);
        const row2 = c + 1 < pw ? getFirstNonDeletedRow(c + 1, ph) : row1;
        const maxRow = Math.max(row1, row2);
        // yBase is where bumpers should start (either 0 or after 4W bumpers)
        yOffset = yBase + (maxRow * size);
      } else {
        // Bottom bumpers: always at bottom (yBase = bottom of panels, so bumper starts at yBase)
        yOffset = yBase;
      }
      
      const x = c * size;
      const width = 2 * size;
      ctx.fillStyle = '#87CEEB'; // Sky blue for 2w
      ctx.fillRect(x, yOffset, width, bumperHeight);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, yOffset, width, bumperHeight);
      ctx.fillStyle = '#000000';
      ctx.fillText('2W', x + width/2, yOffset + bumperHeight/2);
    }
  } else {
    // Odd number of panels - need to place 1w and redistribute 2w bumpers
    // Draw 1W bumper at specified position
    const oneWPos = oneWColumn >= 0 && oneWColumn < pw ? oneWColumn : (pw - 1);
    
    // Check if 1W bumper should be drawn (only for bottom bumpers, check if bottom row exists)
    const shouldDraw1W = type === 'top' || shouldHaveBottomBumper(oneWPos, ph);
    
    if(shouldDraw1W) {
      let yOffset1w;
      if(type === 'top') {
        const row = getFirstNonDeletedRow(oneWPos, ph);
        yOffset1w = yBase + (row * size);
      } else {
        // Bottom bumpers stay at bottom
        yOffset1w = yBase;
      }
      
      const x1w = oneWPos * size;
      ctx.fillStyle = '#FFD700'; // Gold for 1w
      ctx.fillRect(x1w, yOffset1w, size, bumperHeight);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x1w, yOffset1w, size, bumperHeight);
      ctx.fillStyle = '#000000';
      ctx.fillText('1W', x1w + size/2, yOffset1w + bumperHeight/2);
    }
    
    // Now draw 2W bumpers, skipping the 1W position
    for(let c = 0; c < pw; c++) {
      // Skip if this is the 1W position
      if(c === oneWPos) continue;
      
      // Check if we can place a 2W bumper starting at this position
      if(c + 1 < pw && (c + 1) !== oneWPos) {
        // Skip if this is a bottom bumper and either column has bottom row deleted
        if(type === 'bottom') {
          const hasBottomC = shouldHaveBottomBumper(c, ph);
          const hasBottomC1 = shouldHaveBottomBumper(c + 1, ph);
          if(!hasBottomC || !hasBottomC1) {
            c++; // Still skip next column
            continue;
          }
        }
        
        // We can place a 2W bumper here
        let yOffset;
        if(type === 'top') {
          const row1 = getFirstNonDeletedRow(c, ph);
          const row2 = getFirstNonDeletedRow(c + 1, ph);
          const maxRow = Math.max(row1, row2);
          yOffset = yBase + (maxRow * size);
        } else {
          // Bottom bumpers stay at bottom
          yOffset = yBase;
        }
        
        const x = c * size;
        const width = 2 * size;
        ctx.fillStyle = '#87CEEB'; // Sky blue for 2w
        ctx.fillRect(x, yOffset, width, bumperHeight);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, yOffset, width, bumperHeight);
        ctx.fillStyle = '#000000';
        ctx.fillText('2W', x + width/2, yOffset + bumperHeight/2);
        
        // Skip the next column since we just covered it with a 2W
        c++;
      } else {
        // Can't place 2W, need to place 1W here (this handles the remaining columns)
        // Skip if this is a bottom bumper and this column has bottom row deleted
        if(type === 'bottom' && !shouldHaveBottomBumper(c, ph)) {
          continue;
        }
        
        let yOffset;
        if(type === 'top') {
          const row = getFirstNonDeletedRow(c, ph);
          yOffset = yBase + (row * size);
        } else {
          // Bottom bumpers stay at bottom
          yOffset = yBase;
        }
        
        const x = c * size;
        ctx.fillStyle = '#FFD700'; // Gold for remaining 1w
        ctx.fillRect(x, yOffset, size, bumperHeight);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, yOffset, size, bumperHeight);
        ctx.fillStyle = '#000000';
        ctx.fillText('1W', x + size/2, yOffset + bumperHeight/2);
      }
    }
  }
}

function draw4WayBumpers(ctx, pw, ph, size, bumperHeight, yBase, type) {
  const fourWayHeight = 20; // Height of 4-way bumper bar
  const fourWayGap = 5; // Gap between 2W and 4W bumpers
  const fourWayCount = Math.floor(pw / 4); // Each 4W covers 4 columns
  
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for(let i = 0; i < fourWayCount; i++) {
    // Each 4-way bumper is centered over 4 columns with 0.5 panel offset on each side
    // First 4W: from column 0.5 to 4.5 (4 panel widths, centered over panels 1,2,3,4)
    // Second 4W: from column 4.5 to 8.5 (4 panel widths, centered over panels 5,6,7,8)
    // Third 4W: from column 8.5 to 12.5 (4 panel widths, centered over panels 9,10,11,12)
    
    // Start at 0.5, 4.5, 8.5, etc (i*4 + 0.5)
    // End at 4.5, 8.5, 12.5, etc (i*4 + 4.5)
    const x1 = (i * 4 + 0.5) * size;  // Start position
    const width = 4 * size;            // Width is exactly 4 panels
    
    // Position above or below the 2W bumpers
    let yOffset;
    if(type === 'top') {
      // Above the 2W bumpers - at the very top
      yOffset = 0;
    } else {
      // Below the 2W bumpers
      yOffset = yBase + bumperHeight + fourWayGap;
    }
    
    // Draw 4-way bumper
    ctx.fillStyle = '#FF6B35'; // Orange color for 4W
    ctx.fillRect(x1, yOffset, width, fourWayHeight);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, yOffset, width, fourWayHeight);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('4W', x1 + width/2, yOffset + fourWayHeight/2);
  }
}

function setupStructureCanvasInteractivity() {
  const canvas = document.getElementById('structureCanvas');
  if(!canvas) return;
  
  // Store reference but don't clone - cloning erases the canvas content!
  structureCanvas = canvas;
  
  // Remove existing listeners by using a flag to track if already set up
  if(canvas._structureListenersAttached) {
    return; // Already set up, don't duplicate listeners
  }
  canvas._structureListenersAttached = true;
  
  canvas.style.cursor = manualBumperMode ? 'pointer' : 'default';
  
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let bumperDragStartCol = -1; // Track starting column for undo
  
  // Left click - select bumpers in manual mode
  canvas.addEventListener('mousedown', function(e) {
    if(e.button !== 0) return; // Only left click
    
    hideContextMenu();
    
    // Check for modifier keys (Ctrl on Windows/Linux, Cmd on Mac)
    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
    
    // Check if clicking on a bumper
    const bumper = getBumperAtMouse(canvas, e.clientX, e.clientY);
    
    if(bumper) {
      if(manualBumperMode) {
        // In manual mode - handle selection
        if(!isMultiSelect) {
          selectedBumpers.clear();
        }
        
        // Toggle bumper selection
        if(selectedBumpers.has(bumper.id)) {
          selectedBumpers.delete(bumper.id);
        } else {
          selectedBumpers.add(bumper.id);
        }
        
        selectedBumper = bumper;
        structureDraggingBumper = bumper;
        bumperDragStartCol = bumper.startCol; // Save start position for undo
        
        // Calculate drag offset
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        dragOffsetX = mouseX - bumper.x;
        dragOffsetY = mouseY - bumper.y;
        
        canvas.style.cursor = 'grabbing';
        updateStructureSelectionInfo();
        generateStructureLayout();
      } else {
        // Not in manual mode - no interaction
      }
      
      structureIsDragging = true;
      structureDragStartX = e.clientX;
      structureDragStartY = e.clientY;
      return;
    }
    
    // Clicked on empty space - clear selection in manual mode
    if(manualBumperMode && !isMultiSelect) {
      selectedBumpers.clear();
      selectedBumper = null;
      updateStructureSelectionInfo();
      generateStructureLayout();
    }
  });
  
  // Mouse move - drag bumper (only in manual mode)
  canvas.addEventListener('mousemove', function(e) {
    // Handle bumper dragging (only in manual mode)
    if(structureDraggingBumper && manualBumperMode) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

      const size = panelSize; // Use global panelSize for consistent sizing
      const newCol = Math.floor((mouseX - dragOffsetX) / size);
      const pw = parseInt(document.getElementById('panelsWide').value) || 0;
      
      // Constrain to valid columns
      if(newCol >= 0 && newCol < pw) {
        const bumperWidth = structureDraggingBumper.endCol - structureDraggingBumper.startCol;
        const maxStartCol = Math.max(0, pw - 1 - bumperWidth);
        const constrainedCol = Math.max(0, Math.min(newCol, maxStartCol));
        
        if(constrainedCol !== structureDraggingBumper.startCol) {
          const colDelta = constrainedCol - structureDraggingBumper.startCol;
          structureDraggingBumper.startCol = constrainedCol;
          structureDraggingBumper.endCol = structureDraggingBumper.endCol + colDelta;
          
          generateStructureLayout();
        }
      }
      return;
    }
    
    // Show hover effects for bumpers (only in manual mode)
    if(manualBumperMode) {
      const bumper = getBumperAtMouse(canvas, e.clientX, e.clientY);
      
      if(bumper) {
        canvas.style.cursor = 'grab';
        if(!hoveredBumper || hoveredBumper.id !== bumper.id) {
          hoveredBumper = bumper;
          generateStructureLayout();
        }
      } else {
        canvas.style.cursor = 'default';
        if(hoveredBumper) {
          hoveredBumper = null;
          generateStructureLayout();
        }
      }
    } else {
      canvas.style.cursor = 'default';
    }
  });
  
  // Mouse up - end drag and save state if bumper was moved
  canvas.addEventListener('mouseup', function(e) {
    if(structureDraggingBumper && manualBumperMode) {
      // Check if bumper was actually moved
      if(bumperDragStartCol !== -1 && bumperDragStartCol !== structureDraggingBumper.startCol) {
        saveStructureState(); // Save state after move
      }
      
      structureDraggingBumper = null;
      bumperDragStartCol = -1;
      canvas.style.cursor = 'pointer';
      
      // Update weight and calculations
      updateWeightDisplay();
      calculate();
      updateStructureUndoRedoButtons();
    }
    structureIsDragging = false;
  });
  
  // Right click - context menu (only in manual mode)
  canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    
    if(!manualBumperMode) return;
    
    const bumper = getBumperAtMouse(canvas, e.clientX, e.clientY);
    
    if(bumper) {
      // If clicked bumper is not selected, select only it
      if(!selectedBumpers.has(bumper.id)) {
        selectedBumpers.clear();
        selectedBumpers.add(bumper.id);
        updateStructureSelectionInfo();
        generateStructureLayout();
      }
      
      // Show bumper context menu
      showBumperContextMenu(bumper, e.clientX, e.clientY);
      return;
    }
    
    // Check if clicking in a bumper area (top or bottom) for adding bumpers
    const rect = canvas.getBoundingClientRect();
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);

    const pw = parseInt(document.getElementById('panelsWide').value) || 0;
    const ph = parseInt(document.getElementById('panelsHigh').value) || 0;
    const size = panelSize; // Use global panelSize for consistent sizing
    const bumperHeight = Math.max(30, size * 0.8);
    const fourWayHeight = Math.max(15, size * 0.4);
    const fourWayGap = Math.max(3, size * 0.1);
    
    const use4Way = use4WayBumpersEnabled;
    const panelType = document.getElementById('panelType').value;
    const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';
    
    let panelYOffset = 0;
    if(showTopBumper) {
      panelYOffset += bumperHeight;
      if(use4Way && isCB5) panelYOffset += fourWayHeight + fourWayGap;
    }
    
    const column = Math.floor(x / size);
    
    // Check if in top bumper area
    if(showTopBumper) {
      const topBumperEnd = panelYOffset;
      if(y < topBumperEnd && column >= 0 && column < pw) {
        showEmptyAreaContextMenu('top', column, e.clientX, e.clientY);
        return;
      }
    }
    
    // Check if in bottom bumper area
    if(showBottomBumper) {
      const bottomBumperStart = panelYOffset + (ph * size);
      const bottomBumperEnd = bottomBumperStart + bumperHeight + (use4Way && isCB5 ? fourWayHeight + fourWayGap : 0);
      if(y >= bottomBumperStart && y < bottomBumperEnd && column >= 0 && column < pw) {
        showEmptyAreaContextMenu('bottom', column, e.clientX, e.clientY);
        return;
      }
    }
  });
  
  // Mouse leave - clear hover and end drag
  canvas.addEventListener('mouseleave', function(e) {
    if(hoveredBumper) {
      hoveredBumper = null;
      generateStructureLayout();
    }
    if(structureDraggingBumper) {
      structureDraggingBumper = null;
    }
    structureIsDragging = false;
    canvas.style.cursor = manualBumperMode ? 'pointer' : 'default';
  });
}

// Show context menu for panels in structure view
// Draw green highlight on bumper being dragged - optimized version
function drawBumperDragHighlight(canvas, clientX, clientY) {
  if(!structureDraggingBumper || !structureOriginalImageData) return;

  const ctx = canvas.getContext('2d');
  const allPanels = getAllPanels();
  const p = allPanels[document.getElementById('panelType').value];
  if(!p || !p.width_m || !p.height_m) return;
  
  const {pw, ph} = getEffectivePanelCountsForLayout();
  const needsOneW = pw % 2 === 1;
  
  // Restore original canvas state
  ctx.putImageData(structureOriginalImageData, 0, 0);

  const size = panelSize; // Use global panelSize for consistent sizing
  const bumperHeight = Math.max(30, size * 0.8);
  const panelYOffset = showTopBumper ? bumperHeight : 0;
  const type = structureDraggingBumper.type;
  const draggedColumn = structureDraggingBumper.column;
  
  // Calculate the Y position of the bumper being dragged
  let yOffset;
  if(type === 'top') {
    if(structureDraggingBumper.is2W) {
      const row1 = getFirstNonDeletedRow(draggedColumn, ph);
      const row2 = draggedColumn + 1 < pw ? getFirstNonDeletedRow(draggedColumn + 1, ph) : row1;
      const maxRow = Math.max(row1, row2);
      yOffset = (panelYOffset - bumperHeight) + (maxRow * size);
    } else {
      const row = getFirstNonDeletedRow(draggedColumn, ph);
      yOffset = (panelYOffset - bumperHeight) + (row * size);
    }
  } else {
    const bottomYBase = panelYOffset + (ph * size);
    yOffset = bottomYBase;
  }
  
  // Draw green outline around the bumper being dragged
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 4;
  const x = draggedColumn * size;
  const width = structureDraggingBumper.is2W ? (2 * size) : size;
  ctx.strokeRect(x, yOffset, width, bumperHeight);
  
  // Get hover column
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const canvasX = (clientX - rect.left) * scaleX;
  const hoverColumn = Math.floor(canvasX / size);
  
  // Show preview outline where it will go
  if(hoverColumn >= 0 && hoverColumn < pw && hoverColumn !== draggedColumn) {
    const currentOneWPos = type === 'top' ? topBumper1wColumn : bottomBumper1wColumn;
    let canDropHere = false;
    let previewWidth = size;
    
    if(structureDraggingBumper.is2W) {
      // For 2W bumpers, only show preview if hovering directly over the 1W position (for swap)
      if(needsOneW && hoverColumn === currentOneWPos) {
        canDropHere = true;
        previewWidth = size; // Will show where the 1W will move to
      }
    } else if(structureDraggingBumper.isOneW) {
      // 1W bumpers can be moved anywhere
      canDropHere = true;
      previewWidth = size;
    }
    
    if(canDropHere) {
      let previewY;
      let previewX;
      
      if(structureDraggingBumper.is2W && hoverColumn === currentOneWPos) {
        // Show where the 1W will move to (the dragged 2W's first column)
        previewX = draggedColumn * size;
        if(type === 'top') {
          const row = getFirstNonDeletedRow(draggedColumn, ph);
          previewY = (panelYOffset - bumperHeight) + (row * size);
        } else {
          const bottomYBase = panelYOffset + (ph * size);
          previewY = bottomYBase;
        }
      } else {
        // Normal 1W move preview
        previewX = hoverColumn * size;
        if(type === 'top') {
          const row = getFirstNonDeletedRow(hoverColumn, ph);
          previewY = (panelYOffset - bumperHeight) + (row * size);
        } else {
          const bottomYBase = panelYOffset + (ph * size);
          previewY = bottomYBase;
        }
      }
      
      // Draw dashed green preview outline
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(previewX, previewY, previewWidth, bumperHeight);
      ctx.setLineDash([]);
      
      // Add helper text for 2W -> 1W swap
      if(structureDraggingBumper.is2W && needsOneW && hoverColumn === currentOneWPos) {
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SWAP', hoverColumn * size + size/2, previewY - 8);
      }
    }
  }
}

function getBumperAtPosition(canvas, clientX, clientY) {
  const allPanels = getAllPanels();
  const p = allPanels[document.getElementById('panelType').value];
  if(!p || !p.width_m || !p.height_m) return null;
  
  const {pw, ph} = getEffectivePanelCountsForLayout();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const canvasX = (clientX - rect.left) * scaleX;
  const canvasY = (clientY - rect.top) * scaleY;

  const size = panelSize; // Use global panelSize for consistent sizing
  const bumperHeight = Math.max(30, size * 0.8);
  const panelYOffset = showTopBumper ? bumperHeight : 0;
  const column = Math.floor(canvasX / size);
  
  if(column < 0 || column >= pw) return null;
  
  // Check top bumper
  if(showTopBumper) {
    const oneWPos = topBumper1wColumn >= 0 && topBumper1wColumn < pw ? topBumper1wColumn : (pw - 1);
    const needsOneW = pw % 2 === 1;
    
    // Check if clicking on the 1W bumper specifically
    if(needsOneW && column === oneWPos) {
      const row = getFirstNonDeletedRow(column, ph);
      const expectedY = (panelYOffset - bumperHeight) + (row * size);
      
      if(canvasY >= expectedY && canvasY <= expectedY + bumperHeight) {
        return {type: 'top', column: column, isOneW: true};
      }
    }
    
    // Check for 2W bumpers
    for(let c = 0; c < pw; c++) {
      if(needsOneW && c === oneWPos) continue;
      
      if(c + 1 < pw && (c + 1) !== oneWPos) {
        // This is a 2W bumper covering columns c and c+1
        if(column === c || column === c + 1) {
          const row1 = getFirstNonDeletedRow(c, ph);
          const row2 = getFirstNonDeletedRow(c + 1, ph);
          const maxRow = Math.max(row1, row2);
          const expectedY = (panelYOffset - bumperHeight) + (maxRow * size);
          
          if(canvasY >= expectedY && canvasY <= expectedY + bumperHeight) {
            return {type: 'top', column: c, isOneW: false, is2W: true};
          }
        }
        c++;
      } else if(!needsOneW && c + 1 >= pw) {
        if(column === c) {
          const row = getFirstNonDeletedRow(c, ph);
          const expectedY = (panelYOffset - bumperHeight) + (row * size);
          
          if(canvasY >= expectedY && canvasY <= expectedY + bumperHeight) {
            return {type: 'top', column: column, isOneW: false};
          }
        }
      }
    }
  }
  
  // Check bottom bumper
  if(showBottomBumper) {
    const oneWPos = bottomBumper1wColumn >= 0 && bottomBumper1wColumn < pw ? bottomBumper1wColumn : (pw - 1);
    const needsOneW = pw % 2 === 1;
    const bottomYBase = panelYOffset + (ph * size);
    const expectedY = bottomYBase; // Bottom bumpers always at yBase
    
    // Check if click is within bumper Y range
    if(canvasY >= expectedY && canvasY <= expectedY + bumperHeight) {
      // Check if clicking on the 1W bumper specifically
      if(needsOneW && column === oneWPos) {
        // Only return if this column should have a bottom bumper
        if(shouldHaveBottomBumper(oneWPos, ph)) {
          return {type: 'bottom', column: column, isOneW: true};
        }
      }
      
      // Check for 2W bumpers
      for(let c = 0; c < pw; c++) {
        if(needsOneW && c === oneWPos) continue;
        
        if(c + 1 < pw && (c + 1) !== oneWPos) {
          // This is a 2W bumper covering columns c and c+1
          if(column === c || column === c + 1) {
            // Only return if both columns should have bottom bumpers
            if(shouldHaveBottomBumper(c, ph) && shouldHaveBottomBumper(c + 1, ph)) {
              return {type: 'bottom', column: c, isOneW: false, is2W: true};
            }
          }
          c++;
        } else if(!needsOneW && c + 1 >= pw) {
          if(column === c) {
            // Only return if this column should have a bottom bumper
            if(shouldHaveBottomBumper(c, ph)) {
              return {type: 'bottom', column: column, isOneW: false};
            }
          }
        }
      }
    }
  }
  
  return null;
}

function updateBumpersBasedOnStructureType() {
  const structureType = document.getElementById('structureType').value;

  // Floor structure type - automatically disable bumpers
  if(structureType === 'floor') {
    if(useBumpers) {
      useBumpers = false;
      document.getElementById('useBumpersBtn').classList.remove('active');
      const bumperControls = document.getElementById('bumperControls');
      if(bumperControls) bumperControls.style.display = 'none';
    }
    showTopBumper = false;
    showBottomBumper = false;
  } else if(useBumpers) {
    // Only set bumper flags if bumpers are enabled
    if(structureType === 'hanging') {
      showTopBumper = true;
      showBottomBumper = false;
    } else { // ground stacking
      showTopBumper = false;
      showBottomBumper = true;
    }
  } else {
    // Bumpers disabled - ensure flags are false
    showTopBumper = false;
    showBottomBumper = false;
  }

  // Reinitialize bumpers when structure type changes
  initializeBumpers();

  updateStructureVisualization();
  updateWeightDisplay();
}

function toggleTopBumper() {
  // Deprecated - kept for backward compatibility
  showTopBumper = !showTopBumper;
  generateStructureLayout();
}

function toggleBottomBumper() {
  // Deprecated - kept for backward compatibility
  showBottomBumper = !showBottomBumper;
  generateStructureLayout();
}


