// Handle auth callback parameters from email confirmation
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get('auth_success')) {
    // Show success message for email confirmation
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
      messageEl.textContent = 'Email confirmed! You can now sign in with your credentials.';
      messageEl.className = 'auth-message success';
    }
    // Clean up URL
    history.replaceState({}, document.title, window.location.pathname);
  }
  
  if (urlParams.get('auth_error')) {
    // Show error message
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
      messageEl.textContent = 'Authentication failed. Please try again or contact support.';
      messageEl.className = 'auth-message error';
    }
    // Clean up URL
    history.replaceState({}, document.title, window.location.pathname);
  }
});