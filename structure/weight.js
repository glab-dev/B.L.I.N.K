// ==================== WEIGHT & STRUCTURE DISPLAY ====================
// Weight calculations, pickup weight summaries, ground support, floor frames,
// connecting plates display, and total structure weight.


function updateWeightDisplay() {
  const weightDiv = document.getElementById('weightDisplay');
  const weightContent = document.getElementById('weightContent');
  const bumperDistSelect = document.getElementById('bumperDistribution');
  
  // Return early if elements don't exist yet
  if(!weightDiv || !weightContent || !bumperDistSelect) {
    return;
  }
  
  const bumperDist = bumperDistSelect.value;
  
  if(bumperDist !== 'auto' || (!showTopBumper && !showBottomBumper)) {
    weightDiv.style.display = 'none';
    return;
  }
  
  weightDiv.style.display = 'block';
  
  const W = parseInt(document.getElementById('panelsWide').value) || 0;
  const H = parseInt(document.getElementById('panelsHigh').value) || 0;
  const panelType = document.getElementById('panelType').value;
  const allPanels = getAllPanels();
  const p = allPanels[panelType];

  if(W === 0 || H === 0 || !p) {
    weightContent.innerHTML = '<div style="color: #888;">Enter dimensions to calculate weights</div>';
    return;
  }
  
  // Check if panel has bumper weight data
  if(p.bumper_1w_lbs === null || p.bumper_1w_lbs === undefined || 
     p.bumper_2w_lbs === null || p.bumper_2w_lbs === undefined) {
    weightContent.innerHTML = '<div style="color: #888;">No bumper weight data available for this panel type</div>';
    return;
  }
  
  // Convert panel-specific bumper weights from lbs to kg
  const bumper1wKg = p.bumper_1w_lbs * 0.453592;
  const bumper2wKg = p.bumper_2w_lbs * 0.453592;
  const bumper4wKg = p.bumper_4w_lbs ? (p.bumper_4w_lbs * 0.453592) : 0;
  
  // Get correct panel weight based on connection method
  const useConnectingPlates = shouldUseConnectingPlates(panelType);
  const panelWeightKg = getPanelWeight(panelType, useConnectingPlates);

  // Check if CB5 half panel row is enabled
  const hasCB5HalfRow = cb5HalfRowEnabled && panelType === 'CB5_MKII';
  const halfPanelWeightKg = hasCB5HalfRow ? getPanelWeight('CB5_MKII_HALF', useConnectingPlates) : 0;

  let html = '';

  const needsOneW = W % 2 === 1;
  const num2WBumpers = Math.floor(W / 2);

  // Check if 4-way bumpers are enabled
  const use4Way = use4WayBumpersEnabled;
  const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';
  const allPnlsWt = getAllPanels();
  const pnlWt = allPnlsWt[panelType];
  const supports4wWt = isCB5 || (pnlWt && pnlWt.custom && pnlWt.supports_4w_bumpers);
  const show4WayOnly = use4Way && supports4wWt;
  
  // Only show 2-way bumpers if NOT using 4-way bumpers
  if(!show4WayOnly) {
    if(showTopBumper) {
      html += '<div style="font-weight: bold; color: #4CAF50; margin-bottom: 4px;">Top Bumper</div>';
      
      // Show 2W bumpers
      for(let i = 0; i < num2WBumpers; i++) {
        const col1 = i * 2;
        const col2 = i * 2 + 1;
        let panelCount = 0;
        let panelWeight = 0;
        // Count full panels
        for(let row = 0; row < H; row++) {
          if(!deletedPanels.has(`${col1},${row}`)) panelCount++;
          if(!deletedPanels.has(`${col2},${row}`)) panelCount++;
        }
        panelWeight = panelCount * panelWeightKg;
        // Add half panel row weight if enabled
        if(hasCB5HalfRow) {
          panelWeight += 2 * halfPanelWeightKg; // 2 half panels per 2W bumper
        }
        const totalWeight = panelWeight + bumper2wKg;
        html += `<div class="weight-item">Cols ${col1 + 1}-${col2 + 1} (2W): ${Math.ceil(totalWeight)} kg (${Math.ceil(totalWeight * 2.20462)} lbs)</div>`;
      }

      // Show 1W bumper if needed
      if(needsOneW) {
        const lastCol = W - 1;
        let panelCount = 0;
        let panelWeight = 0;
        for(let row = 0; row < H; row++) {
          if(!deletedPanels.has(`${lastCol},${row}`)) panelCount++;
        }
        panelWeight = panelCount * panelWeightKg;
        // Add half panel row weight if enabled
        if(hasCB5HalfRow) {
          panelWeight += halfPanelWeightKg; // 1 half panel for 1W bumper
        }
        const totalWeight = panelWeight + bumper1wKg;
        html += `<div class="weight-item">Col ${lastCol + 1} (1W): ${Math.ceil(totalWeight)} kg (${Math.ceil(totalWeight * 2.20462)} lbs)</div>`;
      }
    }

    if(showBottomBumper) {
      if(showTopBumper) html += '<div style="margin-top: 8px;"></div>';
      html += '<div style="font-weight: bold; color: #FF9800; margin-bottom: 4px;">Bottom Bumper</div>';

      // Show 2W bumpers
      for(let i = 0; i < num2WBumpers; i++) {
        const col1 = i * 2;
        const col2 = i * 2 + 1;
        let panelCount = 0;
        let panelWeight = 0;
        // Count full panels
        for(let row = 0; row < H; row++) {
          if(!deletedPanels.has(`${col1},${row}`)) panelCount++;
          if(!deletedPanels.has(`${col2},${row}`)) panelCount++;
        }
        panelWeight = panelCount * panelWeightKg;
        // Add half panel row weight if enabled
        if(hasCB5HalfRow) {
          panelWeight += 2 * halfPanelWeightKg; // 2 half panels per 2W bumper
        }
        const totalWeight = panelWeight + bumper2wKg;
        html += `<div class="weight-item">Cols ${col1 + 1}-${col2 + 1} (2W): ${Math.ceil(totalWeight)} kg (${Math.ceil(totalWeight * 2.20462)} lbs)</div>`;
      }

      // Show 1W bumper if needed
      if(needsOneW) {
        const lastCol = W - 1;
        let panelCount = 0;
        let panelWeight = 0;
        for(let row = 0; row < H; row++) {
          if(!deletedPanels.has(`${lastCol},${row}`)) panelCount++;
        }
        panelWeight = panelCount * panelWeightKg;
        // Add half panel row weight if enabled
        if(hasCB5HalfRow) {
          panelWeight += halfPanelWeightKg; // 1 half panel for 1W bumper
        }
        const totalWeight = panelWeight + bumper1wKg;
        html += `<div class="weight-item">Col ${lastCol + 1} (1W): ${Math.ceil(totalWeight)} kg (${Math.ceil(totalWeight * 2.20462)} lbs)</div>`;
      }
    }
  }
  
  // Add 4-way bumper calculations for CB5 (replaces 2-way display when enabled)
  if(show4WayOnly && (showTopBumper || showBottomBumper) && bumper4wKg > 0) {
    
    if(showTopBumper) {
      html += '<div style="font-weight: bold; color: #4CAF50; margin-bottom: 4px;">Top Bumper (4-Way)</div>';
      
      const fourWayCount = Math.floor(W / 4);  // Each 4W covers 4 columns
      for(let i = 0; i < fourWayCount; i++) {
        // Each 4W bumper covers 4 columns: i*4, i*4+1, i*4+2, i*4+3
        const col1 = i * 4;
        const col2 = i * 4 + 1;
        const col3 = i * 4 + 2;
        const col4 = i * 4 + 3;
        
        // Count panels in all 4 columns
        let totalPanelCount = 0;
        for(let row = 0; row < H; row++) {
          if(!deletedPanels.has(`${col1},${row}`)) totalPanelCount++;
          if(!deletedPanels.has(`${col2},${row}`)) totalPanelCount++;
          if(!deletedPanels.has(`${col3},${row}`)) totalPanelCount++;
          if(!deletedPanels.has(`${col4},${row}`)) totalPanelCount++;
        }
        
        // 4W bumper pickup includes: 4 columns of panels + 2x 2W bumpers + 1x 4W bumper
        let panelWeight = totalPanelCount * panelWeightKg;
        // Add half panel row weight if enabled (4 half panels per 4W bumper)
        if(hasCB5HalfRow) {
          panelWeight += 4 * halfPanelWeightKg;
        }
        const bumper2wWeight = 2 * bumper2wKg;  // Two 2W bumpers (27.5 lbs each for CB5)
        const bumper4wWeight = bumper4wKg;      // One 4W bumper (66.15 lbs for CB5)
        const totalWeight = panelWeight + bumper2wWeight + bumper4wWeight;

        html += `<div class="weight-item">Cols ${col1 + 1}-${col4 + 1} (4W): ${Math.ceil(totalWeight)} kg (${Math.ceil(totalWeight * 2.20462)} lbs)</div>`;
      }
    }

    if(showBottomBumper) {
      if(showTopBumper) html += '<div style="margin-top: 8px;"></div>';
      html += '<div style="font-weight: bold; color: #FF9800; margin-bottom: 4px;">Bottom Bumper (4-Way)</div>';
      
      const fourWayCount = Math.floor(W / 4);  // Each 4W covers 4 columns
      for(let i = 0; i < fourWayCount; i++) {
        // Each 4W bumper covers 4 columns: i*4, i*4+1, i*4+2, i*4+3
        const col1 = i * 4;
        const col2 = i * 4 + 1;
        const col3 = i * 4 + 2;
        const col4 = i * 4 + 3;
        
        // Count panels in all 4 columns
        let totalPanelCount = 0;
        for(let row = 0; row < H; row++) {
          if(!deletedPanels.has(`${col1},${row}`)) totalPanelCount++;
          if(!deletedPanels.has(`${col2},${row}`)) totalPanelCount++;
          if(!deletedPanels.has(`${col3},${row}`)) totalPanelCount++;
          if(!deletedPanels.has(`${col4},${row}`)) totalPanelCount++;
        }
        
        // 4W bumper pickup includes: 4 columns of panels + 2x 2W bumpers + 1x 4W bumper
        let panelWeight = totalPanelCount * panelWeightKg;
        // Add half panel row weight if enabled (4 half panels per 4W bumper)
        if(hasCB5HalfRow) {
          panelWeight += 4 * halfPanelWeightKg;
        }
        const bumper2wWeight = 2 * bumper2wKg;  // Two 2W bumpers (27.5 lbs each for CB5)
        const bumper4wWeight = bumper4wKg;      // One 4W bumper (66.15 lbs for CB5)
        const totalWeight = panelWeight + bumper2wWeight + bumper4wWeight;

        html += `<div class="weight-item">Cols ${col1 + 1}-${col4 + 1} (4W): ${Math.ceil(totalWeight)} kg (${Math.ceil(totalWeight * 2.20462)} lbs)</div>`;
      }
    }
  }

  weightContent.innerHTML = html;
}

