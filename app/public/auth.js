// Signal Deck Online - Authentication Module

class SignalDeckAuth {
  constructor() {
    this.supabaseUrl = ''; // Will be set from environment
    this.supabaseAnonKey = ''; // Will be set from environment
    this.accessToken = null;
    this.currentUser = null;
    this.authInitialized = false;
  }

  async initialize() {
    try {
      // Get config from server
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error('Failed to get auth configuration');
      }
      
      const config = await response.json();
      this.supabaseUrl = config.supabaseUrl;
      this.supabaseAnonKey = config.supabaseAnonKey;
      
      // Initialize Supabase client
      this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
      
      // Check for existing session
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session) {
        this.accessToken = session.access_token;
        this.currentUser = session.user;
        this.authInitialized = true;
        this.onAuthStateChange(true);
      } else {
        this.authInitialized = true;
        this.onAuthStateChange(false);
      }
      
      // Listen for auth state changes
      this.supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
          this.accessToken = session.access_token;
          this.currentUser = session.user;
          this.onAuthStateChange(true);
        } else if (event === 'SIGNED_OUT') {
          this.accessToken = null;
          this.currentUser = null;
          this.onAuthStateChange(false);
        }
      });
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.showAuthError('Failed to initialize authentication. Please check your configuration.');
    }
  }

  onAuthStateChange(isAuthenticated) {
    const authContainer = document.getElementById('authContainer');
    const mainApp = document.querySelector('.signal-app');
    
    if (isAuthenticated) {
      if (authContainer) authContainer.style.display = 'none';
      if (mainApp) mainApp.style.display = 'flex';
      this.loadWorkspace();
    } else {
      if (authContainer) authContainer.style.display = 'block';
      if (mainApp) mainApp.style.display = 'none';
    }
  }

  async signUp(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback'
        }
      });

      if (error) throw error;
      
      this.showAuthMessage('Sign up successful! Please check your email to confirm your account.');
      return true;
    } catch (error) {
      console.error('Sign up error:', error);
      this.showAuthError(error.message || 'Sign up failed');
      return false;
    }
  }

  async signIn(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      this.accessToken = data.session.access_token;
      this.currentUser = data.user;
      this.onAuthStateChange(true);
      return true;
    } catch (error) {
      console.error('Sign in error:', error);
      this.showAuthError(error.message || 'Sign in failed');
      return false;
    }
  }

  async signOut() {
    try {
      await this.supabase.auth.signOut();
      this.accessToken = null;
      this.currentUser = null;
      this.onAuthStateChange(false);
    } catch (error) {
      console.error('Sign out error:', error);
      this.showAuthError('Sign out failed');
    }
  }

  async loadWorkspace() {
    try {
      const response = await fetch('/api/workspace-data', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load workspace data');
      }
      
      const workspaceData = await response.json();
      // This would trigger the existing app logic to render the workspace
      window.dispatchEvent(new CustomEvent('workspaceLoaded', { detail: workspaceData }));
    } catch (error) {
      console.error('Workspace load error:', error);
      this.showAuthError('Failed to load workspace data');
    }
  }

  showAuthMessage(message) {
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.className = 'auth-message success';
    }
  }

  showAuthError(error) {
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
      messageEl.textContent = error;
      messageEl.className = 'auth-message error';
    }
  }

  // API wrapper with auth
  async apiRequest(url, options = {}) {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }
    
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: { ...defaultOptions.headers, ...options.headers }
    };
    
    const response = await fetch(url, mergedOptions);
    return response;
  }
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.signalDeckAuth = new SignalDeckAuth();
  window.signalDeckAuth.initialize();
});

// Handle form submissions
document.addEventListener('submit', async (event) => {
  if (event.target.id === 'signUpForm') {
    event.preventDefault();
    const email = document.getElementById('signUpEmail').value;
    const password = document.getElementById('signUpPassword').value;
    await window.signalDeckAuth.signUp(email, password);
  }
  
  if (event.target.id === 'signInForm') {
    event.preventDefault();
    const email = document.getElementById('signInEmail').value;
    const password = document.getElementById('signInPassword').value;
    await window.signalDeckAuth.signIn(email, password);
  }
});

// Handle sign out button
document.addEventListener('click', async (event) => {
  if (event.target.id === 'signOutButton') {
    event.preventDefault();
    await window.signalDeckAuth.signOut();
  }
});