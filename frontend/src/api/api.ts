import axios from "axios";

export const api = axios.create({
  //baseURL: "http://127.0.0.1:8000/api",
  //baseURL: import.meta.env.VITE_API_URL,
  baseURL: "https://pokepricebr.onrender.com/api",
  timeout: 30000,
});