function calculateTotalBumperWeight(W, H) {
  // Calculate total bumper weight based on current configuration
  let totalBumperWeight = 0;
  
  // Check if bumpers are enabled
  if(!useBumpers) {
    return 0;
  }
  
  // Use the global variable for 4-way bumpers state
  const use4Way = use4WayBumpersEnabled;
  
  const panelTypeSelect = document.getElementById('panelType');
  const panelType = panelTypeSelect ? panelTypeSelect.value : '';
  const allPanels = getAllPanels();
  const p = allPanels[panelType];

  // Return 0 if panel doesn't have bumper weight data
  if(!p || p.bumper_1w_lbs === null || p.bumper_1w_lbs === undefined || 
     p.bumper_2w_lbs === null || p.bumper_2w_lbs === undefined) {
    return 0;
  }
  
  // Convert lbs to kg for panel-specific bumper weights
  const bumper1wKg = p.bumper_1w_lbs * 0.453592;
  const bumper2wKg = p.bumper_2w_lbs * 0.453592;
  const bumper4wKg = p.bumper_4w_lbs ? (p.bumper_4w_lbs * 0.453592) : 0;
  
  const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';
  const supports4wCalc = isCB5 || (p.custom && p.supports_4w_bumpers);

  const bumperDistSelect = document.getElementById('bumperDistribution');
  const bumperDist = bumperDistSelect ? bumperDistSelect.value : 'auto';

  // Only calculate bumper weights if in auto mode
  if(bumperDist !== 'auto') {
    return 0;
  }

  // When 4-way bumpers are enabled, use different calculation
  if(use4Way && supports4wCalc && (showTopBumper || showBottomBumper) && bumper4wKg > 0) {
    const fourWayCount = Math.floor(W / 4);  // Each 4W covers 4 columns
    const remainingCols = W % 4;              // Leftover columns after 4W bumpers
    
    // Add 4W bumpers for top (includes 2x 2W bumpers + 1x 4W bumper per pickup)
    if(showTopBumper) {
      totalBumperWeight += fourWayCount * bumper4wKg;           // 4W bumper weight
      totalBumperWeight += fourWayCount * 2 * bumper2wKg;        // 2x 2W bumpers per 4W
      
      // Add bumpers for remaining columns (not covered by 4W)
      if(remainingCols >= 2) {
        // Add 2W bumper(s) for pairs
        const extra2W = Math.floor(remainingCols / 2);
        totalBumperWeight += extra2W * bumper2wKg;
      }
      if(remainingCols % 2 === 1) {
        // Add 1W bumper for the last odd column
        totalBumperWeight += bumper1wKg;
      }
    }
    
    // Add 4W bumpers for bottom (includes 2x 2W bumpers + 1x 4W bumper per pickup)
    if(showBottomBumper) {
      totalBumperWeight += fourWayCount * bumper4wKg;           // 4W bumper weight
      totalBumperWeight += fourWayCount * 2 * bumper2wKg;        // 2x 2W bumpers per 4W
      
      // Add bumpers for remaining columns (not covered by 4W)
      if(remainingCols >= 2) {
        // Add 2W bumper(s) for pairs
        const extra2W = Math.floor(remainingCols / 2);
        totalBumperWeight += extra2W * bumper2wKg;
      }
      if(remainingCols % 2 === 1) {
        // Add 1W bumper for the last odd column
        totalBumperWeight += bumper1wKg;
      }
    }
  } else {
    // Standard 2W bumper calculation (when NOT using 4-way bumpers)
    const needsOneW = W % 2 === 1;
    const num2WBumpers = Math.floor(W / 2);
    
    // Calculate top bumper weight
    if(showTopBumper) {
      // Add 2W bumpers (each covers 2 columns)
      totalBumperWeight += num2WBumpers * bumper2wKg;
      // Add 1W bumper for the remaining column if odd width
      if(needsOneW) {
        totalBumperWeight += bumper1wKg;
      }
    }
    
    // Calculate bottom bumper weight
    if(showBottomBumper) {
      // Add 2W bumpers (each covers 2 columns)
      totalBumperWeight += num2WBumpers * bumper2wKg;
      // Add 1W bumper for the remaining column if odd width
      if(needsOneW) {
        totalBumperWeight += bumper1wKg;
      }
    }
  }
  
  return totalBumperWeight;
}

