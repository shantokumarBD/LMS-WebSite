import axios from "axios";

const getBaseUrl = () => {
  const rawApiUrl =
    import.meta.env.API_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.SERVER_URL ||
    import.meta.env.VITE_SERVER_URL ||
    "";

  if (!rawApiUrl) return "/api/v1";

  const trimmed = rawApiUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
});

// Request interceptor to attach JWT token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_jwt_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // We reject with the full error object so components can check for status codes or custom flags (e.g. needsVerification)
    return Promise.reject(error);
  },
);

export default api;
