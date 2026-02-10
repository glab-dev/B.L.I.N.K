// ==================== CABLE LAYOUT DIAGRAM ====================
// Front-view diagram showing cable routing from LED wall to processor/distro.
// Renders into #cableDiagramCanvas inside the gear tab cabling section.

function renderCableDiagram(screenId) {
  const canvas = document.getElementById('cableDiagramCanvas');
  const container = document.getElementById('cableDiagramContainer');
  if (!canvas || !container) return;

  const screen = screens[screenId];
  if (!screen || !screen.calculatedData) {
    canvas.width = 0;
    canvas.height = 0;
    return;
  }

  const cabling = calculateCabling(screenId);
  if (!cabling) {
    canvas.width = 0;
    canvas.height = 0;
    return;
  }

  // Extract values
  const wallHeightFt = cabling.wallHeightFt;
  const wallWidthFt = cabling.wallWidthFt;
  const wallToFloor = cabling.inputs.wallToFloor;
  const distroToWall = cabling.inputs.distroToWall;
  const processorToWall = cabling.inputs.processorToWall;
  const cablePick = cabling.inputs.cablePick;
  const serverToProcessor = cabling.serverCable ? cabling.serverCable.lengthFt : 0;
  const distBoxOnWall = screen.data.distBoxOnWall || false;
  const dropPos = screen.data.cableDropPosition || 'behind';
  const powerInPos = screen.data.powerInPosition || 'top';

  // SOCA power cable data
  const calc = screen.calculatedData;
  const socaCount = calc.socaCount || 1;
  const columnsPerCircuit = calc.columnsPerCircuit || 1;
  const circuitsNeeded = calc.circuitsNeeded || 1;

  // Data cable entry/exit points and redundancy
  const dataLineCount = cabling.dataLines || 0;
  const dataFlip = screen.data.dataFlip || false;
  const entryPoints = dataFlip ? (cabling.exitPoints || {}) : (cabling.entryPoints || {});
  const exitPoints = dataFlip ? (cabling.entryPoints || {}) : (cabling.exitPoints || {});
  const dataStartDir = cabling.dataStartDir || 'top';
  const dataRedundancy = screen.data.redundancy || false;

  // Layout constants
  const MARGIN = { top: 50, bottom: 55, left: 20, right: 50 };
  const BOX_W = 48, BOX_H = 24;
  const PICK_GAP = 30; // visual gap between wall top and cable pick circle
  const PICK_RADIUS = 8; // radius of the cable pick circle

  // Canvas sizing — use full container width, no cap
  const containerWidth = container.clientWidth || 300;
  const canvasW = containerWidth;
  const dpr = window.devicePixelRatio || 1;

  // Scene bounds in feet — wall is on the right, equipment to the left of drop point
  // Equipment extends left from the drop point; drop point is on the wall
  const dropLocalFt = (dropPos === 'sr') ? 0 : (dropPos === 'sl') ? wallWidthFt : wallWidthFt / 2;
  const leftmostEquipFt = dropLocalFt - Math.max(distroToWall, processorToWall);
  const maxLeftFt = Math.max(-leftmostEquipFt, 2) + 2;
  const totalVertFt = wallHeightFt + wallToFloor + 2; // +2 for floor equipment space

  // Scale to fit — fill the full width, height follows proportionally
  const drawableW = canvasW - MARGIN.left - MARGIN.right;
  const scaleH = drawableW / (maxLeftFt + wallWidthFt + 4);
  const scale = Math.min(scaleH, 80);

  // Behind pick needs extra vertical space above the wall
  const pickBehind = dropPos === 'behind';
  const pickVertSpace = (cablePick > 0 && pickBehind) ? PICK_GAP + PICK_RADIUS * 2 + 10 : 0;
  const canvasH = MARGIN.top + totalVertFt * scale + MARGIN.bottom + pickVertSpace;

  // Set canvas size with HiDPI
  canvas.width = canvasW * dpr;
  canvas.height = canvasH * dpr;
  canvas.style.width = canvasW + 'px';
  canvas.style.height = Math.round(canvasH) + 'px';

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);

  // Colors
  const bgColor = '#1a1a1a';
  const fgColor = '#ffffff';
  const dimColor = '#999999';
  const POWER_COLOR = '#FF6B35';
  const DATA_COLOR = '#00CED1';
  const PROC_COLOR = '#4ECDC4';
  const DISTBOX_COLOR = '#FFD700'; // gold — distribution box
  const TRUNK_COLOR = '#FFFFFF'; // white — trunk cable (processor ↔ dist box)
  const PICK_COLOR = '#7CFC00'; // lime green — cable pick
  const BACKUP_COLOR = '#FF69B4'; // hot pink — backup/redundancy data cables
  const SERVER_COLOR = '#AB47BC'; // purple — server box & cable

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // === Position calculations ===
  // Wall sits on the right side of the diagram
  const wallRightX = canvasW - MARGIN.right;
  const wallLeftX = wallRightX - wallWidthFt * scale;
  const wallCenterX = (wallLeftX + wallRightX) / 2;
  const wallTopY = MARGIN.top + pickVertSpace;
  const wallBottomY = wallTopY + wallHeightFt * scale;
  const floorY = wallBottomY + wallToFloor * scale;
  const wallW = wallRightX - wallLeftX;
  const wallH = wallBottomY - wallTopY;

  // Ensure minimum wall size for visibility
  const minWallW = Math.max(wallW, 40);
  const minWallH = Math.max(wallH, 30);
  const adjWallLeftX = wallRightX - minWallW;

  // Cable drop point based on position toggle
  // Front view: SR = viewer's left edge, SL = viewer's right edge
  let dropX;
  if (dropPos === 'sr') {
    dropX = adjWallLeftX; // left edge = stage right from front
  } else if (dropPos === 'sl') {
    dropX = wallRightX; // right edge = stage left from front
  } else {
    dropX = wallCenterX; // behind = center
  }

  // Equipment positions on the floor — distances are from drop point
  const distroX = dropX - distroToWall * scale;
  const procX = dropX - processorToWall * scale;
  const equipY = floorY - BOX_H; // boxes sit on top of floor line

  // Server box — fixed on the left, vertically centered between wall top and floor
  const serverBoxX = MARGIN.left;
  const serverBoxCenterY = (wallTopY + floorY) / 2;
  const serverBoxY = serverBoxCenterY - BOX_H / 2;

  // === Draw floor line ===
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.moveTo(MARGIN.left - 10, floorY);
  ctx.lineTo(canvasW - MARGIN.right + 30, floorY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Floor label
  ctx.fillStyle = '#666666';
  ctx.font = '9px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('FLOOR', MARGIN.left - 10, floorY - 8);

  // === Draw LED wall as panel grid ===
  const pw = screen.data.panelsWide || 1;
  const ph = screen.data.panelsHigh || 1;
  const screenDeletedPanels = screen.data.deletedPanels || new Set();
  const panelType = screen.data.panelType || '';
  const hasCB5HalfRow = screen.data.addCB5HalfRow && panelType === 'CB5_MKII';
  const actualWallW = Math.max(wallW, minWallW);
  const actualWallH = Math.max(wallH, minWallH);
  const panelPixelW = actualWallW / pw;

  // With half row: ph full rows + 1 half row. Half panel = half the height of a full panel.
  // Total wall height = ph * fullH + fullH/2 = fullH * (ph + 0.5)
  // Without half row: ph rows all equal height.
  const totalRows = hasCB5HalfRow ? ph + 1 : ph;
  const fullPanelPixelH = hasCB5HalfRow ? actualWallH / (ph + 0.5) : actualWallH / ph;
  const halfPanelPixelH = fullPanelPixelH / 2;
  const panelFontSize = Math.max(6, Math.min(10, Math.floor(Math.min(panelPixelW, fullPanelPixelH) * 0.35)));

  ctx.font = panelFontSize + 'px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let c = 0; c < pw; c++) {
    for (let r = 0; r < totalRows; r++) {
      const panelKey = c + ',' + r;
      const isHalfRow = hasCB5HalfRow && r === ph; // last row is half
      const currentH = isHalfRow ? halfPanelPixelH : fullPanelPixelH;
      const px = adjWallLeftX + c * panelPixelW;
      const py = wallTopY + r * fullPanelPixelH; // half row starts after all full rows

      if (screenDeletedPanels.has && screenDeletedPanels.has(panelKey)) {
        // Deleted panel — dashed outline, no fill
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(px, py, panelPixelW, currentH);
        ctx.setLineDash([]);
      } else {
        // Normal panel — transparent with light outline
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, panelPixelW, currentH);
      }
    }
  }

  // === Cable pick circle ===
  // Pick is at the top of the wall. Route: wall top → pick → down through wall → floor → equip.
  // Behind: above wall top center. SR: to the left at wall-top height. SL: to the right.
  let pickCenterX = dropX;
  let pickCenterY = wallTopY;

  if (cablePick > 0) {
    if (pickBehind) {
      // Above the wall top, centered on drop point
      pickCenterX = dropX;
      pickCenterY = wallTopY - PICK_GAP - PICK_RADIUS;
    } else if (dropPos === 'sr') {
      // To the left of the wall at wall-top height (SR = viewer's left)
      pickCenterX = adjWallLeftX - PICK_GAP - PICK_RADIUS;
      pickCenterY = wallTopY + PICK_RADIUS;
    } else {
      // To the right of the wall at wall-top height (SL = viewer's right)
      pickCenterX = wallRightX + PICK_GAP + PICK_RADIUS;
      pickCenterY = wallTopY + PICK_RADIUS;
    }

    // Draw the cable pick circle
    ctx.fillStyle = PICK_COLOR;
    ctx.beginPath();
    ctx.arc(pickCenterX, pickCenterY, PICK_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label inside the circle
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PICK', pickCenterX, pickCenterY);
  }

  // === Draw cable routes ===
  // With pick:    wall (drop point) → pick → floor → equipment
  // Without pick: wall (drop point) → floor → equipment

  // Offsets to prevent cable overlap on shared horizontal runs
  const POWER_WALL_TOP_Y = wallTopY - 4;  // power runs above wall top edge
  const POWER_WALL_BOTTOM_Y = wallBottomY - 4; // power bottom-entry runs above wall bottom edge
  const DATA_WALL_TOP_Y = wallTopY + 4;   // data runs below wall top edge
  const DATA_WALL_BOTTOM_Y = wallBottomY + 4; // data bottom-entry runs below wall bottom edge
  const POWER_FLOOR_Y = floorY - 5;       // power runs above floor line
  const DATA_FLOOR_Y = floorY + 5;        // data primary runs below floor line
  const BACKUP_FLOOR_Y = floorY + 12;     // data backup runs further below floor line

  function drawCablePath(ctx, offsetX, cableWallTopY, cableFloorY, targetFloorX, targetBoxTopY) {
    ctx.beginPath();
    // Start at wall drop point (top of wall)
    ctx.moveTo(dropX + offsetX, cableWallTopY);

    if (cablePick > 0) {
      // Wall → pick circle
      ctx.lineTo(pickCenterX + offsetX, pickCenterY);
      // Pick → straight down to floor
      ctx.lineTo(pickCenterX + offsetX, cableFloorY);
    } else {
      // No pick — straight down from wall to floor
      ctx.lineTo(dropX + offsetX, cableFloorY);
    }

    // Along floor to equipment
    ctx.lineTo(targetFloorX, cableFloorY);
    // Up into equipment box
    ctx.lineTo(targetFloorX, targetBoxTopY);
    ctx.stroke();
  }

  // Deferred overlays — markers, brackets, labels drawn AFTER all cable lines
  const deferredOverlays = [];

  // Power cables — one per SOCA
  for (let s = 0; s < socaCount; s++) {
    const firstCircuit = s * 6;
    const lastCircuit = Math.min(firstCircuit + 5, circuitsNeeded - 1);
    const firstCol = firstCircuit * columnsPerCircuit;
    const lastCol = Math.min((lastCircuit + 1) * columnsPerCircuit - 1, pw - 1);

    // Landing X = center of the columns this SOCA covers
    const landingX = adjWallLeftX + ((firstCol + lastCol + 1) / 2) * panelPixelW;

    // Draw cable based on power in position
    ctx.strokeStyle = POWER_COLOR;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (powerInPos === 'bottom') {
      // Bottom routing: landing at bottom → along bottom → drop → floor → distro
      ctx.moveTo(landingX - 3, POWER_WALL_BOTTOM_Y);
      ctx.lineTo(dropX - 3, POWER_WALL_BOTTOM_Y);
      ctx.lineTo(dropX - 3, POWER_FLOOR_Y);
      ctx.lineTo(distroX, POWER_FLOOR_Y);
      ctx.lineTo(distroX, equipY + BOX_H);
    } else {
      // Top routing (default): landing → along top → drop → pick → floor → distro
      ctx.moveTo(landingX - 3, POWER_WALL_TOP_Y);
      ctx.lineTo(dropX - 3, POWER_WALL_TOP_Y);
      if (cablePick > 0) {
        ctx.lineTo(pickCenterX - 3, pickCenterY);
        ctx.lineTo(pickCenterX - 3, POWER_FLOOR_Y);
      } else {
        ctx.lineTo(dropX - 3, POWER_FLOOR_Y);
      }
      ctx.lineTo(distroX, POWER_FLOOR_Y);
      ctx.lineTo(distroX, equipY + BOX_H);
    }
    ctx.stroke();

    // Defer SOCA marker, bracket, and label to draw on top of all cables
    const _landingX = landingX, _s = s;
    const _bracketStartX = adjWallLeftX + firstCol * panelPixelW;
    const _bracketEndX = adjWallLeftX + (lastCol + 1) * panelPixelW;
    deferredOverlays.push(function() {
      // SOCA landing marker on wall
      ctx.fillStyle = POWER_COLOR;
      ctx.beginPath();
      ctx.arc(_landingX, powerInPos === 'bottom' ? wallBottomY : wallTopY, 5, 0, Math.PI * 2);
      ctx.fill();

      // SOCA bracket and label
      ctx.strokeStyle = POWER_COLOR;
      ctx.lineWidth = 1.5;
      if (powerInPos === 'bottom') {
        const bracketY = wallBottomY + 18;
        ctx.beginPath();
        ctx.moveTo(_bracketStartX, bracketY - 6);
        ctx.lineTo(_bracketStartX, bracketY);
        ctx.lineTo(_bracketEndX, bracketY);
        ctx.lineTo(_bracketEndX, bracketY - 6);
        ctx.stroke();
        ctx.fillStyle = POWER_COLOR;
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('SOCA ' + (_s + 1), _landingX, bracketY + 2);
      } else {
        const bracketY = wallTopY - 18;
        ctx.beginPath();
        ctx.moveTo(_bracketStartX, bracketY + 6);
        ctx.lineTo(_bracketStartX, bracketY);
        ctx.lineTo(_bracketEndX, bracketY);
        ctx.lineTo(_bracketEndX, bracketY + 6);
        ctx.stroke();
        ctx.fillStyle = POWER_COLOR;
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('SOCA ' + (_s + 1), _landingX, bracketY - 2);
      }
    });
  }

  // === Data cables — one per data line, all cyan; backup in pink if redundancy ===
  const DATA_OFFSET = 6; // horizontal offset from power cables (power uses -3, data uses +6)
  const BACKUP_OFFSET = 16; // backup cables offset further out (10px gap from primary)
  const dataFanWidth = dataLineCount <= 4 ? 2.5 : (dataLineCount <= 8 ? 2.0 : 1.5);

  // Helper: draw a label to the right of a dot with dark background
  function drawCableLabel(labelText, x, y, color) {
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const lw = ctx.measureText(labelText).width + 4;
    ctx.fillStyle = bgColor;
    ctx.fillRect(x + 6, y - 7, lw, 14);
    ctx.fillStyle = color;
    ctx.fillText(labelText, x + 7, y);
  }

  // Helper: draw a dot marker
  function drawMarker(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Helper: compute target Y inside the wall for an entry/exit panel
  function getPanelTargetY(row, fromBottom) {
    if (fromBottom) return wallTopY + (row + 2 / 3) * fullPanelPixelH;
    return wallTopY + (row + 1 / 3) * fullPanelPixelH;
  }

  if (distBoxOnWall) {
    // Compute dist box positions from settings (independent H and V for main/backup)
    const distBoxMainHorizPos = screen.data.distBoxMainHorizPosition || screen.data.distBoxHorizPosition || 'center';
    const distBoxBackupHorizPos = screen.data.distBoxBackupHorizPosition || screen.data.distBoxHorizPosition || 'center';
    const distBoxMainVert = screen.data.distBoxMainVertPosition || 'top';
    const distBoxBackupVert = screen.data.distBoxBackupVertPosition || 'top';
    const twoDistBoxes = dataRedundancy && (distBoxMainHorizPos !== distBoxBackupHorizPos || distBoxMainVert !== distBoxBackupVert);

    // Helper: compute dist box center X from horiz position
    function getDistBoxCenterX(horizPos) {
      let cx;
      if (horizPos === 'sr') {
        cx = adjWallLeftX + 2 * panelPixelW;
      } else if (horizPos === 'sl') {
        cx = wallRightX - 2 * panelPixelW;
      } else {
        cx = wallCenterX;
      }
      return Math.min(Math.max(cx, adjWallLeftX + BOX_W / 2), wallRightX - BOX_W / 2);
    }

    const mainDistBoxCenterX = getDistBoxCenterX(distBoxMainHorizPos);
    const mainDistBoxLeftX = mainDistBoxCenterX - BOX_W / 2;
    const mainDistBoxRightX = mainDistBoxCenterX + BOX_W / 2;
    const backupDistBoxCenterX = twoDistBoxes ? getDistBoxCenterX(distBoxBackupHorizPos) : mainDistBoxCenterX;
    const backupDistBoxLeftX = backupDistBoxCenterX - BOX_W / 2;
    const backupDistBoxRightX = backupDistBoxCenterX + BOX_W / 2;

    // Vertical positions for main and backup
    const mainDistBoxTopY = distBoxMainVert === 'bottom' ? wallBottomY - BOX_H - 10 : wallTopY + 35;
    const mainDistBoxBottomY = mainDistBoxTopY + BOX_H;
    const backupDistBoxTopY = twoDistBoxes
      ? (distBoxBackupVert === 'bottom' ? wallBottomY - BOX_H - 10 : wallTopY + 35)
      : mainDistBoxTopY;
    const backupDistBoxBottomY = backupDistBoxTopY + BOX_H;

    // Primary trunk cable: main dist box → wall edge → drop → floor → processor
    ctx.strokeStyle = DISTBOX_COLOR;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (distBoxMainVert === 'bottom') {
      ctx.moveTo(mainDistBoxCenterX + DATA_OFFSET, mainDistBoxBottomY);
      ctx.lineTo(mainDistBoxCenterX + DATA_OFFSET, DATA_WALL_BOTTOM_Y);
      ctx.lineTo(dropX + DATA_OFFSET, DATA_WALL_BOTTOM_Y);
      ctx.lineTo(dropX + DATA_OFFSET, DATA_FLOOR_Y);
      ctx.lineTo(procX, DATA_FLOOR_Y);
      ctx.lineTo(procX, equipY + BOX_H);
    } else {
      ctx.moveTo(mainDistBoxCenterX + DATA_OFFSET, mainDistBoxTopY);
      ctx.lineTo(mainDistBoxCenterX + DATA_OFFSET, DATA_WALL_TOP_Y);
      ctx.lineTo(dropX + DATA_OFFSET, DATA_WALL_TOP_Y);
      if (cablePick > 0) {
        ctx.lineTo(pickCenterX + DATA_OFFSET, pickCenterY);
        ctx.lineTo(pickCenterX + DATA_OFFSET, DATA_FLOOR_Y);
      } else {
        ctx.lineTo(dropX + DATA_OFFSET, DATA_FLOOR_Y);
      }
      ctx.lineTo(procX, DATA_FLOOR_Y);
      ctx.lineTo(procX, equipY + BOX_H);
    }
    ctx.stroke();

    // Backup trunk cable (if redundancy) — white, from backup dist box position
    if (dataRedundancy) {
      ctx.strokeStyle = TRUNK_COLOR;
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (distBoxBackupVert === 'bottom') {
        ctx.moveTo(backupDistBoxCenterX + BACKUP_OFFSET, backupDistBoxBottomY);
        ctx.lineTo(backupDistBoxCenterX + BACKUP_OFFSET, DATA_WALL_BOTTOM_Y);
        ctx.lineTo(dropX + BACKUP_OFFSET, DATA_WALL_BOTTOM_Y);
        ctx.lineTo(dropX + BACKUP_OFFSET, BACKUP_FLOOR_Y);
        ctx.lineTo(procX + 8, BACKUP_FLOOR_Y);
        ctx.lineTo(procX + 8, equipY + BOX_H);
      } else {
        ctx.moveTo(backupDistBoxCenterX + BACKUP_OFFSET, backupDistBoxTopY);
        ctx.lineTo(backupDistBoxCenterX + BACKUP_OFFSET, DATA_WALL_TOP_Y);
        ctx.lineTo(dropX + BACKUP_OFFSET, DATA_WALL_TOP_Y);
        if (cablePick > 0) {
          ctx.lineTo(pickCenterX + BACKUP_OFFSET, pickCenterY);
          ctx.lineTo(pickCenterX + BACKUP_OFFSET, BACKUP_FLOOR_Y);
        } else {
          ctx.lineTo(dropX + BACKUP_OFFSET, BACKUP_FLOOR_Y);
        }
        ctx.lineTo(procX + 8, BACKUP_FLOOR_Y);
        ctx.lineTo(procX + 8, equipY + BOX_H);
      }
      ctx.stroke();
    }

    // Fan-out: L-shaped lines from dist box to each entry + backup exit
    const fanPrimaryY = twoDistBoxes
      ? mainDistBoxTopY + BOX_H / 2
      : mainDistBoxTopY + BOX_H / 2 - 3;
    const fanBackupY = twoDistBoxes
      ? backupDistBoxTopY + BOX_H / 2
      : mainDistBoxTopY + BOX_H / 2 + 3;

    for (let dl = 0; dl < dataLineCount; dl++) {
      const entry = entryPoints[dl];
      if (!entry) continue;

      const entryPxX = adjWallLeftX + (entry.col + 0.5) * panelPixelW;
      const entryPxY = wallTopY + (entry.row + 0.5) * fullPanelPixelH;

      // Primary fan-out — L-shaped from main dist box edge
      const primaryFanStartX = entryPxX < mainDistBoxCenterX ? mainDistBoxLeftX : mainDistBoxRightX;
      ctx.strokeStyle = DATA_COLOR;
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(primaryFanStartX, fanPrimaryY);
      ctx.lineTo(entryPxX - 2, fanPrimaryY);
      ctx.lineTo(entryPxX - 2, entryPxY);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      deferredOverlays.push(function() {
        drawMarker(entryPxX, entryPxY, 4, DATA_COLOR);
        drawCableLabel('D' + (dl + 1), entryPxX, entryPxY, DATA_COLOR);
      });

      // Backup fan-out to exit panel — from backup dist box
      if (dataRedundancy) {
        const exit = exitPoints[dl];
        if (exit) {
          const exitPxX = adjWallLeftX + (exit.col + 0.5) * panelPixelW;
          const exitPxY = wallTopY + (exit.row + 0.5) * fullPanelPixelH;

          const backupFanStartX = exitPxX < backupDistBoxCenterX ? backupDistBoxLeftX : backupDistBoxRightX;
          ctx.strokeStyle = BACKUP_COLOR;
          ctx.lineWidth = 1.0;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.moveTo(backupFanStartX, fanBackupY);
          ctx.lineTo(exitPxX + 2, fanBackupY);
          ctx.lineTo(exitPxX + 2, exitPxY);
          ctx.stroke();
          ctx.globalAlpha = 1.0;

          deferredOverlays.push(function() {
            drawMarker(exitPxX, exitPxY, 3, BACKUP_COLOR);
            drawCableLabel('B' + (dl + 1), exitPxX, exitPxY, BACKUP_COLOR);
          });
        }
      }
    }
  } else {
    // No dist box: fan segments → drop point, then bundle cable to processor

    // Check which edges have entries (primary + backup)
    let hasTopEntry = false, hasBottomEntry = false;
    let hasTopExit = false, hasBottomExit = false;
    for (let dl = 0; dl < dataLineCount; dl++) {
      const entry = entryPoints[dl];
      if (entry) {
        if (entry.row >= totalRows / 2) hasBottomEntry = true;
        else hasTopEntry = true;
      }
      if (dataRedundancy) {
        const exit = exitPoints[dl];
        if (exit) {
          if (exit.row >= totalRows / 2) hasBottomExit = true;
          else hasTopExit = true;
        }
      }
    }

    // Primary bundle cable (cyan): drop → pick → floor → processor
    ctx.strokeStyle = DATA_COLOR;
    ctx.lineWidth = 3;
    if (hasTopEntry) {
      ctx.beginPath();
      ctx.moveTo(dropX + DATA_OFFSET, DATA_WALL_TOP_Y);
      if (cablePick > 0) {
        ctx.lineTo(pickCenterX + DATA_OFFSET, pickCenterY);
        ctx.lineTo(pickCenterX + DATA_OFFSET, DATA_FLOOR_Y);
      } else {
        ctx.lineTo(dropX + DATA_OFFSET, DATA_FLOOR_Y);
      }
      ctx.lineTo(procX, DATA_FLOOR_Y);
      ctx.lineTo(procX, equipY + BOX_H);
      ctx.stroke();
    }
    if (hasBottomEntry) {
      // Bottom bundle merges into the top bundle's vertical drop
      const dataDropX = cablePick > 0 ? pickCenterX + DATA_OFFSET : dropX + DATA_OFFSET;
      ctx.beginPath();
      ctx.moveTo(dropX + DATA_OFFSET, DATA_WALL_BOTTOM_Y);
      ctx.lineTo(dataDropX, DATA_WALL_BOTTOM_Y); // horizontal to meet vertical drop
      if (!hasTopEntry) {
        // No top bundle — draw own vertical drop to floor and processor
        ctx.lineTo(dataDropX, DATA_FLOOR_Y);
        ctx.lineTo(procX, DATA_FLOOR_Y);
        ctx.lineTo(procX, equipY + BOX_H);
      }
      ctx.stroke();
    }

    // Backup bundle cable (pink) if redundancy
    if (dataRedundancy) {
      ctx.strokeStyle = BACKUP_COLOR;
      ctx.lineWidth = 3;
      if (hasTopExit) {
        ctx.beginPath();
        ctx.moveTo(dropX + BACKUP_OFFSET, DATA_WALL_TOP_Y);
        if (cablePick > 0) {
          ctx.lineTo(pickCenterX + BACKUP_OFFSET, pickCenterY);
          ctx.lineTo(pickCenterX + BACKUP_OFFSET, BACKUP_FLOOR_Y);
        } else {
          ctx.lineTo(dropX + BACKUP_OFFSET, BACKUP_FLOOR_Y);
        }
        ctx.lineTo(procX + 8, BACKUP_FLOOR_Y);
        ctx.lineTo(procX + 8, equipY + BOX_H);
        ctx.stroke();
      }
      if (hasBottomExit) {
        // Bottom backup merges into the top backup's vertical drop
        const backupDropX = cablePick > 0 ? pickCenterX + BACKUP_OFFSET : dropX + BACKUP_OFFSET;
        ctx.beginPath();
        ctx.moveTo(dropX + BACKUP_OFFSET, DATA_WALL_BOTTOM_Y);
        ctx.lineTo(backupDropX, DATA_WALL_BOTTOM_Y); // horizontal to meet vertical drop
        if (!hasTopExit) {
          // No top bundle — draw own vertical drop to floor and processor
          ctx.lineTo(backupDropX, BACKUP_FLOOR_Y);
          ctx.lineTo(procX + 8, BACKUP_FLOOR_Y);
          ctx.lineTo(procX + 8, equipY + BOX_H);
        }
        ctx.stroke();
      }
    }

    // Primary fan segments: entry panel → wall edge → drop
    for (let dl = 0; dl < dataLineCount; dl++) {
      const entry = entryPoints[dl];
      if (!entry) continue;

      const landingX = adjWallLeftX + (entry.col + 0.5) * panelPixelW;
      const isBottomEntry = entry.row >= totalRows / 2;
      const panelTargetY = getPanelTargetY(entry.row, isBottomEntry);

      ctx.strokeStyle = DATA_COLOR;
      ctx.lineWidth = dataFanWidth;
      ctx.beginPath();
      ctx.moveTo(landingX, panelTargetY);
      if (isBottomEntry) {
        ctx.lineTo(landingX, DATA_WALL_BOTTOM_Y);
        ctx.lineTo(dropX + DATA_OFFSET, DATA_WALL_BOTTOM_Y);
      } else {
        ctx.lineTo(landingX, DATA_WALL_TOP_Y);
        ctx.lineTo(dropX + DATA_OFFSET, DATA_WALL_TOP_Y);
      }
      ctx.stroke();

      deferredOverlays.push(function() {
        drawMarker(landingX, panelTargetY, 4, DATA_COLOR);
        drawCableLabel('D' + (dl + 1), landingX, panelTargetY, DATA_COLOR);
      });
    }

    // Backup fan segments (pink): exit panel → wall edge → drop
    if (dataRedundancy) {
      for (let dl = 0; dl < dataLineCount; dl++) {
        const exit = exitPoints[dl];
        if (!exit) continue;

        const landingX = adjWallLeftX + (exit.col + 0.5) * panelPixelW;
        const isBottomExit = exit.row >= totalRows / 2;
        const panelTargetY = getPanelTargetY(exit.row, isBottomExit);

        ctx.strokeStyle = BACKUP_COLOR;
        ctx.lineWidth = dataFanWidth;
        ctx.beginPath();
        ctx.moveTo(landingX, panelTargetY);
        if (isBottomExit) {
          ctx.lineTo(landingX, DATA_WALL_BOTTOM_Y);
          ctx.lineTo(dropX + BACKUP_OFFSET, DATA_WALL_BOTTOM_Y);
        } else {
          ctx.lineTo(landingX, DATA_WALL_TOP_Y);
          ctx.lineTo(dropX + BACKUP_OFFSET, DATA_WALL_TOP_Y);
        }
        ctx.stroke();

        deferredOverlays.push(function() {
          drawMarker(landingX, panelTargetY, 3, BACKUP_COLOR);
          drawCableLabel('B' + (dl + 1), landingX, panelTargetY, BACKUP_COLOR);
        });
      }
    }
  }

  // === Draw server-to-processor cable ===
  if (serverToProcessor > 0) {
    ctx.strokeStyle = SERVER_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(serverBoxX + BOX_W, serverBoxCenterY);      // right edge of server box
    ctx.lineTo(serverBoxX + BOX_W, equipY + BOX_H / 2);   // vertical down to floor level
    ctx.lineTo(procX - BOX_W / 2, equipY + BOX_H / 2);    // horizontal right to proc box
    ctx.stroke();

    // Cable length label centered on the horizontal segment
    const srvLabelText = serverToProcessor + "'";
    const srvLabelX = (serverBoxX + BOX_W + procX - BOX_W / 2) / 2;
    const srvLabelY = equipY + BOX_H / 2 - 10;
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const srvTw = ctx.measureText(srvLabelText).width + 6;
    ctx.fillStyle = bgColor;
    ctx.fillRect(srvLabelX - srvTw / 2, srvLabelY - 7, srvTw, 14);
    ctx.fillStyle = SERVER_COLOR;
    ctx.fillText(srvLabelText, srvLabelX, srvLabelY);
  }

  // === Draw deferred overlays (markers, brackets, labels) on top of all cable lines ===
  deferredOverlays.forEach(function(fn) { fn(); });

  // === Draw equipment boxes ===
  drawCableEquipmentBox(ctx, distroX - BOX_W / 2, equipY, BOX_W, BOX_H, 'DISTRO', POWER_COLOR);
  drawCableEquipmentBox(ctx, procX - BOX_W / 2, equipY, BOX_W, BOX_H, 'PROC', PROC_COLOR);
  if (serverToProcessor > 0) {
    drawCableEquipmentBox(ctx, serverBoxX, serverBoxY, BOX_W, BOX_H, 'SERVER', SERVER_COLOR);
  }

  // Dist box on wall (when toggle ON)
  if (distBoxOnWall) {
    const dbMainHorizPos = screen.data.distBoxMainHorizPosition || screen.data.distBoxHorizPosition || 'center';
    const dbBackupHorizPos = screen.data.distBoxBackupHorizPosition || screen.data.distBoxHorizPosition || 'center';
    const dbMainVert = screen.data.distBoxMainVertPosition || 'top';
    const dbBackupVert = screen.data.distBoxBackupVertPosition || 'top';
    const dbTwoBoxes = dataRedundancy && (dbMainHorizPos !== dbBackupHorizPos || dbMainVert !== dbBackupVert);

    function getDbCenterX(horizPos) {
      let cx;
      if (horizPos === 'sr') cx = adjWallLeftX + 2 * panelPixelW;
      else if (horizPos === 'sl') cx = wallRightX - 2 * panelPixelW;
      else cx = wallCenterX;
      return Math.min(Math.max(cx, adjWallLeftX + BOX_W / 2), wallRightX - BOX_W / 2);
    }

    const mainDbCenterX = getDbCenterX(dbMainHorizPos);
    const mainDbX = mainDbCenterX - BOX_W / 2;
    const mainDbY = dbMainVert === 'bottom' ? wallBottomY - BOX_H - 10 : wallTopY + 35;

    // Draw main dist box — filled background to cover cables, gold border
    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.fillRect(mainDbX, mainDbY, BOX_W, BOX_H);
    ctx.strokeStyle = DISTBOX_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(mainDbX, mainDbY, BOX_W, BOX_H);
    ctx.fillStyle = DISTBOX_COLOR;
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dbTwoBoxes ? 'MAIN' : 'DIST BOX', mainDbCenterX, mainDbY + BOX_H / 2);
    ctx.restore();

    // Draw backup dist box when positions differ
    if (dbTwoBoxes) {
      const backupDbCenterX = getDbCenterX(dbBackupHorizPos);
      const backupDbX = backupDbCenterX - BOX_W / 2;
      const backupDbY = dbBackupVert === 'bottom' ? wallBottomY - BOX_H - 10 : wallTopY + 35;
      ctx.save();
      ctx.fillStyle = bgColor;
      ctx.fillRect(backupDbX, backupDbY, BOX_W, BOX_H);
      ctx.strokeStyle = TRUNK_COLOR;
      ctx.lineWidth = 2;
      ctx.strokeRect(backupDbX, backupDbY, BOX_W, BOX_H);
      ctx.fillStyle = TRUNK_COLOR;
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BACKUP', backupDbCenterX, backupDbY + BOX_H / 2);
      ctx.restore();
    }
  }

  // === Draw dimension lines ===

  // Wall height — right side of wall
  const dimOffsetRight = 18;
  drawCableDimensionLine(ctx, wallRightX + dimOffsetRight, wallTopY, wallRightX + dimOffsetRight, wallBottomY,
    wallHeightFt + "'", fgColor, bgColor);

  // Wall width — above wall
  drawCableDimensionLine(ctx, adjWallLeftX, wallTopY - 12, wallRightX, wallTopY - 12,
    wallWidthFt + "'", fgColor, bgColor);

  // Wall to floor — right side, between wall bottom and floor
  if (wallToFloor > 0) {
    drawCableDimensionLine(ctx, wallRightX + dimOffsetRight + 20, wallBottomY, wallRightX + dimOffsetRight + 20, floorY,
      wallToFloor + "'", fgColor, bgColor);
  }

  // Cable pick — dimension from drop point to pick circle
  if (cablePick > 0) {
    if (pickBehind) {
      // Vertical: wall top up to pick circle
      const pickDimX = pickCenterX - 25;
      drawCableDimensionLine(ctx, pickDimX, pickCenterY - PICK_RADIUS, pickDimX, wallTopY,
        cablePick + "'", fgColor, bgColor);
    } else if (dropPos === 'sr') {
      // Horizontal: left wall edge to pick circle
      const pickDimY = pickCenterY - PICK_RADIUS - 14;
      drawCableDimensionLine(ctx, pickCenterX - PICK_RADIUS, pickDimY, adjWallLeftX, pickDimY,
        cablePick + "'", fgColor, bgColor);
    } else {
      // Horizontal: right wall edge to pick circle
      const pickDimY = pickCenterY - PICK_RADIUS - 14;
      drawCableDimensionLine(ctx, wallRightX, pickDimY, pickCenterX + PICK_RADIUS, pickDimY,
        cablePick + "'", fgColor, bgColor);
    }
  }

  // Distro to drop — below floor
  drawCableDimensionLine(ctx, distroX, floorY + 18, dropX, floorY + 18,
    distroToWall + "'", fgColor, bgColor);

  // Processor to drop — below floor (further down to avoid overlap)
  drawCableDimensionLine(ctx, procX, floorY + 33, dropX, floorY + 33,
    processorToWall + "'", fgColor, bgColor);

  // === Legend ===
  const legendY = canvasH - 14;
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = POWER_COLOR;
  ctx.fillRect(MARGIN.left, legendY - 5, 10, 10);
  ctx.fillStyle = fgColor;
  ctx.fillText('Power', MARGIN.left + 14, legendY);

  ctx.fillStyle = DATA_COLOR;
  ctx.fillRect(MARGIN.left + 58, legendY - 5, 10, 10);
  ctx.fillStyle = fgColor;
  ctx.fillText('Data (' + dataLineCount + ')', MARGIN.left + 72, legendY);

  let legendOffset = 120;
  if (dataRedundancy) {
    ctx.fillStyle = BACKUP_COLOR;
    ctx.fillRect(MARGIN.left + legendOffset, legendY - 5, 10, 10);
    ctx.fillStyle = fgColor;
    ctx.fillText('Backup (' + dataLineCount + ')', MARGIN.left + legendOffset + 14, legendY);
    legendOffset += 80;
  }
  if (cablePick > 0) {
    ctx.fillStyle = PICK_COLOR;
    ctx.fillRect(MARGIN.left + legendOffset, legendY - 5, 10, 10);
    ctx.fillStyle = fgColor;
    ctx.fillText('Pick', MARGIN.left + legendOffset + 14, legendY);
    legendOffset += 48;
  }

  if (distBoxOnWall) {
    const legendMainHoriz = screen.data.distBoxMainHorizPosition || screen.data.distBoxHorizPosition || 'center';
    const legendBackupHoriz = screen.data.distBoxBackupHorizPosition || screen.data.distBoxHorizPosition || 'center';
    const legendMainVert = screen.data.distBoxMainVertPosition || 'top';
    const legendBackupVert = screen.data.distBoxBackupVertPosition || 'top';
    const legendTwoBoxes = dataRedundancy && (legendMainHoriz !== legendBackupHoriz || legendMainVert !== legendBackupVert);

    ctx.fillStyle = DISTBOX_COLOR;
    ctx.fillRect(MARGIN.left + legendOffset, legendY - 5, 10, 10);
    ctx.fillStyle = fgColor;
    ctx.fillText(legendTwoBoxes ? 'Main Trunk' : 'Trunk', MARGIN.left + legendOffset + 14, legendY);
    legendOffset += legendTwoBoxes ? 75 : 55;

    if (legendTwoBoxes) {
      ctx.fillStyle = TRUNK_COLOR;
      ctx.fillRect(MARGIN.left + legendOffset, legendY - 5, 10, 10);
      ctx.fillStyle = fgColor;
      ctx.fillText('Backup Trunk', MARGIN.left + legendOffset + 14, legendY);
      legendOffset += 85;
    }

    ctx.strokeStyle = DISTBOX_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(MARGIN.left + legendOffset, legendY - 5, 10, 10);
    ctx.fillStyle = fgColor;
    ctx.fillText('Dist Box', MARGIN.left + legendOffset + 14, legendY);
    legendOffset += 60;
  }

  if (serverToProcessor > 0) {
    ctx.fillStyle = SERVER_COLOR;
    ctx.fillRect(MARGIN.left + legendOffset, legendY - 5, 10, 10);
    ctx.fillStyle = fgColor;
    ctx.fillText('Server', MARGIN.left + legendOffset + 14, legendY);
    legendOffset += 55;
  }

  ctx.restore();
}

