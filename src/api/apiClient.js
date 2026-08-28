const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export async function request(path, options = {}) {
  const { skipAuth = false, ...fetchOptions } = options;
  const token = skipAuth ? null : localStorage.getItem("auth_token");
  const headers = {
    ...(fetchOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers || {}),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...fetchOptions, headers });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const message = (data && typeof data === "object" ? (data.error || data.message) : "") ||
      (typeof data === "string" && data.trim() ? data.trim().slice(0, 300) : "") ||
      `Request failed (HTTP ${response.status})`;
    throw Object.assign(new Error(message), { status: response.status });
  }
  return data;
}

const entityPath = (name) => `/api/entities/${encodeURIComponent(name)}`;
const entities = new Proxy({}, {
  get(_target, entityName) {
    return {
      async list(sort = "-created_date", limit = 100) {
        return request(`${entityPath(entityName)}?sort=${encodeURIComponent(sort)}&limit=${limit}`);
      },
      async get(id) { return request(`${entityPath(entityName)}/${id}`); },
      async filter(filters = {}, sort = "-created_date", limit = 100) {
        const qs = new URLSearchParams({ sort, limit: String(limit), filters: JSON.stringify(filters) });
        return request(`${entityPath(entityName)}?${qs}`);
      },
      async create(data) { return request(entityPath(entityName), { method: "POST", body: JSON.stringify(data) }); },
      async update(id, data) { return request(`${entityPath(entityName)}/${id}`, { method: "PATCH", body: JSON.stringify(data) }); },
      async delete(id) { return request(`${entityPath(entityName)}/${id}`, { method: "DELETE" }); },
      subscribe() { return () => {}; },
    };
  }
});

export async function apiFunction(name, payload = {}) {
  const data = await request(`/api/functions/${encodeURIComponent(name)}`, { method: "POST", body: JSON.stringify(payload) });
  return { data };
}

export const api = {
  request,
  auth: {
    async login({ email, password }) {
      const data = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      if (data.token) localStorage.setItem("auth_token", data.token);
      if (data.user) localStorage.setItem("auth_user", JSON.stringify(data.user));
      return data;
    },
    async register(payload) {
      const data = await request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
      if (data.token) localStorage.setItem("auth_token", data.token);
      if (data.user) localStorage.setItem("auth_user", JSON.stringify(data.user));
      return data;
    },
    me() { return request("/api/me"); },
    isAuthenticated() { return Promise.resolve(Boolean(localStorage.getItem("auth_token"))); },
    logout() { localStorage.removeItem("auth_token"); localStorage.removeItem("auth_user"); },
    redirectToLogin() { window.location.href = "/login"; },
    resetPasswordRequest(email) { return request("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }); },
    resetPassword(payload) { return request("/api/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }); },
  },
  entities,
  functions: {
    async invoke(name, payload = {}) { return apiFunction(name, payload); },
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const fd = new FormData(); fd.append("file", file);
        return request("/api/upload", { method: "POST", body: fd });
      },
      InvokeLLM({ prompt, ...rest }) { return request("/api/ai", { method: "POST", body: JSON.stringify({ prompt, ...rest }) }); },
      SendEmail(payload) { return request("/api/email", { method: "POST", body: JSON.stringify(payload) }); },
    },
  },
  asServiceRole: { entities },
};

export default api;
