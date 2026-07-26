import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL — always use production Heroku backend.
// NOTE: process.env.EXPO_PUBLIC_API_URL only loads correctly when running via QR code scan (Metro bundler).
// When running Expo Go without QR (direct local), env vars don't inject — so we hardcode the production URL here.
import { Platform } from 'react-native';
const PRODUCTION_API_URL = 'https://getfoodpk-fd9b20442fcf.herokuapp.com/api';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 90000, // 90 seconds to allow Render cold-starts (45-60s) to complete
});

export const isPublicUrl = (url) => {
  if (!url) return false;
  const publicPatterns = [
    '/auth/login',
    '/auth/register',
    '/auth/guest',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/users/login',
    '/users/register',
    '/users/guest',
    '/token',
    '/search/',
    '/popular-tags',
    '/platform-settings'
  ];
  return publicPatterns.some(pattern => url.toLowerCase().includes(pattern));
};

// Request interceptor to attach JWT auth token
api.interceptors.request.use(
  async (config) => {
    // Do not attach token for public auth/search endpoints to avoid 401/403 on login/refresh with expired tokens
    if (isPublicUrl(config.url)) {
      delete api.defaults.headers.common['Authorization'];
      delete config.headers['Authorization'];
      delete config.headers['authorization'];
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

// Store reference to dispatch actions (e.g., logout on 401/403) without circular imports
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

// Response interceptor to unwrap data and handle 401/403 & Network Errors / Cold Starts globally
api.interceptors.response.use(
  (response) => response.data || response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response ? error.response.status : null;
    const requestUrl = originalRequest.url || '';

    // If request was to a public endpoint, pass error through without triggering auto-refresh / session expiry loops
    if (isPublicUrl(requestUrl)) {
      return Promise.reject(error);
    }

    // 1. Auto-retry on Network Error / Timeout (e.g. Render/Heroku cold start)
    if (!error.response && (!originalRequest._retryCount || originalRequest._retryCount < 2)) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      console.log(`[API Interceptor] Retrying request (attempt ${originalRequest._retryCount}) for ${requestUrl}...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return api(originalRequest);
    }

    // 2. Handle 401 Unauthorized & 403 Forbidden globally for protected requests
    if ((status === 401 || status === 403) && !originalRequest._retry) {
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
          // Standalone axios call without default headers for token refresh
          const response = await axios.post(refreshUrl, { refresh: refreshToken }, {
            headers: { 'Content-Type': 'application/json' }
          });
          
          const newAccessToken = response.data?.access || response.data?.data?.access;
          if (newAccessToken) {
            await AsyncStorage.setItem('auth_token', newAccessToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);
            isRefreshing = false;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.log('[API Interceptor] Token refresh failed — session expired:', refreshError?.response?.data || refreshError?.message);
        processQueue(refreshError, null);
      } finally {

        isRefreshing = false;
      }

      console.log('[API Interceptor] Unauthorized/Forbidden request — session expired. Purging tokens and resetting state...');
      delete api.defaults.headers.common['Authorization'];
      try {
        await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
      } catch (e) {
        console.error('Error clearing tokens:', e);
      }

      if (storeInstance) {
        storeInstance.dispatch({ type: 'user/sessionExpired' });
      }
    } else if (error.response && status !== 401 && status !== 403) {
      console.warn('API Error Response:', error.response.status, error.response.data);
    } else if (error.request) {
      console.warn('API No Response (Backend waking up or offline):', error.message || 'Network timeout');
    } else {
      console.warn('API Request Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;

