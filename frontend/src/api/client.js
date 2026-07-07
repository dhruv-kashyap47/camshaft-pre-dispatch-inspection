import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("camshaft_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.localStorage.removeItem("camshaft_token");
      window.localStorage.removeItem("camshaft_user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;
