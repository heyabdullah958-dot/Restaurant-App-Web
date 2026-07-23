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

// Request interceptor to attach JWT auth token
api.interceptors.request.use(
  async (config) => {
    // Do not attach token for public auth endpoints to avoid 401 on login with expired tokens
    const publicAuthUrls = ['/auth/login/', '/auth/register/', '/auth/guest/', '/auth/forgot-password/', '/auth/reset-password-confirm/'];
    const isPublicUrl = config.url && publicAuthUrls.some(url => config.url.endsWith(url));

    if (isPublicUrl) {
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

// Response interceptor to unwrap data and handle 401 & Network Errors / Cold Starts globally
api.interceptors.response.use(
  (response) => response.data || response,
  async (error) => {
    const originalRequest = error.config || {};

    // 1. Auto-retry on Network Error / Timeout (e.g. Render backend waking up from cold start)
    if (!error.response && (!originalRequest._retryCount || originalRequest._retryCount < 2)) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      console.log(`[API Interceptor] Retrying request (attempt ${originalRequest._retryCount}) for ${originalRequest.url}...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return api(originalRequest);
    }

    // 2. Handle 401 Unauthorized globally
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
          const response = await axios.post(refreshUrl, { refresh: refreshToken });
          
          if (response.data && (response.data.access || response.data.data?.access)) {
            const newAccessToken = response.data.access || response.data.data.access;
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

      console.log('Unauthorized request — session expired. Logging out...');
      delete api.defaults.headers.common['Authorization'];
      AsyncStorage.removeItem('auth_token').catch((e) => console.error(e));
      AsyncStorage.removeItem('refresh_token').catch((e) => console.error(e));

      if (storeInstance) {
        storeInstance.dispatch({ type: 'user/sessionExpired' });
      }
    } else if (error.response) {
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
