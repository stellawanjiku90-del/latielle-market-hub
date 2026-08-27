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



function listingFromLegacy(data) {
  return data;
}

const BusinessListing = {
  async list() { return request('/listings'); },
  async filter(filters = {}) {
    const rows = await request('/listings');
    return rows.filter(row => Object.entries(filters).every(([k,v]) => row[k] === v));
  },
  async get(id) { return request(`/listings/${id}`); },
  async create(data) { return request('/listings', {method:'POST', body:JSON.stringify(listingFromLegacy(data))}); },
  async update(id,data) { return request(`/listings/${id}`, {method:'PATCH', body:JSON.stringify(data)}); },
  async delete(id) { return request(`/listings/${id}`, {method:'DELETE'}); }
};

const unsupportedEntity = {
  async list(){ return []; }, async filter(){ return []; }, async create(data){ return data; },
  async update(_id,data){ return data; }, async delete(){ return true; }
};

base44.auth.isAuthenticated = async () => !!getToken();
base44.auth.redirectToLogin = () => { window.location.assign('/login'); };
base44.entities = new Proxy({ BusinessListing }, { get(target, prop) { return target[prop] || unsupportedEntity; } });
base44.asServiceRole = { entities: base44.entities };
base44.integrations = { Core: { async InvokeLLM() { return "Support chat is currently unavailable. Please email realityofafrica2023@gmail.com for assistance."; } } };
base44.functions = new Proxy({}, { get: () => ({ async invoke(){ return {}; } }) });

export { request };