function updatePickupWeightSummary() {
  const infoPanel = document.getElementById('structureInfoPanel');
  const weightsBox = document.getElementById('structureWeightsBox');
  const weightsContent = document.getElementById('structureWeightsContent');
  const structureType = document.getElementById('structureType').value;

  if(!infoPanel || !weightsContent) return;

  // For floor mode, skip bumper display but still show floor frames
  if(structureType === 'floor') {
    weightsBox.style.display = 'none';
    infoPanel.style.display = 'grid';
    // Update floor frames display (will also update plates and ground support)
    updateStructurePlatesDisplay();
    return;
  }

  if(bumpers.length === 0) {
    infoPanel.style.display = 'none';
    return;
  }

  // Show the info panel and weights box
  weightsBox.style.display = 'block';
  infoPanel.style.display = 'grid';
  
  // Group bumpers by position
  const topBumpers = bumpers.filter(b => b.position === 'top');
  const bottomBumpers = bumpers.filter(b => b.position === 'bottom');
  
  // Helper function to check if a 2W bumper is under a 4W bumper
  function is2wUnder4w(bumper2w, position) {
    const fourWayBumpers = bumpers.filter(b => b.type === '4w' && b.position === position);
    for(const b4w of fourWayBumpers) {
      // 4W startCol/endCol are the centers of the 2W bumpers it connects
      // First 2W covers columns (startCol-1) to startCol
      // Second 2W covers columns (endCol-1) to endCol
      const col4wStart = b4w.startCol - 1;
      const col4wEnd = b4w.endCol;
      
      // Check if this 2W's columns are within the 4W's range
      if(bumper2w.startCol >= col4wStart && bumper2w.endCol <= col4wEnd) {
        return true;
      }
    }
    return false;
  }
  
  const wtUnit = getWeightUnitLabel();
  let html = '';
  let totalWeightKg = 0;
  
  // Show ALL top bumpers (but skip 2W bumpers that are under 4W bumpers)
  if(topBumpers.length > 0) {
    // Sort by type: 4W first, then 2W, then 1W
    const sortedTop = [...topBumpers].sort((a, b) => {
      const order = { '4w': 0, '2w': 1, '1w': 2 };
      return order[a.type] - order[b.type];
    });
    
    // Count by type for numbering
    const counts = { '4w': 0, '2w': 0, '1w': 0 };
    
    sortedTop.forEach((bumper) => {
      // Skip 2W bumpers that are under a 4W bumper (they're not pickup points)
      if(bumper.type === '2w' && is2wUnder4w(bumper, 'top')) {
        return; // Skip this bumper
      }
      
      counts[bumper.type]++;
      const weight = calculateBumperPickupWeight(bumper);
      totalWeightKg += weight.kg;
      const label = bumper.type === '4w' ? '4W' : bumper.type === '2w' ? '2W' : '1W';
      const color = bumper.type === '4w' ? '#FF6B35' : bumper.type === '2w' ? '#4CAF50' : '#2196F3';
      const weightDisplay = displayWeightUnit === 'lbs' ? Math.ceil(weight.lbs) : Math.ceil(weight.kg);
      html += `<div class="weight-row">
        <span class="weight-label" style="color: ${color};">${label} #${counts[bumper.type]}</span>
        <span class="weight-value">${weightDisplay} ${wtUnit}</span>
      </div>`;
    });
  }

  // Show ALL bottom bumpers (ground stacking) - skip 2W bumpers under 4W
  if(bottomBumpers.length > 0) {
    if(topBumpers.length > 0 && html.length > 0) {
      html += '<div style="border-top: 1px solid #444; margin: 6px 0;"></div>';
    }
    
    // Sort by type: 4W first, then 2W, then 1W
    const sortedBottom = [...bottomBumpers].sort((a, b) => {
      const order = { '4w': 0, '2w': 1, '1w': 2 };
      return order[a.type] - order[b.type];
    });
    
    // Count by type for numbering
    const counts = { '4w': 0, '2w': 0, '1w': 0 };
    
    sortedBottom.forEach((bumper) => {
      // Skip 2W bumpers that are under a 4W bumper (they're not pickup points)
      if(bumper.type === '2w' && is2wUnder4w(bumper, 'bottom')) {
        return; // Skip this bumper
      }
      
      counts[bumper.type]++;
      const weight = calculateBumperPickupWeight(bumper);
      totalWeightKg += weight.kg;
      const label = bumper.type === '4w' ? '4W' : bumper.type === '2w' ? '2W' : '1W';
      const color = bumper.type === '4w' ? '#FF6B35' : bumper.type === '2w' ? '#FF9800' : '#2196F3';
      const weightDisplay = displayWeightUnit === 'lbs' ? Math.ceil(weight.lbs) : Math.ceil(weight.kg);
      html += `<div class="weight-row">
        <span class="weight-label" style="color: ${color};">${label} #${counts[bumper.type]}</span>
        <span class="weight-value">${weightDisplay} ${wtUnit}</span>
      </div>`;
    });
  }

  // Add total
  const totalDisplay = displayWeightUnit === 'lbs' ? Math.ceil(totalWeightKg * KG_TO_LBS) : Math.ceil(totalWeightKg);
  html += `<div class="weight-row" style="border-top: 1px solid #4a9eff; margin-top: 6px; padding-top: 6px;">
    <span class="weight-label" style="color: #fff;">Total</span>
    <span class="weight-value" style="color: #4a9eff;">${totalDisplay} ${wtUnit}</span>
  </div>`;
  
  weightsContent.innerHTML = html;
  
  // Also update the plates display in the same panel
  updateStructurePlatesDisplay();
}

