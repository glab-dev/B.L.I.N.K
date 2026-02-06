// ==================== SUPABASE CLIENT ====================
// Supabase initialization and authentication functions.
// Dependencies: Supabase JS library must be loaded via CDN first.

// ==================== CONFIGURATION ====================
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://wdprtbmhekougwnkpcdu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcHJ0Ym1oZWtvdWd3bmtwY2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTMyNDQsImV4cCI6MjA4NTYyOTI0NH0.WD5soMFrLGYzlEHjB6xYpRjq96v-9eCvglzo4v4nQ58';

// ==================== STATE ====================
let supabaseClient = null;
let currentUser = null;

// ==================== INITIALIZATION ====================

function initSupabase() {
  // Check if Supabase library is loaded
  if(typeof supabase === 'undefined' || !supabase.createClient) {
    console.warn('Supabase library not loaded - cloud features disabled');
    return;
  }

  // Check if credentials are configured
  if(SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    console.warn('Supabase not configured - cloud features disabled');
    return;
  }

  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user || null;
      console.log('Auth state changed:', event, currentUser?.email || 'not logged in');
      updateAuthUI();

      if(event === 'SIGNED_IN') {
        console.log('User signed in:', currentUser.email);
        // Trigger sync after login
        setTimeout(() => {
          syncAllData().catch(err => console.error('Sync error:', err));
        }, 500);
      }

      if(event === 'PASSWORD_RECOVERY') {
        // User clicked the password reset link - show new password form
        console.log('Password recovery detected');
        setTimeout(() => {
          openAuthModal('newpassword');
        }, 100);
      }
    });

    // Check for existing session
    checkSession();

    // Re-check session when app regains focus (PWA resuming from background)
    document.addEventListener('visibilitychange', function() {
      if(!document.hidden && supabaseClient) {
        checkSession();
      }
    });

    console.log('Supabase initialized');
  } catch(err) {
    console.error('Supabase initialization error:', err);
  }
}

async function checkSession() {
  if(!supabaseClient) return;

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;
    updateAuthUI();
  } catch(err) {
    console.error('Session check error:', err);
  }
}

// ==================== AUTHENTICATION FUNCTIONS ====================

async function supabaseSignUp(email, password) {
  if(!supabaseClient) {
    throw new Error('Supabase not initialized');
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password
  });

  if(error) throw error;
  return data;
}

async function supabaseSignIn(email, password) {
  if(!supabaseClient) {
    throw new Error('Supabase not initialized');
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if(error) throw error;
  return data;
}

async function supabaseSignOut() {
  if(!supabaseClient) {
    throw new Error('Supabase not initialized');
  }

  const { error } = await supabaseClient.auth.signOut();
  if(error) throw error;

  currentUser = null;
  updateAuthUI();
}

async function supabaseResetPassword(email) {
  if(!supabaseClient) {
    throw new Error('Supabase not initialized');
  }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });

  if(error) throw error;
}

async function supabaseUpdatePassword(newPassword) {
  if(!supabaseClient) {
    throw new Error('Supabase not initialized');
  }

  const { data, error } = await supabaseClient.auth.updateUser({
    password: newPassword
  });

  if(error) throw error;
  return data;
}

// ==================== HELPER FUNCTIONS ====================

function isSupabaseConfigured() {
  return supabaseClient !== null;
}

function isAuthenticated() {
  return currentUser !== null;
}

function getCurrentUser() {
  return currentUser;
}

function getUserEmail() {
  return currentUser?.email || null;
}

// ==================== UI UPDATE ====================

function updateAuthUI() {
  // Update welcome page sign-in button
  const welcomeSignInBtn = document.querySelector('.welcome-btn-signin');
  const welcomeSignInDesc = document.querySelector('.welcome-signin-desc');
  if(welcomeSignInBtn) {
    if(isAuthenticated()) {
      welcomeSignInBtn.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 6px;">logout</span>
        Sign Out
      `;
      welcomeSignInBtn.onclick = async function() {
        await supabaseSignOut();
        showAlert('Signed out successfully');
      };
      // Hide the description when signed in
      if(welcomeSignInDesc) welcomeSignInDesc.style.display = 'none';
    } else {
      welcomeSignInBtn.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 6px;">login</span>
        Sign In
      `;
      welcomeSignInBtn.onclick = function() { openAuthModal('signin'); };
      // Show the description when signed out
      if(welcomeSignInDesc) welcomeSignInDesc.style.display = '';
    }
  }

  // Update auth modal if open (don't close during password recovery flow)
  const authModal = document.getElementById('authModal');
  if(authModal && authModal.classList.contains('active') && isAuthenticated()) {
    // Don't close if user is in the middle of setting a new password
    if(typeof currentAuthMode === 'undefined' || currentAuthMode !== 'newpassword') {
      closeAuthModal();
    }
  }
}

