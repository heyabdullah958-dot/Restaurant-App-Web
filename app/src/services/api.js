import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const PRODUCTION_API_URL = 'https://getfoodpk-fd9b20442fcf.herokuapp.com/api';
export const CUSTOM_API_STORAGE_KEY = '@getfood_custom_api_url';

export const detectLocalLanUrl = () => {
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost || Constants?.experienceUrl;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8000/api`;
    }
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000/api`;
    }
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://127.0.0.1:8000/api';
};

// Internal active URL state — ALWAYS default to 24/7 production server
let activeBaseUrl = process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL;

export const getActiveBaseUrl = () => activeBaseUrl;

export const normalizeApiUrl = (url) => {
  let cleaned = (url || '').trim();
  if (!cleaned) return PRODUCTION_API_URL;
  cleaned = cleaned.replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }
  return cleaned;
};

export const API_BASE_URL = activeBaseUrl;

// ─── Axios Setup ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: activeBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 25000,
});

// ─── Safe Storage Adapter ───────────────────────────────────────────────────
const memoryStorage = new Map();

export const safeGetItem = async (key) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch (e) {}
  try {
    const val = await AsyncStorage.getItem(key);
    if (val !== null) return val;
  } catch (e) {}
  return memoryStorage.get(key) || null;
};

export const safeSetItem = async (key, value) => {
  memoryStorage.set(key, value);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {}
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {}
};

export const safeRemoveItem = async (key) => {
  memoryStorage.delete(key);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {}
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {}
};

export const getAvailablePresets = () => [
  {
    id: 'heroku_prod',
    label: '🚀 Heroku Production (24/7)',
    url: PRODUCTION_API_URL,
    description: 'Live cloud backend on Heroku with PostgreSQL & Cloudinary',
  },
  {
    id: 'local_lan',
    label: '💻 Local Dev (LAN IP)',
    url: detectLocalLanUrl(),
    description: 'Local Django server running on your development machine',
  },
  {
    id: 'emulator',
    label: '📱 Android Emulator Loopback',
    url: 'http://10.0.2.2:8000/api',
    description: 'Direct alias for host localhost inside Android Virtual Device',
  },
];

export const testApiConnectivity = async (targetUrl) => {
  const normalized = normalizeApiUrl(targetUrl);
  const startTime = Date.now();
  try {
    const testAxios = axios.create({
      baseURL: normalized,
      timeout: 6000,
    });
    await testAxios.get('/restaurants/');
    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      latencyMs,
      message: `Connected successfully (${latencyMs}ms)`,
      url: normalized,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      message: err.code === 'ECONNABORTED' ? 'Request timed out after 6s' : (err.message || 'Unable to connect to server'),
      url: normalized,
    };
  }
};

// Initialize custom URL from storage if previously saved
safeGetItem(CUSTOM_API_STORAGE_KEY).then((savedUrl) => {
  if (savedUrl) {
    const normalized = normalizeApiUrl(savedUrl);
    activeBaseUrl = normalized;
    api.defaults.baseURL = normalized;
  }
});

export const setActiveBaseUrl = async (newUrl) => {
  const normalized = normalizeApiUrl(newUrl);
  activeBaseUrl = normalized;
  api.defaults.baseURL = normalized;
  await safeSetItem(CUSTOM_API_STORAGE_KEY, normalized);
  return normalized;
};
export const setApiBaseUrl = setActiveBaseUrl;

export const resetBaseUrlToDefault = async () => {
  activeBaseUrl = PRODUCTION_API_URL;
  api.defaults.baseURL = PRODUCTION_API_URL;
  await safeRemoveItem(CUSTOM_API_STORAGE_KEY);
  return PRODUCTION_API_URL;
};
export const resetApiBaseUrl = resetBaseUrlToDefault;

export const isPublicUrl = (url, method = 'get') => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  const lowerMethod = (method || 'get').toLowerCase();

  if (lowerUrl.includes('/reviews') && lowerMethod === 'post') return false;
  if (lowerUrl.includes('/branch-item-availability')) return false;

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
    '/coupons/validate',
    '/coupons/active',
  ];

  if (lowerMethod === 'get') {
    publicPatterns.push('/restaurants', '/branches', '/categories', '/menu', '/track');
  }

  return publicPatterns.some((pattern) => lowerUrl.includes(pattern));
};

