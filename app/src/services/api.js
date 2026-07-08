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
    // Do not attach token for public auth endpoints to avoid 401 on login with expired tokens
    const publicAuthUrls = ['/auth/login/', '/auth/register/', '/auth/guest/', '/auth/forgot-password/', '/auth/reset-password-confirm/'];
    const isPublicUrl = config.url && publicAuthUrls.some(url => config.url.endsWith(url));

    if (isPublicUrl) {
      // FIX 1A: Purge stale instance-level Authorization header from previous sessions.
      // api.defaults.headers.common persists across app launches in memory, so an expired
      // token from a previous session would be sent to login/register endpoints, causing 401.
      delete api.defaults.headers.common['Authorization'];
      delete config.headers['Authorization'];
    } else if (!config.headers['Authorization']) {
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

      console.warn('Unauthorized request — session expired. Logging out...');
      // Delete authorization header
      delete api.defaults.headers.common['Authorization'];
      // Remove token from AsyncStorage
      AsyncStorage.removeItem('auth_token').catch((e) => console.error(e));
      AsyncStorage.removeItem('refresh_token').catch((e) => console.error(e));

      // FIX 1C: Dispatch sessionExpired (not logout) so the AuthScreen can show
      // a "session expired" error message to the user instead of silently clearing state.
      // 'user/logout' reducer clears state.error = null, so no banner would appear.
      if (storeInstance) {
        storeInstance.dispatch({ type: 'user/sessionExpired' });
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
