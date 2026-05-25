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
    // In a real application, you would retrieve the token from secure storage or Redux state
    // const token = await SecureStore.getItemAsync('userToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling global API responses/errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle specific error codes here (e.g. 401 Unauthorized)
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
