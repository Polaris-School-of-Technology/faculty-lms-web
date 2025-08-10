// --- Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// --- API Helper ---
const api = {
  token: null,
  setToken(newToken) {
    this.token = newToken;
  },
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Login failed');
    }
    return response.json();
  },
  async get(endpoint) {
    if (!this.token) throw new Error('Not authenticated');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to fetch data');
    }
    return response.json();
  },
  async post(endpoint, body) {
    if (!this.token) throw new Error('Not authenticated');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Request failed');
    }
    return response.json();
  }
};

export default api;
