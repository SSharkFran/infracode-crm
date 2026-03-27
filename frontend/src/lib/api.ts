import axios, { AxiosError } from 'axios';

import { AUTH_TOKEN_KEY } from './constants';

export { AUTH_TOKEN_KEY } from './constants';

export function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  return import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1';
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.dispatchEvent(new CustomEvent('auth-token-updated'));
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(new CustomEvent('auth-token-updated'));
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      clearAuthToken();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default api;
