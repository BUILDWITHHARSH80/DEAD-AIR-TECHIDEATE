// Centralized API client for DEAD AIR

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('deadair_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      // Check 401 unauth
      if (response.status === 401) {
        // Trigger session expiration event
        window.dispatchEvent(new CustomEvent('deadair_auth_expired', { detail: data?.detail || 'Session expired' }));
      }
      const message = data?.detail || data?.message || `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, data);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network connection failed. Please check signal.', 0, null);
  }
}

export const api = {
  get: (url, options) => apiRequest(url, { method: 'GET', ...options }),
  post: (url, body, options) => apiRequest(url, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (url, body, options) => apiRequest(url, { method: 'PUT', body: JSON.stringify(body), ...options }),
  delete: (url, options) => apiRequest(url, { method: 'DELETE', ...options }),
};
