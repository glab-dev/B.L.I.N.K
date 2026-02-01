// ==================== RESOLUME XML EXPORT ====================
// Exports screen layout as Resolume Arena 7 compatible XML file.

// Export Resolume Arena XML file
function exportResolumeXML(filename) {
  try {
    const screenKeys = Object.keys(screens);
    if(screenKeys.length === 0) {
      showAlert('No screens to export. Please add at least one screen.');
      return;
    }

    // Get canvas dimensions
    const canvas = document.getElementById('canvasView');
    const canvasWidth = canvas ? canvas.width : 1920;
    const canvasHeight = canvas ? canvas.height : 1080;

    // Get all panels (built-in + custom)
    const allPanels = getAllPanels();

    // Generate unique ID for Resolume
    function generateUniqueId() {
      return Math.floor(Math.random() * 9000000000000000) + 1000000000000000;
    }

    // Build slices XML for each screen
    let slicesXml = '';

    screenKeys.forEach(key => {
      const screen = screens[key];
      const screenData = screen.data || screen;
      const panelType = screenData.panelType || 'CB5_MKII';
      const panel = allPanels[panelType];
      if(!panel) return;

      // Skip non-visible screens
      if(screen.visible === false) return;

      // Calculate screen dimensions in pixels
      const panelResX = panel.res_x || 1;
      const panelResY = panel.res_y || 1;
      const screenResX = (screenData.panelsWide || 0) * panelResX;
      const screenResY = (screenData.panelsHigh || 0) * panelResY;

      if(screenResX === 0 || screenResY === 0) return;

      // Get screen position (default to 0,0 if not set)
      const screenX = screenData.canvasX || 0;
      const screenY = screenData.canvasY || 0;

      // Create bezier warper vertices (4x4 grid) - uses actual pixel positions
      let verticesXml = '';
      for(let row = 0; row < 4; row++) {
        for(let col = 0; col < 4; col++) {
          const x = screenX + Math.round((col / 3) * screenResX);
          const y = screenY + Math.round((row / 3) * screenResY);
          verticesXml += `
                  <v x="${x}" y="${y}"/>`;
        }
      }

      // InputRect vertices (source rectangle - at canvas position, same as output)
      const inputVertices = `
              <v x="${screenX}" y="${screenY}"/>
              <v x="${screenX + screenResX}" y="${screenY}"/>
              <v x="${screenX + screenResX}" y="${screenY + screenResY}"/>
              <v x="${screenX}" y="${screenY + screenResY}"/>`;

      // OutputRect vertices (destination rectangle - at canvas position)
      const outputVertices = `
              <v x="${screenX}" y="${screenY}"/>
              <v x="${screenX + screenResX}" y="${screenY}"/>
              <v x="${screenX + screenResX}" y="${screenY + screenResY}"/>
              <v x="${screenX}" y="${screenY + screenResY}"/>`;

      slicesXml += `
          <Slice>
            <Params name="Common">
              <Param name="Name" default="Layer" value="${escapeXml(screen.name || 'Screen')}"/>
            </Params>
            <InputRect orientation="0">${inputVertices}
            </InputRect>
            <OutputRect orientation="0">${outputVertices}
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

    // Calculate total canvas resolution (max extent of all screens)
    let totalWidth = canvasWidth;
    let totalHeight = canvasHeight;

    screenKeys.forEach(key => {
      const screen = screens[key];
      if(screen.visible === false) return;
      const screenData = screen.data || screen;
      const panelType = screenData.panelType || 'CB5_MKII';
      const panel = allPanels[panelType];
      if(!panel) return;

      const screenResX = (screenData.panelsWide || 0) * (panel.res_x || 1);
      const screenResY = (screenData.panelsHigh || 0) * (panel.res_y || 1);
      const screenX = screenData.canvasX || 0;
      const screenY = screenData.canvasY || 0;

      totalWidth = Math.max(totalWidth, screenX + screenResX);
      totalHeight = Math.max(totalHeight, screenY + screenResY);
    });

    // Generate unique ID for screen
    const screenUniqueId = generateUniqueId();

    // Build complete XML matching Resolume Arena 7 format
    const xml = `<?xml version="1.0" encoding="UTF-8"?>

<XmlState name="${escapeXml(filename)}">
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

    // Create blob and download/share
    const blob = new Blob([xml], { type: 'application/xml' });
    const xmlFilename = filename + '.xml';

    // Mobile: use share API for native "Save to Files" option
    if(navigator.canShare) {
      const file = new File([blob], xmlFilename, { type: 'application/xml' });
      if(navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file] }).catch(function() {});
        return;
      }
    }

    // Fallback: direct download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = xmlFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(function() {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

  } catch(err) {
    showAlert('Error exporting Resolume XML: ' + err.message);
    console.error('Resolume export error:', err);
  }
}

