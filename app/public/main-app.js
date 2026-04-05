// Signal Deck Main App Initialization
// This function should be called after successful authentication

window.initializeSignalDeck = async function() {
  console.log('Initializing Signal Deck main app...');
  
  // Hide auth container
  const authContainer = document.getElementById('authContainer');
  if (authContainer) {
    authContainer.style.display = 'none';
  }
  
  // Show main app
  const mainApp = document.querySelector('.signal-app');
  if (mainApp) {
    mainApp.style.display = 'flex';
  }
  
  // Initialize the main Signal Deck functionality
  await initializeSignalDeckCore();
};

async function initializeSignalDeckCore() {
  // Set up global state
  window.state = {
    workspace: null,
    summary: null,
    selectedSongId: null,
    activeTab: 'overview',
    trackingVisible: false,
    identityCardVisible: true,
    editingTrackingId: null,
    audioDurations: {},
    activeMarkerId: null,
    pendingMarkerTime: null,
    waveSurfer: null
  };
  
  // Set up helper functions
  window.$ = (id) => document.getElementById(id);
  
  window.escapeHtml = (value) => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };
  
  // Load initial data
  await refresh();
  
  // Set up event listeners for the main app
  setupMainEventListeners();
}

async function refresh() {
  try {
    const [projectsRes, summaryRes] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/summary')
    ]);
    
    if (!projectsRes.ok) {
      console.error('Failed to load projects:', await projectsRes.text());
      return;
    }
    
    const projectsData = await projectsRes.json();
    // For now, use the first project as the workspace
    window.state.workspace = projectsData.projects?.[0] || { songs: [] };
    window.state.summary = await summaryRes.json();
    
    if (!window.state.selectedSongId || !(window.state.workspace.songs || []).some((song) => song.id === window.state.selectedSongId)) {
      window.state.selectedSongId = window.state.summary?.topSong?.id || window.state.workspace?.songs?.[0]?.id || null;
    }
    
    renderAll();
  } catch (error) {
    console.error('Refresh error:', error);
  }
}

function renderAll() {
  renderTopBar();
  renderSidebar();
  renderTabs();
  renderSongDetail();
}

function renderTopBar() {
  const topTitle = $('topTitle');
  const topMeta = $('topMeta');
  
  if (topTitle && window.state.workspace?.name) {
    topTitle.textContent = window.state.workspace.name;
  }
  
  if (topMeta) {
    topMeta.textContent = window.state.workspace?.description || 'Your music workspace';
  }
}

function renderSidebar() {
  // Update sidebar quote
  updateSidebarQuote();
}

const SIDEBAR_QUOTES = [
  'Song-first. Ship real work.',
  'Keep the signal clean.',
  'Start with one real move.',
  'Every great track began as a bad demo.',
  'Done is better than perfect.',
  'The mix is never finished, only abandoned.',
  'Write the song only you can write.',
  'Trust your ears, not the tutorials.'
];
let quoteIndex = 0;

function updateSidebarQuote() {
  const quoteEl = $('sidebarQuote');
  if (quoteEl) {
    quoteEl.textContent = SIDEBAR_QUOTES[quoteIndex % SIDEBAR_QUOTES.length];
    quoteIndex++;
  }
}

function setupMainEventListeners() {
  // Set up refresh button
  const refreshButton = $('refreshButton');
  if (refreshButton) {
    refreshButton.addEventListener('click', refresh);
  }
  
  // Set up tab navigation
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      setActiveTab(tabId);
    });
  });
}

function setActiveTab(tabId) {
  // Remove active class from all tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Add active class to clicked tab
  const activeTab = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  if (activeTab) {
    activeTab.classList.add('active');
  }
  
  // Hide all tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  // Show selected tab panel
  const activePanel = document.getElementById(`tab-${tabId}`);
  if (activePanel) {
    activePanel.classList.add('active');
  }
  
  window.state.activeTab = tabId;
}

// Initialize the app if we're already authenticated
document.addEventListener('DOMContentLoaded', async () => {
  // Check if we have an auth token in localStorage or session
  const accessToken = localStorage.getItem('signal_deck_access_token');
  if (accessToken) {
    // Verify the token is still valid
    try {
      const response = await fetch('/api/workspace-data', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        // Token is valid, initialize the app
        window.signalDeckAccessToken = accessToken;
        await initializeSignalDeck();
      } else {
        // Token is invalid, show auth screen
        showAuthScreen();
      }
    } catch (error) {
      console.error('Token validation error:', error);
      showAuthScreen();
    }
  } else {
    // No token, show auth screen
    showAuthScreen();
  }
});

function showAuthScreen() {
  const authContainer = document.getElementById('authContainer');
  const mainApp = document.querySelector('.signal-app');
  
  if (authContainer) {
    authContainer.style.display = 'block';
  }
  if (mainApp) {
    mainApp.style.display = 'none';
  }
}

// Expose refresh function globally for auth module to use
window.refreshSignalDeck = refresh;