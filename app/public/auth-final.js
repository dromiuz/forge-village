// Signal Deck Online - Final Authentication Module

class SignalDeckAuth {
  constructor() {
    this.supabaseUrl = '';
    this.supabaseAnonKey = '';
    this.accessToken = null;
    this.currentUser = null;
    this.authInitialized = false;
    this.supabase = null;
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
        localStorage.setItem('signal_deck_access_token', this.accessToken);
        this.authInitialized = true;
        this.onAuthStateChange(true);
      } else {
        this.authInitialized = true;
        this.onAuthStateChange(false);
      }
      
      // Listen for auth state changes
      this.supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          this.accessToken = session.access_token;
          this.currentUser = session.user;
          localStorage.setItem('signal_deck_access_token', this.accessToken);
          this.onAuthStateChange(true);
        } else if (event === 'SIGNED_OUT') {
          this.accessToken = null;
          this.currentUser = null;
          localStorage.removeItem('signal_deck_access_token');
          this.onAuthStateChange(false);
        }
      });
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.showAuthError('Failed to initialize authentication. Please refresh the page.');
    }
  }

  onAuthStateChange(isAuthenticated) {
    if (isAuthenticated && typeof window.initializeSignalDeck === 'function') {
      window.initializeSignalDeck();
    } else {
      this.showAuthScreen();
    }
  }

  showAuthScreen() {
    const authContainer = document.getElementById('authContainer');
    const mainApp = document.querySelector('.signal-app');
    
    if (authContainer) authContainer.style.display = 'block';
    if (mainApp) mainApp.style.display = 'none';
  }

  async signUp(email, password) {
    try {
      if (!email || !password) {
        this.showAuthError('Please enter both email and password');
        return false;
      }
      
      if (password.length < 6) {
        this.showAuthError('Password must be at least 6 characters long');
        return false;
      }

      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback'
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        this.showAuthError(error.message || 'Sign up failed');
        return false;
      }
      
      if (data.user) {
        this.showAuthMessage('Sign up successful! Please check your email to confirm your account.');
        setTimeout(() => {
          document.getElementById('tabSignIn').click();
        }, 3000);
        return true;
      }
      
    } catch (error) {
      console.error('Sign up exception:', error);
      this.showAuthError('Sign up failed. Please try again.');
      return false;
    }
  }

  async signIn(email, password) {
    try {
      if (!email || !password) {
        this.showAuthError('Please enter both email and password');
        return false;
      }

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Sign in error:', error);
        this.showAuthError(error.message || 'Sign in failed');
        return false;
      }
      
      if (data.session) {
        this.accessToken = data.session.access_token;
        this.currentUser = data.user;
        localStorage.setItem('signal_deck_access_token', this.accessToken);
        this.onAuthStateChange(true);
        return true;
      }
      
    } catch (error) {
      console.error('Sign in exception:', error);
      this.showAuthError('Sign in failed. Please try again.');
      return false;
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        this.showAuthError('Sign out failed');
        return false;
      }
      
      this.accessToken = null;
      this.currentUser = null;
      localStorage.removeItem('signal_deck_access_token');
      this.onAuthStateChange(false);
      return true;
    } catch (error) {
      console.error('Sign out exception:', error);
      this.showAuthError('Sign out failed');
      return false;
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
}

// Initialize auth when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.signalDeckAuth = new SignalDeckAuth();
    window.signalDeckAuth.initialize();
  });
} else {
  window.signalDeckAuth = new SignalDeckAuth();
  window.signalDeckAuth.initialize();
}

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