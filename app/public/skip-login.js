// Skip Login functionality for cloud mode

document.addEventListener('DOMContentLoaded', () => {
  const skipLoginButton = document.getElementById('skipLoginButton');
  
  if (skipLoginButton) {
    skipLoginButton.addEventListener('click', async () => {
      // Set environment variable to skip auth
      try {
        const response = await fetch('/api/skip-auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ skip: true })
        });
        
        if (response.ok) {
          // Reload the page to switch to local mode
          window.location.reload();
        } else {
          console.error('Failed to skip authentication');
          alert('Could not skip login. Please try again or use local development mode.');
        }
      } catch (error) {
        console.error('Skip login error:', error);
        // Fallback: set localStorage flag and reload
        localStorage.setItem('signal_deck_skip_auth', 'true');
        window.location.reload();
      }
    });
  }
});

// Check for skip auth flag on page load
if (localStorage.getItem('signal_deck_skip_auth') === 'true') {
  // Hide auth screen and show main app
  const authContainer = document.getElementById('authContainer');
  const mainApp = document.querySelector('.signal-app');
  
  if (authContainer) authContainer.style.display = 'none';
  if (mainApp) mainApp.style.display = 'flex';
  
  // Initialize local mode
  if (window.signalDeck) {
    window.signalDeck.initializeLocalMode();
  }
}