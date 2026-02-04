// ==================== CONNECTING PLATES FUNCTIONS ====================
// Panel weight, plate calculations, and plates UI visibility.

function getPanelWeight(panelType, useConnectingPlates) {
  // Get base panel weight
  const allPanels = getAllPanels();
  const p = allPanels[panelType];
  if (!p) return 0;

  // If using connecting plates, panels don't have air frames
  if (useConnectingPlates) {
    if (panelType === 'CB5_MKII') {
      // Full CB5 panel WITHOUT air frame is 26.74 lbs = 12.13 kg
      return 12.13;
    } else if (panelType === 'CB5_MKII_HALF') {
      // Half CB5 panel WITHOUT air frame is 14.75 lbs = 6.69 kg
      return 6.69;
    } else if (p.custom && p.removable_frame && p.weight_no_frame_kg) {
      return p.weight_no_frame_kg;
    }
  }

  // Return standard weight with air frame
  return p.weight_kg || 0;
}

function shouldUseConnectingPlates(panelType) {
  // DM2.6 always uses connecting plates
  if (panelType === 'DM2_6') {
    return true;
  }

  // CB5 MKII and CB5 MKII HALF can choose
  if (panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF') {
    return connectionMethod === 'plates';
  }

  // Custom panels with connecting plates support
  const allP = getAllPanels();
  const p = allP[panelType];
  if (p && p.custom && p.uses_connecting_plates) {
    return connectionMethod === 'plates';
  }

  return false;
}

function calculateConnectingPlates(pw, ph, plate2wayKg, plate4wayKg) {
  // For perimeter-only 2-way plates and interior + bumper 4-way plates:
  
  // 2-way plates (yellow) on perimeter:
  // - Left edge: (ph-1) plates between vertically adjacent panels
  // - Right edge: (ph-1) plates between vertically adjacent panels
  // - Top/Bottom edge: (pw-1) plates between horizontally adjacent panels
  // - 2 plates at top-left and top-right where panels meet bumpers (or bottom if ground stacking)
  // Note: Corner plates are part of the edge counts, not separate
  const perimeterVertical = 2 * (ph - 1); // Left + Right edges
  const perimeterHorizontal = (pw - 1); // Top or Bottom edge
  const bumperEdgePlates = 2; // Vertical plates at left/right where they meet bumpers
  const total2way = perimeterVertical + perimeterHorizontal + bumperEdgePlates;
  
  // 4-way plates (red):
  // - Interior intersections: (pw-1) × (ph-1)
  // - Bumper-to-panel connections: (pw-1) plates at top or bottom row
  const interior4way = (pw - 1) * (ph - 1);
  const bumper4way = (pw - 1);
  const total4way = interior4way + bumper4way;
  
  // Calculate weights
  const weight2way = total2way * plate2wayKg;
  const weight4way = total4way * plate4wayKg;
  const totalPlateWeight = weight2way + weight4way;
  
  return {
    perimeterVertical,
    perimeterHorizontal,
    bumperEdgePlates,
    total2way,
    interior4way,
    bumper4way,
    total4way,
    weight2way,
    weight4way,
    totalPlateWeight
  };
}

function updatePlatesDisplay(useConnectingPlates, pw, ph, plate2wayKg, plate4wayKg) {
  // This function now just triggers the structure panel update
  // The actual display is handled by updateStructurePlatesDisplay()
  // which is called from updatePickupWeightSummary()
  
  // If structure view is visible, it will update automatically
  // Just call the structure plates display update
  updateStructurePlatesDisplay();
}

function updateConnectingPlatesVisibility(panelType) {
  const platesSection = document.getElementById('connectingPlatesSection');
  const cb5Choice = document.getElementById('cb5ConnectionChoice');
  const dm26Info = document.getElementById('dm26ConnectionInfo');

  const isCB5 = panelType === 'CB5_MKII' || panelType === 'CB5_MKII_HALF';
  const isDM26 = panelType === 'DM2_6';

  // Check if custom panel supports connecting plates
  const allP = getAllPanels();
  const pSpec = allP[panelType];
  const isCustomWithPlates = pSpec && pSpec.custom && pSpec.uses_connecting_plates;

  if (isCB5 || isDM26 || isCustomWithPlates) {
    platesSection.style.display = 'block';

    if (isCB5 || isCustomWithPlates) {
      // CB5 and custom panels can choose between air frame and connecting plates
      cb5Choice.style.display = 'block';
      dm26Info.style.display = 'none';
    } else if (isDM26) {
      // DM2.6 always uses plates (no choice)
      cb5Choice.style.display = 'none';
      dm26Info.style.display = 'block';

      // Force plates selection for DM2.6
      const platesRadio = document.querySelector('input[name="connectionMethod"][value="plates"]');
      if (platesRadio) platesRadio.checked = true;
    }
  } else {
    platesSection.style.display = 'none';
  }
}

