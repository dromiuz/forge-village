// Auth tab switching functionality
document.addEventListener('DOMContentLoaded', () => {
  const signInTab = document.getElementById('tabSignIn');
  const signUpTab = document.getElementById('tabSignUp');
  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');

  if (signInTab && signUpTab && signInForm && signUpForm) {
    signInTab.addEventListener('click', () => {
      signInTab.classList.add('active');
      signUpTab.classList.remove('active');
      signInForm.classList.add('active');
      signUpForm.classList.remove('active');
      
      // Clear any messages
      const messageEl = document.getElementById('authMessage');
      if (messageEl) {
        messageEl.textContent = '';
        messageEl.className = 'auth-message';
      }
    });

    signUpTab.addEventListener('click', () => {
      signUpTab.classList.add('active');
      signInTab.classList.remove('active');
      signUpForm.classList.add('active');
      signInForm.classList.remove('active');
      
      // Clear any messages
      const messageEl = document.getElementById('authMessage');
      if (messageEl) {
        messageEl.textContent = '';
        messageEl.className = 'auth-message';
      }
    });
  }
});