// ==================== CLOUD SYNC FUNCTIONS ====================

// Sync state
let isSyncing = false;
let lastSyncTime = null;

// Sync all data (panels and processors)
async function syncAllData() {
  if(!isAuthenticated() || !supabaseClient || isSyncing) return;

  isSyncing = true;
  console.log('Starting cloud sync...');

  try {
    await Promise.all([
      syncCustomPanels(),
      syncCustomProcessors()
    ]);
    lastSyncTime = new Date();
    console.log('Cloud sync completed');
  } catch(err) {
    console.error('Cloud sync error:', err);
  } finally {
    isSyncing = false;
  }
}

// ==================== CUSTOM PANELS SYNC ====================

async function syncCustomPanels() {
  if(!isAuthenticated() || !supabaseClient) return;

  // Fetch cloud panels
  const cloudPanels = await fetchCustomPanelsFromCloud();

  // Get local panels
  const localPanels = typeof customPanels !== 'undefined' ? customPanels : {};

  // Merge: cloud wins for conflicts (could add timestamp comparison later)
  const merged = { ...localPanels };
  const toUpload = [];

  // Add cloud panels to local (overwrite if exists)
  cloudPanels.forEach(cp => {
    if(!cp.is_deleted) {
      merged[cp.panel_key] = cp.panel_data;
    } else {
      // Remove deleted panels
      delete merged[cp.panel_key];
    }
  });

  // Find local panels not in cloud
  const cloudKeys = new Set(cloudPanels.map(cp => cp.panel_key));
  Object.keys(localPanels).forEach(key => {
    if(!cloudKeys.has(key)) {
      toUpload.push({ key, data: localPanels[key] });
    }
  });

  // Upload new local panels to cloud
  for(const item of toUpload) {
    await upsertCustomPanel(item.key, item.data);
  }

  // Update local storage with merged data
  if(typeof customPanels !== 'undefined') {
    Object.keys(customPanels).forEach(k => delete customPanels[k]);
    Object.assign(customPanels, merged);
    if(typeof saveCustomPanels === 'function') {
      saveCustomPanels();
    }
    if(typeof updatePanelDropdowns === 'function') {
      updatePanelDropdowns();
    }
  }

  console.log(`Synced panels: ${Object.keys(merged).length} total, ${toUpload.length} uploaded`);
}

async function fetchCustomPanelsFromCloud() {
  if(!supabaseClient || !currentUser) return [];

  const { data, error } = await supabaseClient
    .from('user_custom_panels')
    .select('*')
    .eq('user_id', currentUser.id);

  if(error) {
    console.error('Fetch panels error:', error);
    return [];
  }

  return data || [];
}

async function upsertCustomPanel(panelKey, panelData) {
  if(!supabaseClient || !currentUser) return;

  const { error } = await supabaseClient
    .from('user_custom_panels')
    .upsert({
      user_id: currentUser.id,
      panel_key: panelKey,
      panel_data: panelData,
      updated_at: new Date().toISOString(),
      is_deleted: false
    }, {
      onConflict: 'user_id,panel_key'
    });

  if(error) {
    console.error('Upsert panel error:', error);
  }
}

async function deleteCustomPanelFromCloud(panelKey) {
  if(!supabaseClient || !currentUser) return;

  // Soft delete
  const { error } = await supabaseClient
    .from('user_custom_panels')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('user_id', currentUser.id)
    .eq('panel_key', panelKey);

  if(error) {
    console.error('Delete panel error:', error);
  }
}

// ==================== CUSTOM PROCESSORS SYNC ====================

