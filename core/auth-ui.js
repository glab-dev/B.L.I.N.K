// ==================== AUTH UI ====================
// Authentication modal logic and form handlers.
// Dependencies: core/supabase.js, core/modals.js (for showAlert)

// ==================== STATE ====================
let currentAuthMode = 'signin'; // 'signin', 'signup', 'reset'
let authModalOpenedFromMenu = false;

// ==================== MODAL FUNCTIONS ====================

function openAuthModal(mode) {
  // If already logged in, show account modal instead
  if(isAuthenticated() && mode !== 'reset') {
    openAccountModal();
    return;
  }

  currentAuthMode = mode || 'signin';
  const modal = document.getElementById('authModal');
  if(!modal) return;

  // Reset form
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
  document.getElementById('authPasswordConfirm').value = '';
  document.getElementById('authError').textContent = '';
  document.getElementById('authError').style.display = 'none';

  // Update UI for mode
  updateAuthModalUI();

  // Show modal
  modal.classList.add('active');
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if(modal) {
    modal.classList.remove('active');
  }

  // Reopen menu if opened from there
  if(authModalOpenedFromMenu) {
    authModalOpenedFromMenu = false;
    if(typeof reopenMenuIfNeeded === 'function') {
      reopenMenuIfNeeded();
    }
  }
}

function switchAuthMode(mode) {
  currentAuthMode = mode;
  document.getElementById('authError').textContent = '';
  document.getElementById('authError').style.display = 'none';
  updateAuthModalUI();
}

function updateAuthModalUI() {
  const title = document.getElementById('authModalTitle');
  const submitBtn = document.getElementById('authSubmitBtn');
  const passwordField = document.getElementById('authPassword');
  const confirmField = document.getElementById('authPasswordConfirm');
  const confirmGroup = document.getElementById('authPasswordConfirmGroup');
  const forgotLink = document.getElementById('authForgotLink');
  const tabSignIn = document.getElementById('authTabSignIn');
  const tabSignUp = document.getElementById('authTabSignUp');
  const tabsContainer = document.getElementById('authTabs');

  // Update active tab
  tabSignIn.classList.toggle('active', currentAuthMode === 'signin');
  tabSignUp.classList.toggle('active', currentAuthMode === 'signup');

  switch(currentAuthMode) {
    case 'signin':
      title.textContent = 'Sign In';
      submitBtn.textContent = 'Sign In';
      passwordField.style.display = '';
      confirmGroup.style.display = 'none';
      forgotLink.style.display = '';
      tabsContainer.style.display = '';
      break;

    case 'signup':
      title.textContent = 'Create Account';
      submitBtn.textContent = 'Create Account';
      passwordField.style.display = '';
      confirmGroup.style.display = '';
      forgotLink.style.display = 'none';
      tabsContainer.style.display = '';
      break;

    case 'reset':
      title.textContent = 'Reset Password';
      submitBtn.textContent = 'Send Reset Link';
      passwordField.style.display = 'none';
      confirmGroup.style.display = 'none';
      forgotLink.style.display = 'none';
      tabsContainer.style.display = 'none';
      break;

    case 'newpassword':
      title.textContent = 'Set New Password';
      submitBtn.textContent = 'Update Password';
      passwordField.style.display = '';
      passwordField.placeholder = 'New password';
      confirmGroup.style.display = '';
      forgotLink.style.display = 'none';
      tabsContainer.style.display = 'none';
      // Hide email field for new password mode
      document.getElementById('authEmail').parentElement.style.display = 'none';
      break;
  }

  // Show email field for non-newpassword modes
  if(currentAuthMode !== 'newpassword') {
    document.getElementById('authEmail').parentElement.style.display = '';
  }
}

// ==================== FORM HANDLERS ====================