// Update the connecting plates display in the structure info panel
function updateStructurePlatesDisplay() {
  const platesBox = document.getElementById('structurePlatesBox');
  const platesContent = document.getElementById('structurePlatesContent');
  
  if(!platesBox || !platesContent) return;
  
  const panelType = document.getElementById('panelType').value;
  const useConnectingPlates = shouldUseConnectingPlates(panelType);
  const {pw, ph} = getEffectivePanelCountsForLayout();
  
  // Initialize plates data for storage
  let platesData = { total2way: 0, total4way: 0, totalPlateWeight: 0 };
  
  if(!useConnectingPlates || pw === 0 || ph === 0) {
    platesBox.style.display = 'none';
  } else {
    const plates = calculateConnectingPlates(pw, ph, PLATE_WEIGHTS.plate2wayKg, PLATE_WEIGHTS.plate4wayKg);
    platesData = plates; // Store the calculated values
    
    const wtUnit = getWeightUnitLabel();
    const weightDisplay = displayWeightUnit === 'lbs'
      ? Math.ceil(plates.totalPlateWeight * KG_TO_LBS)
      : Math.ceil(plates.totalPlateWeight);
    
    let html = '';
    
    html += `<div class="plates-row">
      <span class="plates-label">2-Way (yellow)</span>
      <span class="plates-value">${plates.total2way}</span>
    </div>`;
    
    html += `<div class="plates-row">
      <span class="plates-label">4-Way (red)</span>
      <span class="plates-value">${plates.total4way}</span>
    </div>`;
    
    html += `<div class="plates-row plates-total">
      <span class="plates-label" style="color: #fff;">Total Weight</span>
      <span class="plates-value" style="color: #6fc276;">${weightDisplay} ${wtUnit}</span>
    </div>`;
    
    platesContent.innerHTML = html;
    platesBox.style.display = 'block';
  }
  
  // Store plates data for gear list
  if(screens[currentScreenId]) {
    if(!screens[currentScreenId].calculatedData) {
      screens[currentScreenId].calculatedData = {};
    }
    screens[currentScreenId].calculatedData.plates2way = platesData.total2way;
    screens[currentScreenId].calculatedData.plates4way = platesData.total4way;
    screens[currentScreenId].calculatedData.platesWeightKg = platesData.totalPlateWeight;
  }
  
  // Also update ground support hardware display
  updateGroundSupportDisplay();
}

