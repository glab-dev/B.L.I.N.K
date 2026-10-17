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

  // CB5 half rows sit above and/or below the full rows, in the same grid of panel keys
  // (rows above come first), and have their own deleted panels. Honours addCB5HalfRow for
  // any panel type — callers pass the flag they actually drew.
  const rowGeo = cb5RowGeometry(panelsHigh, getCB5HalfRows(screenData, 'CB5_MKII'), resY, Math.round(resY / 2));

  // Signature per row so identical neighbouring rows of the same height can merge into one band
  const rowRuns = [];
  const rowKeys = [];
  for(let row = 0; row < rowGeo.rows; row++) {
    const runs = getLivePanelRuns(deletedPanels, row, panelsWide);
    rowRuns.push(runs);
    rowKeys.push((rowGeo.isHalf(row) ? 'half:' : 'full:') + JSON.stringify(runs));
  }

  const rects = [];
  let row = 0;
  while(row < rowGeo.rows) {
    let bandEnd = row;
    while(bandEnd + 1 < rowGeo.rows && rowKeys[bandEnd + 1] === rowKeys[row]) bandEnd++;
    const bandHeight = rowGeo.y(bandEnd + 1) - rowGeo.y(row);
    rowRuns[row].forEach(function(run) {
      rects.push({
        x: originX + run[0] * resX,
        y: originY + rowGeo.y(row),
        w: (run[1] - run[0] + 1) * resX,
        h: bandHeight
      });
    });
    row = bandEnd + 1;
  }

  return rects;
}

// Builds one Resolume output screen per canvas that has anything on it, in canvas order.
// Each canvas is one output (one processor input), so its slices output at their own
// canvas position — a split screen's part on that canvas included. They take their
// input from a composition made of the canvases side by side: canvas 1 at x 0, canvas 2
// right after canvas 1's width, and so on. A split wall therefore reads straight across
// the composition while each output starts at 0,0, and a one-canvas project's input and
// output rectangles stay the same, as before.
// Screens producing more than one rectangle get numbered names (e.g. "IMAG SR 1").
// Returns [{ name, width, height, slices: [{ name, x, y, w, h, inX, inY }] }].
function buildResolumeScreens() {
  const allPanels = getAllPanels();
  const outputs = [];
  let compositionX = 0;

  getCanvasIdsInOrder().forEach(function(canvasId) {
    const size = canvasPixelSize(canvasId);
    const slices = [];
    canvasItemsOn(canvasId).forEach(function(item) {
      const screenData = item.data;
      const panel = allPanels[screenData.panelType || 'CB5_MKII'];
      if(!panel) return;
      const rects = buildScreenSliceRects(screenData, panel);
      const baseName = item.name || 'Screen';
      rects.forEach(function(rect, i) {
        slices.push({
          name: rects.length > 1 ? (baseName + ' ' + (i + 1)) : baseName,
          x: rect.x, y: rect.y, w: rect.w, h: rect.h,
          inX: compositionX + rect.x, inY: rect.y
        });
      });
    });

    if(slices.length) {
      // Output resolution: the canvas, grown to cover every slice
      let width = size.width, height = size.height;
      slices.forEach(function(slice) {
        width = Math.max(width, slice.x + slice.w);
        height = Math.max(height, slice.y + slice.h);
      });
      outputs.push({ name: (canvases[canvasId] && canvases[canvasId].name) || 'Screen', width: width, height: height, slices: slices });
    }
    compositionX += size.width;
  });

  return outputs;
}

// Builds the complete Resolume Arena 7 XML document, or null if there is
// nothing to export. Shared by exportResolumeXML() and getResolumeXmlBlob()
// so both paths always emit identical slice geometry.
function buildResolumeXml(projectName) {
  const outputs = buildResolumeScreens();
  if(outputs.length === 0) return null;

  function generateUniqueId() {
    return Math.floor(Math.random() * 9000000000000000) + 1000000000000000;
  }

  // A rectangle's four corners, clockwise from top-left
  function rectVertices(x1, y1, x2, y2) {
    return `
              <v x="${x1}" y="${y1}"/>
              <v x="${x2}" y="${y1}"/>
              <v x="${x2}" y="${y2}"/>
              <v x="${x1}" y="${y2}"/>`;
  }

  let screensXml = '';
  outputs.forEach(function(output, n) {
    let slicesXml = '';
    output.slices.forEach(function(slice) {
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

      slicesXml += `
          <Slice>
            <Params name="Common">
              <Param name="Name" default="Layer" value="${escapeXml(slice.name)}"/>
            </Params>
            <InputRect orientation="0">${rectVertices(slice.inX, slice.inY, slice.inX + slice.w, slice.inY + slice.h)}
            </InputRect>
            <OutputRect orientation="0">${rectVertices(x1, y1, x2, y2)}
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

    const name = escapeXml(output.name);
    screensXml += `
      <Screen name="${name}" uniqueId="${generateUniqueId()}">
        <layers>${slicesXml}
        </layers>
        <OutputDevice>
          <OutputDeviceVirtual name="${name}" deviceId="VirtualScreen ${n + 1}" idHash="${generateUniqueId()}"
                               width="${output.width}" height="${output.height}">
            <Params name="Params">
              <ParamRange name="Width" default="${output.width}" value="${output.width}"/>
              <ValueRange name="defaultRange" min="1" max="16384"/>
              <ParamRange name="Height" default="${output.height}" value="${output.height}"/>
            </Params>
          </OutputDeviceVirtual>
        </OutputDevice>
      </Screen>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>

<XmlState name="${escapeXml(projectName)}">
  <versionInfo name="Resolume Arena" majorVersion="7" minorVersion="23" microVersion="2"
               revision="51094"/>
  <ScreenSetup name="ScreenSetup">
    <Params name="ScreenSetupParams"/>
    <screens>${screensXml}
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
