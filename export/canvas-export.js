// ==================== CANVAS EXPORT (PNG/JPEG) ====================
// Exports the canvas view as PNG or JPEG image.

function exportCanvas(){
  try {
    const canvas = document.getElementById('canvasView');
    if(canvas.width === 0 || document.getElementById('canvasContainer').style.display === 'none'){
      showAlert('Please generate a canvas view first by clicking "Calculate".');
      return;
    }
    
    const format = document.getElementById('canvasExportFormat').value;
    
    // Get the canvas size label
    const canvasSizeSelect = document.getElementById('canvasSize');
    const canvasSizeValue = canvasSizeSelect.value;
    let canvasSizeLabel;
    
    // For custom size, use the actual dimensions
    if(canvasSizeValue === 'custom') {
      canvasSizeLabel = `${canvas.width}x${canvas.height}`;
    } else {
      // Clean up the label (e.g., "4K UHD (3840x2160)" -> "4K_UHD_3840x2160")
      canvasSizeLabel = canvasSizeSelect.options[canvasSizeSelect.selectedIndex].text
        .replace(/\s+/g, '_')
        .replace(/[()]/g, '');
    }
    
    const filenameInput = document.getElementById('canvasExportFilename');
    let customName = filenameInput ? filenameInput.value.trim() : '';
    
    // Always include canvas size in filename
    let filename;
    if(customName) {
      // If custom name provided, append canvas size
      filename = `${customName}_${canvasSizeLabel}`;
    } else {
      // Default name with canvas size
      filename = `LED_Wall_Canvas_${canvasSizeLabel}`;
    }
    
    // Clean filename of invalid characters
    filename = filename.replace(/[<>:"/\\|?*]/g, '_');
    
    // Create a clean canvas without selection highlight or border for export
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');

    // Use cached image data without border for clean export
    if(cachedCanvasImageDataForExport) {
      exportCtx.putImageData(cachedCanvasImageDataForExport, 0, 0);
    } else if(cachedCanvasImageData) {
      // Fallback to regular cache if export cache not available
      exportCtx.putImageData(cachedCanvasImageData, 0, 0);
    } else {
      exportCtx.drawImage(canvas, 0, 0);
    }
    
    // Handle Resolume XML export
    if(format === 'resolume') {
      exportResolumeXML(filename);
      return;
    }

    // Export the clean canvas using blob for better mobile compatibility
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const extension = format === 'jpeg' ? '.jpg' : '.png';
    const quality = format === 'jpeg' ? 0.95 : undefined;

    exportCanvas.toBlob(function(blob) {
      if(!blob) {
        showAlert('Failed to create image. Please try again.');
        return;
      }

      const fullFilename = filename + extension;

      // Mobile: use share API for native "Save to Files" option
      if(navigator.canShare) {
        const file = new File([blob], fullFilename, { type: mimeType });
        if(navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file] }).catch(function() {});
          return;
        }
      }

      // Fallback: direct download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fullFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(function() {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    }, mimeType, quality);
  } catch(err) {
    showAlert('Error exporting canvas: ' + err.message);
    console.error('Export error:', err);
  }
}

