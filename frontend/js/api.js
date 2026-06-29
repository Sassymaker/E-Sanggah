const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('e_sanggah_token');
}

function setSession(token, user) {
  localStorage.setItem('e_sanggah_token', token);
  localStorage.setItem('e_sanggah_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('e_sanggah_token');
  localStorage.removeItem('e_sanggah_user');
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('e_sanggah_user') || 'null');
  } catch (error) {
    return null;
  }
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = options.headers ? { ...options.headers } : {};

  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = options.body instanceof FormData;
  if (!isForm && options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    let message = 'Permintaan gagal diproses.';
    if (contentType.includes('application/json')) {
      const body = await response.json();
      message = body.message || message;
    }
    throw new Error(message);
  }

  if (contentType.includes('application/json')) return response.json();
  return response;
}