// ---- Helpers ----

function drawCableDimensionLine(ctx, x1, y1, x2, y2, label, fgColor, bgColor) {
  const isVertical = Math.abs(x1 - x2) < 2;
  const tickLen = 5;

  ctx.save();
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 2]);

  // Main line
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);

  // End ticks (solid)
  ctx.beginPath();
  if (isVertical) {
    ctx.moveTo(x1 - tickLen, y1); ctx.lineTo(x1 + tickLen, y1);
    ctx.moveTo(x2 - tickLen, y2); ctx.lineTo(x2 + tickLen, y2);
  } else {
    ctx.moveTo(x1, y1 - tickLen); ctx.lineTo(x1, y1 + tickLen);
    ctx.moveTo(x2, y2 - tickLen); ctx.lineTo(x2, y2 + tickLen);
  }
  ctx.stroke();

  // Label with background
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const fontSize = 10;
  ctx.font = fontSize + 'px Arial';
  const textW = ctx.measureText(label).width;
  const pad = 3;

  ctx.fillStyle = bgColor;
  ctx.fillRect(midX - textW / 2 - pad, midY - fontSize / 2 - pad, textW + pad * 2, fontSize + pad * 2);
  ctx.fillStyle = fgColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, midX, midY);

  ctx.restore();
}

function drawCableEquipmentBox(ctx, x, y, w, h, label, color) {
  ctx.save();

  // Filled box
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  // Label
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);

  ctx.restore();
}
