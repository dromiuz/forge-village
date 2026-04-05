// User Attribution Functions for Signal Deck

async function getCurrentUser() {
  try {
    const response = await fetch('/api/user/current');
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return { anonymous: true, username: 'Anonymous' };
  }
}

function displayUserInfo(user) {
  const userInfoDiv = document.getElementById('userInfo');
  if (!userInfoDiv) return;
  
  if (user.anonymous) {
    userInfoDiv.innerHTML = `
      <div class="user-info">
        <span class="user-avatar">?</span>
        <span>Anonymous user</span>
        <button onclick="showUserSelect()" style="margin-left: 10px; font-size: 0.8em;">Change</button>
      </div>
    `;
  } else {
    const initials = user.username.charAt(0).toUpperCase();
    userInfoDiv.innerHTML = `
      <div class="user-info">
        <span class="user-avatar">${initials}</span>
        <span>Working as: ${user.username}</span>
        <button onclick="showUserSelect()" style="margin-left: 10px; font-size: 0.8em;">Change</button>
      </div>
    `;
  }
}

function showUserSelect() {
  window.location.href = '/user-select.html';
}

function formatAttribution(meta) {
  if (!meta) return '';
  
  const createdBy = meta.createdBy || 'Unknown';
  const createdAt = meta.createdAt ? new Date(meta.createdAt).toLocaleDateString() : '';
  const lastModifiedBy = meta.lastModifiedBy || createdBy;
  const lastModifiedAt = meta.lastModifiedAt ? new Date(meta.lastModifiedAt).toLocaleDateString() : createdAt;
  
  if (createdBy === lastModifiedBy && createdAt === lastModifiedAt) {
    return `Created by ${createdBy} on ${createdAt}`;
  } else {
    return `Created by ${createdBy} • Updated by ${lastModifiedBy} on ${lastModifiedAt}`;
  }
}

// Initialize user info on page load
document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  displayUserInfo(user);
});