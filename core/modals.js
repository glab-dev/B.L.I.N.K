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

function showConfirm(message, title) {
  return new Promise(resolve => {
    _customAlertResolve = resolve;
    document.getElementById('customAlertTitle').textContent = title || 'Confirm';
    document.getElementById('customAlertMessage').textContent = message;
    document.getElementById('customAlertCancelBtn').style.display = '';
    document.getElementById('customAlertOkBtn').textContent = 'OK';
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
