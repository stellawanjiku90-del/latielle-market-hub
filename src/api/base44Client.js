const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('latielle_token');
}

async function request(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }

  return data;
}

export const base44 = {
  auth: {
    async login(credentials) {
      const result = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (result.token) {
        localStorage.setItem('latielle_token', result.token);
      }

      return result;
    },

    async register(userData) {
      const result = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (result.token) {
        localStorage.setItem('latielle_token', result.token);
      }

      return result;
    },

    async me() {
      return request('/me');
    },

    logout() {
      localStorage.removeItem('latielle_token');
    },
  },

  listings: {
    list() {
      return request('/listings');
    },

    get(id) {
      return request(`/listings/${id}`);
    },

    create(data) {
      return request('/listings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update(id, data) {
      return request(`/listings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete(id) {
      return request(`/listings/${id}`, {
        method: 'DELETE',
      });
    },
  },

  requests: {
    create(data) {
      return request('/requests', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    mine() {
      return request('/requests/mine');
    },
  },

  dashboard: {
    seller() {
      return request('/dashboard/seller');
    },

    admin() {
      return request('/dashboard/admin');
    },
  },

  health() {
    return request('/health');
  },
};

export { request };
