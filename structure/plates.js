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

// Does a top/bottom bumper physically rest on the top/bottom-most panel of this column?
// Authoritative from the live bumpers[] array (so manually adding/deleting a bumper updates
// the plates). Before bumpers are initialized on a fresh render, fall back to the auto
// assumption (auto-distribution covers every top/bottom panel).
function columnHasTopBumper(col) {
  if(col < 0) return false;
  if(bumpers.length > 0) {
    return bumpers.some(b => b.position === 'top' && (
      (b.type === '2w' && (b.startCol === col || b.startCol + 1 === col)) ||
      (b.type === '1w' && b.startCol === col)
    ));
  }
  const initialized = typeof screens !== 'undefined' && screens[currentScreenId]
    && screens[currentScreenId].data && screens[currentScreenId].data.bumpersInitialized;
  return !initialized && showTopBumper;
}
function columnHasBottomBumper(col) {
  if(col < 0) return false;
  if(bumpers.length > 0) {
    return bumpers.some(b => b.position === 'bottom' && (
      (b.type === '2w' && (b.startCol === col || b.startCol + 1 === col)) ||
      (b.type === '1w' && b.startCol === col)
    ));
  }
  const initialized = typeof screens !== 'undefined' && screens[currentScreenId]
    && screens[currentScreenId].data && screens[currentScreenId].data.bumpersInitialized;
  return !initialized && showBottomBumper;
}

// Single source of truth for connecting plates. Walks every grid vertex (the corner point
// where up to four panels can meet) and emits exactly one plate "mark" per vertex (or none),
// honoring deleted panels (gaps) and the bumpers physically resting on the panels. Both the
// structure canvas (which maps each mark to pixels) and the count/weight tables (which tally
// the marks) consume this, so the drawing and the numbers always agree.
//
// Rule (per vertex, looking at the up-to-4 surrounding panels TL/TR/BL/BR):
//  - 3 or 4 panels meet -> single 4-way (red). Covers interior crossings and concave corners.
//  - exactly 2 panels, side by side on an edge a bumper rests on -> 4-way (bumper meets seam).
//  - exactly 2 panels, side by side with no bumper -> horizontal 2-way (panel-to-panel).
//  - exactly 2 panels stacked -> vertical 2-way on the exposed side.
//  - exactly 1 panel with a bumper resting on it at this corner -> single straight 2-way
//    (the bumper END plate). Without a bumper, an isolated corner gets nothing.
//  - 2 diagonal panels or 0 panels -> nothing.
// Because each vertex yields at most one plate, a 4-way and a 2-way can never stack.
function enumerateConnectingPlates(pw, ph) {
  const marks = [];
  const exists = (c, r) => c >= 0 && c < pw && r >= 0 && r < ph && !deletedPanels.has(`${c},${r}`);
  // A bumper rests on panel (c,r) only where it is that column's top/bottom-most panel.
  const topBumperAbove = (c, r) => exists(c, r) && r === getFirstNonDeletedRow(c, ph) && columnHasTopBumper(c);
  const bottomBumperBelow = (c, r) => exists(c, r) && r === getLastNonDeletedRow(c, ph) && columnHasBottomBumper(c);

  for(let vc = 0; vc <= pw; vc++) {
    for(let vr = 0; vr <= ph; vr++) {
      const TL = exists(vc - 1, vr - 1);
      const TR = exists(vc,     vr - 1);
      const BL = exists(vc - 1, vr);
      const BR = exists(vc,     vr);
      const n = (TL ? 1 : 0) + (TR ? 1 : 0) + (BL ? 1 : 0) + (BR ? 1 : 0);

      if(n >= 3) {
        // 3 or 4 panels meet at this corner -> single 4-way plate
        marks.push({ kind: '4way', vc, vr });
        continue;
      }

      if(n === 2) {
        if(TR && BR) {
          // Column vc stacked vertically -> vertical 2-way on the left side of that column
          marks.push({ kind: '2way', vc, vr, place: 'vLeft' });
        } else if(TL && BL) {
          // Column vc-1 stacked vertically -> vertical 2-way on the right side of that column
          marks.push({ kind: '2way', vc, vr, place: 'vRight' });
        } else if(BL && BR) {
          // Two panels side by side, open above. A top bumper resting on either -> 4-way.
          if(topBumperAbove(vc - 1, vr) || topBumperAbove(vc, vr)) {
            marks.push({ kind: '4way', vc, vr });
          } else {
            marks.push({ kind: '2way', vc, vr, place: 'hTop' });
          }
        } else if(TL && TR) {
          // Two panels side by side, open below. A bottom bumper resting on either -> 4-way.
          if(bottomBumperBelow(vc - 1, vr - 1) || bottomBumperBelow(vc, vr - 1)) {
            marks.push({ kind: '4way', vc, vr });
          } else {
            marks.push({ kind: '2way', vc, vr, place: 'hBottom' });
          }
        }
        // TL&&BR or TR&&BL are diagonal-only (panels touch at a point) -> no plate.
        continue;
      }

      if(n === 1) {
        // Isolated panel corner: a single straight 2-way only if a bumper ends here.
        if(BR && topBumperAbove(vc, vr)) {
          marks.push({ kind: '2way', vc, vr, place: 'endTopLeft' });      // bumper end at panel's top-left
        } else if(BL && topBumperAbove(vc - 1, vr)) {
          marks.push({ kind: '2way', vc, vr, place: 'endTopRight' });     // bumper end at panel's top-right
        } else if(TR && bottomBumperBelow(vc, vr - 1)) {
          marks.push({ kind: '2way', vc, vr, place: 'endBottomLeft' });   // bumper end at panel's bottom-left
        } else if(TL && bottomBumperBelow(vc - 1, vr - 1)) {
          marks.push({ kind: '2way', vc, vr, place: 'endBottomRight' });  // bumper end at panel's bottom-right
        }
      }
    }
  }

  let total2way = 0, total4way = 0;
  for(const m of marks) {
    if(m.kind === '4way') total4way++;
    else total2way++;
  }

  return { marks, total2way, total4way };
}

function calculateConnectingPlates(pw, ph, plate2wayKg, plate4wayKg) {
  // Derive counts from the shared enumerator so tables match what's drawn (gap/bumper aware).
  const { total2way, total4way } = enumerateConnectingPlates(pw, ph);

  const weight2way = total2way * plate2wayKg;
  const weight4way = total4way * plate4wayKg;
  const totalPlateWeight = weight2way + weight4way;

  return {
    total2way,
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
      // DM2.6 always uses plates; shouldUseConnectingPlates() forces this regardless of the toggle.
    }
  } else {
    platesSection.style.display = 'none';
  }
}

