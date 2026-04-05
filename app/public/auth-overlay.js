// Minimal Authentication Overlay
// Presents choice between local and cloud mode without breaking original functionality

document.addEventListener('DOMContentLoaded', async function() {
  // Check server mode first
  try {
    const configResponse = await fetch('/api/config');
    const config = await configResponse.json();
    
    if (config.mode === 'local') {
      // LOCAL MODE: Your original Signal Deck works as-is
      // Just ensure auth container is hidden
      hideAuthContainer();
      initializeOriginalApp();
    } else {
      // CLOUD MODE: Show auth choice
      showAuthContainer();
    }
  } catch (error) {
    console.error('Config check failed, assuming local mode:', error);
    hideAuthContainer();
    initializeOriginalApp();
  }
});

function hideAuthContainer() {
  const authContainer = document.getElementById('authContainer');
  if (authContainer) {
    authContainer.style.display = 'none';
  }
}

function showAuthContainer() {
  const authContainer = document.getElementById('authContainer');
  const mainApp = document.querySelector('.signal-app');
  
  if (authContainer) {
    authContainer.style.display = 'flex';
  }
  if (mainApp) {
    mainApp.style.display = 'none';
  }
}

function initializeOriginalApp() {
  // Your original Signal Deck initialization should already be in the HTML
  // This function just ensures it runs
  console.log('Original Signal Deck initialized');
  
  // If there's a refresh function, call it
  if (typeof window.refresh === 'function') {
    window.refresh();
  }
}

// Handle Skip Login button
document.addEventListener('click', function(event) {
  if (event.target.id === 'skipLoginButton') {
    event.preventDefault();
    // Force local mode by hiding auth and showing main app
    hideAuthContainer();
    initializeOriginalApp();
  }
});