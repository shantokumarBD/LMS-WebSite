import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.API_URL || import.meta.env.VITE_API_URL || "/api/v1",
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
