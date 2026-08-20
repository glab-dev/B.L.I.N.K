// ==================== CUSTOM MODAL FUNCTIONS ====================
// Custom alert/confirm dialogs used throughout the app.
// Must load before specs/custom-panels.js which calls showAlert/showConfirm.

let _customAlertResolve = null;
let _customAlertIsPrompt = false;
let _customAlertIsDualField = false;

function showAlert(message, title) {
  return new Promise(resolve => {
    _customAlertResolve = resolve;
    document.getElementById('customAlertTitle').textContent = title || 'Notice';
    document.getElementById('customAlertMessage').textContent = message;
    document.getElementById('customAlertCancelBtn').style.display = 'none';
    document.getElementById('customAlertOkBtn').textContent = 'OK';
    document.getElementById('customAlertModal').classList.add('active');
  });
}

function showConfirm(message, title, okLabel) {
  return new Promise(resolve => {
    _customAlertResolve = resolve;
    document.getElementById('customAlertTitle').textContent = title || 'Confirm';
    document.getElementById('customAlertMessage').textContent = message;
    document.getElementById('customAlertCancelBtn').style.display = '';
    document.getElementById('customAlertOkBtn').textContent = okLabel || 'OK';
    document.getElementById('customAlertModal').classList.add('active');
  });
}

function showPrompt(message, defaultValue, title) {
  return new Promise(resolve => {
    _customAlertResolve = resolve;
    _customAlertIsPrompt = true;
    document.getElementById('customAlertTitle').textContent = title || 'Input';
    document.getElementById('customAlertMessage').textContent = message;
    const input = document.getElementById('customAlertInput');
    input.style.display = '';
    input.value = defaultValue || '';
    document.getElementById('customAlertCancelBtn').style.display = '';
    document.getElementById('customAlertOkBtn').textContent = 'OK';
    document.getElementById('customAlertModal').classList.add('active');
    setTimeout(() => { input.focus(); input.select(); }, 50);
  });
}

function showSocaCircuitPrompt(panelCount) {
  return new Promise(resolve => {
    _customAlertResolve = resolve;
    _customAlertIsPrompt = true;
    _customAlertIsDualField = true;
    document.getElementById('customAlertTitle').textContent = 'Custom SOCA & Circuit';
    document.getElementById('customAlertMessage').textContent =
      `Enter SOCA # and/or Circuit # for ${panelCount} panel(s). Leave a field blank to clear that assignment.`;
    const input1 = document.getElementById('customAlertInput');
    const input2 = document.getElementById('customAlertInput2');
    input1.placeholder = 'SOCA # (1-99)';
    input2.placeholder = 'Circuit # (1-999)';
    input1.style.display = '';
    input2.style.display = '';
    input1.value = '';
    input2.value = '';
    document.getElementById('customAlertCancelBtn').style.display = '';
    document.getElementById('customAlertOkBtn').textContent = 'OK';
    document.getElementById('customAlertModal').classList.add('active');
    setTimeout(() => { input1.focus(); input1.select(); }, 50);
  });
}

function showSocaOnlyPrompt(panelCount) {
  return new Promise(resolve => {
    _customAlertResolve = resolve;
    _customAlertIsPrompt = true;
    _customAlertIsDualField = false;
    document.getElementById('customAlertTitle').textContent = 'Assign SOCA #';
    document.getElementById('customAlertMessage').textContent =
      `Enter SOCA # for ${panelCount} panel(s). Circuits will be assigned automatically within that SOCA.`;
    const input1 = document.getElementById('customAlertInput');
    const input2 = document.getElementById('customAlertInput2');
    input1.placeholder = 'SOCA # (1-99 or A-Z)';
    input1.style.display = '';
    input1.value = '';
    if (input2) input2.style.display = 'none';
    document.getElementById('customAlertCancelBtn').style.display = '';
    document.getElementById('customAlertOkBtn').textContent = 'OK';
    document.getElementById('customAlertModal').classList.add('active');
    setTimeout(() => { input1.focus(); input1.select(); }, 50);
  });
}

// ==================== ASSIGN DATA PORT ====================
// Three-field prompt: Processor #, Distribution Box # (only when the screen's
// processor uses one) and Port #, which is the data line number.
// Uses its own modal — #customAlertModal belongs to showSocaCircuitPrompt().
// Resolves { proc, box, port } with null for any field left blank, or null if
// cancelled.
let _dataPortResolve = null;

