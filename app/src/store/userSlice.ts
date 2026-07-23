import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Platform } from 'react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export interface UserProfile {
  id: number;
  username: string;
  name?: string;
  email: string;
  phone: string;
  profile_photo: string | null;
  loyalty_points: number;
  is_guest: boolean;
  addresses?: string[];
}

export interface UserState {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Async Thunks with explicit types
export const loadSavedToken = createAsyncThunk<
  { user: UserProfile; token: string; refreshToken: string } | null,
  void,
  { rejectValue: string }
>(
  'user/loadSavedToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      
      if (!token) return null;
      
      let activeToken: string = token;
      
      // Proactively attempt token refresh on launch if refreshToken exists
      if (refreshToken) {
        try {
          const PROD_API_URL = 'https://getfoodpk-fd9b20442fcf.herokuapp.com/api';
          const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || PROD_API_URL;
          const refreshUrl = `${API_BASE_URL}/auth/refresh/`;
          const refreshResponse = await axios.post(refreshUrl, { refresh: refreshToken });
          
          const newAccessToken = refreshResponse.data?.access || refreshResponse.data?.data?.access;
          if (newAccessToken) {
            await AsyncStorage.setItem('auth_token', newAccessToken);
            activeToken = newAccessToken;
            console.log('Successfully refreshed token proactively on app launch');
          }
        } catch (refreshErr) {
          console.warn('Proactive token refresh attempt on app launch:', refreshErr);
        }
      }
      
      // Set default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${activeToken}`;
      
      // Fetch user profile info to verify token works
      const profileResponse = await api.get('/users/profile/') as any;
      
      // Extract user profile data robustly
      let user = profileResponse;
      if (profileResponse && typeof profileResponse === 'object') {
        if ('data' in profileResponse) {
          user = profileResponse.data;
        }
      }
      
      try {
        const savedAddress = await AsyncStorage.getItem(`user_address_${user.id}`);
        if (savedAddress) {
          user.addresses = [savedAddress];
        }
      } catch (e) {}
      
      return { user, token: activeToken, refreshToken: refreshToken || '' };
    } catch (error: any) {
      // If profile fails, clean up token
      delete api.defaults.headers.common['Authorization'];
      await AsyncStorage.removeItem('auth_token').catch(() => {});
      await AsyncStorage.removeItem('refresh_token').catch(() => {});
      return rejectWithValue(error.message || 'Session expired');
    }
  }
);

export const loginUser = createAsyncThunk<
  { user: UserProfile; token: string; refreshToken: string },
  { username: string; password: string },
  { rejectValue: string }
>(
  'user/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      // POST to /auth/login/
      const loginResponse = await api.post('/auth/login/', { username, password }) as any;
      const loginData = loginResponse.data || loginResponse;
      const token = loginData.access;
      const refreshToken = loginData.refresh;
      
      if (!token || !refreshToken) {
        throw new Error('Invalid login response from authentication server');
      }
      
      // Set the default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Save token locally
      try {
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('refresh_token', refreshToken);
      } catch (err) {
        console.error('Failed to save token to AsyncStorage:', err);
      }
      
      // Fetch user profile info
      const profileResponse = await api.get('/users/profile/') as any;
      let user = profileResponse;
      if (profileResponse && typeof profileResponse === 'object') {
        if ('data' in profileResponse) {
          user = profileResponse.data;
        }
      }
      
      try {
        const savedAddress = await AsyncStorage.getItem(`user_address_${user.id}`);
        if (savedAddress) {
          user.addresses = [savedAddress];
        }
      } catch (e) {}
      
      return { user, token, refreshToken };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      return rejectWithValue(message);
    }
  }
);

export const registerUser = createAsyncThunk<
  { user: UserProfile; token: string; refreshToken: string },
  { username: string; email: string; password: string; phone: string },
  { rejectValue: string }
>(
  'user/register',
  async ({ username, email, password, phone }, { rejectWithValue }) => {
    try {
      // POST to /auth/register/
      const response = await api.post('/auth/register/', { username, email, password, phone }) as any;
      const responseData = response.data || response;
      const payload = (responseData.data && responseData.data.user) ? responseData.data : responseData;
      const { user, tokens } = payload;
      
      if (!user || !tokens || !tokens.access) {
        throw new Error('Invalid registration response from server');
      }
      
      const token = tokens.access;
      
      // Set default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Save token locally
      try {
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('refresh_token', tokens.refresh);
      } catch (err) {
        console.error('Failed to save token to AsyncStorage:', err);
      }
      
      return { user, token, refreshToken: tokens.refresh };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Registration failed';
      return rejectWithValue(message);
    }
  }
);

