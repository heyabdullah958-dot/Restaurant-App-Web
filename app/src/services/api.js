import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL — always use production Heroku backend.
// NOTE: process.env.EXPO_PUBLIC_API_URL only loads correctly when running via QR code scan (Metro bundler).
// When running Expo Go without QR (direct local), env vars don't inject — so we hardcode the production URL here.
import { Platform } from 'react-native';
export const PRODUCTION_API_URL = 'https://getfoodpk-fd9b20442fcf.herokuapp.com/api';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL;

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
    '/search',
    '/popular-tags',
    '/platform-settings',
    '/restaurants',
    '/branches',
    '/categories',
    '/menu',
  ];
  return publicPatterns.some(pattern => url.toLowerCase().includes(pattern));
};

// Request interceptor to attach JWT auth token
api.interceptors.request.use(
  async (config) => {
    // Do not attach token for public auth/search endpoints to avoid 401/403 on login/refresh with expired tokens
    if (isPublicUrl(config.url)) {
      // NOTE: Only delete from request-specific config.headers! NEVER mutate api.defaults.headers.common globally!
      delete config.headers['Authorization'];
      delete config.headers['authorization'];
    } else {
      // Check if global default header exists first for fast synchronous resolution
      const defaultAuth = api.defaults.headers.common['Authorization'];
      if (defaultAuth && typeof defaultAuth === 'string') {
        config.headers['Authorization'] = defaultAuth;
      } else if (!config.headers['Authorization']) {
        try {
          const token = await AsyncStorage.getItem('auth_token');
          if (token) {
            const bearer = `Bearer ${token}`;
            config.headers['Authorization'] = bearer;
            api.defaults.headers.common['Authorization'] = bearer;
          }
        } catch (err) {
          if (__DEV__) console.error('Error fetching token from AsyncStorage:', err);
        }
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
    const requestUrl = originalRequest.url || '';

    // Infer status code from error.response or error.message
    let status = error.response ? error.response.status : null;
    if (!status && error?.message) {
      if (error.message.includes('403')) status = 403;
      else if (error.message.includes('401')) status = 401;
    }

    // If request was to a public endpoint, pass error through without triggering auto-refresh / session expiry loops
    if (isPublicUrl(requestUrl)) {
      return Promise.reject(error);
    }

    // 1. Auto-retry on Network Error / Timeout (e.g. Render/Heroku cold start)
    if (!error.response && !status && (!originalRequest._retryCount || originalRequest._retryCount < 2)) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      if (__DEV__) console.log(`[API Interceptor] Retrying request (attempt ${originalRequest._retryCount}) for ${requestUrl}...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return api(originalRequest);
    }

    // 2. Handle 401 Unauthorized & 403 Forbidden globally for protected requests
    if ((status === 401 || status === 403) && !originalRequest._retry) {
      const isGuestUser = storeInstance?.getState()?.user?.user?.is_guest;
      if (isGuestUser) {
        if (__DEV__) console.log('[API Interceptor] 401/403 encountered for guest user — skipping sessionExpired dispatch');
        return Promise.reject(error);
      }

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
        if (__DEV__) console.log('[API Interceptor] Token refresh failed — session expired:', refreshError?.response?.data || refreshError?.message);
        processQueue(refreshError, null);
      } finally {
        isRefreshing = false;
      }

      if (__DEV__) console.log('[API Interceptor] Unauthorized/Forbidden request — session expired. Purging tokens and resetting state...');
      delete api.defaults.headers.common['Authorization'];
      try {
        await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
      } catch (e) {
        if (__DEV__) console.log('Error clearing tokens:', e);
      }

      if (storeInstance) {
        storeInstance.dispatch({ type: 'user/sessionExpired' });
      }
    }

    // Sanitize non-JSON raw HTML error responses (e.g. 404/500 server HTML pages)
    if (error.response && error.response.data && typeof error.response.data === 'string') {
      const isHtml = error.response.data.includes('<html') ||
                     error.response.data.trim().startsWith('<!') ||
                     (error.response.headers && String(error.response.headers['content-type']).includes('text/html'));
      if (isHtml) {
        const cleanMsg = status === 404
          ? 'Requested resource or order was not found.'
          : 'Server encountered an error. Please try again later.';
        error.response.data = { message: cleanMsg, detail: cleanMsg };
      }
    }

    // Sanitize DRF non_field_errors & field error dictionary objects into clean readable messages
    if (error.response && error.response.data && typeof error.response.data === 'object') {
      const data = error.response.data;
      if (data.non_field_errors) {
        const cleanMsg = Array.isArray(data.non_field_errors) ? data.non_field_errors.join('\n') : String(data.non_field_errors);
        error.response.data.message = cleanMsg;
        error.response.data.detail = cleanMsg;
      }
    }

    if (error.response && status !== 401 && status !== 403) {
      if (__DEV__) console.log('API Error Response:', error.response.status, error.response.data);
    } else if (error.request) {
      if (__DEV__) console.log('API No Response (Backend waking up or offline):', error.message || 'Network timeout');
    } else {
      if (__DEV__) console.log('API Request Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;


