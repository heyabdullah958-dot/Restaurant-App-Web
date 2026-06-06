import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL can be configured via environment variables or fall back to localhost
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to attach JWT auth token
api.interceptors.request.use(
  async (config) => {
    if (!config.headers['Authorization']) {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (err) {
        console.error('Error fetching token from AsyncStorage:', err);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Store reference to dispatch actions (e.g., logout on 401) without circular imports
let storeInstance = null;

export const setupInterceptors = (store) => {
  storeInstance = store;
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to unwrap data and handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response.data || response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const refreshUrl = `${API_BASE_URL}/auth/refresh/`;
          // Use base axios to avoid infinite loops
          const response = await axios.post(refreshUrl, { refresh: refreshToken });
          
          if (response.data && response.data.success && response.data.data && response.data.data.access) {
            const newAccessToken = response.data.data.access;
            await AsyncStorage.setItem('auth_token', newAccessToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);
            isRefreshing = false;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        processQueue(refreshError, null);
      } finally {
        isRefreshing = false;
      }

      console.warn('Unauthorized request! Logging out...');
      // Delete authorization header
      delete api.defaults.headers.common['Authorization'];
      // Remove token from AsyncStorage
      AsyncStorage.removeItem('auth_token').catch((e) => console.error(e));
      AsyncStorage.removeItem('refresh_token').catch((e) => console.error(e));

      // Dispatch logout to clear user state
      if (storeInstance) {
        storeInstance.dispatch({ type: 'user/logout' });
      }
    } else if (error.response) {
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