async function syncCustomProcessors() {
  if(!isAuthenticated() || !supabaseClient) return;

  // Fetch cloud processors
  const cloudProcessors = await fetchCustomProcessorsFromCloud();

  // Get local processors
  const localProcessors = typeof customProcessors !== 'undefined' ? customProcessors : {};

  // Merge: cloud wins for conflicts
  const merged = { ...localProcessors };
  const toUpload = [];

  // Add cloud processors to local
  cloudProcessors.forEach(cp => {
    if(!cp.is_deleted) {
      merged[cp.processor_key] = cp.processor_data;
    } else {
      delete merged[cp.processor_key];
    }
  });

  // Find local processors not in cloud
  const cloudKeys = new Set(cloudProcessors.map(cp => cp.processor_key));
  Object.keys(localProcessors).forEach(key => {
    if(!cloudKeys.has(key)) {
      toUpload.push({ key, data: localProcessors[key] });
    }
  });

  // Upload new local processors to cloud
  for(const item of toUpload) {
    await upsertCustomProcessor(item.key, item.data);
  }

  // Update local storage with merged data
  if(typeof customProcessors !== 'undefined') {
    Object.keys(customProcessors).forEach(k => delete customProcessors[k]);
    Object.assign(customProcessors, merged);
    if(typeof saveCustomProcessors === 'function') {
      saveCustomProcessors();
    }
    if(typeof updateProcessorDropdowns === 'function') {
      updateProcessorDropdowns();
    }
  }

  console.log(`Synced processors: ${Object.keys(merged).length} total, ${toUpload.length} uploaded`);
}

async function fetchCustomProcessorsFromCloud() {
  if(!supabaseClient || !currentUser) return [];

  const { data, error } = await supabaseClient
    .from('user_custom_processors')
    .select('*')
    .eq('user_id', currentUser.id);

  if(error) {
    console.error('Fetch processors error:', error);
    return [];
  }

  return data || [];
}

async function upsertCustomProcessor(processorKey, processorData) {
  if(!supabaseClient || !currentUser) return;

  const { error } = await supabaseClient
    .from('user_custom_processors')
    .upsert({
      user_id: currentUser.id,
      processor_key: processorKey,
      processor_data: processorData,
      updated_at: new Date().toISOString(),
      is_deleted: false
    }, {
      onConflict: 'user_id,processor_key'
    });

  if(error) {
    console.error('Upsert processor error:', error);
  }
}

async function deleteCustomProcessorFromCloud(processorKey) {
  if(!supabaseClient || !currentUser) return;

  // Soft delete
  const { error } = await supabaseClient
    .from('user_custom_processors')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('user_id', currentUser.id)
    .eq('processor_key', processorKey);

  if(error) {
    console.error('Delete processor error:', error);
  }
}

// ==================== COMMUNITY SHARING ====================

// Admin configuration
const ADMIN_EMAILS = ['gablabrecque@gmail.com'];

function isAdmin() {
  return ADMIN_EMAILS.includes(getUserEmail());
}

// Fetch approved community panels
async function fetchCommunityPanels() {
  if(!supabaseClient) return [];

  const { data, error } = await supabaseClient
    .from('community_panels')
    .select('*')
    .eq('status', 'approved')
    .order('download_count', { ascending: false });

  if(error) {
    console.error('Fetch community panels error:', error);
    return [];
  }

  return data || [];
}

// Fetch approved community processors
async function fetchCommunityProcessors() {
  if(!supabaseClient) return [];

  const { data, error } = await supabaseClient
    .from('community_processors')
    .select('*')
    .eq('status', 'approved')
    .order('download_count', { ascending: false });

  if(error) {
    console.error('Fetch community processors error:', error);
    return [];
  }

  return data || [];
}

// Submit panel to community for approval
async function submitPanelToCommunity(panelKey, panelData) {
  if(!supabaseClient || !currentUser) {
    throw new Error('Must be logged in to submit');
  }

  // Filter to specs only before submitting
  const specsOnly = extractPanelSpecsForCommunity(panelData);

  const { data, error } = await supabaseClient
    .from('community_panels')
    .insert({
      submitted_by: currentUser.id,
      panel_key: panelKey,
      panel_data: specsOnly,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      download_count: 0,
      update_count: 0
    })
    .select()
    .single();

  if(error) {
    if(error.code === '23505') {
      throw new Error('A panel with this name already exists in the community');
    }
    throw error;
  }

  return data;
}

// Submit processor to community for approval
async function submitProcessorToCommunity(processorKey, processorData) {
  if(!supabaseClient || !currentUser) {
    throw new Error('Must be logged in to submit');
  }

  // Filter to specs only before submitting
  const specsOnly = extractProcessorSpecsForCommunity(processorData);

  const { data, error } = await supabaseClient
    .from('community_processors')
    .insert({
      submitted_by: currentUser.id,
      processor_key: processorKey,
      processor_data: specsOnly,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      download_count: 0,
      update_count: 0
    })
    .select()
    .single();

  if(error) {
    if(error.code === '23505') {
      throw new Error('A processor with this name already exists in the community');
    }
    throw error;
  }

  return data;
}