function showDataPortPrompt(panelCount, topology, current, availabilityText) {
  return new Promise(resolve => {
    _dataPortResolve = resolve;

    const msg = document.getElementById('dataPortAssignMessage');
    if(msg) {
      msg.textContent = `Assign ${panelCount} panel(s). Leave a field blank to let the app choose, `
        + `or clear Port # to remove the custom assignment.`;
    }

    const procInput = document.getElementById('dataPortProcInput');
    const boxInput = document.getElementById('dataPortBoxInput');
    const portInput = document.getElementById('dataPortPortInput');
    const boxGroup = document.getElementById('dataPortBoxGroup');
    const boxLabel = document.getElementById('dataPortBoxLabel');
    const hint = document.getElementById('dataPortAvailabilityHint');

    const cur = current || {};
    const boxStyle = (topology && topology.boxLabelStyle) || 'number';
    if(procInput) procInput.value = (cur.proc !== null && cur.proc !== undefined) ? cur.proc : '';
    // Show the box in the form the hardware uses (XD A-D), while still accepting
    // either a letter or a number back.
    if(boxInput) boxInput.value = (cur.box !== null && cur.box !== undefined)
      ? formatUnitLabel(cur.box, boxStyle) : '';
    if(portInput) portInput.value = (cur.port !== null && cur.port !== undefined) ? cur.port : '';
    if(procInput) procInput.placeholder = 'Auto (1-99 or A-Z)';
    if(boxInput) boxInput.placeholder = 'Auto (1-99 or A-Z)';

    // The box row only exists for processors that route through one.
    const usesBox = !!(topology && topology.usesDistBox);
    if(boxGroup) boxGroup.style.display = usesBox ? '' : 'none';
    if(boxLabel && usesBox) boxLabel.textContent = (topology.distBoxName || 'Box') + ' #';

    if(hint) {
      hint.textContent = availabilityText || '';
      hint.classList.remove('dp-warn');
    }

    document.getElementById('dataPortAssignModal').classList.add('active');
    setTimeout(() => { if(procInput) { procInput.focus(); procInput.select(); } }, 50);
  });
}

function closeDataPortAssign(result) {
  const modal = document.getElementById('dataPortAssignModal');
  const procInput = document.getElementById('dataPortProcInput');
  const boxInput = document.getElementById('dataPortBoxInput');
  const portInput = document.getElementById('dataPortPortInput');

  const readNum = el => {
    if(!el || el.value.trim() === '') return null;
    const n = parseInt(el.value, 10);
    return (isNaN(n) || n < 1) ? null : n;
  };
  const readRaw = el => (el ? el.value.trim() : '');

  // proc/box come back raw so the caller can tell "blank means auto" apart from
  // "unparseable" — parseSocaInput() returns null for both.
  const value = (result === false) ? null : {
    procRaw: readRaw(procInput),
    boxRaw: readRaw(boxInput),
    port: readNum(portInput),
    portCleared: !!portInput && portInput.value.trim() === ''
  };

  modal.classList.remove('active');
  if(_dataPortResolve) { _dataPortResolve(value); _dataPortResolve = null; }
  if(procInput) procInput.value = '';
  if(boxInput) boxInput.value = '';
  if(portInput) portInput.value = '';
}

function closeCustomAlert(result) {
  const input = document.getElementById('customAlertInput');
  const input2 = document.getElementById('customAlertInput2');
  const modal = document.getElementById('customAlertModal');
  modal.classList.remove('active');
  if (_customAlertResolve) {
    if (_customAlertIsDualField) {
      _customAlertResolve(result === false ? null : { soca: input.value, circuit: input2.value });
    } else if (_customAlertIsPrompt) {
      _customAlertResolve(result === false ? null : input.value);
    } else {
      _customAlertResolve(result !== false && result !== undefined ? true : false);
    }
    _customAlertResolve = null;
  }
  _customAlertIsPrompt = false;
  _customAlertIsDualField = false;
  input.style.display = 'none';
  input.value = '';
  input.placeholder = '';
  input2.style.display = 'none';
  input2.value = '';
  input2.placeholder = '';
}

// Show a sign-in prompt with a Sign In button
// Returns true if user clicked Sign In, false if cancelled
async function showSignInPrompt(message, title) {
  return new Promise(resolve => {
    _customAlertResolve = (result) => {
      if(result) {
        // User clicked Sign In - open the auth modal
        if(typeof openAuthModal === 'function') {
          openAuthModal('signin');
        }
      }
      resolve(result);
    };
    document.getElementById('customAlertTitle').textContent = title || 'Sign In Required';
    document.getElementById('customAlertMessage').textContent = message;
    document.getElementById('customAlertCancelBtn').style.display = '';
    document.getElementById('customAlertOkBtn').textContent = 'Sign In';
    document.getElementById('customAlertModal').classList.add('active');
  });
}
