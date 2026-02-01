// ==================== DOM SETUP & EVENT LISTENERS ====================
// Wires up all input event listeners, panel type change handlers,
// cabling inputs, PDF/export buttons, and initialization calls.
// Depends on globals and functions from all other modules.

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOMContentLoaded fired - v55.7 Multi-Screen');

  // Global click handler to dismiss context menus
  document.addEventListener('click', function(e) {
    if(contextMenuVisible && !e.target.closest('#bumperContextMenu')) {
      hideContextMenu();
    }
  });

  try {
    const btnPDF = document.getElementById('btnExportPDF');
    const btnExp = document.getElementById('btnExportCanvas');

    // Auto-calculate on any input change
    const autoCalculateInputs = [
      'addCB5HalfRow',
      'panelsWide', 'panelsHigh', 'wallWidth', 'wallHeight',
      'processor', 'frameRate', 'bitDepth', 'maxPanelsPerData', 'dataStartDir',
      'voltage', 'breaker', 'phase', 'powerType', 'maxPanelsPerCircuit',
      'installationType', 'use4WayBumpers', 'bumperDistribution',
      'plate2wayWeight', 'plate4wayWeight'
    ];

    // Add change listeners to all inputs
    autoCalculateInputs.forEach(id => {
      const element = document.getElementById(id);
      if(element) {
        element.addEventListener('change', () => {
          calculate();
        });
        // Also listen for input events on number fields for real-time updates
        if(element.type === 'number') {
          element.addEventListener('input', () => {
            calculate();
          });
        }
      }
    });

    // Listen for connection method radio changes
    const connectionRadios = document.querySelectorAll('input[name="connectionMethod"]');
    connectionRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        calculate();
      });
    });

    // Listen for dimension mode changes
    const dimModeRadios = document.querySelectorAll('input[name="dimensionMode"]');
    dimModeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        calculate();
      });
    });

    // Listen for power-related field changes to update circuit limit placeholder
    const powerRelatedFields = ['voltage', 'breaker', 'powerType'];
    powerRelatedFields.forEach(id => {
      const element = document.getElementById(id);
      if(element) {
        element.addEventListener('change', () => {
          updateSuggestedCircuitLimit();
        });
        // Also listen for input events on number fields for real-time updates
        if(element.type === 'number') {
          element.addEventListener('input', () => {
            updateSuggestedCircuitLimit();
          });
        }
      }
    });

    // Listen for data-related field changes to update data limit placeholder
    const dataRelatedFields = ['frameRate', 'bitDepth', 'processor'];
    dataRelatedFields.forEach(id => {
      const element = document.getElementById(id);
      if(element) {
        element.addEventListener('change', () => {
          updateSuggestedDataLimit();
        });
        // Also listen for input events on number fields for real-time updates
        if(element.type === 'number') {
          element.addEventListener('input', () => {
            updateSuggestedDataLimit();
          });
        }
      }
    });

    if(btnPDF) btnPDF.addEventListener('click', function(e) {
      e.preventDefault();
      // Show modal for complex and combined views, simple view exports specs only
      if(currentMobileView === 'complex' || currentMobileView === 'combined' || currentMobileView === 'gear') {
        openPdfExportModal();
      } else {
        // Simple view - export specs only directly
        pdfExportOptions.specs = true;
        pdfExportOptions.gearList = false;
        pdfExportOptions.standard = false;
        pdfExportOptions.power = false;
        pdfExportOptions.data = false;
        pdfExportOptions.structure = false;
        exportPDF();
      }
    });

    if(btnExp) btnExp.addEventListener('click', function(e) {
      e.preventDefault();
      exportCanvas();
    });

    setupLive();

    const dimModePanels = document.getElementById('dimModePanels');
    const dimModeSize = document.getElementById('dimModeSize');

    if(dimModePanels) {
      dimModePanels.addEventListener('change', function() {
        if(this.checked) {
          document.getElementById('panelCountInputs').style.display = 'block';
          document.getElementById('wallSizeInputs').style.display = 'none';
        }
      });
    }

    if(dimModeSize) {
      dimModeSize.addEventListener('change', function() {
        if(this.checked) {
          document.getElementById('panelCountInputs').style.display = 'none';
          document.getElementById('wallSizeInputs').style.display = 'block';
        }
      });
    }

    const canvasSizeSelect = document.getElementById('canvasSize');
    if(canvasSizeSelect) {
      canvasSizeSelect.addEventListener('change', function() {
        const customInputs = document.getElementById('customCanvasInputs');
        if(this.value === 'custom') {
          customInputs.style.display = 'block';
        } else {
          customInputs.style.display = 'none';
        }
        // Update export filename placeholder
        updateExportFilenamePlaceholder();
      });
    }

    // Function to update export filename placeholder
    function updateExportFilenamePlaceholder() {
      const filenameInput = document.getElementById('canvasExportFilename');
      const canvasSizeSelect = document.getElementById('canvasSize');
      if(filenameInput && canvasSizeSelect) {
        let sizeLabel = canvasSizeSelect.options[canvasSizeSelect.selectedIndex].text;
        if(canvasSizeSelect.value === 'custom') {
          const customW = document.getElementById('customCanvasWidth').value || '0';
          const customH = document.getElementById('customCanvasHeight').value || '0';
          sizeLabel = `${customW}x${customH}`;
        }
        filenameInput.placeholder = `LED_Wall_Canvas_${sizeLabel.replace(/\s+/g, '_').replace(/[()]/g, '')}`;
      }
    }

    // Also update placeholder when custom dimensions change
    const customWidthInput = document.getElementById('customCanvasWidth');
    const customHeightInput = document.getElementById('customCanvasHeight');
    if(customWidthInput) {
      customWidthInput.addEventListener('input', updateExportFilenamePlaceholder);
    }
    if(customHeightInput) {
      customHeightInput.addEventListener('input', updateExportFilenamePlaceholder);
    }

    // Initial placeholder update
    updateExportFilenamePlaceholder();

    // Show/hide CB5 half panel toggle based on panel type
    const panelTypeSelect = document.getElementById('panelType');
    const cb5HalfPanelToggle = document.getElementById('cb5HalfPanelToggle');

    function updateCB5HalfPanelVisibility() {
      if(panelTypeSelect && cb5HalfPanelToggle) {
        if(panelTypeSelect.value === 'CB5_MKII') {
          cb5HalfPanelToggle.style.display = 'block';
        } else {
          cb5HalfPanelToggle.style.display = 'none';
          // Reset checkbox when hidden
          const checkbox = document.getElementById('addCB5HalfRow');
          if(checkbox) checkbox.checked = false;
        }
      }
    }

    if(panelTypeSelect) {
      // IMPORTANT: Check for __ADD_CUSTOM__ FIRST before other handlers
      panelTypeSelect.addEventListener('change', function() {
        if(this.value === '__ADD_CUSTOM__') {
          openCustomPanelModal();
          // Reset to previous value or first option
          const options = this.querySelectorAll('option:not([value="__ADD_CUSTOM__"])');
          if(options.length > 0) {
            this.value = options[0].value;
          }
          return; // Stop propagation
        }
      });

      // Reset everything when panel type changes (but not during screen loading)
      panelTypeSelect.addEventListener('change', function() {
        console.log('Panel type change triggered, isLoadingScreenData:', isLoadingScreenData);
        if (!isLoadingScreenData && this.value !== '__ADD_CUSTOM__') {
          console.log('Calling resetCalculator...');
          resetCalculator();
          console.log('resetCalculator completed');
        }
      });

      panelTypeSelect.addEventListener('change', updateCB5HalfPanelVisibility);
      updateCB5HalfPanelVisibility(); // Initial check

      // Update max panels per circuit/data placeholders when panel type changes
      panelTypeSelect.addEventListener('change', function() {
        if(this.value === '__ADD_CUSTOM__') return;
        console.log('Updating circuit/data limits...');
        // Update circuit limit placeholder (calculated from power settings)
        updateSuggestedCircuitLimit();
        // Update data limit placeholder (uses panel-specific limit)
        updateSuggestedDataLimit();
        console.log('Circuit/data limits updated');
      });

      // Also update 4-way bumper visibility
      panelTypeSelect.addEventListener('change', function() {
        if(this.value === '__ADD_CUSTOM__') return;
        const fourWayOption = document.getElementById('fourWayBumperOption');
        const isCB5 = this.value === 'CB5_MKII' || this.value === 'CB5_MKII_HALF';
        if(fourWayOption) {
          fourWayOption.style.display = isCB5 && useBumpers ? 'block' : 'none';
          if(!isCB5) {
            // Reset 4-way bumpers state when switching away from CB5
            use4WayBumpersEnabled = false;
            const btn = document.getElementById('use4WayBumpersBtn');
            if(btn) btn.classList.remove('active');
          }
        }
      });

      // Update connecting plates section visibility
      panelTypeSelect.addEventListener('change', function() {
        if(this.value === '__ADD_CUSTOM__') return;
        updateConnectingPlatesVisibility(this.value);
      });

      // Update bumpers on/off based on panel type
      panelTypeSelect.addEventListener('change', function() {
        if(this.value === '__ADD_CUSTOM__') return;
        updateBumpersForPanelType(this.value);
      });

      // Auto-switch to Floor structure for floor panels (like BM4)
      panelTypeSelect.addEventListener('change', function() {
        if(this.value === '__ADD_CUSTOM__') return;
        const allPanels = getAllPanels();
        const p = allPanels[this.value];
        if(p && p.is_floor_panel) {
          const structureSelect = document.getElementById('structureType');
          if(structureSelect) {
            structureSelect.value = 'floor';
            // Trigger change event to update UI
            structureSelect.dispatchEvent(new Event('change'));
          }
        }
      });

      // Initial update for connecting plates
      updateConnectingPlatesVisibility(panelTypeSelect.value);

      // Initial update for bumpers based on panel type
      updateBumpersForPanelType(panelTypeSelect.value);
    }

    // Connection method radio buttons listener (reusing existing connectionRadios)
    // Already declared above, so we can just add another listener to the same elements
    document.querySelectorAll('input[name="connectionMethod"]').forEach(radio => {
      radio.addEventListener('change', function() {
        // Connection method changed - just recalculate
        calculate();
      });
    });

    // Bumper distribution mode toggle
    const bumperDistSelect = document.getElementById('bumperDistribution');
    if(bumperDistSelect) {
      bumperDistSelect.addEventListener('change', function() {
        const autoControls = document.getElementById('autoBumperControls');
        const manualControls = document.getElementById('manualBumperControls');

        if(this.value === 'auto') {
          if(autoControls) autoControls.style.display = 'block';
          if(manualControls) manualControls.style.display = 'none';
        } else {
          if(autoControls) autoControls.style.display = 'none';
          if(manualControls) manualControls.style.display = 'block';
        }
      });
    }

    // Structure type change - automatically set bumpers based on hanging/ground
    const structureTypeSelect = document.getElementById('structureType');
    if(structureTypeSelect) {
      structureTypeSelect.addEventListener('change', function() {
        updateBumpersBasedOnStructureType();
        // Recalculate to update weight breakdown in specs (panels vs structure)
        calculate();
      });
      // Initialize on load
      updateBumpersBasedOnStructureType();
    }

    // Listen to panel dimension changes to update weight display, reinitialize bumpers, and apply aspect ratio
    const panelsWideInput = document.getElementById('panelsWide');
    const panelsHighInput = document.getElementById('panelsHigh');
    const wallWidthInput = document.getElementById('wallWidth');
    const wallHeightInput = document.getElementById('wallHeight');

    if(panelsWideInput) {
      panelsWideInput.addEventListener('input', function() {
        applyAspectRatioFromWidth(); // Apply aspect ratio lock
        initializeBumpers(); // Reinitialize when width changes
        updateWeightDisplay();
      });
    }
    if(panelsHighInput) {
      panelsHighInput.addEventListener('input', function() {
        // No aspect ratio from height - only width triggers auto-calculation
        initializeBumpers(); // Reinitialize when height changes
        updateWeightDisplay();
      });
    }
    if(wallWidthInput) {
      wallWidthInput.addEventListener('input', function() {
        applyAspectRatioFromWidth(); // Apply aspect ratio lock
      });
    }
    if(wallHeightInput) {
      wallHeightInput.addEventListener('input', function() {
        // No aspect ratio from height - only width triggers auto-calculation
      });
    }

    // Listen to custom aspect ratio input changes
    const customARWidthInput = document.getElementById('customARWidth');
    const customARHeightInput = document.getElementById('customARHeight');
    if(customARWidthInput) {
      customARWidthInput.addEventListener('input', function() {
        if(currentAspectRatio === 'custom') {
          applyAspectRatioFromWidth(); // Re-apply with new ratio
          calculate();
        }
      });
    }
    if(customARHeightInput) {
      customARHeightInput.addEventListener('input', function() {
        if(currentAspectRatio === 'custom') {
          applyAspectRatioFromWidth(); // Re-apply with new ratio
          calculate();
        }
      });
    }

    // Cabling input listeners - save current screen data then update gear list
    const cablingInputIds = ['wallToFloor', 'distroToWall', 'processorToWall', 'serverToProcessor', 'cablePick'];
    cablingInputIds.forEach(id => {
      const el = document.getElementById(id);
      if(el) {
        const updateCabling = function() {
          saveCurrentScreenData();
          generateGearList();
        };
        el.addEventListener('input', updateCabling);
        el.addEventListener('keyup', updateCabling);
        el.addEventListener('change', updateCabling);
      }
    });
    syncFromPanels();
    updateSuggestedDataLimit();
    showSpecWarningIfNeeded();
    updateUndoRedoButtons(); // Initialize button states

    // Initialize custom panels and processors dropdowns
    updatePanelDropdowns();
    updateProcessorDropdowns();

    // Add event listener for processor dropdown
    const processorSelect = document.getElementById('processor');
    if(processorSelect) {
      processorSelect.addEventListener('change', function() {
        // Show/hide MX40 mode toggle for MX40 Pro
        updateMX40ModeToggleVisibility();
      });
      // Initial check on page load
      updateMX40ModeToggleVisibility();
    }
  } catch(err) {
    console.error('DOMContentLoaded initialization error:', err);
    showAlert('Error initializing calculator: ' + err.message);
  }
});
