// Signal Deck Hybrid App
// Handles both local (no auth) and cloud (with auth) modes

class SignalDeckHybrid {
  constructor() {
    this.mode = 'local'; // 'local' or 'cloud'
    this.accessToken = null;
    this.currentUser = null;
    this.supabase = null;
  }

  async initialize() {
    try {
      // Check what mode we're in
      const configResponse = await fetch('/api/config');
      const config = await configResponse.json();
      
      this.mode = config.mode || 'local';
      console.log('Signal Deck mode:', this.mode);
      
      if (this.mode === 'cloud') {
        // Initialize cloud mode with Supabase
        await this.initializeCloudMode(config);
      } else {
        // Initialize local mode (original experience)
        await this.initializeLocalMode();
      }
    } catch (error) {
      console.error('Hybrid initialization error:', error);
      // Fallback to local mode
      await this.initializeLocalMode();
    }
  }

  async initializeCloudMode(config) {
    console.log('Initializing cloud mode...');
    
    // Load Supabase from CDN if not already loaded
    if (typeof window.supabase === 'undefined') {
      console.error('Supabase not loaded. Make sure supabase.min.js is included.');
      await this.initializeLocalMode();
      return;
    }
    
    this.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    
    // Check for existing session
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session) {
      this.accessToken = session.access_token;
      this.currentUser = session.user;
      localStorage.setItem('signal_deck_access_token', this.accessToken);
      this.showMainApp();
    } else {
      this.showAuthScreen();
    }
    
    // Set up auth state listener
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.accessToken = session.access_token;
        this.currentUser = session.user;
        localStorage.setItem('signal_deck_access_token', this.accessToken);
        this.showMainApp();
      } else if (event === 'SIGNED_OUT') {
        this.accessToken = null;
        this.currentUser = null;
        localStorage.removeItem('signal_deck_access_token');
        this.showAuthScreen();
      }
    });
  }

  async initializeLocalMode() {
    console.log('Initializing local mode (original Signal Deck)...');
    
    // Show main app immediately (no authentication needed)
    this.showMainApp();
    
    // Initialize original Signal Deck functionality
    if (typeof window.initializeOriginalSignalDeck === 'function') {
      window.initializeOriginalSignalDeck();
    } else {
      // Fallback initialization
      await this.initializeSignalDeckCore();
    }
  }

  showMainApp() {
    const authContainer = document.getElementById('authContainer');
    const mainApp = document.querySelector('.signal-app');
    
    if (authContainer) authContainer.style.display = 'none';
    if (mainApp) mainApp.style.display = 'flex';
    
    // Initialize main app functionality
    this.initializeSignalDeckCore();
  }

  showAuthScreen() {
    const authContainer = document.getElementById('authContainer');
    const mainApp = document.querySelector('.signal-app');
    
    if (authContainer) authContainer.style.display = 'block';
    if (mainApp) mainApp.style.display = 'none';
  }

  async initializeSignalDeckCore() {
    // This is your original Signal Deck initialization logic
    // Set up state, event listeners, etc.
    
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
    
    window.$ = (id) => document.getElementById(id);
    
    window.escapeHtml = (value) => {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
    
    // Load initial data
    await this.refresh();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  async refresh() {
    try {
      const response = await fetch('/api/workspace-data');
      if (!response.ok) {
        throw new Error('Failed to load workspace data');
      }
      
      const data = await response.json();
      window.state.workspace = data;
      
      // Render the UI
      this.renderAll();
    } catch (error) {
      console.error('Refresh error:', error);
    }
  }

  renderAll() {
    // Render your original Signal Deck UI
    // This would include all the render functions from your original code
    console.log('Rendering Signal Deck UI...');
  }

  setupEventListeners() {
    // Set up all your original event listeners
    const refreshButton = $('refreshButton');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => this.refresh());
    }
  }
}

// Initialize the hybrid app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.signalDeck = new SignalDeckHybrid();
  window.signalDeck.initialize();
});

// Make refresh available globally for other scripts
window.refreshSignalDeck = async () => {
  if (window.signalDeck) {
    await window.signalDeck.refresh();
  }
};