// Request interceptor to attach JWT auth token
api.interceptors.request.use(
  async (config) => {
    config.baseURL = activeBaseUrl;

    if (isPublicUrl(config.url, config.method)) {
      delete config.headers['Authorization'];
      delete config.headers['authorization'];
    } else {
      const defaultAuth = api.defaults.headers.common['Authorization'];
      if (defaultAuth && typeof defaultAuth === 'string') {
        config.headers['Authorization'] = defaultAuth;
      } else if (!config.headers['Authorization']) {
        try {
          const token = await safeGetItem('auth_token');
          if (token) {
            const bearer = `Bearer ${token}`;
            config.headers['Authorization'] = bearer;
            api.defaults.headers.common['Authorization'] = bearer;
          }
        } catch (err) {
          if (__DEV__) console.log('Error reading auth_token:', err);
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Store reference for Redux dispatch without circular imports
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

export const sanitizeErrorMessage = (error, baseUrl = activeBaseUrl) => {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const isNetwork =
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ECONNREFUSED' ||
    error.code === 'ENOTFOUND' ||
    error.message?.includes('Network Error') ||
    error.message?.includes('timeout') ||
    error.message?.includes('Network request failed');

  if (isNetwork) {
    return 'Unable to reach backend server. Please check your internet connection and try again.';
  }

  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    if (typeof data === 'string') {
      if (data.includes('<html') || data.trim().startsWith('<!')) {
        if (status === 502 || status === 503 || status === 504) {
          return 'Server is temporarily unavailable. Please try again in a few moments.';
        }
        if (status === 404) return 'Requested item or order was not found.';
        return `Server returned HTTP ${status}. Please try again later.`;
      }
      return data;
    }

    if (data && typeof data === 'object') {
      if (data.detail) return String(data.detail);
      if (data.error) return String(data.error);
      if (data.message) return String(data.message);
      if (data.non_field_errors) {
        return Array.isArray(data.non_field_errors)
          ? data.non_field_errors.join('\n')
          : String(data.non_field_errors);
      }
      const firstKey = Object.keys(data)[0];
      if (firstKey && data[firstKey]) {
        const val = data[firstKey];
        return `${firstKey}: ${Array.isArray(val) ? val.join(', ') : val}`;
      }
    }
  }

  return error.message || 'Request failed. Please try again.';
};

// Response interceptor
api.interceptors.response.use(
  (response) => response.data || response,
  async (error) => {
    const originalRequest = error.config || {};
    const requestUrl = originalRequest.url || '';

    // Attach userFriendlyMessage on every rejected promise
    error.userFriendlyMessage = sanitizeErrorMessage(error, activeBaseUrl);

    let status = error.response ? error.response.status : null;
    if (!status && error?.message) {
      if (error.message.includes('403')) status = 403;
      else if (error.message.includes('401')) status = 401;
    }

    if (isPublicUrl(requestUrl)) {
      return Promise.reject(error);
    }

    // 1. Auto-retry on transient Network Error / Timeout (1 retry)
    if (!error.response && !status && (!originalRequest._retryCount || originalRequest._retryCount < 1)) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return api(originalRequest);
    }

    // 2. Handle 401 Unauthorized globally for authenticated users
    if ((status === 401 || status === 403) && !originalRequest._retry) {
      const state = storeInstance?.getState()?.user;
      const isGuestUser = state?.user?.is_guest;
      const isAuthenticated = state?.isAuthenticated;

      if (isGuestUser || !isAuthenticated) {
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
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await safeGetItem('refresh_token');
        if (refreshToken) {
          const refreshUrl = `${activeBaseUrl}/auth/refresh/`;
          const response = await axios.post(
            refreshUrl,
            { refresh: refreshToken },
            { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
          );

          const newAccessToken = response.data?.access || response.data?.data?.access;
          const newRefreshToken = response.data?.refresh || response.data?.data?.refresh;

          if (newAccessToken) {
            await safeSetItem('auth_token', newAccessToken);
            if (newRefreshToken) {
              await safeSetItem('refresh_token', newRefreshToken);
            }
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);
            isRefreshing = false;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
      } finally {
        isRefreshing = false;
      }

      // If refresh failed, purge tokens and dispatch sessionExpired
      delete api.defaults.headers.common['Authorization'];
      try {
        await safeRemoveItem('auth_token');
        await safeRemoveItem('refresh_token');
      } catch (e) {}

      if (storeInstance) {
        storeInstance.dispatch({ type: 'user/sessionExpired' });
      }
    }

    return Promise.reject(error);
  }
);

export default api;