// Update the ground support hardware display (ladders and bridge clamps)
function updateGroundSupportDisplay() {
  const groundSupportBox = document.getElementById('structureGroundSupportBox');
  const groundSupportContent = document.getElementById('structureGroundSupportContent');
  
  if(!groundSupportBox || !groundSupportContent) return;
  
  const isGroundStacking = showBottomBumper;
  const {pw, ph} = getEffectivePanelCountsForLayout();
  
  // Initialize ground support data for storage
  let groundSupportData = {
    totalRearTruss: 0,
    totalBaseTruss: 0,
    totalBridgeClamps: 0,
    totalRearBridgeClampAdapters: 0,
    totalPipes: 0,
    totalSwivelCheeseboroughs: 0,
    totalSandbags: 0,
    totalWeightKg: 0,
    totalWeightLbs: 0,
    pipeInfo: []
  };
  
  if(!isGroundStacking || pw === 0 || ph === 0) {
    groundSupportBox.style.display = 'none';
    // Store empty ground support data
    if(screens[currentScreenId]) {
      if(!screens[currentScreenId].calculatedData) {
        screens[currentScreenId].calculatedData = {};
      }
      screens[currentScreenId].calculatedData.groundSupport = groundSupportData;
      screens[currentScreenId].calculatedData.groundSupportWeightKg = 0;
    }
    updateFloorFramesDisplay(); // Continue chain to floor frames then total weight
    return;
  }
  
  // Calculate ground support hardware
  const hardware = calculateGroundSupportHardware(pw, ph);
  groundSupportData = hardware; // Store calculated values
  
  // Store ground support data for gear list
  if(screens[currentScreenId]) {
    if(!screens[currentScreenId].calculatedData) {
      screens[currentScreenId].calculatedData = {};
    }
    screens[currentScreenId].calculatedData.groundSupport = groundSupportData;
    screens[currentScreenId].calculatedData.groundSupportWeightKg = hardware.totalWeightKg || 0;
  }

  // Hide ground support box if nothing to show
  const hasAnyHardware = hardware.totalRearTruss > 0 || hardware.totalBridgeClamps > 0 ||
                         hardware.totalBaseTruss > 0 || hardware.totalSandbags > 0 ||
                         hardware.totalPipes > 0 || hardware.totalSwivelCheeseboroughs > 0 ||
                         hardware.totalRearBridgeClampAdapters > 0;
  if(!hasAnyHardware) {
    groundSupportBox.style.display = 'none';
    updateFloorFramesDisplay(); // Continue chain to floor frames then total weight
    return;
  }
  
  const wtUnit = getWeightUnitLabel();
  let html = '';

  if(hardware.totalRearTruss > 0) {
    html += `<div class="plates-row">
      <span class="plates-label" style="color: #ffffff;">Rear Truss</span>
      <span class="plates-value">${hardware.totalRearTruss}</span>
    </div>`;
  }

  if(hardware.totalBaseTruss > 0) {
    html += `<div class="plates-row">
      <span class="plates-label" style="color: #ffffff;">Base Truss</span>
      <span class="plates-value">${hardware.totalBaseTruss}</span>
    </div>`;
  }

  if(hardware.totalBridgeClamps > 0) {
    html += `<div class="plates-row">
      <span class="plates-label" style="color: #ffffff;">Bridge Clamps</span>
      <span class="plates-value">${hardware.totalBridgeClamps}</span>
    </div>`;
  }
  
  if(hardware.totalRearBridgeClampAdapters > 0) {
    html += `<div class="plates-row">
      <span class="plates-label" style="color: #ffffff;">Rear Bridge Clamp Adapter</span>
      <span class="plates-value">${hardware.totalRearBridgeClampAdapters}</span>
    </div>`;
  }
  
  if(hardware.totalPipes > 0) {
    // Show pipe count with unique length(s)
    const uniqueLengths = [...new Set(hardware.pipeInfo.map(p => p.pipeLengthFt))];
    const pipeLengthStr = uniqueLengths.map(l => l + 'ft').join(', ');
    html += `<div class="plates-row">
      <span class="plates-label" style="color: #ffffff;">Pipe (${pipeLengthStr})</span>
      <span class="plates-value">${hardware.totalPipes}</span>
    </div>`;
  }
  
  if(hardware.totalSwivelCheeseboroughs > 0) {
    html += `<div class="plates-row">
      <span class="plates-label" style="color: #ffffff;">Swivel Cheeseborough</span>
      <span class="plates-value">${hardware.totalSwivelCheeseboroughs}</span>
    </div>`;
  }
  
  html += `<div class="plates-row">
    <span class="plates-label" style="color: #ffffff;">Sandbags (25lb)</span>
    <span class="plates-value">${hardware.totalSandbags}</span>
  </div>`;
  
  // Add total weight
  const totalWeightDisplay = displayWeightUnit === 'lbs'
    ? Math.ceil(hardware.totalWeightLbs)
    : Math.ceil(hardware.totalWeightKg);
  
  html += `<div class="plates-row plates-total" style="border-top: 1px solid #00CED1; margin-top: 6px; padding-top: 6px;">
    <span class="plates-label" style="color: #fff;">Total Weight</span>
    <span class="plates-value" style="color: #00CED1;">${totalWeightDisplay} ${wtUnit}</span>
  </div>`;
  
  groundSupportContent.innerHTML = html;
  groundSupportBox.style.display = 'block';

  // Update floor frames display
  updateFloorFramesDisplay();
}