async function handleAuthSubmit() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const passwordConfirm = document.getElementById('authPasswordConfirm').value;
  const submitBtn = document.getElementById('authSubmitBtn');
  const errorEl = document.getElementById('authError');

  // Clear previous error
  errorEl.textContent = '';
  errorEl.style.display = 'none';

  // Validate email (not needed for newpassword mode)
  if(currentAuthMode !== 'newpassword') {
    if(!email) {
      showAuthError('Please enter your email address');
      return;
    }

    if(!isValidEmail(email)) {
      showAuthError('Please enter a valid email address');
      return;
    }
  }

  // Mode-specific validation
  if(currentAuthMode === 'signin' || currentAuthMode === 'signup' || currentAuthMode === 'newpassword') {
    if(!password) {
      showAuthError('Please enter a password');
      return;
    }

    if(currentAuthMode === 'signup' || currentAuthMode === 'newpassword') {
      if(password.length < 6) {
        showAuthError('Password must be at least 6 characters');
        return;
      }
      if(password !== passwordConfirm) {
        showAuthError('Passwords do not match');
        return;
      }
    }
  }

  // Disable button during request
  submitBtn.disabled = true;
  const loadingText = currentAuthMode === 'reset' ? 'Sending...' :
                      currentAuthMode === 'newpassword' ? 'Updating...' : 'Please wait...';
  submitBtn.textContent = loadingText;

  try {
    switch(currentAuthMode) {
      case 'signin':
        await supabaseSignIn(email, password);
        closeAuthModal();
        showAlert('Signed in successfully!');
        break;

      case 'signup':
        await supabaseSignUp(email, password);
        closeAuthModal();
        showAlert('Account created! You are now signed in.');
        break;

      case 'reset':
        await supabaseResetPassword(email);
        closeAuthModal();
        showAlert('Password reset link sent to ' + email);
        break;

      case 'newpassword':
        await supabaseUpdatePassword(password);
        closeAuthModal();
        showAlert('Password updated successfully!');
        break;
    }
  } catch(err) {
    console.error('Auth error:', err);
    showAuthError(getAuthErrorMessage(err));
  } finally {
    submitBtn.disabled = false;
    updateAuthModalUI(); // Reset button text
  }
}

function showAuthError(message) {
  const errorEl = document.getElementById('authError');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

function getAuthErrorMessage(err) {
  const message = err.message || String(err);

  // Map common Supabase errors to user-friendly messages
  if(message.includes('Invalid login credentials')) {
    return 'Invalid email or password';
  }
  if(message.includes('User already registered')) {
    return 'An account with this email already exists';
  }
  if(message.includes('Email not confirmed')) {
    return 'Please check your email to confirm your account';
  }
  if(message.includes('Password should be at least')) {
    return 'Password must be at least 6 characters';
  }
  if(message.includes('Unable to validate email')) {
    return 'Please enter a valid email address';
  }
  if(message.includes('Supabase not initialized')) {
    return 'Cloud features are not available. Please try again later.';
  }

  return message;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ==================== ACCOUNT MODAL ====================

function openAccountModal() {
  const modal = document.getElementById('authModal');
  const title = document.getElementById('authModalTitle');
  const body = document.querySelector('#authModal .modal-body');

  if(!modal || !isAuthenticated()) return;

  // Store original content
  if(!modal.dataset.originalContent) {
    modal.dataset.originalContent = body.innerHTML;
  }

  // Show account info
  title.textContent = 'Account';
  body.innerHTML = `
    <div class="auth-account-info">
      <div class="auth-account-email">
        <span class="material-symbols-outlined" style="font-size: 20px; margin-right: 8px; vertical-align: middle;">account_circle</span>
        ${escapeHtml(getUserEmail())}
      </div>
      <p style="color: #888; font-size: 12px; margin: 12px 0 0 0;">Signed in</p>
    </div>
    <div class="auth-account-actions">
      <button class="btn-secondary" onclick="handleSignOut()">Sign Out</button>
    </div>
  `;

  modal.classList.add('active');
}

async function handleSignOut() {
  try {
    await supabaseSignOut();
    closeAuthModal();
    restoreAuthModalContent();
    showAlert('Signed out successfully');
  } catch(err) {
    console.error('Sign out error:', err);
    showAlert('Error signing out: ' + err.message);
  }
}

function restoreAuthModalContent() {
  const modal = document.getElementById('authModal');
  const body = document.querySelector('#authModal .modal-body');

  if(modal && modal.dataset.originalContent) {
    body.innerHTML = modal.dataset.originalContent;
    delete modal.dataset.originalContent;
  }
}

// ==================== KEYBOARD HANDLING ====================

document.addEventListener('DOMContentLoaded', function() {
  // Handle Enter key in auth form
  document.addEventListener('keydown', function(e) {
    const authModal = document.getElementById('authModal');
    if(authModal && authModal.classList.contains('active')) {
      if(e.key === 'Enter') {
        e.preventDefault();
        handleAuthSubmit();
      }
      if(e.key === 'Escape') {
        closeAuthModal();
      }
    }
  });
});