// Download community panel to local library
async function downloadCommunityPanel(communityPanel) {
  if(!supabaseClient || !currentUser) {
    throw new Error('Must be logged in to download');
  }

  // Record the download
  await supabaseClient
    .from('user_downloads')
    .upsert({
      user_id: currentUser.id,
      item_type: 'panel',
      item_id: communityPanel.id,
      downloaded_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,item_type,item_id'
    });

  // Increment download count
  await supabaseClient
    .from('community_panels')
    .update({ download_count: (communityPanel.download_count || 0) + 1 })
    .eq('id', communityPanel.id);

  // Add to local customPanels with community flag
  const panelData = {
    ...communityPanel.panel_data,
    is_community: true,
    community_id: communityPanel.id,
    community_author: communityPanel.submitted_by
  };

  const key = communityPanel.panel_key;
  if(typeof customPanels !== 'undefined') {
    customPanels[key] = panelData;
    if(typeof saveCustomPanels === 'function') saveCustomPanels();
    if(typeof updatePanelDropdowns === 'function') updatePanelDropdowns();
  }

  // Also sync to user's cloud storage
  await upsertCustomPanel(key, panelData);

  return panelData;
}

// Download community processor to local library
async function downloadCommunityProcessor(communityProcessor) {
  if(!supabaseClient || !currentUser) {
    throw new Error('Must be logged in to download');
  }

  // Record the download
  await supabaseClient
    .from('user_downloads')
    .upsert({
      user_id: currentUser.id,
      item_type: 'processor',
      item_id: communityProcessor.id,
      downloaded_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,item_type,item_id'
    });

  // Increment download count
  await supabaseClient
    .from('community_processors')
    .update({ download_count: (communityProcessor.download_count || 0) + 1 })
    .eq('id', communityProcessor.id);

  // Add to local customProcessors with community flag
  const processorData = {
    ...communityProcessor.processor_data,
    is_community: true,
    community_id: communityProcessor.id,
    community_author: communityProcessor.submitted_by
  };

  const key = communityProcessor.processor_key;
  if(typeof customProcessors !== 'undefined') {
    customProcessors[key] = processorData;
    if(typeof saveCustomProcessors === 'function') saveCustomProcessors();
    if(typeof updateProcessorDropdowns === 'function') updateProcessorDropdowns();
  }

  // Also sync to user's cloud storage
  await upsertCustomProcessor(key, processorData);

  return processorData;
}

// ==================== COMMUNITY UPDATE FUNCTIONS ====================

// Extract only specs for community sharing (filter out personal config)
function extractPanelSpecsForCommunity(panel) {
  return {
    brand: panel.brand,
    name: panel.name,
    width: panel.width,
    height: panel.height,
    depth: panel.depth,
    weight: panel.weight,
    frameWeight: panel.frameWeight,
    removableFrame: panel.removableFrame,
    power: panel.power,
    dataPort: panel.dataPort,
    maxDataPorts: panel.maxDataPorts
    // Explicitly NOT including: cables, structure, gear preferences
  };
}

// Extract only specs for processor community sharing
function extractProcessorSpecsForCommunity(processor) {
  return {
    name: processor.name,
    brand: processor.brand,
    ports: processor.ports,
    maxWidth: processor.maxWidth,
    maxHeight: processor.maxHeight,
    hasDistBox: processor.hasDistBox,
    distBoxName: processor.distBoxName,
    distBoxPorts: processor.distBoxPorts,
    hasBackup: processor.hasBackup
    // Explicitly NOT including any personal workflow preferences
  };
}

// Update community panel (original submitter only)
async function updateCommunityPanel(panelKey, panelData) {
  if(!supabaseClient || !currentUser) {
    throw new Error('Must be logged in to update');
  }

  // First get current update_count
  const { data: existing } = await supabaseClient
    .from('community_panels')
    .select('update_count, status')
    .eq('panel_key', panelKey)
    .eq('submitted_by', currentUser.id)
    .single();

  if(!existing) {
    throw new Error('Panel not found or you are not the original submitter');
  }

  // Don't allow updating rejected panels
  if(existing.status === 'rejected') {
    throw new Error('Cannot update a rejected panel. Please delete and re-submit.');
  }

  const newCount = (existing.update_count || 0) + 1;

  // Filter to specs only
  const specsOnly = extractPanelSpecsForCommunity(panelData);

  const { data, error } = await supabaseClient
    .from('community_panels')
    .update({
      panel_data: specsOnly,
      updated_at: new Date().toISOString(),
      update_count: newCount
    })
    .eq('panel_key', panelKey)
    .eq('submitted_by', currentUser.id)
    .select();

  if(error) throw error;
  if(!data || data.length === 0) {
    throw new Error('Update failed - panel not found or blocked by policy');
  }

  return data[0];
}