// Update the floor frames display
function updateFloorFramesDisplay() {
  const floorFramesBox = document.getElementById('structureFloorFramesBox');
  const floorFramesContent = document.getElementById('structureFloorFramesContent');
  const structureType = document.getElementById('structureType').value;

  if(!floorFramesBox || !floorFramesContent) {
    updateTotalStructureWeight();
    return;
  }

  const panelType = document.getElementById('panelType').value;
  const allPanels = getAllPanels();
  const p = allPanels[panelType];
  const {pw, ph} = getEffectivePanelCountsForLayout();

  // Initialize floor frames data for storage
  let floorFramesData = {
    frame_1x1: 0,
    frame_2x1: 0,
    frame_2x2: 0,
    frame_3x2: 0,
    totalWeightLbs: 0,
    totalWeightKg: 0
  };

  // Only show for floor mode with floor panels
  if(structureType !== 'floor' || !p || !p.is_floor_panel || !p.floor_frames || pw === 0 || ph === 0) {
    floorFramesBox.style.display = 'none';
    // Store empty floor frames data
    if(screens[currentScreenId]) {
      if(!screens[currentScreenId].calculatedData) {
        screens[currentScreenId].calculatedData = {};
      }
      screens[currentScreenId].calculatedData.floorFrames = floorFramesData;
    }
    updateTotalStructureWeight();
    return;
  }

  // Calculate floor frames
  const frames = calculateFloorFrames(pw, ph, deletedPanels);
  const frameCounts = getFloorFrameCounts(frames);

  // Calculate total weight
  let totalWeightLbs = 0;
  if(frameCounts.frame_1x1 > 0 && p.floor_frames.frame_1x1) {
    totalWeightLbs += frameCounts.frame_1x1 * p.floor_frames.frame_1x1.weight_lbs;
  }
  if(frameCounts.frame_2x1 > 0 && p.floor_frames.frame_2x1) {
    totalWeightLbs += frameCounts.frame_2x1 * p.floor_frames.frame_2x1.weight_lbs;
  }
  if(frameCounts.frame_2x2 > 0 && p.floor_frames.frame_2x2) {
    totalWeightLbs += frameCounts.frame_2x2 * p.floor_frames.frame_2x2.weight_lbs;
  }
  if(frameCounts.frame_3x2 > 0 && p.floor_frames.frame_3x2) {
    totalWeightLbs += frameCounts.frame_3x2 * p.floor_frames.frame_3x2.weight_lbs;
  }

  const totalWeightKg = totalWeightLbs / KG_TO_LBS;

  // Store floor frames data
  floorFramesData = {
    ...frameCounts,
    totalWeightLbs: totalWeightLbs,
    totalWeightKg: totalWeightKg
  };

  if(screens[currentScreenId]) {
    if(!screens[currentScreenId].calculatedData) {
      screens[currentScreenId].calculatedData = {};
    }
    screens[currentScreenId].calculatedData.floorFrames = floorFramesData;
  }

  // Build display HTML
  const wtUnit = getWeightUnitLabel();
  let html = '';

  // Show counts for each frame type with their colors
  if(frameCounts.frame_3x2 > 0) {
    html += `<div class="plates-row">
      <span class="plates-label" style="color: ${floorFrameColors.frame_3x2};">3×2 Frame</span>
      <span class="plates-value">${frameCounts.frame_3x2}</span>
    </div>`;
  }
  if(frameCounts.frame_2x2 > 0) {
    html += `<div class="plates-row">
      <span class="plates-label" style="color: ${floorFrameColors.frame_2x2};">2×2 Frame</span>
      <span class="plates-value">${frameCounts.frame_2x2}</span>
    </div>`;
  }
  if(frameCounts.frame_2x1 > 0) {
    html += `<div class="plates-row">
      <span class="plates-label" style="color: ${floorFrameColors.frame_2x1};">2×1 Frame</span>
      <span class="plates-value">${frameCounts.frame_2x1}</span>
    </div>`;
  }
  if(frameCounts.frame_1x1 > 0) {
    html += `<div class="plates-row">
      <span class="plates-label" style="color: ${floorFrameColors.frame_1x1};">1×1 Frame</span>
      <span class="plates-value">${frameCounts.frame_1x1}</span>
    </div>`;
  }

  // Add total weight
  const totalWeightDisplay = displayWeightUnit === 'lbs'
    ? Math.ceil(totalWeightLbs)
    : Math.ceil(totalWeightKg);

  html += `<div class="plates-row plates-total" style="border-top: 1px solid #4ecdc4; margin-top: 6px; padding-top: 6px;">
    <span class="plates-label" style="color: #fff;">Total Weight</span>
    <span class="plates-value" style="color: #4ecdc4;">${totalWeightDisplay} ${wtUnit}</span>
  </div>`;

  floorFramesContent.innerHTML = html;
  floorFramesBox.style.display = 'block';

  // Update total structure weight
  updateTotalStructureWeight();
}

