// Login logic for Electron app
window.addEventListener('DOMContentLoaded', () => {
  // Always clear session on app start to force login
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  const form = document.getElementById('loginForm');
  const errorDiv = document.getElementById('loginError');
  form.onsubmit = async (e) => {
    e.preventDefault();
    errorDiv.textContent = '';
    const username = form.username.value.trim();
    const password = form.password.value;
    const res = await window.electronAPI.authenticateUser(username, password);
    if (res && res.role) {
      localStorage.setItem('role', res.role);
      localStorage.setItem('username', res.username);
      window.location.replace('index.html');
    } else {
      errorDiv.textContent = 'Invalid username or password.';
    }
  };
});