export const guestLogin = createAsyncThunk<
  { user: UserProfile; token: string; refreshToken: string },
  void,
  { rejectValue: string }
>(
  'user/guestLogin',
  async (_, { rejectWithValue }) => {
    try {
      // Clear stale authorization headers so SimpleJWT does not reject guest authentication
      delete api.defaults.headers.common['Authorization'];
      await AsyncStorage.removeItem('auth_token').catch(() => {});
      await AsyncStorage.removeItem('refresh_token').catch(() => {});

      // POST to /auth/guest/
      const response = await api.post('/auth/guest/') as any;
      const responseData = response.data || response;
      const payload = (responseData.data && responseData.data.user) ? responseData.data : responseData;
      const { user, tokens } = payload;
      
      if (!user || !tokens || !tokens.access) {
        throw new Error('Invalid guest login response from server');
      }
      
      try {
        let savedAddress = await AsyncStorage.getItem(`user_address_${user.id}`);
        if (!savedAddress) {
          savedAddress = await AsyncStorage.getItem('guest_address');
        }
        if (savedAddress) {
          user.addresses = [savedAddress];
        }
      } catch (e) {}
      const token = tokens.access;
      
      // Set default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Save token locally
      try {
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('refresh_token', tokens.refresh);
      } catch (err) {
        console.error('Failed to save token to AsyncStorage:', err);
      }
      
      return { user, token, refreshToken: tokens.refresh };
    } catch (error: any) {
      console.warn('Backend guest auth waking up or offline. Using local guest session fallback.');
      const fallbackUser: UserProfile = {
        id: 9999,
        username: 'Guest User',
        name: 'Guest User',
        email: 'guest@foodsphere.pk',
        phone: '',
        is_guest: true,
        addresses: [],
        profile_photo: '',
        loyalty_points: 0,
      };
      const fallbackToken = 'guest_offline_token';
      api.defaults.headers.common['Authorization'] = `Bearer ${fallbackToken}`;
      return { user: fallbackUser, token: fallbackToken, refreshToken: '' };
    }
  }
);

export const fetchUserProfile = createAsyncThunk<
  UserProfile,
  void,
  { rejectValue: string }
>(
  'user/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users/profile/') as any;
      let user = response;
      if (response && typeof response === 'object') {
        if ('data' in response) {
          user = response.data;
        }
      }
      try {
        const savedAddress = await AsyncStorage.getItem(`user_address_${user.id}`);
        if (savedAddress) {
          user.addresses = [savedAddress];
        }
      } catch (e) {}
      return user;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch profile';
      return rejectWithValue(message);
    }
  }
);

export const updateProfile = createAsyncThunk<
  UserProfile,
  Partial<UserProfile>,
  { rejectValue: string }
>(
  'user/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/profile/', profileData) as any;
      let user = response;
      if (response && typeof response === 'object') {
        if ('data' in response) {
          user = response.data;
        }
      }
      try {
        const savedAddress = await AsyncStorage.getItem(`user_address_${user.id}`);
        if (savedAddress) {
          user.addresses = [savedAddress];
        }
      } catch (e) {}
      return user;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to update profile';
      return rejectWithValue(message);
    }
  }
);

export const logoutUser = createAsyncThunk<
  void,
  void
>(
  'user/logout',
  async (_, { dispatch }) => {
    delete api.defaults.headers.common['Authorization'];
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('refresh_token');
    } catch (err) {
      console.error('Failed to remove token from AsyncStorage:', err);
    }
    dispatch(logout());
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    // FIX 1B: Dedicated action for auto-logout due to session expiry (401 interceptor).
    // Unlike `logout` (which clears error = null), this sets a user-visible error message
    // so the AuthScreen banner renders after the session expires silently.
    sessionExpired(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = 'Your session has expired. Please log in again.';
    },
    clearError(state) {
      state.error = null;
    },
    updateUserProfile(state, action) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Load Saved Token
      .addCase(loadSavedToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadSavedToken.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.isAuthenticated = true;
        }
      })
      .addCase(loadSavedToken.rejected, (state) => {
        state.loading = false;
        state.error = null;
        state.isAuthenticated = false;
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Registration failed';
      })
      // Guest Login
      .addCase(guestLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(guestLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(guestLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Guest login failed';
      })
      // Fetch Profile
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Update failed';
      });
  },
});

export const { logout, sessionExpired, clearError, updateUserProfile } = userSlice.actions;
export default userSlice.reducer;