// Update the total structure weight display (sum of pickup weights + plates + ground support)
function updateTotalStructureWeight() {
  const totalWeightBox = document.getElementById('structureTotalWeightBox');
  const totalWeightContent = document.getElementById('structureTotalWeightContent');
  
  if(!totalWeightBox || !totalWeightContent) return;
  
  // Helper function to check if a 2W bumper is under a 4W bumper
  function is2wUnder4w(bumper2w) {
    const fourWayBumpers = bumpers.filter(b => b.type === '4w' && b.position === bumper2w.position);
    for(const b4w of fourWayBumpers) {
      const col4wStart = b4w.startCol - 1;
      const col4wEnd = b4w.endCol;
      if(bumper2w.startCol >= col4wStart && bumper2w.endCol <= col4wEnd) {
        return true;
      }
    }
    return false;
  }
  
  // Calculate connecting plates weight
  let platesWeightKg = 0;
  const panelType = document.getElementById('panelType').value;
  const useConnectingPlates = shouldUseConnectingPlates(panelType);
  const {pw, ph} = getEffectivePanelCountsForLayout();

  // Calculate bumper hardware weight (the actual weight of bumper hardware, not load being supported)
  const bumperHardwareWeightKg = calculateTotalBumperWeight(pw, ph);
  
  if(useConnectingPlates && pw > 0 && ph > 0) {
    const plates = calculateConnectingPlates(pw, ph, PLATE_WEIGHTS.plate2wayKg, PLATE_WEIGHTS.plate4wayKg);
    platesWeightKg = plates.totalPlateWeight || 0;
  }
  
  // Calculate ground support hardware weight
  let groundSupportWeightKg = 0;
  const isGroundStacking = showBottomBumper;

  if(isGroundStacking && pw > 0 && ph > 0) {
    const hardware = calculateGroundSupportHardware(pw, ph);
    groundSupportWeightKg = hardware.totalWeightKg || 0;
  }

  // Calculate floor frames weight
  let floorFramesWeightKg = 0;
  const structureType = document.getElementById('structureType').value;
  const allPanels = getAllPanels();
  const p = allPanels[panelType];

  if(structureType === 'floor' && p && p.is_floor_panel && p.floor_frames && pw > 0 && ph > 0) {
    const frames = calculateFloorFrames(pw, ph, deletedPanels);
    const frameCounts = getFloorFrameCounts(frames);
    let totalWeightLbs = 0;
    if(frameCounts.frame_1x1 > 0 && p.floor_frames.frame_1x1) {
      totalWeightLbs += frameCounts.frame_1x1 * p.floor_frames.frame_1x1.weight_lbs;
    }
    if(frameCounts.frame_2x1 > 0 && p.floor_frames.frame_2x1) {
      totalWeightLbs += frameCounts.frame_2x1 * p.floor_frames.frame_2x1.weight_lbs;
    }
    if(frameCounts.frame_2x2 > 0 && p.floor_frames.frame_2x2) {
      totalWeightLbs += frameCounts.frame_2x2 * p.floor_frames.frame_2x2.weight_lbs;
    }
    if(frameCounts.frame_3x2 > 0 && p.floor_frames.frame_3x2) {
      totalWeightLbs += frameCounts.frame_3x2 * p.floor_frames.frame_3x2.weight_lbs;
    }
    floorFramesWeightKg = totalWeightLbs / KG_TO_LBS;
  }

  // Calculate total structure hardware weight
  const totalWeightKg = bumperHardwareWeightKg + platesWeightKg + groundSupportWeightKg + floorFramesWeightKg;

  // Only show if there's something to display
  const isFloorMode = structureType === 'floor';
  if(totalWeightKg === 0 && bumpers.length === 0 && !isFloorMode) {
    totalWeightBox.style.display = 'none';
    return;
  }
  
  const wtUnit = getWeightUnitLabel();
  const totalWeightLbs = totalWeightKg * KG_TO_LBS;

  let html = '';

  // Show breakdown - skip bumpers for floor mode
  if(!isFloorMode && bumperHardwareWeightKg > 0) {
    const bumperDisplay = displayWeightUnit === 'lbs'
      ? Math.ceil(bumperHardwareWeightKg * KG_TO_LBS)
      : Math.ceil(bumperHardwareWeightKg);
    html += `<div class="weight-row">
      <span class="weight-label" style="color: #4a9eff;">Bumpers</span>
      <span class="weight-value">${bumperDisplay} ${wtUnit}</span>
    </div>`;
  }

  if(platesWeightKg > 0) {
    const platesDisplay = displayWeightUnit === 'lbs'
      ? Math.ceil(platesWeightKg * KG_TO_LBS)
      : Math.ceil(platesWeightKg);
    html += `<div class="weight-row">
      <span class="weight-label" style="color: #6fc276;">Connecting Plates</span>
      <span class="weight-value">${platesDisplay} ${wtUnit}</span>
    </div>`;
  }

  if(groundSupportWeightKg > 0) {
    const gsDisplay = displayWeightUnit === 'lbs'
      ? Math.ceil(groundSupportWeightKg * KG_TO_LBS)
      : Math.ceil(groundSupportWeightKg);
    html += `<div class="weight-row">
      <span class="weight-label" style="color: #00CED1;">Ground Support</span>
      <span class="weight-value">${gsDisplay} ${wtUnit}</span>
    </div>`;
  }

  if(floorFramesWeightKg > 0) {
    const floorDisplay = displayWeightUnit === 'lbs'
      ? Math.ceil(floorFramesWeightKg * KG_TO_LBS)
      : Math.ceil(floorFramesWeightKg);
    html += `<div class="weight-row">
      <span class="weight-label" style="color: #4ecdc4;">Floor Frames</span>
      <span class="weight-value">${floorDisplay} ${wtUnit}</span>
    </div>`;
  }

  // Total
  const totalDisplay = displayWeightUnit === 'lbs'
    ? Math.ceil(totalWeightLbs)
    : Math.ceil(totalWeightKg);
  html += `<div class="weight-row" style="border-top: 1px solid #FFD700; margin-top: 6px; padding-top: 6px;">
    <span class="weight-label" style="color: #fff; font-weight: bold;">TOTAL</span>
    <span class="weight-value" style="color: #FFD700; font-weight: bold;">${totalDisplay} ${wtUnit}</span>
  </div>`;
  
  totalWeightContent.innerHTML = html;
  totalWeightBox.style.display = 'block';
}