// Update community processor (original submitter only)
async function updateCommunityProcessor(processorKey, processorData) {
  if(!supabaseClient || !currentUser) {
    throw new Error('Must be logged in to update');
  }

  // First get current update_count
  const { data: existing } = await supabaseClient
    .from('community_processors')
    .select('update_count, status')
    .eq('processor_key', processorKey)
    .eq('submitted_by', currentUser.id)
    .single();

  if(!existing) {
    throw new Error('Processor not found or you are not the original submitter');
  }

  // Don't allow updating rejected processors
  if(existing.status === 'rejected') {
    throw new Error('Cannot update a rejected processor. Please delete and re-submit.');
  }

  const newCount = (existing.update_count || 0) + 1;

  // Filter to specs only
  const specsOnly = extractProcessorSpecsForCommunity(processorData);

  const { data, error } = await supabaseClient
    .from('community_processors')
    .update({
      processor_data: specsOnly,
      updated_at: new Date().toISOString(),
      update_count: newCount
    })
    .eq('processor_key', processorKey)
    .eq('submitted_by', currentUser.id)
    .select();

  if(error) throw error;
  if(!data || data.length === 0) {
    throw new Error('Update failed - processor not found or blocked by policy');
  }

  return data[0];
}

// ==================== ADMIN FUNCTIONS ====================

// Fetch pending panels (admin only)
async function fetchPendingPanels() {
  if(!supabaseClient || !isAdmin()) return [];

  const { data, error } = await supabaseClient
    .from('community_panels')
    .select('*')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });

  if(error) {
    console.error('Fetch pending panels error:', error);
    return [];
  }

  return data || [];
}

// Fetch pending processors (admin only)
async function fetchPendingProcessors() {
  if(!supabaseClient || !isAdmin()) return [];

  const { data, error } = await supabaseClient
    .from('community_processors')
    .select('*')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });

  if(error) {
    console.error('Fetch pending processors error:', error);
    return [];
  }

  return data || [];
}

// Approve community panel (admin only)
async function approveCommunityPanel(panelId) {
  if(!supabaseClient || !currentUser || !isAdmin()) {
    throw new Error('Admin access required');
  }

  console.log('Approving panel in Supabase:', panelId, 'by user:', currentUser.id);

  const { data, error } = await supabaseClient
    .from('community_panels')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: currentUser.id
    })
    .eq('id', panelId)
    .select();

  console.log('Supabase response - data:', data, 'error:', error);

  if(error) throw error;
  if(!data || data.length === 0) {
    throw new Error('Panel not found or update blocked by policy');
  }
}

// Reject community panel (admin only)
async function rejectCommunityPanel(panelId) {
  if(!supabaseClient || !currentUser || !isAdmin()) {
    throw new Error('Admin access required');
  }

  const { data, error } = await supabaseClient
    .from('community_panels')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: currentUser.id
    })
    .eq('id', panelId)
    .select();

  if(error) throw error;
  if(!data || data.length === 0) {
    throw new Error('Panel not found or update blocked by policy');
  }
}

// Approve community processor (admin only)
async function approveCommunityProcessor(processorId) {
  if(!supabaseClient || !currentUser || !isAdmin()) {
    throw new Error('Admin access required');
  }

  const { data, error } = await supabaseClient
    .from('community_processors')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: currentUser.id
    })
    .eq('id', processorId)
    .select();

  if(error) throw error;
  if(!data || data.length === 0) {
    throw new Error('Processor not found or update blocked by policy');
  }
}

// Reject community processor (admin only)
async function rejectCommunityProcessor(processorId) {
  if(!supabaseClient || !currentUser || !isAdmin()) {
    throw new Error('Admin access required');
  }

  const { data, error } = await supabaseClient
    .from('community_processors')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: currentUser.id
    })
    .eq('id', processorId)
    .select();

  if(error) throw error;
  if(!data || data.length === 0) {
    throw new Error('Processor not found or update blocked by policy');
  }
}
