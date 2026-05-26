import axios from 'axios';

// Base URL can be configured via environment variables or fall back to localhost
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach JWT auth token
api.interceptors.request.use(
  async (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// We define a function to inject the store and handle 401 Unauthorized globally
export const setupInterceptors = (store) => {
  api.interceptors.response.use(
    (response) => response.data || response,
    (error) => {
      if (error.response) {
        console.error('API Error Response:', error.response.status, error.response.data);
        
        // 401 Unauthorized means token is invalid/expired
        if (error.response.status === 401) {
          console.warn('Unauthorized request! Logging out...');
          // Delete authorization header
          delete api.defaults.headers.common['Authorization'];
          // Dispatch logout to clear user state
          store.dispatch({ type: 'user/logout' });
        }
      } else if (error.request) {
        console.error('API No Response:', error.request);
      } else {
        console.error('API Request Setup Error:', error.message);
      }
      return Promise.reject(error);
    }
  );
};

// Default response interceptor (if store not injected yet)
api.interceptors.response.use(
  (response) => response.data || response,
  (error) => {
    if (error.response) {
      console.error('API Error Response:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('API No Response:', error.request);
    } else {
      console.error('API Request Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