// Calculate ground support hardware counts
function calculateGroundSupportHardware(pw, ph) {
  const ladderHeightPanels = 2;
  const maxPanelsBeforeSecondBase = 8; // If more than 8 panels high, add 2nd base
  
  const weights = GROUND_SUPPORT_WEIGHTS;
  
  let totalRearTruss = 0;
  let totalBridgeClamps = 0;
  let totalBaseTruss = 0;
  let totalSecondBases = 0; // Additional bases for tall walls
  let totalPipes = 0; // Pipes from top truss to 2nd base
  let totalSwivelCheeseboroughs = 0; // 2 per pipe
  let totalSandbags = 0;
  let totalRearBridgeClampAdapters = 0; // For DM2.6 only, 1 per bridge clamp
  
  const panelType = document.getElementById('panelType').value;
  const isDM26 = panelType === 'DM2_6';

  // Check if CB5 panels with air frames - they don't need rear truss or bridge clamps
  const isCB5WithAirframes = (panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF') && connectionMethod === 'airframe';

  // Track bumpers and their ladder columns for sandbag calculation
  const bumperLadderInfo = []; // {bumper, ladderCol, panelsInColumn}
  
  // Track pipe lengths for columns that need them
  const pipeInfo = []; // {column, rearTrussCount, pipeLengthFt}
  
  // Get columns that have bottom bumpers (ladders are bound to bumpers)
  const columnsWithBumpers = new Set();
  
  bumpers.filter(b => b.position === 'bottom').forEach(bumper => {
    const cols = getBumperColumns(bumper);
    if(cols.length > 0) {
      // Check if bumper has a custom ladder column setting
      let ladderCol;
      if(bumper.type === '2w' && bumper.ladderColumn === 'right') {
        ladderCol = cols[1] !== undefined ? cols[1] : cols[0];
      } else {
        ladderCol = cols[0];
      }
      columnsWithBumpers.add(ladderCol);
      bumperLadderInfo.push({ bumper, ladderCol });
    }
  });
  
  // Count items per column
  columnsWithBumpers.forEach(c => {
    let topRow = -1;
    let bottomRow = -1;
    
    for(let r = 0; r < ph; r++) {
      const panelKey = `${c},${r}`;
      if(!deletedPanels.has(panelKey)) {
        if(topRow === -1) topRow = r;
        bottomRow = r;
      }
    }
    
    if(topRow !== -1 && bottomRow !== -1) {
      const totalPanelsInColumn = bottomRow - topRow + 1;
      const numTruss = Math.floor(totalPanelsInColumn / ladderHeightPanels);
      // CB5 with airframes don't need rear truss
      if(!isCB5WithAirframes) {
        totalRearTruss += numTruss;
      }
      
      // Check if we need a second base (more than 8 panels high)
      if(totalPanelsInColumn > maxPanelsBeforeSecondBase) {
        totalSecondBases++;
        totalPipes++; // 1 pipe per second base
        totalSwivelCheeseboroughs += 2; // 2 swivel cheeseboroughs per pipe
        
        // Calculate pipe length using Pythagorean theorem
        // Pipe goes diagonally from top rear truss to 2nd base truss
        // Each rear truss is 1000mm (1m) = 3.28 ft
        // Horizontal distance (base) = 2m = 6.56 ft
        // Vertical height = number of rear truss * 3.28 ft
        const horizontalDistFt = 6.56; // 2 meters in feet
        const verticalHeightFt = numTruss * 3.28; // Each truss is 1m = 3.28ft
        const diagonalFt = Math.sqrt(Math.pow(horizontalDistFt, 2) + Math.pow(verticalHeightFt, 2));
        const pipeLengthFt = Math.floor(diagonalFt); // Round down
        
        // Store pipe length info
        pipeInfo.push({
          column: c,
          rearTrussCount: numTruss,
          pipeLengthFt: pipeLengthFt
        });
      }
      
      // Store panel count for this column for sandbag calculation
      const info = bumperLadderInfo.find(bi => bi.ladderCol === c);
      if(info) {
        info.panelsInColumn = totalPanelsInColumn;
      }
    }
  });
  
  // Base truss = columns with bumpers (1 per column)
  // Plus second bases for tall walls
  totalBaseTruss = columnsWithBumpers.size + totalSecondBases;
  
  // Count bridge clamps - every 2nd row from bottom, only in columns with ladders
  // Skip for CB5 with airframes - they don't need bridge clamps
  if(!isCB5WithAirframes) {
    columnsWithBumpers.forEach(c => {
      for(let r = ph - 2; r >= 0; r -= 2) {
        const panelKey = `${c},${r}`;
        if(!deletedPanels.has(panelKey)) {
          totalBridgeClamps++;
        }
      }
    });
  }

  // Rear bridge clamp adapters for DM2.6 and custom panels that need them
  const allPnlsGS = getAllPanels();
  const pnlGS = allPnlsGS[panelType];
  if(isDM26 || (pnlGS && pnlGS.custom && pnlGS.needs_bridge_adapters)) {
    totalRearBridgeClampAdapters = totalBridgeClamps;
  }
  
  // Calculate sandbags: ((total weight of bumper) / 25lbs) x 1.25 = sandbags per column
  // Round up to nearest whole sandbag
  bumperLadderInfo.forEach(info => {
    const bumperWeight = calculateBumperPickupWeight(info.bumper);
    const weightLbs = bumperWeight.lbs;
    const sandbagWeight = 25; // lbs per sandbag
    const sandbagMultiplier = 1.25;
    const sandbagCount = Math.ceil((weightLbs / sandbagWeight) * sandbagMultiplier);
    totalSandbags += sandbagCount;
  });
  
  // Calculate total weight of all ground support hardware
  const totalWeightLbs = 
    (totalRearTruss * weights.rearTruss) +
    (totalBaseTruss * weights.baseTruss) +
    (totalBridgeClamps * weights.bridgeClamp) +
    (totalRearBridgeClampAdapters * weights.rearBridgeClampAdapter) +
    (totalPipes * weights.pipe) +
    (totalSwivelCheeseboroughs * weights.swivelCheeseborough) +
    (totalSandbags * weights.sandbag);
  
  const totalWeightKg = totalWeightLbs / KG_TO_LBS;
  
  return {
    totalRearTruss,
    totalBridgeClamps,
    totalBaseTruss,
    totalPipes,
    totalSwivelCheeseboroughs,
    totalSandbags,
    totalRearBridgeClampAdapters,
    totalWeightLbs,
    totalWeightKg,
    pipeInfo // Array of {column, rearTrussCount, pipeLengthFt}
  };
}

