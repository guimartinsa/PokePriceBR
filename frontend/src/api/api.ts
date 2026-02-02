import axios from "axios";

const apiUrl = import.meta.env.PROD 
  ? "https://pokepricebr.onrender.com/api"
  : "http://127.0.0.1:8000/api";

export const api = axios.create({
  baseURL: apiUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
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
      console.error('❌ API Error:', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data
      });
      return Promise.reject(error);
    }
  );
}

export default api;
