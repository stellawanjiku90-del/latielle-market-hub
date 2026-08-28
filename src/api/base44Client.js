const API_BASE_URL = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const token = localStorage.getItem("auth_token");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      data?.error || data?.message || "Something went wrong"
    );
  }

  return data;
}

export const base44 = {
  request,
  auth: {
    async login({ email, password }) {
      const data = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      if (data.user) {
        localStorage.setItem(
          "auth_user",
          JSON.stringify(data.user)
        );
      }

      return data;
    },

    async register({ name, email, password, role = "buyer" }) {
      const data = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      if (data.user) {
        localStorage.setItem(
          "auth_user",
          JSON.stringify(data.user)
        );
      }

      return data;
    },

    async me() {
      return request("/api/me");
    },

    async isAuthenticated() {
      return Boolean(localStorage.getItem("auth_token"));
    },

    logout() {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    },
  },

  entities: {
    BusinessListing: {
      async list() {
        return request("/api/listings");
      },

      async get(id) {
        return request(`/api/listings/${id}`);
      },

      async create(data) {
        return request("/api/listings", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },

      async update(id, data) {
        return request(`/api/listings/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      },

      async delete(id) {
        return request(`/api/listings/${id}`, {
          method: "DELETE",
        });
      },
    },
  },

  functions: {
    async invoke(name, payload = {}) {
      const data = await request(`/api/functions/${encodeURIComponent(name)}`, { method: "POST", body: JSON.stringify(payload) });
      return { data };
    },
  },
};

export default base44;
