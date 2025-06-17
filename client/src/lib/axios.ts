// client/src/lib/axios.ts
import axios from "axios";
import { apiConfig } from "../config/api";

const api = axios.create(apiConfig);

// Add request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
