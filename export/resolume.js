// ==================== RESOLUME XML EXPORT ====================
// Exports screen layout as Resolume Arena 7 compatible XML file.

// Returns the runs of consecutive live (non-deleted) columns in one panel row,
// as [startCol, endCol] pairs, left to right.
function getLivePanelRuns(deletedPanels, row, panelsWide) {
  const runs = [];
  let start = -1;
  for(let col = 0; col < panelsWide; col++) {
    const isLive = !deletedPanels.has(col + ',' + row);
    if(isLive && start === -1) start = col;
    if(start !== -1 && (!isLive || col === panelsWide - 1)) {
      runs.push([start, isLive ? col : col - 1]);
      start = -1;
    }
  }
  return runs;
}

// Decomposes a screen's live panel grid into the rectangles Resolume needs.
// Consecutive rows sharing the same live-column runs merge into one band, so a
// screen with a dead block in the middle yields the actual LED shape (a solid
// strip plus two legs) instead of one oversized bounding box.
// Returns [{x, y, w, h}] in canvas pixels, ordered top-to-bottom then left-to-right.
function buildScreenSliceRects(screenData, panel) {
  const panelsWide = parseInt(screenData.panelsWide) || 0;
  const panelsHigh = parseInt(screenData.panelsHigh) || 0;
  if(panelsWide <= 0 || panelsHigh <= 0) return [];

  const resX = panel.res_x || 1;
  const resY = panel.res_y || 1;
  const originX = screenData.canvasX || 0;
  const originY = screenData.canvasY || 0;

  // deletedPanels is a Set in live state but an Array in a freshly parsed .blinkled
  const deletedPanels = (screenData.deletedPanels instanceof Set)
    ? screenData.deletedPanels
    : new Set(screenData.deletedPanels || []);

  // Signature per row so identical neighbouring rows can merge into one band
  const rowRuns = [];
  const rowKeys = [];
  for(let row = 0; row < panelsHigh; row++) {
    const runs = getLivePanelRuns(deletedPanels, row, panelsWide);
    rowRuns.push(runs);
    rowKeys.push(JSON.stringify(runs));
  }

  const rects = [];
  let row = 0;
  while(row < panelsHigh) {
    let bandEnd = row;
    while(bandEnd + 1 < panelsHigh && rowKeys[bandEnd + 1] === rowKeys[row]) bandEnd++;
    const bandHeight = (bandEnd - row + 1) * resY;
    rowRuns[row].forEach(function(run) {
      rects.push({
        x: originX + run[0] * resX,
        y: originY + row * resY,
        w: (run[1] - run[0] + 1) * resX,
        h: bandHeight
      });
    });
    row = bandEnd + 1;
  }

  // CB5 half row sits below the last full row, spanning that row's live runs
  if(screenData.addCB5HalfRow) {
    getLivePanelRuns(deletedPanels, panelsHigh - 1, panelsWide).forEach(function(run) {
      rects.push({
        x: originX + run[0] * resX,
        y: originY + panelsHigh * resY,
        w: (run[1] - run[0] + 1) * resX,
        h: Math.round(resY / 2)
      });
    });
  }

  return rects;
}

// Builds the full slice list across every visible screen.
// Screens producing more than one rectangle get numbered names (e.g. "IMAG SR 1").
function buildResolumeSlices() {
  const allPanels = getAllPanels();
  const slices = [];

  Object.keys(screens).forEach(function(key) {
    const screen = screens[key];
    if(screen.visible === false) return;

    const screenData = screen.data || screen;
    const panel = allPanels[screenData.panelType || 'CB5_MKII'];
    if(!panel) return;

    const rects = buildScreenSliceRects(screenData, panel);
    const baseName = screen.name || 'Screen';
    rects.forEach(function(rect, i) {
      slices.push({
        name: rects.length > 1 ? (baseName + ' ' + (i + 1)) : baseName,
        x: rect.x,
        y: rect.y,
        w: rect.w,
        h: rect.h
      });
    });
  });

  return slices;
}

