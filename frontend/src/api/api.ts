import axios from "axios";

function normalizeBackendBaseUrl(rawUrl?: string): string {
  if (!rawUrl) {
    return import.meta.env.PROD
      ? "https://pokepricebr.onrender.com"
      : "http://127.0.0.1:8000";
  }

  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  return withProtocol.replace(/\/+$/, "").replace(/\/api$/, "");
}

const backendBaseUrl = normalizeBackendBaseUrl(import.meta.env.VITE_API_URL);
const apiUrl = `${backendBaseUrl}/api`;

export const api = axios.create({
  baseURL: apiUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de REQUEST: injeta Bearer token se existir
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  console.log("JWT enviado:", token);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Log de erros em dev
if (!import.meta.env.PROD) {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error("❌ API Error:", {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      });
      return Promise.reject(error);
    }
  );
}

export default api;
