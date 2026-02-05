// ==================== CUSTOM MODAL FUNCTIONS ====================
// Custom alert/confirm dialogs used throughout the app.
// Must load before specs/custom-panels.js which calls showAlert/showConfirm.

let _customAlertResolve = null;

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

function closeCustomAlert(result) {
  document.getElementById('customAlertModal').classList.remove('active');
  if (_customAlertResolve) {
    _customAlertResolve(result !== false && result !== undefined ? true : false);
    _customAlertResolve = null;
  }
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