// Builds the complete Resolume Arena 7 XML document, or null if there is
// nothing to export. Shared by exportResolumeXML() and getResolumeXmlBlob()
// so both paths always emit identical slice geometry.
function buildResolumeXml(projectName) {
  const slices = buildResolumeSlices();
  if(slices.length === 0) return null;

  function generateUniqueId() {
    return Math.floor(Math.random() * 9000000000000000) + 1000000000000000;
  }

  let slicesXml = '';
  slices.forEach(function(slice) {
    const x1 = slice.x, y1 = slice.y;
    const x2 = slice.x + slice.w, y2 = slice.y + slice.h;

    // Bezier warper control grid (4x4) across the slice
    let verticesXml = '';
    for(let row = 0; row < 4; row++) {
      for(let col = 0; col < 4; col++) {
        const x = x1 + Math.round((col / 3) * slice.w);
        const y = y1 + Math.round((row / 3) * slice.h);
        verticesXml += `
                  <v x="${x}" y="${y}"/>`;
      }
    }

    // Input and output rectangles both sit at the slice's canvas position
    const rectVertices = `
              <v x="${x1}" y="${y1}"/>
              <v x="${x2}" y="${y1}"/>
              <v x="${x2}" y="${y2}"/>
              <v x="${x1}" y="${y2}"/>`;

    slicesXml += `
          <Slice>
            <Params name="Common">
              <Param name="Name" default="Layer" value="${escapeXml(slice.name)}"/>
            </Params>
            <InputRect orientation="0">${rectVertices}
            </InputRect>
            <OutputRect orientation="0">${rectVertices}
            </OutputRect>
            <Warper>
              <Params name="Warper">
                <ParamChoice name="Point Mode" default="PM_LINEAR" value="PM_LINEAR" storeChoices="0"/>
                <Param name="Flip" default="0" value="0"/>
              </Params>
              <BezierWarper controlWidth="4" controlHeight="4">
                <vertices>${verticesXml}
                </vertices>
              </BezierWarper>
            </Warper>
          </Slice>`;
  });

  // Output resolution: the canvas, grown to cover every slice
  const canvas = document.getElementById('canvasView');
  let totalWidth = canvas ? canvas.width : 1920;
  let totalHeight = canvas ? canvas.height : 1080;
  slices.forEach(function(slice) {
    totalWidth = Math.max(totalWidth, slice.x + slice.w);
    totalHeight = Math.max(totalHeight, slice.y + slice.h);
  });

  const screenUniqueId = generateUniqueId();

  return `<?xml version="1.0" encoding="UTF-8"?>

<XmlState name="${escapeXml(projectName)}">
  <versionInfo name="Resolume Arena" majorVersion="7" minorVersion="23" microVersion="2"
               revision="51094"/>
  <ScreenSetup name="ScreenSetup">
    <Params name="ScreenSetupParams"/>
    <screens>
      <Screen name="Screen 1" uniqueId="${screenUniqueId}">
        <layers>${slicesXml}
        </layers>
        <OutputDevice>
          <OutputDeviceVirtual name="Screen 1" deviceId="VirtualScreen 1" idHash="${generateUniqueId()}"
                               width="${totalWidth}" height="${totalHeight}">
            <Params name="Params">
              <ParamRange name="Width" default="${totalWidth}" value="${totalWidth}"/>
              <ValueRange name="defaultRange" min="1" max="16384"/>
              <ParamRange name="Height" default="${totalHeight}" value="${totalHeight}"/>
            </Params>
          </OutputDeviceVirtual>
        </OutputDevice>
      </Screen>
    </screens>
  </ScreenSetup>
</XmlState>`;
}

// Export Resolume Arena XML file
function exportResolumeXML(filename) {
  try {
    if(Object.keys(screens).length === 0) {
      showAlert('No screens to export. Please add at least one screen.');
      return;
    }

    const xml = buildResolumeXml(filename);
    if(!xml) {
      showAlert('No visible screens with panels to export.');
      return;
    }

    // Create blob and download/share
    const blob = new Blob([xml], { type: 'application/xml' });
    const xmlFilename = String(filename).replace(/[<>:"/\\|?*]/g, '_') + '.xml';

    saveBlobToDevice(blob, xmlFilename, {
      mimeType: 'application/xml',
      description: 'Resolume XML',
      accept: { 'application/xml': ['.xml'] }
    });

  } catch(err) {
    showAlert('Error exporting Resolume XML: ' + err.message);
    console.error('Resolume export error:', err);
  }
}

// Returns the Resolume XML as a Blob (for Export All), or null if no screens.
function getResolumeXmlBlob() {
  try {
    if(Object.keys(screens).length === 0) return null;

    const nameInput = document.getElementById('configName');
    const projectName = (nameInput && nameInput.value.trim()) || 'BLINK Export';

    const xml = buildResolumeXml(projectName);
    if(!xml) return null;

    return new Blob([xml], { type: 'application/xml' });
  } catch(e) {
    return null;
  }
}
