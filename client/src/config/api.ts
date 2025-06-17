const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
};

export default API_BASE_URL;
